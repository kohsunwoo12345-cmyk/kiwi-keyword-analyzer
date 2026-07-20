import { Env, json, ensureSchema, resolveDB, requireAdminUser, sameOriginOk, logAudit, clientIp } from '../_utils'

// 관리자: 발신번호 직접 등록·승인·관리
//  GET  /api/admin/senders                       → 전체 발신번호 목록(회원명 포함) + 상태별 카운트
//  POST /api/admin/senders { action, ... }
//    action='add'     { phone, label }           → 관리자 본인 계정으로 즉시 승인 등록
//    action='approve' { id }                     → 대기중 발신번호 승인
//    action='reject'  { id }                     → 반려
//    action='delete'  { id }                     → 삭제

const digits = (s: any) => String(s || '').replace(/[^0-9]/g, '')

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db); if (guard.error) return guard.error

  const rows = (await db.prepare(
    `SELECT s.id, s.user_id, s.phone, s.label, s.status, s.created_at, s.decided_at, u.name, u.email
     FROM sender_numbers s LEFT JOIN users u ON u.id = s.user_id
     ORDER BY (s.status='pending') DESC, s.created_at DESC LIMIT 500`,
  ).all().catch(() => ({ results: [] }))).results || []
  const senders = (rows as any[]).map((r) => ({
    id: r.id, phone: r.phone, label: r.label || '', status: r.status,
    ownerName: r.name || '(관리자/시스템)', ownerEmail: r.email || '', createdAt: r.created_at, decidedAt: r.decided_at,
  }))
  const count = { pending: 0, approved: 0, rejected: 0 }
  for (const s of senders) if (s.status in count) (count as any)[s.status]++
  const envFrom = digits((env as any).ALIGO_SENDER || '')
  return json({ ok: true, senders, count, envSender: envFrom || null })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db); if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  const admin = { id: guard.me.id, email: guard.me.email }

  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')
  const now = new Date().toISOString()

  if (action === 'add') {
    const phone = digits(b.phone)
    if (phone.length < 9) return json({ ok: false, error: '올바른 전화번호를 입력하세요.' }, 400)
    const dup: any = await db.prepare('SELECT id, status FROM sender_numbers WHERE phone = ? AND user_id = ?').bind(phone, admin.id).first().catch(() => null)
    if (dup) {
      await db.prepare("UPDATE sender_numbers SET status='approved', decided_at=?, label=? WHERE id=?").bind(now, String(b.label || ''), dup.id).run()
      return json({ ok: true, id: dup.id, message: '이미 등록된 번호를 승인 처리했습니다.' })
    }
    const id = 'sn_' + crypto.randomUUID().slice(0, 14)
    await db.prepare(`INSERT INTO sender_numbers (id, user_id, phone, label, status, created_at, decided_at) VALUES (?, ?, ?, ?, 'approved', ?, ?)`)
      .bind(id, admin.id, phone, String(b.label || ''), now, now).run()
    await logAudit(db, admin, 'sender_add', phone, '관리자 발신번호 직접 등록', 'info', clientIp(request))
    return json({ ok: true, id, message: '발신번호가 등록·승인되었습니다.' })
  }

  const id = String(b.id || '')
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  if (action === 'approve') {
    await db.prepare("UPDATE sender_numbers SET status='approved', decided_at=? WHERE id=?").bind(now, id).run()
    await logAudit(db, admin, 'sender_approve', id, '발신번호 승인', 'info', clientIp(request))
    return json({ ok: true })
  }
  if (action === 'reject') {
    await db.prepare("UPDATE sender_numbers SET status='rejected', decided_at=? WHERE id=?").bind(now, id).run()
    return json({ ok: true })
  }
  if (action === 'delete') {
    await db.prepare('DELETE FROM sender_numbers WHERE id=?').bind(id).run()
    return json({ ok: true })
  }
  return json({ ok: false, error: '알 수 없는 action' }, 400)
}
