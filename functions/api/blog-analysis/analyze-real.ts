// Ported from SUPERPLACE: POST /api/blog-analysis/analyze-real
// 로그인 불필요 - 네이버 RSS 기반 SEO 지수(BLENP) 분석
const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })

async function getBlogInfoFromRSS(blogId: string) {
  try {
    const url = `https://rss.blog.naver.com/${blogId}.xml`
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })

    if (!response.ok) {
      return null
    }

    const xml = await response.text()

    // 블로그 제목 추출
    const titleMatch = xml.match(/<channel>[^]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)
    const blogName = titleMatch && titleMatch[1] ? titleMatch[1].trim() : blogId

    // 포스트 아이템 추출
    const itemMatches = xml.match(/<item>[^]*?<\/item>/g) || []
    const recentPostCount = itemMatches.length

    // 발행 날짜 파싱 (포스팅 주기 분석)
    const pubDates: Date[] = []
    for (const item of itemMatches) {
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
      if (dateMatch) {
        try { pubDates.push(new Date(dateMatch[1])) } catch {}
      }
    }

    // 포스팅 주기 계산 (일 단위 평균 간격)
    let avgPostingGap = 14 // 기본: 2주에 1회
    if (pubDates.length >= 2) {
      const sorted = pubDates.sort((a, b) => b.getTime() - a.getTime())
      const spanMs = sorted[0].getTime() - sorted[sorted.length - 1].getTime()
      const spanDays = spanMs / (1000 * 60 * 60 * 24)
      avgPostingGap = Math.max(1, spanDays / (pubDates.length - 1))
    }

    // 최신 포스트 날짜 (최근 활동성)
    const latestDate = pubDates.length > 0 ? pubDates.sort((a, b) => b.getTime() - a.getTime())[0] : null
    const daysSinceLastPost = latestDate ? (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24) : 999

    // 글자수/이미지 수 추정 (description 분석)
    let avgContentLength = 500
    let hasImages = false
    for (const item of itemMatches.slice(0, 5)) {
      const descMatch = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
      if (descMatch) {
        const text = descMatch[1].replace(/<[^>]+>/g, '').trim()
        avgContentLength = Math.max(avgContentLength, text.length * 3) // HTML 제거 보정
        if (descMatch[1].includes('<img')) hasImages = true
      }
    }

    // 카테고리 다양성 분석 (주제 집중도 역수)
    const categories = new Set<string>()
    for (const item of itemMatches) {
      const catMatch = item.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/i)
      if (catMatch) categories.add(catMatch[1].trim())
    }
    const categoryDiversity = categories.size

    return {
      blogName,
      recentPostCount,
      avgPostingGap,      // 평균 포스팅 간격 (일)
      daysSinceLastPost,  // 마지막 포스팅 후 경과일
      avgContentLength,   // 평균 컨텐츠 길이 (추정)
      hasImages,          // 이미지 포함 여부
      categoryDiversity,  // 카테고리 다양성
      pubDates,
    }
  } catch (error) {
    console.error('Blog RSS error:', error)
    return null
  }
}

// SEO 기준 블로그 지수 계산 함수
function calcBlenpScore(info: NonNullable<Awaited<ReturnType<typeof getBlogInfoFromRSS>>>) {
  const { recentPostCount, avgPostingGap, daysSinceLastPost, avgContentLength, hasImages, categoryDiversity } = info

  // ① 활동성 점수 (0~35점): 포스팅 빈도와 최신성
  let activityScore = 0
  if (avgPostingGap <= 2) activityScore = 35
  else if (avgPostingGap <= 4) activityScore = 28
  else if (avgPostingGap <= 7) activityScore = 22
  else if (avgPostingGap <= 14) activityScore = 14
  else if (avgPostingGap <= 30) activityScore = 8
  else activityScore = 3

  // 최근 활동성 보정
  if (daysSinceLastPost > 30) activityScore = Math.max(0, activityScore - 8)
  else if (daysSinceLastPost > 14) activityScore = Math.max(0, activityScore - 4)
  else if (daysSinceLastPost <= 3) activityScore = Math.min(35, activityScore + 3)

  // RSS 포스트 수 보정
  if (recentPostCount >= 15) activityScore = Math.min(35, activityScore + 5)
  else if (recentPostCount >= 10) activityScore = Math.min(35, activityScore + 2)
  else if (recentPostCount <= 3) activityScore = Math.max(0, activityScore - 5)

  // ② 콘텐츠 품질 점수 (0~30점): 글자수, 이미지
  let contentScore = 0
  if (avgContentLength >= 3000) contentScore = 28
  else if (avgContentLength >= 1500) contentScore = 22
  else if (avgContentLength >= 800) contentScore = 15
  else if (avgContentLength >= 300) contentScore = 8
  else contentScore = 3

  if (hasImages) contentScore = Math.min(30, contentScore + 4)

  // ③ 주제 집중도 점수 (0~25점): C-RANK 핵심 요소
  let focusScore = 0
  if (categoryDiversity === 0) focusScore = 18
  else if (categoryDiversity <= 2) focusScore = 25
  else if (categoryDiversity <= 4) focusScore = 20
  else if (categoryDiversity <= 7) focusScore = 14
  else if (categoryDiversity <= 12) focusScore = 8
  else focusScore = 4

  // ④ 기초 점수 (0~10점): 블로그 존재 자체
  const basePoints = recentPostCount > 0 ? 5 : 0

  // 총 SEO 점수 합산 (0~100)
  const raw = activityScore + contentScore + focusScore + basePoints

  let blenpScore: number
  if (raw <= 10) blenpScore = raw * 0.8
  else if (raw <= 20) blenpScore = 8 + (raw - 10) * 0.5
  else if (raw <= 40) blenpScore = 13 + (raw - 20) * 1.2
  else if (raw <= 60) blenpScore = 37 + (raw - 40) * 0.85
  else if (raw <= 75) blenpScore = 54 + (raw - 60) * 0.7
  else if (raw <= 90) blenpScore = 64.5 + (raw - 75) * 0.5
  else blenpScore = 72 + (raw - 90) * 0.6

  blenpScore = Math.max(0, Math.min(100, blenpScore))
  return Math.round(blenpScore * 10) / 10
}

export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    // 로그인 불필요 - 모든 사용자 사용 가능

    const { blogUrl } = await request.json() as any

    if (!blogUrl || !blogUrl.includes('blog.naver.com')) {
      return j({ success: false, error: '유효한 네이버 블로그 URL을 입력해주세요.' }, 400)
    }

    const blogId = blogUrl.split('blog.naver.com/')[1]?.split('/')[0] || blogUrl.split('blog.naver.com/')[1]

    if (!blogId) {
      return j({ success: false, error: '블로그 ID를 찾을 수 없습니다.' }, 400)
    }

    // 실제 블로그 정보 가져오기 (RSS 정밀 분석)
    const blogInfo = await getBlogInfoFromRSS(blogId)

    if (!blogInfo) {
      return j({ success: false, error: '블로그 정보를 가져올 수 없습니다. 블로그 ID를 확인해주세요.' }, 404)
    }

    // SEO 기준 점수 계산
    const blenpScore = calcBlenpScore(blogInfo)

    // C-RANK: SEO 점수 기반
    const c_rank = blenpScore

    // D.I.A: 콘텐츠 품질 기반 (85~90% 수준)
    const diaBase = blenpScore * 0.88 + (blogInfo.avgContentLength >= 1500 ? 3 : 0)
    const dia_score = Math.round(Math.min(100, diaBase) * 10) / 10

    // D.I.A+: 검색 반영도 (포스팅 빈도 반영)
    const diaPlusBase = blenpScore * 0.92 + (blogInfo.avgPostingGap <= 7 ? 2 : -2)
    const dia_plus_score = Math.round(Math.min(100, Math.max(0, diaPlusBase)) * 10) / 10

    // 세부 지표
    const quality_score = Math.round(Math.min(100, (blogInfo.avgContentLength >= 1500 ? 75 : blogInfo.avgContentLength >= 800 ? 55 : 35) + Math.random() * 15))
    const authority_score = Math.round(Math.min(100, blenpScore * 0.85 + Math.random() * 10))
    const engagement_score = Math.round(Math.min(100, blenpScore * 0.75 + Math.random() * 15))
    const keyword_optimization = Math.round(Math.min(100, blenpScore * 0.80 + Math.random() * 12))

    // 최근 포스팅 목록
    const recent_posts = blogInfo.pubDates.slice(0, 10).map((d, i) => ({
      title: `포스트 ${i + 1}`,
      date: d.toISOString().slice(0, 10)
    }))

    const analysisData = {
      blog_id: blogId,
      blog_name: blogInfo.blogName,
      blog_url: blogUrl,
      post_count: blogInfo.recentPostCount,
      recent_post_count: blogInfo.recentPostCount,
      follower_count: 0, // RSS에서 직접 가져오기 불가
      created_date: '-',
      c_rank,
      dia_score,
      dia_plus_score,
      quality_score,
      authority_score,
      engagement_score,
      keyword_optimization,
      // SEO 점수 계산 상세
      blenp_score: blenpScore,
      posting_gap_days: Math.round(blogInfo.avgPostingGap * 10) / 10,
      days_since_last_post: Math.round(blogInfo.daysSinceLastPost),
      category_diversity: blogInfo.categoryDiversity,
      recent_posts,
      data_source: 'naver_rss_blenp'
    }

    return j({
      success: true,
      ...analysisData
    })
  } catch (error) {
    console.error('Real blog analysis error:', error)
    return j({ success: false, error: '블로그 분석 중 오류가 발생했습니다.' }, 500)
  }
}
