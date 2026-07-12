// Ported from SUPERPLACE: GET /api/youtube/trending
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })
  const apiKey = (env as any)?.YouTube_Data_API_v3
  if(!apiKey) return j({ok:false, error:'API 키 없음'})
  const reqUrl = new URL(request.url)
  const categoryId = reqUrl.searchParams.get('categoryId') || '0'
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&chart=mostPopular&regionCode=KR&maxResults=40&videoCategoryId=${categoryId}&key=${apiKey}`
    const resp = await fetch(url)
    const data = await resp.json() as any
    if(data.error) return j({ok:false, error: data.error.message})
    const videos = (data.items||[]).map((v:any) => ({
      id: v.id,
      title: v.snippet?.title || '',
      channelTitle: v.snippet?.channelTitle || '',
      thumbnail: v.snippet?.thumbnails?.medium?.url || '',
      viewCount: v.statistics?.viewCount || '0',
      likeCount: v.statistics?.likeCount || '0',
      commentCount: v.statistics?.commentCount || '0',
      publishedAt: v.snippet?.publishedAt || ''
    }))
    return j({ok:true, videos})
  } catch(e:any) {
    return j({ok:false, error: '서버 오류가 발생했습니다.'||'트렌드 불러오기 오류'})
  }
}
