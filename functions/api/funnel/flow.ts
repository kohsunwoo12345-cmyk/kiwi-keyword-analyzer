// Ported from SUPERPLACE: POST /api/funnel/flow (Hono → CF Pages Functions)
import { resolveDB, getSessionUser } from '../_utils'
import { ensureFunnelSchema } from './_schema'
import { ownsGroup, forbidden } from './_own'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 퍼널 플로우 저장
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)
    const { steps, group_id } = (((await request.json().catch(() => null)) as any) || {})
    const userId = me.id
    // steps 가 없으면 JSON.stringify(undefined) → undefined 가 되어 DB 바인딩에서 터진다(500).
    //  잘못된 요청은 400 으로 분명히 알려 준다.
    if (!Array.isArray(steps)) return j({ success: false, error: '저장할 단계(steps) 목록이 필요합니다.' }, 400)
    // 남의 그룹에 플로우를 저장하지 못하게 한다
    if (group_id && !(await ownsGroup(db, me, group_id))) return forbidden()

    const result = await db.prepare(`
      INSERT INTO funnel_flows (
        user_id, group_id, steps_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(userId, group_id || null, JSON.stringify(steps), new Date().toISOString(), new Date().toISOString()).run()

    return j({
      success: true,
      message: '퍼널 플로우가 저장되었습니다.',
      id: result.meta.last_row_id,
    })
  } catch (error) {
    console.error('Error saving funnel flow:', error)
    return j({ success: false, error: '퍼널 플로우 저장 실패' }, 500)
  }
}
