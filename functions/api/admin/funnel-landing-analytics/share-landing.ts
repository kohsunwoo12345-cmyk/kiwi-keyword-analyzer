import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../../_utils'
import { spFlaToken, spFlaNum } from '../_fla'

// 단일 랜딩페이지 성과 공유 링크 생성 (관리자)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return json({ success: false, error: '관리자 권한이 필요합니다.' }, 403)
  try {
    const body: any = await request.json().catch(() => ({}))
    const report = body.report || {}
    const landingPageId = String(body.landingPageId || body.pageId || body.id || '').trim()
    const pages = Array.isArray(report.pages) ? report.pages : []
    const page = pages.find((item: any) => String(item.id || '') === landingPageId || String(item.slug || '') === landingPageId)
    if (!page) return json({ success: false, error: '공유할 랜딩페이지를 찾을 수 없습니다.' }, 404)
    const pageSummary = {
      views: spFlaNum(page.views, 0), applicants: spFlaNum(page.applicants, 0), conversionRate: spFlaNum(page.conversionRate, 0),
      pageCount: 1, sourceCount: Array.isArray(page.sources) ? page.sources.length : 0,
      sentSms: spFlaNum(page.smsSent, 0), sentLms: spFlaNum(page.lmsSent, 0), smsCost: spFlaNum(page.smsCost, 0), lmsCost: spFlaNum(page.lmsCost, 0),
      messageCost: spFlaNum(page.messageCost, 0) || spFlaNum(page.smsCost, 0) + spFlaNum(page.lmsCost, 0),
    }
    const landingReport = {
      success: true, periodLabel: report.periodLabel || '', range: report.range || {}, summary: pageSummary, pages: [page],
      sources: Array.isArray(page.sources) ? page.sources : [],
      recommendations: [{ type: 'good', title: '랜딩페이지 단일 성과', body: (page.title || '랜딩페이지') + '의 유입 경로, CTA, 실제 문자 발송 비용 기준 공유 리포트입니다.' }],
    }
    const token = spFlaToken()
    await db.prepare('CREATE TABLE IF NOT EXISTS admin_shared_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT UNIQUE, type TEXT, payload_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, expires_at TEXT)').run().catch(() => {})
    await db.prepare("INSERT INTO admin_shared_reports (token, type, payload_json, created_at, expires_at) VALUES (?, ?, ?, datetime('now'), datetime('now', '+30 days'))")
      .bind(token, 'funnel_landing_report', JSON.stringify(landingReport).slice(0, 950000)).run()
    const origin = new URL(request.url).origin
    return json({ success: true, token, url: origin + '/shared/funnel-landing-report/' + token })
  } catch (e: any) {
    return json({ success: false, error: '공유 링크를 만들지 못했습니다.' }, 500)
  }
}
