import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { CREDIT_KRW } from '../studio/_pricing'

// 크레딧 수량 → 결제 금액(원) 서버측 산정 (클라이언트 조작 방지).
// 1크레딧 = CREDIT_KRW(50원) 로 균일 환산.
function priceFor(credits: number): number {
  return Math.round(credits * CREDIT_KRW)
}

// POST /api/payments/prepare { credits } → Toss 주문 생성(orderId/amount 반환)
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const credits = Math.floor(Number(body.credits || 0))
  if (!credits || credits <= 0 || credits > 100000) return json({ ok: false, error: '충전할 크레딧 수량이 올바르지 않습니다.' }, 400)
  const amount = priceFor(credits)

  const orderId = 'ord_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  await db
    .prepare(`INSERT INTO credit_orders (order_id, user_id, credits, amount, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`)
    .bind(orderId, me.id, credits, amount, new Date().toISOString())
    .run()

  const clientKey = env?.TOSS_CLIENT_KEY || env?.TOSS_PG_CLIENT_KEY || env?.TOSS_PG_CLIENT || ''
  return json({ ok: true, orderId, amount, credits, orderName: `BYGENCY 크레딧 ${credits}개`, clientKey, customerEmail: me.email, customerName: me.name })
}
