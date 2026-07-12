// Ported from SUPERPLACE: GET /api/blog-analysis/monitoring/list — 모니터링 목록 조회
import { json, resolveDB, getSessionUser } from '../../_utils'

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)

    const user: any = await getSessionUser(request, db)
    if (!user) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    let monitorings: any
    try {
      monitorings = await db.prepare(`
        SELECT
          rm.*,
          b.blog_url
        FROM rank_monitoring rm
        JOIN blogs b ON rm.blog_id = b.id
        WHERE rm.user_id = ? AND rm.active = 1
        ORDER BY rm.created_at DESC
      `).bind(user.id).all()
    } catch (_) {
      // 테이블 미생성 시 빈 목록
      monitorings = { results: [] }
    }

    return json({
      success: true,
      monitorings: monitorings.results || []
    })
  } catch (error) {
    console.error('Monitoring list error:', error)
    return json({ success: false, error: '모니터링 목록 조회 중 오류가 발생했습니다.' }, 500)
  }
}
