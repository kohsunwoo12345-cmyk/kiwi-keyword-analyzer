// 관리자가 '화질 업스케일 요금' 을 직접 고칠 수 있는지 브라우저에서 확인한다.
//  카드 표시 → 금액 입력 → 저장 → 서버 반영 → 화면(카드·표) 동시 갱신까지.
//  실행:  npm run build && npm i -D playwright-core && node scripts/upscale-fee-check.mjs
// 요금 카드가 실제로 뜨고, 입력한 금액이 저장되는지 브라우저에서 확인
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const OUT = path.resolve('out')
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.txt':'text/plain' }
let saved = null
const server = http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://x'), p=u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p==='/api/admin/model-pricing'){
    if(req.method==='POST'){
      const body=await new Promise(r=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>r(s))})
      const b=JSON.parse(body||'{}')
      if(b.action==='set_self_fee') saved={...(saved||{}), [b.model]: b.fee}
      return send(200, JSON.stringify({ok:true}))
    }
    return send(200, JSON.stringify({ ok:true, usdKrw:1460, creditKrw:50, models:[
      { model:'화질 업스케일 (이미지 · 브라우저 초해상)', provider:'업스케일', kind:'image', baseCredits:2, defaultMarkup:1, globalMarkup:0, userMarkup:0, effectiveMarkup:1, effectiveCredits:2, selfFee:(saved?.['화질 업스케일 (이미지 · 브라우저 초해상)'] ?? 100), selfFeeUnit:'장' },
      { model:'화질 업스케일 (영상 · 브라우저 초해상)', provider:'업스케일', kind:'video', baseCredits:6, defaultMarkup:1, globalMarkup:0, userMarkup:0, effectiveMarkup:1, effectiveCredits:6, selfFee:(saved?.['화질 업스케일 (영상 · 브라우저 초해상)'] ?? 30), selfFeeUnit:'초' },
      { model:'Seedance 2.0', provider:'Seedance', kind:'video', baseCredits:9, defaultMarkup:2.5, globalMarkup:0, userMarkup:0, effectiveMarkup:2.5, effectiveCredits:22 },
    ]}))
  }
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ok:true, enabled:false, users:[], items:[], models:[]}))
  let f=path.join(OUT,p.replace(/^\//,'').replace(/\/$/,''))
  if(fs.existsSync(f)&&fs.statSync(f).isDirectory()) f=path.join(f,'index.html')
  if(!fs.existsSync(f)&&fs.existsSync(f+'.html')) f+='.html'
  if(f.startsWith(OUT)&&fs.existsSync(f)) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'})
const pg=await b.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,120)))
await pg.goto(origin+'/adminsunkoh028741_11263/ai-pricing/',{waitUntil:'load'})
await pg.waitForTimeout(1800)
const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])
const txt=await pg.locator('body').innerText()
ok('요금 카드 표시', /화질 업스케일 요금/.test(txt))
ok('이미지 1장당 입력칸', /이미지 1장당/.test(txt))
ok('영상 1초당 입력칸', /영상 1초당/.test(txt))
ok('크레딧 환산 안내', /고객 차감: 2 크레딧/.test(txt), (txt.match(/고객 차감: [^\n]*/)||[''])[0])
ok('회원별 안내 문구', /특정 회원만 다르게/.test(txt))
// 금액 수정 → 저장
const inputs = pg.locator('input[inputmode="numeric"]')
await inputs.first().fill('300')
await inputs.nth(1).fill('50')
await pg.getByRole('button',{name:/저장/}).first().click()
await pg.waitForTimeout(1200)
ok('입력한 금액이 서버에 저장됨', saved && saved['화질 업스케일 (이미지 · 브라우저 초해상)']===300 && saved['화질 업스케일 (영상 · 브라우저 초해상)']===50, JSON.stringify(saved))
const t2=await pg.locator('body').innerText()
ok('저장 후 화면 갱신(300원=6크레딧)', /고객 차감: 6 크레딧/.test(t2), (t2.match(/고객 차감: [^\n]*/)||[''])[0])
ok('표에는 읽기전용 요금 표시', /요금 300원\/장/.test(t2), (t2.match(/요금 [^\n]*/)||[''])[0])
ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')
await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
