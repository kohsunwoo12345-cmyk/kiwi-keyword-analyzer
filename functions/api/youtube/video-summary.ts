// Ported from SUPERPLACE: GET /api/youtube/video-summary
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })
  const apiKey = (env as any)?.YouTube_Data_API_v3
  if(!apiKey) return j({ok:false, error:'API 키 없음'})
  const reqUrl = new URL(request.url)
  const videoId = reqUrl.searchParams.get('id') || ''
  if(!videoId) return j({ok:false, error:'영상 ID 없음'})
  try {
    const resp = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    )
    const data = await resp.json() as any
    if(!data.items || data.items.length === 0) return j({ok:false, error:'영상 없음'})
    const v = data.items[0].snippet
    const title = v.title || ''
    const desc = (v.description || '').slice(0, 800)
    const tags = (v.tags || []).slice(0, 10).join(', ')
    // 설명 기반 핵심 내용 추출
    const lines = desc.split('\n').filter((l:string) => l.trim().length > 10).slice(0, 5)
    const summary = lines.length > 0
      ? lines.join(' / ')
      : (desc.length > 20 ? desc.slice(0, 200) : '설명 없음')
    return j({ok:true, videoId, title, summary, tags, description: desc})
  } catch(e:any) {
    return j({ok:false, error: '서버 오류가 발생했습니다.'})
  }
}
