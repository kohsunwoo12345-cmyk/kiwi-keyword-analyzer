// GET /api/admin/warm-models — 관리자: ControlNet 전처리 모델 파일을 상류에서 받아 R2 에 미리 적재.
//  배포 서버(엣지)에서 실행되므로 상류 접근 + R2 쓰기가 가능. 관리자가 이 URL 을 한 번 열면
//  /models 프록시가 각 파일을 받아 R2 에 캐시한다. 이후 스튜디오는 외부 접속 0 으로 동작.
//  이미 캐시된 파일은 즉시 통과(재실행 안전 · 여러 번 눌러 이어받기 가능).
import { Env, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

// 스튜디오가 실제로 요청하는 파일 목록(= /models 경로). 프록시가 상류→R2 적재를 수행.
const FILES: string[] = [
  '/models/lib/transformers',
  '/models/lib/vision',
  // Depth-Anything base (더 정밀) — 1순위
  '/models/hf/Xenova/depth-anything-base-hf/resolve/main/config.json',
  '/models/hf/Xenova/depth-anything-base-hf/resolve/main/preprocessor_config.json',
  '/models/hf/Xenova/depth-anything-base-hf/resolve/main/onnx/model_quantized.onnx',
  // Depth-Anything small — 폴백
  '/models/hf/Xenova/depth-anything-small-hf/resolve/main/config.json',
  '/models/hf/Xenova/depth-anything-small-hf/resolve/main/preprocessor_config.json',
  '/models/hf/Xenova/depth-anything-small-hf/resolve/main/onnx/model_quantized.onnx',
  // onnxruntime-web wasm (transformers.js 백엔드) — 브라우저 지원에 따라 하나가 쓰임
  '/models/ort/ort-wasm-simd-threaded.wasm',
  '/models/ort/ort-wasm-simd.wasm',
  '/models/ort/ort-wasm-threaded.wasm',
  '/models/ort/ort-wasm.wasm',
  // MediaPipe wasm
  '/models/mpv/vision_wasm_internal.wasm',
  '/models/mpv/vision_wasm_internal.js',
  '/models/mpv/vision_wasm_nosimd_internal.wasm',
  '/models/mpv/vision_wasm_nosimd_internal.js',
  // MediaPipe 모델
  '/models/mpm/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
  '/models/mpm/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
]

function esc(s: any) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c])) }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return new Response('DB 없음', { status: 500 })
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if ('error' in guard) return guard.error

  const origin = new URL(request.url).origin
  const results = await Promise.allSettled(FILES.map(async (p) => {
    const r = await fetch(origin + p, { headers: { 'x-warm': '1' } })
    const len = r.headers.get('content-length') || ''
    // 본문을 끝까지 읽어야 프록시가 R2 에 put 을 완료한다.
    const buf = await r.arrayBuffer().catch(() => null)
    return { path: p, status: r.status, ok: r.ok, bytes: buf ? buf.byteLength : (len ? Number(len) : 0) }
  }))
  const rows = results.map((x, i) => x.status === 'fulfilled' ? x.value : { path: FILES[i], status: 0, ok: false, bytes: 0, err: String((x as any).reason).slice(0, 120) })
  const okCount = rows.filter((r) => r.ok).length
  const totalMB = +(rows.reduce((s, r) => s + (r.bytes || 0), 0) / 1048576).toFixed(1)

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>모델 캐시 채우기</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;background:#0b1020;color:#e6edfb;margin:0;padding:28px;}h1{font-size:20px;margin:0 0 6px;}p{color:#9fb0d0;font-size:13px;margin:0 0 16px;}table{width:100%;border-collapse:collapse;font-size:13px;}td,th{text-align:left;padding:7px 10px;border-bottom:1px solid #22304d;}th{color:#8fa4c6;font-size:11px;}.ok{color:#5fe0a0;font-weight:700;}.no{color:#ff8a8a;font-weight:700;}.sum{margin:14px 0;padding:12px 14px;background:#111a2e;border:1px solid #22304d;border-radius:12px;font-weight:700;}a.btn{display:inline-block;margin-top:14px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;text-decoration:none;padding:9px 16px;border-radius:10px;font-weight:700;font-size:13px;}</style>
</head><body>
<h1>ControlNet 모델 캐시 채우기 (R2)</h1>
<p>각 모델 파일을 상류에서 받아 우리 R2 에 적재합니다. 이후 스튜디오는 외부 접속 없이 우리 서버에서만 모델을 로드합니다. 실패한 파일이 있으면 아래 버튼으로 다시 실행하면 이어서 채워집니다.</p>
<div class="sum">완료 ${okCount} / ${FILES.length} · 적재 ${totalMB} MB</div>
<table><thead><tr><th>파일</th><th>상태</th><th>크기</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${esc(r.path)}</td><td class="${r.ok ? 'ok' : 'no'}">${r.ok ? 'OK' : '실패 ' + esc(r.status)}</td><td>${r.bytes ? (r.bytes / 1048576).toFixed(2) + ' MB' : '-'}</td></tr>`).join('')}
</tbody></table>
<a class="btn" href="${esc(origin)}/api/admin/warm-models">다시 실행 (이어받기)</a>
</body></html>`
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
