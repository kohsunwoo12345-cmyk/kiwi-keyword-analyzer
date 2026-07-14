import { Env, json, ensureSchema, getSessionUser, resolveDB, publicUser, logActivity } from '../_utils'

// POST /api/account/address { country, postalCode, address1, address2? } → 사업장 주소 저장
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const country = String(b.country || '').trim().slice(0, 60)
  const postalCode = String(b.postalCode || b.postal_code || '').trim().slice(0, 20)
  const address1 = String(b.address1 || '').trim().slice(0, 200)
  const address2 = String(b.address2 || '').trim().slice(0, 200)

  if (!country) return json({ ok: false, error: '국가를 선택해 주세요.' }, 400)
  if (!postalCode) return json({ ok: false, error: '우편번호를 입력해 주세요.' }, 400)
  if (!address1) return json({ ok: false, error: '주소를 입력해 주세요.' }, 400)

  const now = new Date().toISOString()
  await db
    .prepare('UPDATE users SET country = ?, postal_code = ?, address1 = ?, address2 = ?, address_at = ? WHERE id = ?')
    .bind(country, postalCode, address1, address2, now, me.id)
    .run()

  await logActivity(db, me.id, 'address', '사업장 주소 등록/수정').catch(() => {})

  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()
  return json({ ok: true, user: publicUser(fresh) })
}
