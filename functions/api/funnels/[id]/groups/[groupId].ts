// SUPERPLACE 퍼널 빌더 이식: PUT/DELETE /api/funnels/:funnelId/groups/:groupId
import { resolveDB, getSessionUser } from '../../../_utils'
import { ensureFunnelSchema } from '../../../funnel/_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 그룹 수정 (캔버스 좌표/색상/유형 포함)
export const onRequestPut: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const funnelId = params.id as string
    const groupId = params.groupId as string
    const { name, description, color, group_type, sort_order, pos_x, pos_y } = (await request.json()) as any
    try {
      await db.prepare(`
        UPDATE funnel_groups SET name=?, description=?, color=?, group_type=?, sort_order=?, pos_x=?, pos_y=?, updated_at=?
        WHERE id=? AND funnel_id=?
      `).bind(name, description || '', color || '#6366f1', group_type || 'entry', sort_order || 0, pos_x || 0, pos_y || 0, new Date().toISOString(), groupId, funnelId).run()
    } catch (e) {
      await db.prepare(`
        UPDATE funnel_groups SET name=?, description=?, color=?, updated_at=?
        WHERE id=? AND funnel_id=?
      `).bind(name, description || '', color || '#6366f1', new Date().toISOString(), groupId, funnelId).run()
    }
    return j({ success: true, message: '그룹이 수정되었습니다.' })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}

// 그룹 삭제 (연결/페이지/신청자 캐스케이드)
export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const funnelId = params.id as string
    const groupId = params.groupId as string
    try { await db.prepare(`DELETE FROM funnel_group_connections WHERE funnel_id=? AND (from_group_id=? OR to_group_id=?)`).bind(funnelId, groupId, groupId).run() } catch (e) {}
    try { await db.prepare(`DELETE FROM funnel_applicants WHERE landing_page_id IN (SELECT id FROM funnel_landing_pages WHERE group_id=?)`).bind(groupId).run() } catch (e) {}
    try { await db.prepare(`DELETE FROM funnel_landing_pages WHERE group_id=?`).bind(groupId).run() } catch (e) {}
    await db.prepare(`DELETE FROM funnel_groups WHERE id=? AND funnel_id=?`).bind(groupId, funnelId).run()
    return j({ success: true, message: '그룹이 삭제되었습니다.' })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
