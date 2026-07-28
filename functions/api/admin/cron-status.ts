import { Env, json, ensureSchema, resolveDB, requireAdminUser, logActivity } from '../_utils'
import { ensureSchedules, FAIL_LIMIT, computeNextRun } from '../studio/schedules'

// GET /api/admin/cron-status → 정기 실행(크론) 현황
//  외부 스케줄러(Cloudflare Workers Cron Trigger)가 실제로 돌고 있는지,
//  예약이 밀려 있지는 않은지, 조용히 실패하는 예약이 있는지 한 화면에서 본다.
//  "돌고 있는 줄 알았는데 아무것도 안 되고 있었다"가 이 시스템의 가장 큰 위험이라 만든 페이지.

const MIN = 60_000
const LIST_LIMIT = 500   // 목록으로 내려주는 최대 건수. 넘으면 잘렸다고 알린다(조용히 자르지 않는다)

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
    // 탭 배지는 이 집계를 쓴다 — 목록은 상한에 걸려 잘릴 수 있어 그걸로 세면 숫자가 틀린다
    one(`SELECT COUNT(*) AS total,
                SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) AS enabled,
                SUM(CASE WHEN enabled = 0 THEN 1 ELSE 0 END) AS ended,
                SUM(CASE WHEN last_status LIKE '실패%' OR last_status LIKE '실행 불가%' THEN 1 ELSE 0 END) AS failed,
                SUM(CASE WHEN enabled = 0 AND fail_streak >= ? THEN 1 ELSE 0 END) AS autoStopped
         FROM studio_schedules`, FAIL_LIMIT),
    // ⚠ 크론과 똑같은 조건이어야 한다(회원 JOIN 포함). 회원이 없는 예약까지 세면
    //   크론이 영영 집어갈 수 없는 건수가 "실행 대기"로 잡혀 멈춤 경보가 헛울린다.
    one(`SELECT COUNT(*) AS c FROM studio_schedules s JOIN users u ON u.id = s.user_id
          WHERE s.enabled = 1 AND s.next_run_at IS NOT NULL AND s.next_run_at <= ?`, nowIso),
    // 크론이 살아 있는지 판정하는 근거 — 어떤 예약이든 마지막으로 실행된 시각
    one('SELECT MAX(last_run_at) AS at FROM studio_schedules WHERE last_run_at IS NOT NULL'),
    // 관리자 화면에서 "누가 무엇을 예약해 뒀는지"를 그대로 볼 수 있어야 한다 →
    //  프롬프트와 생성 옵션(길이·비율·화질), 마지막 결과 URL 까지 함께 내려준다.
    rows(`SELECT s.id, s.user_id, s.name, s.enabled, s.freq, s.hour, s.minute, s.weekday, s.tz, s.model,
                 s.prompt, s.seconds, s.ratio, s.res, s.created_at,
                 s.next_run_at, s.last_run_at, s.last_status, s.last_result, s.runs, s.max_runs, s.fail_streak,
                 u.name AS user_name, u.email AS user_email, u.credits AS user_credits,
                 (u.mcp_token IS NOT NULL AND u.mcp_token != '') AS has_token
            FROM studio_schedules s LEFT JOIN users u ON u.id = s.user_id
           ORDER BY s.enabled DESC, s.next_run_at ASC LIMIT ?`, LIST_LIMIT),
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
      ended: Number(tot.ended) || 0,
      failed: Number(tot.failed) || 0,
      autoStopped: Number(tot.autoStopped) || 0,
      due: Number(due.c) || 0,
    },
    // 목록이 잘렸는지 알려 준다 — 모르면 관리자는 "예약이 사라졌다"고 오해한다
    listLimit: LIST_LIMIT,
    truncated: (Number(tot.total) || 0) > schedules.length,
    lastRunAt: lastRun.at || '',
    lastRunAgeMin: ageMin,
    schedules: schedules.map((s: any) => {
      const enabled = Number(s.enabled) === 1
      const streak = Number(s.fail_streak) || 0
      const status = String(s.last_status || '')
      const exhausted = Number(s.max_runs) > 0 && Number(s.runs) >= Number(s.max_runs)
      // 꺼진 이유를 구분해 준다 — 사용자가 끈 것과 서버가 끈 것은 대응이 다르다
      const state: 'active' | 'autoStopped' | 'exhausted' | 'off' =
        enabled ? 'active' : (streak >= FAIL_LIMIT ? 'autoStopped' : (exhausted ? 'exhausted' : 'off'))
      return {
        id: s.id, userId: s.user_id || '', name: s.name || '', enabled, state,
        freq: s.freq || 'weekly', hour: Number(s.hour) || 0, minute: Number(s.minute) || 0,
        weekday: Number(s.weekday) || 0,
        tz: s.tz || 'Asia/Seoul', model: s.model || '',
        prompt: s.prompt || '', seconds: Number(s.seconds) || 5,
        ratio: s.ratio || '16:9', res: s.res || '1080p', createdAt: s.created_at || '',
        nextRunAt: s.next_run_at || '', lastRunAt: s.last_run_at || '',
        lastStatus: status, lastResult: s.last_result || '',
        failed: /^(실패|실행 불가)/.test(status),
        runs: Number(s.runs) || 0, maxRuns: Number(s.max_runs) || 0, failStreak: streak,
        userName: s.user_name || '', userEmail: s.user_email || '',
        userCredits: Number(s.user_credits) || 0, hasToken: !!Number(s.has_token),
      }
    }),
    failures: fails.map((f: any) => ({
      id: f.id, name: f.name || '', lastRunAt: f.last_run_at || '', lastStatus: f.last_status || '',
      failStreak: Number(f.fail_streak) || 0, enabled: Number(f.enabled) === 1,
      userName: f.user_name || '', userEmail: f.user_email || '',
    })),
  })
}

// POST /api/admin/cron-status  { id, enabled }  → 관리자가 예약을 직접 켜고 끈다
//  꺼진 예약을 다시 켤 때 next_run_at 을 지금 기준으로 다시 계산한다.
//  안 그러면 과거 시각이 남아 있어 켜자마자 즉시 실행되고(= 의도치 않은 과금),
//  연속 실패 기록도 남아 있어 한 번만 더 실패해도 곧장 자동 중지된다.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSchedules(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  let b: any = {}
  try { b = await request.json() } catch { return json({ ok: false, error: '잘못된 요청' }, 400) }
  const id = String(b.id || '').trim()
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  const enable = b.enabled !== false

  const row: any = await db.prepare('SELECT * FROM studio_schedules WHERE id = ?').bind(id).first()
  if (!row) return json({ ok: false, error: '없는 예약입니다.' }, 404)

  if (enable) {
    const next = computeNextRun(String(row.freq || 'weekly'), Number(row.hour) || 0, Number(row.minute) || 0,
      Number(row.weekday) || 0, Date.now(), String(row.tz || 'Asia/Seoul'))
    await db.prepare(
      'UPDATE studio_schedules SET enabled = 1, fail_streak = 0, next_run_at = ?, last_status = ? WHERE id = ?',
    ).bind(next, '관리자가 다시 켬', id).run()
    await logActivity(db, String(row.user_id), 'admin', `예약 재개: ${row.name || id}`).catch(() => {})
    return json({ ok: true, enabled: true, nextRunAt: next })
  }

  await db.prepare('UPDATE studio_schedules SET enabled = 0, last_status = ? WHERE id = ?')
    .bind('관리자가 중지함', id).run()
  await logActivity(db, String(row.user_id), 'admin', `예약 중지: ${row.name || id}`).catch(() => {})
  return json({ ok: true, enabled: false })
}
