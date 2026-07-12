// Ported from SUPERPLACE: GET /api/audio-proxy — 외부 MP3(BGM) CORS 우회 프록시
export const onRequestGet: PagesFunction = async ({ request }) => {
  const j = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const url = new URL(request.url).searchParams.get('url')
  if (!url) return j({ error: 'url required' }, 400)
  const allowed = [
    'soundhelix.com', 'www.soundhelix.com',
    'freemusicarchive.org', 'jamendo.com',
    'incompetech.com', 'bensound.com',
    'pixabay.com', 'cdn.pixabay.com',
    'mixkit.co', 'assets.mixkit.co',
    'ccmixter.org', 'dig.ccmixter.org',
    'archive.org', 'ia800',
    'audionautix.com',
  ]
  let isAllowed = false
  try {
    const parsed = new URL(url)
    isAllowed = allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))
  } catch (e) { return j({ error: 'invalid url' }, 400) }
  if (!isAllowed) return j({ error: 'domain not allowed' }, 403)
  try {
    const reqHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible)',
      'Accept': 'audio/mpeg,audio/*,*/*',
    }
    const rangeHeader = request.headers.get('Range')
    if (rangeHeader) reqHeaders['Range'] = rangeHeader

    const resp = await fetch(url, { headers: reqHeaders })
    if (!resp.ok && resp.status !== 206) return j({ error: `upstream ${resp.status}` }, 502)

    const buf = await resp.arrayBuffer()
    const ct = resp.headers.get('content-type') || 'audio/mpeg'
    const status = resp.status === 206 ? 206 : 200
    const resHeaders: Record<string, string> = {
      'Content-Type': ct,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': String(buf.byteLength),
      'Accept-Ranges': 'bytes',
    }
    if (resp.status === 206) {
      const cr = resp.headers.get('Content-Range')
      if (cr) resHeaders['Content-Range'] = cr
    }
    return new Response(buf, { status, headers: resHeaders })
  } catch (e: any) {
    return j({ error: '외부 서비스 오류가 발생했습니다.' }, 502)
  }
}
