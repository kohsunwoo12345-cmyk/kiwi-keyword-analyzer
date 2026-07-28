import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureSchedules, FAIL_LIMIT } from '../studio/schedules'

// GET /api/admin/cron-status → 정기 실행(크론) 현황
//  외부 스케줄러(Cloudflare Workers Cron Trigger)가 실제로 돌고 있는지,
//  예약이 밀려 있지는 않은지, 조용히 실패하는 예약이 있는지 한 화면에서 본다.
//  "돌고 있는 줄 알았는데 아무것도 안 되고 있었다"가 이 시스템의 가장 큰 위험이라 만든 페이지.

const MIN = 60_000

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSchedules(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const nowIso = new Date().toISOString()
  const rows = async (sql: string, ...b: any[]) => ((await db.prepare(sql).bind(...b).all().catch(() => ({ results: [] }))) as any).results || []
  const one = async (sql: string, ...b: any[]) => ((await db.prepare(sql).bind(...b).first().catch(() => null)) as any) || {}

  const [tot, due, lastRun, schedules, fails] = await Promise.all([
    one(`SELECT COUNT(*) AS total,
                SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) AS enabled,
                SUM(CASE WHEN enabled = 0 AND fail_streak >= ? THEN 1 ELSE 0 END) AS autoStopped
         FROM studio_schedules`, FAIL_LIMIT),
    one('SELECT COUNT(*) AS c FROM studio_schedules WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?', nowIso),
    // 크론이 살아 있는지 판정하는 근거 — 어떤 예약이든 마지막으로 실행된 시각
    one('SELECT MAX(last_run_at) AS at FROM studio_schedules WHERE last_run_at IS NOT NULL'),
    rows(`SELECT s.id, s.name, s.enabled, s.freq, s.hour, s.minute, s.weekday, s.tz, s.model,
                 s.next_run_at, s.last_run_at, s.last_status, s.runs, s.max_runs, s.fail_streak,
                 u.name AS user_name, u.email AS user_email, u.credits AS user_credits,
                 (u.mcp_token IS NOT NULL AND u.mcp_token != '') AS has_token
            FROM studio_schedules s LEFT JOIN users u ON u.id = s.user_id
           ORDER BY s.enabled DESC, s.next_run_at ASC LIMIT 300`),
    rows(`SELECT s.id, s.name, s.last_run_at, s.last_status, s.fail_streak, s.enabled,
                 u.name AS user_name, u.email AS user_email
            FROM studio_schedules s LEFT JOIN users u ON u.id = s.user_id
           WHERE s.last_status LIKE '실패%' OR s.last_status LIKE '실행 불가%'
           ORDER BY s.last_run_at DESC LIMIT 50`),
  ])

  // 크론이 도는지 추정: 마지막 실행이 언제였나.
  //  ⚠ 실행할 예약이 하나도 없으면 last_run_at 도 안 갱신되므로 "예약 있음 + 오래됨" 일 때만 경고한다.
  const lastMs = lastRun.at ? Date.parse(String(lastRun.at)) : 0
  const ageMin = lastMs ? Math.round((Date.now() - lastMs) / MIN) : null
  const anyEnabled = Number(tot.enabled) > 0
  let health: 'ok' | 'warn' | 'down' | 'idle' = 'idle'
  if (!anyEnabled) health = 'idle'
  else if (Number(due.c) > 0 && (ageMin === null || ageMin > 30)) health = 'down'   // 밀린 게 있는데 안 돈다
  else if (ageMin !== null && ageMin > 60 * 26) health = 'warn'                     // 하루 넘게 조용
  else health = 'ok'

  return json({
    ok: true,
    now: nowIso,
    health,
    failLimit: FAIL_LIMIT,
    totals: {
      total: Number(tot.total) || 0,
      enabled: Number(tot.enabled) || 0,
      autoStopped: Number(tot.autoStopped) || 0,
      due: Number(due.c) || 0,
    },
    lastRunAt: lastRun.at || '',
    lastRunAgeMin: ageMin,
    schedules: schedules.map((s: any) => ({
      id: s.id, name: s.name || '', enabled: Number(s.enabled) === 1,
      freq: s.freq || 'weekly', hour: Number(s.hour) || 0, minute: Number(s.minute) || 0,
      weekday: Number(s.weekday) || 0,
      tz: s.tz || 'Asia/Seoul', model: s.model || '',
      nextRunAt: s.next_run_at || '', lastRunAt: s.last_run_at || '', lastStatus: s.last_status || '',
      runs: Number(s.runs) || 0, maxRuns: Number(s.max_runs) || 0, failStreak: Number(s.fail_streak) || 0,
      userName: s.user_name || '', userEmail: s.user_email || '',
      userCredits: Number(s.user_credits) || 0, hasToken: !!Number(s.has_token),
    })),
    failures: fails.map((f: any) => ({
      id: f.id, name: f.name || '', lastRunAt: f.last_run_at || '', lastStatus: f.last_status || '',
      failStreak: Number(f.fail_streak) || 0, enabled: Number(f.enabled) === 1,
      userName: f.user_name || '', userEmail: f.user_email || '',
    })),
  })
}
