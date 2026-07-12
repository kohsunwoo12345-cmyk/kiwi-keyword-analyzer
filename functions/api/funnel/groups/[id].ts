// Ported from SUPERPLACE: PUT/DELETE /api/funnel/groups/:id (Hono → CF Pages Functions)
import { resolveDB } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 퍼널 그룹 수정
export const onRequestPut: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const id = params.id as string
    const { name, description, color } = (await request.json()) as any

    await db.prepare(`
      UPDATE funnel_groups
      SET name = ?, description = ?, color = ?, updated_at = ?
      WHERE id = ?
    `).bind(name, description || '', color || '#6366f1', new Date().toISOString(), id).run()

    return j({ success: true, message: '그룹이 수정되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '그룹 수정 실패' }, 500)
  }
}

// 퍼널 그룹 삭제
export const onRequestDelete: PagesFunction = async ({ env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const id = params.id as string

    // 연결된 랜딩페이지와 신청자 데이터도 함께 삭제
    await db.prepare(`DELETE FROM funnel_applicants WHERE landing_page_id IN (SELECT id FROM funnel_landing_pages WHERE group_id = ?)`).bind(id).run()
    await db.prepare(`DELETE FROM funnel_landing_pages WHERE group_id = ?`).bind(id).run()
    await db.prepare(`DELETE FROM funnel_groups WHERE id = ?`).bind(id).run()

    return j({ success: true, message: '그룹이 삭제되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '그룹 삭제 실패' }, 500)
  }
}
