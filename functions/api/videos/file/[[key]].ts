// Ported from SUPERPLACE: GET /api/videos/file/:key{.+} — R2 영상 스트리밍 (Range 지원)
import { resolveBucket } from '../../_utils'

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
  const cjson = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const raw = params.key
    const rawKey = Array.isArray(raw) ? raw.join('/') : String(raw || '')
    const key = decodeURIComponent(rawKey)
    const R2: any = resolveBucket(env)
    if (!R2) return cjson({ error: 'R2 not configured' }, 503)

    const rangeHeader = request.headers.get('Range')
    const fileBaseName = key.split('/').pop() || 'video'
    const isWebm = fileBaseName.endsWith('.webm')
    const serveContentType = isWebm ? 'video/webm' : 'video/mp4'
    const downloadFileName = fileBaseName.replace(/\.(webm|mp4)$/, '') + (isWebm ? '.webm' : '.mp4')

    if (rangeHeader) {
      try {
        const object: any = await R2.get(key, { range: rangeHeader })
        if (!object) return cjson({ error: '파일 없음' }, 404)
        const ct = object.httpMetadata?.contentType || serveContentType
        const headers = new Headers()
        headers.set('Content-Type', ct)
        headers.set('Content-Disposition', 'inline')
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Access-Control-Allow-Origin', '*')
        const rng = object.range
        const totalSize = object.size
        if (rng && rng.offset != null && rng.length != null && totalSize) {
          headers.set('Content-Range', `bytes ${rng.offset}-${rng.offset + rng.length - 1}/${totalSize}`)
          headers.set('Content-Length', String(rng.length))
        }
        return new Response(object.body, { status: 206, headers })
      } catch (_rangeErr) {
        // Range 요청 실패 시 전체 파일 폴백
      }
    }

    const object: any = await R2.get(key)
    if (!object) return cjson({ error: '파일 없음' }, 404)
    const ct = object.httpMetadata?.contentType || serveContentType
    const headers = new Headers()
    headers.set('Content-Type', ct)
    headers.set('Content-Disposition', 'attachment; filename="' + downloadFileName + '"')
    headers.set('Cache-Control', 'private, max-age=3600')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Access-Control-Allow-Origin', '*')
    if (object.size) headers.set('Content-Length', String(object.size))
    return new Response(object.body, { headers })
  } catch (e: any) {
    return cjson({ error: '서버 오류가 발생했습니다.' }, 500)
  }
}
