// 자체 호스팅 감사 — "업스케일이 우리 서버 것만으로 도는가" 를 실제 브라우저에서 증명한다.
//  실제 스튜디오 페이지를 로컬에 띄우고, 초해상 파이프라인을 끝까지 돌린 뒤
//  브라우저가 낸 '모든' 네트워크 요청을 기록해 우리 오리진 밖으로 나간 것이 하나라도 있으면 실패시킨다.
//  · /models/* 는 우리 프록시를 흉내 낸 스텁이 응답한다(가중치 없이 배관만 검증).
//  · 스텁 transformers 는 env.remoteHost 로 파일을 가져오므로, 스튜디오가 remoteHost 를
//    huggingface.co 같은 외부로 잘못 잡으면 이 감사에서 즉시 외부 요청으로 잡힌다.
//  실행:  npm i -D playwright-core && node scripts/selfhost-audit.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('public')
const CT = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2' }

// 실제 transformers.js 자리에 끼우는 스텁 — 원격 파일을 env.remoteHost 기준으로 가져오고,
// image-to-image 파이프라인은 정확한 2배 확대를 돌려준다(초해상 대체물).
const FAKE_TRANSFORMERS = `
export const env = { allowLocalModels:true, useBrowserCache:true, remotePathTemplate:'', remoteHost:'',
                     backends:{ onnx:{ wasm:{ wasmPaths:'' } } } };
export async function pipeline(task, model, opts){
  const base = env.remoteHost + '/' + model + '/resolve/main/';
  const r = await fetch(base + 'config.json');            // 스튜디오가 설정한 remoteHost 로 실제 요청
  if(!r.ok) throw new Error('config 없음');
  if(opts && opts.quantized === false) { const q = await fetch(base + 'onnx/model.onnx'); if(!q.ok) throw new Error('fp32 없음'); }
  return async function(dataUrl){
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    const c = document.createElement('canvas'); c.width = img.width*2; c.height = img.height*2;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height);
    return { toCanvas: () => c };
  };
}
`

const hits = []
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x')
  const p = u.pathname
  hits.push(p)
  const send = (code, body, ct) => { res.writeHead(code, { 'content-type': ct || 'application/json', 'cache-control': 'no-store' }); res.end(body) }

  if (p === '/models/lib/transformers') return send(200, FAKE_TRANSFORMERS, 'text/javascript')
  if (p.startsWith('/models/')) {
    if (u.searchParams.get('probe') === '1') {
      // Real-ESRGAN 후보는 '없음', Swin2SR 파일은 '있음' — 실제 배포 상황을 그대로 재현
      const ok = /swin2SR/.test(p)
      return send(200, JSON.stringify({ ok, cached: ok, bytes: ok ? 1234 : 0 }))
    }
    if (/config\.json$/.test(p)) return send(200, JSON.stringify({ model_type: 'swin2sr', upscale: 2 }))
    if (/model\.onnx$/.test(p)) return send(200, 'ONNX', 'application/octet-stream')
    return send(404, 'no')
  }
  if (p.startsWith('/api/')) return send(200, JSON.stringify({ ok: true, items: [], characters: [], models: [] }))

  const f = path.join(ROOT, p.replace(/^\//, ''))
  if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    return send(200, fs.readFileSync(f), CT[path.extname(f)] || 'application/octet-stream')
  }
  return send(404, 'not found', 'text/plain')
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = 'http://127.0.0.1:' + server.address().port

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
const requests = []
page.on('request', (r) => requests.push(r.url()))
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))

// ?cnexport=1 — 스튜디오가 검증용으로 내부 함수를 window.__cn 에 노출하는 기존 훅
await page.goto(origin + '/studio-nvc-prv-8b3k2/index.html?cnexport=1', { waitUntil: 'load' })
await page.waitForTimeout(1500) // 부팅 중 나가는 요청까지 수집

// 1) 이 브라우저에서 실제로 채택되는 엔진
const engine = await page.evaluate(() => window.nvSrCheck(4))
// 2) 초해상 파이프라인을 끝까지 실행 (타일 → 합성 → 결과)
const upscaled = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 120; c.height = 80
  const x = c.getContext('2d'); x.fillStyle = '#2050a0'; x.fillRect(0, 0, 120, 80)
  x.fillStyle = '#fff'; x.fillRect(10, 10, 40, 12)
  const res = await window.__cn.upscaleImageURL(c.toDataURL('image/png'), 2)
  return { dim: res.dim, engine: res.engine, fallback: res.fallback, isPng: /^data:image\/png/.test(res.url) }
})
await page.waitForTimeout(4500)   // 작업 뒤 백그라운드 Real-ESRGAN 존재 확인이 도는 시간
await browser.close()
server.close()

const external = requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('about:'))
const modelReqs = requests.filter((u) => u.includes('/models/'))

const checks = [
  ['외부 오리진 요청 0건', external.length === 0, external.slice(0, 8).join(' , ') || '없음'],
  ['모델·런타임 요청이 전부 우리 오리진', modelReqs.length > 0 && modelReqs.every((u) => u.startsWith(origin)), modelReqs.length + '건'],
  // 첫 실행은 가중치가 확실한 엔진으로 곧장 간다(없는 후보를 먼저 찔러보지 않음)
  ['첫 실행이 지연 없이 Swin2SR 로', (() => {
    const t = requests.findIndex((u) => u.endsWith('/models/lib/transformers'))
    const p0 = requests.findIndex((u) => u.includes('probe=1'))
    return t >= 0 && (p0 < 0 || t < p0)
  })(), 'transformers 먼저'],
  // 그리고 나중에 조용히 Real-ESRGAN 가중치가 생겼는지 확인해 둔다(자동 승격 경로 유지)
  ['백그라운드 가중치 확인 동작', requests.some((u) => u.includes('probe=1')), '있음'],
  ['Real-ESRGAN 없음 → Swin2SR 자동 채택', engine.ok === true && /Swin2SR/.test(engine.engine), JSON.stringify(engine)],
  // 이름표가 실제 배율과 일치해야 한다 — 기록·화면이 거짓말하지 않는다는 보장
  ['엔진 이름표 = 측정된 배율', engine.engine === 'Swin2SR x' + engine.factor, engine.engine + ' / factor=' + engine.factor],
  ['초해상 파이프라인 완주(2배)', upscaled.dim === '240×160' && upscaled.fallback === false, JSON.stringify(upscaled)],
  ['결과가 PNG 데이터로 생성됨', upscaled.isPng === true, String(upscaled.isPng)],
  ['페이지 스크립트 오류 없음', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | ') || '없음'],
]

let fail = 0
for (const [name, pass, info] of checks) {
  if (!pass) fail++
  console.log((pass ? 'PASS ' : 'FAIL ') + name + '  — ' + info)
}
console.log('\n[요청한 모델 경로]')
for (const u of [...new Set(modelReqs)]) console.log('  ' + u.replace(origin, ''))
console.log(`\n총 요청 ${requests.length}건 · 외부 ${external.length}건`)
console.log(`${checks.length - fail}/${checks.length} passed`)
process.exit(fail ? 1 : 0)
