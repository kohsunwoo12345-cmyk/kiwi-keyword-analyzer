import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/logs?kind=all|activity|audit|security&limit=300 → 통합 로그 기록
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const kind = url.searchParams.get('kind') || 'all'
  const limit = Math.min(1000, Math.max(20, Number(url.searchParams.get('limit') || 300)))
  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all()).results || []

  const out: any = { ok: true }

  if (kind === 'all' || kind === 'activity') {
    out.activity = await rows(
      `SELECT a.type, a.detail, a.created_at, a.user_id, u.name, u.email
       FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT ?`, limit)
  }
  if (kind === 'all' || kind === 'audit') {
    out.audit = await rows('SELECT admin_email, action, target, detail, severity, ip, created_at FROM audit_log ORDER BY created_at DESC LIMIT ?', limit)
  }
  if (kind === 'all' || kind === 'security') {
    out.security = await rows('SELECT ts, ip, method, path, status, severity, detail, country, ua FROM security_log ORDER BY ts DESC LIMIT ?', limit)
  }

  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const cnt = async (sql: string, ...b: any[]) => { const r: any = await db.prepare(sql).bind(...b).first(); return r?.n || 0 }
  out.stats = {
    activity24: await cnt('SELECT COUNT(*) AS n FROM activity_log WHERE created_at > ?', dayAgo),
    audit24: await cnt('SELECT COUNT(*) AS n FROM audit_log WHERE created_at > ?', dayAgo),
    security24: await cnt('SELECT COUNT(*) AS n FROM security_log WHERE ts > ?', dayAgo),
    threats24: await cnt("SELECT COUNT(*) AS n FROM security_log WHERE ts > ? AND severity IN ('warn','high')", dayAgo),
  }
  return json(out)
}
