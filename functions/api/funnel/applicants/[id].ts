// SUPERPLACE 퍼널 빌더 이식: DELETE /api/funnel/applicants/:id (단건 삭제)
import { resolveDB, getSessionUser } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'
import { ownsApplicants, forbidden } from '../_own'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const id = params.id as string
    // ⚠ 로그인만 하면 남의 신청자(이름·전화번호)를 지울 수 있었다 — 주인을 확인한다
    if (!(await ownsApplicants(db, me, [id]))) return forbidden()
    await db.prepare(`DELETE FROM funnel_applicants WHERE id = ?`).bind(id).run()
    return j({ success: true, message: '삭제되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '삭제 실패' }, 500)
  }
}
