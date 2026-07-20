// SUPERPLACE 이식: GET /api/landing/form-submissions?slug=... — 랜딩 최근 신청자 목록
//  퍼널 랜딩페이지면 funnel_applicants, 아니면 form_submissions 조회.
import { resolveDB, ensureSchema } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'
import { normalizeApplicants } from '../funnel/_applicants'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env as any)
    if (!db) return j({ success: true, submissions: [] })
    await ensureSchema(db)
    await ensureFunnelSchema(db)
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')
    const limit = parseInt(url.searchParams.get('limit') || '500')
    if (!slug) return j({ success: true, submissions: [] })

    // 1) 퍼널 랜딩페이지
    const fp: any = await db.prepare('SELECT id FROM funnel_landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
    if (fp) {
      const { results } = await db.prepare(`
        SELECT fa.* FROM funnel_applicants fa WHERE fa.landing_page_id = ? ORDER BY fa.created_at DESC LIMIT ?
      `).bind(fp.id, limit).all()
      return j({ success: true, submissions: normalizeApplicants((results as any[]) || []) })
    }

    // 2) 일반 landing_pages → form_submissions
    const page: any = await db.prepare('SELECT id FROM landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
    if (!page) return j({ success: true, submissions: [] })
    const { results } = await db.prepare(`
      SELECT id, name, phone, email, additional_data, created_at, landing_slug, landing_title
      FROM form_submissions WHERE landing_page_id = ? ORDER BY created_at DESC LIMIT ?
    `).bind(page.id, limit).all().catch(() => ({ results: [] }))
    const submissions = ((results as any[]) || []).map((r: any) => {
      let extra: any = {}
      try { extra = JSON.parse(r.additional_data || '{}') } catch (e) {}
      const createdAtUtc = r.created_at ? String(r.created_at).replace(' ', 'T').replace(/Z?$/, 'Z') : r.created_at
      return { ...r, created_at: createdAtUtc, grade: extra.grade || null, message: extra.message || null }
    })
    return j({ success: true, submissions })
  } catch (err) {
    return j({ success: true, submissions: [] })
  }
}
