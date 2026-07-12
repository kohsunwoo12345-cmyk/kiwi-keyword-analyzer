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
      `INSERT INTO users (id, name, email, password_hash, company, plan, role, status, points, credits, created_at, last_active)
       VALUES (?, ?, ?, ?, ?, 'Starter', ?, 'active', 0, 0, ?, ?)`,
    )
    .bind(id, name, email, ph, company, role, now, now)
    .run()

  await logActivity(db, id, 'signup', '회원 가입')
  // 웰컴 보너스
  await applyBalance(db, id, 'point', 1000, '가입 축하 포인트')
  await applyBalance(db, id, 'credit', 10, '가입 축하 크레딧')
  await addNotification(db, id, 'BYGENCY에 오신 것을 환영합니다 🎉', '가입 축하 포인트 1,000P와 크레딧 10개가 지급되었어요. 지금 바로 시작해보세요!')

  const token = await createSession(db, id)
  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  return json({ ok: true, user: publicUser(fresh) }, 200, { 'Set-Cookie': sessionCookie(token) })
}
