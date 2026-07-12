// Ported from SUPERPLACE: GET /api/img-proxy — 외부 이미지 CORS 우회 (picsum, pexels 등)
export const onRequestGet: PagesFunction = async ({ request }) => {
  const j = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
  const url = new URL(request.url).searchParams.get('url') || ''
  if (!url) return j({ error: 'url required' }, 400)
  const ALLOWED = ['picsum.photos', 'images.pexels.com', 'images.unsplash.com', 'cdn.pixabay.com']
  let parsed: URL
  try { parsed = new URL(url) } catch { return j({ error: 'invalid url' }, 400) }
  if (!ALLOWED.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))) {
    return j({ error: 'domain not allowed' }, 403)
  }
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BYGENCY/1.0)',
        'Accept': 'image/webp,image/avif,image/jpeg,image/*,*/*;q=0.8'
      }
    })
    if (!r.ok) return j({ error: `upstream ${r.status} ${r.statusText}` }, 502)
    const buf = await r.arrayBuffer()
    if (!buf || buf.byteLength === 0) return j({ error: 'empty response' }, 502)
    const ct = r.headers.get('Content-Type') || 'image/jpeg'
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Proxied-From': parsed.hostname
      }
    })
  } catch (e: any) {
    return j({ error: 'proxy failed: ' + (e?.message || String(e)) }, 502)
  }
}
