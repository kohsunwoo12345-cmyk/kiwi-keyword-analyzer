// Ported from SUPERPLACE: GET /api/blog-rank-track/list (src/index.tsx ~125632)
import { json, resolveDB } from '../_utils'
import { normalizeNaverBlogId, canonicalNaverBlogUrl } from '../blog-analysis/_naver'
import { initBrtTables, getBrtUser } from './_brt'

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
    const auth = await getBrtUser(request, db)
    if (!auth) return json({ success: false, error: '로그인 필요' }, 401)
    await initBrtTables(db)
    const tracks = await db.prepare(
      `SELECT * FROM blog_rank_tracks WHERE user_id=? AND status='active' ORDER BY created_at DESC`
    ).bind(auth.userId).all()
    const items = await Promise.all((tracks.results || []).map(async (t: any) => {
      const hist = await db.prepare(
        `SELECT rank, substr(checked_date,1,10) as date FROM blog_rank_track_history WHERE track_id=? ORDER BY checked_date DESC LIMIT 7`
      ).bind(t.id).all()
      return {
        ...t,
        blog_id: t.blog_id || normalizeNaverBlogId(t.blog_url),
        blog_url: t.blog_url || canonicalNaverBlogUrl(t.blog_id),
        history: hist.results || []
      }
    }))
    return json({ success: true, items })
  } catch (e: any) {
    return json({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
