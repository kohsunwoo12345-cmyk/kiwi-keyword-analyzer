// 새로 만든 편집 노드들을 한 줄로 이어 실제 작업 흐름대로 돌려본다.
//   [원본] → 색보정 → 자막 → 합성(로고) → 비율 맞추기 → 업스케일 → 전/후 비교
//  (로고는 가운데에 얹는다 — 뒤에 오는 '꽉 채우기' 가 좌우를 잘라내므로 모서리에 두면 잘려 나간다)
//  각 단계가 앞 단계의 결과를 제대로 받아 다음으로 넘기는지, 마지막까지 값이 살아 있는지 확인한다.
//  또 팔레트·검색창에 새 노드가 모두 보이는지도 함께 본다.
//  실행:  npm i -D playwright-core && node scripts/edit-chain-test.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'

const PUB = path.resolve('public')
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css' }
const server = http.createServer((req,res)=>{
  const p = new URL(req.url,'http://x').pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p.startsWith('/models/')) return send(404,'no','text/plain')
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ok:true}))
  const f=path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const pg=await b.newPage(); const errs=[]
pg.on('pageerror',e=>errs.push(String(e).slice(0,160)))
await pg.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await pg.waitForTimeout(1500)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 새 노드 6종이 모두 [편집] 분류에 등록됐는가
const cat = await pg.evaluate(() => {
  const D=window.__cn.DEFS
  const want=['upscale','caption','vtrim','grade','compose','compare','bgremove','fit']
  return want.map(k => [k, D[k]?D[k].cat:null, D[k]?D[k].title:null])
})
ok('편집 노드 8종이 모두 [편집] 분류에 등록됨',
   cat.every(([,c]) => c==='편집'), cat.map(([k,c])=>k+':'+(c||'없음')).join(' '))

// 2) 실제 체인: 색보정 → 자막 → 합성 → 비율 → 업스케일 → 비교
const chain = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const mk=(w,h,color)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h
    const x=c.getContext('2d'); x.fillStyle=color; x.fillRect(0,0,w,h); return c.toDataURL('image/png') }
  const dimOf = (url)=>new Promise(r=>{ const i=new Image(); i.onload=()=>r(i.width+'x'+i.height); i.onerror=()=>r(null); i.src=url })
  const run = async (node, act) => {
    document.getElementById('nd-'+node.id).querySelector('[data-tool="'+act+'"]').click()
    const t0=Date.now(); while(node.w.toolBusy && Date.now()-t0<90000) await new Promise(r=>setTimeout(r,150))
    return node.w.img || null
  }
  const link=(a,bn,port)=>S.links.push({ from:a.id, to:bn.id, fromPort:'out', toPort:port||'in' })

  // 원본 400×225 (16:9) 파란 이미지, 로고 40×40
  const src=C.addNode('bgremove',0,0,true); src.w.img=mk(400,225,'#1050c0'); src.w.toolKind='image'
  const logo=C.addNode('bgremove',0,0,true); logo.w.img=mk(40,40,'#00ff00'); logo.w.toolKind='image'

  const gr=C.addNode('grade',0,0,true)
  gr.w.gpreset='따뜻하게'; gr.w.gbright=100; gr.w.gcontrast=100; gr.w.gsatur=100; gr.w.gtemp=0
  link(src,gr); C.render()
  const rGrade = await run(gr,'grade')

  const cap=C.addNode('caption',0,0,true)
  cap.w.captext='체인 테스트'; cap.w.cappos='아래(기본)'; cap.w.capstyle='흰 글씨 + 검은 테두리'; cap.w.capsize=8
  link(gr,cap); C.render()
  const rCap = await run(cap,'caption')

  const cm=C.addNode('compose',0,0,true)
  cm.w.cpos='가운데'; cm.w.csize=10; cm.w.copacity=100; cm.w.cmargin=4; cm.w.cblend='일반'
  link(cap,cm,'base'); link(logo,cm,'over'); C.render()
  const rCompose = await run(cm,'compose')

  const ft=C.addNode('fit',0,0,true)
  ft.w.fitratio='1:1 (인스타 피드)'; ft.w.fitmode='꽉 채우기(가장자리 잘림)'
  link(cm,ft); C.render()
  const rFit = await run(ft,'fit')

  const up=C.addNode('upscale',0,0,true); up.w.upx='2배'
  link(ft,up); C.render()
  const rUp = await run(up,'upscale')

  const cp=C.addNode('compare',0,0,true)
  link(src,cp,'a'); link(up,cp,'b'); C.render()
  const cmpEl=document.getElementById('nd-'+cp.id)
  const wrap=cmpEl.querySelector('[data-cmpwrap]')
  const layers=wrap?Array.from(wrap.querySelectorAll('img')).map(i=>i.getAttribute('src')):[]

  // 마지막 결과의 색을 확인 — 자막(흰 글씨)·로고(초록)가 살아 있어야 한다
  const probe = async (url) => {
    const img=await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src=url })
    const c=document.createElement('canvas'); c.width=img.width; c.height=img.height
    c.getContext('2d').drawImage(img,0,0)
    const d=c.getContext('2d').getImageData(0,0,img.width,img.height).data
    let white=0, green=0
    for(let i=0;i<d.length;i+=4){
      if(d[i]>210&&d[i+1]>210&&d[i+2]>210) white++
      if(d[i+1]>150&&d[i]<130&&d[i+2]<130) green++
    }
    return { white, green }
  }

  return {
    grade:  !!rGrade,   gradeDim:  await dimOf(rGrade),
    cap:    !!rCap,     capDim:    await dimOf(rCap),
    compose:!!rCompose, composeDim:await dimOf(rCompose),
    fit:    !!rFit,     fitDim:    await dimOf(rFit),
    up:     !!rUp,      upDim:     await dimOf(rUp),
    upInfo: up.w.toolInfo||'',
    final:  await probe(rUp),
    cmpLayers: layers.length, cmpBIsUp: layers[1]===rUp, cmpAIsSrc: layers[0]===src.w.img,
    passThrough: (C.nodeMedia(cp)||{}).url===rUp,
  }
})
ok('1단계 색보정이 결과를 만듦', chain.grade && chain.gradeDim==='400x225', chain.gradeDim)
ok('2단계 자막이 앞 결과를 받아 처리', chain.cap && chain.capDim==='400x225', chain.capDim)
ok('3단계 합성이 앞 결과를 받아 처리', chain.compose && chain.composeDim==='400x225', chain.composeDim)
ok('4단계 비율 맞추기가 정사각으로 변환', chain.fit && chain.fitDim==='400x400', chain.fitDim)
ok('5단계 업스케일이 2배로 확대', chain.up && chain.upDim==='800x800', chain.upDim)
ok('마지막까지 자막(흰 글씨)이 살아 있음', chain.final.white>200, '흰 픽셀 '+chain.final.white)
ok('마지막까지 로고(초록)가 살아 있음', chain.final.green>500, '초록 픽셀 '+chain.final.green)
ok('6단계 비교 노드가 원본과 최종본을 겹쳐 보여줌',
   chain.cmpLayers===2 && chain.cmpAIsSrc && chain.cmpBIsUp, '레이어 '+chain.cmpLayers+'개')
ok('비교 노드가 최종본을 뒤로 그대로 전달', chain.passThrough)

// 3) 팔레트·검색창에서 새 노드를 찾을 수 있는가
const findable = await pg.evaluate(() => {
  const D=window.__cn.DEFS
  const titles=Object.keys(D).filter(k=>D[k].cat==='편집').map(k=>D[k].title)
  return titles
})
ok('편집 분류에 새 노드 제목이 모두 보임',
   ['화질 좋게','자막 넣기','자르기','색보정','합성','비교','배경 제거','비율 맞추기']
     .every(t => findable.some(x => x.indexOf(t)>=0)), findable.join(' / '))

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
