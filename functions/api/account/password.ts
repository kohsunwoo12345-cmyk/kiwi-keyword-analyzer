import { Env, json, ensureSchema, getSessionUser, resolveDB, verifyPassword, hashPassword, logActivity } from '../_utils'

// POST /api/account/password  { current, next } → 본인 비밀번호 변경
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const current = String(body.current || '')
  const next = String(body.next || '')
  if (next.length < 8) return json({ ok: false, error: '새 비밀번호는 8자 이상이어야 합니다.' }, 400)

  const valid = await verifyPassword(current, me.password_hash)
  if (!valid) return json({ ok: false, error: '현재 비밀번호가 올바르지 않습니다.' }, 400)

  const ph = await hashPassword(next)
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(ph, me.id).run()
  await logActivity(db, me.id, 'password', '비밀번호 변경')
  return json({ ok: true })
}
