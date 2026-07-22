// Ported from SUPERPLACE: POST /api/blog-rank-track/check-mine (src/index.tsx ~125739)
// 현재 로그인 사용자의 모든 활성 추적 항목을 즉시 재확인 (수동 호출).
import { json, resolveDB } from '../_utils'
import { normalizeNaverBlogId, canonicalNaverBlogUrl, findNaverBlogRankDetails, BlogRankSearchResult } from '../blog-analysis/_naver'
import { initBrtTables, getBrtUser } from './_brt'

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
    const auth = await getBrtUser(request, db)
    if (!auth) return json({ success: false, error: '로그인 필요' }, 401)
    await initBrtTables(db)
    const today = new Date().toISOString().slice(0, 10)
    const tracks = await db.prepare(
      `SELECT * FROM blog_rank_tracks WHERE user_id=? AND status='active' ORDER BY created_at DESC`
    ).bind(auth.userId).all()
    let updated = 0
    for (const t of (tracks.results || []) as any[]) {
      let rank: number | null = null
      let details: BlogRankSearchResult | null = null
      const blogId = t.blog_id || normalizeNaverBlogId(t.blog_url)
      try {
        details = await findNaverBlogRankDetails(t.keyword, blogId || t.blog_url, env, 100)
        rank = details.rank
      } catch {}
      await db.prepare(`UPDATE blog_rank_tracks SET blog_id=?, blog_url=?, prev_rank=latest_rank, latest_rank=?, last_checked_date=?, last_result_source=?, last_total_checked=?, updated_at=datetime('now') WHERE id=?`)
        .bind(blogId || null, blogId ? canonicalNaverBlogUrl(blogId) : t.blog_url, rank, today, details?.dataSource || null, details?.totalChecked || 0, t.id).run()
      if (rank !== null) {
        await db.prepare(`DELETE FROM blog_rank_track_history WHERE track_id=? AND checked_date=?`).bind(t.id, today).run()
        await db.prepare(`INSERT INTO blog_rank_track_history (track_id, rank, checked_date) VALUES (?,?,?)`).bind(t.id, rank, today).run()
      }
      updated++
    }
    return json({ success: true, total: (tracks.results || []).length, updated })
  } catch (e: any) {
    return json({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
