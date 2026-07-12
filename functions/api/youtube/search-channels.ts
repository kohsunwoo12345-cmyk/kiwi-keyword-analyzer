// Ported from SUPERPLACE: GET /api/youtube/search-channels
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })
  const apiKey = (env as any)?.YouTube_Data_API_v3
  if(!apiKey) return j({ok:false, error:'API 키 없음'})
  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''
  const order = url.searchParams.get('order') || 'relevance'
  if(!q) return j({ok:false, error:'검색어가 없습니다'})
  try {
    // 채널 검색
    const searchResp = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=channel&maxResults=12&order=${order}&regionCode=KR&key=${apiKey}`
    )
    const searchData = await searchResp.json() as any
    if(searchData.error) return j({ok:false, error: searchData.error.message})
    if(!searchData.items || searchData.items.length === 0) return j({ok:true, channels:[]})

    const channelIds = searchData.items.map((item:any) => item.id.channelId).join(',')
    // 채널 상세 정보
    const statsResp = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelIds}&key=${apiKey}`
    )
    const statsData = await statsResp.json() as any
    if(statsData.error) return j({ok:false, error: statsData.error.message})

    const channels = (statsData.items||[]).map((ch:any) => ({
      id: ch.id,
      title: ch.snippet?.title || '',
      description: ch.snippet?.description || '',
      thumbnail: ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url || '',
      subscriberCount: ch.statistics?.subscriberCount || '0',
      viewCount: ch.statistics?.viewCount || '0',
      videoCount: ch.statistics?.videoCount || '0',
      country: ch.snippet?.country || '',
      publishedAt: ch.snippet?.publishedAt || ''
    }))
    return j({ok:true, channels})
  } catch(e:any) {
    return j({ok:false, error: '서버 오류가 발생했습니다.'||'채널 검색 오류'})
  }
}
