import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { MODEL_COST } from './_pricing'

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

/** 연속 실패가 이 횟수에 닿으면 예약을 자동으로 끈다.
 *  (키가 빠졌거나 크레딧이 없는 예약이 매일 조용히 실패하며 로그만 쌓이는 걸 막는다) */
export const FAIL_LIMIT = 3

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureSchedules(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const rows: any = await db.prepare(
    'SELECT * FROM studio_schedules WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
  ).bind(me.id, MAX_PER_USER).all().catch(() => ({ results: [] }))
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
  try { b = await request.json() } catch { return json({ ok: false, error: '잘못된 요청' }, 400) }

  const prompt = String(b.prompt || '').trim().slice(0, 2000)
  if (!prompt) return json({ ok: false, error: '프롬프트를 입력하세요.' }, 400)
  const model = String(b.model || '').trim().slice(0, 80)
  if (!model) return json({ ok: false, error: '모델을 선택하세요.' }, 400)
  // 단가표에 없는 모델은 실행 시점에 provider 를 못 찾아 매번 실패한다 → 저장 단계에서 막는다
  if (!(MODEL_COST as any)[model]) return json({ ok: false, error: '알 수 없는 모델입니다: ' + model }, 400)
  const freq = b.freq === 'daily' ? 'daily' : 'weekly'
  const hour = Math.min(23, Math.max(0, Number(b.hour) || 0))
  const minute = Math.min(59, Math.max(0, Number(b.minute) || 0))
  const weekday = Math.min(6, Math.max(0, Number(b.weekday) || 0))
  const tz = normalizeTz(b.tz)
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
      Math.max(1, Number(b.seconds) || 5), String(b.ratio || '16:9'), String(b.res || '1080p'), tz,
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
    Math.max(1, Number(b.seconds) || 5), String(b.ratio || '16:9'), String(b.res || '1080p'), tz, next,
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
