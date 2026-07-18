// GET /api/media/:key{.+} — R2 저장 미디어(이미지/영상/오디오) 서빙. Range 지원.
//  · ?dl=1 이면 다운로드(attachment), 아니면 인라인 미리보기.
//  · content-type 은 업로드 시 저장한 httpMetadata 를 우선 사용.
import { resolveBucket } from '../_utils'

function ctFromKey(key: string): string {
  const ext = (key.split('.').pop() || '').toLowerCase()
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', aac: 'audio/aac',
  }
  return map[ext] || 'application/octet-stream'
}

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
  const cjson = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
  try {
    const raw = (params as any).key
    const rawKey = Array.isArray(raw) ? raw.join('/') : String(raw || '')
    const key = decodeURIComponent(rawKey)
    if (!key) return cjson({ error: 'no key' }, 400)
    const R2: any = resolveBucket(env)
    if (!R2) return cjson({ error: 'R2 not configured' }, 503)

    const url = new URL(request.url)
    const dl = url.searchParams.get('dl') === '1'
    const fileBaseName = key.split('/').pop() || 'file'
    const rangeHeader = request.headers.get('Range')

    const put = (object: any, status: number, extra?: Record<string, string>) => {
      const ct = object.httpMetadata?.contentType || ctFromKey(key)
      const headers = new Headers()
      headers.set('Content-Type', ct)
      headers.set('Accept-Ranges', 'bytes')
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Cache-Control', 'private, max-age=3600')
      headers.set('Content-Disposition', (dl ? 'attachment' : 'inline') + '; filename="' + fileBaseName + '"')
      if (extra) for (const k in extra) headers.set(k, extra[k])
      return new Response(object.body, { status, headers })
    }

    if (rangeHeader) {
      try {
        const object: any = await R2.get(key, { range: rangeHeader })
        if (!object) return cjson({ error: '파일 없음' }, 404)
        const rng = object.range
        const total = object.size
        const extra: Record<string, string> = {}
        if (rng && rng.offset != null && rng.length != null && total) {
          extra['Content-Range'] = `bytes ${rng.offset}-${rng.offset + rng.length - 1}/${total}`
          extra['Content-Length'] = String(rng.length)
        }
        return put(object, 206, extra)
      } catch (_e) {
        // fall through to full-file
      }
    }

    const object: any = await R2.get(key)
    if (!object) return cjson({ error: '파일 없음' }, 404)
    const extra: Record<string, string> = {}
    if (object.size) extra['Content-Length'] = String(object.size)
    return put(object, 200, extra)
  } catch (e: any) {
    return cjson({ error: '서버 오류가 발생했습니다.' }, 500)
  }
}
