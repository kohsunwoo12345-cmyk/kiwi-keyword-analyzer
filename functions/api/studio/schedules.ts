import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { MODEL_COST } from './_pricing'

// 정기 자동 생성 — "매주 월요일 오전 9시에 신제품 영상" 같은 반복 제작을 서버가 대신 돌린다.
//  Figma Weave 는 API 가 없어(공식 헬프센터 명시) 이런 자동화를 아예 할 수 없다.
//  실행은 외부 스케줄러가 /api/cron/video-schedules 를 주기적으로 호출하면서 이뤄진다
//  (이 저장소의 다른 배치와 동일하게 X-Cron-Token 규약을 쓴다).

const MAX_PER_USER = 10
const KST_OFFSET_MIN = 9 * 60   // 사용자는 한국 시간으로 시각을 고른다

export async function ensureSchedules(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS studio_schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      freq TEXT NOT NULL DEFAULT 'weekly',   -- daily | weekly
      hour INTEGER NOT NULL DEFAULT 9,       -- 0~23 (KST)
      weekday INTEGER NOT NULL DEFAULT 1,    -- 0=일 … 6=토 (freq=weekly 일 때)
      model TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL DEFAULT '',
      seconds INTEGER NOT NULL DEFAULT 5,
      ratio TEXT NOT NULL DEFAULT '16:9',
      res TEXT NOT NULL DEFAULT '1080p',
      next_run_at TEXT,
      last_run_at TEXT,
      last_status TEXT NOT NULL DEFAULT '',
      last_result TEXT NOT NULL DEFAULT '',
      runs INTEGER NOT NULL DEFAULT 0,
      max_runs INTEGER NOT NULL DEFAULT 0,   -- 0=무제한
      created_at TEXT
    )`,
  ).run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sched_due ON studio_schedules (enabled, next_run_at)').run().catch(() => {})
}

/** 다음 실행 시각(UTC ISO). 사용자가 고른 KST 시각 기준으로 "지금 이후 가장 가까운" 때를 구한다. */
export function computeNextRun(freq: string, hour: number, weekday: number, fromMs: number): string {
  const h = Math.min(23, Math.max(0, Math.round(hour) || 0))
  const wd = Math.min(6, Math.max(0, Math.round(weekday) || 0))
  // KST 기준으로 계산한 뒤 UTC 로 되돌린다
  const kstNow = new Date(fromMs + KST_OFFSET_MIN * 60000)
  const cand = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(), h, 0, 0))
  if (freq === 'daily') {
    if (cand.getTime() <= kstNow.getTime()) cand.setUTCDate(cand.getUTCDate() + 1)
  } else {
    // 이번 주의 해당 요일로 옮기고, 이미 지났으면 다음 주
    const diff = (wd - cand.getUTCDay() + 7) % 7
    cand.setUTCDate(cand.getUTCDate() + diff)
    if (cand.getTime() <= kstNow.getTime()) cand.setUTCDate(cand.getUTCDate() + 7)
  }
  return new Date(cand.getTime() - KST_OFFSET_MIN * 60000).toISOString()
}

const row2json = (r: any) => ({
  id: r.id, name: r.name || '', enabled: Number(r.enabled) === 1,
  freq: r.freq || 'weekly', hour: Number(r.hour) || 0, weekday: Number(r.weekday) || 0,
  model: r.model || '', prompt: r.prompt || '', seconds: Number(r.seconds) || 5,
  ratio: r.ratio || '16:9', res: r.res || '1080p',
  nextRunAt: r.next_run_at || '', lastRunAt: r.last_run_at || '',
  lastStatus: r.last_status || '', lastResult: r.last_result || '',
  runs: Number(r.runs) || 0, maxRuns: Number(r.max_runs) || 0,
})

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
  const weekday = Math.min(6, Math.max(0, Number(b.weekday) || 0))
  const next = computeNextRun(freq, hour, weekday, Date.now())
  const now = new Date().toISOString()

  if (b.id) {
    const own: any = await db.prepare('SELECT id FROM studio_schedules WHERE id = ? AND user_id = ?').bind(String(b.id), me.id).first()
    if (!own) return json({ ok: false, error: '없는 예약입니다.' }, 404)
    await db.prepare(
      `UPDATE studio_schedules SET name=?, enabled=?, freq=?, hour=?, weekday=?, model=?, prompt=?,
        seconds=?, ratio=?, res=?, max_runs=?, next_run_at=? WHERE id=? AND user_id=?`,
    ).bind(String(b.name || '').slice(0, 60), b.enabled === false ? 0 : 1, freq, hour, weekday, model, prompt,
      Math.max(1, Number(b.seconds) || 5), String(b.ratio || '16:9'), String(b.res || '1080p'),
      Math.max(0, Number(b.maxRuns) || 0), next, String(b.id), me.id).run()
    return json({ ok: true, id: b.id, nextRunAt: next })
  }

  const cnt: any = await db.prepare('SELECT COUNT(*) AS c FROM studio_schedules WHERE user_id = ?').bind(me.id).first()
  if (cnt && Number(cnt.c) >= MAX_PER_USER)
    return json({ ok: false, error: `예약은 최대 ${MAX_PER_USER}개까지 만들 수 있습니다.` }, 400)
  const id = 'sc_' + crypto.randomUUID().slice(0, 12)
  await db.prepare(
    `INSERT INTO studio_schedules (id,user_id,name,enabled,freq,hour,weekday,model,prompt,seconds,ratio,res,next_run_at,max_runs,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(id, me.id, String(b.name || '').slice(0, 60), b.enabled === false ? 0 : 1, freq, hour, weekday, model, prompt,
    Math.max(1, Number(b.seconds) || 5), String(b.ratio || '16:9'), String(b.res || '1080p'), next,
    Math.max(0, Number(b.maxRuns) || 0), now).run()
  return json({ ok: true, id, nextRunAt: next })
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
