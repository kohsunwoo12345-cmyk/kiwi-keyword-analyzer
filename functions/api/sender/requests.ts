import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity, sameOriginOk, rateLimitOk, asText } from '../_utils'
import { ensureSenderSchema, docsBySender, missingDocs, requiredDocs, DOC_SPECS, OWNER_LABEL, STATUS_LABEL } from './_schema'

// 회원 발신번호 사전등록(승인 신청)
//  GET  /api/sender/requests                      → 내 신청 목록 + 서류 + 부족 서류 + 서류 정의
//  POST /api/sender/requests { action, ... }
//    action='create' { phone, label, ownerType, ownerName, bizNo, thirdParty } → 신청서 생성(draft)
//    action='update' { id, ... }                  → draft/rejected 상태에서 신청서 수정
//    action='submit' { id }                       → 필수 서류가 전부 있을 때만 승인 대기(pending)로 제출
//    action='cancel' { id }                       → 제출 취소(pending → draft)
//    action='delete' { id }                       → 신청 삭제(승인된 건 제외) + 서류 삭제

const digits = (s: any) => asText(s).replace(/[^0-9]/g, '')

function shape(row: any, docs: any[]) {
  const miss = missingDocs(row, docs as any)
  return {
    id: String(row.id),
    phone: String(row.phone || ''),
    label: String(row.label || ''),
    status: String(row.status || 'draft'),
    statusLabel: STATUS_LABEL[String(row.status || 'draft')] || String(row.status || ''),
    ownerType: String(row.owner_type || 'personal'),
    ownerTypeLabel: OWNER_LABEL[String(row.owner_type || 'personal')] || '',
    ownerName: String(row.owner_name || ''),
    bizNo: String(row.biz_no || ''),
    thirdParty: !!Number(row.third_party || 0),
    rejectReason: String(row.reject_reason || ''),
    createdAt: String(row.created_at || ''),
    submittedAt: String(row.submitted_at || ''),
    decidedAt: row.decided_at || null,
    required: requiredDocs(String(row.owner_type || 'personal'), Number(row.third_party || 0)),
    docs,
    missing: miss,
    ready: miss.length === 0,
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const rows =
    (
      await db
        .prepare('SELECT * FROM sender_numbers WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
        .bind(me.id)
        .all()
    ).results || []
  const byId = await docsBySender(db, (rows as any[]).map((r) => String(r.id)))
  return json({
    ok: true,
    requests: (rows as any[]).map((r) => shape(r, byId[String(r.id)] || [])),
    specs: DOC_SPECS,
    ownerTypes: OWNER_LABEL,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const b: any = (await request.json().catch(() => null)) ?? {}
  const action = asText(b.action) || 'create'
  const now = new Date().toISOString()

  const fields = () => ({
    label: asText(b.label, 60),
    ownerType: asText(b.ownerType) === 'business' ? 'business' : 'personal',
    ownerName: asText(b.ownerName, 60),
    bizNo: digits(b.bizNo).slice(0, 12),
    thirdParty: b.thirdParty ? 1 : 0,
  })

  if (action === 'create') {
    if (!(await rateLimitOk(db, `sendreq:${me.id}`, 20, 60)))
      return json({ ok: false, error: '신청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, 429)
    const phone = digits(b.phone)
    if (phone.length < 9 || phone.length > 12) return json({ ok: false, error: '올바른 전화번호를 입력하세요.' }, 400)
    const f = fields()
    if (f.ownerType === 'business' && f.bizNo.length !== 10)
      return json({ ok: false, error: '사업자등록번호 10자리를 입력하세요.' }, 400)
    if (!f.ownerName) return json({ ok: false, error: '번호 명의자(또는 상호)를 입력하세요.' }, 400)
    const dup: any = await db
      .prepare('SELECT id, status FROM sender_numbers WHERE user_id = ? AND phone = ?')
      .bind(me.id, phone)
      .first()
      .catch(() => null)
    if (dup) return json({ ok: false, error: '이미 등록된 번호입니다.', id: String(dup.id) }, 409)

    const id = 'sn_' + crypto.randomUUID().slice(0, 14)
    await db
      .prepare(
        `INSERT INTO sender_numbers (id, user_id, phone, label, status, created_at, owner_type, owner_name, biz_no, third_party)
         VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
      )
      .bind(id, me.id, phone, f.label, now, f.ownerType, f.ownerName, f.bizNo, f.thirdParty)
      .run()
    await logActivity(db, me.id, 'sender', `발신번호 신청서 작성: ${phone}`).catch(() => {})
    return json({ ok: true, id, required: requiredDocs(f.ownerType, f.thirdParty) })
  }

  const id = asText(b.id, 64)
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  const row: any = await db.prepare('SELECT * FROM sender_numbers WHERE id = ?').bind(id).first().catch(() => null)
  if (!row || String(row.user_id) !== String(me.id)) return json({ ok: false, error: '신청을 찾을 수 없습니다.' }, 404)
  const status = String(row.status || 'draft')

  if (action === 'update') {
    if (status === 'approved' || status === 'pending')
      return json({ ok: false, error: '승인 대기·승인 완료 상태에서는 수정할 수 없습니다.' }, 409)
    const f = fields()
    if (f.ownerType === 'business' && f.bizNo.length !== 10)
      return json({ ok: false, error: '사업자등록번호 10자리를 입력하세요.' }, 400)
    if (!f.ownerName) return json({ ok: false, error: '번호 명의자(또는 상호)를 입력하세요.' }, 400)
    await db
      .prepare("UPDATE sender_numbers SET label=?, owner_type=?, owner_name=?, biz_no=?, third_party=?, status='draft', reject_reason='' WHERE id=? AND user_id=?")
      .bind(f.label, f.ownerType, f.ownerName, f.bizNo, f.thirdParty, id, me.id)
      .run()
    return json({ ok: true, required: requiredDocs(f.ownerType, f.thirdParty) })
  }

  if (action === 'submit') {
    if (status === 'approved') return json({ ok: false, error: '이미 승인된 번호입니다.' }, 409)
    if (status === 'pending') return json({ ok: false, error: '이미 승인 대기 중입니다.' }, 409)
    const docs = (await docsBySender(db, [id]))[id] || []
    const miss = missingDocs(row, docs)
    // 서류가 하나라도 빠지면 제출 자체가 안 된다 — 승인 단계에서 또 한 번 막는다.
    if (miss.length)
      return json(
        { ok: false, error: `필수 서류를 모두 첨부해야 제출할 수 있습니다. (미첨부: ${miss.map((m) => m.label).join(', ')})`, missing: miss },
        400,
      )
    const upd: any = await db
      .prepare("UPDATE sender_numbers SET status='pending', submitted_at=?, reject_reason='' WHERE id=? AND user_id=? AND status != 'approved'")
      .bind(now, id, me.id)
      .run()
    if (!upd?.meta || upd.meta.changes !== 1) return json({ ok: false, error: '제출할 수 없는 상태입니다.' }, 409)
    await logActivity(db, me.id, 'sender', `발신번호 승인 신청 제출: ${row.phone}`).catch(() => {})
    return json({ ok: true })
  }

  if (action === 'cancel') {
    if (status !== 'pending') return json({ ok: false, error: '승인 대기 중인 신청만 취소할 수 있습니다.' }, 409)
    await db.prepare("UPDATE sender_numbers SET status='draft', submitted_at='' WHERE id=? AND user_id=? AND status='pending'").bind(id, me.id).run()
    return json({ ok: true })
  }

  if (action === 'delete') {
    if (status === 'approved') return json({ ok: false, error: '승인된 발신번호는 삭제할 수 없습니다. 관리자에게 문의해 주세요.' }, 409)
    await db.prepare('DELETE FROM sender_documents WHERE sender_id = ? AND user_id = ?').bind(id, me.id).run().catch(() => {})
    await db.prepare('DELETE FROM sender_numbers WHERE id = ? AND user_id = ?').bind(id, me.id).run()
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 action' }, 400)
}
