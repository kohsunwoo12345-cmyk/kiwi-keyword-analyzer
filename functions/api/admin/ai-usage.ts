import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureAiUsage, getUsdKrw } from '../studio/_pricing'
import { ensureGenCharges } from '../studio/_gencharge'

// GET /api/admin/ai-usage?days=30 → 스튜디오 AI 사용/정산 (사용자별·모델별 매출·비용·순이익)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAiUsage(db)
  //  아래 "결말 없는 차감" 을 세려면 gen_charges 의 swept_at 칸이 있어야 한다
  await ensureGenCharges(db).catch(() => {})
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

  /* ── 실패해서 돌려준 건은 매출이 아니다 ──
     환불은 여태 gen_charges 에만 남아서, 이 화면은 돌려준 건까지 매출·순이익으로 세고 있었다.
     회원 지갑에서는 나갔다가 되돌아왔는데 관리자 화면에서는 번 돈으로 보인 것이다.
     줄 자체는 지우지 않는다 — 무엇을 얼마에 팔려다 돌려줬는지가 사라지면 되짚을 수 없다.
     대신 합계에서만 뺀다. 뺀 금액은 아래 refunded 로 따로 내보내 화면에 그대로 적는다.
     ⚠ 원가도 함께 뺀다. 실패한 작업은 제공사도 대개 청구하지 않아서, 넣어 두면
       "제공사 청구서 대조" 가 늘 청구서보다 크게 나온다(대조의 의미가 없어진다). */
  const LIVE = 'COALESCE(refunded,0) = 0'
  const S = (col: string) => `COALESCE(SUM(CASE WHEN ${LIVE} THEN COALESCE(${col},0) ELSE 0 END),0)`
  const CNT = `COALESCE(SUM(CASE WHEN ${LIVE} THEN 1 ELSE 0 END),0)`
  const RCNT = `COALESCE(SUM(CASE WHEN ${LIVE} THEN 0 ELSE 1 END),0)`
  const RCRD = `COALESCE(SUM(CASE WHEN ${LIVE} THEN 0 ELSE COALESCE(refund_credits, credits, 0) END),0)`

  const [totals, byUser, byModel, recent, byDay, byProvider] = await Promise.all([
    one(
      `SELECT ${CNT} AS count, ${S('revenue_krw')} AS revenue,
              ${S('cost_krw')} AS cost, ${S('credits')} AS credits,
              ${RCNT} AS refundedCount, ${RCRD} AS refundedCredits,
              COALESCE(SUM(CASE WHEN ${LIVE} THEN 0 ELSE COALESCE(revenue_krw,0) END),0) AS refundedKrw
       FROM ai_usage WHERE created_at > ? AND created_at < ?`,
      since, until,
    ),
    rows(
      `SELECT user_id, MAX(name) AS name, MAX(email) AS email, ${CNT} AS count,
              ${S('credits')} AS credits, ${S('revenue_krw')} AS revenue,
              ${S('cost_krw')} AS cost,
              ${RCNT} AS refundedCount, ${RCRD} AS refundedCredits,
              GROUP_CONCAT(DISTINCT model) AS models
       FROM ai_usage WHERE created_at > ? AND created_at < ?
       GROUP BY user_id ORDER BY revenue DESC LIMIT 500`,
      since, until,
    ),
    rows(
      `SELECT model, MAX(provider) AS provider, MAX(kind) AS kind, MAX(markup) AS markup,
              ${CNT} AS count, ${S('credits')} AS credits,
              ${S('revenue_krw')} AS revenue, ${S('cost_krw')} AS cost,
              ${RCNT} AS refundedCount
       FROM ai_usage WHERE created_at > ? AND created_at < ?
       GROUP BY model ORDER BY revenue DESC LIMIT 100`,
      since, until,
    ),
    rows(
      `SELECT created_at, name, email, model, provider, kind, credits, cost_krw, revenue_krw, markup, usd_krw,
              COALESCE(refunded,0) AS refunded, COALESCE(refund_credits,0) AS refund_credits
       FROM ai_usage WHERE created_at > ? AND created_at < ? ORDER BY created_at DESC LIMIT 300`,
      since, until,
    ),
    // 일별(KST) 집계 + 그날 적용된 환율
    rows(
      `SELECT substr(datetime(created_at, '+9 hours'),1,10) AS d, ${CNT} AS count,
              ${S('credits')} AS credits, ${S('revenue_krw')} AS revenue,
              ${S('cost_krw')} AS cost, ${RCNT} AS refundedCount,
              AVG(usd_krw) AS rate, MAX(usd_krw) AS rateMax, MIN(usd_krw) AS rateMin
       FROM ai_usage WHERE created_at > ? AND created_at < ?
       GROUP BY d ORDER BY d DESC LIMIT 400`,
      since, until,
    ),
    /* 제공사 청구서 대조용 — 청구서는 달러로, 제공사별로 끊겨 나온다.
       우리가 계산한 실비(usd)를 같은 단위·같은 기간으로 뽑아 두면 청구서 한 줄과 바로 맞대 볼 수 있다.
       두 값이 벌어지면 그 제공사 단가표가 틀렸다는 뜻이다. */
    rows(
      `SELECT COALESCE(provider,'') AS provider, ${CNT} AS count,
              ${S('usd')} AS usd, ${S('cost_krw')} AS cost,
              ${S('credits')} AS credits, ${S('revenue_krw')} AS revenue,
              ${RCNT} AS refundedCount
       FROM ai_usage WHERE created_at > ? AND created_at < ?
       GROUP BY provider ORDER BY usd DESC LIMIT 60`,
      since, until,
    ),
  ])

  /* 아직 결말이 안 온 차감 — 제출 때 뺐는데 성공도 실패도 확인되지 않은 건.
     이 숫자가 쌓이면 "만들어졌는지 모르는데 돈은 빠져 있는" 상태라, 화면에 그대로 내보낸다.
     (평소에는 폴링이, 폴링이 끊기면 /api/cron/gen-sweep 이 결말을 확인해 되돌린다) */
  const openRow: any = await db.prepare(
    `SELECT COUNT(*) AS c, COALESCE(SUM(credits),0) AS credits FROM gen_charges
      WHERE status = 'charged' AND swept_at IS NULL AND created_at < ?`,
  ).bind(new Date(Date.now() - 3600_000).toISOString()).first().catch(() => null)

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
      count: Number(r.count) || 0,
      usd: Math.round((Number(r.usd) || 0) * 10000) / 10000,
      cost: Number(r.cost) || 0,
      credits: Number(r.credits) || 0,
      revenue: Number(r.revenue) || 0,
      refundedCount: Number(r.refundedCount) || 0,
    })),
    totals: {
      count: Number(totals.count) || 0,
      credits: Number(totals.credits) || 0,
      revenue,
      cost,
      profit: revenue - cost,
      //  실패로 확정돼 돌려준 건 — 위 합계에서는 빠져 있다. 숨기지 않고 따로 보여 준다.
      refundedCount: Number(totals.refundedCount) || 0,
      refundedCredits: Math.round((Number(totals.refundedCredits) || 0) * 100) / 100,
      refundedKrw: Number(totals.refundedKrw) || 0,
    },
    //  아직 성공도 실패도 확인되지 않은 채 빠져 있는 돈(1시간 이상 지난 것만)
    open: {
      count: Number(openRow?.c) || 0,
      credits: Math.round((Number(openRow?.credits) || 0) * 100) / 100,
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
      refundedCount: Number(r.refundedCount) || 0,
      refundedCredits: Math.round((Number(r.refundedCredits) || 0) * 100) / 100,
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
      refundedCount: Number(r.refundedCount) || 0,
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
      //  이 줄이 실패 환불 건인가 — 위 합계에는 안 들어간 줄이라 화면에서도 구분돼야 한다
      refunded: Number(r.refunded) === 1,
      refundCredits: Math.round((Number(r.refund_credits) || 0) * 100) / 100,
    })),
    byDay: byDay.map((r: any) => ({
      d: r.d,
      count: Number(r.count) || 0,
      credits: Number(r.credits) || 0,
      revenue: Number(r.revenue) || 0,
      cost: Number(r.cost) || 0,
      profit: (Number(r.revenue) || 0) - (Number(r.cost) || 0),
      refundedCount: Number(r.refundedCount) || 0,
      rate: Math.round(Number(r.rate) || 0),
      rateMin: Math.round(Number(r.rateMin) || 0),
      rateMax: Math.round(Number(r.rateMax) || 0),
    })),
  })
}
