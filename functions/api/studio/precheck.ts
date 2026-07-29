import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { computeCharge, getUsdKrw, resolveMarkup, resolveRefSurcharge, resolveCnSurcharge, MODEL_COST } from './_pricing'
import { creditPriceFor } from '../payments/prepare'

// POST /api/studio/precheck { model, units?, kind?, res?, audio? }
//  → 생성 전 크레딧 사전 확인. 부족하면 402 {needPlan:true} 로 응답해 플랜 유도.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

  const b: any = await (request.json().catch(() => null)) ?? {}
  const rate = await getUsdKrw(db)
  const model = String(b.model || '')
  const markup = await resolveMarkup(db, me.id, model, Number(me.credit_markup) || 0)
  const creditKrw = await creditPriceFor(db, me)   // 회원 1크레딧 단가(원). 차감 기준
  /* 사전 확인도 같은 기준으로. 여기서 kind 를 클라이언트 값으로 받으면 "잔액이 충분하다" 고
     통과시킨 뒤 실제 차감에서 훨씬 큰 금액이 빠져 잔액이 음수가 된다(안내와 결과가 어긋난다). */
  const mcP = (MODEL_COST as any)[model]
  const kindP = mcP ? (mcP.u === 'sec' ? 'video' : 'image') : (String(b.kind || '') === 'image' ? 'image' : 'video')
  /* refs·hdr·exr 는 원가 자체를 바꾸는 값이다(루마 이미지·루마 영상 HDR·FLUX.2 입력 MP).
     예전엔 사전 확인에서 이걸 빼고 계산해, 통과시켜 놓고 실제 차감은 더 크게 빠졌다. */
  const refCount = Math.max(0, Number(b.refs) || 0)
  const c = computeCharge(
    { model, units: Number(b.units) || 0, kind: kindP, res: b.res, audio: !!b.audio,
      refs: refCount, hdr: !!b.hdr, exr: !!b.exr },
    rate, markup, creditKrw)
  const surPct = await resolveRefSurcharge(db, me.id)
  const refMult = 1 + (surPct / 100) * refCount
  const cnCount = Math.max(0, Number(b.cn) || 0)
  const cnPct = cnCount > 0 ? await resolveCnSurcharge(db) : 0
  const cnMult = cnCount > 0 ? 1 + cnPct / 100 : 1
  const need = Math.round(c.credits * refMult * cnMult * 100) / 100
  const balance = Number(me.credits) || 0

  // 관리자는 잔액 게이트 면제 — /api/generate·/api/v1/generate 와 동일한 기준.
  //  (usage/record 는 잔액이 음수가 되어도 원가를 전액 차감하므로, 이 우회가 없으면
  //   관리자만 스튜디오에서 "요금제 페이지로 이동" 팝업에 막힐 수 있다.)
  const isAdmin = me.role === 'admin'

  if (!isAdmin && balance < need) {
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
