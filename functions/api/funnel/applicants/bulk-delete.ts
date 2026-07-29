// SUPERPLACE 퍼널 빌더 이식: DELETE /api/funnel/applicants/bulk-delete (선택 신청자 일괄 삭제)
import { resolveDB, getSessionUser, asIdList } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'
import { ownsApplicants, forbidden } from '../_own'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestDelete: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const body = (((await request.json().catch(() => null)) as any) || {})
    if (Array.isArray(body.ids) && body.ids.length > 1000) return j({ success: false, error: '한 번에 최대 1,000건까지 삭제할 수 있습니다.' }, 400)
    // 객체·배열이 섞여 오면 D1 바인딩에서 그대로 터진다(500) — 스칼라만 남긴다
    const ids = asIdList(body.ids, 1000)
    if (!ids.length) return j({ success: false, error: '삭제할 항목을 선택하세요.' }, 400)
    // 하나라도 남의 것이면 통째로 거절한다 — 일부만 지우면 뒷수습이 불가능하다
    if (!(await ownsApplicants(db, me, ids))) return forbidden()
    const placeholders = ids.map(() => '?').join(',')
    await db.prepare(`DELETE FROM funnel_applicants WHERE id IN (${placeholders})`).bind(...ids).run()
    return j({ success: true, message: '삭제되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '삭제 실패' }, 500)
  }
}
