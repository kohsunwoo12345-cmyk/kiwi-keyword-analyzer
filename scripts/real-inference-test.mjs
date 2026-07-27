// "진짜 초해상이 도는가" 를 모형 없이 증명한다.
//  · 런타임: 실제 onnxruntime-web(우리가 /models/ortw 로 서빙하기로 한 그 버전)을 그대로 쓴다.
//  · 모델: 실제 ONNX 파일(scripts/fixtures/tiny-sr-x2.onnx — ConvTranspose+Conv 2배 초해상).
//  · 코드: 스튜디오의 진짜 함수(ensureOrt → InferenceSession → _esrRunTile → 타일 합성)를 그대로 실행.
//  즉 학습된 가중치만 다를 뿐, 브라우저에서 신경망 추론이 실제로 수행되는지를 끝까지 확인한다.
//  실행:  npm i -D playwright-core onnxruntime-web@1.17.1 esbuild && node scripts/real-inference-test.mjs
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ORT_DIR = path.resolve('node_modules/onnxruntime-web/dist')
const MODEL = path.resolve('scripts/fixtures/tiny-sr-x2.onnx')
if (!fs.existsSync(ORT_DIR) || !fs.existsSync(MODEL)) {
  console.error('준비물 없음: npm i -D onnxruntime-web@1.17.1 esbuild · scripts/fixtures/tiny-sr-x2.onnx')
  process.exit(2)
}
// onnxruntime-web 을 ESM 으로 번들 — 배포에서 /models/lib/ortweb 이 제공하는 형태와 같다.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ortesm-'))
const ORT_ESM = path.join(tmp, 'ortweb.mjs')
execFileSync('npx', ['esbuild', 'onnxruntime-web', '--bundle', '--format=esm', '--platform=browser', '--outfile=' + ORT_ESM, '--log-level=error'], { stdio: 'inherit' })

const PUB = path.resolve('public')
const CT = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' }
// 스튜디오가 첫 번째로 찾는 Real-ESRGAN 후보 경로에 우리 실제 ONNX 모델을 놓는다.
const ESRGAN_PATH = '/models/hf/onnx-community/real-esrgan-x4plus/resolve/main/onnx/model.onnx'

let BREAK_WASM = false
const server = http.createServer((req, res) => {
 try {
  const u = new URL(req.url, 'http://x'); const p = u.pathname
  if (process.env.DEBUG_REQ) console.log('  req', p)
  const send = (code, body, ct) => { res.writeHead(code, { 'content-type': ct || 'application/json', 'cache-control': 'no-store' }); res.end(body) }

  if (p === '/models/lib/ortweb') return send(200, fs.readFileSync(ORT_ESM), 'text/javascript')
  if (p.startsWith('/models/ortw/')) {                    // 런타임 자기 버전 wasm (버전 정합 확인 지점)
    // BREAK_WASM: 버전이 안 맞는 wasm 을 물렸을 때(예전 상태) 조용히 넘어가지 않는지 확인하는 시나리오
    if (BREAK_WASM) return send(200, Buffer.from([0, 97, 115, 109, 9, 9, 9, 9]), 'application/wasm')
    const f = path.join(ORT_DIR, path.basename(p))
    return fs.existsSync(f) ? send(200, fs.readFileSync(f), 'application/wasm') : send(404, 'no', 'text/plain')
  }
  if (p === ESRGAN_PATH) {
    if (u.searchParams.get('probe') === '1') return send(200, JSON.stringify({ ok: true, cached: true, bytes: fs.statSync(MODEL).size }))
    return send(200, fs.readFileSync(MODEL), 'application/octet-stream')
  }
  if (p.startsWith('/models/')) {
    if (u.searchParams.get('probe') === '1') return send(200, JSON.stringify({ ok: false }))
    return send(404, 'no', 'text/plain')                  // Swin2SR 은 일부러 막아 ESRGAN 경로만 검증
  }
  if (p.startsWith('/api/')) return send(200, JSON.stringify({ ok: true }))
  const f = path.join(PUB, p.replace(/^\//, '').replace(/\/$/, '') || 'index.html')
  if (f.startsWith(PUB) && fs.existsSync(f) && fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)] || 'application/octet-stream')
  return send(404, 'not found', 'text/plain')
 } catch (e) {
  console.log('  서버 오류', String(e).slice(0, 120))
  try { res.writeHead(500); res.end('err') } catch { /* noop */ }
 }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = 'http://127.0.0.1:' + server.address().port

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
const reqs = []; page.on('request', (r) => reqs.push(r.url()))
const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
await page.goto(origin + '/studio-nvc-prv-8b3k2/index.html?cnexport=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)

// 1) 실제 ONNX 런타임 + 실제 모델로 엔진이 잡히는가
const engine = await page.evaluate(() => window.nvSrCheck(4).catch((e) => ({ ok: false, error: String(e) })))

// 2) 진짜 추론 결과인가 — 같은 원본을 브라우저 기본 확대(bilinear)와 비교해 '다른 그림' 인지 본다
const result = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 96; c.height = 64
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 96, 64); g.addColorStop(0, '#123a7a'); g.addColorStop(1, '#d8c070')
  x.fillStyle = g; x.fillRect(0, 0, 96, 64)
  x.strokeStyle = '#fff'; x.lineWidth = 1
  for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(6 + i * 5, 8); x.lineTo(6 + i * 5, 40); x.stroke() }
  const src = c.toDataURL('image/png')

  const t0 = performance.now()
  const res = await window.__cn.upscaleImageURL(src, 2)
  const ms = Math.round(performance.now() - t0)

  // 같은 크기로 단순 확대한 것과 픽셀 차이를 잰다 (0 이면 추론이 아니라 그냥 늘린 것)
  const load = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u })
  const [a, b] = await Promise.all([load(src), load(res.url)])
  const w = b.width, h = b.height
  const c1 = document.createElement('canvas'); c1.width = w; c1.height = h
  const x1 = c1.getContext('2d'); x1.imageSmoothingEnabled = true; x1.imageSmoothingQuality = 'high'; x1.drawImage(a, 0, 0, w, h)
  const c2 = document.createElement('canvas'); c2.width = w; c2.height = h
  c2.getContext('2d').drawImage(b, 0, 0)
  const d1 = x1.getImageData(0, 0, w, h).data, d2 = c2.getContext('2d').getImageData(0, 0, w, h).data
  let diff = 0, max = 0
  for (let i = 0; i < d1.length; i += 4) {
    for (let k = 0; k < 3; k++) { const d = Math.abs(d1[i + k] - d2[i + k]); diff += d; if (d > max) max = d }
  }
  return { dim: res.dim, engine: res.engine, fallback: res.fallback, ms, avgDiff: +(diff / (w * h * 3)).toFixed(2), maxDiff: max }
})

await page.waitForTimeout(200); await browser.close()

const external = reqs.filter((u) => !u.startsWith(origin) && !/^(data|blob|about):/.test(u))
const out = []
const ok = (n, c, i) => out.push([n, !!c, i == null ? '' : String(i)])
ok('실제 onnxruntime-web 로드(우리 서버에서)', reqs.some((u) => u.endsWith('/models/lib/ortweb')))
ok('런타임 wasm 을 자기 버전 경로에서 로드', reqs.some((u) => u.includes('/models/ortw/')), reqs.filter((u) => u.includes('/models/ortw/')).map((u) => u.split('/').pop()).join(','))
ok('실제 ONNX 모델 파일 로드', reqs.some((u) => u.includes('real-esrgan-x4plus') && !u.includes('probe')))
ok('신경망 세션 생성·엔진 채택', engine.ok === true, JSON.stringify(engine))
ok('엔진 이름표 = 측정된 배율', engine.ok && engine.engine === 'Real-ESRGAN x' + engine.factor, engine.engine)
ok('업스케일 완주(2배)', result.dim === '192×128', result.dim)
ok('진짜 초해상 판정(fallback 아님)', result.fallback === false, 'engine=' + result.engine)
ok('단순 확대와 다른 결과(추론 증거)', result.avgDiff > 1 && result.maxDiff > 20, `평균차 ${result.avgDiff} · 최대차 ${result.maxDiff}`)
ok('외부 오리진 요청 0건', external.length === 0, external.slice(0, 3).join(',') || '없음')
ok('페이지 오류 없음', errs.length === 0, errs.slice(0, 2).join(' | ') || '없음')

// ── 시나리오 2: 런타임 wasm 이 깨진 경우 — 조용히 "완료" 하지 않고 정직하게 알리는가 ──
BREAK_WASM = true
const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p2 = await b2.newPage()
await p2.goto(origin + '/studio-nvc-prv-8b3k2/index.html?cnexport=1', { waitUntil: 'domcontentloaded' })
await p2.waitForTimeout(1200)
const broken = await p2.evaluate(async () => {
  const eng = await window.nvSrCheck(4)
  const c = document.createElement('canvas'); c.width = 64; c.height = 48
  c.getContext('2d').fillRect(0, 0, 64, 48)
  const r = await window.__cn.upscaleImageURL(c.toDataURL('image/png'), 2)
  return { engineOk: eng.ok, engineErr: (eng.error || '').slice(0, 200), engine: r.engine, fallback: r.fallback, reason: (r.reason || '').slice(0, 220), dim: r.dim }
})
await b2.close()
ok('[깨진 런타임] 엔진 채택 거부', broken.engineOk === false, broken.engineErr)
ok('[깨진 런타임] 리샘플로 폴백하되 사실대로 표시', broken.fallback === true && broken.engine === '리샘플(폴백)', broken.engine)
ok('[깨진 런타임] 실패 사유 기록', !!broken.reason, broken.reason)
ok('[깨진 런타임] 크기는 정상 처리', broken.dim === '128×96', broken.dim)

server.close(); fs.rmSync(tmp, { recursive: true, force: true })
let fail = 0
for (const [n, pass, info] of out) { if (!pass) fail++; console.log((pass ? 'PASS ' : 'FAIL ') + n + (info ? '  — ' + info : '')) }
console.log(`\n추론 시간 ${result.ms}ms · ${out.length - fail}/${out.length} passed`)
process.exit(fail ? 1 : 0)
