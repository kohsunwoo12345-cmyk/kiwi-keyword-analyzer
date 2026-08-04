import { Env, json, ensureSchema, resolveDB, requireAdminUser, sameOriginOk, logAudit, clientIp, addNotification, asText, resolveBucket } from '../_utils'
import { ensureSenderSchema, docsBySender, missingDocs, requiredDocs, DOC_SPECS, OWNER_LABEL, STATUS_LABEL } from '../sender/_schema'

// 관리자: 발신번호 직접 등록·승인·관리
//  GET  /api/admin/senders                       → 전체 발신번호 목록(회원명·신청서·첨부 서류 포함) + 상태별 카운트
//  POST /api/admin/senders { action, ... }
//    action='add'     { phone, label }           → 관리자 본인 계정으로 즉시 승인 등록
//    action='approve' { id }                     → 승인 (필수 서류가 전부 첨부됐을 때만)
//    action='reject'  { id, reason }             → 반려(사유 회원에게 통지)
//    action='delete'  { id }                     → 삭제(첨부 서류도 함께)

const digits = (s: any) => String(s || '').replace(/[^0-9]/g, '')

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const guard = await requireAdminUser(request, db); if (guard.error) return guard.error

  const rows = (await db.prepare(
    `SELECT s.*, u.name, u.email
     FROM sender_numbers s LEFT JOIN users u ON u.id = s.user_id
     ORDER BY (s.status='pending') DESC, s.created_at DESC LIMIT 500`,
  ).all()).results || []
  const byId = await docsBySender(db, (rows as any[]).map((r) => String(r.id)))
  const senders = (rows as any[]).map((r) => {
    const docs = byId[String(r.id)] || []
    const miss = missingDocs(r, docs)
    return {
      id: r.id, phone: r.phone, label: r.label || '', status: r.status,
      statusLabel: STATUS_LABEL[String(r.status || '')] || String(r.status || ''),
      ownerName: r.name || '(관리자/시스템)', ownerEmail: r.email || '',
      createdAt: r.created_at, decidedAt: r.decided_at, submittedAt: r.submitted_at || '',
      applicantType: String(r.owner_type || 'personal'),
      applicantTypeLabel: OWNER_LABEL[String(r.owner_type || 'personal')] || '',
      holderName: String(r.owner_name || ''),
      bizNo: String(r.biz_no || ''),
      thirdParty: !!Number(r.third_party || 0),
      rejectReason: String(r.reject_reason || ''),
      required: requiredDocs(String(r.owner_type || 'personal'), Number(r.third_party || 0)),
      docs, missing: miss, canApprove: miss.length === 0,
    }
  })
  const count = { pending: 0, approved: 0, rejected: 0, draft: 0 }
  for (const s of senders) if (s.status in count) (count as any)[s.status]++
  const envFrom = digits((env as any).ALIGO_SENDER || '')
  return json({ ok: true, senders, count, envSender: envFrom || null, specs: DOC_SPECS })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSenderSchema(db)
  const guard = await requireAdminUser(request, db); if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  const admin = { id: guard.me.id, email: guard.me.email }

  const b: any = await (request.json().catch(() => null)) ?? {}
  const action = asText(b.action, 20)
  const now = new Date().toISOString()

  if (action === 'add') {
    const phone = digits(b.phone)
    if (phone.length < 9) return json({ ok: false, error: '올바른 전화번호를 입력하세요.' }, 400)
    const dup: any = await db.prepare('SELECT id, status FROM sender_numbers WHERE phone = ? AND user_id = ?').bind(phone, admin.id).first().catch(() => null)
    if (dup) {
      await db.prepare("UPDATE sender_numbers SET status='approved', decided_at=?, label=? WHERE id=?").bind(now, asText(b.label, 60), dup.id).run()
      return json({ ok: true, id: dup.id, message: '이미 등록된 번호를 승인 처리했습니다.' })
    }
    const id = 'sn_' + crypto.randomUUID().slice(0, 14)
    await db.prepare(`INSERT INTO sender_numbers (id, user_id, phone, label, status, created_at, decided_at) VALUES (?, ?, ?, ?, 'approved', ?, ?)`)
      .bind(id, admin.id, phone, asText(b.label, 60), now, now).run()
    await logAudit(db, admin, 'sender_add', phone, '관리자 발신번호 직접 등록', 'info', clientIp(request))
    return json({ ok: true, id, message: '발신번호가 등록·승인되었습니다.' })
  }

  const id = asText(b.id, 64)
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  const row: any = await db.prepare('SELECT * FROM sender_numbers WHERE id = ?').bind(id).first().catch(() => null)
  if (!row) return json({ ok: false, error: '신청을 찾을 수 없습니다.' }, 404)

  if (action === 'approve') {
    // 통신사 정책상 명의 증빙 서류 없이는 발신번호를 열어줄 수 없다.
    //  관리자가 실수로라도 건너뛰지 못하게 서버에서 막는다.
    const docs = (await docsBySender(db, [id]))[id] || []
    const miss = missingDocs(row, docs)
    if (miss.length)
      return json(
        {
          ok: false,
          error: `필수 서류가 첨부되지 않아 승인할 수 없습니다. (미첨부: ${miss.map((m) => m.label).join(', ')})`,
          missing: miss,
        },
        409,
      )
    const upd: any = await db.prepare("UPDATE sender_numbers SET status='approved', decided_at=?, decided_by=?, reject_reason='' WHERE id=?")
      .bind(now, admin.email || admin.id, id).run()
    if (!upd?.meta || upd.meta.changes !== 1) return json({ ok: false, error: '승인 처리에 실패했습니다.' }, 500)
    await logAudit(db, admin, 'sender_approve', id, `발신번호 승인 (${row.phone}) · 서류 ${docs.length}건`, 'info', clientIp(request))
    await addNotification(db, String(row.user_id), '발신번호 승인 완료', `발신번호 ${row.phone} 이(가) 승인되었습니다. 이제 문자·알림톡 발송에 사용할 수 있어요.`).catch(() => {})
    return json({ ok: true, docs: docs.length })
  }

  if (action === 'reject') {
    const reason = asText(b.reason, 300) || '제출 서류가 확인되지 않았습니다.'
    await db.prepare("UPDATE sender_numbers SET status='rejected', decided_at=?, decided_by=?, reject_reason=? WHERE id=?")
      .bind(now, admin.email || admin.id, reason, id).run()
    await logAudit(db, admin, 'sender_reject', id, `발신번호 반려 (${row.phone}) · ${reason}`, 'warn', clientIp(request))
    await addNotification(db, String(row.user_id), '발신번호 반려', `발신번호 ${row.phone} 신청이 반려되었습니다. 사유: ${reason}`).catch(() => {})
    return json({ ok: true })
  }

  if (action === 'delete') {
    // 첨부 서류(개인정보)도 같이 지운다 — 남겨두면 주인 없는 신분증 사본이 된다.
    const docs = (await docsBySender(db, [id]))[id] || []
    if (docs.length) {
      const keys = (await db.prepare('SELECT storage_key FROM sender_documents WHERE sender_id = ?').bind(id).all()).results || []
      const R2: any = resolveBucket(env)
      for (const k of keys as any[]) {
        const sk = String(k.storage_key || '')
        if (!sk) continue
        if (R2) await R2.delete(sk).catch(() => {})
        else await db.prepare('DELETE FROM media_blobs WHERE key = ?').bind(sk).run().catch(() => {})
      }
      await db.prepare('DELETE FROM sender_documents WHERE sender_id = ?').bind(id).run().catch(() => {})
    }
    await db.prepare('DELETE FROM sender_numbers WHERE id=?').bind(id).run()
    await logAudit(db, admin, 'sender_delete', id, `발신번호 삭제 (${row.phone})`, 'warn', clientIp(request))
    return json({ ok: true })
  }
  return json({ ok: false, error: '알 수 없는 action' }, 400)
}
