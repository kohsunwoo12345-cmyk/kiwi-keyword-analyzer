import {
  Env, ensureSchema, seedAdmin, resolveDB, parseCookies, createSession, sessionCookie,
  ADMIN_EMAIL, hashPassword, ensureReferralCode, applyBalance, addNotification, logActivity, clientIp, geoFrom,
} from '../../_utils'

const DASH = '/dashboard_USE17237_612'
const ADMIN = '/adminsunkoh028741_11263'

function redirect(request: Request, path: string, extraCookies: string[] = []) {
  const headers = new Headers({ Location: new URL(path, request.url).toString() })
  for (const c of extraCookies) headers.append('Set-Cookie', c)
  return new Response(null, { status: 302, headers })
}

// GET /api/auth/google/callback?code=...&state=... → 토큰 교환 + 로그인/회원가입
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return redirect(request, '/login?error=server')
  const clearState = 'g_oauth=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0'

  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code') || ''
    const state = url.searchParams.get('state') || ''
    const oauthErr = url.searchParams.get('error')
    if (oauthErr || !code) return redirect(request, '/login?error=google_cancelled', [clearState])

    // state 검증 (+ 추천인 코드 복원)
    const cookies = parseCookies(request)
    const saved = cookies['g_oauth'] || ''
    const [savedState, refEnc] = saved.split('.')
    if (!savedState || savedState !== state) return redirect(request, '/login?error=state', [clearState])
    const ref = decodeURIComponent(refEnc || '').trim().toUpperCase()

    const clientId = env.GOOGLE_CLIENT_ID || ''
    const clientSecret = env.GOOGLE_CLIENT_SECRET || ''
    if (!clientId || !clientSecret) return redirect(request, '/login?error=google_not_configured', [clearState])
    const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`

    // 1) code → 토큰 교환
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    })
    const tokens: any = await tokenRes.json().catch(() => ({}))
    if (!tokens.access_token) return redirect(request, '/login?error=token', [clearState])

    // 2) 사용자 프로필 조회
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const info: any = await infoRes.json().catch(() => ({}))
    const email = String(info.email || '').trim().toLowerCase()
    const name = String(info.name || info.given_name || (email ? email.split('@')[0] : '') || '구글 사용자').slice(0, 60)
    if (!email) return redirect(request, '/login?error=noemail', [clearState])

    await ensureSchema(db)
    await seedAdmin(db, env)

    const now = new Date().toISOString()
    const geo = geoFrom(request)
    let u: any = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()

    if (!u) {
      // 신규 회원 생성 (비밀번호는 랜덤 해시 — 비밀번호 로그인 불가)
      const id = 'u_' + crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      const role = email === ADMIN_EMAIL ? 'admin' : 'user'
      const ph = await hashPassword(crypto.randomUUID() + crypto.randomUUID())
      await db
        .prepare(
          `INSERT INTO users (id, name, email, password_hash, company, phone, plan, role, status, points, credits, created_at, last_active, provider)
           VALUES (?, ?, ?, ?, '', '', '없음', ?, 'active', 0, 0, ?, ?, 'google')`,
        )
        .bind(id, name, email, ph, role, now, now)
        .run()
      await logActivity(db, id, 'signup', '구글 계정으로 가입').catch(() => {})
      await ensureReferralCode(db, id).catch(() => {})

      // 추천인 코드로 가입한 경우: 추천 관계 + 상호 친구 등록
      if (ref) {
        const referrer: any = await db.prepare('SELECT id, name FROM users WHERE referral_code = ?').bind(ref).first().catch(() => null)
        if (referrer && referrer.id !== id) {
          await db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').bind(referrer.id, id).run().catch(() => {})
          await db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, via, created_at) VALUES (?, ?, ?, 'code', ?)`).bind('f_' + crypto.randomUUID().slice(0, 14), referrer.id, id, now).run().catch(() => {})
          await db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, via, created_at) VALUES (?, ?, ?, 'code', ?)`).bind('f_' + crypto.randomUUID().slice(0, 14), id, referrer.id, now).run().catch(() => {})
          await addNotification(db, referrer.id, '새 추천 가입 🎉', `${name}님이 회원님의 추천 코드로 가입했어요. 친구로 추가되었습니다.`).catch(() => {})
          await logActivity(db, referrer.id, 'referral', `추천 가입: ${name}`).catch(() => {})
        }
      }

      // 웰컴 보너스
      await applyBalance(db, id, 'point', 1000, '가입 축하 포인트').catch(() => {})
      await applyBalance(db, id, 'credit', 3, '가입 축하 체험 크레딧').catch(() => {})
      await addNotification(db, id, 'BYGENCY에 오신 것을 환영합니다 🎉', '체험 크레딧 3개와 포인트 1,000P를 지급했어요. 요금제를 선택하고 크레딧을 충전하면 모든 기능을 사용할 수 있습니다!').catch(() => {})

      u = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
    } else {
      await db.prepare('UPDATE users SET last_active = ? WHERE id = ?').bind(now, u.id).run().catch(() => {})
      await logActivity(db, u.id, 'login', '구글 계정으로 로그인').catch(() => {})
    }

    if (u.status === 'suspended') return redirect(request, '/login?error=suspended', [clearState])

    // 세션 발급
    const token = await createSession(db, u.id, { ip: clientIp(request), ua: request.headers.get('User-Agent') || '', country: geo.country })

    // 이동 위치: 관리자→콘솔, 주소 미입력→주소 입력, 그 외→대시보드
    const isAdmin = u.email === ADMIN_EMAIL || u.role === 'admin'
    const addressComplete = isAdmin || !!(u.country && u.postal_code && u.address1)
    const dest = isAdmin ? ADMIN : addressComplete ? DASH : '/complete-profile'

    return redirect(request, dest, [sessionCookie(token), clearState])
  } catch {
    return redirect(request, '/login?error=google', [clearState])
  }
}
