import { Env, json, ensureSchema, resolveDB } from './_utils'
import { getPlanConfig, effectivePrice } from './_plans'

// GET /api/plan-config → 공개: 요금제 설정(가격·할인·기능·크레딧) + 실효가.
//  요금제 페이지·홈·활성화 페이지가 그대로 반영.
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const config = await getPlanConfig(db)
  // 실효가(할인 적용) 부가
  const withEff: any = { marketer: {}, video: {} }
  for (const track of ['marketer', 'video'] as const) {
    for (const tier of Object.keys(config[track])) {
      const t = config[track][tier]
      withEff[track][tier] = { ...t, effectivePrice: effectivePrice(t) }
    }
  }
  return json({ ok: true, config: withEff })
}
