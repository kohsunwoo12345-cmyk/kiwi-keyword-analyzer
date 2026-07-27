// 새 편집 노드(배경 제거 · 비율 맞추기)가 실제로 동작하는지 브라우저에서 확인한다.
//  · 비율 맞추기는 순수 캔버스 연산이라 그대로 실행해 결과 크기를 검증
//  · 배경 제거는 MediaPipe 세그멘터를 스텁으로 끼워 합성 로직(알파 적용)을 검증
//  실행:  npm i -D playwright-core && node scripts/edit-nodes-test.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const PUB = path.resolve('public')
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css' }
const server = http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x'), p=u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p==='/models/lib/vision') return send(200, `
    export const FilesetResolver = { forVisionTasks: async () => ({}) };
    export const ImageSegmenter = { createFromOptions: async () => ({
      segment(canvas){
        // 가운데 세로 절반을 '인물' 로 보는 가짜 마스크
        const w=canvas.width, h=canvas.height, a=new Float32Array(w*h);
        for(let y=0;y<h;y++) for(let x=0;x<w;x++) a[y*w+x] = (x>w*0.25 && x<w*0.75) ? 1 : 0;
        return { confidenceMasks:[{ width:w, height:h, getAsFloat32Array:()=>a, close(){} }] };
      }
    })};`, 'text/javascript')
  if(p.startsWith('/models/')) return send(404,'no','text/plain')
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ok:true}))
  const f=path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'})
const pg=await b.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,140)))
await pg.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await pg.waitForTimeout(1200)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])
// 노드 정의가 팔레트에 등록됐는가
const defs = await pg.evaluate(() => {
  const el = document.createElement('div')
  return { has: typeof window.__cn === 'object' }
})
ok('스튜디오 정상 로드', defs.has)

// 비율 맞추기 — 가로 이미지를 9:16 으로
const fit = await pg.evaluate(async () => {
  const c=document.createElement('canvas'); c.width=1920; c.height=1080
  const x=c.getContext('2d'); x.fillStyle='#2050a0'; x.fillRect(0,0,1920,1080)
  x.fillStyle='#fff'; x.fillRect(860,440,200,200)
  const src=c.toDataURL('image/png')
  const r1=await window.__cn.fitToRatio(src,'9:16 (릴스·쇼츠)','꽉 채우기(가장자리 잘림)')
  const r2=await window.__cn.fitToRatio(src,'1:1 (인스타 피드)','전체 보이기(여백 생김)')
  const load=(u)=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.src=u})
  const [i1,i2]=await Promise.all([load(r1.url),load(r2.url)])
  return { a:i1.width+'x'+i1.height, ai:r1.info, b:i2.width+'x'+i2.height, bi:r2.info }
})
// 원본 긴 변(1920)을 기준으로 만든다 — 없는 화소를 지어내지 않도록 원본보다 키우지 않는다
ok('9:16 세로 규격으로 변환(1080×1920)', fit.a==='1080x1920', fit.a+' · '+fit.ai)
ok('1:1 정사각 규격으로 변환(1920×1920)', fit.b==='1920x1920', fit.b+' · '+fit.bi)

// 배경 제거 — 인물 영역만 남고 바깥은 투명해야 한다
const bg = await pg.evaluate(async () => {
  const c=document.createElement('canvas'); c.width=200; c.height=200
  const x=c.getContext('2d'); x.fillStyle='#c04030'; x.fillRect(0,0,200,200)
  const r=await window.__cn.removeBackground(c.toDataURL('image/png'),'투명하게',0)
  const img=await new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.src=r.url})
  const o=document.createElement('canvas'); o.width=img.width; o.height=img.height
  o.getContext('2d').drawImage(img,0,0)
  const d=o.getContext('2d').getImageData(0,0,img.width,img.height).data
  const at=(px,py)=>d[(py*img.width+px)*4+3]
  return { info:r.info, edge:at(5, img.height>>1), center:at(img.width>>1, img.height>>1) }
})
ok('배경(바깥)은 투명해짐', bg.edge < 30, 'alpha=' + bg.edge)
ok('인물(가운데)은 남아 있음', bg.center > 200, 'alpha=' + bg.center)
ok('결과 정보 표시', /×/.test(bg.info), bg.info)
ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
