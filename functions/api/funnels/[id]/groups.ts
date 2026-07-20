// SUPERPLACE 퍼널 빌더 이식: POST /api/funnels/:funnelId/groups (퍼널 소속 그룹 생성)
import { resolveDB, getSessionUser } from '../../_utils'
import { ensureFunnelSchema } from '../../funnel/_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestPost: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)
    const funnelId = params.id as string
    const { name, description, color, group_type, sort_order, pos_x, pos_y } = (await request.json()) as any
    if (!name) return j({ success: false, error: '그룹 이름을 입력해주세요.' }, 400)
    const funnel = await db.prepare(`SELECT id FROM funnels WHERE id=?`).bind(funnelId).first()
    if (!funnel) return j({ success: false, error: '퍼널을 찾을 수 없습니다.' }, 404)
    const now = new Date().toISOString()
    let result: any
    try {
      result = await db.prepare(`
        INSERT INTO funnel_groups (user_id, funnel_id, name, description, color, group_type, sort_order, pos_x, pos_y, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(me.id, funnelId, name, description || '', color || '#6366f1', group_type || 'entry', sort_order || 0, pos_x || 0, pos_y || 0, now, now).run()
    } catch (e) {
      result = await db.prepare(`
        INSERT INTO funnel_groups (user_id, funnel_id, name, description, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(me.id, funnelId, name, description || '', color || '#6366f1', now, now).run()
    }
    return j({ success: true, message: '그룹이 생성되었습니다.', id: result.meta.last_row_id })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
