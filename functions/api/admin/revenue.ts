import { Env, json, ensureSchema, resolveDB, requireAdminUser, planPriceKrw } from '../_utils'
import { ensureAiUsage } from '../studio/_pricing'

// GET /api/admin/revenue?days=30
//  실입금 매출(크레딧 판매 + 플랜/팀 결제) − AI 원가 = 순수익.
//  · 포인트: 무상 지급 → 매출 0.  · 문자/AI 크레딧 소비: 이미 크레딧 판매로 계상 → 매출 중복 제외(내부 소비로 별도 표시).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAiUsage(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const days = Math.min(3650, Math.max(1, Number(url.searchParams.get('days') || 30)))
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all()).results || []
  const kstDay = (iso: string) => {
    // ISO(UTC) → KST 날짜 YYYY-MM-DD
    try { const d = new Date(new Date(iso).getTime() + 9 * 3600000); return d.toISOString().slice(0, 10) } catch { return '' }
  }

  // ── 실입금 매출 소스 ──
  const creditCard = await rows(
    `SELECT o.amount, o.credits, o.created_at, u.name, u.email FROM credit_orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.status='paid' AND o.created_at > ?`, since)
  const creditApproval = await rows(
    `SELECT c.price AS amount, c.amount AS credits, c.created_at, u.name, u.email FROM credit_requests c LEFT JOIN users u ON u.id=c.user_id WHERE c.status='approved' AND c.created_at > ?`, since)
  const planRows = await rows(
    `SELECT p.track, p.to_plan, p.months, p.amount, p.created_at, u.name, u.email FROM plan_requests p LEFT JOIN users u ON u.id=p.user_id WHERE p.status='approved' AND p.created_at > ?`, since)
  // 플랜 실결제액: 신청 시점에 확정된 amount(할인·개월 반영) 우선, 없으면 월정가 × 개월(구버전 폴백)
  const planAmount = (r: any): number => {
    const a = Number(r.amount) || 0
    if (a > 0) return a
    const m = Math.max(1, Number(r.months) || 1)
    return planPriceKrw(String(r.track || 'marketer'), String(r.to_plan || '')) * m
  }
  const teamRows = await rows(
    `SELECT o.amount, o.seats, o.months, o.created_at, u.name, u.email FROM team_orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.status='paid' AND o.created_at > ?`, since)

  // ── AI 원가/내부 매출(크레딧 소비) ──
  const ai: any = (await db.prepare(
    `SELECT COALESCE(SUM(cost_krw),0) AS cost, COALESCE(SUM(revenue_krw),0) AS rev, COALESCE(SUM(credits),0) AS credits, COUNT(*) AS cnt FROM ai_usage WHERE created_at > ?`).bind(since).first()) || {}
  // 크레딧 소비(문자·AI 등) = 음수 credit 트랜잭션 합
  const spendRow: any = (await db.prepare(
    `SELECT COALESCE(SUM(-amount),0) AS spent FROM transactions WHERE kind='credit' AND amount < 0 AND created_at > ?`).bind(since).first()) || {}
  const smsRow: any = (await db.prepare(
    `SELECT COUNT(*) AS cnt FROM activity_log WHERE type='sms' AND created_at > ?`).bind(since).first()) || {}

  const sum = (arr: any[], f: (r: any) => number) => arr.reduce((s, r) => s + (f(r) || 0), 0)
  const creditCardKrw = sum(creditCard, (r) => Number(r.amount))
  const creditApprovalKrw = sum(creditApproval, (r) => Number(r.amount))
  const planKrw = sum(planRows, planAmount)
  const teamKrw = sum(teamRows, (r) => Number(r.amount))

  // 환불(처리 완료) — 기간 내 환불액은 매출에서 차감
  const refundRow: any = (await db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS krw, COUNT(*) AS cnt FROM refunds WHERE status='done' AND decided_at > ?`).bind(since).first().catch(() => ({}))) || {}
  const refundKrw = Number(refundRow.krw) || 0

  const creditSalesKrw = creditCardKrw + creditApprovalKrw
  const planTotalKrw = planKrw + teamKrw
  const grossRevenue = creditSalesKrw + planTotalKrw
  const revenue = grossRevenue - refundKrw   // 순매출(환불 차감)
  const aiCost = Number(ai.cost) || 0
  const profit = revenue - aiCost

  // ── 일별(KST) 매출 ──
  const dayMap: Record<string, { revenue: number; credit: number; plan: number }> = {}
  const bump = (iso: string, amt: number, cat: 'credit' | 'plan') => {
    const d = kstDay(iso); if (!d) return
    if (!dayMap[d]) dayMap[d] = { revenue: 0, credit: 0, plan: 0 }
    dayMap[d].revenue += amt; dayMap[d][cat] += amt
  }
  creditCard.forEach((r) => bump(r.created_at, Number(r.amount) || 0, 'credit'))
  creditApproval.forEach((r) => bump(r.created_at, Number(r.amount) || 0, 'credit'))
  planRows.forEach((r) => bump(r.created_at, planAmount(r), 'plan'))
  teamRows.forEach((r) => bump(r.created_at, Number(r.amount) || 0, 'plan'))
  const byDay = Object.keys(dayMap).sort().reverse().map((d) => ({ d, ...dayMap[d] }))

  // ── 최근 결제 내역(통합) ──
  const recent = [
    ...creditCard.map((r: any) => ({ type: '크레딧(카드)', name: r.name || '', email: r.email || '', amount: Number(r.amount) || 0, detail: `${r.credits}크레딧`, at: r.created_at })),
    ...creditApproval.map((r: any) => ({ type: '크레딧(승인)', name: r.name || '', email: r.email || '', amount: Number(r.amount) || 0, detail: `${r.credits}크레딧`, at: r.created_at })),
    ...planRows.map((r: any) => ({ type: '플랜', name: r.name || '', email: r.email || '', amount: planAmount(r), detail: `${r.track === 'video' ? '영상' : '마케터'} ${r.to_plan}${(Number(r.months) || 1) > 1 ? ` ${r.months}개월` : ''}`, at: r.created_at })),
    ...teamRows.map((r: any) => ({ type: '팀 요금제', name: r.name || '', email: r.email || '', amount: Number(r.amount) || 0, detail: `${r.seats}좌석·${r.months}개월`, at: r.created_at })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 200)

  return json({
    ok: true, days,
    totals: { revenue, cost: aiCost, profit, margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0 },
    breakdown: {
      creditCard: { krw: creditCardKrw, count: creditCard.length },
      creditApproval: { krw: creditApprovalKrw, count: creditApproval.length },
      plan: { krw: planKrw, count: planRows.length },
      team: { krw: teamKrw, count: teamRows.length },
      creditSales: creditSalesKrw, planTotal: planTotalKrw,
      refund: { krw: refundKrw, count: Number(refundRow.cnt) || 0 }, gross: grossRevenue,
    },
    aiInternal: { revenue: Number(ai.rev) || 0, cost: aiCost, profit: (Number(ai.rev) || 0) - aiCost, credits: Number(ai.credits) || 0, count: Number(ai.cnt) || 0 },
    usage: { creditSpent: Number(spendRow.spent) || 0, smsCount: Number(smsRow.cnt) || 0 },
    byDay, recent,
  })
}
