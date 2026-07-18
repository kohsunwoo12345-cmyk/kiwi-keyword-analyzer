import { Env, json, ensureSchema, seedAdmin, getSessionUser, publicUser, resolveDB } from './_utils'
import { creditPriceFor } from './payments/prepare'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, user: null })
  await ensureSchema(db)
  await seedAdmin(db, env)
  const row = await getSessionUser(request, db)
  // 이 회원에게 적용되는 크레딧 구매 단가(원/크레딧) — 프론트 표시 일치용
  const creditPriceKrw = row ? await creditPriceFor(db, row) : 65
  return json({ ok: true, user: publicUser(row), creditPriceKrw })
}
