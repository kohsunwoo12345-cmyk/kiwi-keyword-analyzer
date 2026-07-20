import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, sameOriginOk, logAudit, clientIp } from '../_utils'
import { ensureBilling, vatSplit } from '../_billing'

const uid = (p: string) => p + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureBilling(db); await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all().catch(() => ({ results: [] }))).results || []
  const payments = await rows(
    `SELECT p.*, COALESCE(NULLIF(p.name,''), u.name) AS uname, COALESCE(NULLIF(p.email,''), u.email) AS uemail
     FROM payments p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 500`)
  const taxInvoices = await rows(`SELECT * FROM tax_invoices ORDER BY requested_at DESC LIMIT 300`)
  const cashReceipts = await rows(`SELECT * FROM cash_receipts ORDER BY requested_at DESC LIMIT 300`)
  const refunds = await rows(
    `SELECT r.*, u.name AS uname, u.email AS uemail FROM refunds r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.requested_at DESC LIMIT 300`)
  const subscriptions = await rows(
    `SELECT s.*, u.name AS uname, u.email AS uemail FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.next_billing_at ASC LIMIT 300`)

  const n = async (sql: string) => { const r: any = await db.prepare(sql).first().catch(() => ({})); return Number(r?.n) || 0 }
  const paidTotal = await n(`SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE status != 'refunded'`)
  const refundedTotal = await n(`SELECT COALESCE(SUM(refunded_amount),0) AS n FROM payments`)
  const stats = {
    payments: (payments as any[]).length,
    paidTotal, refundedTotal, net: paidTotal - refundedTotal,
    taxPending: (taxInvoices as any[]).filter((t) => t.status === 'requested').length,
    receiptPending: (cashReceipts as any[]).filter((t) => t.status === 'requested').length,
    refundPending: (refunds as any[]).filter((t) => t.status === 'requested').length,
    activeSubs: (subscriptions as any[]).filter((s) => s.status === 'active').length,
  }
  return json({ ok: true, payments, taxInvoices, cashReceipts, refunds, subscriptions, stats })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureBilling(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')
  const now = new Date().toISOString()
  const audit = (a: string, t: string, d = '') => logAudit(db, { id: guard.me.id, email: guard.me.email }, a, t, d, 'info', clientIp(request))

  const getPayment = async (id: string) => await db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first().catch(() => null) as any

  if (action === 'tax-create') {
    const pay = await getPayment(String(b.paymentId || ''))
    if (!pay) return json({ ok: false, error: '결제 건을 찾을 수 없습니다.' }, 404)
    const amount = Number(pay.amount) || 0
    const { supply, vat } = vatSplit(amount)
    await db.prepare(
      `INSERT INTO tax_invoices (id, payment_id, user_id, biz_number, company, ceo, address, email, amount, supply_amount, vat, status, memo, requested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?)`,
    ).bind(uid('tx_'), pay.id, pay.user_id, String(b.bizNumber || ''), String(b.company || ''), String(b.ceo || ''), String(b.address || ''), String(b.email || ''), amount, supply, vat, String(b.memo || ''), now).run()
    await audit('tax_invoice_create', pay.id, String(b.company || ''))
    return json({ ok: true })
  }
  if (action === 'tax-status') {
    const st = String(b.status || '')
    if (!['issued', 'cancelled', 'requested'].includes(st)) return json({ ok: false, error: '잘못된 상태' }, 400)
    await db.prepare('UPDATE tax_invoices SET status = ?, nts_key = ?, issued_at = ? WHERE id = ?')
      .bind(st, String(b.ntsKey || ''), st === 'issued' ? now : null, String(b.id || '')).run()
    await audit('tax_invoice_' + st, String(b.id || ''))
    return json({ ok: true })
  }

  if (action === 'receipt-create') {
    const pay = await getPayment(String(b.paymentId || ''))
    if (!pay) return json({ ok: false, error: '결제 건을 찾을 수 없습니다.' }, 404)
    const amount = Number(pay.amount) || 0
    const { supply, vat } = vatSplit(amount)
    const purpose = b.purpose === 'expense' ? 'expense' : 'income'
    await db.prepare(
      `INSERT INTO cash_receipts (id, payment_id, user_id, purpose, identifier, amount, supply_amount, vat, status, requested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?)`,
    ).bind(uid('rc_'), pay.id, pay.user_id, purpose, String(b.identifier || ''), amount, supply, vat, now).run()
    await audit('cash_receipt_create', pay.id)
    return json({ ok: true })
  }
  if (action === 'receipt-status') {
    const st = String(b.status || '')
    if (!['issued', 'cancelled', 'requested'].includes(st)) return json({ ok: false, error: '잘못된 상태' }, 400)
    await db.prepare('UPDATE cash_receipts SET status = ?, approval_no = ?, issued_at = ? WHERE id = ?')
      .bind(st, String(b.approvalNo || ''), st === 'issued' ? now : null, String(b.id || '')).run()
    await audit('cash_receipt_' + st, String(b.id || ''))
    return json({ ok: true })
  }

  if (action === 'refund-create') {
    const pay = await getPayment(String(b.paymentId || ''))
    if (!pay) return json({ ok: false, error: '결제 건을 찾을 수 없습니다.' }, 404)
    const remaining = (Number(pay.amount) || 0) - (Number(pay.refunded_amount) || 0)
    const amount = Math.min(Math.max(1, Math.round(Number(b.amount) || remaining)), remaining)
    if (amount <= 0) return json({ ok: false, error: '환불 가능 잔액이 없습니다.' }, 400)
    await db.prepare(
      `INSERT INTO refunds (id, payment_id, user_id, amount, reason, status, requested_at) VALUES (?, ?, ?, ?, ?, 'requested', ?)`,
    ).bind(uid('rf_'), pay.id, pay.user_id, amount, String(b.reason || ''), now).run()
    await audit('refund_request', pay.id, String(amount))
    return json({ ok: true })
  }
  if (action === 'refund-decide') {
    const decision = String(b.decision || '')
    const rf: any = await db.prepare('SELECT * FROM refunds WHERE id = ?').bind(String(b.id || '')).first().catch(() => null)
    if (!rf) return json({ ok: false, error: '환불 요청을 찾을 수 없습니다.' }, 404)
    if (rf.status !== 'requested') return json({ ok: false, error: '이미 처리된 요청입니다.' }, 400)
    if (decision === 'approve') {
      await db.prepare("UPDATE refunds SET status = 'done', admin_email = ?, decided_at = ? WHERE id = ?").bind(guard.me.email, now, rf.id).run()
      const pay = await getPayment(rf.payment_id)
      if (pay) {
        const refunded = (Number(pay.refunded_amount) || 0) + (Number(rf.amount) || 0)
        const newStatus = refunded >= (Number(pay.amount) || 0) ? 'refunded' : 'partial_refund'
        await db.prepare('UPDATE payments SET refunded_amount = ?, status = ? WHERE id = ?').bind(refunded, newStatus, pay.id).run()
      }
      await audit('refund_approve', rf.id, String(rf.amount))
    } else {
      await db.prepare("UPDATE refunds SET status = 'rejected', admin_email = ?, decided_at = ? WHERE id = ?").bind(guard.me.email, now, rf.id).run()
      await audit('refund_reject', rf.id)
    }
    return json({ ok: true })
  }

  if (action === 'sub-status') {
    const st = String(b.status || '')
    if (!['active', 'paused', 'cancelled'].includes(st)) return json({ ok: false, error: '잘못된 상태' }, 400)
    await db.prepare('UPDATE subscriptions SET status = ?, cancelled_at = ? WHERE id = ?')
      .bind(st, st === 'cancelled' ? now : null, String(b.id || '')).run()
    await audit('subscription_' + st, String(b.id || ''))
    return json({ ok: true })
  }
  if (action === 'sub-create') {
    const userId = String(b.userId || '')
    if (!userId) return json({ ok: false, error: '회원을 지정하세요.' }, 400)
    const track = b.track === 'video' ? 'video' : 'marketer'
    const plan = ['Plus', 'Pro', 'Max'].includes(b.plan) ? b.plan : 'Pro'
    const months = Math.max(1, Math.min(12, Math.round(Number(b.months) || 1)))
    const amount = Math.max(0, Math.round(Number(b.amount) || 0))
    const next = String(b.nextBillingAt || '').trim() ? new Date(String(b.nextBillingAt).replace(' ', 'T')).toISOString() : new Date(Date.now() + months * 30 * 864e5).toISOString()
    await db.prepare(
      `INSERT INTO subscriptions (id, user_id, track, plan, months, amount, status, started_at, next_billing_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    ).bind(uid('sub_'), userId, track, plan, months, amount, now, next).run()
    await audit('subscription_create', userId, `${track} ${plan}`)
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
