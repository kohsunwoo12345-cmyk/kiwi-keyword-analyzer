import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'

// 관리자: 퍼널 랜딩페이지 분석 (조회수·신청수·전환율·일별 추이·최근 신청자)
//  GET /api/admin/funnel-analytics?days=14
const kstDate = (iso: string) => {
  try { const t = new Date(new Date(iso).getTime() + 9 * 3600_000); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}` } catch { return '' }
}
const rate = (a: number, v: number) => (v > 0 ? Math.round((a / v) * 1000) / 10 : 0)

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureFunnelSchema(db)
  const guard = await requireAdminUser(request, db); if (guard.error) return guard.error
  const url = new URL(request.url)
  const days = Math.min(60, Math.max(7, Number(url.searchParams.get('days')) || 14))

  // 페이지별 조회수 + 신청수
  const pages = (await db.prepare(
    `SELECT p.id, p.title, p.slug, COALESCE(p.views,0) AS views, p.created_at, g.name AS group_name,
            (SELECT COUNT(*) FROM funnel_applicants a WHERE a.landing_page_id = p.id) AS applicants
     FROM funnel_landing_pages p LEFT JOIN funnel_groups g ON g.id = p.group_id
     ORDER BY applicants DESC, views DESC LIMIT 500`,
  ).all().catch(() => ({ results: [] }))).results || []

  const pageRows = (pages as any[]).map((p) => ({
    id: p.id, title: p.title, slug: p.slug, url: `/f/${p.slug}`, groupName: p.group_name || '(그룹없음)',
    views: Number(p.views) || 0, applicants: Number(p.applicants) || 0, conv: rate(Number(p.applicants) || 0, Number(p.views) || 0),
    createdAt: p.created_at,
  }))

  const totalViews = pageRows.reduce((a, p) => a + p.views, 0)
  const totalApplicants = pageRows.reduce((a, p) => a + p.applicants, 0)

  // 그룹별 집계
  const groupMap: Record<string, { name: string; pages: number; views: number; applicants: number }> = {}
  for (const p of pageRows) {
    const k = p.groupName; if (!groupMap[k]) groupMap[k] = { name: k, pages: 0, views: 0, applicants: 0 }
    groupMap[k].pages++; groupMap[k].views += p.views; groupMap[k].applicants += p.applicants
  }
  const byGroup = Object.values(groupMap).map((g) => ({ ...g, conv: rate(g.applicants, g.views) })).sort((a, b) => b.applicants - a.applicants)

  // 일별 신청 추이 (최근 N일, KST)
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const appRows = (await db.prepare(
    `SELECT a.created_at, a.data_json, p.title AS page_title
     FROM funnel_applicants a LEFT JOIN funnel_landing_pages p ON p.id = a.landing_page_id
     WHERE a.created_at >= ? ORDER BY a.created_at DESC LIMIT 2000`,
  ).bind(since).all().catch(() => ({ results: [] }))).results || []

  const dayMap: Record<string, number> = {}
  for (const r of appRows as any[]) { const d = kstDate(r.created_at); if (d) dayMap[d] = (dayMap[d] || 0) + 1 }
  const daily: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(Date.now() - i * 864e5 + 9 * 3600_000)
    const d = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
    daily.push({ date: d, count: dayMap[d] || 0 })
  }

  // 최근 신청자 (개인정보 — 관리자 열람)
  const recent = (appRows as any[]).slice(0, 60).map((r) => {
    let d: any = {}; try { d = JSON.parse(r.data_json || '{}') } catch {}
    return { pageTitle: r.page_title || '(삭제된 페이지)', name: d.name || '', phone: d.phone || '', email: d.email || '', createdAt: r.created_at }
  })

  return json({
    ok: true,
    totals: { pages: pageRows.length, views: totalViews, applicants: totalApplicants, conv: rate(totalApplicants, totalViews) },
    pages: pageRows, byGroup, daily, recent, days,
  })
}
