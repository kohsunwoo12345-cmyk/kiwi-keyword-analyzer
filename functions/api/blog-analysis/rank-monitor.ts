// Ported from SUPERPLACE: POST /api/blog-analysis/rank-monitor (src/index.tsx ~122532)
// 특정 키워드로 내 블로그가 몇 번째 순위에 있는지 실제 확인
import { json, resolveDB, getSessionUser } from '../_utils'
import { normalizeNaverBlogId, findNaverBlogRankDetails, calcBlenpScore } from './_naver'

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    const { keyword, blogId } = await request.json() as any
    if (!keyword || !blogId) return json({ success: false, error: '키워드와 블로그 ID를 모두 입력해주세요.' }, 400)

    const cleanBlogId = normalizeNaverBlogId(blogId)
    if (!cleanBlogId) return json({ success: false, error: '유효한 블로그 ID가 필요합니다.' }, 400)

    const rankDetails = await findNaverBlogRankDetails(keyword, cleanBlogId, env, 100)
    const blogs = rankDetails.topBlogs || []
    const totalCount = rankDetails.totalBlogCount || 0
    const dataSource = rankDetails.dataSource
    const myRank = rankDetails.rank || 0
    const myBlog = blogs.find((blog: any) => normalizeNaverBlogId(blog.blogger_id || blog.link) === cleanBlogId) || null

    // 블로그 지수도 함께 (RSS)
    let blenpScore = 0
    try {
      const rssRes = await fetch(`https://rss.blog.naver.com/${cleanBlogId}.xml`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } })
      if (rssRes.ok) {
        const xml = await rssRes.text()
        const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || []
        const pubDates: Date[] = []
        for (const item of itemMatches) {
          const dm = item.match(/<pubDate>(.*?)<\/pubDate>/)
          if (dm) { try { pubDates.push(new Date(dm[1])) } catch {} }
        }
        const sortedDates = pubDates.sort((a, b) => b.getTime() - a.getTime())
        let avgGap = 14
        if (sortedDates.length >= 2) {
          const span = (sortedDates[0].getTime() - sortedDates[sortedDates.length - 1].getTime()) / (1000 * 60 * 60 * 24)
          avgGap = Math.max(1, span / (sortedDates.length - 1))
        }
        const daysSinceLast = sortedDates.length > 0 ? (Date.now() - sortedDates[0].getTime()) / (1000 * 60 * 60 * 24) : 999
        const cats = new Set<string>()
        for (const item of itemMatches) {
          const cm = item.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/i)
          if (cm) cats.add(cm[1].trim())
        }
        let avgLen = 500
        for (const item of itemMatches.slice(0, 5)) {
          const dm = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
          if (dm) avgLen = Math.max(avgLen, dm[1].replace(/<[^>]+>/g, '').length * 3)
        }
        blenpScore = calcBlenpScore({ recentPostCount: itemMatches.length, avgPostingGap: avgGap, daysSinceLastPost: daysSinceLast, avgContentLength: avgLen, hasImages: false, categoryDiversity: cats.size })
      }
    } catch {}

    return json({
      success: true, keyword, blog_id: cleanBlogId, rank: myRank, found: rankDetails.found,
      blenp_score: blenpScore, my_blog_info: myBlog, top_blogs: blogs.slice(0, 20),
      total_blog_count: totalCount, total_checked: rankDetails.totalChecked, data_source: dataSource,
      message: myRank > 0
        ? `"${keyword}" 검색에서 ${cleanBlogId} 블로그가 ${myRank}위에 있습니다.`
        : `"${keyword}" 검색 상위 ${rankDetails.totalChecked}개 실제 결과에서 ${cleanBlogId} 블로그를 찾지 못했습니다.`
    })
  } catch (error) {
    console.error('Rank monitor error:', error)
    return json({ success: false, error: '순위 확인 중 오류가 발생했습니다.' }, 500)
  }
}
