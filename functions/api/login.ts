import {
  Env,
  json,
  ensureSchema,
  seedAdmin,
  verifyPassword,
  hashPassword,
  createSession,
  sessionCookie,
  publicUser,
  ADMIN_EMAIL,
  adminPassword,
  resolveDB,
  logActivity,
  clientIp,
  geoFrom,
  recordLoginFailure,
  countRecentLoginFailures,
  logSecurity,
  getSetting,
  deviceSig,
} from './_utils'

const BRUTE_FORCE_LIMIT = 8 // 15분 내 이 횟수 초과 실패 시 IP 자동 차단

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: '데이터베이스(D1) 바인딩이 설정되지 않았습니다.' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)

  const body: any = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const ip = clientIp(request)
  const ua = request.headers.get('User-Agent') || ''
  const geo = geoFrom(request)
  if (!email || !password) return json({ ok: false, error: '이메일과 비밀번호를 입력하세요.' }, 400)

  const now = new Date().toISOString()
  const sessMeta = { ip, ua, country: geo.country }

  // 로그인 실패 처리 (브루트포스 감지 + 자동 차단)
  const failLogin = async (reason: string, status = 401) => {
    await recordLoginFailure(db, email, ip, ua, geo.country)
    const fails = await countRecentLoginFailures(db, ip, 15)
    if (fails >= BRUTE_FORCE_LIMIT) {
      await db
        .prepare('INSERT OR REPLACE INTO blocked_ips (ip, reason, source, created_at, country, city) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(ip, `브루트포스 자동 차단 (15분 내 ${fails}회 실패)`, 'auto', now, geo.country, geo.city)
        .run()
      await logSecurity(db, { ip, method: 'POST', path: '/api/login', status: 403, severity: 'high', detail: `브루트포스 자동 차단 (${fails}회 실패)`, country: geo.country, city: geo.city, ua })
    } else {
      await logSecurity(db, { ip, method: 'POST', path: '/api/login', status, severity: 'warn', detail: `로그인 실패: ${email}`, country: geo.country, city: geo.city, ua })
    }
    return json({ ok: false, error: reason }, status)
  }

  // ── 관리자: 확정 비밀번호로 항상 로그인 가능 (없으면 생성, 있으면 동기화) ──
  if (email === ADMIN_EMAIL && password === adminPassword(env)) {
    // 관리자 로그인 기기/IP 잠금 — 등록된 기기 또는 IP가 아니면 차단
    if ((await getSetting(db, 'admin_login_lock')) === 'on') {
      const devs: any[] = (await db.prepare('SELECT device, ip FROM admin_devices').all()).results || []
      if (devs.length) {
        const reqDevice = deviceSig(ua)
        const ipOk = devs.some((d) => d.ip === ip)
        const devOk = devs.some((d) => d.device === reqDevice)
        if (!ipOk && !devOk) {
          await logSecurity(db, { ip, method: 'POST', path: '/api/login', status: 403, severity: 'high', detail: `관리자 로그인 기기/IP 제한 차단 (${reqDevice})`, country: geo.country, city: geo.city, ua })
          return json({ ok: false, error: '등록되지 않은 기기·IP에서는 관리자 로그인이 제한되어 있습니다.' }, 403)
        }
      }
    }
    const ph = await hashPassword(password)
    const existing: any = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (existing) {
      await db
        .prepare("UPDATE users SET password_hash = ?, role = 'admin', status = 'active', last_active = ? WHERE email = ?")
        .bind(ph, now, email)
        .run()
    } else {
      await db
        .prepare(
          `INSERT INTO users (id, name, email, password_hash, company, plan, role, status, created_at, last_active)
           VALUES ('admin_root', '관리자', ?, ?, '(주)넥스트 바이전시', 'Business', 'admin', 'active', ?, ?)`,
        )
        .bind(email, ph, now, now)
        .run()
    }
    const fresh: any = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    const token = await createSession(db, fresh.id, sessMeta)
    await logActivity(db, fresh.id, 'login', '관리자 로그인')
    return json({ ok: true, user: publicUser(fresh) }, 200, { 'Set-Cookie': sessionCookie(token) })
  }

  // ── 일반 회원 ──
  const row: any = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!row) return failLogin('이메일 또는 비밀번호가 올바르지 않습니다.')

  // 소셜(구글) 가입 계정은 비밀번호 로그인 차단 — "구글로만" 로그인 가능.
  //   (구글 가입 시 password_hash 는 랜덤값, password_set=0. 본인이 직접 비밀번호를
  //    설정한 경우(password_set=1)에만 예외적으로 비밀번호 로그인 허용.)
  const isSocial = row.provider && row.provider !== 'email'
  const hasOwnPassword = Number(row.password_set) === 1
  if (isSocial && !hasOwnPassword) {
    await logSecurity(db, { ip, method: 'POST', path: '/api/login', status: 403, severity: 'info', detail: `소셜(${row.provider}) 계정 비밀번호 로그인 차단: ${email}`, country: geo.country, city: geo.city, ua })
    return json({ ok: false, error: '구글 계정으로 가입한 이메일입니다. "구글로 로그인"을 이용해 주세요.', social: String(row.provider) }, 403)
  }

  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) return failLogin('이메일 또는 비밀번호가 올바르지 않습니다.')
  if (row.status === 'suspended') return json({ ok: false, error: '정지된 계정입니다. 관리자에게 문의하세요.' }, 403)

  await db.prepare('UPDATE users SET last_active = ? WHERE id = ?').bind(now, row.id).run()
  const token = await createSession(db, row.id, sessMeta)
  await logActivity(db, row.id, 'login', '로그인')
  return json({ ok: true, user: publicUser(row) }, 200, { 'Set-Cookie': sessionCookie(token) })
}
