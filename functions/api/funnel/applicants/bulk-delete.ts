// SUPERPLACE 퍼널 빌더 이식: DELETE /api/funnel/applicants/bulk-delete (선택 신청자 일괄 삭제)
import { resolveDB, getSessionUser } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestDelete: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const { ids } = (await request.json()) as any
    if (!Array.isArray(ids) || !ids.length) return j({ success: false, error: '삭제할 항목을 선택하세요.' }, 400)
    const placeholders = ids.map(() => '?').join(',')
    await db.prepare(`DELETE FROM funnel_applicants WHERE id IN (${placeholders})`).bind(...ids).run()
    return j({ success: true, message: '삭제되었습니다.' })
  } catch (error) {
    return j({ success: false, error: '삭제 실패' }, 500)
  }
}
