import { Env, json, ensureSchema, seedAdmin, getSessionUser, publicUser, resolveDB, ADMIN_EMAIL } from './_utils'
import { creditPriceFor } from './payments/prepare'
import { getPlanConfig } from './_plans'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, user: null })
  await ensureSchema(db)
  await seedAdmin(db, env)
  const row: any = await getSessionUser(request, db)
  // 이 회원에게 적용되는 크레딧 구매 단가(원/크레딧) — 프론트 표시 일치용
  const creditPriceKrw = row ? await creditPriceFor(db, row) : 65
  // 스튜디오 최대 노드 수 — 영상 플랜 설정 기준(관리자/무제한 = 0)
  let maxNodes = 0
  if (row) {
    const isAdmin = row.email === ADMIN_EMAIL || row.role === 'admin'
    const vp = row.video_plan || '없음'
    if (!isAdmin && vp !== '없음') {
      try { const cfg = await getPlanConfig(db); maxNodes = Number(cfg.video?.[vp]?.maxNodes) || 0 } catch { maxNodes = 0 }
    }
  }
  return json({ ok: true, user: publicUser(row), creditPriceKrw, maxNodes })
}
