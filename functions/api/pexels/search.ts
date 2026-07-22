// Ported from SUPERPLACE: GET /api/pexels/search — Pexels 미디어 검색 프록시 (CORS 우회)
// 남용 방지: 로그인 세션 필수 — 우리 PEXELS_API_KEY 를 익명 스크래핑에 노출하지 않음.
import { getSessionUser, resolveDB } from '../../_utils'
function formatPexelsData(data: any, isVideo: boolean) {
  if (isVideo) {
    const videos = (data.videos || []).map((v: any) => {
      const files = (v.video_files || []).sort((a: any, b: any) => (b.width || 0) - (a.width || 0))
      const hd = files.find((f: any) => f.quality === 'hd') || files[0]
      const sd = files.find((f: any) => f.quality === 'sd') || files[0]
      return {
        type: 'video',
        id: v.id,
        thumb: v.image || (v.video_pictures && v.video_pictures[0]?.picture) || '',
        url: hd?.link || sd?.link || '',
        previewUrl: sd?.link || hd?.link || '',
        width: v.width || 1920,
        height: v.height || 1080,
        duration: v.duration || 0,
        credit: `Pexels (${v.user?.name || 'Photographer'})`
      }
    }).filter((v: any) => v.url)
    return { ok: true, items: videos, total: data.total_results || videos.length }
  } else {
    const photos = (data.photos || []).map((p: any) => ({
      type: 'image',
      id: p.id,
      thumb: p.src?.medium || p.src?.small || '',
      url: p.src?.large2x || p.src?.large || p.src?.original || '',
      width: p.width || 1920,
      height: p.height || 1080,
      credit: `Pexels (${p.photographer || 'Photographer'})`
    })).filter((p: any) => p.url)
    return { ok: true, items: photos, total: data.total_results || photos.length }
  }
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const j = (obj: any) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json; charset=utf-8' } })
  const gdb = resolveDB(env as any)
  const gme = gdb ? await getSessionUser(request, gdb) : null
  if (!gme) return j({ ok: false, items: [], total: 0, error: '로그인이 필요합니다.' })
  try {
    const sp = new URL(request.url).searchParams
    const q = sp.get('q') || 'background'
    const type = sp.get('type') || 'photos'
    const page = parseInt(sp.get('page') || '1')
    const perPage = Math.min(parseInt(sp.get('per_page') || '20'), 40)
    const orientation = sp.get('orientation') || ''
    const PEXELS_API_KEY = (typeof (env as any) === 'object' && (env as any) !== null ? ((env as any).PEXELS_API_KEY || '') : '').toString().trim()

    if (!PEXELS_API_KEY) {
      return j({ ok: false, items: [], total: 0, error: 'PEXELS_API_KEY 미설정' })
    }

    const buildUrl = (locale: boolean) => {
      const isVideo = type === 'videos'
      let url = isVideo
        ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}`
        : `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}`
      if (locale) url += '&locale=ko-KR'
      if (orientation && !isVideo) url += `&orientation=${orientation}`
      return url
    }

    const tryFetch = async (url: string) => {
      try {
        const r = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } })
        if (!r.ok) return null
        return await r.json() as any
      } catch {
        return null
      }
    }

    try {
      const isVideo = type === 'videos'
      const data = (await tryFetch(buildUrl(true))) ?? (await tryFetch(buildUrl(false)))
      if (!data) return j({ ok: false, items: [], total: 0, error: 'Pexels API 오류' })
      return j(formatPexelsData(data, isVideo))
    } catch (e: any) {
      return j({ ok: false, items: [], total: 0, error: '서버 오류: ' + (e?.message || '') })
    }
  } catch (outerErr: any) {
    return j({ ok: false, items: [], total: 0, error: 'handler 오류: ' + (outerErr?.message || String(outerErr)) })
  }
}
