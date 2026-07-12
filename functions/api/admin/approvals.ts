import {
  Env,
  json,
  ensureSchema,
  seedAdmin,
  resolveDB,
  requireAdminUser,
  logActivity,
  addNotification,
  applyBalance,
  logAudit,
  clientIp,
  publicUser,
} from '../_utils'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const planRequests = (await db
    .prepare(
      `SELECT p.id, p.user_id, u.name, u.email, p.from_plan, p.to_plan, p.status, p.memo, p.created_at, p.decided_at
       FROM plan_requests p LEFT JOIN users u ON u.id = p.user_id
       ORDER BY (p.status='pending') DESC, p.created_at DESC LIMIT 300`,
    )
    .all()).results || []

  const senderNumbers = (await db
    .prepare(
      `SELECT s.id, s.user_id, u.name, u.email, s.phone, s.label, s.status, s.created_at, s.decided_at
       FROM sender_numbers s LEFT JOIN users u ON u.id = s.user_id
       ORDER BY (s.status='pending') DESC, s.created_at DESC LIMIT 300`,
    )
    .all()).results || []

  const pointRequests = (await db
    .prepare(
      `SELECT p.id, p.user_id, u.name, u.email, p.amount, p.memo, p.status, p.created_at, p.decided_at
       FROM point_requests p LEFT JOIN users u ON u.id = p.user_id
       ORDER BY (p.status='pending') DESC, p.created_at DESC LIMIT 300`,
    )
    .all()).results || []

  const creditRequests = (await db
    .prepare(
      `SELECT c.id, c.user_id, u.name, u.email, c.amount, c.price, c.memo, c.status, c.created_at, c.decided_at
       FROM credit_requests c LEFT JOIN users u ON u.id = c.user_id
       ORDER BY (c.status='pending') DESC, c.created_at DESC LIMIT 300`,
    )
    .all()).results || []

  // 회원가입 정보 (최근 가입 회원 전체 정보)
  const signupRows = (await db
    .prepare(`SELECT * FROM users ORDER BY created_at DESC LIMIT 300`)
    .all()).results || []
  const signups = signupRows.map((u: any) => publicUser(u))

  const pendingPlans = planRequests.filter((r: any) => r.status === 'pending').length
  const pendingSenders = senderNumbers.filter((r: any) => r.status === 'pending').length
  const pendingPoints = pointRequests.filter((r: any) => r.status === 'pending').length
  const pendingCredits = creditRequests.filter((r: any) => r.status === 'pending').length

  return json({
    ok: true,
    planRequests,
    senderNumbers,
    pointRequests,
    creditRequests,
    signups,
    stats: { pendingPlans, pendingSenders, pendingPoints, pendingCredits, totalMembers: signups.length },
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const admin = { id: guard.me.id, email: guard.me.email }
  const adminIp = clientIp(request)
  const body: any = await request.json().catch(() => ({}))
  const type = String(body.type || '') // plan | sender | point
  const id = String(body.id || '')
  const decision = String(body.decision || '') // approve | reject
  if (!id || !['approve', 'reject'].includes(decision)) return json({ ok: false, error: '잘못된 요청입니다.' }, 400)
  const now = new Date().toISOString()
  const status = decision === 'approve' ? 'approved' : 'rejected'

  if (type === 'plan') {
    const req: any = await db.prepare('SELECT * FROM plan_requests WHERE id = ?').bind(id).first()
    if (!req) return json({ ok: false, error: '요청을 찾을 수 없습니다.' }, 404)
    await db.prepare('UPDATE plan_requests SET status = ?, decided_at = ? WHERE id = ?').bind(status, now, id).run()
    if (decision === 'approve') {
      await db.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(req.to_plan, req.user_id).run()
      await logActivity(db, req.user_id, 'plan', `플랜 승인: ${req.from_plan} → ${req.to_plan}`)
      await addNotification(db, req.user_id, '플랜 변경이 승인되었습니다', `${req.to_plan} 플랜으로 업그레이드되었습니다. 감사합니다!`)
    } else {
      await addNotification(db, req.user_id, '플랜 변경이 반려되었습니다', `${req.to_plan} 플랜 신청이 반려되었습니다. 자세한 내용은 문의해 주세요.`)
    }
  } else if (type === 'sender') {
    const req: any = await db.prepare('SELECT * FROM sender_numbers WHERE id = ?').bind(id).first()
    if (!req) return json({ ok: false, error: '요청을 찾을 수 없습니다.' }, 404)
    await db.prepare('UPDATE sender_numbers SET status = ?, decided_at = ? WHERE id = ?').bind(status, now, id).run()
    if (decision === 'approve') {
      await db.prepare('UPDATE users SET phone = ? WHERE id = ? AND (phone IS NULL OR phone = "")').bind(req.phone, req.user_id).run()
      await addNotification(db, req.user_id, '발신번호가 승인되었습니다', `발신번호 ${req.phone} 이(가) 승인되었습니다. 이제 문자 발송에 사용할 수 있어요.`)
    } else {
      await addNotification(db, req.user_id, '발신번호가 반려되었습니다', `발신번호 ${req.phone} 등록이 반려되었습니다.`)
    }
    await logAudit(db, admin, 'approve_sender', req.phone, decision, 'info', adminIp)
  } else if (type === 'point') {
    const req: any = await db.prepare('SELECT * FROM point_requests WHERE id = ?').bind(id).first()
    if (!req) return json({ ok: false, error: '요청을 찾을 수 없습니다.' }, 404)
    await db.prepare('UPDATE point_requests SET status = ?, decided_at = ? WHERE id = ?').bind(status, now, id).run()
    if (decision === 'approve') {
      await applyBalance(db, req.user_id, 'point', req.amount, `포인트 지급 승인${req.memo ? ' · ' + req.memo : ''}`)
      await addNotification(db, req.user_id, '포인트가 지급되었습니다', `${req.amount.toLocaleString()}P가 지급되었습니다. 감사합니다!`)
    } else {
      await addNotification(db, req.user_id, '포인트 지급이 반려되었습니다', `${req.amount.toLocaleString()}P 지급 신청이 반려되었습니다.`)
    }
    await logAudit(db, admin, 'approve_point', String(req.amount), decision, 'info', adminIp)
  } else if (type === 'credit') {
    const req: any = await db.prepare('SELECT * FROM credit_requests WHERE id = ?').bind(id).first()
    if (!req) return json({ ok: false, error: '요청을 찾을 수 없습니다.' }, 404)
    await db.prepare('UPDATE credit_requests SET status = ?, decided_at = ? WHERE id = ?').bind(status, now, id).run()
    if (decision === 'approve') {
      await applyBalance(db, req.user_id, 'credit', req.amount, `크레딧 충전 승인${req.memo ? ' · ' + req.memo : ''}`)
      await addNotification(db, req.user_id, '크레딧이 충전되었습니다', `크레딧 ${req.amount.toLocaleString()}개가 충전되었습니다. 감사합니다!`)
    } else {
      await addNotification(db, req.user_id, '크레딧 충전이 반려되었습니다', `크레딧 ${req.amount.toLocaleString()}개 충전 신청이 반려되었습니다.`)
    }
    await logAudit(db, admin, 'approve_credit', String(req.amount), decision, 'info', adminIp)
  } else {
    return json({ ok: false, error: '알 수 없는 유형입니다.' }, 400)
  }
  if (type === 'plan') await logAudit(db, admin, 'approve_plan', id, decision, 'info', adminIp)
  return json({ ok: true })
}
