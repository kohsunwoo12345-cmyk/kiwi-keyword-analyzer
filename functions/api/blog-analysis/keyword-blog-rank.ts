// Ported from SUPERPLACE: POST /api/blog-analysis/keyword-blog-rank (src/index.tsx ~122127)
// 키워드 검색 상위 블로그의 순위별 지수·글자수·추천단어 분석
import { json, resolveDB, getSessionUser } from '../_utils'
import { naverSearch } from '../_external'
import { crawlNaverBlogSearch, crawlNaverBlogPostContent, calcBlenpScore, spKwHintKeyword, spKwMakeNaverAdSignature, spKwAdCredentials } from './_naver'

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    const { keyword } = await request.json() as any
    if (!keyword) return json({ success: false, error: '키워드를 입력해주세요.' }, 400)

    let blogResults: any[] = []
    let totalBlogCount = 0
    let usingRealData = false
    let dataSourceType = 'html_crawl'

    // 1순위: 네이버 검색 API (display=40)
    const searchRes = await naverSearch(env, 'blog', keyword, { display: 40, sort: 'sim' })
    if (searchRes.ok && searchRes.data) {
      blogResults = searchRes.data.items || []
      totalBlogCount = searchRes.data.total || 0
      usingRealData = true
      dataSourceType = 'naver_api'
    }

    // 2순위: HTML 크롤링 (API 키 없거나 실패 시)
    if (blogResults.length === 0) {
      try {
        const crawlResult = await crawlNaverBlogSearch(keyword, 40)
        if (crawlResult.items.length > 0) {
          blogResults = crawlResult.items.map(item => ({
            title: item.title, link: item.link, description: item.description,
            bloggername: item.bloggername, bloggerlink: item.bloggerlink, postdate: item.postdate
          }))
          totalBlogCount = crawlResult.total
          usingRealData = true
          dataSourceType = 'html_crawl_real'
        }
      } catch (crawlErr) {}
    }

    // 크롤링도 실패 → 추정값
    if (blogResults.length === 0) {
      const seed = keyword.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)
      totalBlogCount = 50000 + (seed % 450000)
      dataSourceType = 'rss_fallback'
    }

    // 네이버 광고 API로 실제 검색량 (HMAC 서명)
    let realPcSearch = 0
    let realMobileSearch = 0
    let searchVolumeSource = 'estimated'
    try {
      const creds = spKwAdCredentials(env)
      if (creds.customerId && creds.apiSecret && creds.accessLicense) {
        const ts = Date.now().toString()
        const sigB64 = await spKwMakeNaverAdSignature(ts, 'GET', '/keywordstool', creds.apiSecret)
        const adRes = await fetch(`https://api.naver.com/keywordstool?hintKeywords=${encodeURIComponent(spKwHintKeyword(keyword))}&showDetail=1`, {
          headers: { 'X-Timestamp': ts, 'X-API-KEY': creds.accessLicense, 'X-Customer': creds.customerId, 'X-Signature': sigB64 }
        })
        if (adRes.ok) {
          const adData = await adRes.json() as any
          const kwItem = (adData.keywordList || []).find((k: any) => (k.relKeyword || '').toLowerCase() === keyword.toLowerCase()) || adData.keywordList?.[0]
          if (kwItem) {
            realPcSearch = kwItem.monthlyPcQcCnt || 0
            realMobileSearch = kwItem.monthlyMobileQcCnt || 0
            if (typeof realPcSearch === 'string') realPcSearch = parseInt(String(realPcSearch).replace(/[<,]/g, '')) || 0
            if (typeof realMobileSearch === 'string') realMobileSearch = parseInt(String(realMobileSearch).replace(/[<,]/g, '')) || 0
            searchVolumeSource = 'naver_ad_api'
          }
        }
      }
    } catch (adErr) {}

    // 광고 API 실패 시 블로그 문서 수 기반 추정
    if (searchVolumeSource === 'estimated') {
      const estimatedTotal = Math.round(totalBlogCount / 15)
      realPcSearch = Math.round(estimatedTotal * 0.35)
      realMobileSearch = estimatedTotal - realPcSearch
    }

    const getGradeFromScore = (score: number) => {
      if (score >= 85) return { name: '최적2~3', color: '#f59e0b', icon: '⭐⭐⭐' }
      if (score >= 78) return { name: '최적1.5', color: '#8b5cf6', icon: '⭐⭐' }
      if (score >= 72) return { name: '최적1', color: '#6366f1', icon: '⭐' }
      if (score >= 62) return { name: '준최6', color: '#3b82f6', icon: '💜' }
      if (score >= 55) return { name: '준최5.5', color: '#10b981', icon: '🟢' }
      if (score >= 33) return { name: '준최2~4', color: '#0ea5e9', icon: '🔵' }
      if (score >= 25) return { name: '준최1', color: '#eab308', icon: '🟡' }
      if (score >= 12.25) return { name: '일반', color: '#94a3b8', icon: '⚠️' }
      return { name: '저품질', color: '#ef4444', icon: '❌' }
    }

    // RSS 기반 블로그 지수 (타임아웃 4초)
    async function fetchBlogScoreFromRSS(blogId: string): Promise<{ blenp_score: number; thumbnail: string; rss_posts: number; posting_gap: number }> {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      try {
        const rssRes = await fetch(`https://rss.blog.naver.com/${blogId}.xml`, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } })
        clearTimeout(timeoutId)
        if (!rssRes.ok) return { blenp_score: 0, thumbnail: '', rss_posts: 0, posting_gap: 99 }
        const xml = await rssRes.text()
        const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || []
        const recentPostCount = itemMatches.length
        const pubDates: Date[] = []
        for (const item of itemMatches) {
          const dm = item.match(/<pubDate>(.*?)<\/pubDate>/)
          if (dm) { try { pubDates.push(new Date(dm[1])) } catch {} }
        }
        const sortedDates = pubDates.sort((a, b) => b.getTime() - a.getTime())
        let avgPostingGap = 14
        if (sortedDates.length >= 2) {
          const span = (sortedDates[0].getTime() - sortedDates[sortedDates.length - 1].getTime()) / (1000 * 60 * 60 * 24)
          avgPostingGap = Math.max(1, span / (sortedDates.length - 1))
        }
        const daysSinceLast = sortedDates.length > 0 ? (Date.now() - sortedDates[0].getTime()) / (1000 * 60 * 60 * 24) : 999
        const cats = new Set<string>()
        for (const item of itemMatches) {
          const cm = item.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/i)
          if (cm) cats.add(cm[1].trim())
        }
        let thumbnail = ''
        for (const item of itemMatches.slice(0, 3)) {
          const imgMatch = item.match(/https?:\/\/[^\s"'<>]+(?:\.jpg|\.jpeg|\.png|\.webp|blogfiles[^\s"'<>]*|postfiles[^\s"'<>]*)/i)
          if (imgMatch && imgMatch[0]) { thumbnail = imgMatch[0].replace(/&amp;/g, '&').split('?')[0]; if (thumbnail) break }
          const encMatch = item.match(/<enclosure[^>]+url="([^"]+)"/i)
          if (encMatch) { thumbnail = encMatch[1]; break }
        }
        if (!thumbnail) {
          const chImg = xml.match(/<image>[\s\S]*?<url>(.*?)<\/url>/i)
          if (chImg) thumbnail = chImg[1]
        }
        let avgContentLength = 500
        let hasImages = false
        for (const item of itemMatches.slice(0, 5)) {
          const descM = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
          if (descM) {
            const text = descM[1].replace(/<[^>]+>/g, '').trim()
            avgContentLength = Math.max(avgContentLength, text.length * 3)
            if (descM[1].includes('<img') || descM[1].includes('postfiles')) hasImages = true
          }
        }
        const blenp = calcBlenpScore({ recentPostCount, avgPostingGap, daysSinceLastPost: daysSinceLast, avgContentLength, hasImages, categoryDiversity: cats.size })
        return { blenp_score: blenp, thumbnail, rss_posts: recentPostCount, posting_gap: Math.round(avgPostingGap) }
      } catch {
        clearTimeout(timeoutId)
        return { blenp_score: 0, thumbnail: '', rss_posts: 0, posting_gap: 99 }
      }
    }

    const maxAnalyze = Math.min(blogResults.length, 20)
    const blogsToAnalyze = blogResults.slice(0, maxAnalyze)

    const analyzeSingleBlog = async (blog: any, idx: number) => {
      const rawLink = String(blog.link || '').replace(/&amp;/g, '&')
      const queryBlogId = rawLink.match(/[?&]blogId=([^&#]+)/i)?.[1]
      const pathBlogId = rawLink.match(/blog\.naver\.com\/([^\/\?&#]+)/i)?.[1]
      const bloggerLinkId = String(blog.bloggerlink || '').match(/blog\.naver\.com\/([^\/\?&#]+)/i)?.[1]
      const safeDecode = (value: string) => { try { return decodeURIComponent(value) } catch { return value } }
      const bloggerId = safeDecode(queryBlogId || (pathBlogId !== 'PostView.naver' ? pathBlogId : '') || bloggerLinkId || blog.bloggername || `blog_${idx + 1}`).replace(/[^\w.-]/g, '')
      const bloggerName = blog.bloggername || bloggerId
      const decodeSearchText = (value: string) => String(value || '')
        .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, ' ').trim()
      let title = decodeSearchText(blog.title || '')
      const description = decodeSearchText(blog.description || '')
      const dateStr = blog.postdate || ''
      const postDate = dateStr.length === 8 ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}` : dateStr || '-'

      let rssData = { blenp_score: 0, thumbnail: '', rss_posts: 0, posting_gap: 99 }
      let postContent: any = { char_count: 0, image_count: 0, keyword_count: 0, all_keywords: [], top_keywords: [], title: '', post_text: '', data_source: 'failed' }
      try {
        const [rssResult, postResult] = await Promise.all([fetchBlogScoreFromRSS(bloggerId), crawlNaverBlogPostContent(rawLink, keyword, false)])
        rssData = rssResult
        postContent = postResult
      } catch {}

      if ((!title || title.length < 2) && postContent.title) title = postContent.title
      if (!title || title.length < 2) title = `${keyword} - ${bloggerName}`

      const actualBlenp = rssData.blenp_score > 0 ? rssData.blenp_score : Math.min(65, 25 + Math.max(0, (10 - idx) * 4))
      const hasRealPostContent = postContent.data_source === 'naver_post_crawl' && postContent.char_count >= 80
      const topKeywordDetail = hasRealPostContent && postContent.top_keywords.length > 0 ? postContent.top_keywords : []
      const finalCharCount = hasRealPostContent ? postContent.char_count : 0
      const finalImageCount = hasRealPostContent ? postContent.image_count : 0
      const finalKeywordCount = hasRealPostContent ? postContent.keyword_count : 0
      const descriptionText = hasRealPostContent && postContent.post_text ? postContent.post_text.slice(0, 200) : description.slice(0, 200)
      const grade = getGradeFromScore(actualBlenp)

      return {
        rank: idx + 1, title, link: blog.link || '',
        blogger_id: bloggerId, blogger_name: bloggerName, blogger_url: `https://blog.naver.com/${bloggerId}`,
        thumbnail: rssData.thumbnail || '', blenp_score: actualBlenp,
        grade: grade.name, grade_color: grade.color, grade_icon: grade.icon,
        char_count: finalCharCount, word_count: hasRealPostContent ? Math.round(finalCharCount / 4) : 0,
        image_count: finalImageCount, photo_count: finalImageCount, keyword_count: finalKeywordCount,
        top_words: topKeywordDetail.slice(0, 8).map((item: any) => item.word),
        all_keywords: topKeywordDetail.slice(0, 50).map((item: any) => item.word),
        top_keywords_detail: topKeywordDetail.slice(0, 40),
        post_date: postDate, rss_posts: rssData.rss_posts, posting_gap: rssData.posting_gap,
        description: descriptionText,
        content_source: hasRealPostContent ? 'post_crawl_real' : 'unavailable',
        data_source: rssData.blenp_score > 0 ? 'naver_rss_real' : 'estimated',
        post_data_source: hasRealPostContent ? 'naver_post_crawl' : 'unavailable'
      }
    }

    const analyzedBlogs: any[] = []
    const batchSize = 5
    for (let i = 0; i < blogsToAnalyze.length; i += batchSize) {
      const batch = blogsToAnalyze.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map((blog: any, bIdx: number) => analyzeSingleBlog(blog, i + bIdx)))
      analyzedBlogs.push(...batchResults)
    }

    const blogCounts = totalBlogCount
    let competition = '낮음', competitionScore = 20, competitionColor = '#10b981'
    if (blogCounts > 500000) { competition = '매우 높음'; competitionScore = 95; competitionColor = '#ef4444' }
    else if (blogCounts > 200000) { competition = '높음'; competitionScore = 75; competitionColor = '#f97316' }
    else if (blogCounts > 50000) { competition = '보통'; competitionScore = 55; competitionColor = '#eab308' }
    else if (blogCounts > 10000) { competition = '낮음'; competitionScore = 35; competitionColor = '#10b981' }
    else { competition = '매우 낮음'; competitionScore = 15; competitionColor = '#06b6d4' }

    const avgBlenp = analyzedBlogs.length > 0 ? Math.round(analyzedBlogs.reduce((s: number, b: any) => s + b.blenp_score, 0) / analyzedBlogs.length) : 0
    const realContentBlogs = analyzedBlogs.filter((b: any) => b.content_source === 'post_crawl_real' && b.char_count > 0)
    const avgCharCount = realContentBlogs.length > 0 ? Math.round(realContentBlogs.reduce((s: number, b: any) => s + b.char_count, 0) / realContentBlogs.length) : 0
    const avgImageCount = realContentBlogs.length > 0 ? Math.round((realContentBlogs.reduce((s: number, b: any) => s + (b.image_count || 0), 0) / realContentBlogs.length) * 10) / 10 : 0

    const avoidSeedWords = ['광고', '협찬', '홍보', '판매', '구매', '할인', '최저가', '이벤트', '클릭', '체험단', '제공', '대가성', '추천인', 'shop', 'buy']
    const avoidSet = new Set(avoidSeedWords.map(w => w.toLowerCase()))
    const topWordFreq: Record<string, number> = {}
    realContentBlogs.forEach((b: any) => {
      ;(b.top_keywords_detail || []).forEach((item: any) => {
        const word = String(item.word || '').trim()
        if (!word || word.length < 2) return
        topWordFreq[word] = (topWordFreq[word] || 0) + (Number(item.count) || 1)
      })
    })
    const weightedWords = Object.entries(topWordFreq).sort((a: any, b: any) => b[1] - a[1])
    const sortedTopWords = weightedWords.filter(([w]) => !avoidSet.has(w.toLowerCase())).map(([w]) => w).slice(0, 24)
    const recommendedWords = [...new Set(sortedTopWords)].slice(0, 20)
    const recommendedWordDetails = weightedWords.filter(([w]) => recommendedWords.includes(w)).slice(0, 20).map(([word, count]) => ({ word, count: Number(count) || 0 }))
    const detectedAvoidWords = weightedWords.filter(([w]) => avoidSet.has(w.toLowerCase()) || /광고|협찬|판매|구매|할인|최저가|이벤트|클릭|체험단|대가성|추천인|shop|buy/i.test(w)).map(([w]) => w)
    const avoidWords = [...new Set(detectedAvoidWords)].slice(0, 12)

    const totalMonthlySearch = realPcSearch + realMobileSearch
    const realContentCount = realContentBlogs.length
    const responseDataSource = usingRealData ? (dataSourceType === 'naver_api' ? 'naver_api_real' : dataSourceType) : 'sample'

    return json({
      success: true, keyword, total_blog_count: blogCounts,
      monthly_pc_search: realPcSearch, monthly_mobile_search: realMobileSearch, total_monthly_search: totalMonthlySearch,
      competition, competition_score: competitionScore, competition_color: competitionColor,
      avg_blenp_score: avgBlenp, avg_char_count: avgCharCount, avg_image_count: avgImageCount,
      recommended_words: recommendedWords, recommended_word_details: recommendedWordDetails, avoid_words: avoidWords,
      blogs: analyzedBlogs, search_volume_source: searchVolumeSource, data_source: responseDataSource,
      content_data_source: realContentCount > 0 ? 'naver_post_crawl' : 'unavailable',
      real_content_count: realContentCount, analyzed_blog_count: analyzedBlogs.length, requested_blog_count: 20
    })
  } catch (error) {
    console.error('Keyword blog rank error:', error)
    return json({ success: false, error: '키워드 분석 중 오류가 발생했습니다.' }, 500)
  }
}
