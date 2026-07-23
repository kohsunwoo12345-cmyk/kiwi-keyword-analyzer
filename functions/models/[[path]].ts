// /models/<category>/<path> — ControlNet 전처리 모델 파일을 우리 서버에서 서빙(프록시+R2 캐시).
//  외부 CDN(HuggingFace/Google/jsdelivr) 의존을 없애 브라우저에서 실제 모델이 '항상' 로드되게 한다.
//  최초 요청 시 상류에서 받아 R2 에 캐시 → 이후엔 동일 출처(우리 서버)에서 즉시 서빙.
import { resolveBucket } from '../api/_utils'

// 허용된 상류 매핑 (화이트리스트 — 임의 URL 프록시 금지)
const UPSTREAM: Record<string, string> = {
  hf: 'https://huggingface.co/',                                             // transformers.js 모델 가중치(Depth-Anything 등)
  ort: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/',          // onnxruntime-web wasm (transformers.js 백엔드)
  mpv: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/', // MediaPipe tasks-vision wasm
  mpm: 'https://storage.googleapis.com/mediapipe-models/',                   // MediaPipe 모델(.task)
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
  const sub = parts.slice(1).map((s) => encodeURIComponent(decodeURIComponent(s))).join('/')
  const base = UPSTREAM[cat]
  if (!base || !sub) return new Response('not found', { status: 404 })
  const search = new URL(request.url).search || ''
  const upstreamUrl = base + sub + search
  const ct = ctOf(sub)
  const key = 'modelcache/' + cat + '/' + sub + (search ? '_' + btoa(search).replace(/[^a-zA-Z0-9]/g, '') : '')
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
