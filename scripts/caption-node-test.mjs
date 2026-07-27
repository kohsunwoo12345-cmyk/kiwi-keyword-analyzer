// 자막 노드가 실제로 글씨를 '구워 넣는지' 브라우저에서 확인한다.
//  · 이미지: 자막 자리의 픽셀이 실제로 바뀌었는가(글씨가 그려졌는가)
//  · 위치(아래/가운데/위)가 실제 픽셀 위치로 반영되는가
//  · 긴 문구가 화면 폭 안에서 여러 줄로 나뉘는가 / 사용자의 줄바꿈을 지키는가
//  · 노드 버튼 클릭 → 결과가 노드에 담기고 다음 노드로 이어지는가
//  · 영상: 프레임마다 자막이 얹힌 새 영상이 만들어지는가(소리 트랙 포함)
//  실행:  npm i -D playwright-core && node scripts/caption-node-test.mjs
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
  args:['--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream'],
})
const pg=await b.newPage(); const errs=[]
pg.on('pageerror',e=>errs.push(String(e).slice(0,160)))
await pg.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await pg.waitForTimeout(1500)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 노드 등록
const def = await pg.evaluate(() => {
  const d = window.__cn && window.__cn.DEFS && window.__cn.DEFS.caption
  if(!d) return null
  return { cat:d.cat, title:d.title, ins:d.ins.map(i=>i[0]).join(','), outs:d.outs.length,
           widgets:d.widgets.map(w=>w.k).join(','),
           styles:(d.widgets.find(w=>w.k==='capstyle')||{}).opts,
           pos:(d.widgets.find(w=>w.k==='cappos')||{}).opts }
})
ok('자막 노드가 [편집] 팔레트에 등록됨', def && def.cat==='편집', def ? def.cat+' / '+def.title : '없음')
ok('입력이 2개(미디어 + 텍스트 노드)', def && def.ins==='in,text', def && def.ins)
ok('글씨 스타일 4종 · 위치 3종', def && def.styles.length===4 && def.pos.length===3,
   def && (def.styles.length+'종 / '+def.pos.join('·')))

// 2) 이미지에 자막이 실제로 그려졌는가 (픽셀 비교)
const px = await pg.evaluate(async () => {
  const mk = (w,h,color) => { const c=document.createElement('canvas'); c.width=w; c.height=h
    const x=c.getContext('2d'); x.fillStyle=color; x.fillRect(0,0,w,h); return c.toDataURL('image/png') }
  const src = mk(640,360,'#204070')
  const load = u => new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src=u })
  async function band(url){                       // 위/가운데/아래 3구간의 '파란색이 아닌 픽셀' 비율
    const img = await load(url)
    const c=document.createElement('canvas'); c.width=img.width; c.height=img.height
    c.getContext('2d').drawImage(img,0,0)
    const d=c.getContext('2d').getImageData(0,0,img.width,img.height).data
    const zone=[0,0,0]
    for(let y=0;y<img.height;y++){
      const z = y < img.height/3 ? 0 : y < img.height*2/3 ? 1 : 2
      for(let x=0;x<img.width;x++){
        const i=(y*img.width+x)*4
        if(Math.abs(d[i]-0x20)>24 || Math.abs(d[i+1]-0x40)>24 || Math.abs(d[i+2]-0x70)>24) zone[z]++
      }
    }
    return zone
  }
  const C = window.__cn
  const bottom = await C.captionImage(src, { text:'안녕하세요 자막입니다', pos:'아래(기본)', style:'흰 글씨 + 검은 테두리', size:8 })
  const top    = await C.captionImage(src, { text:'안녕하세요 자막입니다', pos:'위',           style:'흰 글씨 + 검은 테두리', size:8 })
  const mid    = await C.captionImage(src, { text:'안녕하세요 자막입니다', pos:'가운데',        style:'노란 글씨 (예능 자막)', size:8 })
  const box    = await C.captionImage(src, { text:'박스 자막',            pos:'아래(기본)', style:'흰 글씨 + 검은 반투명 박스', size:8 })
  return { bottom:{ z:await band(bottom.url), info:bottom.info, dim:bottom.dim },
           top:{ z:await band(top.url) }, mid:{ z:await band(mid.url) }, box:{ z:await band(box.url) },
           plain:await band(src) }
})
ok('원본에는 글씨가 없다(대조군)', px.plain.reduce((a,b)=>a+b,0)===0, px.plain.join('/'))
ok('아래 자막 → 아래쪽 픽셀만 바뀜', px.bottom.z[2]>300 && px.bottom.z[0]===0, px.bottom.z.join(' / '))
ok('위 자막 → 위쪽 픽셀만 바뀜', px.top.z[0]>300 && px.top.z[2]===0, px.top.z.join(' / '))
ok('가운데 자막 → 가운데 픽셀만 바뀜', px.mid.z[1]>300 && px.mid.z[0]===0 && px.mid.z[2]===0, px.mid.z.join(' / '))
ok('반투명 박스 스타일은 더 넓은 영역을 덮음', px.box.z[2] > px.bottom.z[2], px.box.z[2]+' vs 글씨만 '+px.bottom.z[2])
ok('원본 해상도를 그대로 유지', px.bottom.dim==='640×360', px.bottom.dim)
ok('결과 정보에 줄 수 표시', /자막 1줄/.test(px.bottom.info), px.bottom.info)

// 3) 줄바꿈 — 사용자의 줄바꿈은 지키고, 긴 문구는 폭에 맞춰 자동으로 나눈다
const wrap = await pg.evaluate(async () => {
  const c=document.createElement('canvas'); c.width=640; c.height=360
  const x=c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,640,360)
  const C=window.__cn
  const two = await C.captionImage(c.toDataURL('image/png'), { text:'첫째 줄\n둘째 줄', pos:'아래(기본)', style:'흰 글씨 + 검은 테두리', size:6 })
  const long = await C.captionImage(c.toDataURL('image/png'),
    { text:'이 문장은 아주 길어서 한 줄에 다 들어가지 않고 자동으로 여러 줄로 나뉘어야 정상입니다 정말 길게 적어봅니다', pos:'아래(기본)', style:'흰 글씨 + 검은 테두리', size:6 })
  // 자동 줄바꿈이 화면 폭을 넘지 않는지: 좌우 4% 여백에 글씨가 없어야 한다
  const img = await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src=long.url })
  const cc=document.createElement('canvas'); cc.width=img.width; cc.height=img.height
  cc.getContext('2d').drawImage(img,0,0)
  const d=cc.getContext('2d').getImageData(0,0,img.width,img.height).data
  let edge=0
  for(let y=0;y<img.height;y++) for(const xx of [1,2,img.width-3,img.width-2]){
    const i=(y*img.width+xx)*4; if(d[i]>20||d[i+1]>20||d[i+2]>20) edge++
  }
  return { two:two.info, long:long.info, edge }
})
ok('사용자가 넣은 줄바꿈을 그대로 지킴(2줄)', /자막 2줄/.test(wrap.two), wrap.two)
ok('긴 문구는 자동으로 여러 줄로 나뉨', /자막 ([3-9]|\d\d)줄/.test(wrap.long), wrap.long)
ok('자동 줄바꿈이 화면 밖으로 넘치지 않음', wrap.edge===0, 'edge='+wrap.edge)

// 4) 노드 버튼 클릭 경로 (텍스트 노드 연결 포함)
const click = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const cv=document.createElement('canvas'); cv.width=640; cv.height=360
  const x=cv.getContext('2d'); x.fillStyle='#204070'; x.fillRect(0,0,640,360)
  const src=C.addNode('bgremove',0,0,true); src.w.img=cv.toDataURL('image/png'); src.w.toolKind='image'
  const txt=C.addNode('prompt',0,0,true); txt.w.text='텍스트 노드에서 온 자막'
  const cap=C.addNode('caption',0,0,true); cap.w.captext=''      // 비워두면 텍스트 노드를 써야 한다
  S.links.push({ from:src.id, to:cap.id, fromPort:'out', toPort:'in' })
  S.links.push({ from:txt.id, to:cap.id, fromPort:'out', toPort:'text' })
  C.render()
  document.getElementById('nd-'+cap.id).querySelector('[data-tool="caption"]').click()
  const t0=Date.now(); while(cap.w.toolBusy && Date.now()-t0<30000) await new Promise(r=>setTimeout(r,150))
  return { info:cap.w.toolInfo||'', kind:cap.w.toolKind, has:!!cap.w.img, chain:C.nodeImgs(cap).length }
})
ok('버튼 클릭으로 자막이 들어감', click.has && click.kind==='image', click.info||'결과 없음')
ok('문구를 비우면 연결된 [텍스트] 노드의 내용을 사용', /자막 1줄/.test(click.info), click.info)
ok('결과가 다음 노드로 이어짐', click.chain===1, click.chain+'장')

// 5) 문구가 아예 없으면 조용히 실패하지 않고 안내
const empty = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const cv=document.createElement('canvas'); cv.width=64; cv.height=64
  const src=C.addNode('bgremove',0,0,true); src.w.img=cv.toDataURL('image/png'); src.w.toolKind='image'
  const cap=C.addNode('caption',0,0,true); cap.w.captext=''
  S.links.push({ from:src.id, to:cap.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+cap.id).querySelector('[data-tool="caption"]').click()
  await new Promise(r=>setTimeout(r,300))
  const t=document.getElementById('toast')
  return { busy:!!cap.w.toolBusy, img:!!cap.w.img, toast:(t?t.textContent:'').trim().slice(0,60) }
})
ok('문구가 없으면 멈추지 않고 안내 후 중단', !empty.busy && !empty.img, `busy=${empty.busy}`)
ok('안내 문구가 뜸', /문구/.test(empty.toast), empty.toast||'(없음)')

// 6) 영상 — 프레임마다 자막을 얹어 새 영상을 만든다 (소리 트랙 포함)
const vid = await pg.evaluate(async () => {
  // 소리 있는 짧은 테스트 영상을 브라우저에서 직접 만든다(외부 파일 의존 없음)
  const c=document.createElement('canvas'); c.width=320; c.height=180
  const x=c.getContext('2d')
  const st=c.captureStream(30)
  const AC=window.AudioContext||window.webkitAudioContext
  const ac=new AC(); const osc=ac.createOscillator(); const dst=ac.createMediaStreamDestination()
  osc.frequency.value=440; osc.connect(dst); osc.start()
  dst.stream.getAudioTracks().forEach(t=>st.addTrack(t))
  const mime=['video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
  const rec=new MediaRecorder(st,{mimeType:mime}); const ch=[]
  rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
  const stopped=new Promise(r=>{ rec.onstop=r })
  rec.start()
  const t0=Date.now()
  await new Promise(r=>{ (function loop(){ x.fillStyle='#204070'; x.fillRect(0,0,320,180)
    if(Date.now()-t0<1500) requestAnimationFrame(loop); else r() })() })
  rec.stop(); await stopped; osc.stop(); ac.close()
  const srcUrl=URL.createObjectURL(new Blob(ch,{type:'video/webm'}))

  const r = await window.__cn.captionVideo(srcUrl, { text:'영상 자막', pos:'아래(기본)', style:'흰 글씨 + 검은 테두리', size:9 }, ()=>{})
  // 결과 영상의 첫 프레임에 자막이 실제로 있는지 픽셀로 확인
  const v=document.createElement('video'); v.src=r.url; v.muted=true
  await new Promise(ok2=>{ v.onloadeddata=ok2; v.onerror=ok2 })
  await new Promise(ok2=>{ v.currentTime=0.2; v.onseeked=ok2; setTimeout(ok2,3000) })
  const cc=document.createElement('canvas'); cc.width=v.videoWidth||320; cc.height=v.videoHeight||180
  try{ cc.getContext('2d').drawImage(v,0,0) }catch(e){}
  const d=cc.getContext('2d').getImageData(0,0,cc.width,cc.height).data
  let bright=0
  for(let i=0;i<d.length;i+=4) if(d[i]>200&&d[i+1]>200&&d[i+2]>200) bright++
  return { info:r.info, kind:r.kind, dim:r.dim, w:v.videoWidth, h:v.videoHeight, dur:v.duration, bright }
})
ok('영상에 자막을 굽고 새 영상이 만들어짐', vid.kind==='video' && vid.w>0, vid.info)
ok('원본 해상도 유지(320×180)', vid.dim==='320×180' && vid.w===320 && vid.h===180, vid.w+'x'+vid.h)
ok('영상 프레임에 흰 글씨가 실제로 찍힘', vid.bright>50, '흰 픽셀 '+vid.bright+'개')
ok('원본 소리가 결과에도 유지됨', /소리 유지/.test(vid.info), vid.info)

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
