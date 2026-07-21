import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'
import { ensureVisitorNoticeSchema } from '../_notices'

// 광고 성과 — 우리 랜딩페이지(/f/{slug}) 조회수·전환율 + 알림(광고) 성과.
//  GET /api/admin/ad-performance            → 랜딩 목록 성과 + 알림 광고(자동 등록) 목록
//  GET /api/admin/ad-performance?url=<랜딩URL> → 특정 랜딩 상세(일별) + 연결된 광고

// URL/입력에서 우리 랜딩 slug 추출 (/f/{slug} 또는 slug 자체)
function slugFromUrl(input: string): string {
  const s = String(input || '').trim()
  if (!s) return ''
  const m = s.match(/\/f\/([A-Za-z0-9_-]+)/)
  if (m) return m[1]
  // 순수 slug 로 입력한 경우
  if (/^[A-Za-z0-9_-]+$/.test(s)) return s
  return ''
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureFunnelSchema(db); await ensureVisitorNoticeSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const rows = async (sql: string, ...b: any[]) => ((await db.prepare(sql).bind(...b).all()).results as any[]) || []
  const one = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).first()) || {}
  const url = new URL(request.url)
  const q = url.searchParams.get('url')

  // ── 특정 랜딩 URL 상세 분석 ──
  if (q) {
    const slug = slugFromUrl(q)
    if (!slug) return json({ ok: true, found: false, reason: 'URL 형식을 인식할 수 없습니다. 예) https://bygency.co/f/… 또는 /f/…' })
    const page: any = await db.prepare('SELECT id, slug, title, created_at FROM funnel_landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
    if (!page) return json({ ok: true, found: false, reason: '우리 랜딩페이지 URL이 아닙니다(등록된 slug 없음).', slug })
    const path = '/f/' + slug
    const v: any = await one(`SELECT COUNT(*) AS views, COUNT(DISTINCT visitor) AS uniq FROM visits WHERE path = ? OR path LIKE ?`, path, path + '%')
    const c: any = await one(`SELECT COUNT(*) AS conv FROM funnel_applicants WHERE landing_page_id = ?`, page.id)
    const views = Number(v.views) || 0, conv = Number(c.conv) || 0
    // 일별(KST) 조회
    const byDayViews = await rows(
      `SELECT substr(datetime(created_at,'+9 hours'),1,10) AS d, COUNT(*) AS n, COUNT(DISTINCT visitor) AS u
       FROM visits WHERE (path = ? OR path LIKE ?) GROUP BY d ORDER BY d DESC LIMIT 60`, path, path + '%')
    const byDayConv = await rows(
      `SELECT substr(datetime(created_at,'+9 hours'),1,10) AS d, COUNT(*) AS n
       FROM funnel_applicants WHERE landing_page_id = ? GROUP BY d ORDER BY d DESC LIMIT 60`, page.id)
    const convMap: Record<string, number> = {}
    for (const r of byDayConv) convMap[r.d] = Number(r.n) || 0
    // 이 랜딩을 CTA 로 쓰는 알림(광고)
    const ads = await rows(`SELECT id, title, target, cta_url, created_at FROM notice_campaigns WHERE cta_url LIKE ?`, '%/f/' + slug + '%')
    return json({
      ok: true, found: true,
      landing: {
        slug, title: page.title || '', url: path, createdAt: page.created_at || '',
        views, uniqueVisitors: Number(v.uniq) || 0, conversions: conv,
        rate: views > 0 ? Math.round((conv / views) * 1000) / 10 : 0,
      },
      byDay: byDayViews.map((r) => ({ d: r.d, views: Number(r.n) || 0, uniq: Number(r.u) || 0, conversions: convMap[r.d] || 0 })),
      linkedAds: ads.map((a) => ({ campaignId: a.id, title: a.title, target: a.target, createdAt: a.created_at })),
    })
  }

  // ── 전체: 랜딩 성과 목록 + 알림 광고 목록 ──
  const landings = await rows('SELECT id, slug, title, created_at FROM funnel_landing_pages ORDER BY created_at DESC LIMIT 500')
  // 조회수 집계 (/f/* 경로)
  // 쿼리스트링(?…) 정규화 후 집계 → 같은 방문자의 utm 변형이 순방문자로 중복 집계되지 않게
  const vis = await rows(
    `SELECT (CASE WHEN instr(path,'?')>0 THEN substr(path,1,instr(path,'?')-1) ELSE path END) AS np,
            COUNT(*) AS n, COUNT(DISTINCT visitor) AS u
     FROM visits WHERE path LIKE '/f/%' GROUP BY np`)
  // path 정규화: /f/slug 로 매칭 (쿼리/슬래시 제거)
  const viewBySlug: Record<string, { n: number; u: number }> = {}
  for (const r of vis) {
    const mm = String(r.np).match(/^\/f\/([A-Za-z0-9_-]+)/)
    if (!mm) continue
    const s = mm[1]
    if (!viewBySlug[s]) viewBySlug[s] = { n: 0, u: 0 }
    viewBySlug[s].n += Number(r.n) || 0
    viewBySlug[s].u += Number(r.u) || 0
  }
  // 전환(신청) 집계
  const convRows = await rows('SELECT landing_page_id AS id, COUNT(*) AS n FROM funnel_applicants GROUP BY landing_page_id')
  const convMap: Record<string, number> = {}
  for (const r of convRows) convMap[String(r.id)] = Number(r.n) || 0

  const landingPerf = (landings as any[]).map((p) => {
    const vw = viewBySlug[p.slug] || { n: 0, u: 0 }
    const conv = convMap[String(p.id)] || 0
    return {
      id: p.id, slug: p.slug, title: p.title || '', url: '/f/' + p.slug, createdAt: p.created_at || '',
      views: vw.n, uniqueVisitors: vw.u, conversions: conv,
      rate: vw.n > 0 ? Math.round((conv / vw.n) * 1000) / 10 : 0,
    }
  })

  // ── 알림 광고 자동 등록: CTA URL 이 우리 랜딩(/f/{slug}) 인 알림 ──
  const adCamps = await rows(`SELECT id, title, target, cta_url, image_url, video_url, created_at FROM notice_campaigns WHERE cta_url LIKE '%/f/%' ORDER BY created_at DESC LIMIT 500`)
  // 알림 통계 맵
  const nve = await rows(`SELECT campaign_id, kind, COUNT(*) AS n FROM notice_visitor_events GROUP BY campaign_id, kind`)
  const nveMap: Record<string, { view: number; read: number; convert: number }> = {}
  for (const r of nve) {
    if (!nveMap[r.campaign_id]) nveMap[r.campaign_id] = { view: 0, read: 0, convert: 0 }
    ;(nveMap[r.campaign_id] as any)[r.kind] = Number(r.n) || 0
  }
  const rcpt = await rows(`SELECT campaign_id, COUNT(*) AS total, SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) AS reads FROM notice_receipts GROUP BY campaign_id`)
  const rcptMap: Record<string, { total: number; reads: number }> = {}
  for (const r of rcpt) rcptMap[r.campaign_id] = { total: Number(r.total) || 0, reads: Number(r.reads) || 0 }
  // slug→landing perf 조회용
  const perfBySlug: Record<string, any> = {}
  for (const lp of landingPerf) perfBySlug[lp.slug] = lp

  const ads = (adCamps as any[]).map((a) => {
    const slug = slugFromUrl(a.cta_url)
    const isVisitor = a.target === 'visitors'
    const nv = nveMap[a.id] || { view: 0, read: 0, convert: 0 }
    const rc = rcptMap[a.id] || { total: 0, reads: 0 }
    const impressions = isVisitor ? nv.view : rc.total
    const reads = isVisitor ? nv.read : rc.reads
    const clicks = isVisitor ? nv.convert : null   // 회원 알림은 CTA 클릭 별도 미측정
    const lp = slug ? perfBySlug[slug] : null
    const ctr = impressions > 0 && clicks != null ? Math.round((clicks / impressions) * 1000) / 10 : null
    return {
      campaignId: a.id, title: a.title, target: a.target, ctaUrl: a.cta_url,
      slug, landingTitle: lp ? lp.title : '', landingUrl: slug ? '/f/' + slug : '', isOurLanding: !!lp,
      impressions, reads, clicks, ctr, createdAt: a.created_at,
      landingViews: lp ? lp.views : 0, landingConversions: lp ? lp.conversions : 0, landingRate: lp ? lp.rate : 0,
    }
  })

  const totals = {
    landings: landingPerf.length,
    landingViews: landingPerf.reduce((s, l) => s + l.views, 0),
    landingConversions: landingPerf.reduce((s, l) => s + l.conversions, 0),
    ads: ads.length,
    adImpressions: ads.reduce((s, a) => s + (a.impressions || 0), 0),
    adClicks: ads.reduce((s, a) => s + (a.clicks || 0), 0),
  }

  return json({ ok: true, totals, landings: landingPerf, ads })
}
