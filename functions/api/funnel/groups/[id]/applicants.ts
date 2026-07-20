// SUPERPLACE 퍼널 빌더 이식: GET/DELETE /api/funnel/groups/:id/applicants
import { resolveDB, getSessionUser } from '../../../_utils'
import { ensureFunnelSchema } from '../../_schema'
import { normalizeApplicants } from '../../_applicants'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 그룹 신청자 목록
export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const groupId = params.id as string
    const group: any = await db.prepare(`SELECT id, name FROM funnel_groups WHERE id = ?`).bind(groupId).first()
    if (!group) return j({ success: false, error: '그룹을 찾을 수 없습니다.' }, 404)
    const { results } = await db.prepare(`
      SELECT fa.*, flp.title as page_title, fg.name as group_name
      FROM funnel_applicants fa
      INNER JOIN funnel_landing_pages flp ON fa.landing_page_id = flp.id
      INNER JOIN funnel_groups fg ON flp.group_id = fg.id
      WHERE flp.group_id = ?
      ORDER BY fa.created_at DESC
    `).bind(groupId).all()
    return j({ success: true, applicants: normalizeApplicants((results as any[]) || []) })
  } catch (error) {
    return j({ success: false, error: '신청자 조회 실패' }, 500)
  }
}

// 그룹 신청자 전체 삭제
export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const groupId = params.id as string
    await db.prepare(`DELETE FROM funnel_applicants WHERE landing_page_id IN (SELECT id FROM funnel_landing_pages WHERE group_id = ?)`).bind(groupId).run()
    return j({ success: true, message: '전체 삭제되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '삭제 실패' }, 500)
  }
}
