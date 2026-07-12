// Ported from SUPERPLACE: GET /api/youtube/status
export const onRequestGet: PagesFunction = async ({ env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })
  const apiKey = (env as any)?.YouTube_Data_API_v3
  if(!apiKey) return j({ok:false, error:'YouTube_Data_API_v3 환경변수가 설정되지 않았습니다'})
  try {
    const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&regionCode=KR&maxResults=1&key=${apiKey}`)
    const data = await resp.json() as any
    if(data.error) return j({ok:false, error: data.error.message||'API 오류'})
    return j({ok:true, quota: 'connected'})
  } catch(e:any) {
    return j({ok:false, error: '서버 오류가 발생했습니다.'||'연결 오류'})
  }
}
