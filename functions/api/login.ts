import {
  Env,
  json,
  ensureSchema,
  verifyPassword,
  hashPassword,
  createSession,
  sessionCookie,
  publicUser,
  ADMIN_EMAIL,
} from './_utils'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB
  if (!db) return json({ ok: false, error: '데이터베이스(D1) 바인딩이 설정되지 않았습니다.' }, 500)
  await ensureSchema(db)

  const body: any = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) return json({ ok: false, error: '이메일과 비밀번호를 입력하세요.' }, 400)

  const row: any = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()

  // 관리자 계정 최초 로그인 시 자동 생성(비밀번호는 처음 입력값으로 설정)
  if (!row && email === ADMIN_EMAIL) {
    const id = 'admin_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    const now = new Date().toISOString()
    const ph = await hashPassword(password)
    await db
      .prepare(
        `INSERT INTO users (id, name, email, password_hash, company, plan, role, status, created_at, last_active)
         VALUES (?, '관리자', ?, ?, '(주)Next Vision Company', 'Business', 'admin', 'active', ?, ?)`,
      )
      .bind(id, email, ph, now, now)
      .run()
    const token = await createSession(db, id)
    const user = publicUser({ id, name: '관리자', email, company: '(주)Next Vision Company', plan: 'Business', role: 'admin', status: 'active', created_at: now, last_active: now })
    return json({ ok: true, user }, 200, { 'Set-Cookie': sessionCookie(token) })
  }

  if (!row) return json({ ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) return json({ ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
  if (row.status === 'suspended') return json({ ok: false, error: '정지된 계정입니다. 관리자에게 문의하세요.' }, 403)

  await db.prepare('UPDATE users SET last_active = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run()

  const token = await createSession(db, row.id)
  return json({ ok: true, user: publicUser(row) }, 200, { 'Set-Cookie': sessionCookie(token) })
}
