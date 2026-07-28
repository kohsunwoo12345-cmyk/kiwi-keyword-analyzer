import { Env, json, ensureSchema, getSessionUser, resolveDB, applyBalance, addNotification, logActivity, publicUser } from '../_utils'
import { tossConfirm } from '../_external'
import { recordPayment } from '../_billing'

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
    // ⚠ status != 'paid' 조건이 반드시 필요하다. 같은 주문으로 confirm 이 두 번 들어오면
    //   (더블클릭·새로고침·자동 재시도) 뒤늦게 도착한 쪽은 토스에서 "이미 승인된 결제"로 거절당하는데,
    //   조건 없이 덮어쓰면 결제도 되고 크레딧도 지급된 주문이 '실패'로 기록돼 매출 집계에서 사라진다.
    await db.prepare("UPDATE credit_orders SET status = 'failed' WHERE order_id = ? AND status != 'paid'").bind(orderId).run()
    return json({ ok: false, error: conf.error || '결제 승인 실패' }, 402)
  }

  // ── 지급 선점 ────────────────────────────────────────────────────────────────
  //  위의 status 검사는 읽기 시점 기준이라 동시 요청을 막지 못한다(TOCTOU).
  //  "아직 지급 전인 주문일 때만" paid 로 바꾸고, 그 한 번만 크레딧을 준다.
  //  이 조건부 UPDATE 가 없으면 confirm 이 두 번 성공했을 때 크레딧이 두 배로 지급된다.
  const claim: any = await db.prepare(
    "UPDATE credit_orders SET status = 'paid', payment_key = ?, paid_at = ? WHERE order_id = ? AND status != 'paid'",
  ).bind(paymentKey, new Date().toISOString(), orderId).run().catch(() => null)
  if (!claim || Number(claim.meta?.changes || 0) === 0)
    return json({ ok: false, error: '이미 처리된 주문입니다.' }, 409)

  await applyBalance(db, me.id, 'credit', order.credits, `카드 결제 충전 (${amount.toLocaleString()}원)`)
  // ⚠ 결제 원장(payments)은 "모든 실입금의 단일 소스" 인데 카드 결제만 빠져 있었다.
  //   세금계산서·현금영수증·환불이 전부 이 원장을 기준으로 도는데, 카드로 낸 회원은
  //   원장에 아예 없어서 세금계산서를 끊을 수 없었고 관리자 결제 화면 합계에서도 빠졌다.
  await recordPayment(db, {
    userId: me.id, name: me.name || '', email: me.email || '',
    source: 'credit_order', refId: orderId,
    description: `크레딧 ${Number(order.credits).toLocaleString()}개 충전 (카드)`,
    amount, method: 'card', pgKey: paymentKey,
  })
  await addNotification(db, me.id, '크레딧이 충전되었습니다', `카드 결제로 크레딧 ${order.credits.toLocaleString()}개가 충전되었습니다. 감사합니다!`)
  await logActivity(db, me.id, 'credit', `카드 충전 +${order.credits} 크레딧`)

  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()
  return json({ ok: true, credits: order.credits, user: publicUser(fresh) })
}
