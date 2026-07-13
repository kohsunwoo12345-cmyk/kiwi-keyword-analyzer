import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureAiUsage, getUsdKrw } from '../studio/_pricing'

// GET /api/admin/ai-usage?days=30 → 스튜디오 AI 사용/정산 (사용자별·모델별 매출·비용·순이익)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAiUsage(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') || 30)))
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all()).results || []
  const one = async (sql: string, ...b: any[]) => {
    const r: any = await db.prepare(sql).bind(...b).first()
    return r || {}
  }

  const [totals, byUser, byModel, recent] = await Promise.all([
    one(
      `SELECT COUNT(*) AS count, COALESCE(SUM(revenue_krw),0) AS revenue,
              COALESCE(SUM(cost_krw),0) AS cost, COALESCE(SUM(credits),0) AS credits
       FROM ai_usage WHERE created_at > ?`,
      since,
    ),
    rows(
      `SELECT user_id, MAX(name) AS name, MAX(email) AS email, COUNT(*) AS count,
              COALESCE(SUM(credits),0) AS credits, COALESCE(SUM(revenue_krw),0) AS revenue,
              COALESCE(SUM(cost_krw),0) AS cost,
              GROUP_CONCAT(DISTINCT model) AS models
       FROM ai_usage WHERE created_at > ?
       GROUP BY user_id ORDER BY revenue DESC LIMIT 500`,
      since,
    ),
    rows(
      `SELECT model, MAX(provider) AS provider, MAX(kind) AS kind, MAX(markup) AS markup,
              COUNT(*) AS count, COALESCE(SUM(credits),0) AS credits,
              COALESCE(SUM(revenue_krw),0) AS revenue, COALESCE(SUM(cost_krw),0) AS cost
       FROM ai_usage WHERE created_at > ?
       GROUP BY model ORDER BY revenue DESC LIMIT 100`,
      since,
    ),
    rows(
      `SELECT created_at, name, email, model, provider, kind, credits, cost_krw, revenue_krw, markup, usd_krw
       FROM ai_usage WHERE created_at > ? ORDER BY created_at DESC LIMIT 300`,
      since,
    ),
  ])

  const todayRate = await getUsdKrw(db)

  const revenue = Number(totals.revenue) || 0
  const cost = Number(totals.cost) || 0

  return json({
    ok: true,
    days,
    todayRate,
    totals: {
      count: Number(totals.count) || 0,
      credits: Number(totals.credits) || 0,
      revenue,
      cost,
      profit: revenue - cost,
    },
    byUser: byUser.map((r: any) => ({
      user_id: r.user_id,
      name: r.name || '',
      email: r.email || '',
      count: Number(r.count) || 0,
      credits: Number(r.credits) || 0,
      revenue: Number(r.revenue) || 0,
      cost: Number(r.cost) || 0,
      profit: (Number(r.revenue) || 0) - (Number(r.cost) || 0),
      models: r.models || '',
    })),
    byModel: byModel.map((r: any) => ({
      model: r.model,
      provider: r.provider || '',
      kind: r.kind || '',
      markup: Number(r.markup) || 0,
      count: Number(r.count) || 0,
      credits: Number(r.credits) || 0,
      revenue: Number(r.revenue) || 0,
      cost: Number(r.cost) || 0,
      profit: (Number(r.revenue) || 0) - (Number(r.cost) || 0),
    })),
    recent: recent.map((r: any) => ({
      created_at: r.created_at,
      name: r.name || '',
      email: r.email || '',
      model: r.model,
      provider: r.provider || '',
      kind: r.kind || '',
      credits: Number(r.credits) || 0,
      cost: Number(r.cost_krw) || 0,
      revenue: Number(r.revenue_krw) || 0,
      profit: (Number(r.revenue_krw) || 0) - (Number(r.cost_krw) || 0),
      markup: Number(r.markup) || 0,
      usdKrw: Number(r.usd_krw) || 0,
    })),
  })
}
