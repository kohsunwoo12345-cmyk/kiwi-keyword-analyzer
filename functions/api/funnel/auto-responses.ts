// Ported from SUPERPLACE: GET/POST /api/funnel/auto-responses (Hono → CF Pages Functions)
import { resolveDB, getSessionUser } from '../_utils'
import { ensureFunnelSchema } from './_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 자동 응답 목록
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: true, rules: [], responses: [] })
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

    let results: any[] = []

    try {
      const data = await db.prepare(`
        SELECT far.*,
          flp.title as page_title,
          fg.name as group_name
        FROM funnel_auto_responses far
        LEFT JOIN funnel_landing_pages flp ON flp.id = far.landing_page_id
        LEFT JOIN funnel_groups fg ON fg.id = far.group_id
        WHERE far.user_id = ?
        ORDER BY far.created_at DESC
      `).bind(me.id).all()

      results = (data.results as any[]) || []
    } catch (dbError) {
      console.warn('DB error, returning empty responses', dbError)
    }

    return j({ success: true, rules: results, responses: results })
  } catch (error) {
    console.error('Error fetching auto responses:', error)
    return j({ success: true, rules: [], responses: [] })
  }
}

// 자동 응답 생성
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)
    const { type, subject, content, timing, trigger, landing_page_id, group_id, sender_number } = (await request.json()) as any
    const userId = me.id

    const result = await db.prepare(`
      INSERT INTO funnel_auto_responses (
        user_id, group_id, landing_page_id, type, subject, content, timing, trigger, status, sender_number, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(userId, group_id || null, landing_page_id || null, type, subject || '', content, timing, trigger, sender_number || null, new Date().toISOString()).run()

    return j({
      success: true,
      message: '자동 응답이 설정되었습니다.',
      id: result.meta.last_row_id,
    })
  } catch (error) {
    console.error('Error creating auto response:', error)
    return j({ success: false, error: '자동 응답 설정 실패' }, 500)
  }
}
