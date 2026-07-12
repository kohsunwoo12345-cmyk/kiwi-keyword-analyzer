import { Env, json, ensureSchema, seedAdmin, getSessionUser, publicUser, ADMIN_EMAIL, resolveDB } from '../_utils'

// GET /api/admin/user?id=... → 회원 상세(프로필 + 활동로그 + 거래내역 + 알림)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)

  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (me.email !== ADMIN_EMAIL && me.role !== 'admin') return json({ ok: false, error: '관리자 권한이 필요합니다.' }, 403)

  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''
  if (!id) return json({ ok: false, error: 'id가 필요합니다.' }, 400)

  const u: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  if (!u) return json({ ok: false, error: '회원을 찾을 수 없습니다.' }, 404)

  const activity = (await db.prepare('SELECT type, detail, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(id).all()).results || []
  const transactions = (await db.prepare('SELECT kind, amount, balance_after, memo, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(id).all()).results || []
  const notifications = (await db.prepare('SELECT title, body, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(id).all()).results || []

  return json({ ok: true, user: publicUser(u), activity, transactions, notifications })
}
