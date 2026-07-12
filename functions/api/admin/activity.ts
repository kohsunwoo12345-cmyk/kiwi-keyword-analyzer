import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/activity → 전체 사용자 활동 로그(최근순, 회원명 조인)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const limit = Math.min(500, Math.max(10, Number(url.searchParams.get('limit') || 200)))

  const rows = (await db
    .prepare(
      `SELECT a.type, a.detail, a.created_at, a.user_id, u.name, u.email
       FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all()).results || []

  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const today: any = await db.prepare('SELECT COUNT(*) AS n FROM activity_log WHERE created_at > ?').bind(dayAgo).first()

  return json({ ok: true, activity: rows, stats: { events24: today?.n || 0, total: rows.length } })
}
