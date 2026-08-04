/* ══════════════════════════════════════════════════════════════════════════
   생성물을 우리 R2 로 옮긴다 — 한 군데서만.
   ──────────────────────────────────────────────────────────────────────────
   제공사가 준 결과 주소는 며칠이면 만료된다. 만든 그날은 잘 보이니 아무도 모르다가,
   나중에 노드·보관함·관리자 생성기록에서 한꺼번에 죽는다. 그래서 받아서 우리 버킷에 넣는다.

   ⚠ 여기가 예전에 조용히 실패하던 자리다.
     R2 의 put() 은 "길이를 모르는 스트림" 을 받지 않는다. 그런데 영상은 큰 파일이라
     제공사·CDN 이 content-length 없이(chunked) 내려 주는 경우가 흔하다. 그러면
     put() 이 그 자리에서 터지고, 예전 코드는 그걸 통째로 삼킨 뒤 "제공사 주소" 를
     그대로 저장했다 — 며칠 뒤 만료되는 그 주소를. 회원 눈에는 만들어 둔 영상이
     어느 날 갑자기 사라진 것으로 보인다.
     길이를 모르면 받아서 재고 넣는다. 실패하면 왜 실패했는지 남긴다(조용히 넘어가지 않는다).

   같은 일을 하던 코드가 세 군데 있었고 셋 다 같은 결함을 갖고 있었다
   (usage/record · 보관함 healToR2 · 관리자 되찾기). 하나로 합친다.
   ══════════════════════════════════════════════════════════════════════════ */
import { resolveBucket } from './_utils'

/** 길이를 아는 스트림은 이 크기까지 그대로 흘려보낸다(메모리에 안 올린다). */
const MAX_STREAM_BYTES = 200_000_000
/** 길이를 모르면 메모리에 받아야 한다 — 워커가 죽지 않을 선에서 자른다. */
const MAX_BUFFER_BYTES = 90_000_000

export type SaveResult = {
  /** 저장에 성공하면 우리 주소(/api/media/…), 아니면 물러선 원본 주소(또는 빈 값) */
  url: string
  /** 이번 호출이 실제로 R2 로 옮겼는가 */
  moved: boolean
  /** 못 옮겼으면 왜 — 화면·기록에 그대로 쓴다 */
  reason?: string
}

function ctExt(ct: string): string {
  const c = (ct || '').toLowerCase()
  if (c.includes('png')) return '.png'
  if (c.includes('webp')) return '.webp'
  if (c.includes('gif')) return '.gif'
  if (c.includes('jpeg') || c.includes('jpg')) return '.jpg'
  if (c.includes('svg')) return '.svg'
  if (c.includes('webm')) return '.webm'
  if (c.includes('quicktime') || c.includes('mov')) return '.mov'
  if (c.includes('mp4')) return '.mp4'
  if (c.includes('audio')) return '.mp3'
  return ''
}
/* 제공사가 content-type 을 엉뚱하게 주는 경우가 있어 주소의 확장자도 본다.
   확장자가 틀리면 나중에 브라우저가 영상을 못 연다(.mp4 를 .bin 으로 받으면 재생 안 됨). */
function urlExt(url: string): string {
  const m = /\.([a-z0-9]{2,5})(?:\?|#|$)/i.exec(String(url || ''))
  return m ? '.' + m[1].toLowerCase() : ''
}
const newKey = (ext: string) => 'gen/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + (ext || '')

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

/** 길이를 모르는 몸통을 상한까지만 받아 낸다. 넘으면 null — 받다 말고 멈춘다. */
async function readCapped(body: ReadableStream, cap: number): Promise<Uint8Array | null> {
  const reader = (body as any).getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      total += value.byteLength
      if (total > cap) { try { await reader.cancel() } catch { /* 이미 닫혔다 */ } return null }
      chunks.push(value)
    }
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.byteLength }
  return out
}

/**
 * 결과물 하나를 우리 R2 로 옮긴다.
 *   · data:          → 바이트로 풀어서 올린다
 *   · http(s):       → 받아서 올린다 (길이를 모르면 재고 올린다 ← 예전에 실패하던 자리)
 *   · /api/media/…   → 이미 우리 것, 그대로
 * 실패해도 던지지 않는다 — 지금 당장은 원본 주소라도 보이는 편이 아무것도 없는 것보다 낫다.
 * 다만 왜 실패했는지는 reason 으로 반드시 돌려준다(부르는 쪽이 다시 시도할지 정한다).
 */
export async function saveMediaToR2(env: any, url: string): Promise<SaveResult> {
  if (!url || typeof url !== 'string') return { url: '', moved: false, reason: '주소가 비었습니다.' }
  if (!/^(https?:|data:)/i.test(url)) return { url, moved: false }        // 이미 우리 주소(/api/media/…)

  const bucket = resolveBucket(env)
  if (!bucket) return { url: url.startsWith('data:') ? '' : url, moved: false, reason: 'R2 버킷 바인딩이 없습니다.' }

  try {
    if (url.startsWith('data:')) {
      const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(url)
      if (!m) return { url: '', moved: false, reason: 'data 주소 형식이 아닙니다.' }
      const ct = m[1] || 'application/octet-stream'
      const bytes = m[2] ? b64ToBytes(m[3]) : new TextEncoder().encode(decodeURIComponent(m[3]))
      if (bytes.byteLength > MAX_BUFFER_BYTES)
        return { url: '', moved: false, reason: `너무 큽니다(${Math.round(bytes.byteLength / 1e6)}MB).` }
      const key = newKey(ctExt(ct))
      await bucket.put(key, bytes, { httpMetadata: { contentType: ct } })
      return { url: '/api/media/' + key, moved: true }
    }

    const r = await fetch(url)
    if (!r.ok || !r.body)
      return { url, moved: false, reason: `제공사에서 받지 못했습니다(HTTP ${r.status}). 원본이 이미 만료됐을 수 있습니다.` }
    const ct = r.headers.get('content-type') || 'application/octet-stream'
    const key = newKey(ctExt(ct) || urlExt(url))
    const known = Number(r.headers.get('content-length') || 0)

    if (known > MAX_STREAM_BYTES)
      return { url, moved: false, reason: `너무 큽니다(${Math.round(known / 1e6)}MB).` }

    if (known > 0) {
      //  길이를 안다 — 메모리에 안 올리고 그대로 흘려보낸다
      await bucket.put(key, r.body, { httpMetadata: { contentType: ct } })
    } else {
      /* 길이를 모른다(chunked). put() 에 스트림을 그대로 주면 R2 가 거절한다 —
         예전 코드가 여기서 조용히 터져서 만료되는 남의 주소를 저장했다. 받아서 재고 넣는다. */
      const bytes = await readCapped(r.body as any, MAX_BUFFER_BYTES)
      if (!bytes)
        return { url, moved: false, reason: `길이를 안 알려 주는데 ${Math.round(MAX_BUFFER_BYTES / 1e6)}MB 를 넘습니다.` }
      await bucket.put(key, bytes, { httpMetadata: { contentType: ct } })
    }
    return { url: '/api/media/' + key, moved: true }
  } catch (e: any) {
    return {
      url: url.startsWith('data:') ? '' : url,
      moved: false,
      reason: '보관 중 오류: ' + String((e && e.message) || e).slice(0, 160),
    }
  }
}

/** 이미 우리 주소면 옮길 일이 없다 — 부르는 쪽에서 건너뛸 때 쓴다. */
export const isOurMedia = (u: string) => !!u && !/^(https?:|data:)/i.test(String(u))
