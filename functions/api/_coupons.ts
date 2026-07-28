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

/** 쿠폰 사용 확정 — 사용횟수 +1, redemption 기록.
 *
 *  ⚠ validateCoupon 의 한도 검사는 읽기 시점 기준이라 동시 요청을 막지 못한다.
 *     같은 코드를 여러 창에서 동시에 넣으면 1회짜리 쿠폰도 전부 통과해 버린다.
 *     그래서 여기서 한도를 "조건부로" 다시 확인한다 —
 *      · 전체 한도(max_uses): used_count < max_uses 일 때만 +1 되는 UPDATE
 *      · 1인 한도(per_user_limit): 그 회원의 기존 사용 건수를 세는 조건부 INSERT
 *     둘 중 하나라도 통과하지 못하면 앞 단계를 되돌리고 false 를 돌려준다.
 *  반환값이 false 면 호출부는 쿠폰 없이 진행하지 말고 요청 자체를 거절해야 한다.
 */
export async function redeemCoupon(
  db: D1Database,
  calc: CouponCalc,
  ctx: { userId: string; planRequestId: string; track: string; plan: string; months: number },
): Promise<boolean> {
  if (!calc.ok || !calc.coupon) return false
  const now = new Date().toISOString()
  const c = calc.coupon
  try {
    const upd: any = await db.prepare(
      `UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1
        WHERE id = ? AND (max_uses IS NULL OR max_uses <= 0 OR COALESCE(used_count, 0) < max_uses)`,
    ).bind(c.id).run()
    if (!upd || Number(upd.meta?.changes || 0) === 0) return false

    const perUser = Number(c.per_user_limit) || 0
    const ins: any = await db.prepare(
      `INSERT INTO coupon_redemptions (id, coupon_id, code, user_id, plan_request_id, track, plan, months, original_krw, discount_krw, final_krw, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE ? <= 0 OR (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?) < ?`,
    ).bind('cr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), c.id, c.code, ctx.userId, ctx.planRequestId,
      ctx.track, ctx.plan, ctx.months, calc.original, calc.discount, calc.final, now,
      perUser, c.id, ctx.userId, perUser).run()
    if (!ins || Number(ins.meta?.changes || 0) === 0) {
      // 1인 한도에 걸렸다 → 방금 올린 전체 사용횟수를 되돌린다
      await db.prepare('UPDATE coupons SET used_count = COALESCE(used_count, 0) - 1 WHERE id = ? AND COALESCE(used_count, 0) > 0')
        .bind(c.id).run().catch(() => {})
      return false
    }
    return true
  } catch {
    return false
  }
}
