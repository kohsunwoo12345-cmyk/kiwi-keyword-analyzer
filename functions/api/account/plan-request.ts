import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity, planPriceKrw } from '../_utils'
import { getPlanConfig, planPriceEffective } from '../_plans'
import { validateCoupon, redeemCoupon } from '../_coupons'

const PLANS = ['Plus', 'Pro', 'Max']
const TRACKS = ['marketer', 'video']

// POST /api/account/plan-request { track:'marketer'|'video', to_plan, memo? } → 플랜 신청(승인 대기)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const track = TRACKS.includes(String(body.track)) ? String(body.track) : 'marketer'
  const to = String(body.to_plan || '')
  if (!PLANS.includes(to)) return json({ ok: false, error: '유효한 플랜을 선택하세요.' }, 400)
  const current = track === 'video' ? (me.video_plan || '없음') : (me.plan || '없음')
  if (to === current) return json({ ok: false, error: '이미 사용 중인 플랜입니다.' }, 400)

  const dup = await db
    .prepare("SELECT id FROM plan_requests WHERE user_id = ? AND track = ? AND status = 'pending'")
    .bind(me.id, track)
    .first()
  if (dup) return json({ ok: false, error: '이미 승인 대기 중인 신청이 있습니다.' }, 409)

  const months = Math.max(0, Math.min(12, Math.round(Number(body.months) || 0)))
  // 신청 시점에 실결제액 확정(관리자 설정 실효가 × 개월). 이후 요금이 바뀌어도 이 금액으로 매출 집계.
  const cfg = await getPlanConfig(db).catch(() => null)
  const monthly = (cfg ? planPriceEffective(cfg, track, to) : 0) || planPriceKrw(track, to)
  let amount = Math.round(monthly * Math.max(1, months))

  // 쿠폰/할인코드 — 유효하면 실결제액에 할인 적용
  const couponInput = String(body.coupon || '').trim()
  let couponCalc: any = null
  let couponCode: string | null = null
  if (couponInput) {
    couponCalc = await validateCoupon(db, { code: couponInput, track, plan: to, months: Math.max(1, months), userId: me.id, monthlyPrice: monthly })
    if (!couponCalc.ok) return json({ ok: false, error: couponCalc.error || '쿠폰을 사용할 수 없습니다.' }, 400)
    amount = couponCalc.final
    couponCode = couponCalc.coupon?.code || null
  }

  const prId = 'pr_' + crypto.randomUUID().slice(0, 14)
  const now = new Date().toISOString()
  await db
    .prepare(`INSERT INTO plan_requests (id, user_id, track, from_plan, to_plan, status, memo, months, amount, coupon_code, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`)
    .bind(prId, me.id, track, current, to, String(body.memo || ''), months, amount, couponCode, now)
    .run()
  // 쿠폰 사용 확정(사용횟수 +1, 기록)
  if (couponCalc?.ok) await redeemCoupon(db, couponCalc, { userId: me.id, planRequestId: prId, track, plan: to, months: Math.max(1, months) })
  const label = track === 'video' ? 'AI 영상' : '마케터'
  await logActivity(db, me.id, 'plan', `${label} 플랜 신청: ${current} → ${to}${months ? ` (${months}개월)` : ''}${couponCode ? ` · 쿠폰 ${couponCode}` : ''}`)
  return json({ ok: true, amount, coupon: couponCode })
}

// GET → 본인 플랜 신청 내역
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const requests = (await db.prepare('SELECT track, from_plan, to_plan, status, months, created_at, decided_at FROM plan_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(me.id).all()).results || []
  return json({ ok: true, requests })
}
