// Ported from SUPERPLACE: GET /api/youtube/keyword-suggestions
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })
  const apiKey = (env as any)?.YouTube_Data_API_v3
  if(!apiKey) return j({ok:false, error:'API 키 없음'})
  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''
  if(!q) return j({ok:false, error:'키워드 없음'})
  try {
    // YouTube Search Suggestion API - EUC-KR 인코딩 처리
    let suggestions: string[] = []
    try {
      const suggestResp = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}&hl=ko`
      )
      // 응답이 EUC-KR로 인코딩됨 - ArrayBuffer로 읽어서 TextDecoder 변환
      const buffer = await suggestResp.arrayBuffer()
      let suggestText = ''
      try {
        suggestText = new TextDecoder('euc-kr').decode(buffer)
      } catch(e) {
        suggestText = new TextDecoder('utf-8').decode(buffer)
      }
      // 형식: ["query", ["suggestion1", "suggestion2", ...], [], {}]
      const parsed = JSON.parse(suggestText) as any[]
      if(Array.isArray(parsed) && Array.isArray(parsed[1])) {
        suggestions = parsed[1].filter((s:any) => typeof s === 'string' && s !== q).slice(0, 15)
      }
    } catch(parseErr) {
      // fallback: YouTube API 관련 검색 title에서 추출
      try {
        const r2 = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=5&regionCode=KR&key=${apiKey}`
        )
        const d2 = await r2.json() as any
        if(d2.items) {
          const titles = d2.items.map((v:any) => v.snippet?.title || '').filter(Boolean)
          // 제목에서 단어 추출하여 연관 키워드로 사용
          const words = new Set<string>()
          titles.forEach((t:string) => {
            const parts = t.split(/[\s|,\/\-_]+/).filter((p:string) => p.length >= 2 && p.length <= 10)
            parts.forEach((p:string) => words.add(p))
          })
          suggestions = Array.from(words).slice(0, 10)
        }
      } catch(e2) {}
    }

    // 관련 영상 데이터로 실제 검색 볼륨 추정
    const videoResp = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=10&order=viewCount&regionCode=KR&key=${apiKey}`
    )
    const videoData = await videoResp.json() as any
    let videoDetails: any[] = []
    if(videoData.items && videoData.items.length > 0) {
      const ids = videoData.items.map((v:any) => v.id.videoId).filter(Boolean).join(',')
      if(ids) {
        const statsResp = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${apiKey}`
        )
        const statsData = await statsResp.json() as any
        videoDetails = (statsData.items||[]).map((v:any) => ({
          id: v.id,
          title: v.snippet?.title || '',
          channelTitle: v.snippet?.channelTitle || '',
          thumbnail: v.snippet?.thumbnails?.medium?.url || '',
          viewCount: v.statistics?.viewCount || '0',
          likeCount: v.statistics?.likeCount || '0',
          commentCount: v.statistics?.commentCount || '0',
          publishedAt: v.snippet?.publishedAt || ''
        }))
      }
    }

    return j({ok:true, suggestions, videoData: videoDetails, keyword: q})
  } catch(e:any) {
    return j({ok:false, error: '서버 오류가 발생했습니다.'||'키워드 분석 오류'})
  }
}
