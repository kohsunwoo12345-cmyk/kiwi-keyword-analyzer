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
      `INSERT INTO users (id, name, email, password_hash, company, plan, role, status, created_at, last_active)
       VALUES (?, ?, ?, ?, ?, 'Starter', ?, 'active', ?, ?)`,
    )
    .bind(id, name, email, ph, company, role, now, now)
    .run()

  const token = await createSession(db, id)
  const user = publicUser({ id, name, email, company, plan: 'Starter', role, status: 'active', created_at: now, last_active: now })
  return json({ ok: true, user }, 200, { 'Set-Cookie': sessionCookie(token) })
}
