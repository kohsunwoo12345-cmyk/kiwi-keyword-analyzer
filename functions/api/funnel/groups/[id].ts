// Ported from SUPERPLACE: PUT/DELETE /api/funnel/groups/:id (Hono → CF Pages Functions)
import { resolveDB, getSessionUser } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'
import { ownsGroup, forbidden } from '../_own'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 퍼널 그룹 수정
export const onRequestPut: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    // ⚠ 이 경로에는 인증이 아예 없었다. id 만 넣으면 누구든 남의 그룹을 고칠 수 있었다.
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const id = params.id as string
    if (!(await ownsGroup(db, me, id))) return forbidden()
    const { name, description, color } = (((await request.json().catch(() => null)) as any) || {})

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
export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    // ⚠ 인증도 소유권 확인도 없었다. 그룹을 지우면 랜딩페이지와 신청자(이름·전화번호)까지
    //   통째로 지워지는데, 로그인조차 필요 없는 상태였다.
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const id = params.id as string
    if (!(await ownsGroup(db, me, id))) return forbidden()

    // 연결된 랜딩페이지와 신청자 데이터도 함께 삭제
    await db.prepare(`DELETE FROM funnel_applicants WHERE landing_page_id IN (SELECT id FROM funnel_landing_pages WHERE group_id = ?)`).bind(id).run()
    await db.prepare(`DELETE FROM funnel_landing_pages WHERE group_id = ?`).bind(id).run()
    await db.prepare(`DELETE FROM funnel_groups WHERE id = ?`).bind(id).run()

    return j({ success: true, message: '그룹이 삭제되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '그룹 삭제 실패' }, 500)
  }
}
