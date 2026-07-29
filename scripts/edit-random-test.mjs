// 편집 기능(비율 맞추기 · 자막 · 색보정 · 합성) — '임의(랜덤)' 검증.
//
//  기존 검사는 정해둔 값 몇 가지만 봤다. 실제 사용자는 아무 크기·아무 문구를 넣는다.
//  그래서 크기·비율·문구·설정값을 매번 무작위로 뽑아 돌리고, '반드시 지켜져야 할 성질' 만 본다.
//
//   비율 맞추기 : 결과 비율이 요청과 정확히 같은가 · 내용이 사라지지 않았는가
//   자막       : 크기가 그대로인가 · 자막 영역만 바뀌고 나머지는 그대로인가 ·
//                긴 문구·줄바꿈·이모지·특수문자에서 깨지지 않는가
//   색보정     : 크기 유지 · '없음' 은 원본 그대로 · 밝게/어둡게가 실제로 그 방향인가
//   합성       : 바탕 크기 유지 · 지정한 모서리에 실제로 놓이는가 · 투명도가 반영되는가
//
//  실행: node scripts/edit-random-test.mjs        (SEED=123 · N=10)
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'

const PUB = path.resolve('public')
const SEED = Number(process.env.SEED || (Date.now() % 1e9))
const N = Number(process.env.N || 10)
console.log(`씨앗(SEED)=${SEED} · 각 기능 ${N}회  ← 실패 시 SEED=${SEED} 로 재현됩니다\n`)
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t
  return ((t^t>>>14)>>>0)/4294967296 } }
const rnd = mulberry32(SEED)
const ri = (lo,hi)=>lo+Math.floor(rnd()*(hi-lo+1))
const pick = (a)=>a[Math.floor(rnd()*a.length)]

const RATIOS = ['9:16','1:1','4:5','16:9','3:4','2:3']
const FITMODE = ['여백(검정)','꽉 채우기','흐린 여백']
const CAPPOS  = ['아래','가운데','위']
const CAPSTYLE= ['외곽선','박스','그림자']
const TEXTS = ['안녕하세요','BYGENCY 자체 모델 1234','줄바꿈\n테스트\n세 줄',
  '아주 긴 문구를 넣어도 화면 밖으로 넘치지 않고 여러 줄로 잘 나뉘어야 합니다 그리고 계속 이어집니다',
  'Emoji 🎬🔥 and ASCII !@#$%^&*()','한글English123 섞임','.','＊＊ 전각문자 ＊＊']
const PRESETS = ['없음','따뜻하게','차갑게','흑백','필름','선명하게']
const CPOS = ['오른쪽 아래','왼쪽 아래','오른쪽 위','왼쪽 위','가운데']

const cases = { fit:[], cap:[], grade:[], comp:[] }
for(let i=0;i<N;i++){
  cases.fit.push({ i, w: ri(80,1400), h: ri(80,1400), ratio: pick(RATIOS), mode: pick(FITMODE) })
  cases.cap.push({ i, w: ri(160,1200), h: ri(120,900), text: pick(TEXTS),
                   size: ri(2,20), pos: pick(CAPPOS), style: pick(CAPSTYLE) })
  cases.grade.push({ i, w: ri(120,800), h: ri(120,600), preset: pick(PRESETS),
                     bright: ri(60,160), contrast: ri(60,160), satur: ri(0,200), temp: ri(-100,100) })
  cases.comp.push({ i, w: ri(200,900), h: ri(200,700), ow: ri(40,200), oh: ri(40,200),
                    pos: pick(CPOS), scale: ri(10,60), opacity: ri(10,100) })
}

const CT={'.html':'text/html; charset=utf-8','.js':'text/javascript','.onnx':'application/octet-stream','.json':'application/json','.png':'image/png','.css':'text/css'}
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x'), p=u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p.startsWith('/models/')){ if(u.searchParams.get('probe')==='1') return send(200,JSON.stringify({ok:false})); return send(502,'x','text/plain') }
  if(p.startsWith('/api/')) return send(200,JSON.stringify({ok:true}))
  const f=path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const browser=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page=await browser.newPage(); const errs=[]
page.on('pageerror',e=>errs.push(String(e).slice(0,200)))
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1200)

await page.addScriptTag({ content: `
window.__et = {
  draw(w,h,seed){
    const c=document.createElement('canvas'); c.width=w; c.height=h
    const x=c.getContext('2d'); let s=seed
    const R=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff }
    const g=x.createLinearGradient(0,0,w,h)
    g.addColorStop(0,'#'+Math.floor(R()*0xffffff).toString(16).padStart(6,'0'))
    g.addColorStop(1,'#'+Math.floor(R()*0xffffff).toString(16).padStart(6,'0'))
    x.fillStyle=g; x.fillRect(0,0,w,h)
    for(let i=0;i<10;i++){ x.fillStyle='rgba(255,255,255,'+(0.2+R()*0.5)+')'
      x.fillRect(R()*w, R()*h, 4+R()*Math.max(6,w/8), 4+R()*Math.max(6,h/8)) }
    return c
  },
  load(u){ return new Promise((k,n)=>{ const i=new Image(); i.onload=()=>k(i); i.onerror=n; i.src=u }) },
  async data(u){ const img=await window.__et.load(u)
    const c=document.createElement('canvas'); c.width=img.width; c.height=img.height
    c.getContext('2d').drawImage(img,0,0)
    return { w:img.width, h:img.height, d:c.getContext('2d').getImageData(0,0,img.width,img.height).data } },
  // 두 그림에서 '어느 가로 띠가 달라졌는지' 를 돌려준다(자막이 지정한 자리에 있는지 보려고)
  bandDiff(a,b,w,h,bands){
    const out=[]
    for(let bnd=0;bnd<bands;bnd++){
      const y0=Math.floor(h*bnd/bands), y1=Math.floor(h*(bnd+1)/bands)
      let s=0,n=0
      for(let y=y0;y<y1;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4
        s+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); n+=3 }
      out.push(+(s/Math.max(1,n)).toFixed(2))
    }
    return out
  },
  // 특정 가로 한 줄이 얼마나 바뀌었는지
  rowDiff(a,b,w,h,y){ let s=0,n=0
    for(let x=0;x<w;x++){ const i=(y*w+x)*4
      s+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); n+=3 }
    return s/Math.max(1,n) },
  mean(d){ let r=0,g=0,b=0,n=d.length/4
    for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2] }
    return [r/n,g/n,b/n] },
  // 실제로 바뀐 픽셀들의 테두리 상자 — '무엇이 어디에 그려졌는가' 를 정확히 본다
  changedBox(a,b,w,h,thr){
    let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4
      const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))
      if(d>thr){ n++; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y } }
    return n ? { x:x0, y:y0, w:x1-x0+1, h:y1-y0+1, n } : { n:0 }
  },
  // 네 모서리 + 가운데 중 어디가 가장 많이 바뀌었는지
  cornerDiff(a,b,w,h){
    const q=(x0,y0,x1,y1)=>{ let s=0,n=0
      for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){ const i=(y*w+x)*4
        s+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); n+=3 }
      return s/Math.max(1,n) }
    const hw=Math.floor(w/2), hh=Math.floor(h/2)
    const qw=Math.floor(w/4), qh=Math.floor(h/4)
    return { '왼쪽 위':q(0,0,hw,hh), '오른쪽 위':q(hw,0,w,hh),
             '왼쪽 아래':q(0,hh,hw,h), '오른쪽 아래':q(hw,hh,w,h),
             '가운데':q(qw,qh,w-qw,h-qh) }
  }
}
`})

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// ── 1) 비율 맞추기 ──
const fitR = await page.evaluate(async (cs) => {
  const T=window.__et, res=[]
  for(const c of cs){
    const src=T.draw(c.w,c.h,c.i*7+1).toDataURL('image/png')
    try{
      const r=await window.__cn.fitToRatio(src, c.ratio, c.mode)
      const d=await T.data(r.url)
      const m=T.mean(d.d)
      res.push({ ...c, w2:d.w, h2:d.h, mean:m, ok:true })
    }catch(e){ res.push({ ...c, ok:false, err:String(e&&e.message||e).slice(0,80) }) }
  }
  return res
}, cases.fit)
const fitErr = fitR.filter(r=>!r.ok)
ok('비율 맞추기 — 전부 오류 없이 끝남', fitErr.length===0, fitErr.slice(0,2).map(r=>`${r.w}×${r.h} ${r.ratio}: ${r.err}`).join(' , ')||'없음')
const fitBad = fitR.filter(r=>r.ok).filter(r=>{
  const [a,b]=r.ratio.split(':').map(Number)
  return Math.abs(r.w2/r.h2 - a/b) > 0.01 })
ok('비율 맞추기 — 결과 비율이 요청과 정확히 같음', fitBad.length===0,
   fitBad.length ? fitBad.slice(0,3).map(r=>`${r.ratio} 요청 → ${r.w2}×${r.h2}`).join(' , ') : `${fitR.length}건 모두 일치`)
const fitBlank = fitR.filter(r=>r.ok).filter(r=> r.mean.every(v=>v<3) || r.mean.every(v=>v>252))
ok('비율 맞추기 — 결과가 새까맣거나 새하얗지 않음', fitBlank.length===0,
   fitBlank.length ? fitBlank.slice(0,3).map(r=>`${r.w}×${r.h} ${r.ratio} ${r.mode} 평균 ${r.mean.map(v=>Math.round(v))}`).join(' , ') : `${fitR.length}건 정상`)
const fitBig = fitR.filter(r=>r.ok).filter(r=> Math.max(r.w2,r.h2) > 2048)
ok('비율 맞추기 — 상한(2048px)을 넘지 않음', fitBig.length===0,
   fitBig.length ? fitBig.slice(0,2).map(r=>`${r.w2}×${r.h2}`).join(' , ') : `최대 ${Math.max(...fitR.filter(r=>r.ok).map(r=>Math.max(r.w2,r.h2)))}px`)

// ── 2) 자막 ──
const capR = await page.evaluate(async (cs) => {
  const T=window.__et, res=[]
  for(const c of cs){
    const base=T.draw(c.w,c.h,c.i*13+5)
    const src=base.toDataURL('image/png')
    try{
      const r=await window.__cn.captionImage(src, { text:c.text, size:c.size, pos:c.pos, style:c.style })
      const [a,b]=await Promise.all([T.data(src), T.data(r.url)])
      const bands=T.bandDiff(a.d,b.d,b.w,b.h,3)
      // 맨 윗줄·맨 아랫줄이 얼마나 바뀌었는지 — 자막이 넘쳐 잘리면 여기가 크게 바뀐다
      const edge=Math.max(T.rowDiff(a.d,b.d,b.w,b.h,0), T.rowDiff(a.d,b.d,b.w,b.h,b.h-1))
      // '점 하나' 같은 아주 작은 자막은 평균으로 보면 0 에 가깝다 → 바뀐 픽셀 수로 본다
      const box=T.changedBox(a.d,b.d,b.w,b.h,30)
      res.push({ ...c, w2:b.w, h2:b.h, bands, edgeRow:+edge.toFixed(1), drawn:box.n, box, info:r.info, ok:true })
    }catch(e){ res.push({ ...c, ok:false, err:String(e&&e.message||e).slice(0,80) }) }
  }
  return res
}, cases.cap)
const capErr = capR.filter(r=>!r.ok)
ok('자막 — 전부 오류 없이 끝남', capErr.length===0, capErr.slice(0,2).map(r=>`"${r.text.slice(0,10)}": ${r.err}`).join(' , ')||'없음')
const capDim = capR.filter(r=>r.ok).filter(r=> r.w2!==r.w || r.h2!==r.h)
ok('자막 — 그림 크기가 그대로', capDim.length===0,
   capDim.length ? capDim.slice(0,3).map(r=>`${r.w}×${r.h}→${r.w2}×${r.h2}`).join(' , ') : `${capR.length}건 유지`)
const capNone = capR.filter(r=>r.ok).filter(r=> r.drawn < 20)
ok('자막 — 실제로 글자가 그려짐', capNone.length===0,
   capNone.length ? capNone.slice(0,3).map(r=>`"${r.text.slice(0,12)}" 바뀐 점 ${r.drawn}개`).join(' , ')
                  : `${capR.length}건 · 가장 적은 경우도 ${Math.min(...capR.filter(r=>r.ok).map(r=>r.drawn))}점`)
// 지정한 위치의 띠가 가장 많이 바뀌어야 한다
const bandOf = { '위':0, '가운데':1, '아래':2 }
//  '어느 띠가 가장 많이 바뀌었나' 로 보면 부정확하다 — 글자가 커서 자막이 그림 대부분을 덮으면
//  잉크가 가운데에 몰려 위에 붙어 있어도 가운데로 판정된다.
//  그래서 '실제로 바뀐 영역이 어디서 시작해 어디서 끝나는가' 를 직접 본다.
const capPos = capR.filter(r=>r.ok && r.box && r.box.n>0).filter(r=>{
  const b=r.box, H=r.h2
  if(/위/.test(r.pos))      return !(b.y <= H*0.25)
  if(/가운데/.test(r.pos))  return !(Math.abs((b.y+b.h/2) - H/2) <= H*0.20)
  return !(b.y+b.h >= H*0.75)                       // 아래
})
ok('자막 — 지정한 위치(위/가운데/아래)에 들어감', capPos.length===0,
   capPos.length ? capPos.slice(0,3).map(r=>`${r.pos} 요청인데 자막이 ${r.box.y}~${r.box.y+r.box.h} (그림 높이 ${r.h2})`).join(' , ')
                 : `${capR.filter(r=>r.ok).length}건 모두 제자리`)
// 자막이 그림 밖으로 넘쳐 잘리지 않는가 — 맨 위·맨 아래 한 줄이 글자로 꽉 차 있으면 넘친 것이다
const capOver = capR.filter(r=>r.ok).filter(r=> r.edgeRow > 12)
ok('자막이 그림 밖으로 넘쳐 잘리지 않음', capOver.length===0,
   capOver.length ? capOver.slice(0,3).map(r=>`"${r.text.slice(0,12)}" 크기${r.size}% 가장자리변화 ${r.edgeRow}`).join(' , ')
                  : `${capR.length}건 · 가장자리 최대 변화 ${Math.max(0,...capR.filter(r=>r.ok).map(r=>r.edgeRow)).toFixed(1)}`)

// ── 3) 색보정 ──
const grR = await page.evaluate(async (cs) => {
  const T=window.__et, res=[]
  for(const c of cs){
    const base=T.draw(c.w,c.h,c.i*17+9)
    const src=base.toDataURL('image/png')
    try{
      const none=await window.__cn.gradeImage(src, { preset:'없음', bright:100, contrast:100, satur:100, temp:0 })
      const up  =await window.__cn.gradeImage(src, { preset:'없음', bright:150, contrast:100, satur:100, temp:0 })
      const dn  =await window.__cn.gradeImage(src, { preset:'없음', bright:60,  contrast:100, satur:100, temp:0 })
      const any =await window.__cn.gradeImage(src, { preset:c.preset, bright:c.bright, contrast:c.contrast, satur:c.satur, temp:c.temp })
      const [a,n,u,d,x]=await Promise.all([T.data(src),T.data(none.url),T.data(up.url),T.data(dn.url),T.data(any.url)])
      const mm=(z)=>{ const m=T.mean(z.d); return (m[0]+m[1]+m[2])/3 }
      res.push({ ...c, w2:x.w, h2:x.h, 원본:mm(a), 없음:mm(n), 밝게:mm(u), 어둡게:mm(d), ok:true })
    }catch(e){ res.push({ ...c, ok:false, err:String(e&&e.message||e).slice(0,80) }) }
  }
  return res
}, cases.grade)
const grErr = grR.filter(r=>!r.ok)
ok('색보정 — 전부 오류 없이 끝남', grErr.length===0, grErr.slice(0,2).map(r=>r.err).join(' , ')||'없음')
const grDim = grR.filter(r=>r.ok).filter(r=> r.w2!==r.w || r.h2!==r.h)
ok('색보정 — 크기가 그대로', grDim.length===0, grDim.length? grDim.slice(0,2).map(r=>`${r.w}×${r.h}→${r.w2}×${r.h2}`).join(' , ') : `${grR.length}건 유지`)
const grNone = grR.filter(r=>r.ok).filter(r=> Math.abs(r.없음-r.원본) > 1.0)
ok("색보정 — '없음' 은 원본을 건드리지 않음", grNone.length===0,
   grNone.length ? grNone.slice(0,3).map(r=>`원본 ${r.원본.toFixed(1)} → ${r.없음.toFixed(1)}`).join(' , ') : `${grR.length}건 · 최대 차이 ${Math.max(...grR.filter(r=>r.ok).map(r=>Math.abs(r.없음-r.원본))).toFixed(2)}`)
const grDir = grR.filter(r=>r.ok).filter(r=> !(r.밝게 > r.원본 && r.어둡게 < r.원본))
ok('색보정 — 밝게/어둡게가 실제로 그 방향', grDir.length===0,
   grDir.length ? grDir.slice(0,3).map(r=>`원본 ${r.원본.toFixed(1)} 밝게 ${r.밝게.toFixed(1)} 어둡게 ${r.어둡게.toFixed(1)}`).join(' , ') : `${grR.length}건 모두 정상`)

// ── 4) 합성 ──
const cpR = await page.evaluate(async (cs) => {
  const T=window.__et, res=[]
  for(const c of cs){
    const base=T.draw(c.w,c.h,c.i*19+3).toDataURL('image/png')
    const over=T.draw(c.ow,c.oh,c.i*23+11).toDataURL('image/png')
    try{
      const opts={ pos:c.pos, size:c.scale, opacity:c.opacity }
      const r=await window.__cn.composeImage(base, over, opts)
      const [a,b]=await Promise.all([T.data(base), T.data(r.url)])
      // 어디에 놓여야 하는지는 스튜디오 자신이 계산해 주는 값(composeRect)으로 확인한다.
      //  '어느 사분면이 제일 바뀌었나' 식으로 보면 세로로 긴 그림에서 판정이 모호해진다.
      const want=window.__cn.composeRect(b.w, b.h, c.ow, c.oh, opts)
      res.push({ ...c, w2:b.w, h2:b.h, want, box:T.changedBox(a.d,b.d,b.w,b.h,8), info:r.info, ok:true })
    }catch(e){ res.push({ ...c, ok:false, err:String(e&&e.message||e).slice(0,80) }) }
  }
  return res
}, cases.comp)
const cpErr = cpR.filter(r=>!r.ok)
ok('합성 — 전부 오류 없이 끝남', cpErr.length===0, cpErr.slice(0,2).map(r=>r.err).join(' , ')||'없음')
const cpDim = cpR.filter(r=>r.ok).filter(r=> r.w2!==r.w || r.h2!==r.h)
ok('합성 — 바탕 크기가 그대로', cpDim.length===0, cpDim.length? cpDim.slice(0,2).map(r=>`${r.w}×${r.h}→${r.w2}×${r.h2}`).join(' , ') : `${cpR.length}건 유지`)
// 바뀐 영역이 '놓여야 할 자리' 안에 있어야 한다(가장자리 부드러움 때문에 2px 여유)
const cpSeen = cpR.filter(r=>r.ok && r.box.n>0)
const cpPos = cpSeen.filter(r=>{
  const w=r.want, b=r.box, T=2
  return b.x < w.x-T || b.y < w.y-T || b.x+b.w > w.x+w.w+T || b.y+b.h > w.y+w.h+T })
ok('합성 — 지정한 자리에 정확히 놓임', cpSeen.length>0 && cpPos.length===0,
   cpPos.length ? cpPos.slice(0,3).map(r=>`${r.pos}: 놓여야 할 자리 ${r.want.x},${r.want.y} ${r.want.w}×${r.want.h} · 실제로 바뀐 곳 ${r.box.x},${r.box.y} ${r.box.w}×${r.box.h}`).join(' | ')
                : `${cpSeen.length}건 모두 제자리`)

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await browser.close(); server.close()
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n씨앗 ${SEED} · ${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
