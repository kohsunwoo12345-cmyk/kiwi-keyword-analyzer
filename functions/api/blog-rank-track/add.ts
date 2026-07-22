// Ported from SUPERPLACE: POST /api/blog-rank-track/add (src/index.tsx ~125658)
// 추적 등록 + 즉시 첫 순위 확인. 월 15회 제한 (admin 제외).
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

    const { blog_url, keyword } = await request.json() as any
    const blogId = normalizeNaverBlogId(blog_url)
    const normalizedBlogUrl = canonicalNaverBlogUrl(blog_url)
    const cleanKeyword = String(keyword || '').trim()
    if (!blogId || !cleanKeyword) return json({ success: false, error: '블로그 URL 또는 ID와 키워드를 입력해주세요.' }, 400)

    // 월 15회 제한 (관리자 제외)
    if (!auth.isAdmin) {
      const monthStart = new Date().toISOString().slice(0, 7) + '-01'
      const row = await db.prepare(
        `SELECT COUNT(*) as cnt FROM blog_rank_tracks WHERE user_id=? AND created_at>=? AND status='active'`
      ).bind(auth.userId, monthStart).first() as any
      if ((row?.cnt || 0) >= 15) {
        return json({ success: false, error: '⛔ 이번 달 블로그 순위 추적 한도(15회)에 도달했습니다. 다음 달에 이용 가능합니다.' }, 403)
      }
    }

    // 중복 확인
    const dup = await db.prepare(
      `SELECT id FROM blog_rank_tracks WHERE user_id=? AND (COALESCE(blog_id, '')=? OR lower(blog_url)=? OR lower(blog_url) LIKE ?) AND keyword=? AND status='active'`
    ).bind(auth.userId, blogId, normalizedBlogUrl.toLowerCase(), `%blog.naver.com/${blogId}%`, cleanKeyword).first()
    if (dup) return json({ success: false, error: '이미 동일한 블로그+키워드로 추적 중입니다.' }, 400)

    // 등록
    const ins = await db.prepare(
      `INSERT INTO blog_rank_tracks (user_id, academy_id, blog_id, blog_url, keyword, status, created_at, updated_at) VALUES (?,?,?,?,?,'active',datetime('now'),datetime('now'))`
    ).bind(auth.userId, auth.academyId, blogId, normalizedBlogUrl, cleanKeyword).run()
    const trackId = ins.meta.last_row_id
    const today = new Date().toISOString().slice(0, 10)

    // 즉시 첫 순위 확인 (실패해도 last_checked_date 는 반드시 저장)
    let rank: number | null = null
    let rankDetails: BlogRankSearchResult | null = null
    try {
      rankDetails = await findNaverBlogRankDetails(cleanKeyword, blogId, env, 100)
      rank = rankDetails.rank
    } catch (rankErr) {}

    await db.prepare(`UPDATE blog_rank_tracks SET latest_rank=?, last_checked_date=?, last_result_source=?, last_total_checked=?, updated_at=datetime('now') WHERE id=?`)
      .bind(rank, today, rankDetails?.dataSource || null, rankDetails?.totalChecked || 0, trackId).run()
    if (rank !== null) {
      await db.prepare(`DELETE FROM blog_rank_track_history WHERE track_id=? AND checked_date=?`).bind(trackId, today).run()
      await db.prepare(`INSERT INTO blog_rank_track_history (track_id, rank, checked_date) VALUES (?,?,?)`).bind(trackId, rank, today).run()
    }
    return json({ success: true, id: trackId, rank, blog_id: blogId, blog_url: normalizedBlogUrl, total_checked: rankDetails?.totalChecked || 0, data_source: rankDetails?.dataSource || 'none' })
  } catch (e: any) {
    return json({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
