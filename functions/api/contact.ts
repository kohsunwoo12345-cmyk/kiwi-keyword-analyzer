import { Env, json, ensureSchema, resolveDB, clientIp } from './_utils'

// POST /api/contact { name, email, phone?, company?, message } → 문의 접수 (공개)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)

  const body: any = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const phone = String(body.phone || '').trim()
  const company = String(body.company || '').trim()
  const message = String(body.message || '').trim()

  if (!name || (!email && !phone)) return json({ ok: false, error: '이름과 연락처(이메일 또는 전화번호)를 입력하세요.' }, 400)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: '이메일 형식이 올바르지 않습니다.' }, 400)
  if (!message) return json({ ok: false, error: '문의 내용을 입력하세요.' }, 400)
  if (message.length > 4000) return json({ ok: false, error: '문의 내용이 너무 깁니다.' }, 400)

  await db
    .prepare(`INSERT INTO contact_messages (id, name, email, phone, company, message, ip, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`)
    .bind('cm_' + crypto.randomUUID().slice(0, 14), name, email, phone, company, message, clientIp(request), new Date().toISOString())
    .run()
  return json({ ok: true })
}
