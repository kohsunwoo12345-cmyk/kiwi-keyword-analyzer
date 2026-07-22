// GET /api/media/:key{.+} — R2 저장 미디어(이미지/영상/오디오) 서빙. Range 지원.
//  · ?dl=1 이면 다운로드(attachment), 아니면 인라인 미리보기.
//  · content-type 은 업로드 시 저장한 httpMetadata 를 우선 사용.
import { resolveBucket, resolveDB } from '../_utils'

function ctFromKey(key: string): string {
  const ext = (key.split('.').pop() || '').toLowerCase()
  const map: Record<string, string> = {
    // svg/html 은 의도적으로 제외 — 인라인 SVG/HTML 은 동일 출처 스크립트 실행(XSS) 위험이 있어
    // application/octet-stream 으로 강제하고 첨부(다운로드)로만 서빙한다.
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', aac: 'audio/aac',
  }
  return map[ext] || 'application/octet-stream'
}

// 활성 콘텐츠(스크립트 실행 가능) 타입인가 — 이런 타입은 절대 인라인으로 서빙하지 않는다.
function isActiveType(ct: string): boolean {
  const c = (ct || '').toLowerCase()
  return c.includes('svg') || c.includes('html') || c.includes('xml') || c.includes('javascript') || c.includes('xhtml')
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

    // D1 폴백 서빙 — R2 미설정이거나 R2 에 없을 때 media_blobs 에서 제공
    const serveFromD1 = async () => {
      const db = resolveDB(env)
      if (!db) return null
      const row: any = await db.prepare('SELECT content_type, data, size FROM media_blobs WHERE key = ?').bind(key).first().catch(() => null)
      if (!row || row.data == null) return null
      let ct = row.content_type || ctFromKey(key)
      const active = isActiveType(ct)
      if (active) ct = 'application/octet-stream'
      const headers = new Headers()
      headers.set('Content-Type', ct)
      headers.set('X-Content-Type-Options', 'nosniff')
      headers.set('Accept-Ranges', 'none')
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Cache-Control', 'private, max-age=3600')
      headers.set('Content-Disposition', (dl0 || active ? 'attachment' : 'inline') + '; filename="' + (key.split('/').pop() || 'file') + '"')
      if (active) headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
      const body = row.data // D1 BLOB → ArrayBuffer
      return new Response(body, { status: 200, headers })
    }

    const url = new URL(request.url)
    const dl0 = url.searchParams.get('dl') === '1'
    if (!R2) {
      const d1 = await serveFromD1()
      return d1 || cjson({ error: '파일 없음' }, 404)
    }

    const dl = url.searchParams.get('dl') === '1'
    const fileBaseName = key.split('/').pop() || 'file'
    const rangeHeader = request.headers.get('Range')

    const put = (object: any, status: number, extra?: Record<string, string>) => {
      let ct = object.httpMetadata?.contentType || ctFromKey(key)
      const active = isActiveType(ct)
      // 활성 콘텐츠(SVG/HTML 등)는 타입을 중화하고 강제 다운로드 + 스크립트 차단 CSP
      if (active) ct = 'application/octet-stream'
      const headers = new Headers()
      headers.set('Content-Type', ct)
      headers.set('X-Content-Type-Options', 'nosniff')
      headers.set('Accept-Ranges', 'bytes')
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Cache-Control', 'private, max-age=3600')
      // 활성 콘텐츠는 무조건 attachment, 그 외에는 ?dl=1 일 때만 attachment
      headers.set('Content-Disposition', (dl || active ? 'attachment' : 'inline') + '; filename="' + fileBaseName + '"')
      if (active) headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
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
    if (!object) { const d1 = await serveFromD1(); return d1 || cjson({ error: '파일 없음' }, 404) }
    const extra: Record<string, string> = {}
    if (object.size) extra['Content-Length'] = String(object.size)
    return put(object, 200, extra)
  } catch (e: any) {
    return cjson({ error: '서버 오류가 발생했습니다.' }, 500)
  }
}
