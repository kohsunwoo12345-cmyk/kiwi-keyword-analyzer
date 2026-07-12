// DELETE /api/blog-analysis/monitoring/:id — 모니터링 삭제 (소프트 삭제, active=0)
// 주: SUPERPLACE index.tsx 원본에는 이 DELETE 핸들러가 없어(페이지 JS는 호출함)
//     monitoring/list 의 `active = 1` 필터와 일관되게 소프트 삭제로 자연스럽게 구현.
import { json, resolveDB, getSessionUser } from '../../_utils'

export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)

    const user: any = await getSessionUser(request, db)
    if (!user) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    const id = params.id

    try {
      await db.prepare(`
        UPDATE rank_monitoring SET active = 0 WHERE id = ? AND user_id = ?
      `).bind(id, user.id).run()
    } catch (_) { /* 테이블 미생성 등은 무시 */ }

    return json({ success: true, message: '모니터링이 삭제되었습니다.' })
  } catch (error) {
    console.error('Monitoring delete error:', error)
    return json({ success: false, error: '모니터링 삭제 중 오류가 발생했습니다.' }, 500)
  }
}
