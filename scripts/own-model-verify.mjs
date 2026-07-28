// 자체 초해상 모델이 '정확히' 도는지 확인한다 — 화질 점수가 아니라 정확성 검사.
//
//  1) 학습할 때의 계산(numpy)과 배포된 ONNX 파일의 계산이 같은가
//     가중치를 ONNX 로 옮길 때 축 순서를 잘못 바꾸면, 그럴듯해 보이지만 다른 그림이 나온다.
//     같은 입력을 양쪽에 넣어 픽셀 단위로 대조한다. (기준: 최대 오차 1/255 이내)
//  2) 색이 뒤바뀌지 않는가 (R↔B 뒤바뀜은 흔한 실수)
//  3) 타일을 나눠 처리한 자국(이음매)이 남지 않는가
//  4) 홀수 크기·아주 작은 그림에서도 깨지지 않는가
//  5) 실제 크기(1080p → 4K)에서 얼마나 걸리는가
//
//  실행: python3 scripts/train-sr-model.py 로 모델을 만든 뒤
//        npm i -D playwright-core onnxruntime-web@1.17.1 esbuild && node scripts/own-model-verify.mjs
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'

const PUB = path.resolve('public')
const OWN = path.join(PUB, 'models-own/bygency-sr-x2/model.onnx')
const ORT_DIR = path.resolve('node_modules/onnxruntime-web/dist')
if (!fs.existsSync(OWN)) { console.error('자체 모델 없음: python3 scripts/train-sr-model.py'); process.exit(2) }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ownver-'))

// ── ① 학습 코드(numpy)로 '정답' 을 미리 계산해 둔다 ──
// 고정된 입력을 만들고, 학습에 쓴 것과 같은 계산으로 결과를 뽑아 파일로 남긴다.
const PY = path.join(tmp, 'expect.py')
fs.writeFileSync(PY, `
import json, sys, types, numpy as np
src = open('scripts/train-sr-model.py').read().replace("if __name__ == '__main__':\\n    main()", "")
mod = types.ModuleType('t'); exec(compile(src, 't', 'exec'), mod.__dict__)
import onnx
from onnx import numpy_helper

# 배포된 ONNX 파일에서 가중치를 그대로 꺼내 numpy 계산기에 넣는다
m = onnx.load('${OWN}')
init = {t.name: numpy_helper.to_array(t) for t in m.graph.initializer}
net = mod.Net(24)
for name, c in (('conv1', net.c1), ('conv2', net.c2), ('conv3', net.c3), ('conv4', net.c4)):
    w = init[name + '_w']                      # (cout, cin, k, k)
    c.W[:] = w.transpose(2, 3, 1, 0).reshape(c.k * c.k * c.cin, c.cout)
    c.b[:] = init[name + '_b']

# 고정 입력 — 색·가장자리·평탄부가 모두 들어간 작은 그림
rng = np.random.default_rng(7)
H = W = 24
x = np.zeros((1, H, W, 3), np.float32)
x[0, :, :, 0] = np.linspace(0, 1, W)[None, :]
x[0, :, :, 1] = np.linspace(0, 1, H)[:, None]
x[0, :, :, 2] = 0.35
x[0, 6:10, :, :] = 1.0                       # 밝은 가로줄
x[0, :, 14:16, :] = 0.0                      # 어두운 세로줄
x[0, 16:20, 4:8, 0] = 1.0; x[0, 16:20, 4:8, 1:] = 0.0   # 빨강 사각
x = np.clip(x + rng.normal(0, 0.02, x.shape), 0, 1).astype(np.float32)

y = net.forward(x)
json.dump({'input': x.reshape(-1).tolist(), 'expect': np.clip(y, 0, 1).reshape(-1).tolist(),
           'h': H, 'w': W}, open('${path.join(tmp, 'expect.json')}', 'w'))
print('ok')
`)
execFileSync('python3', [PY], { stdio: 'inherit' })
const EXPECT = JSON.parse(fs.readFileSync(path.join(tmp, 'expect.json'), 'utf8'))

// ── ② 브라우저에서 같은 ONNX 를 진짜 실행기로 돌려 대조한다 ──
const ORT_ESM = path.join(tmp, 'ortweb.mjs')
execFileSync('npx', ['esbuild', 'onnxruntime-web', '--bundle', '--format=esm', '--platform=browser',
  '--outfile=' + ORT_ESM, '--log-level=error'], { stdio: 'inherit' })

const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css', '.onnx':'application/octet-stream', '.json':'application/json' }
const server = http.createServer((req,res)=>{
  const u = new URL(req.url,'http://x'); const p = u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p === '/models/lib/ortweb') return send(200, fs.readFileSync(ORT_ESM), 'text/javascript')
  if(p.startsWith('/models/ortw/')){
    const f = path.join(ORT_DIR, path.basename(p))
    return fs.existsSync(f) ? send(200, fs.readFileSync(f), 'application/wasm') : send(404,'no','text/plain')
  }
  if(p.startsWith('/models/')){                       // 남의 모델은 막는다 — 자체 모델만 확인
    if(u.searchParams.get('probe')==='1') return send(200, JSON.stringify({ ok:false }))
    return send(502,'차단','text/plain')
  }
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ ok:true }))
  const f = path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const browser=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page=await browser.newPage(); const errs=[]
page.on('pageerror',e=>errs.push(String(e).slice(0,200)))
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1500)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 학습 계산 == 배포 ONNX 계산
const same = await page.evaluate(async (E) => {
  const mod = await import('/models/lib/ortweb')
  const ort = mod.default || mod
  ort.env.wasm.wasmPaths = location.origin + '/models/ortw/'
  ort.env.wasm.numThreads = 1; ort.env.wasm.simd = true
  const sess = await ort.InferenceSession.create(location.origin + '/models-own/bygency-sr-x2/model.onnx',
    { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
  const H = E.h, W = E.w, n = H * W
  // 학습 쪽은 NHWC, 실행기는 NCHW → 같은 값이 되도록 옮겨 담는다
  const nhwc = E.input, chw = new Float32Array(3 * n)
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) chw[c * n + i] = nhwc[i * 3 + c]
  const t = new ort.Tensor('float32', chw, [1, 3, H, W])
  const feeds = {}; feeds[sess.inputNames[0]] = t
  const res = await sess.run(feeds)
  const o = res[sess.outputNames[0]], od = o.data, oh = o.dims[2], ow = o.dims[3], on = oh * ow
  // 기대값(NHWC) 과 실제(NCHW) 를 같은 순서로 맞춰 비교
  let maxDiff = 0, sum = 0
  for (let i = 0; i < on; i++) for (let c = 0; c < 3; c++) {
    const a = E.expect[i * 3 + c], b = od[c * on + i]
    const d = Math.abs(a - b); if (d > maxDiff) maxDiff = d; sum += d
  }
  return { oh, ow, maxDiff, avgDiff: sum / (on * 3), inputs: sess.inputNames, outputs: sess.outputNames }
}, EXPECT)

ok('배포 ONNX 가 정확히 2배 크기를 낸다', same.oh === EXPECT.h * 2 && same.ow === EXPECT.w * 2,
   `${EXPECT.w}×${EXPECT.h} → ${same.ow}×${same.oh}`)
ok('학습 계산과 배포 ONNX 계산이 일치 (가중치가 올바로 옮겨졌다)',
   same.maxDiff < 1 / 255, `최대 오차 ${(same.maxDiff * 255).toFixed(4)}/255 · 평균 ${(same.avgDiff * 255).toFixed(5)}/255`)

// 2) 색이 뒤바뀌지 않는가 — 빨강·초록·파랑 면이 그대로 나와야 한다
const color = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 60; c.height = 20
  const x = c.getContext('2d')
  x.fillStyle = '#ff2020'; x.fillRect(0, 0, 20, 20)
  x.fillStyle = '#20ff20'; x.fillRect(20, 0, 20, 20)
  x.fillStyle = '#2020ff'; x.fillRect(40, 0, 20, 20)
  const res = await window.__cn.upscaleImageURL(c.toDataURL('image/png'), 2)
  const img = await new Promise(k => { const i = new Image(); i.onload = () => k(i); i.src = res.url })
  const o = document.createElement('canvas'); o.width = img.width; o.height = img.height
  o.getContext('2d').drawImage(img, 0, 0)
  const g = o.getContext('2d')
  const at = (px, py) => { const d = g.getImageData(px, py, 1, 1).data; return [d[0], d[1], d[2]] }
  return { engine: res.engine, r: at(20, 20), gI: at(60, 20), b: at(100, 20) }
})
ok('빨강 면이 빨강 그대로', color.r[0] > 200 && color.r[1] < 90 && color.r[2] < 90, color.r.join(','))
ok('초록 면이 초록 그대로', color.gI[1] > 200 && color.gI[0] < 90 && color.gI[2] < 90, color.gI.join(','))
ok('파랑 면이 파랑 그대로', color.b[2] > 200 && color.b[0] < 90 && color.b[1] < 90, color.b.join(','))

// 3) 타일 이음매가 남지 않는가 — 부드러운 그라디언트에 세로줄이 생기면 실패
const seam = await page.evaluate(async () => {
  const W = 700, H = 120                      // 타일(192) 여러 개에 걸치는 크기
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#204070'); g.addColorStop(1, '#c0a070')
  x.fillStyle = g; x.fillRect(0, 0, W, H)
  const res = await window.__cn.upscaleImageURL(c.toDataURL('image/png'), 2)
  const img = await new Promise(k => { const i = new Image(); i.onload = () => k(i); i.src = res.url })
  const o = document.createElement('canvas'); o.width = img.width; o.height = img.height
  o.getContext('2d').drawImage(img, 0, 0)
  const d = o.getContext('2d').getImageData(0, 0, img.width, img.height).data
  // 가로로 훑으며 '이웃 열과의 차이' 를 본다. 부드러운 그라디언트라 차이는 아주 작아야 한다.
  const lum = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  const w = img.width, h = img.height
  let maxJump = 0, jumpAt = -1
  for (let xx = 1; xx < w - 1; xx++) {
    let s = 0
    for (let y = 2; y < h - 2; y++) s += Math.abs(lum((y * w + xx) * 4) - lum((y * w + xx - 1) * 4))
    s /= (h - 4)
    if (s > maxJump) { maxJump = s; jumpAt = xx }
  }
  // 대조군 — 같은 그림을 단순 확대한 것. 8비트로 반올림하는 순간 그라디언트에는
  //  원래 계단이 생기므로, 그 값보다 크게 튀어야만 '이음매' 라고 할 수 있다.
  const cc = document.createElement('canvas'); cc.width = img.width; cc.height = img.height
  const ccx = cc.getContext('2d'); ccx.imageSmoothingEnabled = true; ccx.imageSmoothingQuality = 'high'
  ccx.drawImage(c, 0, 0, img.width, img.height)
  const cd = ccx.getImageData(0, 0, img.width, img.height).data
  const clum = (i) => 0.299 * cd[i] + 0.587 * cd[i + 1] + 0.114 * cd[i + 2]
  let ctrlMax = 0
  for (let xx = 1; xx < w - 1; xx++) {
    let s = 0
    for (let y = 2; y < h - 2; y++) s += Math.abs(clum((y * w + xx) * 4) - clum((y * w + xx - 1) * 4))
    s /= (h - 4); if (s > ctrlMax) ctrlMax = s
  }
  return { w, h, maxJump: Math.round(maxJump * 100) / 100, jumpAt,
           ctrlMax: Math.round(ctrlMax * 100) / 100, engine: res.engine }
})
// 단순 확대에서도 8비트 반올림 탓에 계단이 생긴다 → 그 값을 기준으로 '더 튀는지' 만 본다.
ok('타일 이음매 자국이 없음 (단순 확대와 같은 수준)',
   seam.maxJump <= seam.ctrlMax * 1.35 + 0.2,
   `초해상 ${seam.maxJump} vs 단순확대 ${seam.ctrlMax} (x=${seam.jumpAt}, ${seam.w}×${seam.h})`)

// 4) 홀수 크기·아주 작은 그림에서도 깨지지 않는가
const odd = await page.evaluate(async () => {
  const sizes = [[1, 1], [3, 5], [17, 23], [193, 7]]
  const r = []
  for (const [w, h] of sizes) {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const x = c.getContext('2d'); x.fillStyle = '#3080c0'; x.fillRect(0, 0, w, h)
    if (w > 2) { x.fillStyle = '#fff'; x.fillRect(1, 0, 1, h) }
    try {
      const res = await window.__cn.upscaleImageURL(c.toDataURL('image/png'), 2)
      const img = await new Promise(k => { const i = new Image(); i.onload = () => k(i); i.onerror = () => k(null); i.src = res.url })
      r.push({ in: w + '×' + h, out: img ? img.width + '×' + img.height : '실패', want: (w * 2) + '×' + (h * 2), fallback: !!res.fallback })
    } catch (e) { r.push({ in: w + '×' + h, out: '오류: ' + String(e && e.message || e).slice(0, 40) }) }
  }
  return r
})
ok('홀수·초소형 크기에서도 정확히 2배', odd.every(o => o.out === o.want),
   odd.map(o => `${o.in}→${o.out}`).join(' , '))

// 5) 실제 크기에서 걸리는 시간 (1080p → 4K)
const speed = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 1920; c.height = 1080
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 1920, 1080); g.addColorStop(0, '#123a7a'); g.addColorStop(1, '#d8c070')
  x.fillStyle = g; x.fillRect(0, 0, 1920, 1080)
  x.strokeStyle = '#fff'; x.lineWidth = 1
  for (let i = 0; i < 40; i++) { x.beginPath(); x.moveTo(20 + i * 45, 40); x.lineTo(20 + i * 45, 500); x.stroke() }
  const t0 = performance.now()
  const res = await window.__cn.upscaleImageURL(c.toDataURL('image/png'), 2, { longTarget: 3840 })
  const ms = Math.round(performance.now() - t0)
  const img = await new Promise(k => { const i = new Image(); i.onload = () => k(i); i.src = res.url })
  return { ms, dim: res.dim, w: img.width, h: img.height, engine: res.engine, fallback: !!res.fallback }
})
ok('1080p → 4K 가 자체 모델로 처리됨', speed.w === 3840 && speed.h === 2160 && !speed.fallback,
   `${speed.dim} · ${speed.engine}`)
ok('1080p → 4K 처리 시간이 현실적인 범위', speed.ms < 180000, `${(speed.ms / 1000).toFixed(1)}초`)

ok('페이지 오류 없음', errs.length === 0, errs.slice(0, 2).join(' | ') || '없음')

await browser.close(); server.close(); fs.rmSync(tmp, { recursive:true, force:true })
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
