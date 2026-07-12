// Ported from SUPERPLACE: GET /api/bgm/search — Pixabay Music 검색 프록시
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json; charset=utf-8' } })
  const sp = new URL(request.url).searchParams
  const q = sp.get('q') || 'background music'
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const per = Math.min(40, parseInt(sp.get('per_page') || '20'))
  const order = sp.get('order') || 'popular'
  const PIXABAY_API_KEY = (env as any).PIXABAY_API_KEY || ''
  if (!PIXABAY_API_KEY) return j({ ok: false, items: [], total: 0, error: 'API key not set' })

  try {
    const endpoint = `https://pixabay.com/api/` +
      `?key=${PIXABAY_API_KEY}` +
      `&q=${encodeURIComponent(q)}` +
      `&media_type=music` +
      `&per_page=${per}&page=${page}&order=${order}&safesearch=true`

    const resp = await fetch(endpoint, { headers: { 'User-Agent': 'Mozilla/5.0 BYGENCY/1.0' } })
    if (!resp.ok) return j({ ok: false, items: [], total: 0, error: `Pixabay ${resp.status}` })

    const data = await resp.json() as any
    const items = (data.hits || []).map((h: any) => ({
      id: h.id,
      title: h.tags?.split(',')[0]?.trim() || 'Track',
      artist: h.user || 'Unknown',
      duration: h.duration || 0,
      url: h.audio || h.audioURL || '',
      preview: h.webformatURL || '',
      tags: h.tags || '',
    })).filter((x: any) => x.url)

    return j({ ok: true, items, total: data.totalHits || 0 })
  } catch (e: any) {
    return j({ ok: false, items: [], total: 0, error: String(e) })
  }
}
