// "사진도 영상도 정말 업스케일이 되는가" 를 전/후 비교로 확인한다.
//  크기만 커지는 것(단순 확대)과 진짜 초해상은 다르다 → 세 가지를 함께 잰다.
//   1) 크기가 요청한 배율대로 커졌는가
//   2) 단순 확대와 '다른 그림' 인가 (같으면 추론이 안 돈 것)
//   3) 선명도(가장자리 세기)가 단순 확대보다 높은가
//  런타임은 실제 onnxruntime-web, 모델은 실제 ONNX 파일(scripts/fixtures/tiny-sr-x2.onnx)을 쓴다.
//  영상은 프레임마다 같은 처리를 하므로, 결과 영상에서 프레임을 뽑아 같은 방식으로 잰다.
//  COMPARE_OUT=디렉터리 를 주면 전/후 그림을 파일로 남긴다(눈으로 확인용).
//  실행: npm i -D playwright-core onnxruntime-web@1.17.1 esbuild && node scripts/upscale-compare-test.mjs
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'

const ORT_DIR = path.resolve('node_modules/onnxruntime-web/dist')
const MODEL = path.resolve('scripts/fixtures/tiny-sr-x2.onnx')
if (!fs.existsSync(ORT_DIR) || !fs.existsSync(MODEL)) {
  console.error('준비물 없음: npm i -D onnxruntime-web@1.17.1 esbuild')
  process.exit(2)
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'upcmp-'))
const ORT_ESM = path.join(tmp, 'ortweb.mjs')
execFileSync('npx', ['esbuild', 'onnxruntime-web', '--bundle', '--format=esm', '--platform=browser',
  '--outfile=' + ORT_ESM, '--log-level=error'], { stdio: 'inherit' })

const PUB = path.resolve('public')
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css' }
const ESRGAN_PATH = '/models/hf/onnx-community/real-esrgan-x4plus/resolve/main/onnx/model.onnx'

const server = http.createServer((req,res)=>{
  const u = new URL(req.url,'http://x'); const p = u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p === '/models/lib/ortweb') return send(200, fs.readFileSync(ORT_ESM), 'text/javascript')
  if(p.startsWith('/models/ortw/')){
    const f = path.join(ORT_DIR, path.basename(p))
    return fs.existsSync(f) ? send(200, fs.readFileSync(f), 'application/wasm') : send(404,'no','text/plain')
  }
  if(p === ESRGAN_PATH){
    if(u.searchParams.get('probe')==='1') return send(200, JSON.stringify({ ok:true, cached:true, bytes:fs.statSync(MODEL).size }))
    return send(200, fs.readFileSync(MODEL), 'application/octet-stream')
  }
  if(p.startsWith('/models/')){
    if(u.searchParams.get('probe')==='1') return send(200, JSON.stringify({ ok:false }))
    return send(404,'no','text/plain')
  }
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ ok:true }))
  const f = path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const browser=await chromium.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required'],
})
const page=await browser.newPage(); const errs=[]
page.on('pageerror',e=>errs.push(String(e).slice(0,200)))
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1200)

// 브라우저 안에 공용 도구를 심는다 — 원본 만들기 · 선명도 재기 · 단순 확대와 비교
await page.evaluate(() => {
  // 가는 선·격자·글자가 있는 원본. 초해상이 살려야 할 '디테일' 이 분명히 들어 있다.
  window.__srcImage = (w = 96, h = 64) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#123a7a'); g.addColorStop(1, '#d8c070')
    x.fillStyle = g; x.fillRect(0, 0, w, h)
    x.strokeStyle = '#fff'; x.lineWidth = 1
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(5 + i * 5, 6); x.lineTo(5 + i * 5, h - 18); x.stroke() }
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(4, 8 + i * 6); x.lineTo(w - 4, 8 + i * 6); x.stroke() }
    x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.fillText('BYGENCY', 5, h - 5)
    return c.toDataURL('image/png')
  }
  window.__load = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u })
  window.__pixels = (img, w, h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'
    x.drawImage(img, 0, 0, w, h)
    return x.getImageData(0, 0, w, h).data
  }
  // 선명도 = 이웃 픽셀과의 밝기 차이 평균(가장자리가 뚜렷할수록 큼)
  window.__sharpness = (d, w, h) => {
    let sum = 0, n = 0
    const lum = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      sum += Math.abs(lum(i) - lum(i + 4)) + Math.abs(lum(i) - lum(i + w * 4)); n += 2
    }
    return n ? Math.round((sum / n) * 1000) / 1000 : 0
  }
  // 두 그림의 평균/최대 차이 (0 이면 완전히 같은 그림)
  window.__diff = (a, b) => {
    let sum = 0, max = 0
    for (let i = 0; i < a.length; i += 4) {
      const dd = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
      sum += dd; if (dd > max) max = dd
    }
    return { avg: Math.round((sum / (a.length / 4)) * 100) / 100, max }
  }
})

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])
const shots={}

// ── 0) 엔진이 실제 신경망으로 잡히는가 ──
const eng = await page.evaluate(() => window.nvSrCheck(2).catch(e => ({ ok:false, error:String(e) })))
ok('AI 초해상 엔진이 잡힘', eng.ok === true, `${eng.engine} · ${eng.factor}배 · ${eng.ms}ms`)

// ── 1) 사진 업스케일 — 2배·4배 ──
for (const scale of [2, 4]) {
  const r = await page.evaluate(async (sc) => {
    const src = window.__srcImage(96, 64)
    const t0 = performance.now()
    const res = await window.__cn.upscaleImageURL(src, sc)
    const ms = Math.round(performance.now() - t0)
    const [a, b] = await Promise.all([window.__load(src), window.__load(res.url)])
    const w = b.width, h = b.height
    const plain = window.__pixels(a, w, h)            // 같은 크기로 '단순 확대'
    const sr = window.__pixels(b, w, h)               // 초해상 결과
    return {
      ms, dim: res.dim, srcDim: res.srcDim, engine: res.engine, fallback: !!res.fallback,
      w, h, srcW: a.width, srcH: a.height,
      diff: window.__diff(plain, sr),
      sharpPlain: window.__sharpness(plain, w, h),
      sharpSr: window.__sharpness(sr, w, h),
      srcUrl: src, outUrl: res.url,
    }
  }, scale)
  shots[`photo-${scale}x-before`] = r.srcUrl
  shots[`photo-${scale}x-after`] = r.outUrl

  ok(`사진 ${scale}배 — 크기가 정확히 ${scale}배`, r.w === r.srcW * scale && r.h === r.srcH * scale,
     `${r.srcDim} → ${r.dim} (${r.ms}ms)`)
  ok(`사진 ${scale}배 — AI 초해상으로 처리(단순 확대 아님)`, r.fallback === false, r.engine)
  ok(`사진 ${scale}배 — 단순 확대와 다른 그림`, r.diff.avg > 0.3, `평균차 ${r.diff.avg} · 최대차 ${r.diff.max}`)
  ok(`사진 ${scale}배 — 단순 확대보다 선명함`, r.sharpSr > r.sharpPlain,
     `선명도 ${r.sharpPlain} → ${r.sharpSr} (${Math.round((r.sharpSr / r.sharpPlain - 1) * 100)}%)`)
}

// ── 2) 5K(긴 변 맞추기) ──
{
  const r = await page.evaluate(async () => {
    const src = window.__srcImage(320, 180)
    const res = await window.__cn.upscaleImageURL(src, 4, { longTarget: 1280 })   // 테스트라 5120 대신 1280
    const b = await window.__load(res.url)
    return { dim: res.dim, w: b.width, h: b.height, fallback: !!res.fallback, engine: res.engine, note: res.note || '' }
  })
  ok('긴 변 맞추기 — 요청한 긴 변에 정확히 맞음', r.w === 1280 && r.h === 720, `${r.dim}${r.note ? ' · ' + r.note : ''}`)
  ok('긴 변 맞추기 — AI 초해상으로 처리', r.fallback === false, r.engine)
}

// ── 2-b) 4K — 사진과 영상 모두 실제로 3840px 에 닿는가 ──
{
  const plans = await page.evaluate(() => window.__cn.UP_PLANS.map(p => ({ key:p.key, label:p.label, scale:p.scale, longTarget:p.longTarget })))
  ok('4K 선택지가 있음', plans.some(p => p.key === '4K' && p.longTarget === 3840), plans.map(p => p.key).join(' / '))
  const parsed = await page.evaluate(() => ({
    k4k: window.__cn.upPlanOf('4K (가로 3840px)').key,
    k4x: window.__cn.upPlanOf('4배').key,
    k5k: window.__cn.upPlanOf('5K (긴 변 5120px)').key,
    k2x: window.__cn.upPlanOf('2배').key,
    help: window.__cn.upScaleHelp('4K'),
  }))
  ok('"4K" 를 4배와 헷갈리지 않고 구분', parsed.k4k === '4K' && parsed.k4x === '4' && parsed.k5k === '5K' && parsed.k2x === '2',
     `${parsed.k2x}/${parsed.k4x}/${parsed.k4k}/${parsed.k5k}`)
  ok('4K 안내문이 실제 크기를 설명', /3840/.test(parsed.help), parsed.help.slice(0, 40) + '…')

  // 사진 4K — 1080p 원본을 넣으면 정확히 3840×2160 이 나와야 한다
  const img4k = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1920; c.height = 1080
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, 1920, 1080); g.addColorStop(0, '#123a7a'); g.addColorStop(1, '#d8c070')
    x.fillStyle = g; x.fillRect(0, 0, 1920, 1080)
    x.strokeStyle = '#fff'; x.lineWidth = 1
    for (let i = 0; i < 40; i++) { x.beginPath(); x.moveTo(20 + i * 12, 40); x.lineTo(20 + i * 12, 400); x.stroke() }
    const src = c.toDataURL('image/png')
    const plan = window.__cn.upPlanOf('4K (가로 3840px)')
    const t0 = performance.now()
    const res = await window.__cn.upscaleImageURL(src, plan.scale, { longTarget: plan.longTarget })
    const ms = Math.round(performance.now() - t0)
    const [a, b] = await Promise.all([window.__load(src), window.__load(res.url)])
    const w = b.width, h = b.height
    const plain = window.__pixels(a, w, h), sr = window.__pixels(b, w, h)
    return { ms, w, h, dim: res.dim, engine: res.engine, fallback: !!res.fallback, note: res.note || '',
             sharpPlain: window.__sharpness(plain, w, h), sharpSr: window.__sharpness(sr, w, h),
             diff: window.__diff(plain, sr) }
  })
  ok('사진 4K — 1920×1080 → 정확히 3840×2160', img4k.w === 3840 && img4k.h === 2160, `${img4k.dim} (${img4k.ms}ms)`)
  ok('사진 4K — AI 초해상으로 처리', img4k.fallback === false, img4k.engine + (img4k.note ? ' · ' + img4k.note : ''))
  ok('사진 4K — 단순 확대보다 선명함', img4k.sharpSr > img4k.sharpPlain,
     `선명도 ${img4k.sharpPlain} → ${img4k.sharpSr} (${Math.round((img4k.sharpSr / img4k.sharpPlain - 1) * 100)}%) · 평균차 ${img4k.diff.avg}`)

  // 영상 4K — 960×540 짜리를 4K 목표로. 브라우저가 못 하면 낮추되 사실대로 알려야 한다.
  const vid4k = await page.evaluate(async () => {
    const W = 960, H = 540
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const x = c.getContext('2d')
    const st = c.captureStream(30)
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m))
    const rec = new MediaRecorder(st, { mimeType: mime, videoBitsPerSecond: 8000000 })
    const ch = []; rec.ondataavailable = e => { if (e.data.size) ch.push(e.data) }
    const stopped = new Promise(r => { rec.onstop = r }); rec.start()
    const t0 = performance.now()
    await new Promise(r => { (function loop(){
      const g = x.createLinearGradient(0,0,W,H); g.addColorStop(0,'#123a7a'); g.addColorStop(1,'#d8c070')
      x.fillStyle = g; x.fillRect(0,0,W,H)
      x.strokeStyle = '#fff'; x.lineWidth = 1
      for (let i = 0; i < 20; i++) { x.beginPath(); x.moveTo(20+i*12, 30); x.lineTo(20+i*12, 200); x.stroke() }
      if (performance.now()-t0 < 700) requestAnimationFrame(loop); else r() })() })
    rec.stop(); await stopped
    const srcUrl = URL.createObjectURL(new Blob(ch, { type:'video/webm' }))
    const info = await window.__cn._probeVideoInfo(srcUrl)
    const plan = window.__cn.upPlanOf('4K (가로 3840px)')
    const t1 = performance.now()
    const res = await window.__cn.upscaleVideoURL(srcUrl, plan.scale, () => {},
      { longTarget: plan.longTarget, srcFps: info.fps, hasAudio: info.hasAudio })
    const ms = Math.round(performance.now() - t1)
    // 결과 영상의 실제 픽셀 크기를 재 본다
    const v = document.createElement('video'); v.src = res.url; v.muted = true
    await new Promise(k => { v.onloadeddata = k; v.onerror = k; setTimeout(k, 8000) })
    return { ms, dim: res.dim, w: v.videoWidth, h: v.videoHeight, engine: res.engine,
             fallback: !!res.fallback, note: res.note || '', fps: res.fps }
  })
  // ⚠ 4K 영상은 브라우저가 실시간으로 인코딩하지 못한다(실측: 3840×2160 은 0바이트가 나온다).
  //   실시간으로 못 만들면 프레임 시각이 '처리에 걸린 시간' 으로 찍혀 슬로모션이 된다.
  //   그래서 감당 가능한 크기로 낮추는 것이 정답이다 — 단, 낮춘 사실을 반드시 알려야 한다.
  //   (사진 4K 는 그대로 3840×2160 으로 나온다 — 바로 위 검사에서 확인)
  const vidRatio = (960/540), outRatio = vid4k.h ? vid4k.w/vid4k.h : 0
  ok('영상 4K — 실제로 재생되는 영상이 나옴(인코더 한계 안)',
     vid4k.w > 0 && vid4k.h > 0 && vid4k.w*vid4k.h <= 2.9e6,
     `${vid4k.dim} → 재생 크기 ${vid4k.w}×${vid4k.h} (${(vid4k.w*vid4k.h/1e6).toFixed(2)}M · ${vid4k.ms}ms)`)
  ok('영상 4K — 화면 비율이 그대로', Math.abs(outRatio - vidRatio) < 0.02, `${outRatio.toFixed(3)} vs 원본 ${vidRatio.toFixed(3)}`)
  ok('영상 4K — AI 초해상으로 처리', vid4k.fallback === false, vid4k.engine)
  ok('영상 4K — 낮췄다는 사실을 숨기지 않고 알림', /낮췄습니다|맞췄습니다/.test(vid4k.note), vid4k.note || '(안내 없음)')
}

// ── 2-c) 초해상에 '원본 그대로' 가 들어가는가 (여기가 화질을 좌우한다) ──
//   모델에 넣기 전에 원본을 줄이면 진짜 디테일을 버리고 시작하므로 결과가 흐릿해진다.
//   실제로 모델에 들어간 캔버스 크기를 가로채서 확인한다.
{
  const spy = await page.evaluate(async () => {
    const C = window.__cn
    // 모델에 넣는 지점을 감싸서 '실제 입력 크기' 를 기록한다
    const seen = []
    const orig = window.__srSpyOrig || null
    if (!orig) {
      // _srCanvas2 는 내부 함수라 직접 못 잡는다 → 업스케일 전후로 캔버스 생성 크기를 추적
      const origDraw = CanvasRenderingContext2D.prototype.drawImage
      window.__srSpyOrig = origDraw
    }
    // 실행 중 만들어진 캔버스 중 '모델 입력' 후보를 잡기 위해 createElement 를 감싼다
    const origCreate = document.createElement.bind(document)
    document.createElement = function (tag) {
      const el = origCreate(tag)
      if (tag === 'canvas') seen.push(el)
      return el
    }
    let res
    try {
      // 1920×1080 원본을 5K 목표로 — 예전 규칙이라면 1280×720 까지 줄여서 넣었다
      const c = origCreate('canvas'); c.width = 1920; c.height = 1080
      const x = c.getContext('2d')
      const g = x.createLinearGradient(0, 0, 1920, 1080); g.addColorStop(0, '#123a7a'); g.addColorStop(1, '#d8c070')
      x.fillStyle = g; x.fillRect(0, 0, 1920, 1080)
      const src = c.toDataURL('image/png')
      seen.length = 0
      res = await C.upscaleImageURL(src, 4, { longTarget: 5120 })
    } finally { document.createElement = origCreate }
    // 모델에 넣힌 입력 캔버스 = 결과보다 작으면서 가장 큰 것(타일 작업용 임시 캔버스 제외)
    const inputs = seen.filter(c => c.width > 200 && c.width < 6000).map(c => c.width + '×' + c.height)
    return { dim: res.dim, engine: res.engine, note: res.note || '', inputs }
  })
  // 원본 1920 이 그대로 들어갔는지 — 1280(예전 규칙) 이 아니라 1920 이 보여야 한다
  ok('초해상 입력이 원본 해상도 그대로', spy.inputs.some(s => s.startsWith('1920×')),
     '모델에 들어간 크기: ' + [...new Set(spy.inputs)].slice(0, 4).join(' , '))
  ok('예전처럼 미리 줄여 넣지 않음', !spy.inputs.some(s => s === '1280×720'),
     spy.inputs.includes('1280×720') ? '1280×720 로 줄여 넣음(예전 문제)' : '줄이지 않음')
  ok('5K 목표 크기에 도달', /5120×2880/.test(spy.dim), spy.dim + (spy.note ? ' · ' + spy.note : ''))
}

// ── 3) 영상 업스케일 — 여기가 한 번도 실제 모델로 확인되지 않았던 부분 ──
const vid = await page.evaluate(async () => {
  // 사진과 똑같은 디테일을 가진 영상을 그 자리에서 만든다
  const W = 96, H = 64
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')
  const draw = () => {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#123a7a'); g.addColorStop(1, '#d8c070')
    x.fillStyle = g; x.fillRect(0, 0, W, H)
    x.strokeStyle = '#fff'; x.lineWidth = 1
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(5 + i * 5, 6); x.lineTo(5 + i * 5, H - 18); x.stroke() }
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(4, 8 + i * 6); x.lineTo(W - 4, 8 + i * 6); x.stroke() }
    x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.fillText('BYGENCY', 5, H - 5)
  }
  const st = c.captureStream(30)
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m))
  const rec = new MediaRecorder(st, { mimeType: mime, videoBitsPerSecond: 8000000 })
  const ch = []; rec.ondataavailable = e => { if (e.data.size) ch.push(e.data) }
  const stopped = new Promise(r => { rec.onstop = r })
  rec.start()
  const t0 = performance.now()
  await new Promise(r => { (function loop(){ draw(); if (performance.now() - t0 < 1200) requestAnimationFrame(loop); else r() })() })
  rec.stop(); await stopped
  const srcUrl = URL.createObjectURL(new Blob(ch, { type: 'video/webm' }))

  // 원본 영상의 한 프레임을 뽑아 둔다 (비교 기준)
  const grabFrame = (url, t) => new Promise(async (resolve) => {
    const v = document.createElement('video'); v.src = url; v.muted = true
    await new Promise(k => { v.onloadeddata = k; v.onerror = k; setTimeout(k, 6000) })
    await new Promise(k => { v.onseeked = k; v.currentTime = t; setTimeout(k, 5000) })
    const cc = document.createElement('canvas'); cc.width = v.videoWidth || 1; cc.height = v.videoHeight || 1
    try { cc.getContext('2d').drawImage(v, 0, 0) } catch { /* noop */ }
    resolve({ url: cc.toDataURL('image/png'), w: cc.width, h: cc.height })
  })
  const beforeFrame = await grabFrame(srcUrl, 0.4)

  const t1 = performance.now()
  let res, err = null
  try { res = await window.__cn.upscaleVideoURL(srcUrl, 2, () => {}) }
  catch (e) { err = String(e && e.message || e) }
  const ms = Math.round(performance.now() - t1)
  if (!res) return { err, ms }

  const afterFrame = await grabFrame(res.url, 0.4)
  // 원본 프레임을 결과와 같은 크기로 '단순 확대' 한 것과 비교
  const [a, b] = await Promise.all([window.__load(beforeFrame.url), window.__load(afterFrame.url)])
  const w = b.width, h = b.height
  const plain = window.__pixels(a, w, h)
  const sr = window.__pixels(b, w, h)
  return {
    ms, dim: res.dim, srcDim: res.srcDim, engine: res.engine, fallback: !!res.fallback, reason: res.reason || '',
    sec: res.sec, srcW: beforeFrame.w, srcH: beforeFrame.h, w, h,
    diff: window.__diff(plain, sr),
    sharpPlain: window.__sharpness(plain, w, h),
    sharpSr: window.__sharpness(sr, w, h),
    beforeUrl: beforeFrame.url, afterUrl: afterFrame.url,
  }
})

if (vid.err) {
  ok('영상 업스케일이 완주함', false, '실패: ' + vid.err)
} else {
  shots['video-2x-before-frame'] = vid.beforeUrl
  shots['video-2x-after-frame'] = vid.afterUrl
  ok('영상 업스케일이 완주함', true, `${vid.srcDim} → ${vid.dim} · ${vid.ms}ms`)
  ok('영상 — 크기가 정확히 2배', vid.w === vid.srcW * 2 && vid.h === vid.srcH * 2,
     `${vid.srcW}×${vid.srcH} → ${vid.w}×${vid.h}`)
  ok('영상 — AI 초해상으로 처리(단순 확대 아님)', vid.fallback === false,
     vid.engine + (vid.reason ? ' · ' + vid.reason : ''))
  ok('영상 — 단순 확대와 다른 그림', vid.diff.avg > 0.3, `평균차 ${vid.diff.avg} · 최대차 ${vid.diff.max}`)
  ok('영상 — 단순 확대보다 선명함', vid.sharpSr > vid.sharpPlain,
     `선명도 ${vid.sharpPlain} → ${vid.sharpSr} (${Math.round((vid.sharpSr / vid.sharpPlain - 1) * 100)}%)`)
}

// ── 4) 소리 있는 영상 — 프레임 수와 소리가 살아남는가 ──
//   예전엔 초당 15장으로 고정돼 30장짜리가 절반으로 줄었고, 소리는 통째로 사라졌다.
const av = await page.evaluate(async () => {
  const W = 64, H = 48
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')
  const st = c.captureStream(30)
  const AC = window.AudioContext || window.webkitAudioContext
  const ac = new AC(); const osc = ac.createOscillator(); const dst = ac.createMediaStreamDestination()
  osc.frequency.value = 440; osc.connect(dst); osc.start()
  dst.stream.getAudioTracks().forEach(t => st.addTrack(t))
  const mime = ['video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m))
  const rec = new MediaRecorder(st, { mimeType: mime }); const ch = []
  rec.ondataavailable = e => { if (e.data.size) ch.push(e.data) }
  const stopped = new Promise(r => { rec.onstop = r })
  rec.start(); const t0 = performance.now()
  await new Promise(r => { (function loop(){ x.fillStyle = '#204070'; x.fillRect(0,0,W,H)
    x.fillStyle = '#fff'; x.fillRect(((performance.now()-t0)/20) % (W-8), 8, 8, 8)
    if (performance.now() - t0 < 1400) requestAnimationFrame(loop); else r() })() })
  rec.stop(); await stopped; osc.stop(); ac.close()
  const srcUrl = URL.createObjectURL(new Blob(ch, { type: 'video/webm' }))

  const info = await window.__cn._probeVideoInfo(srcUrl)
  const res = await window.__cn.upscaleVideoURL(srcUrl, 2, () => {}, { srcFps: info.fps, hasAudio: info.hasAudio })

  // 결과에 소리 트랙이 실제로 들어 있는지 확인 — 재생하며 소리 세기를 재 본다
  let audioLevel = -1
  try {
    const v = document.createElement('video'); v.src = res.url
    await new Promise(k => { v.onloadeddata = k; v.onerror = k; setTimeout(k, 6000) })
    const ac2 = new AC()
    const an = ac2.createAnalyser(); an.fftSize = 512
    ac2.createMediaElementSource(v).connect(an)      // 스피커에 연결하지 않아 소리는 안 난다
    await v.play().catch(() => {})
    await new Promise(k => setTimeout(k, 500))
    const buf = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(buf)
    audioLevel = buf.reduce((a, b) => a + b, 0)
    v.pause(); ac2.close()
  } catch (e) { audioLevel = -2 }

  return { probeFps: info.fps, probeAudio: info.hasAudio, outFps: res.fps,
           note: res.note || '', dim: res.dim, engine: res.engine, fallback: !!res.fallback, audioLevel }
})
ok('원본의 초당 프레임 수를 실제로 잼', av.probeFps >= 20, `${av.probeFps}fps`)
ok('원본에 소리가 있음을 알아챔', av.probeAudio === true, String(av.probeAudio))
ok('결과가 원본 프레임 수를 따라감(15로 깎이지 않음)', av.outFps >= 20, `${av.outFps}fps (예전 고정값 15)`)
ok('결과에 소리가 실제로 들어 있음', av.audioLevel > 0, `소리 세기 ${av.audioLevel}`)
ok('결과 설명에 소리 유지가 적힘', /원본 소리 유지/.test(av.note), av.note)

// ── 5) 소리 없는 영상은 괜히 한 번 더 돌리지 않고, 사실대로 적는가 ──
const noAudio = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 48; c.height = 32
  const x = c.getContext('2d'); const st = c.captureStream(30)
  const mime = ['video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m))
  const rec = new MediaRecorder(st, { mimeType: mime }); const ch = []
  rec.ondataavailable = e => { if (e.data.size) ch.push(e.data) }
  const stopped = new Promise(r => { rec.onstop = r })
  rec.start(); const t0 = performance.now()
  await new Promise(r => { (function loop(){ x.fillStyle = '#802020'; x.fillRect(0,0,48,32)
    if (performance.now() - t0 < 800) requestAnimationFrame(loop); else r() })() })
  rec.stop(); await stopped
  const url = URL.createObjectURL(new Blob(ch, { type: 'video/webm' }))
  const info = await window.__cn._probeVideoInfo(url)
  const res = await window.__cn.upscaleVideoURL(url, 2, () => {}, { srcFps: info.fps, hasAudio: info.hasAudio })
  return { hasAudio: info.hasAudio, note: res.note || '', dim: res.dim }
})
ok('소리 없는 영상은 소리 없음으로 판정', noAudio.hasAudio === false, String(noAudio.hasAudio))
ok('소리 없는 영상은 사실대로 적음', /소리 없음/.test(noAudio.note), noAudio.note)

ok('페이지 오류 없음', errs.length === 0, errs.slice(0, 2).join(' | ') || '없음')

// 전/후 그림을 파일로 남긴다 (눈으로 확인용)
if (process.env.COMPARE_OUT) {
  const dir = path.resolve(process.env.COMPARE_OUT)
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, url] of Object.entries(shots)) {
    const m = /^data:image\/\w+;base64,(.+)$/.exec(String(url) || '')
    if (m) fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(m[1], 'base64'))
  }
  console.log('전/후 그림 저장:', dir)
}

await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true })
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
