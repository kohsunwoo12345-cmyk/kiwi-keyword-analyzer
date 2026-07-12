// Ported from SUPERPLACE: GET /api/youtube/search-videos
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })
  const apiKey = (env as any)?.YouTube_Data_API_v3
  if(!apiKey) return j({ok:false, error:'API 키 없음'})
  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''
  const order = url.searchParams.get('order') || 'relevance'
  if(!q) return j({ok:false, error:'검색어 없음'})
  try {
    const searchResp = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=40&order=${order}&regionCode=KR&key=${apiKey}`
    )
    const searchData = await searchResp.json() as any
    if(searchData.error) return j({ok:false, error: searchData.error.message})
    if(!searchData.items || searchData.items.length === 0) return j({ok:true, videos:[]})

    const videoIds = searchData.items.map((v:any) => v.id.videoId).filter(Boolean).join(',')
    if(!videoIds) return j({ok:true, videos:[]})

    const statsResp = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
    )
    const statsData = await statsResp.json() as any
    if(statsData.error) return j({ok:false, error: statsData.error.message})

    const videos = (statsData.items||[]).map((v:any) => ({
      id: v.id,
      title: v.snippet?.title || '',
      channelTitle: v.snippet?.channelTitle || '',
      channelId: v.snippet?.channelId || '',
      thumbnail: v.snippet?.thumbnails?.medium?.url || '',
      viewCount: v.statistics?.viewCount || '0',
      likeCount: v.statistics?.likeCount || '0',
      commentCount: v.statistics?.commentCount || '0',
      publishedAt: v.snippet?.publishedAt || '',
      description: v.snippet?.description || '',
      tags: (v.snippet?.tags || []).slice(0, 20)
    }))
    return j({ok:true, videos})
  } catch(e:any) {
    return j({ok:false, error: '서버 오류가 발생했습니다.'||'영상 검색 오류'})
  }
}
