// SUPERPLACE 퍼널 빌더 이식: GET /api/funnel/groups/:id/landing-pages (그룹별 랜딩페이지 + 신청자 수)
import { resolveDB } from '../../../_utils'
import { ensureFunnelSchema } from '../../_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestGet: PagesFunction = async ({ env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: true, landingPages: [] })
    await ensureFunnelSchema(db)
    const groupId = params.id as string
    const { results } = await db.prepare(`
      SELECT flp.*, COUNT(fa.id) as applicant_count
      FROM funnel_landing_pages flp
      LEFT JOIN funnel_applicants fa ON flp.id = fa.landing_page_id
      WHERE flp.group_id = ?
      GROUP BY flp.id
      ORDER BY flp.created_at DESC
    `).bind(groupId).all()
    const pages = ((results as any[]) || []).map((p) => ({ ...p, url: `/f/${p.slug}` }))
    return j({ success: true, landingPages: pages })
  } catch (error) {
    return j({ success: false, error: '랜딩페이지 목록 조회 실패' }, 500)
  }
}
