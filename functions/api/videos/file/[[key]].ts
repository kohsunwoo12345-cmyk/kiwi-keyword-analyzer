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
        /* R2 의 range 옵션은 {offset,length,suffix} 또는 Headers 만 받는다.
           "bytes=0-1023" 같은 문자열을 그냥 넘기면 구간으로 해석되지 않아
           예외가 나거나 전체 파일이 나갔다 — 타임라인을 끌 때마다 영상을 통째로
           다시 받는 셈이었다. 요청 헤더를 그대로 넘겨 R2 가 해석하게 한다. */
        const object: any = await R2.get(key, { range: request.headers })
        if (!object) return cjson({ error: '파일 없음' }, 404)
        const ct = object.httpMetadata?.contentType || serveContentType
        const headers = new Headers()
        headers.set('Content-Type', ct)
        headers.set('Content-Disposition', 'inline')
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Access-Control-Allow-Origin', '*')
        const rng = object.range
        const totalSize = object.size
        /* 구간 정보가 없는데 206 을 주면 Content-Range 없는 부분 응답이 된다 —
           규격 위반이라 브라우저가 재생을 포기한다. 그럴 땐 정직하게 200 이다. */
        if (!rng || rng.offset == null || rng.length == null || !totalSize) {
          if (totalSize) headers.set('Content-Length', String(totalSize))
          return new Response(object.body, { status: 200, headers })
        }
        headers.set('Content-Range', `bytes ${rng.offset}-${rng.offset + rng.length - 1}/${totalSize}`)
        headers.set('Content-Length', String(rng.length))
        return new Response(object.body, { status: 206, headers })
      } catch (_rangeErr) {
        // Range 를 해석할 수 없을 때만 전체 파일 폴백
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
