// 색보정 노드가 실제로 픽셀 값을 바꾸는지 브라우저에서 확인한다.
//  · 밝기/대비/채도/색온도 슬라이더가 각각 의도한 방향으로 픽셀을 바꾸는가
//  · 분위기 프리셋(흑백·따뜻·차갑)이 실제로 그 색으로 나오는가
//  · 기본값(변경 없음)이면 원본과 같아야 하는가
//  · 노드 버튼 클릭 → 결과가 담기고 다음 노드로 이어지는가
//  · 영상도 프레임 전체에 같은 값이 적용되는가
//  실행:  npm i -D playwright-core && node scripts/grade-node-test.mjs
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

const b=await chromium.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required'],
})
const pg=await b.newPage(); const errs=[]
pg.on('pageerror',e=>errs.push(String(e).slice(0,160)))
await pg.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await pg.waitForTimeout(1500)

// 테스트용 공통 헬퍼를 페이지에 심는다: 중간 회색 + 빨강/파랑 패치가 있는 이미지
await pg.evaluate(() => {
  window.__mkImg = () => {
    const c=document.createElement('canvas'); c.width=120; c.height=60
    const x=c.getContext('2d')
    x.fillStyle='#808080'; x.fillRect(0,0,120,60)      // 왼쪽 위: 중간 회색 (밝기·대비 확인용)
    x.fillStyle='#c03030'; x.fillRect(60,0,60,60)      // 오른쪽: 붉은 면 (채도·색온도 확인용)
    return c.toDataURL('image/png')
  }
  window.__pix = async (url, x, y) => {
    const img = await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src=url })
    const c=document.createElement('canvas'); c.width=img.width; c.height=img.height
    c.getContext('2d').drawImage(img,0,0)
    const d=c.getContext('2d').getImageData(x,y,1,1).data
    return [d[0],d[1],d[2]]
  }
})

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 노드 등록
const def = await pg.evaluate(() => {
  const d = window.__cn && window.__cn.DEFS && window.__cn.DEFS.grade
  if(!d) return null
  return { cat:d.cat, title:d.title, keys:d.widgets.map(w=>w.k).join(','),
           presets:(d.widgets.find(w=>w.k==='gpreset')||{}).opts,
           temp:d.widgets.find(w=>w.k==='gtemp') }
})
ok('색보정 노드가 [편집] 팔레트에 등록됨', def && def.cat==='편집', def ? def.cat+' / '+def.title : '없음')
ok('밝기·대비·채도·색온도 4가지 조절이 있음',
   def && /gbright/.test(def.keys) && /gcontrast/.test(def.keys) && /gsatur/.test(def.keys) && /gtemp/.test(def.keys), def && def.keys)
ok('분위기 프리셋 7종', def && def.presets.length===7, def && def.presets.join(' | '))
ok('색온도는 차갑(-)~따뜻(+) 양방향', def && def.temp.min===-50 && def.temp.max===50, def && (def.temp.min+'~'+def.temp.max))

// 2) 슬라이더가 각각 의도한 방향으로 픽셀을 바꾸는가
const px = await pg.evaluate(async () => {
  const C=window.__cn, src=window.__mkImg()
  const g = async (o) => (await C.gradeImage(src, o)).url
  const base = { preset:'없음 (직접 조절)', bright:100, contrast:100, satur:100, temp:0 }
  const R = {}
  R.none   = await window.__pix(await g(base), 10, 10)
  R.bright = await window.__pix(await g({...base, bright:140}), 10, 10)
  R.dark   = await window.__pix(await g({...base, bright:70}),  10, 10)
  R.satOff = await window.__pix(await g({...base, satur:0}),    90, 30)
  R.satUp  = await window.__pix(await g({...base, satur:180}),  90, 30)
  R.warm   = await window.__pix(await g({...base, temp:45}),    10, 10)
  R.cool   = await window.__pix(await g({...base, temp:-45}),   10, 10)
  R.gray   = await window.__pix(await g({...base, preset:'흑백'}), 90, 30)
  R.cine   = await window.__pix(await g({...base, preset:'시네마틱 (영화 느낌)'}), 10, 10)
  R.srcGray= await window.__pix(src, 10, 10)
  R.srcRed = await window.__pix(src, 90, 30)
  return R
})
ok('아무것도 안 건드리면 원본 그대로', px.none.join(',')===px.srcGray.join(','), px.none.join(',')+' vs 원본 '+px.srcGray.join(','))
ok('밝기 +40% → 실제로 밝아짐', px.bright[0] > px.srcGray[0]+30, px.srcGray[0]+' → '+px.bright[0])
ok('밝기 -30% → 실제로 어두워짐', px.dark[0] < px.srcGray[0]-30, px.srcGray[0]+' → '+px.dark[0])
ok('채도 0 → 색이 빠져 회색이 됨', Math.abs(px.satOff[0]-px.satOff[2])<12, px.satOff.join(','))
ok('채도 180% → 붉은색이 더 진해짐', px.satUp[0] > px.srcRed[0] && px.satUp[1] < px.srcRed[1], px.srcRed.join(',')+' → '+px.satUp.join(','))
ok('따뜻하게 → 붉은 기가 파란 기보다 커짐', px.warm[0] > px.warm[2]+10, px.warm.join(','))
ok('차갑게 → 파란 기가 붉은 기보다 커짐', px.cool[2] > px.cool[0]+10, px.cool.join(','))
ok('흑백 프리셋 → R=G=B (완전한 흑백)', px.gray[0]===px.gray[1] && px.gray[1]===px.gray[2], px.gray.join(','))
ok('시네마틱 프리셋 → 살짝 차갑고 대비가 올라감', px.cine[2] >= px.cine[0], px.cine.join(','))

// 3) 프리셋 + 슬라이더가 함께 곱해지는가 (설정 해석)
const res = await pg.evaluate(() => {
  const C=window.__cn
  return { plain: C.resolveGrade({ preset:'없음 (직접 조절)', bright:100, contrast:100, satur:100, temp:0 }),
           mix:   C.resolveGrade({ preset:'따뜻하게', bright:110, contrast:100, satur:100, temp:10 }),
           zero:  C.resolveGrade({ preset:'없음 (직접 조절)', satur:0 }),
           sum1:  C.gradeSummary({ preset:'없음 (직접 조절)', bright:100, contrast:100, satur:100, temp:0 }),
           sum2:  C.gradeSummary({ preset:'흑백', bright:120, temp:-20 }) }
})
ok('기본값은 전부 1배(원본과 동일)', res.plain.b===1 && res.plain.c===1 && res.plain.sat===1 && res.plain.temp===0,
   JSON.stringify(res.plain))
ok('프리셋과 슬라이더가 함께 적용됨(따뜻 22 + 직접 10 = 32)', res.mix.temp===32 && Math.abs(res.mix.b-1.133)<0.01,
   `temp=${res.mix.temp} · b=${res.mix.b}`)
ok('채도 0 을 "설정 안 함" 으로 오해하지 않음', res.zero.sat===0, 'sat='+res.zero.sat)
ok('안 건드리면 "변경 없음" 이라고 알려줌', /변경 없음/.test(res.sum1), res.sum1)
ok('바꾼 항목만 사람 말로 요약', /흑백/.test(res.sum2)&&/밝기 \+20/.test(res.sum2)&&/차갑게 -20/.test(res.sum2), res.sum2)

// 4) 노드 버튼 클릭 경로
const click = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const src=C.addNode('bgremove',0,0,true); src.w.img=window.__mkImg(); src.w.toolKind='image'
  const gr=C.addNode('grade',0,0,true); gr.w.gpreset='흑백'; gr.w.gbright=100; gr.w.gcontrast=100; gr.w.gsatur=100; gr.w.gtemp=0
  S.links.push({ from:src.id, to:gr.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+gr.id).querySelector('[data-tool="grade"]').click()
  const t0=Date.now(); while(gr.w.toolBusy && Date.now()-t0<30000) await new Promise(r=>setTimeout(r,150))
  const p = gr.w.img ? await window.__pix(gr.w.img, 90, 30) : null
  return { info:gr.w.toolInfo||'', kind:gr.w.toolKind, px:p, chain:C.nodeImgs(gr).length }
})
ok('버튼 클릭으로 색보정이 실행됨', click.kind==='image' && !!click.px, click.info||'결과 없음')
ok('고른 프리셋이 실제 결과에 적용됨(흑백)', click.px && click.px[0]===click.px[1] && click.px[1]===click.px[2], click.px&&click.px.join(','))
ok('무엇을 바꿨는지 결과에 표시', /흑백/.test(click.info), click.info)
ok('결과가 다음 노드로 이어짐', click.chain===1, click.chain+'장')

// 5) 영상 — 프레임 전체에 같은 값이 적용되는가
const vid = await pg.evaluate(async () => {
  // 붉은 화면 1.2초짜리 테스트 영상
  const c=document.createElement('canvas'); c.width=160; c.height=90
  const x=c.getContext('2d'); const st=c.captureStream(30)
  const mime=['video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
  const rec=new MediaRecorder(st,{mimeType:mime}); const ch=[]
  rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
  const stopped=new Promise(r=>{ rec.onstop=r })
  rec.start(); const t0=performance.now()
  await new Promise(r=>{ (function loop(){ x.fillStyle='#c03030'; x.fillRect(0,0,160,90)
    if(performance.now()-t0<1200) requestAnimationFrame(loop); else r() })() })
  rec.stop(); await stopped
  const srcUrl=URL.createObjectURL(new Blob(ch,{type:'video/webm'}))

  const r = await window.__cn.gradeVideo(srcUrl, { preset:'흑백', bright:100, contrast:100, satur:100, temp:0 }, ()=>{})
  const v=document.createElement('video'); v.src=r.url; v.muted=true
  await new Promise(k=>{ v.onloadeddata=k; v.onerror=k; setTimeout(k,5000) })
  await new Promise(k=>{ v.onseeked=k; v.currentTime=0.3; setTimeout(k,4000) })
  const cc=document.createElement('canvas'); cc.width=v.videoWidth||160; cc.height=v.videoHeight||90
  try{ cc.getContext('2d').drawImage(v,0,0) }catch(e){}
  const d=cc.getContext('2d').getImageData(80,45,1,1).data
  return { info:r.info, kind:r.kind, dim:r.dim, px:[d[0],d[1],d[2]] }
})
ok('영상 색보정이 새 영상으로 나옴', vid.kind==='video' && vid.dim==='160×90', vid.info)
ok('영상 프레임에도 흑백이 실제로 적용됨(붉은 화면 → 회색)',
   Math.abs(vid.px[0]-vid.px[1])<18 && Math.abs(vid.px[1]-vid.px[2])<18, vid.px.join(','))

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
