import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureAiUsage, getUsdKrw, PROV_LABEL } from '../studio/_pricing'

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
  /* 제공사 청구서는 "며칠 전부터" 가 아니라 청구 기간(예: 7/1~7/31)으로 끊겨 나온다.
     그 기간을 그대로 넣을 수 있어야 청구서 한 줄과 우리 합계를 직접 맞대 볼 수 있다.
     from/to 가 없으면 예전처럼 최근 N일이다. */
  const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
  const fromQ = String(url.searchParams.get('from') || '')
  const toQ = String(url.searchParams.get('to') || '')
  const since = isDay(fromQ) ? fromQ + 'T00:00:00.000Z' : new Date(Date.now() - days * 86400000).toISOString()
  //  to 는 그날까지 포함 — 하루를 더해 다음 날 0시 직전까지 본다.
  const until = isDay(toQ) ? new Date(Date.parse(toQ + 'T00:00:00.000Z') + 86400000).toISOString() : '9999-12-31T23:59:59.999Z'

  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all()).results || []
  const one = async (sql: string, ...b: any[]) => {
    const r: any = await db.prepare(sql).bind(...b).first()
    return r || {}
  }

  const [totals, byUser, byModel, recent, byDay, byProvider] = await Promise.all([
    one(
      `SELECT COUNT(*) AS count, COALESCE(SUM(revenue_krw),0) AS revenue,
              COALESCE(SUM(cost_krw),0) AS cost, COALESCE(SUM(credits),0) AS credits
       FROM ai_usage WHERE created_at > ? AND created_at < ?`,
      since, until,
    ),
    rows(
      `SELECT user_id, MAX(name) AS name, MAX(email) AS email, COUNT(*) AS count,
              COALESCE(SUM(credits),0) AS credits, COALESCE(SUM(revenue_krw),0) AS revenue,
              COALESCE(SUM(cost_krw),0) AS cost,
              GROUP_CONCAT(DISTINCT model) AS models
       FROM ai_usage WHERE created_at > ? AND created_at < ?
       GROUP BY user_id ORDER BY revenue DESC LIMIT 500`,
      since, until,
    ),
    rows(
      `SELECT model, MAX(provider) AS provider, MAX(kind) AS kind, MAX(markup) AS markup,
              COUNT(*) AS count, COALESCE(SUM(credits),0) AS credits,
              COALESCE(SUM(revenue_krw),0) AS revenue, COALESCE(SUM(cost_krw),0) AS cost
       FROM ai_usage WHERE created_at > ? AND created_at < ?
       GROUP BY model ORDER BY revenue DESC LIMIT 100`,
      since, until,
    ),
    rows(
      `SELECT created_at, name, email, model, provider, kind, credits, cost_krw, revenue_krw, markup, usd_krw
       FROM ai_usage WHERE created_at > ? AND created_at < ? ORDER BY created_at DESC LIMIT 300`,
      since, until,
    ),
    // 일별(KST) 집계 + 그날 적용된 환율
    rows(
      `SELECT substr(datetime(created_at, '+9 hours'),1,10) AS d, COUNT(*) AS count,
              COALESCE(SUM(credits),0) AS credits, COALESCE(SUM(revenue_krw),0) AS revenue,
              COALESCE(SUM(cost_krw),0) AS cost, AVG(usd_krw) AS rate, MAX(usd_krw) AS rateMax, MIN(usd_krw) AS rateMin
       FROM ai_usage WHERE created_at > ? AND created_at < ?
       GROUP BY d ORDER BY d DESC LIMIT 400`,
      since, until,
    ),
    /* 제공사 청구서 대조용 — 청구서는 달러로, 제공사별로 끊겨 나온다.
       우리가 계산한 실비(usd)를 같은 단위·같은 기간으로 뽑아 두면 청구서 한 줄과 바로 맞대 볼 수 있다.
       두 값이 벌어지면 그 제공사 단가표가 틀렸다는 뜻이다. */
    rows(
      `SELECT COALESCE(provider,'') AS provider, COUNT(*) AS count,
              COALESCE(SUM(usd),0) AS usd, COALESCE(SUM(cost_krw),0) AS cost,
              COALESCE(SUM(credits),0) AS credits, COALESCE(SUM(revenue_krw),0) AS revenue
       FROM ai_usage WHERE created_at > ? AND created_at < ?
       GROUP BY provider ORDER BY usd DESC LIMIT 60`,
      since, until,
    ),
  ])

  const todayRate = await getUsdKrw(db)

  const revenue = Number(totals.revenue) || 0
  const cost = Number(totals.cost) || 0

  return json({
    ok: true,
    days,
    from: since.slice(0, 10),
    to: until.startsWith('9999') ? '' : new Date(Date.parse(until) - 86400000).toISOString().slice(0, 10),
    todayRate,
    byProvider: byProvider.map((r: any) => ({
      provider: r.provider || '(미상)',
      /* 표에는 'ltx'·'falcontrol' 같은 내부 이름이 그대로 찍히고 있었다. 제공사 청구서와
         맞대 보는 표인데 그 이름이 청구서 어디에도 없어서 매번 코드를 뒤져야 했다.
         이름표는 단가표(PROV_LABEL) 한 곳에만 있으니 그걸 그대로 내려 준다. */
      providerLabel: PROV_LABEL[String(r.provider || '')] || String(r.provider || '(미상)'),
      count: Number(r.count) || 0,
      usd: Math.round((Number(r.usd) || 0) * 10000) / 10000,
      cost: Number(r.cost) || 0,
      credits: Number(r.credits) || 0,
      revenue: Number(r.revenue) || 0,
    })),
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
    byDay: byDay.map((r: any) => ({
      d: r.d,
      count: Number(r.count) || 0,
      credits: Number(r.credits) || 0,
      revenue: Number(r.revenue) || 0,
      cost: Number(r.cost) || 0,
      profit: (Number(r.revenue) || 0) - (Number(r.cost) || 0),
      rate: Math.round(Number(r.rate) || 0),
      rateMin: Math.round(Number(r.rateMin) || 0),
      rateMax: Math.round(Number(r.rateMax) || 0),
    })),
  })
}
