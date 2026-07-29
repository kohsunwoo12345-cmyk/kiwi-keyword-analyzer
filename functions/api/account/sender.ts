import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity } from '../_utils'
import { ensureSenderSchema, requiredDocs, DOC_SPECS } from '../sender/_schema'

// GET → 본인 발신번호 목록
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const senders = (await db.prepare('SELECT id, phone, label, status, created_at, decided_at, reject_reason FROM sender_numbers WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').bind(me.id).all()).results || []
  return json({ ok: true, senders })
}

// POST { phone, label?, ownerType?, ownerName?, bizNo?, thirdParty? } → 발신번호 신청서 생성
//  통신사 정책상 명의 증빙 서류가 있어야 승인되므로 바로 '승인 대기'로 두지 않고
//  '서류 준비중(draft)' 으로 만든다. 서류를 다 올리면 /api/sender/requests(submit) 로 제출된다.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await (request.json().catch(() => null)) ?? {}
  const phone = String(body.phone || '').replace(/[^0-9]/g, '')
  if (phone.length < 9) return json({ ok: false, error: '올바른 전화번호를 입력하세요.' }, 400)

  const dup = await db.prepare('SELECT id FROM sender_numbers WHERE user_id = ? AND phone = ?').bind(me.id, phone).first()
  if (dup) return json({ ok: false, error: '이미 등록된 번호입니다.' }, 409)

  const ownerType = String(body.ownerType || '') === 'business' ? 'business' : 'personal'
  const thirdParty = body.thirdParty ? 1 : 0
  const now = new Date().toISOString()
  const id = 'sn_' + crypto.randomUUID().slice(0, 14)
  await db
    .prepare(`INSERT INTO sender_numbers (id, user_id, phone, label, status, created_at, owner_type, owner_name, biz_no, third_party) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`)
    .bind(id, me.id, phone, String(body.label || ''), now, ownerType, String(body.ownerName || me.name || '').slice(0, 60), String(body.bizNo || '').replace(/[^0-9]/g, '').slice(0, 12), thirdParty)
    .run()
  await logActivity(db, me.id, 'sender', `발신번호 신청서 작성: ${phone}`)
  const need = requiredDocs(ownerType, thirdParty)
  return json({
    ok: true,
    id,
    required: need,
    note: `승인을 받으려면 ${need.map((t) => DOC_SPECS[t]?.label || t).join(' · ')} 사진을 모두 첨부한 뒤 제출해야 합니다.`,
  })
}
