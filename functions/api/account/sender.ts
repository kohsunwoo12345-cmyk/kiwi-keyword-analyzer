import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity } from '../_utils'

// GET → 본인 발신번호 목록
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const senders = (await db.prepare('SELECT id, phone, label, status, created_at, decided_at FROM sender_numbers WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').bind(me.id).all()).results || []
  return json({ ok: true, senders })
}

// POST { phone, label? } → 발신번호 등록(승인 대기)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const phone = String(body.phone || '').replace(/[^0-9]/g, '')
  if (phone.length < 9) return json({ ok: false, error: '올바른 전화번호를 입력하세요.' }, 400)

  const dup = await db.prepare('SELECT id FROM sender_numbers WHERE user_id = ? AND phone = ?').bind(me.id, phone).first()
  if (dup) return json({ ok: false, error: '이미 등록된 번호입니다.' }, 409)

  const now = new Date().toISOString()
  await db
    .prepare(`INSERT INTO sender_numbers (id, user_id, phone, label, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`)
    .bind('sn_' + crypto.randomUUID().slice(0, 14), me.id, phone, String(body.label || ''), now)
    .run()
  await logActivity(db, me.id, 'sender', `발신번호 등록 신청: ${phone}`)
  return json({ ok: true })
}
