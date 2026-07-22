// Ported from SUPERPLACE: GET /api/pixabay/search — Pixabay 미디어 검색 프록시
// 남용 방지: 로그인 세션 필수 — 우리 PIXABAY_API_KEY 를 익명 스크래핑에 노출하지 않음.
import { getSessionUser, resolveDB } from '../../_utils'
function formatPixabayData(data: any, isVideo: boolean) {
  if (isVideo) {
    const videos = ((data.hits || [])).map((v: any) => {
      const medium = v.videos?.medium
      const large = v.videos?.large
      const small = v.videos?.small
      const best = large?.url || medium?.url || small?.url || ''
      const preview = medium?.url || small?.url || large?.url || ''
      return {
        type: 'video',
        id: v.id,
        thumb: v.picture_id ? `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg` : '',
        url: best,
        previewUrl: preview,
        width: large?.width || medium?.width || 1920,
        height: large?.height || medium?.height || 1080,
        duration: v.duration || 0,
        credit: `Pixabay (${v.user || 'Creator'})`
      }
    }).filter((v: any) => v.url)
    return { ok: true, items: videos, total: data.totalHits || videos.length }
  } else {
    const photos = ((data.hits || [])).map((p: any) => ({
      type: 'image',
      id: p.id,
      thumb: p.webformatURL || p.previewURL || '',
      url: p.largeImageURL || p.webformatURL || '',
      width: p.imageWidth || 1920,
      height: p.imageHeight || 1080,
      credit: `Pixabay (${p.user || 'Photographer'})`
    })).filter((p: any) => p.url)
    return { ok: true, items: photos, total: data.totalHits || photos.length }
  }
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json; charset=utf-8' } })
  const gdb = resolveDB(env as any)
  const gme = gdb ? await getSessionUser(request, gdb) : null
  if (!gme) return j({ ok: false, items: [], total: 0, error: '로그인이 필요합니다.' })
  const sp = new URL(request.url).searchParams
  const q = sp.get('q') || 'background'
  const type = sp.get('type') || 'photos'
  const page = parseInt(sp.get('page') || '1')
  const perPage = Math.min(parseInt(sp.get('per_page') || '24'), 40)
  const PIXABAY_API_KEY = (env as any).PIXABAY_API_KEY || ''

  try {
    const isVideo = type === 'videos'
    const endpoint = isVideo
      ? `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}&lang=ko`
      : `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}&lang=ko&image_type=all&safesearch=true`

    const resp = await fetch(endpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0 BYGENCY/1.0' }
    })

    if (!resp.ok) {
      const endpoint2 = isVideo
        ? `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}`
        : `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}&image_type=all&safesearch=true`
      const resp2 = await fetch(endpoint2, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!resp2.ok) return j({ ok: false, items: [], total: 0, error: `Pixabay ${resp2.status}` })
      const data2 = await resp2.json() as any
      return j(formatPixabayData(data2, isVideo))
    }

    const data = await resp.json() as any
    return j(formatPixabayData(data, isVideo))
  } catch (e: any) {
    return j({ ok: false, items: [], total: 0, error: '서버 오류가 발생했습니다.' })
  }
}
