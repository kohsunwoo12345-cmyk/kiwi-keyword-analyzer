// SUPERPLACE 퍼널 빌더 이식: GET/PUT/DELETE /api/funnels/:id
import { resolveDB, getSessionUser } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 퍼널 상세 (그룹 목록 + 연결 + 자동발송 규칙)
export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const id = params.id as string
    const funnel: any = await db.prepare(`SELECT * FROM funnels WHERE id = ?`).bind(id).first()
    if (!funnel) return j({ success: false, error: '퍼널을 찾을 수 없습니다.' }, 404)
    // 그룹 목록 (랜딩페이지 수 + 신청자 수 포함)
    let groups: any[] = []
    try {
      const gr = await db.prepare(`
        SELECT fg.*,
          COUNT(DISTINCT flp.id) as lp_count,
          COUNT(DISTINCT fa.id) as applicant_count
        FROM funnel_groups fg
        LEFT JOIN funnel_landing_pages flp ON flp.group_id = fg.id
        LEFT JOIN funnel_applicants fa ON fa.landing_page_id = flp.id
        WHERE fg.funnel_id = ?
        GROUP BY fg.id ORDER BY fg.sort_order ASC, fg.id ASC
      `).bind(id).all()
      groups = (gr.results as any[]) || []
    } catch (e) {}
    // 연결 목록
    let connections: any[] = []
    try {
      const cn = await db.prepare(`SELECT * FROM funnel_group_connections WHERE funnel_id = ?`).bind(id).all()
      connections = (cn.results as any[]) || []
    } catch (e) {}
    // 자동발송 규칙
    let autoSms: any[] = []
    try {
      const as = await db.prepare(`
        SELECT far.*, flp.title as page_title, fg.name as group_name
        FROM funnel_auto_responses far
        LEFT JOIN funnel_landing_pages flp ON flp.id = far.landing_page_id
        LEFT JOIN funnel_groups fg ON fg.id = far.group_id
        WHERE far.group_id IN (SELECT id FROM funnel_groups WHERE funnel_id = ?) OR far.group_id IS NULL
        ORDER BY far.created_at DESC
      `).bind(id).all()
      autoSms = (as.results as any[]) || []
    } catch (e) {}
    return j({ success: true, funnel, groups, connections, autoSms })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}

// 퍼널 수정
export const onRequestPut: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const id = params.id as string
    const { name, description, category, status } = (await request.json()) as any
    await db.prepare(`
      UPDATE funnels SET name=?, description=?, category=?, status=?, updated_at=?
      WHERE id=?
    `).bind(name, description || '', category || 'general', status || 'active', new Date().toISOString(), id).run()
    return j({ success: true, message: '퍼널이 수정되었습니다.' })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}

// 퍼널 삭제 (그룹/페이지/신청자/연결 캐스케이드)
export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const id = params.id as string
    try { await db.prepare(`DELETE FROM funnel_group_connections WHERE funnel_id=?`).bind(id).run() } catch (e) {}
    try { await db.prepare(`DELETE FROM funnel_applicants WHERE landing_page_id IN (SELECT id FROM funnel_landing_pages WHERE group_id IN (SELECT id FROM funnel_groups WHERE funnel_id=?))`).bind(id).run() } catch (e) {}
    try { await db.prepare(`DELETE FROM funnel_landing_pages WHERE group_id IN (SELECT id FROM funnel_groups WHERE funnel_id=?)`).bind(id).run() } catch (e) {}
    try { await db.prepare(`DELETE FROM funnel_groups WHERE funnel_id=?`).bind(id).run() } catch (e) {}
    await db.prepare(`DELETE FROM funnels WHERE id=?`).bind(id).run()
    return j({ success: true, message: '퍼널이 삭제되었습니다.' })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
