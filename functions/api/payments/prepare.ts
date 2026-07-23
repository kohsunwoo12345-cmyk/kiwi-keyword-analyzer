import { Env, json, ensureSchema, getSessionUser, resolveDB, getSetting } from '../_utils'

// 추가 크레딧 판매 단가(원/크레딧). 기본값 65원 (요금제 정산 기준 50원과 별개).
export const TOPUP_KRW = 65

// 학원(그룹)별 크레딧 단가(원/크레딧). settings 키 'academy_credit_prices' = { 학원명: 단가 }
export async function academyCreditPrice(db: D1Database, academy: string | null | undefined): Promise<number | null> {
  if (!academy) return null
  try {
    const raw = await getSetting(db, 'academy_credit_prices')
    if (!raw) return null
    const map = JSON.parse(raw)
    const v = Number(map[String(academy)])
    return v > 0 ? Math.round(v) : null
  } catch { return null }
}

// 회원별 지정가 > 학원별 지정가 > 전역 설정 > 기본값 순으로 크레딧 단가(원) 결정
export async function creditPriceFor(db: D1Database, me: any): Promise<number> {
  if (me && me.credit_price != null && Number(me.credit_price) > 0) return Math.round(Number(me.credit_price))
  if (me && me.academy) { const a = await academyCreditPrice(db, String(me.academy)); if (a) return a }
  const g = await getSetting(db, 'credit_price_krw')
  if (g != null && g !== '' && Number(g) > 0) return Math.round(Number(g))
  return TOPUP_KRW
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
  const rate = await creditPriceFor(db, me)
  const amount = Math.round(credits * rate)

  const orderId = 'ord_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  await db
    .prepare(`INSERT INTO credit_orders (order_id, user_id, credits, amount, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`)
    .bind(orderId, me.id, credits, amount, new Date().toISOString())
    .run()

  const clientKey = env?.TOSS_CLIENT_KEY || env?.TOSS_PG_CLIENT_KEY || env?.TOSS_PG_CLIENT || ''
  return json({ ok: true, orderId, amount, credits, orderName: `BYGENCY 크레딧 ${credits}개`, clientKey, customerEmail: me.email, customerName: me.name })
}
