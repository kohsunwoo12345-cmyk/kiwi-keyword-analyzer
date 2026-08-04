import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { MODEL_COST, computeCharge, getUsdKrw, resolveMarkup } from './_pricing'
import { creditPriceFor } from '../payments/prepare'
// @ts-ignore — 과금 기준을 생성 API 와 "완전히 같은 함수"로 맞춘다(아래 설명 참고)
import { effectiveUnits, effectiveRes } from '../generate.js'

// 정기 자동 생성 — "매주 월요일 오전 9시에 신제품 영상" 같은 반복 제작을 서버가 대신 돌린다.
//  Figma Weave 는 API 가 없어(공식 헬프센터 명시) 이런 자동화를 아예 할 수 없다.
//  실행은 외부 스케줄러가 /api/cron/video-schedules 를 주기적으로 호출하면서 이뤄진다
//  (이 저장소의 다른 배치와 동일하게 X-Cron-Token 규약을 쓴다).

const MAX_PER_USER = 10
export const DEFAULT_TZ = 'Asia/Seoul'

/** 해당 시각(UTC ms)에 그 표준시간대의 UTC 오프셋(ms). 서머타임이 적용된 실제 값을 돌려준다. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts = dtf.formatToParts(new Date(utcMs))
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0)
  // 그 지역의 벽시계 값을 UTC 로 읽었다고 치면, 실제 UTC 와의 차이가 곧 오프셋이다
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'))
  return asUtc - utcMs
}

/** 그 지역의 "벽시계 시각"(예: 서울 9시)을 실제 UTC 시각으로 변환.
 *  오프셋이 변환 대상 시각에 따라 달라지므로(서머타임 경계) 두 번 보정한다. */
function wallToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string): number {
  const naive = Date.UTC(y, m, d, h, mi, 0)
  let guess = naive - tzOffsetMs(naive, tz)
  guess = naive - tzOffsetMs(guess, tz)
  return guess
}

/** 그 지역의 현재 벽시계 날짜/시각 */
function wallNow(utcMs: number, tz: string) {
  const off = tzOffsetMs(utcMs, tz)
  const d = new Date(utcMs + off)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), wd: d.getUTCDay() }
}

/** 지원되는 표준시간대인지 확인 (알 수 없으면 기본값으로 되돌린다) */
export function normalizeTz(tz: any): string {
  const v = String(tz || '').trim()
  if (!v) return DEFAULT_TZ
  try { new Intl.DateTimeFormat('en-US', { timeZone: v }); return v } catch { return DEFAULT_TZ }
}

export async function ensureSchedules(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS studio_schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      freq TEXT NOT NULL DEFAULT 'weekly',   -- daily | weekly
      hour INTEGER NOT NULL DEFAULT 9,       -- 0~23 (해당 tz 기준)
      minute INTEGER NOT NULL DEFAULT 0,     -- 0~59 (해당 tz 기준)
      weekday INTEGER NOT NULL DEFAULT 1,    -- 0=일 … 6=토 (freq=weekly 일 때)
      model TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL DEFAULT '',
      seconds INTEGER NOT NULL DEFAULT 5,
      ratio TEXT NOT NULL DEFAULT '16:9',
      res TEXT NOT NULL DEFAULT '1080p',
      tz TEXT NOT NULL DEFAULT 'Asia/Seoul',   -- IANA 표준시간대 (예: Asia/Seoul, America/New_York)
      next_run_at TEXT,
      last_run_at TEXT,
      last_status TEXT NOT NULL DEFAULT '',
      last_result TEXT NOT NULL DEFAULT '',
      runs INTEGER NOT NULL DEFAULT 0,
      max_runs INTEGER NOT NULL DEFAULT 0,   -- 0=무제한
      fail_streak INTEGER NOT NULL DEFAULT 0, -- 연속 실패 횟수 (3회면 자동 중지)
      created_at TEXT
    )`,
  ).run().catch(() => {})
  // 기존 테이블에도 나중에 추가된 컬럼을 붙인다(이미 있으면 무시)
  await db.prepare("ALTER TABLE studio_schedules ADD COLUMN tz TEXT NOT NULL DEFAULT 'Asia/Seoul'").run().catch(() => {})
  await db.prepare('ALTER TABLE studio_schedules ADD COLUMN fail_streak INTEGER NOT NULL DEFAULT 0').run().catch(() => {})
  await db.prepare('ALTER TABLE studio_schedules ADD COLUMN minute INTEGER NOT NULL DEFAULT 0').run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sched_due ON studio_schedules (enabled, next_run_at)').run().catch(() => {})
}

/** 다음 실행 시각(UTC ISO).
 *  사용자가 고른 "그 지역 현지 시각"(tz) 기준으로 지금 이후 가장 가까운 때를 구한다.
 *  서머타임이 있는 지역(미국·유럽 등)도 그 시점의 실제 오프셋으로 계산하므로,
 *  현지에서는 언제나 같은 시계 시각(예: 매일 오전 9시)에 실행된다. */
export function computeNextRun(freq: string, hour: number, minute: number, weekday: number, fromMs: number, tz?: string): string {
  const zone = normalizeTz(tz)
  const h = Math.min(23, Math.max(0, Math.round(hour) || 0))
  const mi = Math.min(59, Math.max(0, Math.round(minute) || 0))
  const wd = Math.min(6, Math.max(0, Math.round(weekday) || 0))
  const now = wallNow(fromMs, zone)

  // 현지 날짜 기준 후보를 만들고, 이미 지났으면 하루/일주일씩 민다.
  //  날짜를 옮길 때마다 UTC 로 다시 환산해야 서머타임 경계에서도 정확하다.
  let addDays = 0
  if (freq !== 'daily') addDays = (wd - now.wd + 7) % 7
  for (let i = 0; i < 400; i++) {
    const t = new Date(Date.UTC(now.y, now.m, now.d + addDays, 12, 0, 0))   // 정오 기준으로 날짜만 안전하게 이동
    const utc = wallToUtc(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), h, mi, zone)
    if (utc > fromMs) return new Date(utc).toISOString()
    addDays += (freq === 'daily') ? 1 : 7
  }
  return new Date(fromMs + 86400000).toISOString()   // 도달 불가 — 안전값
}

const row2json = (r: any) => ({
  id: r.id, name: r.name || '', enabled: Number(r.enabled) === 1,
  freq: r.freq || 'weekly', hour: Number(r.hour) || 0, minute: Number(r.minute) || 0,
  weekday: Number(r.weekday) || 0,
  model: r.model || '', prompt: r.prompt || '', seconds: Number(r.seconds) || 5,
  ratio: r.ratio || '16:9', res: r.res || '1080p', tz: r.tz || DEFAULT_TZ,
  nextRunAt: r.next_run_at || '', lastRunAt: r.last_run_at || '',
  lastStatus: r.last_status || '', lastResult: r.last_result || '',
  runs: Number(r.runs) || 0, maxRuns: Number(r.max_runs) || 0,
  failStreak: Number(r.fail_streak) || 0,
})

/** 정기 자동 생성으로 쓸 수 없는 모델이면 그 이유를, 쓸 수 있으면 null.
 *
 *  예약은 프롬프트 하나만 들고 혼자 돌기 때문에, "입력 미디어가 반드시 있어야 하는" 모델은
 *  무엇을 해도 매번 실패한다. 저장은 되는데 실행만 계속 실패하면 사용자는 이유를 알 수 없고
 *  3회 뒤 자동 중지될 뿐이다 → 고를 수 없게 하는 편이 낫다.
 *
 *  실제로 31개 영상 모델을 하나씩 크론으로 돌려 확인한 결과를 규칙으로 옮긴 것이다. */
export function scheduleModelIssue(model: string): string | null {
  const m = String(model || '')
  const mc = (MODEL_COST as any)[m]
  if (!mc) return '알 수 없는 모델입니다'
  if (mc.u !== 'sec') return '영상 모델이 아닙니다'
  // 원본 영상이 있어야 하는 것들 — V2V·모션전이·업스케일·립싱크·루마 편집/비율변경
  if (/^(v2v_auto|motion|upscale|runway_aleph|lipsync)$/.test(String(mc.prov))) {
    return '원본 영상이 필요한 모델이라 예약할 수 없습니다'
  }
  if (/영상 편집|비율 변경/.test(m)) return '원본 영상이 필요한 모델이라 예약할 수 없습니다'
  // 첫 프레임 이미지가 있어야 하는 것들
  if (/이미지→영상|I2V/i.test(m)) return '시작 이미지가 필요한 모델이라 예약할 수 없습니다'
  return null
}

/** 연속 실패가 이 횟수에 닿으면 예약을 자동으로 끈다.
 *  (키가 빠졌거나 크레딧이 없는 예약이 매일 조용히 실패하며 로그만 쌓이는 걸 막는다) */
export const FAIL_LIMIT = 3

/** 이 예약이 제공사에 "실제로 보내질" 길이·화질.
 *
 *  ⚠ 요청값을 그대로 믿으면 안 된다. 제공사마다 받는 값이 정해져 있어 빌더가 조정한다 —
 *     Kling·Runway 는 5초/10초만, Veo 는 최대 8초, 해상도를 아예 안 받는 제공사는 1080p 고정,
 *     루마는 4K 를 1080p 로 내린다. 생성 API 의 과금도 이 조정된 값으로 계산한다.
 *     예약 게이트가 요청값으로 계산하면 216개 조합 중 151개가 실제 청구액과 어긋난다
 *     (예: Runway 8초 요청 → 실제 10초 → 8.4크레딧 과소추정).
 *     그래서 생성 API 와 똑같은 함수를 그대로 쓴다. */
export function scheduleEffective(env: any, model: string, seconds: number, res: string) {
  const prov = String((MODEL_COST as any)[model]?.prov || '')
  const body = { provider: prov, model, kind: 'video', prompt: 't', seconds, ratio: '16:9', res }
  try {
    return { seconds: Math.max(1, Number(effectiveUnits(body, env)) || seconds), res: String(effectiveRes(body, env) || res) }
  } catch { return { seconds, res } }
}

/** 이 예약을 한 번 돌리는 데 드는 크레딧(추정).
 *  생성 API 의 사전 잔액 게이트와 같은 공식(computeCharge) + 같은 입력(effective 값)을 쓴다 —
 *  여기서 통과했는데 실행 단계에서 막히면 사용자는 이유를 알 수 없다. */
export async function estimateScheduleCredits(
  db: D1Database, user: any, s: { model: string; seconds?: number; res?: string }, env?: any,
): Promise<number> {
  try {
    const m = (MODEL_COST as any)[s.model]
    if (!m) return 0
    const rate = await getUsdKrw(db)
    const mk = await resolveMarkup(db, String(user.id), s.model, Number(user.credit_markup) || 0)
    const ckw = await creditPriceFor(db, user)
    const isImg = m.u === 'img'
    const eff = isImg
      ? { seconds: 1, res: undefined as any }
      : scheduleEffective(env || {}, s.model, Math.max(1, Number(s.seconds) || 5), s.res || '1080p')
    const cc = computeCharge({ model: s.model, units: eff.seconds, res: eff.res }, rate, mk, ckw)
    return Math.round(Number(cc.credits) * 100) / 100
  } catch { return 0 }   // 추정 실패 시 막지 않는다(락아웃 방지) — 실행 단계 게이트가 다시 잡는다
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureSchedules(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const rows: any = await db.prepare(
    'SELECT * FROM studio_schedules WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
  ).bind(me.id, MAX_PER_USER).all()
  return json({ ok: true, schedules: (rows.results || []).map(row2json) })
}

// POST { id?, name, enabled, freq, hour, weekday, model, prompt, seconds, ratio, res, maxRuns }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureSchedules(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  let b: any = {}
  try { b = (await request.json()) ?? {} } catch { return json({ ok: false, error: '잘못된 요청' }, 400) }

  const prompt = String(b.prompt || '').trim().slice(0, 2000)
  if (!prompt) return json({ ok: false, error: '프롬프트를 입력하세요.' }, 400)
  const model = String(b.model || '').trim().slice(0, 80)
  if (!model) return json({ ok: false, error: '모델을 선택하세요.' }, 400)
  // 저장은 되는데 실행만 매번 실패하는 모델을 여기서 걸러낸다(입력 미디어가 필요한 계열 등)
  const issue = scheduleModelIssue(model)
  if (issue) return json({ ok: false, error: `${model} — ${issue}` }, 400)
  const freq = b.freq === 'daily' ? 'daily' : 'weekly'
  const hour = Math.min(23, Math.max(0, Number(b.hour) || 0))
  const minute = Math.min(59, Math.max(0, Number(b.minute) || 0))
  const weekday = Math.min(6, Math.max(0, Number(b.weekday) || 0))
  const tz = normalizeTz(b.tz)
  // 저장값도 "제공사가 실제로 받는 값"으로 맞춘다. 요청대로 적어 두면
  //  관리자 화면·목록에 표시되는 길이·화질이 실제 결과물과 달라진다.
  const _eff = scheduleEffective(env, model, Math.max(1, Number(b.seconds) || 5), String(b.res || '1080p'))
  const seconds = _eff.seconds
  const res = _eff.res

  // 크레딧이 모자라면 저장 자체를 막는다.
  //  안 막으면 "예약해 뒀는데 매번 조용히 실패" 가 되고, 3회 실패 후 자동 중지될 때까지
  //  사용자는 영문을 모른다. 지금 이유를 알려주는 편이 낫다. (관리자는 예외)
  if (me.role !== 'admin') {
    const need = await estimateScheduleCredits(db, me, { model, seconds, res })
    const have = Number(me.credits) || 0
    if (have <= 0) {
      return json({ ok: false, error: '크레딧이 없어 예약할 수 없습니다. 충전 후 다시 시도하세요.', need, balance: have, needPlan: true }, 402)
    }
    if (need > 0 && have < need) {
      return json({
        ok: false,
        error: `크레딧이 부족합니다. 이 예약은 1회당 약 ${need.toLocaleString('ko-KR')}크레딧이 필요한데 보유 ${have.toLocaleString('ko-KR')}크레딧입니다.`,
        need, balance: have, needPlan: true,
      }, 402)
    }
  }

  const next = computeNextRun(freq, hour, minute, weekday, Date.now(), tz)
  const now = new Date().toISOString()

  if (b.id) {
    const own: any = await db.prepare('SELECT id FROM studio_schedules WHERE id = ? AND user_id = ?').bind(String(b.id), me.id).first()
    if (!own) return json({ ok: false, error: '없는 예약입니다.' }, 404)
    await db.prepare(
      // 설정을 고쳐 저장하면 연속 실패 기록은 지운다 — 원인을 고쳤을 수 있으니 다시 3번의 기회를 준다
      `UPDATE studio_schedules SET name=?, enabled=?, freq=?, hour=?, minute=?, weekday=?, model=?, prompt=?,
        seconds=?, ratio=?, res=?, tz=?, max_runs=?, next_run_at=?, fail_streak=0 WHERE id=? AND user_id=?`,
    ).bind(String(b.name || '').slice(0, 60), b.enabled === false ? 0 : 1, freq, hour, minute, weekday, model, prompt,
      seconds, String(b.ratio || '16:9'), res, tz,
      Math.max(0, Number(b.maxRuns) || 0), next, String(b.id), me.id).run()
    return json({ ok: true, id: b.id, nextRunAt: next, tz })
  }

  const cnt: any = await db.prepare('SELECT COUNT(*) AS c FROM studio_schedules WHERE user_id = ?').bind(me.id).first()
  if (cnt && Number(cnt.c) >= MAX_PER_USER)
    return json({ ok: false, error: `예약은 최대 ${MAX_PER_USER}개까지 만들 수 있습니다.` }, 400)
  const id = 'sc_' + crypto.randomUUID().slice(0, 12)
  await db.prepare(
    `INSERT INTO studio_schedules (id,user_id,name,enabled,freq,hour,minute,weekday,model,prompt,seconds,ratio,res,tz,next_run_at,max_runs,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(id, me.id, String(b.name || '').slice(0, 60), b.enabled === false ? 0 : 1, freq, hour, minute, weekday, model, prompt,
    seconds, String(b.ratio || '16:9'), res, tz, next,
    Math.max(0, Number(b.maxRuns) || 0), now).run()
  return json({ ok: true, id, nextRunAt: next, tz })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureSchedules(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  await db.prepare('DELETE FROM studio_schedules WHERE id = ? AND user_id = ?').bind(id, me.id).run()
  return json({ ok: true })
}
