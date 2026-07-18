import { Env, json, ensureSchema, getSessionUser, resolveDB, addNotification, logActivity, publicUser, ADMIN_EMAIL } from '../_utils'
import { tossConfirm } from '../_external'

// 팀 요금제: 좌석당 단가(원/월)
export const TEAM_SEAT_KRW = 44000
const MAX_SEATS = 100

function activateUntil(current: string | null, months: number): string {
  const now = Date.now()
  const base = current && new Date(current).getTime() > now ? new Date(current).getTime() : now
  return new Date(base + months * 30 * 86400000).toISOString()
}

// POST /api/team/pay
//  { action:'prepare', seats, months? }         → 주문 생성(카드 결제용). clientKey 없으면 관리자 승인 대기.
//  { action:'confirm', paymentKey, orderId, amount } → 토스 승인 후 팀 요금제 활성화
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || 'prepare')
  const now = new Date().toISOString()

  if (action === 'prepare') {
    const seats = Math.min(MAX_SEATS, Math.max(1, Math.floor(Number(b.seats) || 0)))
    const months = Math.min(12, Math.max(1, Math.floor(Number(b.months) || 1)))
    if (!seats) return json({ ok: false, error: '좌석 수를 선택하세요.' }, 400)
    const amount = seats * TEAM_SEAT_KRW * months
    const orderId = 'tord_' + crypto.randomUUID().replace(/-/g, '').slice(0, 22)
    await db
      .prepare(`INSERT INTO team_orders (order_id, user_id, seats, months, amount, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)`)
      .bind(orderId, me.id, seats, months, amount, now)
      .run()

    const clientKey = (env as any)?.TOSS_CLIENT_KEY || (env as any)?.TOSS_PG_CLIENT_KEY || (env as any)?.TOSS_PG_CLIENT || ''
    if (!clientKey) {
      // 카드 결제 미설정 → 관리자 승인 대기(수동 활성화)
      await addNotification(db, me.id, '팀 요금제 신청 접수', `팀 요금제(${seats}좌석·${months}개월, ₩${amount.toLocaleString()}) 신청이 접수되었습니다. 관리자 승인 후 활성화됩니다.`).catch(() => {})
      await logActivity(db, me.id, 'plan', `팀 요금제 신청: ${seats}좌석 · ₩${amount.toLocaleString()}`)
      return json({ ok: true, approval: true, orderId, amount, seats, months })
    }
    return json({
      ok: true, orderId, amount, seats, months, clientKey,
      orderName: `BYGENCY 팀 요금제 ${seats}좌석·${months}개월`,
      customerEmail: me.email, customerName: me.name,
    })
  }

  if (action === 'confirm') {
    const paymentKey = String(b.paymentKey || '')
    const orderId = String(b.orderId || '')
    const amount = Math.floor(Number(b.amount || 0))
    if (!paymentKey || !orderId || !amount) return json({ ok: false, error: '결제 정보가 올바르지 않습니다.' }, 400)

    const order: any = await db.prepare('SELECT * FROM team_orders WHERE order_id = ?').bind(orderId).first()
    if (!order) return json({ ok: false, error: '주문을 찾을 수 없습니다.' }, 404)
    if (order.user_id !== me.id) return json({ ok: false, error: '본인 주문이 아닙니다.' }, 403)
    if (order.status === 'paid') return json({ ok: false, error: '이미 처리된 주문입니다.' }, 409)
    if (order.amount !== amount) return json({ ok: false, error: '결제 금액이 일치하지 않습니다.' }, 400)

    const conf = await tossConfirm(env, { paymentKey, orderId, amount })
    if (!conf.ok) {
      await db.prepare("UPDATE team_orders SET status = 'failed' WHERE order_id = ?").bind(orderId).run()
      return json({ ok: false, error: conf.error || '결제 승인 실패' }, 402)
    }

    const until = activateUntil(me.team_until, Number(order.months) || 1)
    await db.prepare("UPDATE team_orders SET status = 'paid', payment_key = ?, paid_at = ? WHERE order_id = ?").bind(paymentKey, now, orderId).run()
    await db.prepare('UPDATE users SET team_plan = 1, team_seats = ?, team_until = ? WHERE id = ?').bind(Number(order.seats) || 1, until, me.id).run()
    await addNotification(db, me.id, '팀 요금제가 활성화되었습니다 👥', `${order.seats}좌석 팀 요금제가 활성화되었습니다. 스튜디오 팀워크에서 팀을 만들고 노드를 공유해보세요!`).catch(() => {})
    await logActivity(db, me.id, 'plan', `팀 요금제 결제 완료: ${order.seats}좌석 · ₩${amount.toLocaleString()}`)

    const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()
    return json({ ok: true, seats: order.seats, until, user: publicUser(fresh) })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}

// GET /api/team/pay → 단가·내 팀요금제 상태
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const isAdmin = me.email === ADMIN_EMAIL || me.role === 'admin'
  const active = isAdmin || (Number(me.team_plan) === 1 && me.team_until && me.team_until > new Date().toISOString())
  return json({ ok: true, seatKrw: TEAM_SEAT_KRW, active: !!active, seats: isAdmin ? 99 : Number(me.team_seats) || 0, until: me.team_until || '' })
}
