import { Env, json, ensureSchema, getSessionUser, resolveDB, verifyPassword, hashPassword, logActivity, sameOriginOk } from '../_utils'

// POST /api/account/password  { current, next } → 본인 비밀번호 변경
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  if (!sameOriginOk(request)) return json({ ok: false, error: '허용되지 않은 출처의 요청입니다.' }, 403)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const current = String(body.current || '')
  const next = String(body.next || '')
  if (next.length < 8) return json({ ok: false, error: '새 비밀번호는 8자 이상이어야 합니다.' }, 400)

  // 간편로그인(구글/카카오) 계정이 아직 비밀번호를 설정한 적 없으면(=password_set 0),
  // 현재 비밀번호 없이 최초 설정 허용. 그 외에는 현재 비밀번호 검증.
  const isSocial = me.provider && me.provider !== 'email'
  const hasPassword = Number(me.password_set) === 1
  const firstTimeSocialSet = isSocial && !hasPassword

  if (!firstTimeSocialSet) {
    const valid = await verifyPassword(current, me.password_hash)
    if (!valid) return json({ ok: false, error: '현재 비밀번호가 올바르지 않습니다.' }, 400)
  }

  const ph = await hashPassword(next)
  await db.prepare('UPDATE users SET password_hash = ?, password_set = 1 WHERE id = ?').bind(ph, me.id).run()
  await logActivity(db, me.id, 'password', firstTimeSocialSet ? '비밀번호 최초 설정' : '비밀번호 변경')
  return json({ ok: true, firstTimeSet: firstTimeSocialSet })
}
