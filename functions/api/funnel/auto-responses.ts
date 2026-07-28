// Ported from SUPERPLACE: GET/POST /api/funnel/auto-responses (Hono → CF Pages Functions)
import { resolveDB, getSessionUser } from '../_utils'
import { ensureFunnelSchema } from './_schema'
import { ownsGroup, ownsPage, forbidden } from './_own'

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
    const { type, subject, content, timing, trigger, landing_page_id, group_id, sender_number } = (((await request.json().catch(() => null)) as any) || {})
    const userId = me.id

    // ── 대상 확인 ────────────────────────────────────────────────────────────
    //  ⚠ 예전에는 group_id/landing_page_id 를 그대로 믿었다. 남의 랜딩페이지에
    //     자동응답을 붙여, 그 페이지로 들어온 신청자에게 내 문구를 보낼 수 있었다.
    //     둘 다 비워 두는 것도 막는다 — 대상이 없는 규칙은 발송 시점에
    //     "모든 페이지" 로 해석되어 전 회원의 신청자에게 나간다.
    if (!group_id && !landing_page_id)
      return j({ success: false, error: '자동응답을 적용할 그룹 또는 랜딩페이지를 지정하세요.' }, 400)
    if (landing_page_id && !(await ownsPage(db, me, landing_page_id))) return forbidden()
    if (group_id && !(await ownsGroup(db, me, group_id))) return forbidden()

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
