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
} from './_utils'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB
  if (!db) return json({ ok: false, error: '데이터베이스(D1) 바인딩이 설정되지 않았습니다.' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)

  const body: any = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) return json({ ok: false, error: '이메일과 비밀번호를 입력하세요.' }, 400)

  const now = new Date().toISOString()

  // ── 관리자: 확정 비밀번호로 항상 로그인 가능 (없으면 생성, 있으면 동기화) ──
  if (email === ADMIN_EMAIL && password === adminPassword(env)) {
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
           VALUES ('admin_root', '관리자', ?, ?, '(주)Next Vision Company', 'Business', 'admin', 'active', ?, ?)`,
        )
        .bind(email, ph, now, now)
        .run()
    }
    const fresh: any = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    const token = await createSession(db, fresh.id)
    return json({ ok: true, user: publicUser(fresh) }, 200, { 'Set-Cookie': sessionCookie(token) })
  }

  // ── 일반 회원 ──
  const row: any = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!row) return json({ ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) return json({ ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
  if (row.status === 'suspended') return json({ ok: false, error: '정지된 계정입니다. 관리자에게 문의하세요.' }, 403)

  await db.prepare('UPDATE users SET last_active = ? WHERE id = ?').bind(now, row.id).run()
  const token = await createSession(db, row.id)
  return json({ ok: true, user: publicUser(row) }, 200, { 'Set-Cookie': sessionCookie(token) })
}
