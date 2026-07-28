// 화질 업스케일 '노드' 가 실제 캔버스 위에서 동작하는지 확인한다.
//  · 팔레트에 등록됐는가 (DEFS)
//  · 앞 노드(이미지)를 연결하고 버튼을 누르면 정말 커진 결과가 노드에 담기는가
//  · 배율 콤보(2배/4배/5K)가 안내문·실제 결과 크기에 그대로 반영되는가
//  · 입력을 연결하지 않으면 조용히 실패하지 않고 안내가 뜨는가
//  초해상 모델은 이 환경에서 받을 수 없으므로 리샘플 폴백 경로로 검증한다
//  (모델 자체의 '진짜 초해상' 여부는 scripts/real-inference-test.mjs 가 따로 검증한다).
//  실행:  npm i -D playwright-core && node scripts/upscale-node-test.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'

const PUB = path.resolve('public')
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css' }
const server = http.createServer((req,res)=>{
  const p = new URL(req.url,'http://x').pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p.startsWith('/models/')) return send(404,'no','text/plain')      // 초해상 모델 없음 → 리샘플 폴백
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ok:true}))
  const f=path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'})
const pg=await b.newPage(); const errs=[]
pg.on('pageerror',e=>errs.push(String(e).slice(0,160)))
await pg.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await pg.waitForTimeout(1500)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 노드가 팔레트에 등록됐는가
const def = await pg.evaluate(() => {
  const d = window.__cn && window.__cn.DEFS && window.__cn.DEFS.upscale
  if(!d) return null
  return { cat:d.cat, title:d.title, ins:d.ins.length, outs:d.outs.length,
           widgets:d.widgets.map(w=>w.t).join(','), opts:(d.widgets.find(w=>w.k==='upx')||{}).opts }
})
ok('업스케일 노드가 [편집] 팔레트에 등록됨', def && def.cat==='편집', def ? def.cat+' / '+def.title : '없음')
ok('입력 1개 · 출력 1개', def && def.ins===1 && def.outs===1, def && def.ins+'→'+def.outs)
ok('배율 선택지 4개(2배·4배·4K·5K)', def && def.opts && def.opts.length===4, def && def.opts && def.opts.join(' | '))
ok('실행 버튼과 결과칸이 있음', def && /toolout/.test(def.widgets) && /toolbtn/.test(def.widgets), def && def.widgets)

// 2) 배율 라벨 → 숫자 해석과 안내문
const help = await pg.evaluate(() => {
  const c = window.__cn
  const k = (s) => c.upPlanOf(s).key
  return { two:k('2배'), four:k('4배'), fourk:k('4K (가로 3840px)'), fivek:k('5K (긴 변 5120px)'),
           t4k:c.upPlanOf('4K (가로 3840px)').longTarget, t5k:c.upPlanOf('5K (긴 변 5120px)').longTarget,
           h2:c.upScaleHelp('2'), h4k:c.upScaleHelp('4K'), h5:c.upScaleHelp('5K') }
})
ok('2배/4배/4K/5K 를 올바로 구분', help.two==='2' && help.four==='4' && help.fourk==='4K' && help.fivek==='5K',
   `${help.two}/${help.four}/${help.fourk}/${help.fivek}`)
ok('4K·5K 의 목표 크기가 정확함', help.t4k===3840 && help.t5k===5120, `4K=${help.t4k}px · 5K=${help.t5k}px`)
ok('안내문이 실제 결과 크기를 예시로 설명', /2048/.test(help.h2) && /3840/.test(help.h4k) && /5120/.test(help.h5),
   help.h4k.slice(0,34)+'…')

// 3) 실제 그래프: [이미지 결과 노드] → [업스케일 노드] 를 만들고 버튼을 눌러본다
const run = await pg.evaluate(async () => {
  const c = window.__cn, S = c.state
  // 앞 노드: 이미지를 들고 있는 노드(모델 출력과 같은 형태 — w.img)
  const src = c.addNode('bgremove', 100, 100, true)
  const cv = document.createElement('canvas'); cv.width=200; cv.height=120
  const x = cv.getContext('2d'); x.fillStyle='#1050c0'; x.fillRect(0,0,200,120)
  x.fillStyle='#fff'; x.fillRect(80,40,40,40)
  src.w.img = cv.toDataURL('image/png'); src.w.toolKind='image'
  const up = c.addNode('upscale', 400, 100, true)
  up.w.upx = '2배'   // 노드 기본값은 4K — 여기서는 2배를 명시해 확인한다
  S.links.push({ from:src.id, to:up.id, fromPort:'out', toPort:'in' })
  c.render()
  // 연결한 것이 업스케일 노드 입력으로 잡히는가
  const med = c.nodeMedia(src)
  // 실제 버튼 클릭 (노드 DOM 안의 진짜 버튼)
  const el = document.getElementById('nd-'+up.id)
  const btn = el && el.querySelector('[data-tool="upscale"]')
  if(btn) btn.click()
  const t0 = Date.now()
  while(up.w.toolBusy && Date.now()-t0 < 60000) await new Promise(r=>setTimeout(r,200))
  let dim = null
  if(up.w.img){ dim = await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i.width+'x'+i.height); i.onerror=()=>r(null); i.src=up.w.img }) }
  return { medKind: med && med.kind, hadBtn: !!btn, busy: up.w.toolBusy, dim,
           info: up.w.toolInfo||'', fallback: !!up.w.toolFallback, kind: up.w.toolKind,
           chain: c.nodeImgs(up).length }
})
ok('앞 노드의 이미지를 입력으로 인식', run.medKind==='image', String(run.medKind))
ok('노드 안에 실행 버튼이 그려짐', run.hadBtn)
ok('버튼 클릭으로 업스케일이 끝남', run.busy===false && !!run.dim, run.dim||'결과 없음')
ok('2배 요청 → 실제 2배(200×120 → 400×240)', run.dim==='400x240', run.dim)
ok('결과가 이미지로 기록됨', run.kind==='image', String(run.kind))
ok('모델이 없으면 숨기지 않고 단순 확대라고 표시', run.fallback===true && /단순 확대/.test(run.info), run.info)
ok('결과가 다음 노드로 이어짐(레퍼런스 연결 가능)', run.chain===1, run.chain+'장')

// 4) 4배 · 5K 도 요청한 크기대로 나오는가
const scales = await pg.evaluate(async () => {
  const c = window.__cn, S = c.state
  async function once(label, w, h){
    const src = c.addNode('bgremove', 0, 0, true)
    const cv = document.createElement('canvas'); cv.width=w; cv.height=h
    const x = cv.getContext('2d'); x.fillStyle='#207040'; x.fillRect(0,0,w,h)
    src.w.img = cv.toDataURL('image/png'); src.w.toolKind='image'
    const up = c.addNode('upscale', 0, 0, true); up.w.upx = label
    S.links.push({ from:src.id, to:up.id, fromPort:'out', toPort:'in' })
    c.render()
    document.getElementById('nd-'+up.id).querySelector('[data-tool="upscale"]').click()
    const t0=Date.now(); while(up.w.toolBusy && Date.now()-t0<90000) await new Promise(r=>setTimeout(r,200))
    if(!up.w.img) return null
    return await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i.width+'x'+i.height); i.onerror=()=>r(null); i.src=up.w.img })
  }
  return { four: await once('4배', 100, 100), fourk: await once('4K (가로 3840px)', 960, 540),
           fivek: await once('5K (긴 변 5120px)', 640, 360) }
})
ok('4배 요청 → 실제 4배(100×100 → 400×400)', scales.four==='400x400', String(scales.four))
ok('4K 요청 → 가로 3840px(960×540 → 3840×2160)', scales.fourk==='3840x2160', String(scales.fourk))
ok('5K 요청 → 긴 변 5120px(640×360 → 5120×2880)', scales.fivek==='5120x2880', String(scales.fivek))

// 5) 입력을 연결하지 않으면 조용히 실패하지 않고 안내가 떠야 한다
const guard = await pg.evaluate(async () => {
  const c = window.__cn
  const up = c.addNode('upscale', 0, 0, true); c.render()
  document.getElementById('nd-'+up.id).querySelector('[data-tool="upscale"]').click()
  await new Promise(r=>setTimeout(r,300))
  const t = document.getElementById('toast')
  return { busy: up.w.toolBusy, img: !!up.w.img, toast: t ? (t.textContent||'').trim().slice(0,60) : '' }
})
ok('입력 없이 실행하면 안내 후 중단(멈춘 채 남지 않음)', !guard.busy && !guard.img, `busy=${guard.busy}`)
ok('안내 문구가 뜸', /연결/.test(guard.toast), guard.toast||'(없음)')

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
