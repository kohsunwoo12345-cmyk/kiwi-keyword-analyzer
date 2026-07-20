// SUPERPLACE 퍼널 빌더 이식: GET /api/funnels/:funnelId/applicants (퍼널 전체 신청자)
import { resolveDB } from '../../_utils'
import { ensureFunnelSchema } from '../../funnel/_schema'
import { normalizeApplicants } from '../../funnel/_applicants'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestGet: PagesFunction = async ({ env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const funnelId = params.id as string
    const funnel = await db.prepare(`SELECT id FROM funnels WHERE id=?`).bind(funnelId).first()
    if (!funnel) return j({ success: false, error: '퍼널을 찾을 수 없습니다.' }, 404)
    const res = await db.prepare(`
      SELECT fa.*, flp.title as page_title, fg.name as group_name
      FROM funnel_applicants fa
      INNER JOIN funnel_landing_pages flp ON flp.id = fa.landing_page_id
      INNER JOIN funnel_groups fg ON fg.id = flp.group_id
      WHERE fg.funnel_id = ?
      ORDER BY fa.created_at DESC
    `).bind(funnelId).all()
    return j({ success: true, applicants: normalizeApplicants((res.results as any[]) || []) })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
