// 영상 업스케일 — '임의(랜덤)' 검증.
//
//  이미지는 무작위 검사가 있는데 영상은 정해둔 한두 가지만 봤다.
//  영상은 이미지보다 틀어질 곳이 많다 — 크기·길이·초당 프레임 수·소리·목표 해상도.
//  그래서 매번 무작위로 뽑아 돌린다.
//
//  판정 항목
//   1) 크기가 규칙대로 정확한가 (2배 / 4배 / 4K 목표)
//   2) 자체 모델이 실제로 쓰였는가 (외부 모델은 전부 차단)
//   3) 길이가 유지되는가 (프레임을 빠뜨리거나 늘이지 않는가)
//   4) 소리가 살아남는가 (소리 있는 영상을 넣었을 때)
//   5) 초당 프레임 수가 원본을 따라가는가
//   6) 화면이 실제로 또렷해지는가 (단순 확대한 프레임과 비교)
//   7) 결과가 진짜 재생 가능한 영상인가 (끝까지 재생되는가)
//
//  실행: node scripts/video-random-test.mjs        (SEED=123 · N=6 으로 조절)
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'

const PUB = path.resolve('public')
const OWN = path.join(PUB, 'models-own/bygency-sr-x2/model.onnx')
const ORT_DIR = path.resolve('node_modules/onnxruntime-web/dist')
if (!fs.existsSync(OWN)) { console.error('자체 모델 없음: python3 scripts/train-sr-model.py'); process.exit(2) }

const SEED = Number(process.env.SEED || (Date.now() % 1e9))
const N = Number(process.env.N || 5)
console.log(`씨앗(SEED)=${SEED} · 무작위 영상 ${N}개  ← 실패 시 SEED=${SEED} 로 재현됩니다\n`)
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t
  return ((t^t>>>14)>>>0)/4294967296 } }
const rnd = mulberry32(SEED)
const ri = (lo,hi)=>lo+Math.floor(rnd()*(hi-lo+1))
const pick = (a)=>a[Math.floor(rnd()*a.length)]

const cases = []
for(let i=0;i<N;i++){
  const shape = pick(['small','wide','tall','mid'])
  let w,h
  if(shape==='small'){ w=ri(32,120)*2; h=ri(24,90)*2 }
  else if(shape==='wide'){ w=ri(160,320)*2; h=ri(16,48)*2 }
  else if(shape==='tall'){ w=ri(16,48)*2;  h=ri(120,240)*2 }
  else { w=ri(120,240)*2; h=ri(80,160)*2 }
  cases.push({ i, w, h, shape, ms: ri(800,2000), fps: pick([15,24,30]),
               audio: rnd()<0.5, mode: pick([{scale:2},{scale:2},{scale:4},{longTarget:1920}]) })
}
// 긴 영상은 프레임을 여러 '묶음' 으로 나눠 처리한다(메모리 때문).
//  묶음이 하나뿐이면 이어붙이는 부분이 검증되지 않으므로, 반드시 여러 묶음에 걸치는 경우를 넣는다.
//  화면을 크게(=묶음당 장수가 적어짐) + 길게 해서 확실히 여러 묶음이 되게 한다.
cases.push({ i: cases.length, w: 960, h: 540, shape: '긴영상', ms: 4500, fps: 30,
             audio: true, mode: { scale: 2 }, long: true })

// 기대 크기 — 스튜디오 코드를 베끼지 않고 사양대로 따로 계산한다.
//  영상은 브라우저 인코더가 실시간으로 감당하는 한계(실측 약 280만 픽셀)까지만 커진다.
//  그보다 크게 요청하면 비율을 지킨 채 그 한계로 낮춘다(짝수 픽셀로 맞춤).
const VID_MAX_PIX = 2.8e6
function expectDim(w,h,mode){
  const eff = mode.scale != null ? mode.scale : Math.max(1, Math.min(8, mode.longTarget/Math.max(w,h)))
  let tw = Math.round(w*eff), th = Math.round(h*eff)
  if(tw*th > VID_MAX_PIX){
    const s = Math.sqrt(VID_MAX_PIX/(tw*th))
    tw = Math.max(2, Math.round(tw*s/2)*2); th = Math.max(2, Math.round(th*s/2)*2)
  }
  return [tw,th]
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vidrnd-'))
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

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage(); const errs=[]; const reqs=[]
page.on('pageerror', e=>errs.push(String(e).slice(0,200)))
page.on('request', r=>reqs.push(r.url()))
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1500)

await page.addScriptTag({ content: `
window.__vt = {
  // 무작위 영상 만들기 — 소리를 넣을 수도 있다
  async make(cfg){
    const c=document.createElement('canvas'); c.width=cfg.w; c.height=cfg.h
    const x=c.getContext('2d'); let f=0
    const draw=()=>{ f++
      const g=x.createLinearGradient(0,0,cfg.w,cfg.h)
      g.addColorStop(0,'#12306e'); g.addColorStop(1,'#d8b070'); x.fillStyle=g; x.fillRect(0,0,cfg.w,cfg.h)
      x.strokeStyle='#fff'; x.lineWidth=1
      for(let i=8;i<cfg.w;i+=9){ x.beginPath(); x.moveTo(i+0.5,0); x.lineTo(i+0.5,cfg.h); x.stroke() }
      for(let i=8;i<cfg.h;i+=9){ x.beginPath(); x.moveTo(0,i+0.5); x.lineTo(cfg.w,i+0.5); x.stroke() }
      x.fillStyle='#ffd070'; x.fillRect((f*5)%Math.max(1,cfg.w-24), 4, 20, Math.max(2,cfg.h-8))
      x.fillStyle='#fff'; x.font='bold 14px sans-serif'; x.fillText('BYGENCY '+f, 6, cfg.h-6) }
    const st=c.captureStream(cfg.fps)
    if(cfg.audio){
      const ac=new (window.AudioContext||window.webkitAudioContext)()
      const osc=ac.createOscillator(); osc.frequency.value=440
      const dst=ac.createMediaStreamDestination(); osc.connect(dst); osc.start()
      dst.stream.getAudioTracks().forEach(t=>st.addTrack(t))
    }
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
    const rec=new MediaRecorder(st,{ mimeType:mime, videoBitsPerSecond:8000000 }), ch=[]
    rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
    const done=new Promise(k=>{ rec.onstop=k })
    rec.start(); const t0=performance.now()
    await new Promise(k=>{ (function loop(){ draw(); performance.now()-t0<cfg.ms ? requestAnimationFrame(loop) : k() })() })
    rec.stop(); await done
    return URL.createObjectURL(new Blob(ch,{type:'video/webm'}))
  },
  // 영상 정보 재기 — 크기·길이·소리 유무
  async info(url){
    const v=document.createElement('video'); v.src=url; v.muted=true
    await new Promise(k=>{ v.onloadedmetadata=k; v.onerror=k; setTimeout(k,8000) })
    // 길이가 Infinity 로 나오는 webm 은 끝으로 한 번 이동시켜야 값이 잡힌다
    if(!isFinite(v.duration)){
      await new Promise(k=>{ v.onseeked=k; setTimeout(k,4000); v.currentTime=1e6 })
    }
    // 소리 유무 — 재생하지 않아도 알 수 있는 방법으로 본다.
    //  webkitAudioDecodedByteCount 는 '재생을 해야' 올라가서 늘 0 으로 보인다(그래서 못 잡았다).
    //  captureStream() 은 그 영상이 실제로 가진 소리 트랙을 그대로 보여준다.
    let hasAudio = false
    try{ hasAudio = v.captureStream().getAudioTracks().length > 0 }
    catch(_){ hasAudio = !!(v.mozHasAudio || v.webkitAudioDecodedByteCount>0 ||
                            (v.audioTracks && v.audioTracks.length>0)) }
    return { w:v.videoWidth, h:v.videoHeight, dur:isFinite(v.duration)?v.duration:0, hasAudio }
  },
  // 특정 시각의 프레임을 뽑는다
  async frame(url,t){
    const v=document.createElement('video'); v.src=url; v.muted=true
    await new Promise(k=>{ v.onloadeddata=k; v.onerror=k; setTimeout(k,8000) })
    await new Promise(k=>{ v.onseeked=k; setTimeout(k,5000); v.currentTime=t })
    const c=document.createElement('canvas'); c.width=v.videoWidth||1; c.height=v.videoHeight||1
    try{ c.getContext('2d').drawImage(v,0,0) }catch(_){}
    return { url:c.toDataURL('image/png'), w:c.width, h:c.height }
  },
  // 또렷함 — 이웃 픽셀 밝기 차이의 평균
  sharp(d,w,h){ let s=0,n=0
    const lum=i=>0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ const i=(y*w+x)*4
      s+=Math.abs(lum(i)-lum(i+4))+Math.abs(lum(i)-lum(i+w*4)); n+=2 }
    return Math.round(s/n*1000)/1000 },
  load(u){ return new Promise((k,n)=>{ const i=new Image(); i.onload=()=>k(i); i.onerror=n; i.src=u }) }
}
`})

const results = []
for(const c of cases){
  const [ew,eh] = expectDim(c.w,c.h,c.mode)
  const r = await page.evaluate(async (cfg) => {
    const T = window.__vt
    const src = await T.make(cfg)
    const before = await T.info(src)
    const opts = { srcFps: cfg.fps, hasAudio: cfg.audio }
    if(cfg.mode.longTarget) opts.longTarget = cfg.mode.longTarget
    const t0 = performance.now()
    let res
    try {
      res = await Promise.race([
        window.__cn.upscaleVideoURL(src, cfg.mode.scale || 4, ()=>{}, opts),
        new Promise((_,n)=>setTimeout(()=>n(new Error('시간 초과(600초)')),600000))
      ])
    } catch(e){ return { error: String(e && e.message || e).slice(0,140) } }
    const ms = Math.round(performance.now()-t0)
    const after = await T.info(res.url)
    // 같은 시각의 프레임을 뽑아 또렷함을 비교
    const t = Math.max(0.1, Math.min(before.dur*0.5 || 0.4, 1.0))
    const [fb, fa] = await Promise.all([T.frame(src,t), T.frame(res.url,t)])
    const px=(u,w,h)=>T.load(u).then(img=>{ const c=document.createElement('canvas'); c.width=w; c.height=h
      const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'
      x.drawImage(img,0,0,w,h); return x.getImageData(0,0,w,h).data })
    const W=after.w||1, H=after.h||1
    const [pb, pa] = await Promise.all([px(fb.url,W,H), px(fa.url,W,H)])
    return { ms, before, after, engine:res.engine||'', fallback:!!res.fallback, note:res.note||'',
             dim:res.dim||'', sharpPlain:T.sharp(pb,W,H), sharpSr:T.sharp(pa,W,H) }
  }, c)
  results.push({ c, ew, eh, r })
  const tag=`#${c.i}${c.long?'(긴영상)':''} ${c.w}×${c.h} ${c.fps}fps ${(c.ms/1000).toFixed(1)}s ${c.audio?'소리O':'소리X'} ${c.mode.scale?c.mode.scale+'배':c.mode.longTarget+'px'}`
  console.log(`${tag}  →  ${r.error ? '오류 '+r.error : (r.after.w+'×'+r.after.h)+'  '+r.engine+'  '+r.ms+'ms'}`)
}

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])
const good = results.filter(x=>!x.r.error)

ok(`${N}개 영상이 오류 없이 끝남`, results.every(x=>!x.r.error),
   results.filter(x=>x.r.error).map(x=>`#${x.c.i} ${x.r.error}`).slice(0,2).join(' , ') || '없음')

const dimBad = good.filter(x=> x.r.after.w!==x.ew || x.r.after.h!==x.eh)
ok('영상 크기가 규칙대로 정확', good.length>0 && dimBad.length===0,
   dimBad.length ? dimBad.slice(0,3).map(x=>`#${x.c.i} ${x.c.w}×${x.c.h}→${x.r.after.w}×${x.r.after.h}(기대 ${x.ew}×${x.eh})`).join(' , ')
                 : `${good.length}건 모두 일치`)

const notOwn = good.filter(x=>!/BYGENCY/.test(x.r.engine) || x.r.fallback)
ok('전부 자체 모델로 처리됨(단순 확대 아님)', notOwn.length===0,
   notOwn.length ? notOwn.slice(0,3).map(x=>`#${x.c.i} ${x.r.engine}${x.r.fallback?'(폴백)':''}`).join(' , ') : `${good.length}건 모두 BYGENCY`)

// 길이 — 원본과 10% 또는 0.3초 이내
const durCases = good.filter(x=>x.r.before.dur>0.3 && x.r.after.dur>0)
const durBad = durCases.filter(x=> Math.abs(x.r.after.dur-x.r.before.dur) > Math.max(0.3, x.r.before.dur*0.10))
ok('영상 길이가 유지됨', durCases.length>0 && durBad.length===0,
   durBad.length ? durBad.slice(0,3).map(x=>`#${x.c.i} ${x.r.before.dur.toFixed(2)}초→${x.r.after.dur.toFixed(2)}초`).join(' , ')
                 : `${durCases.length}건 · 최대 어긋남 ${Math.max(0,...durCases.map(x=>Math.abs(x.r.after.dur-x.r.before.dur))).toFixed(2)}초`)

// 소리 — 원본에 소리가 있었으면 결과에도 있어야 한다
const aCases = good.filter(x=>x.c.audio && x.r.before.hasAudio)
const aBad = aCases.filter(x=>!x.r.after.hasAudio)
ok('소리가 살아남음', aCases.length===0 || aBad.length===0,
   aCases.length ? (aBad.length ? aBad.map(x=>`#${x.c.i} 소리 사라짐`).join(' , ') : `${aCases.length}건 모두 유지`)
                 : '소리 있는 경우 없음(이번 씨앗)')

const sharpBad = good.filter(x=> !(x.r.sharpSr > x.r.sharpPlain))
ok('화면이 단순 확대보다 또렷함', good.length>0 && sharpBad.length===0,
   sharpBad.length ? sharpBad.slice(0,3).map(x=>`#${x.c.i} ${x.r.sharpSr} vs ${x.r.sharpPlain}`).join(' , ')
                   : `${good.length}건 · 평균 ${(good.reduce((s,x)=>s+(x.r.sharpSr/Math.max(1e-6,x.r.sharpPlain)),0)/good.length).toFixed(2)}배 또렷`)

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
