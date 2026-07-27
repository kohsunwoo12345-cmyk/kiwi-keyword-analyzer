// 관리자 "노드 스튜디오 테스트" 페이지가 실제로 동작하는지 브라우저에서 끝까지 눌러본다.
//  빌드 산출물(out/)을 그대로 띄우고, 서버 API 자리에는 '진짜 서버 코드' 를 불러 응답한다
//  (씨댄스 페이로드는 generate.js 의 buildSeedancePayload 를 그대로 실행 → 스텁이 아니라 실제 로직 검증).
//  실행:  npm run build && npm i -D playwright-core && node scripts/admin-testpage-check.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// ── 실제 서버 페이로드 빌더 로드 (의존 모듈만 최소 스텁) ──
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admintest-'))
fs.mkdirSync(path.join(dir, 'studio')); fs.mkdirSync(path.join(dir, 'payments'))
fs.writeFileSync(path.join(dir, '_utils.mjs'), 'export const getSessionUser=()=>null, resolveDB=()=>null, getUserByMcpToken=()=>null;\n')
fs.writeFileSync(path.join(dir, '_apikeys.mjs'), 'export const getUserByApiKey=()=>null, enforceRateLimit=()=>null, ensureApiKeysSchema=()=>null;\n')
fs.writeFileSync(path.join(dir, 'studio/_pricing.mjs'), 'export const MODEL_COST={}, computeCharge=()=>({}), getUsdKrw=async()=>1400, resolveMarkup=async()=>1, resolveRefSurcharge=async()=>0, resolveCnSurcharge=async()=>0;\n')
fs.writeFileSync(path.join(dir, 'payments/prepare.mjs'), 'export const creditPriceFor=async()=>50;\n')
fs.writeFileSync(path.join(dir, 'gen.mjs'), fs.readFileSync('functions/api/generate.js', 'utf8')
  .replace('from "./_utils"', 'from "./_utils.mjs"').replace('from "./_apikeys"', 'from "./_apikeys.mjs"')
  .replace('from "./studio/_pricing"', 'from "./studio/_pricing.mjs"').replace('from "./payments/prepare"', 'from "./payments/prepare.mjs"'))
const { buildSeedancePayload } = await import(path.join(dir, 'gen.mjs'))

const OUT = path.resolve('out')
const CT = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' }
const FAKE_TRANSFORMERS = `
export const env = { allowLocalModels:true, useBrowserCache:true, remotePathTemplate:'', remoteHost:'', backends:{ onnx:{ wasm:{ wasmPaths:'' } } } };
export async function pipeline(task, model, opts){
  const base = env.remoteHost + '/' + model + '/resolve/main/';
  if(!(await fetch(base+'config.json')).ok) throw new Error('config 없음');
  return async function(dataUrl){
    const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=dataUrl; });
    const c=document.createElement('canvas'); c.width=img.width*2; c.height=img.height*2;
    const x=c.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(img,0,0,c.width,c.height);
    return { toCanvas:()=>c };
  };
}`

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const p = u.pathname
  const send = (code, body, ct) => { res.writeHead(code, { 'content-type': ct || 'application/json', 'cache-control': 'no-store' }); res.end(body) }

  if (p === '/models/lib/transformers') return send(200, FAKE_TRANSFORMERS, 'text/javascript')
  if (p.startsWith('/models/')) {
    if (u.searchParams.get('probe') === '1') return send(200, JSON.stringify({ ok: /swin2SR/.test(p), cached: true, bytes: 1234 }))
    if (/config\.json$/.test(p)) return send(200, JSON.stringify({ model_type: 'swin2sr', upscale: 2 }))
    return send(200, 'X', 'application/octet-stream')
  }
  if (p === '/api/admin/selfhost-status') {
    return send(200, JSON.stringify({ ok: true, hasBucket: true, mode: 'strict', lastUpstream: '', total: 34, ready: 34, srTotal: 12, srReady: 12, bytes: 231 * 1048576, missing: [] }))
  }
  if (p === '/api/generate' && req.method === 'POST') {
    const body = await new Promise((r) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => r(s)) })
    const b = JSON.parse(body || '{}')
    if (b.dryRun) return send(200, JSON.stringify({ dryRun: true, provider: b.provider, payload: buildSeedancePayload(b, {}), note: 'No provider API was called.' }))
    return send(200, JSON.stringify({ error: 'test' }))
  }
  if (p.startsWith('/api/')) return send(200, JSON.stringify({ ok: true, enabled: false, users: [], items: [] }))

  let f = path.join(OUT, p.replace(/^\//, '').replace(/\/$/, ''))   // 정적 내보내기는 <경로>.html 형태
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html')
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'
  if (f.startsWith(OUT) && fs.existsSync(f)) return send(200, fs.readFileSync(f), CT[path.extname(f)] || 'application/octet-stream')
  return send(404, 'not found', 'text/plain')
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = 'http://127.0.0.1:' + server.address().port

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
await page.goto(origin + '/adminsunkoh028741_11263/studio-tests/', { waitUntil: 'load' })

const out = []
const ok = (n, c, i) => out.push([n, !!c, i == null ? '' : String(i)])

if (process.env.DEBUG_DUMP) { console.log('--- 본문 ---'); console.log((await page.locator('body').innerText()).slice(0, 1500)); console.log('--- 버튼 ---'); console.log(await page.locator('button').allInnerTexts()); }

// 1) 자체 호스팅 현황이 자동으로 채워지는가
await page.waitForTimeout(1200)
const hostText = await page.locator('text=모델 파일 자체 보유').first().textContent().catch(() => '')
const hostRow = await page.locator('div:has-text("모델 파일 자체 보유")').last().textContent().catch(() => '')
ok('1. 자체 호스팅 현황 자동 조회', /34 \/ 34/.test(hostRow || ''), (hostRow || '').replace(/\s+/g, ' ').slice(0, 60))
ok('   자체 호스팅 전용 모드 표시', /외부에서 받지 않음/.test(await page.content()))

// 2) 업스케일 실행 — 실제 스튜디오 함수를 iframe 으로 호출
await page.waitForTimeout(1500)
await page.getByRole('button', { name: /실행/ }).click()
await page.waitForSelector('text=진짜 초해상 여부', { timeout: 60000 })
const upText = (await page.content())
ok('2. 업스케일 엔진 확인 표시', /Swin2SR/.test(upText), (upText.match(/Swin2SR[^<]*/) || [''])[0].slice(0, 40))
ok('   업스케일 결과 크기 표시', /200×132 → 400×264/.test(upText), (upText.match(/200×132 → [^<·]*/) || [''])[0])
ok('   진짜 초해상으로 판정', /AI 모델이 디테일을 복원/.test(upText))
ok('   외부 서버 호출 0건', /0건 \(우리 서버만 사용/.test(upText), (upText.match(/외부 서버 호출[\s\S]{0,80}/) || [''])[0].replace(/<[^>]*>/g, '').slice(0, 70))
ok('   전/후 이미지 표시', await page.locator('img[alt="결과"]').count() > 0)

// 3) 씨댄스 전송 검증 — 실제 서버 빌더로 확인
await page.getByRole('button', { name: /확인/ }).click()
await page.waitForSelector('text=first_frame 역할로 전송', { timeout: 20000 })
const sdText = await page.content()
ok('3. 첫 프레임이 first_frame 으로 전송', /첫 프레임 이미지 → first_frame 역할로 전송/.test(sdText))
ok('   레퍼런스 2장 함께 전송', /레퍼런스 1번, 레퍼런스 2번 → reference_image/.test(sdText))
ok('   중복 전송 없음', /각자 제 역할로만 전송/.test(sdText))
ok('   3D 변환 지시문 없음', /없음 \(정상\)/.test(sdText))
ok('   실제 생성 안 함(dryRun)', /No provider API was called|크레딧 차감 없음/.test(sdText))

// 4) 첫 프레임 해제 시 레퍼런스 모드로 동작하는가
await page.locator('input[type="checkbox"]').first().uncheck()
await page.getByRole('button', { name: /확인/ }).click()
await page.waitForTimeout(1500)
const sd2 = await page.content()
ok('4. 첫 프레임 미지정 시 레퍼런스 모드', /전송 안 함 \(레퍼런스 모드\)/.test(sd2))

ok('페이지 스크립트 오류 없음', errs.length === 0, errs.slice(0, 2).join(' | ') || '없음')

// SCREENSHOT=경로 를 주면 결과 화면을 이미지로 남긴다(관리자에게 보여줄 용도)
if (process.env.SCREENSHOT) {
  await page.locator('input[type="checkbox"]').first().check()
  await page.getByRole('button', { name: /확인/ }).click()
  await page.waitForTimeout(1200)
  await page.setViewportSize({ width: 1280, height: 1600 })
  await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true })
  console.log('screenshot: ' + process.env.SCREENSHOT)
}

await browser.close(); server.close(); fs.rmSync(dir, { recursive: true, force: true })
let fail = 0
for (const [n, pass, info] of out) { if (!pass) fail++; console.log((pass ? 'PASS ' : 'FAIL ') + n + (info ? '  — ' + info : '')) }
console.log(`\n${out.length - fail}/${out.length} passed`)
process.exit(fail ? 1 : 0)
