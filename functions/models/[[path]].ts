// /models/<category>/<path> — ControlNet 전처리 모델 파일을 우리 서버에서 서빙(프록시+R2 캐시).
//  외부 CDN(HuggingFace/Google/jsdelivr) 의존을 없애 브라우저에서 실제 모델이 '항상' 로드되게 한다.
//  최초 요청 시 상류에서 받아 R2 에 캐시 → 이후엔 동일 출처(우리 서버)에서 즉시 서빙.
import { resolveBucket, resolveDB } from '../api/_utils'
import { modelKey, SELFHOST_KEY, WARM_UNTIL_KEY, LAST_UPSTREAM_KEY } from './_key'

// 허용된 상류 매핑 (화이트리스트 — 임의 URL 프록시 금지). 경로 접두 방식.
const UPSTREAM: Record<string, string> = {
  hf: 'https://huggingface.co/',                                             // transformers.js 모델 가중치(Depth-Anything 등)
  // ⚠ 반드시 transformers.js 가 번들한 ORT 와 '동일 버전'의 wasm 을 써야 한다. 별도 onnxruntime-web 패키지를
  //   쓰면 ABI 불일치로 onnx 백엔드 init 실패 → 깊이 모델이 조용히 폴백된다. transformers 자체 dist 의 wasm 사용.
  ort: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/',      // transformers 번들 ORT wasm (버전 일치 보장)
  // raw ONNX(Real-ESRGAN) 용 — LIBS.ortweb 과 '같은 버전' 의 wasm. 위 ort(=1.14 계열) 를 물리면
  // JS glue 와 wasm ABI 가 어긋나 InferenceSession.create 가 조용히 실패한다. 버전을 함께 올릴 것.
  ortw: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/',
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

export const onRequestGet: PagesFunction = async (ctx) => {
  const { params, env, request } = ctx
  const raw = (params as any).path
  const parts: string[] = Array.isArray(raw) ? raw : [String(raw || '')]
  const cat = parts[0]
  const reqUrl = new URL(request.url)
  // ?probe=1 — 가중치가 실제로 존재하는지만 확인(본문 미전송). 브라우저가 없는 모델을 통째로
  //  받아보다 실패하는 낭비를 없앤다. 캐시 키가 R2 에 있으면 즉시 ok.
  const probe = reqUrl.searchParams.get('probe') === '1'
  if (probe) reqUrl.searchParams.delete('probe')
  const search = probe ? (reqUrl.searchParams.toString() ? '?' + reqUrl.searchParams.toString() : '') : (reqUrl.search || '')
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
  const key = modelKey(cat, sub, search)
  const cors = { 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' }

  const R2: any = resolveBucket(env)
  const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors }

  // 0) 존재 확인만 (?probe=1) — 캐시에 있으면 즉시, 없으면 상류 HEAD 한 번. 본문은 받지 않는다.
  if (probe) {
    if (R2) {
      try {
        const h = await R2.head(key)
        if (h) return new Response(JSON.stringify({ ok: true, cached: true, bytes: h.size || 0 }), { headers: jsonHeaders })
      } catch { /* head 미지원/미스 → 상류 확인 */ }
    }
    try {
      let r = await fetch(upstreamUrl, { method: 'HEAD', redirect: 'follow' })
      // HEAD 를 막는 상류(405/501)는 1바이트만 요청해 존재를 확인한다 — 있는 모델을 "없음" 으로 오판하지 않게.
      if (!r.ok && (r.status === 405 || r.status === 501)) {
        r = await fetch(upstreamUrl, { headers: { range: 'bytes=0-0' }, redirect: 'follow' })
        try { await r.body?.cancel() } catch { /* noop */ }
      }
      return new Response(JSON.stringify({ ok: r.ok, cached: false, status: r.status, bytes: Number(r.headers.get('content-length') || 0) }), { headers: jsonHeaders })
    } catch {
      return new Response(JSON.stringify({ ok: false, cached: false, status: 0 }), { headers: jsonHeaders })
    }
  }

  // 1) R2 캐시 우선
  if (R2) {
    try {
      const o = await R2.get(key)
      // x-model-source: 이 바이트가 어디서 왔는지 — 자체 호스팅이 실제로 유지되는지 눈으로 확인할 수 있게.
      if (o) return new Response(o.body, { headers: { 'content-type': ct, 'cache-control': 'public, max-age=31536000, immutable', 'x-model-source': 'r2', ...cors } })
    } catch { /* R2 미스는 상류로 */ }
  }
  // 2) R2 에 없음 → 외부 상류. 자체 호스팅(strict) 모드에서는 여기서 막는다.
  //    (관리자가 "모델 캐시 채우기" 를 돌리는 동안 열리는 창에서만 예외적으로 허용)
  const db: any = resolveDB(env)
  let mode = 'auto'
  if (db) {
    try {
      const row: any = await db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?)').bind(SELFHOST_KEY, WARM_UNTIL_KEY).all()
      const map: Record<string, string> = {}
      for (const r of (row?.results || []) as any[]) map[r.key] = String(r.value || '')
      mode = map[SELFHOST_KEY] === 'strict' ? 'strict' : 'auto'
      if (mode === 'strict' && Number(map[WARM_UNTIL_KEY] || 0) > Date.now()) mode = 'auto' // 적재 창
    } catch { mode = 'auto' } // 설정을 못 읽으면 기존 동작 유지(서비스 우선)
  }
  if (mode === 'strict') {
    return new Response(
      JSON.stringify({ error: 'selfhost_strict', message: '자체 호스팅 전용 모드입니다. 이 파일은 R2 에 아직 없습니다. 관리자 → 모델 캐시 채우기를 실행하세요.', path: '/' + cat + '/' + sub }),
      { status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-model-source': 'blocked', ...cors } },
    )
  }

  let up: Response
  try { up = await fetch(upstreamUrl, { cf: { cacheEverything: true, cacheTtl: 86400 } as any } as any) }
  catch { return new Response('upstream fetch failed', { status: 502, headers: cors }) }
  if (!up.ok) return new Response('upstream ' + up.status, { status: 502, headers: { ...cors, 'x-model-source': 'upstream-fail' } })
  // 외부를 탄 사실을 남긴다 — 관리자 화면에서 "아직 외부에 기대고 있는지" 를 볼 수 있게.
  if (db) {
    try { ctx.waitUntil(db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(LAST_UPSTREAM_KEY, new Date().toISOString() + ' ' + cat + '/' + sub).run()) } catch { /* 기록 실패는 무시 */ }
  }

  const clen = Number(up.headers.get('content-length') || 0)
  const STREAM_OVER = 20_000_000 // 이 크기를 넘으면 버퍼링하지 않고 흘려보낸다
  // 큰 가중치(초해상 fp32 모델 등)를 arrayBuffer 로 통째로 담으면 워커 메모리 한도에 걸린다.
  //  → 응답 스트림을 tee 해서 한쪽은 클라이언트로, 한쪽은 R2 로. 적재는 waitUntil 로 응답과 분리.
  //  R2 는 길이를 아는 스트림을 요구하므로 content-length 가 있을 때만 이 경로를 쓴다.
  if (up.body && clen > STREAM_OVER) {
    const headers = { 'content-type': ct, 'cache-control': 'public, max-age=31536000, immutable', 'x-model-source': 'upstream', ...cors }
    if (!R2) return new Response(up.body, { headers })
    const [toClient, toR2] = up.body.tee()
    try {
      const sized = toR2.pipeThrough(new (globalThis as any).FixedLengthStream(clen))
      ctx.waitUntil(R2.put(key, sized, { httpMetadata: { contentType: ct } }).catch(() => {}))
    } catch {
      try { await toR2.cancel() } catch { /* 캐시 실패는 무시 — 전달은 계속된다 */ }
    }
    return new Response(toClient, { headers })
  }
  const buf = await up.arrayBuffer()
  if (R2) { try { await R2.put(key, buf, { httpMetadata: { contentType: ct } }) } catch { /* 캐시 실패 무시 */ } }
  return new Response(buf, { headers: { 'content-type': ct, 'cache-control': 'public, max-age=31536000, immutable', 'x-model-source': 'upstream', ...cors } })
}
