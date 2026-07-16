import { Env, json, ensureSchema, getSessionUser, resolveDB, publicUser, logActivity, addNotification } from '../_utils'

// POST /api/account/address { country, postalCode, address1, address2?, phone?, ref? } → 사업장 주소(+전화·추천인) 저장
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
  const phone = String(b.phone || '').replace(/[^0-9]/g, '').slice(0, 20)
  const ref = String(b.ref || b.referral || '').trim().toUpperCase().slice(0, 32)

  if (!country) return json({ ok: false, error: '국가를 선택해 주세요.' }, 400)
  if (!postalCode) return json({ ok: false, error: '우편번호를 입력해 주세요.' }, 400)
  if (!address1) return json({ ok: false, error: '주소를 입력해 주세요.' }, 400)

  const now = new Date().toISOString()

  // 약관 동의 — 간편로그인(구글) 후 아직 동의하지 않은 회원은 이 단계에서 필수 동의를 받는다.
  const isAdmin = me.role === 'admin'
  const consentPending = !isAdmin && !(Number(me.tos_consent) === 1 && Number(me.privacy_consent) === 1)
  if (consentPending) {
    const tosOk = b.tos === 1 || b.tos === '1' || b.tos === true
    const privacyOk = b.privacy === 1 || b.privacy === '1' || b.privacy === true
    if (!tosOk || !privacyOk) {
      return json({ ok: false, error: '필수 약관(이용약관·개인정보처리방침)에 모두 동의해 주세요.' }, 400)
    }
    const mktOk = b.marketing === 1 || b.marketing === '1' || b.marketing === true
    await db
      .prepare('UPDATE users SET tos_consent = 1, privacy_consent = 1, marketing_consent = ?, consent_at = ? WHERE id = ?')
      .bind(mktOk ? 1 : 0, now, me.id)
      .run()
    await logActivity(db, me.id, 'consent', `약관 동의(간편로그인) · 마케팅수신 ${mktOk ? '동의' : '미동의'}`).catch(() => {})
  }
  await db
    .prepare('UPDATE users SET country = ?, postal_code = ?, address1 = ?, address2 = ?, address_at = ? WHERE id = ?')
    .bind(country, postalCode, address1, address2, now, me.id)
    .run()

  // 전화번호 (입력 시에만 갱신)
  if (phone) {
    await db.prepare('UPDATE users SET phone = ? WHERE id = ?').bind(phone, me.id).run().catch(() => {})
  }

  // 추천인 코드 — 아직 추천 관계가 없는 경우에만 적용 (구글 가입자 등)
  if (ref && !me.referred_by) {
    const referrer: any = await db.prepare('SELECT id, name FROM users WHERE referral_code = ?').bind(ref).first().catch(() => null)
    if (referrer && referrer.id !== me.id) {
      await db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').bind(referrer.id, me.id).run().catch(() => {})
      await db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, via, created_at) VALUES (?, ?, ?, 'code', ?)`).bind('f_' + crypto.randomUUID().slice(0, 14), referrer.id, me.id, now).run().catch(() => {})
      await db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, via, created_at) VALUES (?, ?, ?, 'code', ?)`).bind('f_' + crypto.randomUUID().slice(0, 14), me.id, referrer.id, now).run().catch(() => {})
      await addNotification(db, referrer.id, '새 추천 가입 🎉', `${me.name}님이 회원님의 추천 코드로 연결되었습니다. 친구로 추가되었어요.`).catch(() => {})
      await logActivity(db, referrer.id, 'referral', `추천 연결: ${me.name}`).catch(() => {})
    }
  }

  await logActivity(db, me.id, 'address', '사업장 주소 등록/수정').catch(() => {})

  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()
  return json({ ok: true, user: publicUser(fresh) })
}
