import { Env, json, ensureSchema, getSessionUser, resolveDB, planPriceKrw } from '../_utils'
import { getPlanConfig, planPriceEffective } from '../_plans'
import { validateCoupon } from '../_coupons'

// POST /api/coupon/validate { code, track, plan, months } → 할인 미리보기(로그인 회원)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const track = b.track === 'video' ? 'video' : 'marketer'
  const plan = ['Plus', 'Pro', 'Max'].includes(b.plan) ? b.plan : 'Pro'
  const months = Math.max(1, Math.min(12, Math.round(Number(b.months) || 1)))

  const cfg = await getPlanConfig(db).catch(() => null)
  const monthly = (cfg ? planPriceEffective(cfg, track, plan) : 0) || planPriceKrw(track, plan)

  const calc = await validateCoupon(db, { code: b.code, track, plan, months, userId: me.id, monthlyPrice: monthly })
  if (!calc.ok) return json({ ok: false, error: calc.error, original: calc.original })
  return json({ ok: true, original: calc.original, discount: calc.discount, final: calc.final, label: calc.label })
}
