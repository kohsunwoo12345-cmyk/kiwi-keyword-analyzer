// 편집 노드의 '생애 주기' 를 확인한다 — 여기까지는 아직 한 번도 확인하지 않았던 부분.
//  · 저장했다가 새로고침해서 다시 열면 결과가 그대로 살아 있는가 (보관된 주소라야 살아남는다)
//  · 실행 취소(Undo) / 다시 실행(Redo) 로 편집 결과가 오갔다 돌아오는가
//  · 노드를 복제하면 결과와 설정이 따라오는가
//  · 노드를 지우면 그래프에서 깨끗이 빠지는가
//  · 버튼을 연달아 두 번 눌러도 두 번 돌지 않는가 (중복 실행 방지)
//  · 워크플로우를 파일로 내보내고 다시 불러와도 결과가 남는가
//  실행:  npm i -D playwright-core && node scripts/edit-lifecycle-test.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'

const PUB = path.resolve('public')
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css' }
let uploads = 0
const server = http.createServer((req,res)=>{
  const p = new URL(req.url,'http://x').pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  const body = () => new Promise(r=>{ const ch=[]; req.on('data',d=>ch.push(d)); req.on('end',()=>r(Buffer.concat(ch))) })
  if(p==='/api/upload') return body().then(()=>send(200, JSON.stringify({ ok:true, url:'/api/media/gen/keep'+(++uploads)+'.png' })))
  // 보관된 주소는 언제 열어도 살아 있어야 한다 → 늘 같은 그림을 돌려준다(초록 8×8)
  if(p.startsWith('/api/media/')) return send(200, GREEN_PNG, 'image/png')
  if(p.startsWith('/models/')) return send(404,'no','text/plain')
  if(p.startsWith('/api/')) return body().then(()=>send(200, JSON.stringify({ ok:true, charged:0 })))
  const f=path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
// 8×8 불투명 초록 PNG 를 직접 만든다 — 보관된 주소로 그림이 '실제로' 다시 그려지는지 픽셀로 보기 위함
function makeGreenPng(size = 8) {
  const crc = (buf) => { let c = ~0
    for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)) }
    return ~c >>> 0 }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, cr])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0     // 8bit RGB
  const raw = Buffer.concat(Array.from({ length: size }, () =>
    Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: size }, () => Buffer.from([0x22, 0xC0, 0x44])))])))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
const GREEN_PNG = makeGreenPng()

await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx=await b.newContext()
const pg=await ctx.newPage(); const errs=[]
pg.on('pageerror',e=>errs.push(String(e).slice(0,160)))
await pg.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await pg.waitForTimeout(1500)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 편집 결과를 하나 만들고 보관될 때까지 기다린다
const made = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const cv=document.createElement('canvas'); cv.width=100; cv.height=60
  const x=cv.getContext('2d'); x.fillStyle='#3060a0'; x.fillRect(0,0,100,60)
  const src=C.addNode('bgremove',120,120,true); src.w.img=cv.toDataURL('image/png'); src.w.toolKind='image'
  const gr=C.addNode('grade',420,120,true); gr.w.gpreset='흑백'; gr.w.gtemp=25
  S.links.push({ from:src.id, to:gr.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+gr.id).querySelector('[data-tool="grade"]').click()
  const t0=Date.now(); while(gr.w.toolBusy && Date.now()-t0<30000) await new Promise(r=>setTimeout(r,120))
  const t1=Date.now(); while(!gr.w.toolHosted && Date.now()-t1<20000) await new Promise(r=>setTimeout(r,120))
  window.__gradeId = gr.id
  return { url:gr.w.img, info:gr.w.toolInfo, preset:gr.w.gpreset, temp:gr.w.gtemp, nodes:S.nodes.length }
})
ok('편집 결과가 보관된 주소를 가짐', /^\/api\/media\//.test(made.url), made.url)

// 1) 실행 취소 / 다시 실행
const undo = await pg.evaluate(async () => {
  const C=window.__cn
  const id=window.__gradeId
  const cur=()=>C.state.nodes.find(n=>n.id===id)
  const before=cur().w.img
  document.body.dispatchEvent(new KeyboardEvent('keydown',{ key:'z', ctrlKey:true, bubbles:true }))
  await new Promise(r=>setTimeout(r,300))
  const afterUndo=cur()?cur().w.img:null
  document.body.dispatchEvent(new KeyboardEvent('keydown',{ key:'y', ctrlKey:true, bubbles:true }))
  await new Promise(r=>setTimeout(r,300))
  const afterRedo=cur()?cur().w.img:null
  return { before, afterUndo, afterRedo }
})
ok('실행 취소로 편집 전 상태로 돌아감', undo.afterUndo !== undo.before, `${String(undo.afterUndo).slice(0,24)}…`)
ok('다시 실행으로 편집 결과가 복구됨', undo.afterRedo === undo.before, `${String(undo.afterRedo).slice(0,28)}…`)

// 2) 저장 → 새로고침 → 다시 열기 (실제로 살아남는가)
await pg.evaluate(() => new Promise(r => setTimeout(r, 800)))   // 자동 저장이 끝날 시간
await pg.reload({ waitUntil:'domcontentloaded' })
await pg.waitForTimeout(2500)
const reopened = await pg.evaluate(async () => {
  const C=window.__cn
  const gr=C.state.nodes.find(n=>n.type==='grade')
  if(!gr) return { found:false }
  // 보관된 주소가 실제로 다시 그려지는지 픽셀로 확인
  let drawn=null
  if(gr.w.img){
    drawn = await new Promise(r=>{ const i=new Image()
      i.onload=()=>{ const c=document.createElement('canvas'); c.width=i.width; c.height=i.height
        c.getContext('2d').drawImage(i,0,0)
        const d=c.getContext('2d').getImageData(1,1,1,1).data; r([d[0],d[1],d[2]]) }
      i.onerror=()=>r(null); i.src=gr.w.img })
  }
  const el=document.getElementById('nd-'+gr.id)
  return { found:true, url:gr.w.img, info:gr.w.toolInfo, preset:gr.w.gpreset, temp:gr.w.gtemp,
           busy:!!gr.w.toolBusy, drawn, hasImgTag: !!(el && el.querySelector('img')) }
})
ok('새로고침 후에도 노드가 남아 있음', reopened.found)
ok('편집 결과 주소가 그대로 살아 있음', /^\/api\/media\//.test(reopened.url||''), reopened.url||'(없음)')
ok('그 주소로 그림이 실제로 다시 그려짐', Array.isArray(reopened.drawn) && reopened.drawn[1] > 100,
   reopened.drawn ? reopened.drawn.join(',') : '못 그림')
ok('노드 안에 결과가 표시됨', reopened.hasImgTag === true)
ok('설정(분위기·색온도)도 그대로 복원', reopened.preset==='흑백' && Number(reopened.temp)===25,
   `${reopened.preset} · ${reopened.temp}`)
ok('"처리 중" 상태로 멈춰 있지 않음', reopened.busy===false)

// 3) 복제 · 삭제
const dup = await pg.evaluate(async () => {
  const C=window.__cn
  const gr=C.state.nodes.find(n=>n.type==='grade')
  const before=C.state.nodes.length
  // 스튜디오의 복제 = 복사(Ctrl+C) → 붙여넣기(Ctrl+V)
  const el=document.getElementById('nd-'+gr.id)
  el.dispatchEvent(new MouseEvent('mousedown',{ bubbles:true, clientX:10, clientY:10 }))
  document.dispatchEvent(new MouseEvent('mouseup',{ bubbles:true }))
  await new Promise(r=>setTimeout(r,150))
  document.body.dispatchEvent(new KeyboardEvent('keydown',{ key:'c', ctrlKey:true, bubbles:true }))
  await new Promise(r=>setTimeout(r,150))
  document.body.dispatchEvent(new KeyboardEvent('keydown',{ key:'v', ctrlKey:true, bubbles:true }))
  await new Promise(r=>setTimeout(r,400))
  const grades=C.state.nodes.filter(n=>n.type==='grade')
  const copy=grades.find(n=>n.id!==gr.id)
  return { before, after:C.state.nodes.length, copies:grades.length,
           sameImg: copy ? copy.w.img===gr.w.img : null,
           samePreset: copy ? copy.w.gpreset===gr.w.gpreset : null,
           copyId: copy?copy.id:null }
})
ok('노드 복제가 동작함', dup.copies===2, `색보정 노드 ${dup.copies}개`)
ok('복제본이 결과와 설정을 그대로 가져감', dup.sameImg===true && dup.samePreset===true,
   `결과 ${dup.sameImg} · 설정 ${dup.samePreset}`)

const del = await pg.evaluate(async () => {
  const C=window.__cn
  const id=window.__delId = C.state.nodes.filter(n=>n.type==='grade')[1]?.id
  if(!id) return { skip:true }
  const el=document.getElementById('nd-'+id)
  el.dispatchEvent(new MouseEvent('mousedown',{ bubbles:true, clientX:10, clientY:10 }))
  document.dispatchEvent(new MouseEvent('mouseup',{ bubbles:true }))
  await new Promise(r=>setTimeout(r,150))
  document.body.dispatchEvent(new KeyboardEvent('keydown',{ key:'Delete', bubbles:true }))
  await new Promise(r=>setTimeout(r,400))
  return { gone: !C.state.nodes.some(n=>n.id===id),
           links: C.state.links.filter(l=>l.from===id||l.to===id).length,
           dom: !document.getElementById('nd-'+id) }
})
ok('노드 삭제가 그래프에서 깨끗이 빠짐', del.skip || (del.gone && del.links===0 && del.dom),
   del.skip?'건너뜀':`남은 연결 ${del.links}개`)

// 4) 버튼 연타 — 두 번 돌지 않는가
const twice = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const cv=document.createElement('canvas'); cv.width=600; cv.height=400
  const x=cv.getContext('2d'); x.fillStyle='#204070'; x.fillRect(0,0,600,400)
  const src=C.addNode('bgremove',0,0,true); src.w.img=cv.toDataURL('image/png'); src.w.toolKind='image'
  const up=C.addNode('upscale',0,0,true); up.w.upx='4배'
  S.links.push({ from:src.id, to:up.id, fromPort:'out', toPort:'in' })
  C.render()
  const btn=()=>document.getElementById('nd-'+up.id).querySelector('[data-tool="upscale"]')
  // ① '처리 중' 상태에서 누르면 무시되는가 — 타이밍에 기대지 않고 상태를 직접 만들어 확인한다
  up.w.toolBusy=true
  btn().click()
  await new Promise(r=>setTimeout(r,400))
  const guarded = !up.w.img          // 처리 중이었으므로 아무 일도 일어나지 않아야 한다
  up.w.toolBusy=false
  // ② 정상 상태에서 한 번 눌러 결과를 얻는다
  btn().click()
  const t0=Date.now(); while(up.w.toolBusy && Date.now()-t0<90000) await new Promise(r=>setTimeout(r,100))
  const dim = up.w.img ? await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i.width+'x'+i.height); i.onerror=()=>r(null); i.src=up.w.img }) : null
  return { guarded, dim, info:up.w.toolInfo }
})
ok('실행 중에는 다시 눌러도 중복 실행되지 않음', twice.guarded===true, twice.guarded?'무시됨':'중복 실행됨')
ok('한 번 실행하면 요청한 4배 그대로 나옴', twice.dim==='2400x1600', String(twice.dim))

// 5) 파일로 내보내고 다시 불러오기
const io = await pg.evaluate(async () => {
  const C=window.__cn
  const gr=C.state.nodes.find(n=>n.type==='grade')
  // 저장 파일과 같은 형식으로 직렬화 → 다시 읽어 들이기
  const json = JSON.stringify({ nodes:C.state.nodes, links:C.state.links, groups:[], annos:[], seq:C.state.seq })
  const parsed = JSON.parse(json)
  C.loadDocIntoState({ data: parsed })
  const back = C.state.nodes.find(n=>n.id===gr.id)
  return { size: json.length, url: back?back.w.img:null, preset: back?back.w.gpreset:null,
           hasBlob: /blob:/.test(json), hasBigData: /data:image\/[a-z]+;base64,[A-Za-z0-9+/]{50000,}/.test(json) }
})
ok('내보낸 파일에 깨지는 임시 주소가 없음', io.hasBlob===false)
ok('다시 불러와도 결과가 그대로', /^\/api\/media\//.test(io.url||'') && io.preset==='흑백', `${io.url} · ${io.preset}`)

// 6) 영상 결과도 새로고침 후 살아남는가
//    영상 결과는 임시 주소(blob:)라 저장에서 걸러진다 → 보관 주소가 저장되지 않으면 통째로 사라진다.
await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  // 기존 노드를 모두 지우고 영상 하나만 남긴다(판정이 헷갈리지 않게)
  S.nodes.length=0; S.links.length=0; C.render()
  const c=document.createElement('canvas'); c.width=120; c.height=68
  const x=c.getContext('2d'); const st=c.captureStream(30)
  const mime=['video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
  const rec=new MediaRecorder(st,{mimeType:mime}); const ch=[]
  rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
  const stopped=new Promise(r=>{ rec.onstop=r }); rec.start()
  const t0=performance.now()
  await new Promise(r=>{ (function loop(){ x.fillStyle='#204070'; x.fillRect(0,0,120,68)
    if(performance.now()-t0<1500) requestAnimationFrame(loop); else r() })() })
  rec.stop(); await stopped
  const vurl=URL.createObjectURL(new Blob(ch,{type:'video/webm'}))
  const src=C.addNode('output',60,60,true); src.w.vid=vurl; src.w.kind='video'
  const cap=C.addNode('caption',400,60,true); cap.w.captext='새로고침 확인'; cap.w.capsize=9
  S.links.push({ from:src.id, to:cap.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+cap.id).querySelector('[data-tool="caption"]').click()
  const t1=Date.now(); while(cap.w.toolBusy && Date.now()-t1<60000) await new Promise(r=>setTimeout(r,150))
  const t2=Date.now(); while(!cap.w.toolHosted && Date.now()-t2<30000) await new Promise(r=>setTimeout(r,150))
  await new Promise(r=>setTimeout(r,900))   // 자동 저장이 끝날 시간
})
await pg.reload({ waitUntil:'domcontentloaded' })
await pg.waitForTimeout(2500)
const vidBack = await pg.evaluate(() => {
  const C=window.__cn
  const cap=C.state.nodes.find(n=>n.type==='caption')
  if(!cap) return { found:false }
  const el=document.getElementById('nd-'+cap.id)
  return { found:true, url:cap.w.img, kind:cap.w.toolKind, info:cap.w.toolInfo,
           hasVideoTag: !!(el && el.querySelector('video')), busy:!!cap.w.toolBusy }
})
ok('새로고침 후에도 자막 노드가 남아 있음', vidBack.found)
ok('영상 결과가 사라지지 않고 보관 주소로 남음', /^\/api\/media\//.test(vidBack.url||''), vidBack.url||'(사라짐)')
ok('영상으로 표시됨(재생 가능한 형태)', vidBack.kind==='video' && vidBack.hasVideoTag===true,
   `${vidBack.kind} · 영상태그 ${vidBack.hasVideoTag}`)
ok('결과 설명도 그대로 남음', /자막/.test(vidBack.info||''), vidBack.info||'(없음)')

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
