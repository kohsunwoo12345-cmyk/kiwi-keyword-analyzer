// Ported from SUPERPLACE: GET /api/youtube/channel-detail
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })
  const apiKey = (env as any)?.YouTube_Data_API_v3
  if(!apiKey) return j({ok:false, error:'API 키 없음'})
  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''
  if(!id) return j({ok:false, error:'채널 ID가 없습니다'})
  try {
    // @ 핸들 처리
    let channelId = id
    if(id.startsWith('@') || !id.startsWith('UC')) {
      // forHandle or forUsername lookup
      const handleResp = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(id)}&key=${apiKey}`
      )
      const handleData = await handleResp.json() as any
      if(handleData.items && handleData.items.length > 0) {
        channelId = handleData.items[0].id
      } else {
        // try search
        const sResp = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(id)}&type=channel&maxResults=1&key=${apiKey}`
        )
        const sData = await sResp.json() as any
        if(sData.items && sData.items.length > 0) {
          channelId = sData.items[0].id.channelId
        }
      }
    }

    const chResp = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,brandingSettings&id=${channelId}&key=${apiKey}`
    )
    const chData = await chResp.json() as any
    if(chData.error) return j({ok:false, error: chData.error.message})
    if(!chData.items || chData.items.length === 0) return j({ok:false, error:'채널을 찾을 수 없습니다'})
    const ch = chData.items[0]
    const channel = {
      id: ch.id,
      title: ch.snippet?.title || '',
      description: ch.snippet?.description || '',
      thumbnail: ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url || '',
      subscriberCount: ch.statistics?.subscriberCount || '0',
      viewCount: ch.statistics?.viewCount || '0',
      videoCount: ch.statistics?.videoCount || '0',
      country: ch.snippet?.country || '',
      publishedAt: ch.snippet?.publishedAt || ''
    }

    // 최근 영상
    const videoSearchResp = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=40&key=${apiKey}`
    )
    const videoSearchData = await videoSearchResp.json() as any
    let recentVideos: any[] = []
    if(videoSearchData.items && videoSearchData.items.length > 0) {
      const videoIds = videoSearchData.items.map((v:any) => v.id.videoId).join(',')
      const videoStatsResp = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
      )
      const videoStatsData = await videoStatsResp.json() as any
      recentVideos = (videoStatsData.items||[]).map((v:any) => ({
        id: v.id,
        title: v.snippet?.title || '',
        thumbnail: v.snippet?.thumbnails?.medium?.url || '',
        viewCount: v.statistics?.viewCount || '0',
        likeCount: v.statistics?.likeCount || '0',
        commentCount: v.statistics?.commentCount || '0',
        publishedAt: v.snippet?.publishedAt || ''
      }))
    }
    return j({ok:true, channel, recentVideos})
  } catch(e:any) {
    return j({ok:false, error: '서버 오류가 발생했습니다.'||'채널 분석 오류'})
  }
}
