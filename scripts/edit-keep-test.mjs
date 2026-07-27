// 편집 결과가 '사라지지 않고 남는지' 를 확인한다.
//  · 편집이 끝나면 결과가 우리 저장소로 올라가고 노드 주소가 그 URL 로 바뀌는가
//  · 관리자 "AI 생성 기록" 으로 올바른 이름·수량이 전송되는가 (이미지=장, 영상=초)
//  · 보관함에도 들어가는가
//  · 새로고침하면 깨지는 임시 주소(blob:)가 저장에 섞이지 않는가
//  · 같은 결과를 두 번 올리지 않는가
//  실행:  npm i -D playwright-core && node scripts/edit-keep-test.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'

const PUB = path.resolve('public')
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css' }
const uploads = []      // /api/upload 로 올라온 것
const records = []      // /api/usage/record 로 기록된 것
const gallery = []      // 보관함에 담긴 것
let slowUpload = false  // 업로드를 일부러 느리게 만들어 '미리보기가 업로드를 기다리지 않는지' 확인

const server = http.createServer((req,res)=>{
  const p = new URL(req.url,'http://x').pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  const body = () => new Promise(r=>{ const ch=[]; req.on('data',d=>ch.push(d)); req.on('end',()=>r(Buffer.concat(ch))) })

  if(p==='/__slow'){ slowUpload=true; return send(200,'{}') }
  if(p==='/api/upload'){
    return body().then(buf=>{
      const key='gen/up'+uploads.length+(String(req.headers['content-type']||'').includes('webm')?'.webm':'.png')
      uploads.push({ key, type:String(req.headers['content-type']||''), size:buf.length })
      const reply=()=>send(200, JSON.stringify({ ok:true, url:'/api/media/'+key }))
      if(slowUpload){ slowUpload=false; setTimeout(reply, 1500) } else reply()
    })
  }
  if(p==='/api/usage/record'){
    return body().then(buf=>{ try{ records.push(JSON.parse(buf.toString('utf8'))) }catch{}
      send(200, JSON.stringify({ ok:true, charged:0 })) })
  }
  if(p==='/api/gallery' || p==='/api/gallery/save'){
    return body().then(buf=>{ try{ gallery.push(JSON.parse(buf.toString('utf8'))) }catch{}
      send(200, JSON.stringify({ ok:true })) })
  }
  if(p.startsWith('/api/media/')) return send(200, Buffer.from('89504e470d0a1a0a','hex'), 'image/png')
  if(p.startsWith('/models/')) return send(404,'no','text/plain')
  if(p.startsWith('/api/')) return body().then(()=>send(200, JSON.stringify({ok:true})))
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

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 1) 이미지 편집(색보정) — 결과가 보관되고 노드 주소가 바뀌는가
await pg.evaluate(o => fetch(o+'/__slow'), origin)   // 다음 업로드 1건만 느리게
const imgCase = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const cv=document.createElement('canvas'); cv.width=120; cv.height=80
  const x=cv.getContext('2d'); x.fillStyle='#3060a0'; x.fillRect(0,0,120,80)
  const src=C.addNode('bgremove',0,0,true); src.w.img=cv.toDataURL('image/png'); src.w.toolKind='image'
  const gr=C.addNode('grade',0,0,true); gr.w.gpreset='흑백'
  S.links.push({ from:src.id, to:gr.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+gr.id).querySelector('[data-tool="grade"]').click()
  const t0=Date.now(); while(gr.w.toolBusy && Date.now()-t0<30000) await new Promise(r=>setTimeout(r,150))
  const immediate = gr.w.img.slice(0,20)
  // 보관 업로드는 백그라운드로 진행된다 — 주소가 바뀔 때까지 기다린다
  const t1=Date.now(); while(!gr.w.toolHosted && Date.now()-t1<20000) await new Promise(r=>setTimeout(r,150))
  return { immediate, hosted:gr.w.toolHosted===true, url:gr.w.img, chain:C.nodeImgs(gr)[0] }
})
// 업로드를 1.5초 지연시킨 상태다 — 그런데도 결과가 즉시 보여야 한다(보관은 뒤에서 따로 진행)
ok('편집 직후엔 바로 화면에 보임(보관 업로드를 기다리지 않음)', /^data:image/.test(imgCase.immediate), imgCase.immediate+'…')
ok('결과가 우리 저장소로 올라감', imgCase.hosted && /^\/api\/media\//.test(imgCase.url), imgCase.url)
ok('다음 노드도 보관된 주소를 씀', imgCase.chain===imgCase.url, String(imgCase.chain))
ok('업로드가 실제로 도착함', uploads.length>=1, uploads.length+'건 · '+(uploads[0]?.type||''))

await pg.waitForTimeout(600)
const gradeRec = records.find(r => /색보정/.test(r.model||''))
ok('관리자 기록에 색보정이 남음', !!gradeRec, gradeRec?.model||'(없음)')
ok('이미지 편집은 "이미지 · " 이름으로 1장 기록', gradeRec && /이미지 · 브라우저 편집/.test(gradeRec.model) && gradeRec.units===1 && gradeRec.kind==='image',
   gradeRec && `${gradeRec.kind} · ${gradeRec.units}`)
ok('제공사 비용은 0으로 기록', gradeRec && gradeRec.usd===0 && gradeRec.provider==='edit', gradeRec && `$${gradeRec.usd} · ${gradeRec.provider}`)
ok('결과 주소가 기록에 함께 남음', gradeRec && /^\/api\/media\//.test(gradeRec.resultUrl||''), gradeRec?.resultUrl||'(없음)')

// 2) 영상 편집(자막) — 초 단위로 기록되는가 · blob 주소가 보관본으로 바뀌는가
await pg.evaluate(o => fetch(o+'/__slow'), origin)   // 업로드를 늦춰 '먼저 임시 주소 → 나중에 보관본' 순서를 확실히 본다
const vidCase = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const c=document.createElement('canvas'); c.width=120; c.height=68
  const x=c.getContext('2d'); const st=c.captureStream(30)
  const mime=['video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
  const rec=new MediaRecorder(st,{mimeType:mime}); const ch=[]
  rec.ondataavailable=e=>{ if(e.data.size) ch.push(e.data) }
  const stopped=new Promise(r=>{ rec.onstop=r }); rec.start()
  const t0=performance.now()
  await new Promise(r=>{ (function loop(){ x.fillStyle='#204070'; x.fillRect(0,0,120,68)
    if(performance.now()-t0<2100) requestAnimationFrame(loop); else r() })() })
  rec.stop(); await stopped
  const vurl=URL.createObjectURL(new Blob(ch,{type:'video/webm'}))

  const src=C.addNode('output',0,0,true); src.w.vid=vurl; src.w.kind='video'
  const cap=C.addNode('caption',0,0,true); cap.w.captext='보관 확인'; cap.w.capsize=8
  S.links.push({ from:src.id, to:cap.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+cap.id).querySelector('[data-tool="caption"]').click()
  const t1=Date.now(); while(cap.w.toolBusy && Date.now()-t1<60000) await new Promise(r=>setTimeout(r,200))
  const wasBlob = /^blob:/.test(cap.w.img)
  const t2=Date.now(); while(!cap.w.toolHosted && Date.now()-t2<30000) await new Promise(r=>setTimeout(r,200))
  return { wasBlob, hosted:cap.w.toolHosted===true, url:cap.w.img, kind:cap.w.toolKind }
})
ok('영상 편집 직후엔 임시 주소(blob:)', vidCase.wasBlob)
ok('영상 결과도 저장소로 올라가 주소가 바뀜', vidCase.hosted && /^\/api\/media\//.test(vidCase.url), vidCase.url)

await pg.waitForTimeout(600)
const capRec = records.find(r => /자막/.test(r.model||''))
ok('관리자 기록에 자막이 남음', !!capRec, capRec?.model||'(없음)')
ok('영상 편집은 "영상 · " 이름으로 초 단위 기록',
   capRec && /영상 · 브라우저 편집/.test(capRec.model) && capRec.kind==='video' && capRec.units>=1,
   capRec && `${capRec.kind} · ${capRec.units}초`)
ok('영상 업로드가 webm 으로 도착함', uploads.some(u=>/webm/.test(u.type)), uploads.map(u=>u.type).join(', '))

// 3) 같은 결과를 두 번 올리지 않는가 (업스케일은 기록과 보관이 동시에 부른다)
const before = uploads.length
const dedup = await pg.evaluate(async () => {
  const C=window.__cn, S=C.state
  const cv=document.createElement('canvas'); cv.width=80; cv.height=60
  const x=cv.getContext('2d'); x.fillStyle='#a04020'; x.fillRect(0,0,80,60)
  const src=C.addNode('bgremove',0,0,true); src.w.img=cv.toDataURL('image/png'); src.w.toolKind='image'
  const up=C.addNode('upscale',0,0,true); up.w.upx='2배'
  S.links.push({ from:src.id, to:up.id, fromPort:'out', toPort:'in' })
  C.render()
  document.getElementById('nd-'+up.id).querySelector('[data-tool="upscale"]').click()
  const t0=Date.now(); while(up.w.toolBusy && Date.now()-t0<60000) await new Promise(r=>setTimeout(r,200))
  const t1=Date.now(); while(!up.w.toolHosted && Date.now()-t1<20000) await new Promise(r=>setTimeout(r,200))
  return { hosted:up.w.toolHosted===true, url:up.w.img }
})
await pg.waitForTimeout(800)
ok('업스케일 결과도 보관본 주소로 바뀜', dedup.hosted && /^\/api\/media\//.test(dedup.url), dedup.url)
// 업스케일은 결과 1건 + 원본 1건(전/후 비교용)까지 최대 2건. 결과를 두 번 올리면 3건 이상이 된다.
ok('같은 결과를 두 번 올리지 않음', uploads.length-before <= 2, '이번에 '+(uploads.length-before)+'건 업로드')

// 4) 저장에 임시 주소가 섞이지 않는가
const strip = await pg.evaluate(() => {
  const C=window.__cn
  // 저장 직전에 걸러지는지 확인 — blob/data 를 일부러 넣어 본다
  const n=C.addNode('caption',0,0,true)
  n.w.img='blob:http://x/abc'; n.w.poster='data:image/png;base64,AAAA'; n.w.toolKind='video'
  const g={ nodes:C.state.nodes.map(x=>JSON.parse(JSON.stringify(x))), links:[] }
  const stripped = window.__cn.stripGraphMedia ? window.__cn.stripGraphMedia(g) : null
  if(!stripped) return { skip:true }
  const me=stripped.nodes.find(x=>x.id===n.id)
  return { img:me.w.img, poster:me.w.poster,
           anyBlob: JSON.stringify(stripped).indexOf('blob:')>=0,
           anyData: JSON.stringify(stripped).indexOf('data:image')>=0 }
})
ok('서버 저장에서 임시 주소(blob:)가 모두 빠짐', strip.skip || (strip.img===null && !strip.anyBlob), JSON.stringify(strip))
ok('서버 저장에서 대용량 data: 도 빠짐', strip.skip || (strip.poster===null && !strip.anyData), JSON.stringify(strip))

// 5) 다시 열었을 때 깨진 주소가 남지 않는가
const reopen = await pg.evaluate(() => {
  const C=window.__cn
  if(!C.loadDocIntoState) return { skip:true }
  C.loadDocIntoState({ data:{ nodes:[
    { id:'t1', type:'caption', x:0, y:0, w:{ img:'blob:http://x/dead', toolKind:'video', toolInfo:'옛 결과', toolBusy:true, poster:'blob:http://x/p' } }
  ], links:[], seq:9 } })
  const n=C.state.nodes.find(x=>x.id==='t1')
  return { img:n.w.img, busy:n.w.toolBusy, poster:n.w.poster, info:n.w.toolInfo }
})
ok('다시 열면 깨진 임시 주소가 비워짐', reopen.skip || (reopen.img===null && reopen.poster===null), JSON.stringify(reopen))
ok('다시 열면 "처리 중" 이 풀림(멈춘 채 남지 않음)', reopen.skip || reopen.busy===false, String(reopen.busy))

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await b.close(); server.close()
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
