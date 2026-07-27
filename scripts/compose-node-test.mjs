// 합성 노드(로고·워터마크 얹기)가 실제로 동작하는지 브라우저에서 확인한다.
//  · 고른 위치(네 모서리·가운데)에 정말 그 자리로 들어가는가
//  · 크기(%)·여백(%)이 계산대로 반영되는가
//  · 투명도가 실제 픽셀에 섞이는가 / 투명 PNG 의 빈 부분이 그대로 비치는가
//  · '전체 채우기' 가 바탕을 꽉 덮는가
//  · 두 포트 중 하나라도 비면 조용히 실패하지 않고 안내가 뜨는가
//  · 영상 바탕에도 프레임마다 같은 자리에 얹히는가
//  실행:  npm i -D playwright-core && node scripts/compose-node-test.mjs
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

await pg.evaluate(() => {
  // 바탕: 400×200 파랑 / 로고: 40×40 순수 초록 정사각(투명 여백 없음)
  window.__base = (() => { const c=document.createElement('canvas'); c.width=400; c.height=200
    const x=c.getContext('2d'); x.fillStyle='#0000ff'; x.fillRect(0,0,400,200); return c.toDataURL('image/png') })()
  window.__logo = (() => { const c=document.createElement('canvas'); c.width=40; c.height=40
    const x=c.getContext('2d'); x.fillStyle='#00ff00'; x.fillRect(0,0,40,40); return c.toDataURL('image/png') })()
  // 반투명 PNG: 왼쪽 절반만 초록, 오른쪽 절반은 완전 투명
  window.__half = (() => { const c=document.createElement('canvas'); c.width=40; c.height=40
    const x=c.getContext('2d'); x.fillStyle='#00ff00'; x.fillRect(0,0,20,40); return c.toDataURL('image/png') })()
  window.__pix = async (url, px, py) => {
    const img = await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src=url })
    const c=document.createElement('canvas'); c.width=img.width; c.height=img.height
    c.getContext('2d').drawImage(img,0,0)
    const d=c.getContext('2d').getImageData(px,py,1,1).data
    return [d[0],d[1],d[2]]
  }
  // 초록이 차지하는 사각형(최소/최대 좌표)을 구한다 — 위치·크기를 눈이 아니라 숫자로 검증
  window.__greenBox = async (url) => {
    const img = await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src=url })
    const c=document.createElement('canvas'); c.width=img.width; c.height=img.height
    c.getContext('2d').drawImage(img,0,0)
    const d=c.getContext('2d').getImageData(0,0,img.width,img.height).data
    let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0
    for(let y=0;y<img.height;y++) for(let x=0;x<img.width;x++){
      const i=(y*img.width+x)*4
      if(d[i+1]>120 && d[i]<120 && d[i+2]<120){ n++; if(x<x0)x0=x; if(y<y0)y0=y; if(x>x1)x1=x; if(y>y1)y1=y }
    }
    return n ? { x:x0, y:y0, w:x1-x0+1, h:y1-y0+1, n } : null
  }
})

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 노드 등록
const def = await pg.evaluate(() => {
  const d = window.__cn && window.__cn.DEFS && window.__cn.DEFS.compose
  if(!d) return null
  return { cat:d.cat, title:d.title, ins:d.ins.map(i=>i[0]).join(','),
           keys:d.widgets.map(w=>w.k).join(','), pos:(d.widgets.find(w=>w.k==='cpos')||{}).opts }
})
ok('합성 노드가 [편집] 팔레트에 등록됨', def && def.cat==='편집', def ? def.cat+' / '+def.title : '없음')
ok('입력이 2개(바탕 + 위에 올릴 그림)', def && def.ins==='base,over', def && def.ins)
ok('위치 6종 · 크기·투명도·여백·겹치는 방식 설정',
   def && def.pos.length===6 && /csize/.test(def.keys) && /copacity/.test(def.keys) && /cmargin/.test(def.keys) && /cblend/.test(def.keys),
   def && def.keys)

// 2) 위치가 실제 좌표로 반영되는가 (400×200 바탕 · 크기 10% = 40px · 여백 5% = 10px)
const posBox = await pg.evaluate(async () => {
  const C=window.__cn
  const base = { size:10, opacity:100, margin:5, blend:'일반' }
  const R={}
  for(const p of ['오른쪽 아래','왼쪽 아래','오른쪽 위','왼쪽 위','가운데']){
    const r = await C.composeImage(window.__base, window.__logo, {...base, pos:p})
    R[p] = await window.__greenBox(r.url)
  }
  return R
})
// 여백 = min(400,200)*5% = 10px · 로고 = 400*10% = 40×40
ok('오른쪽 아래 배치 좌표가 정확', posBox['오른쪽 아래'] && posBox['오른쪽 아래'].x===350 && posBox['오른쪽 아래'].y===150,
   JSON.stringify(posBox['오른쪽 아래']))
ok('왼쪽 아래 배치 좌표가 정확', posBox['왼쪽 아래'] && posBox['왼쪽 아래'].x===10 && posBox['왼쪽 아래'].y===150,
   JSON.stringify(posBox['왼쪽 아래']))
ok('오른쪽 위 배치 좌표가 정확', posBox['오른쪽 위'] && posBox['오른쪽 위'].x===350 && posBox['오른쪽 위'].y===10,
   JSON.stringify(posBox['오른쪽 위']))
ok('왼쪽 위 배치 좌표가 정확', posBox['왼쪽 위'] && posBox['왼쪽 위'].x===10 && posBox['왼쪽 위'].y===10,
   JSON.stringify(posBox['왼쪽 위']))
ok('가운데 배치 좌표가 정확', posBox['가운데'] && posBox['가운데'].x===180 && posBox['가운데'].y===80,
   JSON.stringify(posBox['가운데']))
ok('크기 10% → 40×40px', posBox['가운데'] && posBox['가운데'].w===40 && posBox['가운데'].h===40,
   posBox['가운데'] && (posBox['가운데'].w+'×'+posBox['가운데'].h))

// 3) 크기·여백·전체 채우기
const sizes = await pg.evaluate(async () => {
  const C=window.__cn
  const big  = await C.composeImage(window.__base, window.__logo, { pos:'왼쪽 위', size:50, opacity:100, margin:0 })
  const full = await C.composeImage(window.__base, window.__logo, { pos:'전체 채우기', size:10, opacity:100, margin:5 })
  const tall = await C.composeImage(window.__base, window.__logo, { pos:'가운데', size:100, opacity:100, margin:0 })
  return { big: await window.__greenBox(big.url), full: await window.__greenBox(full.url),
           tall: await window.__greenBox(tall.url), fullInfo: full.info }
})
ok('크기 50% → 200×200px, 여백 0 이면 딱 모서리(0,0)',
   sizes.big && sizes.big.w===200 && sizes.big.x===0 && sizes.big.y===0, JSON.stringify(sizes.big))
ok('전체 채우기 → 바탕 전체(400×200)를 덮음',
   sizes.full && sizes.full.x===0 && sizes.full.y===0 && sizes.full.w===400 && sizes.full.h===200, JSON.stringify(sizes.full))
ok('세로가 넘치면 바탕 높이에 맞춰 자동으로 줄임(잘리지 않음)',
   sizes.tall && sizes.tall.h<=200 && sizes.tall.w===sizes.tall.h, JSON.stringify(sizes.tall))

// 4) 투명도와 투명 PNG
const alpha = await pg.evaluate(async () => {
  const C=window.__cn
  const half = await C.composeImage(window.__base, window.__logo, { pos:'왼쪽 위', size:10, opacity:50, margin:0 })
  const png  = await C.composeImage(window.__base, window.__half, { pos:'왼쪽 위', size:10, opacity:100, margin:0 })
  return { blend: await window.__pix(half.url, 5, 5),      // 파랑 바탕 + 초록 로고 50%
           left:  await window.__pix(png.url, 5, 5),       // 투명 PNG 의 초록 절반
           right: await window.__pix(png.url, 35, 5),      // 투명 PNG 의 빈 절반 → 바탕이 그대로
           info: half.info }
})
ok('투명도 50% → 바탕과 로고 색이 반씩 섞임',
   alpha.blend[1]>90 && alpha.blend[1]<170 && alpha.blend[2]>90 && alpha.blend[2]<170, alpha.blend.join(','))
ok('투명 PNG 의 그림 부분은 그대로 올라감', alpha.left[1]>200 && alpha.left[2]<60, alpha.left.join(','))
ok('투명 PNG 의 빈 부분은 바탕이 그대로 비침', alpha.right[2]>200 && alpha.right[1]<60, alpha.right.join(','))
ok('결과 정보에 위치·크기·투명도 표시', /왼쪽 위/.test(alpha.info) && /투명도 50%/.test(alpha.info), alpha.info)

// 5) 노드 버튼 클릭 경로
const click = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const bs=C.addNode('bgremove',0,0,true); bs.w.img=window.__base; bs.w.toolKind='image'
  const lg=C.addNode('bgremove',0,0,true); lg.w.img=window.__logo; lg.w.toolKind='image'
  const cp=C.addNode('compose',0,0,true)
  cp.w.cpos='오른쪽 위'; cp.w.csize=10; cp.w.copacity=100; cp.w.cmargin=5; cp.w.cblend='일반'
  S.links.push({ from:bs.id, to:cp.id, fromPort:'out', toPort:'base' })
  S.links.push({ from:lg.id, to:cp.id, fromPort:'out', toPort:'over' })
  C.render()
  document.getElementById('nd-'+cp.id).querySelector('[data-tool="compose"]').click()
  const t0=Date.now(); while(cp.w.toolBusy && Date.now()-t0<30000) await new Promise(r=>setTimeout(r,150))
  return { info:cp.w.toolInfo||'', kind:cp.w.toolKind,
           box: cp.w.img ? await window.__greenBox(cp.w.img) : null, chain:C.nodeImgs(cp).length }
})
ok('버튼 클릭으로 합성이 실행됨', click.kind==='image' && !!click.box, click.info||'결과 없음')
ok('노드 설정대로 오른쪽 위에 들어감', click.box && click.box.x===350 && click.box.y===10, JSON.stringify(click.box))
ok('결과가 다음 노드로 이어짐', click.chain===1, click.chain+'장')

// 6) 포트가 비었을 때 안내
const guard = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const bs=C.addNode('bgremove',0,0,true); bs.w.img=window.__base; bs.w.toolKind='image'
  const cp=C.addNode('compose',0,0,true)
  S.links.push({ from:bs.id, to:cp.id, fromPort:'out', toPort:'base' })   // 로고만 빠뜨림
  C.render()
  document.getElementById('nd-'+cp.id).querySelector('[data-tool="compose"]').click()
  await new Promise(r=>setTimeout(r,300))
  const t1=(document.getElementById('toast').textContent||'').trim()
  const cp2=C.addNode('compose',0,0,true); C.render()                    // 둘 다 빠뜨림
  document.getElementById('nd-'+cp2.id).querySelector('[data-tool="compose"]').click()
  await new Promise(r=>setTimeout(r,300))
  return { noLogo:t1.slice(0,60), noBase:(document.getElementById('toast').textContent||'').trim().slice(0,60),
           img:!!cp.w.img, busy:!!cp.w.toolBusy }
})
ok('로고를 빠뜨리면 안내 후 중단', !guard.busy && !guard.img && /올릴 그림/.test(guard.noLogo), guard.noLogo||'(없음)')
ok('바탕을 빠뜨리면 안내 후 중단', /바탕/.test(guard.noBase), guard.noBase||'(없음)')

// 7) 영상 바탕에도 같은 자리에 얹히는가
const vid = await pg.evaluate(async () => {
  const c=document.createElement('canvas'); c.width=200; c.height=100
  const x=c.getContext('2d'); const st=c.captureStream(30)
  const mime=['video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
  const rec=new MediaRecorder(st,{mimeType:mime}); const ch=[]
  rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
  const stopped=new Promise(r=>{ rec.onstop=r })
  rec.start(); const t0=performance.now()
  await new Promise(r=>{ (function loop(){ x.fillStyle='#0000ff'; x.fillRect(0,0,200,100)
    if(performance.now()-t0<1200) requestAnimationFrame(loop); else r() })() })
  rec.stop(); await stopped
  const srcUrl=URL.createObjectURL(new Blob(ch,{type:'video/webm'}))

  const r = await window.__cn.composeVideo(srcUrl, window.__logo,
    { pos:'왼쪽 위', size:20, opacity:100, margin:0, blend:'일반' }, ()=>{})
  const v=document.createElement('video'); v.src=r.url; v.muted=true
  await new Promise(k=>{ v.onloadeddata=k; v.onerror=k; setTimeout(k,5000) })
  await new Promise(k=>{ v.onseeked=k; v.currentTime=0.4; setTimeout(k,4000) })
  const cc=document.createElement('canvas'); cc.width=v.videoWidth||200; cc.height=v.videoHeight||100
  try{ cc.getContext('2d').drawImage(v,0,0) }catch(e){}
  const g=cc.getContext('2d').getImageData(10,10,1,1).data     // 로고 안쪽
  const bgp=cc.getContext('2d').getImageData(150,80,1,1).data  // 로고 밖(바탕)
  return { info:r.info, kind:r.kind, dim:r.dim, logo:[g[0],g[1],g[2]], bg:[bgp[0],bgp[1],bgp[2]] }
})
ok('영상 합성이 새 영상으로 나옴', vid.kind==='video' && vid.dim==='200×100', vid.info)
ok('영상 프레임 왼쪽 위에 로고가 실제로 찍힘', vid.logo[1]>140 && vid.logo[2]<120, vid.logo.join(','))
ok('로고 밖은 원래 바탕 그대로', vid.bg[2]>140 && vid.bg[1]<120, vid.bg.join(','))

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
