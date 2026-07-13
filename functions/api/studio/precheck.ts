import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { computeCharge } from './_pricing'

// POST /api/studio/precheck { model, units?, kind?, res?, audio? }
//  → 생성 전 크레딧 사전 확인. 부족하면 402 {needPlan:true} 로 응답해 플랜 유도.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

  const b: any = await request.json().catch(() => ({}))
  const c = computeCharge({ model: String(b.model || ''), units: Number(b.units) || 0, kind: b.kind, res: b.res, audio: !!b.audio })
  const balance = Number(me.credits) || 0

  if (balance < c.credits) {
    return json(
      {
        ok: false,
        needPlan: true,
        error: `크레딧이 부족합니다. 필요 ${c.credits.toLocaleString('ko-KR')}크레딧 · 보유 ${balance.toLocaleString('ko-KR')}크레딧`,
        need: c.credits,
        balance,
        model: c.model,
      },
      402,
    )
  }
  return json({ ok: true, need: c.credits, balance, model: c.model, revenueKrw: c.revenueKrw })
}
