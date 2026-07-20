// SUPERPLACE 퍼널 빌더 이식: GET/POST /api/funnels (Hono → CF Pages Functions, 우리 D1 어댑터)
import { resolveDB, getSessionUser } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 퍼널 목록 (그룹 수 + 신청자 수 집계) — 로그인 사용자 소유분만
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: true, funnels: [] })
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)
    let funnels: any[] = []
    try {
      const res = await db.prepare(`
        SELECT f.id, f.name, f.description, f.status, f.category, f.created_at, f.updated_at,
               COUNT(DISTINCT fg.id) as group_count,
               COUNT(DISTINCT fa.id) as applicant_count
        FROM funnels f
        LEFT JOIN funnel_groups fg ON fg.funnel_id = f.id
        LEFT JOIN funnel_applicants fa ON fa.landing_page_id IN (
          SELECT id FROM funnel_landing_pages WHERE group_id IN (SELECT id FROM funnel_groups WHERE funnel_id = f.id)
        )
        WHERE f.user_id = ?
        GROUP BY f.id
        ORDER BY f.created_at DESC
      `).bind(me.id).all()
      funnels = (res.results as any[]) || []
    } catch (e) { funnels = [] }
    return j({ success: true, funnels })
  } catch (err) {
    return j({ success: true, funnels: [] })
  }
}

// 퍼널 생성
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)
    const { name, description, category } = (await request.json()) as any
    if (!name) return j({ success: false, error: '퍼널 이름을 입력해주세요.' }, 400)
    const now = new Date().toISOString()
    const result = await db.prepare(`
      INSERT INTO funnels (user_id, name, description, category, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).bind(me.id, name, description || '', category || 'general', now, now).run()
    return j({ success: true, message: '퍼널이 생성되었습니다.', id: result.meta.last_row_id })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
