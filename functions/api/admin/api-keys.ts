import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureApiKeysSchema } from '../_apikeys'

// GET /api/admin/api-keys?days=90 → 회원 API 키 발급/호출/크레딧 사용 현황 (관리자)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureApiKeysSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') || 90)))
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all()).results || []
  const one = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).first()) || {}

  const [totals, keys, byUser, calls, byDay] = await Promise.all([
    // 전체 요약
    one(
      `SELECT
         (SELECT COUNT(*) FROM api_keys WHERE status='active') AS active_keys,
         (SELECT COUNT(*) FROM api_keys) AS total_keys,
         (SELECT COUNT(DISTINCT user_id) FROM api_keys) AS users,
         (SELECT COUNT(*) FROM api_calls WHERE created_at > ?) AS calls,
         (SELECT COALESCE(SUM(credits),0) FROM api_calls WHERE created_at > ? AND status='ok') AS credits`,
      since, since,
    ),
    // 발급된 키 목록 (사용자 정보 조인)
    rows(
      `SELECT k.id, k.user_id, k.name, k.key_masked, k.status, k.call_count, k.last_used_at, k.created_at, k.revoked_at,
              u.name AS user_name, u.email AS user_email
       FROM api_keys k LEFT JOIN users u ON u.id = k.user_id
       ORDER BY k.created_at DESC LIMIT 1000`,
    ),
    // 사용자별 집계 (기간 내 호출·크레딧)
    rows(
      `SELECT c.user_id,
              MAX(u.name) AS user_name, MAX(u.email) AS user_email,
              COUNT(*) AS calls,
              COALESCE(SUM(CASE WHEN c.status='ok' THEN c.credits ELSE 0 END),0) AS credits,
              SUM(CASE WHEN c.status='ok' THEN 1 ELSE 0 END) AS ok_calls,
              SUM(CASE WHEN c.status!='ok' THEN 1 ELSE 0 END) AS fail_calls
       FROM api_calls c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.created_at > ?
       GROUP BY c.user_id ORDER BY credits DESC LIMIT 500`,
      since,
    ),
    // 최근 호출 로그
    rows(
      `SELECT c.created_at, c.user_id, c.endpoint, c.provider, c.model, c.kind, c.credits, c.status, c.error,
              u.name AS user_name, u.email AS user_email
       FROM api_calls c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.created_at > ? ORDER BY c.created_at DESC LIMIT 400`,
      since,
    ),
    // 일별(KST) 호출·크레딧
    rows(
      `SELECT substr(datetime(created_at, '+9 hours'),1,10) AS d, COUNT(*) AS calls,
              COALESCE(SUM(CASE WHEN status='ok' THEN credits ELSE 0 END),0) AS credits
       FROM api_calls WHERE created_at > ?
       GROUP BY d ORDER BY d DESC LIMIT 120`,
      since,
    ),
  ])

  return json({
    ok: true,
    days,
    totals: {
      activeKeys: Number((totals as any).active_keys) || 0,
      totalKeys: Number((totals as any).total_keys) || 0,
      users: Number((totals as any).users) || 0,
      calls: Number((totals as any).calls) || 0,
      credits: Number((totals as any).credits) || 0,
    },
    keys: (keys as any[]).map((k) => ({
      id: k.id,
      userId: k.user_id,
      userName: k.user_name || '',
      userEmail: k.user_email || '',
      name: k.name || '',
      masked: k.key_masked || '',
      status: k.status || '',
      callCount: Number(k.call_count) || 0,
      lastUsedAt: k.last_used_at || '',
      createdAt: k.created_at || '',
      revokedAt: k.revoked_at || '',
    })),
    byUser: (byUser as any[]).map((r) => ({
      userId: r.user_id,
      userName: r.user_name || '',
      userEmail: r.user_email || '',
      calls: Number(r.calls) || 0,
      okCalls: Number(r.ok_calls) || 0,
      failCalls: Number(r.fail_calls) || 0,
      credits: Number(r.credits) || 0,
    })),
    calls: (calls as any[]).map((c) => ({
      createdAt: c.created_at,
      userId: c.user_id,
      userName: c.user_name || '',
      userEmail: c.user_email || '',
      endpoint: c.endpoint || '',
      provider: c.provider || '',
      model: c.model || '',
      kind: c.kind || '',
      credits: Number(c.credits) || 0,
      status: c.status || '',
      error: c.error || '',
    })),
    byDay: (byDay as any[]).map((r) => ({
      d: r.d,
      calls: Number(r.calls) || 0,
      credits: Number(r.credits) || 0,
    })),
  })
}
