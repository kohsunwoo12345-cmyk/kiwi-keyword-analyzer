// Ported from SUPERPLACE: GET /api/bgm/search — Pixabay Music 검색 프록시
// 남용 방지: 로그인 세션 필수 — 우리 PIXABAY_API_KEY 를 익명 스크래핑에 노출하지 않음.
import { getSessionUser, resolveDB } from '../_utils'
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json; charset=utf-8' } })
  const gdb = resolveDB(env as any)
  const gme = gdb ? await getSessionUser(request, gdb) : null
  if (!gme) return j({ ok: false, items: [], total: 0, error: '로그인이 필요합니다.' })
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
