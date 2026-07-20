// 쿠폰/할인코드 — 검증 + 사용(redeem) 공통 로직
// 매출은 plan_requests.amount(할인 적용 실결제액)로 집계되므로, 여기서 최종 금액을 확정한다.

export function normalizeCode(s: any): string {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, '')
}

export interface CouponCalc {
  ok: boolean
  error?: string
  coupon?: any
  original: number
  discount: number
  final: number
  label?: string // 예: "20% 할인" / "10,000원 할인"
}

/**
 * 쿠폰 검증 + 할인 계산 (사용은 하지 않음 — 미리보기/신청 양쪽에서 사용).
 *  monthlyPrice: 해당 플랜의 1개월 실효가(관리자 할인 반영).
 */
export async function validateCoupon(
  db: D1Database,
  opts: { code: string; track: string; plan: string; months: number; userId?: string; monthlyPrice: number },
): Promise<CouponCalc> {
  const code = normalizeCode(opts.code)
  const months = Math.max(1, Math.round(Number(opts.months) || 1))
  const original = Math.round((Number(opts.monthlyPrice) || 0) * months)
  const fail = (error: string): CouponCalc => ({ ok: false, error, original, discount: 0, final: original })
  if (!code) return fail('쿠폰 코드를 입력하세요.')

  const c: any = await db.prepare('SELECT * FROM coupons WHERE code = ?').bind(code).first().catch(() => null)
  if (!c) return fail('존재하지 않는 쿠폰 코드입니다.')
  if (!Number(c.active)) return fail('사용할 수 없는(비활성) 쿠폰입니다.')

  const now = Date.now()
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return fail('아직 사용 기간이 아닌 쿠폰입니다.')
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return fail('사용 기간이 만료된 쿠폰입니다.')
  if (c.scope_track && c.scope_track !== opts.track) return fail(`${c.scope_track === 'video' ? 'AI 영상' : '마케터'} 플랜에만 사용할 수 있는 쿠폰입니다.`)
  if (c.scope_plan && c.scope_plan !== opts.plan) return fail(`${c.scope_plan} 플랜에만 사용할 수 있는 쿠폰입니다.`)
  if (Number(c.min_months) > 0 && months < Number(c.min_months)) return fail(`최소 ${c.min_months}개월 이상 신청 시 사용할 수 있는 쿠폰입니다.`)
  if (Number(c.max_uses) > 0 && Number(c.used_count) >= Number(c.max_uses)) return fail('쿠폰 사용 한도가 모두 소진되었습니다.')
  if (opts.userId && Number(c.per_user_limit) > 0) {
    const r: any = await db.prepare('SELECT COUNT(*) AS n FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?').bind(c.id, opts.userId).first().catch(() => ({ n: 0 }))
    if (Number(r?.n) >= Number(c.per_user_limit)) return fail('이미 사용한 쿠폰입니다.')
  }

  let discount = 0
  let label = ''
  if (c.discount_type === 'fixed') {
    discount = Math.min(Number(c.discount_value) || 0, original)
    label = `${(Number(c.discount_value) || 0).toLocaleString('ko-KR')}원 할인`
  } else {
    const pct = Math.max(0, Math.min(100, Number(c.discount_value) || 0))
    discount = Math.round(original * pct / 100)
    label = `${pct}% 할인`
  }
  const final = Math.max(0, original - discount)
  return { ok: true, coupon: c, original, discount, final, label }
}

/** 쿠폰 사용 확정 — 사용횟수 +1, redemption 기록. 검증은 호출 전에 완료돼 있어야 함. */
export async function redeemCoupon(
  db: D1Database,
  calc: CouponCalc,
  ctx: { userId: string; planRequestId: string; track: string; plan: string; months: number },
): Promise<void> {
  if (!calc.ok || !calc.coupon) return
  const now = new Date().toISOString()
  try {
    await db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').bind(calc.coupon.id).run()
    await db.prepare(
      `INSERT INTO coupon_redemptions (id, coupon_id, code, user_id, plan_request_id, track, plan, months, original_krw, discount_krw, final_krw, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind('cr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), calc.coupon.id, calc.coupon.code, ctx.userId, ctx.planRequestId,
      ctx.track, ctx.plan, ctx.months, calc.original, calc.discount, calc.final, now).run()
  } catch { /* 사용 기록 실패는 신청을 막지 않음 */ }
}
