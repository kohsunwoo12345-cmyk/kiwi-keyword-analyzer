import { Env, json, ensureSchema, getSessionUser, resolveDB, addNotification, logActivity } from '../_utils'

// POST /api/account/add-friend { code } → 추천인 코드로 친구 추가 (상호)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const code = String(b.code || '').trim().toUpperCase()
  if (!code) return json({ ok: false, error: '추천인 코드를 입력하세요.' }, 400)
  if (code === (me.referral_code || '').toUpperCase()) return json({ ok: false, error: '본인 코드는 추가할 수 없습니다.' }, 400)

  const friend: any = await db.prepare('SELECT id, name, email FROM users WHERE referral_code = ?').bind(code).first()
  if (!friend) return json({ ok: false, error: '해당 코드의 회원을 찾을 수 없습니다.' }, 404)
  if (friend.id === me.id) return json({ ok: false, error: '본인은 추가할 수 없습니다.' }, 400)

  const exists = await db.prepare('SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?').bind(me.id, friend.id).first()
  if (exists) return json({ ok: false, error: '이미 친구입니다.', already: true }, 200)

  const now = new Date().toISOString()
  await db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, via, created_at) VALUES (?, ?, ?, 'add', ?)`).bind('f_' + crypto.randomUUID().slice(0, 14), me.id, friend.id, now).run()
  await db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, via, created_at) VALUES (?, ?, ?, 'add', ?)`).bind('f_' + crypto.randomUUID().slice(0, 14), friend.id, me.id, now).run()

  await addNotification(db, friend.id, '새 친구 추가 👋', `${me.name}님이 회원님을 친구로 추가했어요.`).catch(() => {})
  await logActivity(db, me.id, 'friend', `친구 추가: ${friend.name}`)

  return json({ ok: true, friend: { id: friend.id, name: friend.name, email: friend.email } })
}
