// 영상 자르기 · 속도 조절 노드가 실제로 동작하는지 브라우저에서 확인한다.
//  · 지정한 구간만 남는가 (결과 길이로 확인)
//  · 속도 배수만큼 결과가 짧아지는가 (2배속 → 절반 길이)
//  · 자른 위치가 정말 그 구간인가 (색이 바뀌는 테스트 영상으로 확인)
//  · 소리 없애기 / 소리 유지가 그대로 반영되는가
//  · 잘못 입력(끝 ≤ 시작)하면 조용히 실패하지 않고 안내가 뜨는가
//  실행:  npm i -D playwright-core && node scripts/vtrim-node-test.mjs
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

// 색이 3초에 걸쳐 빨강 → 초록 → 파랑 으로 바뀌는 테스트 영상을 브라우저에서 만든다
await pg.evaluate(async () => {
  const c=document.createElement('canvas'); c.width=160; c.height=90
  const x=c.getContext('2d'); const st=c.captureStream(30)
  const AC=window.AudioContext||window.webkitAudioContext
  const ac=new AC(); const osc=ac.createOscillator(); const dst=ac.createMediaStreamDestination()
  osc.connect(dst); osc.start(); dst.stream.getAudioTracks().forEach(t=>st.addTrack(t))
  const mime=['video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
  const rec=new MediaRecorder(st,{mimeType:mime}); const ch=[]
  rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
  const stopped=new Promise(r=>{ rec.onstop=r })
  rec.start(100)
  const t0=performance.now()
  await new Promise(r=>{ (function loop(){
    const t=(performance.now()-t0)/1000
    x.fillStyle = t<1 ? '#ff0000' : t<2 ? '#00ff00' : '#0000ff'
    x.fillRect(0,0,160,90)
    if(t<3) requestAnimationFrame(loop); else r()
  })() })
  rec.stop(); await stopped; osc.stop(); ac.close()
  window.__testVid = URL.createObjectURL(new Blob(ch,{type:'video/webm'}))
})

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 노드 등록
const def = await pg.evaluate(() => {
  const d = window.__cn && window.__cn.DEFS && window.__cn.DEFS.vtrim
  if(!d) return null
  return { cat:d.cat, title:d.title, keys:d.widgets.map(w=>w.k).join(','),
           speeds:(d.widgets.find(w=>w.k==='vspeed')||{}).opts }
})
ok('자르기·속도 노드가 [편집] 팔레트에 등록됨', def && def.cat==='편집', def ? def.cat+' / '+def.title : '없음')
ok('시작·끝·속도·음소거 설정이 모두 있음',
   def && /trimA/.test(def.keys) && /trimB/.test(def.keys) && /vspeed/.test(def.keys) && /vmute/.test(def.keys), def && def.keys)
ok('속도 선택지 6종(0.25~4배)', def && def.speeds.length===6, def && def.speeds.join(' | '))

// 2) 속도 라벨 해석
const sp = await pg.evaluate(() => {
  const c=window.__cn
  return [c._speedOf('0.25배 (아주 느리게)'), c._speedOf('1배 (그대로)'), c._speedOf('2배 (빠르게)'), c._speedOf('4배 (아주 빠르게)')]
})
ok('속도 라벨을 올바른 배수로 해석', sp.join(',')==='0.25,1,2,4', sp.join(' / '))

// 헬퍼: 결과 영상의 길이와 특정 시각의 색을 읽는다
const probe = `async (url, at) => {
  const v=document.createElement('video'); v.src=url; v.muted=true
  await new Promise(r=>{ v.onloadeddata=r; v.onerror=r; setTimeout(r,5000) })
  // webm 은 길이가 Infinity 로 오는 일이 있어 끝까지 탐색해 실제 길이를 얻는다
  let dur=v.duration
  if(!isFinite(dur)){
    await new Promise(r=>{ v.onseeked=r; v.currentTime=1e6; setTimeout(r,4000) })
    dur=v.currentTime
  }
  await new Promise(r=>{ v.onseeked=r; v.currentTime=Math.min(at, Math.max(0,dur-0.05)); setTimeout(r,4000) })
  const c=document.createElement('canvas'); c.width=v.videoWidth||160; c.height=v.videoHeight||90
  try{ c.getContext('2d').drawImage(v,0,0) }catch(e){}
  const d=c.getContext('2d').getImageData(2,2,1,1).data
  const hue = d[0]>140&&d[1]<110&&d[2]<110 ? 'red' : d[1]>140&&d[0]<110&&d[2]<110 ? 'green' : d[2]>140&&d[0]<110&&d[1]<110 ? 'blue' : 'other'
  return { dur, hue, w:c.width, h:c.height }
}`

// 3) 1~2초 구간만 자르기 → 길이 약 1초, 화면은 초록
const cut = await pg.evaluate(async (probeSrc) => {
  const P = eval('(' + probeSrc + ')')
  const r = await window.__cn.trimSpeedVideo(window.__testVid, { start:1, end:2, speed:1, mute:false }, ()=>{})
  return { info:r.info, sec:r.sec, ...(await P(r.url, 0.5)) }
}, probe)
ok('1~2초 구간만 남음 (길이 약 1초)', Math.abs(cut.dur-1) < 0.35, '실제 '+ (Math.round(cut.dur*100)/100) +'초')
ok('자른 위치가 정확함 (그 구간의 초록 화면)', cut.hue==='green', cut.hue)
ok('원본 해상도 유지 (160×90)', cut.w===160 && cut.h===90, cut.w+'x'+cut.h)
ok('소리 유지가 결과에 표시됨', /소리 유지/.test(cut.info), cut.info)

// 4) 2배속 → 3초 영상이 약 1.5초로
const fast = await pg.evaluate(async (probeSrc) => {
  const P = eval('(' + probeSrc + ')')
  const r = await window.__cn.trimSpeedVideo(window.__testVid, { start:0, end:null, speed:2, mute:true }, ()=>{})
  return { info:r.info, sec:r.sec, ...(await P(r.url, 0.1)) }
}, probe)
ok('2배속 → 길이가 절반(3초 → 약 1.5초)', Math.abs(fast.dur-1.5) < 0.4, '실제 '+(Math.round(fast.dur*100)/100)+'초')
ok('2배속에서도 시작은 원본의 시작(빨강)', fast.hue==='red', fast.hue)
ok('소리 없애기가 반영됨', /소리 없음/.test(fast.info), fast.info)

// 5) 노드 버튼 클릭 경로
const click = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const src=C.addNode('output',0,0,true); src.w.vid=window.__testVid; src.w.kind='video'
  const tr=C.addNode('vtrim',0,0,true)
  tr.w.trimA='2'; tr.w.trimB=''; tr.w.vspeed='1배 (그대로)'; tr.w.vmute=true
  S.links.push({ from:src.id, to:tr.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+tr.id).querySelector('[data-tool="vtrim"]').click()
  const t0=Date.now(); while(tr.w.toolBusy && Date.now()-t0<60000) await new Promise(r=>setTimeout(r,200))
  return { info:tr.w.toolInfo||'', kind:tr.w.toolKind, has:!!tr.w.img }
})
ok('버튼 클릭으로 영상 편집이 실행됨', click.has && click.kind==='video', click.info||'결과 없음')
ok('끝을 비우면 "끝까지" 로 동작 (2초~끝 = 약 1초)', /1(\.\d)?초 구간/.test(click.info), click.info)

// 6) 잘못된 구간 입력 — 안내 후 중단
const bad = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const src=C.addNode('output',0,0,true); src.w.vid=window.__testVid; src.w.kind='video'
  const tr=C.addNode('vtrim',0,0,true); tr.w.trimA='2'; tr.w.trimB='1'
  S.links.push({ from:src.id, to:tr.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+tr.id).querySelector('[data-tool="vtrim"]').click()
  await new Promise(r=>setTimeout(r,300))
  const t=document.getElementById('toast')
  return { busy:!!tr.w.toolBusy, img:!!tr.w.img, toast:(t?t.textContent:'').trim().slice(0,60) }
})
ok('끝 ≤ 시작이면 실행하지 않고 안내', !bad.busy && !bad.img, `busy=${bad.busy}`)
ok('안내 문구가 뜸', /끝 시간/.test(bad.toast), bad.toast||'(없음)')

// 7) 이미지를 연결하면 영상 전용이라고 알려준다
const wrongKind = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const cv=document.createElement('canvas'); cv.width=64; cv.height=64
  const src=C.addNode('bgremove',0,0,true); src.w.img=cv.toDataURL('image/png'); src.w.toolKind='image'
  const tr=C.addNode('vtrim',0,0,true)
  S.links.push({ from:src.id, to:tr.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+tr.id).querySelector('[data-tool="vtrim"]').click()
  await new Promise(r=>setTimeout(r,300))
  const t=document.getElementById('toast')
  return { img:!!tr.w.img, toast:(t?t.textContent:'').trim().slice(0,60) }
})
ok('이미지를 넣으면 영상 전용임을 안내', !wrongKind.img && /영상만/.test(wrongKind.toast), wrongKind.toast||'(없음)')

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
