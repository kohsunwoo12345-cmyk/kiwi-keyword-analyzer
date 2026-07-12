import { Env, json, ensureSchema, getSessionUser, publicUser, resolveDB } from '../_utils'

// GET /api/account/overview → 본인 프로필 + 크레딧/포인트 내역 + 알림 + 활동
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const transactions = (await db.prepare('SELECT kind, amount, balance_after, memo, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(me.id).all()).results || []
  const notifications = (await db.prepare('SELECT id, title, body, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(me.id).all()).results || []
  const activity = (await db.prepare('SELECT type, detail, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(me.id).all()).results || []

  return json({ ok: true, user: publicUser(me), transactions, notifications, activity })
}

// POST /api/account/overview  { action:'read-notifications' } → 알림 읽음 처리
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const body: any = await request.json().catch(() => ({}))
  if (body.action === 'read-notifications') {
    await db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').bind(me.id).run()
  }
  return json({ ok: true })
}
