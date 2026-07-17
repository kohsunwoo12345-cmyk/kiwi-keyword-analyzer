import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { ensureAiUsage } from '../studio/_pricing'

// GET /api/account/usage → 본인 AI 사용량(실데이터) 요약 + 최근 내역
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAiUsage(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const rows = (await db
    .prepare('SELECT provider, model, kind, credits, cost_krw, units, created_at FROM ai_usage WHERE user_id = ? ORDER BY created_at DESC LIMIT 60')
    .bind(me.id)
    .all()).results || []

  const agg: any = await db
    .prepare('SELECT COUNT(*) c, COALESCE(SUM(credits),0) cr, COALESCE(SUM(cost_krw),0) ck FROM ai_usage WHERE user_id = ?')
    .bind(me.id)
    .first()

  const mkey = new Date().toISOString().slice(0, 7) // YYYY-MM (UTC 기준 월)
  const magg: any = await db
    .prepare("SELECT COUNT(*) c, COALESCE(SUM(credits),0) cr FROM ai_usage WHERE user_id = ? AND substr(created_at,1,7) = ?")
    .bind(me.id, mkey)
    .first()

  return json({
    ok: true,
    credits: Number(me.credits) || 0,
    plan: me.plan || '없음',
    videoPlan: me.video_plan || '없음',
    total: { count: Number(agg?.c) || 0, credits: Number(agg?.cr) || 0, costKrw: Number(agg?.ck) || 0 },
    month: { count: Number(magg?.c) || 0, credits: Number(magg?.cr) || 0 },
    recent: (rows as any[]).map((r) => ({
      provider: r.provider,
      model: r.model,
      kind: r.kind,
      credits: Number(r.credits) || 0,
      costKrw: Number(r.cost_krw) || 0,
      units: Number(r.units) || 0,
      at: r.created_at,
    })),
  })
}
