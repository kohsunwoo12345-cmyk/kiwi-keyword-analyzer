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
import { resendEmail, emailShell } from './_external'

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
  const marketingConsent = body.marketingConsent ? 1 : 0
  const aiConsent = body.aiConsent ? 1 : 0
  // 이용약관·개인정보처리방침은 가입 필수 동의 → 항상 1
  const tosConsent = 1
  const privacyConsent = 1

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
      `INSERT INTO users (id, name, email, password_hash, company, phone, plan, role, status, points, credits, created_at, last_active, marketing_consent, ai_consent, tos_consent, privacy_consent, consent_at, password_set)
       VALUES (?, ?, ?, ?, ?, ?, '없음', ?, 'active', 0, 0, ?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .bind(id, name, email, ph, company, phone, role, now, now, marketingConsent, aiConsent, tosConsent, privacyConsent, now)
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
  // 가입 축하 포인트·크레딧 지급 없음 (요금제 결제로만 사용 가능)
  await addNotification(db, id, 'BYGENCY에 오신 것을 환영합니다 🎉', '가입이 완료되었어요. 요금제를 활성화하면 마케팅 대시보드와 노드형 AI 영상 제작을 모두 사용할 수 있어요. 친구가 요금제에 가입하면 결제액의 1%를 크레딧으로 받을 수 있어요!')

  // 가입 환영 메일 발송 (로고 포함) — 실패해도 가입은 완료. 발송 이력은 email_log 에 기록.
  try {
    const html = emailShell(`
        <h1 style="font-size:19px;margin:16px 0 8px">가입을 환영합니다 🎉</h1>
        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px">
          안녕하세요 ${name}님, BYGENCY 가입이 완료되었어요.<br/>
          요금제를 활성화하면 <b>마케팅 대시보드</b>와 <b>노드형 AI 영상 제작</b>을 모두 사용할 수 있습니다.
        </p>
        <a href="https://bygency.co/activate" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:12px">요금제 활성화하기</a>
        <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:18px 0 0">
          친구가 요금제에 가입하면 결제액의 1%를 크레딧으로 받을 수 있어요.
        </p>`)
    // from 미지정 → resendEmail 이 RESEND_FROM 환경변수(검증된 발신주소) 우선 사용, 없으면 cs@bygency.co
    // 발송 성공/실패·사유는 email_log(관리자 "환영인사 메일" 메뉴)에 기록됨.
    const wr = await resendEmail(env, { to: email, subject: '[BYGENCY] 가입을 환영합니다 🎉', html }, { db, kind: 'welcome', userId: id })
    if (!wr.ok) console.warn('[signup] welcome email failed:', wr.error)
  } catch (e) { console.warn('[signup] welcome email exception:', e) }

  const geo = geoFrom(request)
  const token = await createSession(db, id, { ip: clientIp(request), ua: request.headers.get('User-Agent') || '', country: geo.country })
  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  return json({ ok: true, user: publicUser(fresh) }, 200, { 'Set-Cookie': sessionCookie(token) })
}
