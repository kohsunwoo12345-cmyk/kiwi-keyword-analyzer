import { Env, json, ensureSchema, getSessionUser, resolveDB, applyBalance, addNotification, logActivity, publicUser } from '../_utils'
import { tossConfirm } from '../_external'

// POST /api/payments/confirm { paymentKey, orderId, amount } → Toss 승인 후 크레딧 즉시 지급
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const paymentKey = String(body.paymentKey || '')
  const orderId = String(body.orderId || '')
  const amount = Math.floor(Number(body.amount || 0))
  if (!paymentKey || !orderId || !amount) return json({ ok: false, error: '결제 정보가 올바르지 않습니다.' }, 400)

  const order: any = await db.prepare('SELECT * FROM credit_orders WHERE order_id = ?').bind(orderId).first()
  if (!order) return json({ ok: false, error: '주문을 찾을 수 없습니다.' }, 404)
  if (order.user_id !== me.id) return json({ ok: false, error: '본인 주문이 아닙니다.' }, 403)
  if (order.status === 'paid') return json({ ok: false, error: '이미 처리된 주문입니다.' }, 409)
  if (order.amount !== amount) return json({ ok: false, error: '결제 금액이 일치하지 않습니다.' }, 400)

  const conf = await tossConfirm(env, { paymentKey, orderId, amount })
  if (!conf.ok) {
    await db.prepare("UPDATE credit_orders SET status = 'failed' WHERE order_id = ?").bind(orderId).run()
    return json({ ok: false, error: conf.error || '결제 승인 실패' }, 402)
  }

  await db.prepare("UPDATE credit_orders SET status = 'paid', payment_key = ?, paid_at = ? WHERE order_id = ?").bind(paymentKey, new Date().toISOString(), orderId).run()
  await applyBalance(db, me.id, 'credit', order.credits, `카드 결제 충전 (${amount.toLocaleString()}원)`)
  await addNotification(db, me.id, '크레딧이 충전되었습니다', `카드 결제로 크레딧 ${order.credits.toLocaleString()}개가 충전되었습니다. 감사합니다!`)
  await logActivity(db, me.id, 'credit', `카드 충전 +${order.credits} 크레딧`)

  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()
  return json({ ok: true, credits: order.credits, user: publicUser(fresh) })
}
