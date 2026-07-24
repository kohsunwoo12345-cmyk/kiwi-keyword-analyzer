// /models/<category>/<path> — ControlNet 전처리 모델 파일을 우리 서버에서 서빙(프록시+R2 캐시).
//  외부 CDN(HuggingFace/Google/jsdelivr) 의존을 없애 브라우저에서 실제 모델이 '항상' 로드되게 한다.
//  최초 요청 시 상류에서 받아 R2 에 캐시 → 이후엔 동일 출처(우리 서버)에서 즉시 서빙.
import { resolveBucket } from '../api/_utils'

// 허용된 상류 매핑 (화이트리스트 — 임의 URL 프록시 금지). 경로 접두 방식.
const UPSTREAM: Record<string, string> = {
  hf: 'https://huggingface.co/',                                             // transformers.js 모델 가중치(Depth-Anything 등)
  // ⚠ 반드시 transformers.js 가 번들한 ORT 와 '동일 버전'의 wasm 을 써야 한다. 별도 onnxruntime-web 패키지를
  //   쓰면 ABI 불일치로 onnx 백엔드 init 실패 → 깊이 모델이 조용히 폴백된다. transformers 자체 dist 의 wasm 사용.
  ort: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/',      // transformers 번들 ORT wasm (버전 일치 보장)
  mpv: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/', // MediaPipe tasks-vision wasm
  mpm: 'https://storage.googleapis.com/mediapipe-models/',                   // MediaPipe 모델(.task)
}
// 라이브러리(JS ESM) 단일 파일 매핑 — 브라우저가 우리 서버에서만 import 하도록.
const LIBS: Record<string, string> = {
  transformers: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm', // 자체 완결 ESM 번들
  vision: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
  ortweb: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/+esm',            // Real-ESRGAN 등 raw ONNX 실행용 (wasm 은 /models/ort 와 버전 일치)
}

function ctOf(p: string): string {
  const e = (p.split('.').pop() || '').toLowerCase().split('?')[0]
  const m: Record<string, string> = {
    onnx: 'application/octet-stream', bin: 'application/octet-stream', task: 'application/octet-stream',
    wasm: 'application/wasm', json: 'application/json', txt: 'text/plain',
    js: 'text/javascript', mjs: 'text/javascript', data: 'application/octet-stream',
  }
  return m[e] || 'application/octet-stream'
}

export const onRequestGet: PagesFunction = async ({ params, env, request }) => {
  const raw = (params as any).path
  const parts: string[] = Array.isArray(raw) ? raw : [String(raw || '')]
  const cat = parts[0]
  const search = new URL(request.url).search || ''
  let upstreamUrl: string, ct: string, sub: string
  if (cat === 'lib') {
    // 라이브러리 ESM — 브라우저 import() 용. content-type 을 JS 로 강제.
    const name = parts[1] || ''
    const u = LIBS[name]
    if (!u) return new Response('not found', { status: 404 })
    upstreamUrl = u
    ct = 'text/javascript'
    sub = 'lib/' + name
  } else {
    sub = parts.slice(1).map((s) => encodeURIComponent(decodeURIComponent(s))).join('/')
    const base = UPSTREAM[cat]
    if (!base || !sub) return new Response('not found', { status: 404 })
    upstreamUrl = base + sub + search
    ct = ctOf(sub)
  }
  // 카테고리별 캐시 버전 — 상류 URL을 바꾼 카테고리는 버전을 올려 옛(잘못된) R2 캐시를 무효화한다.
  //  ort: onnxruntime-web@1.14.0 → transformers 자체 dist wasm 으로 교체(v2). 기존 잘못된 wasm 재적재 강제.
  const CACHE_VER: Record<string, string> = { ort: 'v2' }
  const key = 'modelcache/' + cat + (CACHE_VER[cat] ? '@' + CACHE_VER[cat] : '') + '/' + sub + (search ? '_' + btoa(search).replace(/[^a-zA-Z0-9]/g, '') : '')
  const cors = { 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' }

  const R2: any = resolveBucket(env)
  // 1) R2 캐시 우선
  if (R2) {
    try {
      const o = await R2.get(key)
      if (o) return new Response(o.body, { headers: { 'content-type': ct, 'cache-control': 'public, max-age=31536000, immutable', ...cors } })
    } catch { /* R2 미스는 상류로 */ }
  }
  // 2) 상류에서 받아 캐시
  let up: Response
  try { up = await fetch(upstreamUrl, { cf: { cacheEverything: true, cacheTtl: 86400 } as any } as any) }
  catch { return new Response('upstream fetch failed', { status: 502, headers: cors }) }
  if (!up.ok) return new Response('upstream ' + up.status, { status: 502, headers: cors })
  const buf = await up.arrayBuffer()
  if (R2) { try { await R2.put(key, buf, { httpMetadata: { contentType: ct } }) } catch { /* 캐시 실패 무시 */ } }
  return new Response(buf, { headers: { 'content-type': ct, 'cache-control': 'public, max-age=31536000, immutable', ...cors } })
}
