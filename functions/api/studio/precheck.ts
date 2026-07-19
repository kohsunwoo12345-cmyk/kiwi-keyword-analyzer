import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { computeCharge, getUsdKrw, resolveMarkup, resolveRefSurcharge, resolveCnSurcharge } from './_pricing'

// POST /api/studio/precheck { model, units?, kind?, res?, audio? }
//  → 생성 전 크레딧 사전 확인. 부족하면 402 {needPlan:true} 로 응답해 플랜 유도.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

  const b: any = await request.json().catch(() => ({}))
  const rate = await getUsdKrw(db)
  const model = String(b.model || '')
  const markup = await resolveMarkup(db, me.id, model, Number(me.credit_markup) || 0)
  const c = computeCharge({ model, units: Number(b.units) || 0, kind: b.kind, res: b.res, audio: !!b.audio }, rate, markup)
  const surPct = await resolveRefSurcharge(db, me.id)
  const refMult = 1 + (surPct / 100) * Math.max(0, Number(b.refs) || 0)
  const cnCount = Math.max(0, Number(b.cn) || 0)
  const cnPct = cnCount > 0 ? await resolveCnSurcharge(db) : 0
  const cnMult = cnCount > 0 ? 1 + cnPct / 100 : 1
  const need = Math.round(c.credits * refMult * cnMult * 100) / 100
  const balance = Number(me.credits) || 0

  if (balance < need) {
    return json(
      {
        ok: false,
        needPlan: true,
        error: `크레딧이 부족합니다. 필요 ${need.toLocaleString('ko-KR')}크레딧 · 보유 ${balance.toLocaleString('ko-KR')}크레딧`,
        need,
        balance,
        model: c.model,
      },
      402,
    )
  }
  return json({ ok: true, need, balance, model: c.model, refSurchargePct: surPct, cnSurchargePct: cnPct })
}
