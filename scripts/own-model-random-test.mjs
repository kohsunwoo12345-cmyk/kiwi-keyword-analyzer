// 자체 초해상 모델 — '임의(랜덤)' 검증.
//
//  앞선 검사들은 내가 고른 그림·크기로만 봤다. 그러면 '그 경우에만 맞는' 코드도 통과한다.
//  그래서 이 검사는 크기·내용·배율을 매번 무작위로 뽑아서 돌린다.
//   · 크기   : 1×1 같은 초소형 ~ 1920×1080, 홀수, 아주 가로로 긴 것, 타일 경계에 딱 걸리는 것
//   · 내용   : 단색 / 그라디언트 / 선·격자 / 잡음 / 글자 / 원 / 투명 배경
//   · 배율   : 2배 / 4배 / 4K(3840) / 5K(5120)
//
//  씨앗(seed)을 찍어두므로, 실패하면 SEED=<숫자> 로 똑같은 경우를 다시 재현할 수 있다.
//
//  판정 항목
//   1) 출력 크기가 규칙대로 정확한가 (기대값은 이 파일에서 따로 계산 — 코드 베끼기 아님)
//   2) 자체 모델이 실제로 쓰였는가 (외부 모델 경로는 전부 막아둔다)
//   3) 결과가 검게/하얗게 날아가지 않는가 (단순 확대와 밝기 비교)
//   4) 매끈한 그림에 타일 이음매 줄이 생기지 않는가 (단순 확대를 대조군으로)
//   5) 같은 입력을 두 번 넣으면 완전히 같은 결과가 나오는가 (재현성)
//   6) 투명 배경이 살아남는가
//   7) 흐린 그림을 되살렸을 때 단순 확대보다 원본에 가까운가 (PSNR)
//   8) 영상도 정확히 그 크기로 나오는가
//
//  실행: node scripts/own-model-random-test.mjs        (SEED=123 로 고정 가능, N=30 으로 개수 조절)
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'

const PUB = path.resolve('public')
const OWN = path.join(PUB, 'models-own/bygency-sr-x2/model.onnx')
const ORT_DIR = path.resolve('node_modules/onnxruntime-web/dist')
if (!fs.existsSync(OWN)) { console.error('자체 모델 없음: python3 scripts/train-sr-model.py'); process.exit(2) }

const SEED = Number(process.env.SEED || (Date.now() % 1e9))
const N = Number(process.env.N || 24)
console.log(`씨앗(SEED)=${SEED} · 무작위 경우 ${N}개  ← 실패 시 SEED=${SEED} 로 그대로 재현됩니다\n`)

// 씨앗 기반 난수 — 매번 다른 경우를 뽑되, 실패하면 똑같이 재현할 수 있게 한다
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t
  return ((t^t>>>14)>>>0)/4294967296 } }
const rnd = mulberry32(SEED)
const ri = (lo,hi)=>lo+Math.floor(rnd()*(hi-lo+1))
const pick = (a)=>a[Math.floor(rnd()*a.length)]

// ── 무작위 경우 만들기 ──
const KINDS = ['flat','grad','lines','noise','text','circles','alpha']
const SMOOTH = new Set(['flat','grad'])
const cases = []
for(let i=0;i<N;i++){
  const shape = pick(['tiny','odd','small','tile','wide','tall','mid','big'])
  let w,h
  if(shape==='tiny'){ w=ri(1,8);   h=ri(1,8) }
  else if(shape==='odd'){ w=ri(9,99)*2+1; h=ri(4,60)*2+1 }        // 반드시 홀수
  else if(shape==='small'){ w=ri(10,90); h=ri(10,90) }
  else if(shape==='tile'){ w=pick([115,116,117,191,192,193,231,232,233]); h=ri(60,200) }  // 타일 경계 근처
  else if(shape==='wide'){ w=ri(500,1200); h=ri(3,40) }
  else if(shape==='tall'){ w=ri(3,40);     h=ri(400,900) }
  else if(shape==='mid'){ w=ri(200,700);   h=ri(150,500) }
  else { w=pick([1280,1600,1920]); h=pick([720,900,1080]) }
  const mode = pick([{scale:2},{scale:2},{scale:4},{longTarget:3840},{longTarget:5120}])
  cases.push({ i, w, h, kind: pick(KINDS), shape, mode, seed: ri(1,1e9) })
}
// 어떤 검사는 특정 종류의 그림이 있어야만 뜻이 있다(이음매=매끈하고 큰 그림, 투명도=투명 그림).
//  씨앗 운에 맡기면 그 종류가 한 번도 안 뽑혀 '검사한 게 0건' 이 된다 → 반드시 넣는다.
for(const k of ['grad','flat']) cases.push({ i: cases.length, w: ri(200,900), h: ri(120,600),
  kind: k, shape: 'seam', mode: pick([{scale:2},{scale:4},{longTarget:3840}]), seed: ri(1,1e9) })
cases.push({ i: cases.length, w: ri(60,400), h: ri(60,300),
  kind: 'alpha', shape: 'alpha', mode: pick([{scale:2},{scale:4}]), seed: ri(1,1e9) })
// 아주 큰 사진(수천만 픽셀)은 캔버스·메모리 한계에 걸린다. 그때 터지지 않고 규칙대로
//  줄여서 내놓는지 반드시 확인한다(사용자가 DSLR 사진을 그대로 올리는 경우).
cases.push({ i: cases.length, w: pick([4000,5000,6000]), h: pick([3000,3400,4000]),
  kind: pick(['circles','lines']), shape: '초대형', mode: pick([{scale:2},{scale:4},{longTarget:5120}]), seed: ri(1,1e9) })

// ── 기대 출력 크기를 '규칙' 으로 따로 계산한다 (스튜디오 코드를 베끼지 않고 사양대로) ──
//  · 배율 지정: 원본 × 배율
//  · 긴 변 목표(4K/5K): 긴 변이 그 값이 되도록. 단 8배가 상한.
//  · 캔버스 한계: 한 변 8192px, 총 3600만 픽셀
function expectDim(w,h,mode){
  let eff = mode.scale != null ? mode.scale : Math.max(1, Math.min(8, mode.longTarget/Math.max(w,h)))
  let tw = Math.max(1, Math.round(w*eff)), th = Math.max(1, Math.round(h*eff))
  const clamp = Math.min(1, 8192/Math.max(tw,th), Math.sqrt(36e6/Math.max(1,tw*th)))
  if(clamp<1){ tw=Math.max(1,Math.round(tw*clamp)); th=Math.max(1,Math.round(th*clamp)) }
  return [tw,th]
}

// ── 서버: 외부 모델은 전부 차단 → 우리 모델만으로 결과가 나와야 한다 ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ownrnd-'))
const ORT_ESM = path.join(tmp, 'ortweb.mjs')
execFileSync('npx', ['esbuild','onnxruntime-web','--bundle','--format=esm','--platform=browser',
  '--outfile='+ORT_ESM,'--log-level=error'], { stdio:'inherit' })

const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css', '.onnx':'application/octet-stream', '.json':'application/json' }
const server = http.createServer((req,res)=>{
  const u = new URL(req.url,'http://x'); const p = u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p === '/models/lib/ortweb') return send(200, fs.readFileSync(ORT_ESM), 'text/javascript')
  if(p.startsWith('/models/ortw/')){
    const f = path.join(ORT_DIR, path.basename(p))
    return fs.existsSync(f) ? send(200, fs.readFileSync(f), 'application/wasm') : send(404,'no','text/plain')
  }
  if(p.startsWith('/models/')){
    if(u.searchParams.get('probe')==='1') return send(200, JSON.stringify({ ok:false }))
    return send(502,'차단(자체 모델만 검증)','text/plain')
  }
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ ok:true }))
  const f = path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage(); const errs=[]; const reqs=[]
page.on('pageerror', e=>errs.push(String(e).slice(0,200)))
page.on('request', r=>reqs.push(r.url()))
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1500)

// 그림 그리기 + 재기 — 브라우저 안에서 쓸 도구들을 한 번만 심어둔다
await page.addScriptTag({ content: `
window.__rt = {
  lcg(s){ return function(){ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff } },
  draw(w,h,kind,seed,stride){
    const c=document.createElement('canvas'); c.width=w; c.height=h
    const x=c.getContext('2d'); const R=window.__rt.lcg(seed)
    if(kind==='alpha'){ x.clearRect(0,0,w,h) } else { x.fillStyle='#20304a'; x.fillRect(0,0,w,h) }
    if(kind==='flat'){ x.fillStyle='rgb('+(40+Math.floor(R()*160))+','+(40+Math.floor(R()*160))+','+(40+Math.floor(R()*160))+')'; x.fillRect(0,0,w,h) }
    else if(kind==='grad'){ const g=x.createLinearGradient(0,0,w,h*R())
      g.addColorStop(0,'#204070'); g.addColorStop(1,'#c0a070'); x.fillStyle=g; x.fillRect(0,0,w,h) }
    else if(kind==='lines'){ const g=x.createLinearGradient(0,0,w,h); g.addColorStop(0,'#12306e'); g.addColorStop(1,'#d8b070')
      x.fillStyle=g; x.fillRect(0,0,w,h); x.strokeStyle='#fff'; x.lineWidth=1
      const st=stride||(3+Math.floor(R()*20))
      for(let i=st;i<w;i+=st){ x.beginPath(); x.moveTo(i+0.5,0); x.lineTo(i+0.5,h); x.stroke() }
      for(let i=st;i<h;i+=st){ x.beginPath(); x.moveTo(0,i+0.5); x.lineTo(w,i+0.5); x.stroke() } }
    else if(kind==='noise'){ const d=x.createImageData(w,h)
      for(let i=0;i<d.data.length;i+=4){ const v=Math.floor(R()*256)
        d.data[i]=v; d.data[i+1]=Math.floor(R()*256); d.data[i+2]=Math.floor(R()*256); d.data[i+3]=255 }
      x.putImageData(d,0,0) }
    else if(kind==='text'){ const g=x.createLinearGradient(0,0,w,0); g.addColorStop(0,'#1a2b4a'); g.addColorStop(1,'#6a4a2a')
      x.fillStyle=g; x.fillRect(0,0,w,h); x.fillStyle='#fff'
      const fs=Math.max(8,Math.min(40,Math.floor(h/4))); x.font='bold '+fs+'px sans-serif'
      for(let i=0;i<4;i++) x.fillText('BYGENCY 자체모델 '+Math.floor(R()*9000), 4, fs*(i+1)) }
    else if(kind==='circles'){ const g=x.createRadialGradient(w*0.4,h*0.4,2,w*0.5,h*0.5,Math.max(w,h)*0.7)
      g.addColorStop(0,'#f2e2c0'); g.addColorStop(0.5,'#a4785a'); g.addColorStop(1,'#22304a')
      x.fillStyle=g; x.fillRect(0,0,w,h)
      for(let i=0;i<12;i++){ x.strokeStyle='rgba(255,255,255,'+(0.3+R()*0.6)+')'; x.lineWidth=1+R()*2
        x.beginPath(); x.arc(R()*w,R()*h,2+R()*Math.max(3,Math.min(w,h)/3),0,Math.PI*2); x.stroke() } }
    else if(kind==='alpha'){ x.fillStyle='#e04030'
      x.beginPath(); x.arc(w/2,h/2,Math.max(1,Math.min(w,h)*0.35),0,Math.PI*2); x.fill() }
    return c
  },
  load(u){ return new Promise((k,n)=>{ const i=new Image(); i.onload=()=>k(i); i.onerror=()=>n(new Error('load')); i.src=u }) },
  toCanvas(img){ const c=document.createElement('canvas'); c.width=img.width||img.naturalWidth; c.height=img.height||img.naturalHeight
    c.getContext('2d').drawImage(img,0,0); return c },
  // 매끈한 그림에서 '이웃 열/행과의 차이' 최대값 — 이음매가 있으면 그 자리만 크게 튄다
  seam(d,w,h){
    const lum=i=>0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]
    let mx=0, at=-1
    if(h>6) for(let x=1;x<w;x++){ let s=0
      for(let y=2;y<h-2;y++) s+=Math.abs(lum((y*w+x)*4)-lum((y*w+x-1)*4))
      s/=(h-4); if(s>mx){ mx=s; at='x='+x } }
    if(w>6) for(let y=1;y<h;y++){ let s=0
      for(let x=2;x<w-2;x++) s+=Math.abs(lum((y*w+x)*4)-lum(((y-1)*w+x)*4))
      s/=(w-4); if(s>mx){ mx=s; at='y='+y } }
    return { max:Math.round(mx*100)/100, at }
  },
  // 평균 밝기 — '실제로 보이는 색' 으로 잰다(흰 바탕에 올려놓은 상태).
  //  투명한 점의 색값은 의미가 없으므로 그대로 비교하면 엉뚱한 결과가 나온다.
  mean(d){ let r=0,g=0,b=0,a=0,n=d.length/4
    for(let i=0;i<d.length;i+=4){ const t=d[i+3]/255, u=255*(1-t)
      r+=d[i]*t+u; g+=d[i+1]*t+u; b+=d[i+2]*t+u; a+=d[i+3] }
    return [r/n,g/n,b/n,a/n] },
  psnr(a,b){ let se=0,n=0
    for(let i=0;i<a.length;i+=4){ for(let k=0;k<3;k++){ const d=a[i+k]-b[i+k]; se+=d*d; n++ } }
    const m=se/Math.max(1,n); return m<=0?99:Math.round(10*Math.log10(65025/m)*100)/100 }
}
`})

// ── 경우별 실행 ──
const results = []
for(const c of cases){
  const [ew,eh] = expectDim(c.w,c.h,c.mode)
  const r = await page.evaluate(async (cfg) => {
    const T = window.__rt
    const src = T.draw(cfg.w, cfg.h, cfg.kind, cfg.seed)
    const url = src.toDataURL('image/png')
    const opts = cfg.mode.longTarget ? { longTarget: cfg.mode.longTarget } : undefined
    const t0 = performance.now()
    let res
    try { res = await window.__cn.upscaleImageURL(url, cfg.mode.scale || 4, opts) }
    catch(e){ return { error: String(e && e.message || e).slice(0,120) } }
    const ms = Math.round(performance.now()-t0)
    const img = await T.load(res.url)
    const oc = T.toCanvas(img), ox = oc.getContext('2d')
    const od = ox.getImageData(0,0,oc.width,oc.height).data
    // 대조군: 같은 크기로 단순 확대한 것
    const cc = document.createElement('canvas'); cc.width=oc.width; cc.height=oc.height
    const ccx = cc.getContext('2d'); ccx.imageSmoothingEnabled=true; ccx.imageSmoothingQuality='high'
    ccx.drawImage(src,0,0,oc.width,oc.height)
    const cd = ccx.getImageData(0,0,oc.width,oc.height).data
    const out = { ms, w:oc.width, h:oc.height, engine:res.engine||'', fallback:!!res.fallback,
                  note:res.note||'', mean:T.mean(od), ctrlMean:T.mean(cd) }
    // 이음매는 '원본이 충분히 클 때' 만 뜻이 있다. 3×6 짜리를 8배로 늘리면 이웃 칸 차이가
    //  이음매가 아니라 원래 그림의 계단이라, 이 지표로는 아무것도 판단할 수 없다.
    if(cfg.smooth && cfg.w>=32 && cfg.h>=32){ out.seam=T.seam(od,oc.width,oc.height); out.ctrlSeam=T.seam(cd,oc.width,oc.height) }
    if(cfg.kind==='alpha'){
      // 절대값이 아니라 '단순 확대한 것과 같은 투명도인가' 로 본다.
      //  3×3 같은 초소형 그림은 원본부터 가장자리가 반투명이라 절대값 기준은 뜻이 없다.
      const at=(d,px,py)=>{ const X=Math.max(0,Math.min(oc.width-1,px)), Y=Math.max(0,Math.min(oc.height-1,py))
        return d[(Y*oc.width+X)*4+3] }
      out.alphaCorner=at(od,0,0);                       out.ctrlCorner=at(cd,0,0)
      out.alphaCenter=at(od,oc.width>>1,oc.height>>1);  out.ctrlCenter=at(cd,oc.width>>1,oc.height>>1)
    }
    if(cfg.repeat){                                   // 같은 입력 두 번 → 완전히 같아야 한다
      const r2 = await window.__cn.upscaleImageURL(url, cfg.mode.scale || 4, opts)
      out.same = (r2.url === res.url)
    }
    return out
  }, { ...c, smooth: SMOOTH.has(c.kind), repeat: c.i % 5 === 0 })
  results.push({ c, ew, eh, r })
  const tag = `#${String(c.i).padStart(2,'0')} ${c.w}×${c.h} ${c.kind}/${c.shape} ${c.mode.scale?c.mode.scale+'배':c.mode.longTarget+'px'}`
  console.log(`${tag}  →  ${r.error ? '오류 '+r.error : r.w+'×'+r.h+'  '+r.engine+'  '+r.ms+'ms'}`)
}

// ── 판정 ──
const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])
const bad = (fn) => results.filter(fn).map(x=>`#${x.c.i} ${x.c.w}×${x.c.h} ${x.c.kind} ${x.c.mode.scale?x.c.mode.scale+'배':x.c.mode.longTarget}`)

ok(`${N}개 경우가 오류 없이 끝남`, results.every(x=>!x.r.error),
   bad(x=>x.r.error).slice(0,3).join(' , ') || '없음')

const dimBad = results.filter(x=>!x.r.error && (x.r.w!==x.ew || x.r.h!==x.eh))
ok('출력 크기가 규칙대로 정확 (전 경우)', dimBad.length===0,
   dimBad.length ? dimBad.slice(0,3).map(x=>`#${x.c.i} ${x.c.w}×${x.c.h}→${x.r.w}×${x.r.h}(기대 ${x.ew}×${x.eh})`).join(' , ')
                 : `${results.length}건 모두 일치`)

// 원본이 이미 목표보다 큰 경우는 '리사이즈' 가 정답 — 그 외에는 반드시 자체 모델
const srCases = results.filter(x=>!x.r.error && !/리사이즈/.test(x.r.engine))
const notOwn = srCases.filter(x=>!/BYGENCY/.test(x.r.engine) || x.r.fallback)
ok('초해상이 돈 경우는 전부 자체 모델', notOwn.length===0,
   notOwn.length ? notOwn.slice(0,3).map(x=>`#${x.c.i} ${x.r.engine}`).join(' , ') : `${srCases.length}건 모두 BYGENCY`)

const bright = results.filter(x=>!x.r.error).filter(x=>{
  for(let k=0;k<3;k++) if(Math.abs(x.r.mean[k]-x.r.ctrlMean[k])>12) return true
  return false })
ok('결과가 검게/하얗게 날아가지 않음 (단순 확대와 밝기 비교)', bright.length===0,
   bright.length ? bright.slice(0,3).map(x=>`#${x.c.i} ${x.r.mean.map(v=>Math.round(v)).join('/')} vs ${x.r.ctrlMean.map(v=>Math.round(v)).join('/')}`).join(' , ')
                 : `평균 밝기 차이 최대 ${Math.max(...results.filter(x=>!x.r.error).map(x=>Math.max(...[0,1,2].map(k=>Math.abs(x.r.mean[k]-x.r.ctrlMean[k]))))).toFixed(1)}`)

// 색은 0~255 정수로만 저장된다 → 어떤 계산이든 이웃 사이에 1단계 차이는 날 수 있다.
//  단색 그림에서는 단순 확대가 오차 0 이라, 그 1단계를 '이음매' 로 몰아붙이면 부당하다.
//  그래서 '1단계' 를 바닥으로 깔고, 그보다 크게 튈 때만 이음매로 본다.
const smoothCases = results.filter(x=>x.r.seam)
const seamBad = smoothCases.filter(x=> x.r.seam.max > Math.max(x.r.ctrlSeam.max*1.35 + 0.2, 1.0))
ok('매끈한 그림에 이음매 줄이 없음', smoothCases.length>0 && seamBad.length===0,
   seamBad.length ? seamBad.slice(0,3).map(x=>`#${x.c.i} ${x.r.seam.max} vs ${x.r.ctrlSeam.max} (${x.r.seam.at})`).join(' , ')
                  : `${smoothCases.length}건 · 최악 ${Math.max(...smoothCases.map(x=>x.r.seam.max)).toFixed(2)} vs 단순확대 ${Math.max(...smoothCases.map(x=>x.r.ctrlSeam.max)).toFixed(2)}`)

// 위 지표보다 훨씬 엄격한 직접 확인 — 단색을 넣으면 결과도 단색이어야 한다.
//  이음매·테두리 줄이 조금이라도 있으면 여기서 큰 값으로 잡힌다.
const flat = await page.evaluate(async () => {
  const worst = []
  for(const [w,h,sc,lt] of [[400,120,2,0],[191,141,2,0],[76,30,4,3840],[980,29,4,3840],[137,509,4,5120]])
  for(const col of [[96,132,171],[7,250,3],[250,7,200]]){
    const c=document.createElement('canvas'); c.width=w; c.height=h
    const x=c.getContext('2d'); x.fillStyle='rgb('+col.join(',')+')'; x.fillRect(0,0,w,h)
    const res=await window.__cn.upscaleImageURL(c.toDataURL('image/png'), sc, lt?{longTarget:lt}:undefined)
    const img=await window.__rt.load(res.url)
    const o=window.__rt.toCanvas(img)
    const d=o.getContext('2d').getImageData(0,0,o.width,o.height).data
    let mx=0
    for(let i=0;i<d.length;i+=4) for(let k=0;k<3;k++){ const e=Math.abs(d[i+k]-col[k]); if(e>mx) mx=e }
    worst.push({ case:`${w}×${h} ${lt||sc+'배'}`, col:col.join(','), dev:mx })
  }
  return worst
})
const flatBad = flat.filter(f=>f.dev>2)
ok('단색을 넣으면 단색이 나옴 (테두리·이음매 줄 없음)', flatBad.length===0,
   flatBad.length ? flatBad.slice(0,3).map(f=>`${f.case} 색${f.col} ${f.dev}/255`).join(' , ')
                  : `${flat.length}건 · 최대 벗어남 ${Math.max(...flat.map(f=>f.dev))}/255 (눈에 보이지 않는 수준)`)

const rep = results.filter(x=>x.r.same!==undefined)
ok('같은 입력 → 같은 결과 (재현성)', rep.length>0 && rep.every(x=>x.r.same===true),
   `${rep.filter(x=>x.r.same).length}/${rep.length}건 완전 일치`)

const alphaC = results.filter(x=>x.r.alphaCenter!==undefined)
const alphaBad = alphaC.filter(x=> Math.abs(x.r.alphaCorner-x.r.ctrlCorner)>10 || Math.abs(x.r.alphaCenter-x.r.ctrlCenter)>10
                                || !(x.r.alphaCenter > x.r.alphaCorner))
ok('투명 배경이 살아남음 (단순 확대와 같은 투명도)', alphaC.length>0 && alphaBad.length===0,
   alphaBad.length ? alphaBad.slice(0,3).map(x=>`#${x.c.i} 모서리 ${x.r.alphaCorner}/${x.r.ctrlCorner} 가운데 ${x.r.alphaCenter}/${x.r.ctrlCenter}`).join(' , ')
                   : `${alphaC.length}건 · 모서리·가운데 모두 단순 확대와 10 이내`)

// ── 화질: 무작위 크기·내용으로 흐리게 만든 뒤 되살려 원본과 대조 ──
const qCases = []
for(let i=0;i<6;i++){ const kind=pick(['lines','text','circles','grad'])
  qCases.push({ w: ri(120,420)*2, h: ri(80,260)*2, kind, seed: ri(1,1e9), stride: kind==='lines'? ri(2,24) : 0 }) }
const q = []
for(const qc of qCases){
  const r = await page.evaluate(async (cfg) => {
    const T = window.__rt
    const truth = T.draw(cfg.w, cfg.h, cfg.kind, cfg.seed, cfg.stride)
    const half = document.createElement('canvas'); half.width=cfg.w/2; half.height=cfg.h/2
    const hx=half.getContext('2d'); hx.imageSmoothingEnabled=true; hx.imageSmoothingQuality='high'
    hx.drawImage(truth,0,0,half.width,half.height)
    const deg = half.toDataURL('image/jpeg', 0.7)
    const res = await window.__cn.upscaleImageURL(deg, 2)
    const [ti,si,di] = await Promise.all([T.load(truth.toDataURL('image/png')), T.load(res.url), T.load(deg)])
    const px=(img)=>{ const c=document.createElement('canvas'); c.width=cfg.w; c.height=cfg.h
      const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'
      x.drawImage(img,0,0,cfg.w,cfg.h); return x.getImageData(0,0,cfg.w,cfg.h).data }
    const t=px(ti)
    return { sr:T.psnr(t,px(si)), plain:T.psnr(t,px(di)), engine:res.engine }
  }, qc)
  q.push({ qc, r })
  console.log(`화질 ${qc.w}×${qc.h} ${qc.kind}${qc.stride?'(간격'+qc.stride+'px)':''}: 단순확대 ${r.plain} dB → 자체 모델 ${r.sr} dB (${(r.sr-r.plain>=0?'+':'')}${(r.sr-r.plain).toFixed(2)})`)
}
// 초해상은 '잃어버린 디테일' 을 되살리는 일이다. 순수한 그라디언트에는 되살릴 디테일이 없어
//  단순 확대와 사실상 동점이 나온다(둘 다 45dB 안팎 = 눈으로 구분 불가). 그래서 기준을 나눈다.
//   · 선·글자·무늬가 있는 그림 → 반드시 단순 확대보다 좋아야 한다
//   · 매끈한 그라디언트       → 최소한 나빠지지는 않아야 한다(0.25dB 이내)
//  · 간격 4px 미만의 촘촘한 격자 → 절반으로 줄이는 순간 무늬 자체가 사라진다(물리적 한계).
//    되살릴 원본이 남아 있지 않으므로 어떤 모델도 이길 수 없다. 여기선 '나빠지지만 않으면' 된다.
const subNyquist = (x)=> x.qc.kind==='lines' && x.qc.stride>0 && x.qc.stride<4
const qDetail = q.filter(x=>x.qc.kind!=='grad' && !subNyquist(x))
const qSmooth = q.filter(x=>x.qc.kind==='grad' || subNyquist(x))
const qBad = qDetail.filter(x=>!(x.r.sr > x.r.plain))
ok('디테일 있는 무작위 그림 전부에서 단순 확대보다 원본에 가까움', qDetail.length>0 && qBad.length===0,
   qBad.length ? qBad.map(x=>`${x.qc.w}×${x.qc.h} ${x.qc.kind} ${x.r.sr} vs ${x.r.plain}`).join(' , ')
               : `${qDetail.length}건 · 평균 +${(qDetail.reduce((s,x)=>s+x.r.sr-x.r.plain,0)/Math.max(1,qDetail.length)).toFixed(2)} dB`)
const qsBad = qSmooth.filter(x=> x.r.sr < x.r.plain - 0.25)
ok('되살릴 것이 없는 그림(매끈한 그라디언트·초촘촘 격자)에서도 손해 보지 않음', qsBad.length===0,
   qsBad.length ? qsBad.map(x=>`${x.qc.w}×${x.qc.h} ${x.r.sr} vs ${x.r.plain}`).join(' , ')
                : qSmooth.length ? `${qSmooth.length}건 · 최악 ${Math.min(...qSmooth.map(x=>x.r.sr-x.r.plain)).toFixed(2)} dB` : '해당 없음')

// ── 선 간격을 촘촘한 것부터 넓은 것까지 훑어, 어디서 이기고 어디서 지는지 표로 남긴다 ──
//  숫자를 감추지 않기 위한 검사다. 간격 4px 이상(=절반으로 줄여도 무늬가 남는 범위)에서는
//  전부 이겨야 하고, 그 아래는 물리적으로 되살릴 수 없어 '크게 지지만 않으면' 된다.
const sweep = []
for(const st of [2,3,4,6,10,20]){
  const r = await page.evaluate(async (cfg) => {
    const T = window.__rt
    const truth = T.draw(480, 320, 'lines', 12345, cfg.st)
    const half = document.createElement('canvas'); half.width=240; half.height=160
    const hx=half.getContext('2d'); hx.imageSmoothingEnabled=true; hx.imageSmoothingQuality='high'
    hx.drawImage(truth,0,0,240,160)
    const deg = half.toDataURL('image/jpeg', 0.7)
    const res = await window.__cn.upscaleImageURL(deg, 2)
    const [ti,si,di] = await Promise.all([T.load(truth.toDataURL('image/png')), T.load(res.url), T.load(deg)])
    const px=(img)=>{ const c=document.createElement('canvas'); c.width=480; c.height=320
      const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'
      x.drawImage(img,0,0,480,320); return x.getImageData(0,0,480,320).data }
    const t=px(ti)
    return { sr:T.psnr(t,px(si)), plain:T.psnr(t,px(di)) }
  }, { st })
  sweep.push({ st, ...r, d:+(r.sr-r.plain).toFixed(2) })
}
console.log('\n선 간격별 (480×320 격자):')
for(const s of sweep) console.log(`  ${String(s.st).padStart(2)}px  단순확대 ${s.plain} → 자체 모델 ${s.sr}   ${s.d>=0?'+':''}${s.d} dB`)
const swBad = sweep.filter(s=> s.st>=4 ? s.d<=0 : s.d<-0.25)
ok('선 간격 전 구간에서 기대대로 (4px 이상은 이기고, 그 아래도 크게 지지 않음)', swBad.length===0,
   swBad.length ? swBad.map(s=>`${s.st}px ${s.d}dB`).join(' , ')
                : sweep.map(s=>`${s.st}px ${s.d>=0?'+':''}${s.d}`).join(' · '))

// ── 동시에 여러 개를 돌려도 서로 망가뜨리지 않는가 ──
//  사용자는 노드 여러 개의 실행 버튼을 연달아 누른다. 모델 세션을 함께 쓰므로
//  순서대로 돌린 결과와 한꺼번에 돌린 결과가 완전히 같아야 한다.
const conc = await page.evaluate(async () => {
  const T = window.__rt
  const srcs = [T.draw(300,200,11,0), T.draw(260,180,22,0), T.draw(340,220,33,0)].map(c=>c.toDataURL('image/png'))
  const seq = []
  for(const s of srcs) seq.push(await window.__cn.upscaleImageURL(s, 2))
  let par
  try{ par = await Promise.all(srcs.map(s=>window.__cn.upscaleImageURL(s, 2))) }
  catch(e){ return { err: String(e&&e.message||e).slice(0,120) } }
  const px = async (u) => { const img=await T.load(u); const c=T.toCanvas(img)
    return { w:c.width, h:c.height, d:c.getContext('2d').getImageData(0,0,c.width,c.height).data } }
  let worst=0, dimBad=0
  for(let i=0;i<srcs.length;i++){
    const a=await px(seq[i].url), b=await px(par[i].url)
    if(a.w!==b.w || a.h!==b.h){ dimBad++; continue }
    for(let j=0;j<a.d.length;j+=4) for(let k=0;k<3;k++){ const dd=Math.abs(a.d[j+k]-b.d[j+k]); if(dd>worst) worst=dd }
  }
  return { worst, dimBad, n:srcs.length }
})
ok('동시에 여러 개를 돌려도 결과가 같음', !conc.err && conc.dimBad===0 && conc.worst===0,
   conc.err ? conc.err : (conc.dimBad ? `${conc.dimBad}건 크기가 다름` : `${conc.n}건 · 픽셀 최대차 ${conc.worst}`))

// ── 반복해서 써도 메모리가 계속 쌓이지 않는가 ──
//  많이 쓰는 사용자의 탭이 무거워지다 죽는 일이 없어야 한다.
const mem = await page.evaluate(async () => {
  if(!performance.memory) return { skip:true }
  const T = window.__rt
  const src = T.draw(420, 300, 77, 0).toDataURL('image/png')
  for(let i=0;i<3;i++) await window.__cn.upscaleImageURL(src, 2)      // 예열
  const before = performance.memory.usedJSHeapSize
  for(let i=0;i<20;i++) await window.__cn.upscaleImageURL(src, 2)
  await new Promise(k=>setTimeout(k,1200))
  const after = performance.memory.usedJSHeapSize
  return { beforeMB:+(before/1048576).toFixed(1), afterMB:+(after/1048576).toFixed(1),
           growMB:+((after-before)/1048576).toFixed(1) }
})
ok('20번 반복해도 메모리가 크게 쌓이지 않음', mem.skip || mem.growMB < 120,
   mem.skip ? '이 브라우저는 메모리 측정 미지원(건너뜀)' : `${mem.beforeMB}MB → ${mem.afterMB}MB (증가 ${mem.growMB}MB)`)

// ── 영상도 무작위 크기로 ──
const vw = ri(60,160)*2, vh = ri(40,100)*2
const vid = await page.evaluate(async (cfg) => {
  const c=document.createElement('canvas'); c.width=cfg.w; c.height=cfg.h
  const x=c.getContext('2d'); let f=0
  const draw=()=>{ f++
    x.fillStyle='#123a6a'; x.fillRect(0,0,cfg.w,cfg.h)
    x.fillStyle='#ffd070'; x.fillRect((f*7)%Math.max(1,cfg.w-20), 4, 18, Math.max(2,cfg.h-8))
    x.strokeStyle='#fff'; x.lineWidth=1
    for(let i=6;i<cfg.w;i+=11){ x.beginPath(); x.moveTo(i+0.5,0); x.lineTo(i+0.5,cfg.h); x.stroke() } }
  const st=c.captureStream(30)
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
  const rec=new MediaRecorder(st,{ mimeType:mime, videoBitsPerSecond:8000000 }), ch=[]
  rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
  const done=new Promise(k=>{ rec.onstop=k })
  rec.start(); const t0=performance.now()
  await new Promise(k=>{ (function loop(){ draw(); performance.now()-t0<1200 ? requestAnimationFrame(loop) : k() })() })
  rec.stop(); await done
  const url=URL.createObjectURL(new Blob(ch,{type:'video/webm'}))
  try{
    const res=await Promise.race([
      window.__cn.upscaleVideoURL(url, 2, ()=>{}),
      new Promise((_,n)=>setTimeout(()=>n(new Error('시간 초과(180초)')),180000))
    ])
    const v=document.createElement('video'); v.muted=true; v.src=res.url
    await new Promise(k=>{ v.onloadedmetadata=k; v.onerror=k; setTimeout(k,8000) })
    return { w:v.videoWidth, h:v.videoHeight, engine:res.engine||'', fallback:!!res.fallback, dim:res.dim, note:res.note||'' }
  }catch(e){ return { error:String(e&&e.message||e).slice(0,120) } }
}, { w:vw, h:vh })
console.log(`영상 ${vw}×${vh} → ${vid.error? '오류 '+vid.error : vid.w+'×'+vid.h+'  '+vid.engine}`)
ok('무작위 크기 영상이 정확히 2배', !vid.error && vid.w===vw*2 && vid.h===vh*2,
   vid.error || `${vw}×${vh} → ${vid.w}×${vid.h} · ${vid.engine}`)

// ── 전역 ──
const hf = reqs.filter(u=>/\/models\/(hf|lib\/transformers)/.test(u) && !/probe=1/.test(u))
ok('남의 모델을 한 번도 내려받지 않음', hf.length===0, hf.length? hf.slice(0,2).join(' , ') : '0건')
const ext = reqs.filter(u=>!u.startsWith(origin) && !/^(data|blob|about):/.test(u))
ok('외부 서버 요청 0건', ext.length===0, ext.slice(0,3).join(' , ') || '없음')
ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ') || '없음')

await browser.close(); server.close(); fs.rmSync(tmp,{recursive:true,force:true})
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n씨앗 ${SEED} · ${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
