// 관리자 "AI 생성 기록" 화면이 금액을 실제로 어떻게 보여주는지 브라우저에서 확인한다.
//  기록을 만들어 넣고, 화면에 뜨는 '계산 내역' 문장이 손으로 계산한 값과 같은지 글자 그대로 대조한다.
//  · 일반 모델: 단가×초 → 원가 → 배수 → 크레딧 까지 끝까지 설명되는가
//  · 자체 기능(업스케일): 원가 0 대신 '서비스 요금 × 수량 × 배수' 로 설명되는가
//  · 무료 편집: 0크레딧이 '무료' 로 표시되는가
//  · 금액이 어긋난 기록은 눈에 띄게 경고가 뜨는가
//  계산은 실제 서버 코드(_pricing.ts explainCost)를 그대로 실행해 만든다 — 스텁이 아니다.
//  실행:  npm run build && npm i -D playwright-core esbuild && node scripts/cost-display-check.mjs
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'

// ── 실제 과금 규칙 로드 ──
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'costdisp-'))
execFileSync('npx', ['esbuild', 'functions/api/studio/_pricing.ts', '--format=esm', '--platform=neutral',
  '--outfile=' + path.join(dir, 'pricing.mjs'), '--log-level=error'], { stdio: 'inherit' })
const P = await import(path.join(dir, 'pricing.mjs'))

// ── 화면에 보여줄 기록을 '실제 계산기' 로 만든다 ──
function mkRow(id, model, kind, units, opts = {}) {
  const rate = opts.rate ?? 1460
  const creditKrw = opts.creditKrw ?? 65
  const c = P.computeCharge({ model, units, kind, audio: !!opts.audio }, rate, opts.markup, creditKrw, opts.fee)
  const cost = P.explainCost({
    model, kind, units, usd: c.usd, usdKrw: rate, costKrw: c.costKrw,
    credits: opts.credits ?? c.credits, revenueKrw: opts.revenueKrw ?? c.revenueKrw,
    markup: c.markup, feeNow: opts.feeNow,
  })
  return {
    id, createdAt: new Date(1700000000000).toISOString(), userId: 'u1', name: '테스트', email: 't@x.com',
    provider: c.provider, model, kind, credits: opts.credits ?? c.credits, costKrw: c.costKrw,
    revenueKrw: opts.revenueKrw ?? c.revenueKrw, usd: c.usd, usdKrw: rate, markup: c.markup,
    prompt: '테스트 기록', refs: [], resultUrl: '', resultKind: kind, cost, provUsage: null,
  }
}

const ITEMS = [
  mkRow('r1', 'Seedance 2.0', 'video', 15, { audio: true, markup: 1, rate: 1460, creditKrw: 65 }),
  mkRow('r2', '화질 업스케일 (이미지 · 브라우저 초해상)', 'image', 1, { markup: 1, creditKrw: 50, feeNow: 100 }),
  mkRow('r3', '화질 업스케일 (영상 · 브라우저 초해상)', 'video', 10, { markup: 1, creditKrw: 50, feeNow: 30 }),
  mkRow('r4', '배경 제거 (브라우저 편집)', 'image', 1, { markup: 1, creditKrw: 50, feeNow: 0 }),
  // 금액이 어긋난 기록(손으로 고쳤거나 옛 규칙) — 경고가 떠야 한다
  mkRow('r5', 'Seedance 2.0', 'video', 5, { markup: 1, creditKrw: 50, credits: 99, revenueKrw: 4950 }),
]

const OUT = path.resolve('out')
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png',
             '.svg':'image/svg+xml', '.json':'application/json', '.woff2':'font/woff2', '.txt':'text/plain' }
const server = http.createServer((req,res)=>{
  const p = new URL(req.url,'http://x').pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p==='/api/admin/ai-generations')
    return send(200, JSON.stringify({ ok:true, todayRate:1460, total:ITEMS.length, limit:60, offset:0, items:ITEMS }))
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ ok:true, user:{ role:'admin' }, items:[] }))
  let f = path.join(OUT, p.replace(/^\//,''))
  if(fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f,'index.html')
  if(!fs.existsSync(f) && fs.existsSync(f+'.html')) f = f+'.html'
  if(f.startsWith(OUT) && fs.existsSync(f) && fs.statSync(f).isFile())
    return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const pg=await b.newPage(); const errs=[]
pg.on('pageerror',e=>errs.push(String(e).slice(0,160)))
await pg.goto(origin+'/adminsunkoh028741_11263/ai-generations',{waitUntil:'domcontentloaded'})
await pg.waitForTimeout(2500)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

const text = (await pg.evaluate(() => document.body.innerText)).replace(/\s+/g,' ')
ok('기록 화면이 떴다', /계산 내역/.test(text), text.slice(0,80))
ok('"편집" 탭이 생겼다', /편집\(자막·색보정 등\)/.test(text), /편집\(자막/.test(text) ? '있음' : '없음')

// 1) 일반 모델 — 원가부터 크레딧까지 끝까지
//    0.062+0.02=0.082 × 15초 = $1.23 · ×1460 = ₩1,796 · 배수 1 · ÷65원 = 27.63크레딧
ok('단가 × 초 가 표시됨', /\$0\.0620 \/ 초 × 15초/.test(text), (text.match(/\$0\.0620[^·]{0,40}/)||[''])[0])
ok('오디오 가산이 따로 표시됨', /오디오 \$0\.3000/.test(text), (text.match(/오디오 \$[\d.]+/)||[''])[0])
ok('원가 원화 환산이 표시됨', /₩1,796/.test(text))
ok('크레딧 계산식이 끝까지 표시됨', /크레딧 ₩1,796 × 배수 1 = ₩1,796 ÷ ₩65\/크레딧 = 27\.63 크레딧/.test(text),
   (text.match(/크레딧 ₩1,796[^✓⚠]*/)||[''])[0])
// 이 사이트는 이모지를 이미지로 바꿔 넣는다 → 글자만 보면 ✓/⚠ 가 빠져 보인다. 표시 자체를 따로 확인한다.
ok('검산 일치 표시', /27\.63 크레딧\s*✓?\s*검산 일치/.test(text), (text.match(/27\.63 크레딧[^미]{0,16}/)||[''])[0])

// 2) 자체 기능(이미지 업스케일) — 원가 0 · 요금 100원 × 1장 = 2크레딧
ok('자체 기능은 제공사 비용 0원이라고 밝힘', /제공사 비용 ₩0 \(고객 컴퓨터에서 처리한 자체 기능\)/.test(text))
ok('요금 × 장수 × 배수 = 크레딧 이 표시됨',
   /크레딧 서비스 요금 ₩100\/장 × 1장 × 배수 1 = ₩100 ÷ ₩50\/크레딧 = 2 크레딧/.test(text),
   (text.match(/서비스 요금 ₩100[^✓⚠]*/)||[''])[0])

// 3) 영상 업스케일 — 30원 × 10초 = 6크레딧
ok('영상 자체 기능은 초 단위로 곱해져 표시됨',
   /서비스 요금 ₩30\/초 × 10초 × 배수 1 = ₩300 ÷ ₩50\/크레딧 = 6 크레딧/.test(text),
   (text.match(/서비스 요금 ₩30[^✓⚠]*/)||[''])[0])

// 4) 무료 편집
ok('무료 기능은 "무료" 라고 표시', /차감 크레딧 0 — 무료로 설정된 기능입니다/.test(text))

// 5) 어긋난 기록 경고 — 손으로 99크레딧으로 바꾼 기록이라 계산값(9.06)과 달라야 한다
ok('금액이 안 맞는 기록에 경고가 뜸', /계산값 9\.06 와 다름/.test(text),
   (text.match(/계산값 [\d.]+ 와 다름/)||[''])[0])
{
  const marks = await pg.evaluate(() => Array.from(document.querySelectorAll('span'))
    .filter(s => /계산값|검산 일치/.test(s.textContent||''))
    .map(s => ({ warn:/amber/.test(s.className),
                 mark:(s.querySelector('img')?.getAttribute('alt')) || (s.textContent||'').trim().slice(0,1) })))
  const okMarks = marks.filter(m=>!m.warn), badMarks = marks.filter(m=>m.warn)
  // 무료 기록(r4)은 크레딧 계산줄 자체가 없다 → 체크 표시는 유료 3건에만 붙는다
  ok('일치한 기록엔 체크 표시', okMarks.length===3 && okMarks.every(m=>m.mark==='✓'), okMarks.map(m=>m.mark).join(''))
  ok('어긋난 기록엔 경고 표시', badMarks.length===1 && badMarks[0].mark==='⚠', badMarks.map(m=>m.mark).join(''))
}

// 경고 테두리(노란 박스)가 어긋난 기록에만 붙는가
const warned = await pg.evaluate(() => Array.from(document.querySelectorAll('div'))
  .filter(d => /^계산 내역/.test((d.innerText||'').trim()) && /rounded-lg border/.test(d.className))
  .map(d => ({ warn: /amber/.test(d.className) })))
ok('노란 경고 상자는 문제 있는 기록에만 붙음',
   warned.length === 5 && warned.filter(w=>w.warn).length === 1,
   `${warned.filter(w=>w.warn).length}건 경고 / 전체 ${warned.length}건`)

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close(); fs.rmSync(dir,{recursive:true,force:true})
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
