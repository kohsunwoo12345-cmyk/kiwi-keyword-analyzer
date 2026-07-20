import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'
import { spFlaAnalytics } from './_fla'

// SUPERPLACE 퍼널·랜딩 유입 분석 — 원본 로직 그대로 이식. c-shim 으로 D1 접근.
function makeCtx(request: Request, db: D1Database) {
  const url = new URL(request.url)
  return {
    env: { DB: db },
    req: { url: request.url, query: (k: string) => url.searchParams.get(k), json: () => request.json().catch(() => ({})) },
    json: (o: any, s?: number) => json(o, s || 200),
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureFunnelSchema(db); await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return json({ success: false, error: '관리자 권한이 필요합니다.' }, 403)
  try {
    const data = await spFlaAnalytics(makeCtx(request, db) as any)
    return json(data)
  } catch (e: any) {
    return json({ success: false, error: '퍼널 랜딩 분석 데이터를 불러오지 못했습니다.', detail: String(e?.message || e).slice(0, 200) }, 500)
  }
}
