// GET /api/v1/models — 빌려갈 수 있는 우리 모델 목록.
//  · 인증 없이도 볼 수 있다(카탈로그일 뿐, 파일은 리스 토큰이 있어야 받는다).
//  · 값(크레딧)은 실제 단가표에서 그때그때 계산한다 — 문서에 숫자를 박아 두면 단가를 바꿨을 때 어긋난다.
import { resolveDB, json } from '../_utils'
import { computeCharge, getUsdKrw, resolveCostOverride, LEASE_SR, CREDIT_KRW } from '../studio/_pricing'
import { LENDABLE } from './_lease'

export const onRequestGet: PagesFunction = async ({ env }) => {
  const db = resolveDB(env)
  let credits: number | null = null
  try {
    if (db) {
      const rate = await getUsdKrw(db)
      const c = computeCharge({ model: LEASE_SR, units: 1, kind: 'image' }, rate, undefined, CREDIT_KRW, await resolveCostOverride(db, LEASE_SR))
      credits = c.credits
    }
  } catch { /* 값을 못 구해도 목록은 준다 */ }

  const models = Object.values(LENDABLE).map((m) => ({
    id: m.id,
    title: m.title,
    kind: m.kind,
    scale: m.scale,
    license: m.license,
    source: m.source,
    files: m.files.map((f) => f.name),
    note: m.note,
    lease_credits: credits,
  }))
  return json({
    ok: true,
    models,
    how: {
      step1: 'POST /api/v1/lease  { "model": "sr-x4-fast", "days": 7 }  → 크레딧 차감 + 리스 토큰 발급',
      step2: 'GET /api/v1/model-file/<파일명>?lease=<토큰>  → 가중치 내려받기',
      step3: 'SDK: /sdk/bygency-sr.js (브라우저·Node 공용, onnxruntime-web 필요)',
      note: '추론은 빌려간 쪽 기기에서 돕니다. 우리 서버는 추론하지 않습니다.',
    },
  })
}
