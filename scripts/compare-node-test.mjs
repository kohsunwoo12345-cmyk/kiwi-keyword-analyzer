// 전/후 비교 노드가 실제로 동작하는지 브라우저에서 확인한다.
//  · 두 입력이 겹쳐 그려지고, 손잡이 위치대로 잘려 보이는가
//  · 손잡이를 밀면 다시 그리지 않고도 그 자리에서 잘리는 선이 움직이는가
//  · '나란히 보기' 로 바꾸면 두 개가 따로 보이는가
//  · 한쪽만 연결하면 무엇이 빠졌는지 알려주는가
//  · 영상도 비교되는가 / 뒤 노드로 [후] 가 그대로 전달되는가
//  실행:  npm i -D playwright-core && node scripts/compare-node-test.mjs
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
  const mk=(color)=>{ const c=document.createElement('canvas'); c.width=160; c.height=90
    const x=c.getContext('2d'); x.fillStyle=color; x.fillRect(0,0,160,90); return c.toDataURL('image/png') }
  window.__before = mk('#ff0000')
  window.__after  = mk('#00ff00')
  window.__mkVid = async () => {
    const c=document.createElement('canvas'); c.width=120; c.height=68
    const x=c.getContext('2d'); const st=c.captureStream(30)
    const mime=['video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
    const rec=new MediaRecorder(st,{mimeType:mime}); const ch=[]
    rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
    const stopped=new Promise(r=>{ rec.onstop=r }); rec.start()
    const t0=performance.now()
    await new Promise(r=>{ (function loop(){ x.fillStyle='#0000ff'; x.fillRect(0,0,120,68)
      if(performance.now()-t0<900) requestAnimationFrame(loop); else r() })() })
    rec.stop(); await stopped
    return URL.createObjectURL(new Blob(ch,{type:'video/webm'}))
  }
})

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 노드 등록
const def = await pg.evaluate(() => {
  const d = window.__cn && window.__cn.DEFS && window.__cn.DEFS.compare
  if(!d) return null
  return { cat:d.cat, title:d.title, ins:d.ins.map(i=>i[0]).join(','), outs:d.outs.length,
           modes:(d.widgets.find(w=>w.k==='cmpmode')||{}).opts }
})
ok('비교 노드가 [편집] 팔레트에 등록됨', def && def.cat==='편집', def ? def.cat+' / '+def.title : '없음')
ok('입력이 전(a) · 후(b) 2개', def && def.ins==='a,b', def && def.ins)
ok('보기 방식 2종(겹쳐 보기 · 나란히)', def && def.modes.length===2, def && def.modes.join(' | '))

// 2) 두 입력을 연결하면 겹쳐 그려지는가
const built = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const a=C.addNode('bgremove',0,0,true); a.w.img=window.__before; a.w.toolKind='image'
  const bn=C.addNode('bgremove',0,0,true); bn.w.img=window.__after;  bn.w.toolKind='image'
  const cp=C.addNode('compare',0,0,true)
  S.links.push({ from:a.id,  to:cp.id, fromPort:'out', toPort:'a' })
  S.links.push({ from:bn.id, to:cp.id, fromPort:'out', toPort:'b' })
  C.render()
  window.__cmpId = cp.id
  const el=document.getElementById('nd-'+cp.id)
  const wrap=el.querySelector('[data-cmpwrap]')
  const imgs=wrap?wrap.querySelectorAll('img'):[]
  const bLayer=wrap?wrap.querySelector('.cmpb'):null
  const bar=wrap?wrap.querySelector('.cmpbar'):null
  const rng=el.querySelector('[data-cmp]')
  return { hasWrap:!!wrap, imgCount:imgs.length,
           first:imgs[0]?imgs[0].getAttribute('src')===window.__before:false,
           second:imgs[1]?imgs[1].getAttribute('src')===window.__after:false,
           clip:bLayer?bLayer.style.clipPath:'', barLeft:bar?bar.style.left:'',
           rngVal:rng?rng.value:'' }
})
ok('두 입력이 겹쳐 그려짐', built.hasWrap && built.imgCount===2, '이미지 '+built.imgCount+'개')
ok('아래층이 [전](원본)', built.first)
ok('위층이 [후](편집본)', built.second)
ok('처음엔 가운데(50%)에서 잘림', /50%/.test(built.clip) && built.barLeft==='50%' && built.rngVal==='50',
   built.clip+' · bar '+built.barLeft)

// 3) 손잡이를 밀면 다시 그리지 않고 그 자리에서 움직이는가
const moved = await pg.evaluate(async () => {
  const el=document.getElementById('nd-'+window.__cmpId)
  const rng=el.querySelector('[data-cmp]')
  const wrapBefore=el.querySelector('[data-cmpwrap]')
  rng.value='20'; rng.dispatchEvent(new Event('input',{bubbles:true}))
  const wrapAfter=el.querySelector('[data-cmpwrap]')
  const n=window.__cn.state.nodes.find(x=>x.id===window.__cmpId)
  return { clip:wrapAfter.querySelector('.cmpb').style.clipPath,
           bar:wrapAfter.querySelector('.cmpbar').style.left,
           stored:n.w.cmpPos, sameEl: wrapBefore===wrapAfter }
})
ok('손잡이를 20% 로 밀면 그만큼 잘림', /20%/.test(moved.clip) && moved.bar==='20%', moved.clip+' · bar '+moved.bar)
ok('위치가 노드에 저장됨(워크플로우 저장 시 유지)', moved.stored===20, String(moved.stored))
ok('다시 그리지 않고 그 자리에서 움직임(끊김 없음)', moved.sameEl===true)

// 4) 나란히 보기
const side = await pg.evaluate(async () => {
  const C=window.__cn
  const n=C.state.nodes.find(x=>x.id===window.__cmpId)
  n.w.cmpmode='나란히 보기'; C.render()
  const el=document.getElementById('nd-'+window.__cmpId)
  const box=el.querySelector('.cmpside')
  const imgs=box?box.querySelectorAll('img'):[]
  const tags=box?Array.from(box.querySelectorAll('.cmptag')).map(t=>t.textContent):[]
  const hasWrap=!!el.querySelector('[data-cmpwrap]')
  n.w.cmpmode='겹쳐 보기 (손잡이 밀기)'; C.render()
  return { has:!!box, n:imgs.length, tags:tags.join(','), overlayGone:!hasWrap }
})
ok('나란히 보기로 바꾸면 두 개가 따로 보임', side.has && side.n===2, '이미지 '+side.n+'개')
ok('어느 쪽이 전/후인지 표시', side.tags==='전,후', side.tags)
ok('겹쳐 보기 화면은 사라짐(둘이 동시에 뜨지 않음)', side.overlayGone)

// 5) 한쪽만 연결하면 무엇이 빠졌는지 알려준다
const partial = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const a=C.addNode('bgremove',0,0,true); a.w.img=window.__before; a.w.toolKind='image'
  const cp=C.addNode('compare',0,0,true)
  S.links.push({ from:a.id, to:cp.id, fromPort:'out', toPort:'a' })
  C.render()
  const t1=(document.getElementById('nd-'+cp.id).querySelector('.empty')||{}).textContent||''
  const cp2=C.addNode('compare',0,0,true); C.render()
  const t2=(document.getElementById('nd-'+cp2.id).querySelector('.empty')||{}).textContent||''
  return { one:t1.replace(/\s+/g,' ').trim(), none:t2.replace(/\s+/g,' ').trim() }
})
ok('[후] 만 빠지면 그것만 콕 집어 알려줌', /\[후\] 포트에 편집본을 연결/.test(partial.one) && !/\[전\]/.test(partial.one), partial.one)
ok('둘 다 빠지면 둘 다 알려줌', /\[전\]/.test(partial.none) && /\[후\]/.test(partial.none), partial.none)

// 6) 영상 비교 + 뒤 노드로 [후] 전달
const chain = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const vurl = await window.__mkVid()
  const av=C.addNode('output',0,0,true); av.w.vid=vurl; av.w.kind='video'
  const bv=C.addNode('bgremove',0,0,true); bv.w.img=window.__after; bv.w.toolKind='image'
  const cp=C.addNode('compare',0,0,true)
  S.links.push({ from:av.id, to:cp.id, fromPort:'out', toPort:'a' })
  S.links.push({ from:bv.id, to:cp.id, fromPort:'out', toPort:'b' })
  C.render()
  const el=document.getElementById('nd-'+cp.id)
  const wrap=el.querySelector('[data-cmpwrap]')
  const med=C.nodeMedia(cp)
  const imgs=C.nodeImgs(cp)
  // 되돌기 방지: 비교 노드끼리 서로 물려도 멈추지 않아야 한다
  const l1=C.addNode('compare',0,0,true), l2=C.addNode('compare',0,0,true)
  S.links.push({ from:l1.id, to:l2.id, fromPort:'out', toPort:'b' })
  S.links.push({ from:l2.id, to:l1.id, fromPort:'out', toPort:'b' })
  let loopOk=true
  try{ C.nodeMedia(l1) }catch(e){ loopOk=false }
  return { video: wrap ? wrap.querySelectorAll('video').length : 0,
           img: wrap ? wrap.querySelectorAll('img').length : 0,
           passUrl: med && med.url===window.__after, passKind: med && med.kind, imgs:imgs.length, loopOk }
})
ok('영상도 그대로 비교됨(영상 1 + 이미지 1)', chain.video===1 && chain.img===1, `영상 ${chain.video} · 이미지 ${chain.img}`)
ok('뒤 노드로 [후] 가 그대로 전달됨', chain.passUrl && chain.passKind==='image', String(chain.passKind))
ok('레퍼런스로도 이어짐', chain.imgs===1, chain.imgs+'장')
ok('비교 노드끼리 서로 물려도 멈추지 않음', chain.loopOk)

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
