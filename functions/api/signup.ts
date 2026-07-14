import {
  Env,
  json,
  ensureSchema,
  hashPassword,
  createSession,
  sessionCookie,
  publicUser,
  ADMIN_EMAIL,
  resolveDB,
  logActivity,
  applyBalance,
  addNotification,
  clientIp,
  geoFrom,
  ensureReferralCode,
} from './_utils'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: '데이터베이스(D1) 바인딩이 설정되지 않았습니다.' }, 500)
  await ensureSchema(db)

  const body: any = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const company = String(body.company || '').trim()
  const phone = String(body.phone || '').replace(/[^0-9]/g, '')

  if (!name || !email || !password) return json({ ok: false, error: '필수 항목을 입력하세요.' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: '이메일 형식이 올바르지 않습니다.' }, 400)
  if (password.length < 8) return json({ ok: false, error: '비밀번호는 8자 이상이어야 합니다.' }, 400)

  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (exists) return json({ ok: false, error: '이미 가입된 이메일입니다.' }, 409)

  const id = 'u_' + crypto.randomUUID().replace(/-/g, '').slice(0, 14)
  const now = new Date().toISOString()
  const role = email === ADMIN_EMAIL ? 'admin' : 'user'
  const ph = await hashPassword(password)

  await db
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, company, phone, plan, role, status, points, credits, created_at, last_active)
       VALUES (?, ?, ?, ?, ?, ?, '없음', ?, 'active', 0, 0, ?, ?)`,
    )
    .bind(id, name, email, ph, company, phone, role, now, now)
    .run()

  await logActivity(db, id, 'signup', '회원 가입')
  // 추천인 코드 발급
  await ensureReferralCode(db, id)
  // 추천인 코드로 가입한 경우: 추천 관계 + 상호 친구 등록
  const refInput = String(body.ref || body.referral || body.referralCode || '').trim().toUpperCase()
  if (refInput) {
    const referrer: any = await db.prepare('SELECT id, name FROM users WHERE referral_code = ?').bind(refInput).first()
    if (referrer && referrer.id !== id) {
      await db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').bind(referrer.id, id).run()
      const t1 = 'f_' + crypto.randomUUID().slice(0, 14)
      const t2 = 'f_' + crypto.randomUUID().slice(0, 14)
      await db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, via, created_at) VALUES (?, ?, ?, 'code', ?)`).bind(t1, referrer.id, id, now).run()
      await db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, via, created_at) VALUES (?, ?, ?, 'code', ?)`).bind(t2, id, referrer.id, now).run()
      await addNotification(db, referrer.id, '새 추천 가입 🎉', `${name}님이 회원님의 추천 코드로 가입했어요. 친구로 추가되었습니다.`)
      await logActivity(db, referrer.id, 'referral', `추천 가입: ${name}`)
    }
  }
  // 웰컴 보너스
  await applyBalance(db, id, 'point', 1000, '가입 축하 포인트')
  await applyBalance(db, id, 'credit', 3, '가입 축하 체험 크레딧')
  await addNotification(db, id, 'BYGENCY에 오신 것을 환영합니다 🎉', '체험 크레딧 3개와 포인트 1,000P를 지급했어요. 요금제를 선택하고 크레딧을 충전하면 모든 기능을 사용할 수 있습니다!')

  const geo = geoFrom(request)
  const token = await createSession(db, id, { ip: clientIp(request), ua: request.headers.get('User-Agent') || '', country: geo.country })
  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  return json({ ok: true, user: publicUser(fresh) }, 200, { 'Set-Cookie': sessionCookie(token) })
}
