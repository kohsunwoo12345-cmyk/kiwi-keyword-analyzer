// 워크플로우 저장·불러오기 — '임의(랜덤)' 검증.
//
//  작업물이 사라지는 것이 사용자에게 가장 치명적이다.
//  무작위로 만든 그래프(노드·연결·그룹·메모)를 저장했다가 다시 불러와,
//  '무엇 하나 사라지거나 바뀌지 않았는지' 를 통째로 대조한다.
//
//   1) 저장 → 불러오기 → 노드·연결·그룹·메모가 하나도 빠지지 않는가
//   2) 노드의 설정값(문구·숫자·불리언)이 그대로인가
//   3) 서버로 보낼 때 큰 데이터(data:)와 임시 주소(blob:)만 빠지고 나머지는 남는가
//   4) 영상 프레임(imgs)과 영상(vids)의 짝이 어긋나지 않는가
//   5) 다시 열었을 때 '처리 중' 상태가 남아 영원히 도는 일이 없는가
//   6) 저장 → 불러오기를 반복해도 계속 같은가 (누적 손실 없음)
//
//  실행: node scripts/graph-random-test.mjs        (SEED=123 · N=12)
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'

const PUB = path.resolve('public')
const SEED = Number(process.env.SEED || (Date.now() % 1e9))
const N = Number(process.env.N || 12)
console.log(`씨앗(SEED)=${SEED} · 무작위 그래프 ${N}개  ← 실패 시 SEED=${SEED} 로 재현됩니다\n`)
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t
  return ((t^t>>>14)>>>0)/4294967296 } }
const rnd = mulberry32(SEED)
const ri = (lo,hi)=>lo+Math.floor(rnd()*(hi-lo+1))
const pick = (a)=>a[Math.floor(rnd()*a.length)]

const CT={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.css':'text/css','.json':'application/json'}
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

// 노드 종류는 스튜디오가 실제로 아는 것들만 쓴다
const TYPES = await page.evaluate(() => Object.keys(window.__cn.DEFS || {}))
if(!TYPES.length){ console.error('노드 종류를 읽지 못했습니다(DEFS 미노출)'); }

const TEXTS = ['안녕','BYGENCY 워크플로우','줄바꿈\n둘째 줄','emoji 🎬 ok','"따옴표" & <꺾쇠>','\\역슬래시\\', '']
function makeGraph(seedN){
  const nodes=[], links=[], groups=[], annos=[]
  const n = ri(2, 9)
  for(let i=0;i<n;i++){
    const type = TYPES.length ? pick(TYPES) : 'text'
    const id = 'n'+seedN+'_'+i
    nodes.push({ id, type, x: ri(-2000,2000), y: ri(-2000,2000), w: {
      prompt: pick(TEXTS), label: pick(TEXTS),
      sec: ri(1,30), scale: pick([2,4]), size: ri(2,20),
      on: rnd()<0.5, ratio: pick(['9:16','1:1','16:9']),
      // 저장에서 빠져야 하는 것들
      img: pick([null, 'https://example.com/a.png', 'data:image/png;base64,AAAA', 'blob:http://x/1']),
      poster: pick([null, 'https://example.com/p.jpg', 'blob:http://x/2']),
      upscaled: pick([null, 'https://example.com/u.png', 'blob:http://x/3']),
      imgs: [ 'https://example.com/1.png', 'data:image/png;base64,BBBB', 'https://example.com/2.png' ],
      vids: [ 'https://example.com/1.webm', 'https://example.com/2.webm', 'https://example.com/3.webm' ],
      // 다시 열 때 반드시 꺼져 있어야 하는 것들
      generating: rnd()<0.5, upscaling: rnd()<0.5, extracting: rnd()<0.5, toolBusy: rnd()<0.5,
    } })
  }
  for(let i=1;i<n;i++) if(rnd()<0.8) links.push({ from: nodes[ri(0,i-1)].id, to: nodes[i].id })
  for(let i=0;i<ri(0,3);i++) groups.push({ id:'g'+seedN+'_'+i, name: pick(TEXTS), x:ri(-500,500), y:ri(-500,500), w:ri(100,900), h:ri(100,900) })
  for(let i=0;i<ri(0,4);i++) annos.push({ id:'a'+seedN+'_'+i, text: pick(TEXTS), x:ri(-500,500), y:ri(-500,500) })
  return { nodes, links, groups, annos, seq: ri(100, 9999) }
}

const graphs = []
for(let i=0;i<N;i++) graphs.push(makeGraph(i))

const r = await page.evaluate(async (gs) => {
  const C = window.__cn
  const res = []
  for(const g of gs){
    // 저장했다가 다시 불러오기 (실제 저장 형식과 같은 JSON 왕복)
    const doc = { data: JSON.parse(JSON.stringify(g)) }
    C.loadDocIntoState(doc)
    const after = C._stateSnapshot()
    const stripped = C.stripGraphMedia(JSON.parse(JSON.stringify(g)))
    // 두 번 반복해도 같은가
    const twice = C.stripGraphMedia(JSON.parse(JSON.stringify(stripped)))
    res.push({ stripped, twice, after })
  }
  return res
}, graphs)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// ── 저장본 검사 ──
const isTemp = (v)=> typeof v==='string' && (v.startsWith('data:')||v.startsWith('blob:'))
let lostCount=0, keptBad=[], pairBad=[], busyBad=[], tempBad=[], idemBad=[], settingBad=[]
graphs.forEach((g,gi)=>{
  const s = r[gi].stripped
  if(!s || !s.nodes || s.nodes.length !== g.nodes.length) { lostCount++; return }
  g.nodes.forEach((n,ni)=>{
    const w0=n.w, w1=s.nodes[ni].w
    // 1) 설정값은 그대로여야 한다
    for(const k of ['prompt','label','sec','scale','size','on','ratio'])
      if(JSON.stringify(w0[k]) !== JSON.stringify(w1[k])) settingBad.push(`${n.type}.${k}: ${JSON.stringify(w0[k])} → ${JSON.stringify(w1[k])}`)
    // 2) 임시·거대 데이터는 빠져야 한다
    for(const k of ['img','poster','upscaled'])
      if(isTemp(w1[k])) tempBad.push(`${n.type}.${k} 가 저장본에 남음`)
    if((w1.imgs||[]).some(isTemp)) tempBad.push(`${n.type}.imgs 에 임시 주소가 남음`)
    // 3) 진짜 주소(https)는 남아 있어야 한다
    for(const k of ['img','poster','upscaled'])
      if(typeof w0[k]==='string' && w0[k].startsWith('https:') && w1[k]!==w0[k]) keptBad.push(`${n.type}.${k} 진짜 주소가 사라짐`)
    // 4) imgs 와 vids 의 짝이 맞아야 한다 (imgs[i] 의 영상은 vids[i])
    const keep = (w0.imgs||[]).map((u,i)=>({u,i})).filter(x=>!isTemp(x.u))
    const wantVids = keep.map(x=> (w0.vids||[])[x.i] )
    if(JSON.stringify(w1.vids) !== JSON.stringify(wantVids))
      pairBad.push(`${n.type}: vids 기대 ${JSON.stringify(wantVids)} → 실제 ${JSON.stringify(w1.vids)}`)
    // 5) '처리 중' 은 반드시 꺼져 있어야 한다
    if(w1.generating || w1.upscaling || w1.extracting) busyBad.push(`${n.type}: 처리중 상태가 남음`)
  })
  // 6) 반복해도 같아야 한다
  if(JSON.stringify(r[gi].twice) !== JSON.stringify(s)) idemBad.push(`그래프 #${gi}`)
})

ok('노드가 하나도 사라지지 않음', lostCount===0, lostCount? `${lostCount}개 그래프에서 노드 수가 달라짐` : `${graphs.length}개 그래프 · ${graphs.reduce((s,g)=>s+g.nodes.length,0)}개 노드 유지`)
ok('설정값(문구·숫자·켜짐)이 그대로', settingBad.length===0, settingBad.slice(0,3).join(' | ') || '전부 일치')
ok('큰 데이터·임시 주소는 저장본에서 빠짐', tempBad.length===0, tempBad.slice(0,3).join(' | ') || '전부 제거됨')
ok('진짜 주소(https)는 그대로 남음', keptBad.length===0, keptBad.slice(0,3).join(' | ') || '전부 유지')
ok('영상 프레임과 영상의 짝이 어긋나지 않음', pairBad.length===0, pairBad.slice(0,2).join(' | ') || '전부 일치')
ok("다시 열 때 '처리 중' 이 남아 영원히 돌지 않음", busyBad.length===0, busyBad.slice(0,3).join(' | ') || '전부 초기화됨')
ok('저장을 반복해도 계속 같음(누적 손실 없음)', idemBad.length===0, idemBad.slice(0,3).join(' | ') || '전부 동일')

// ── 불러오기(loadDocIntoState) 자체 검사 — 저장본이 아니라 '다시 연 화면' 의 상태 ──
let openLost=[], openBusy=[], openBlob=[], openKeep=[], openSeq=[]
graphs.forEach((g,gi)=>{
  const a = r[gi].after
  if(!a){ openLost.push(`#${gi} 상태를 읽지 못함`); return }
  if(a.nodes.length!==g.nodes.length || a.links.length!==g.links.length ||
     a.groups.length!==g.groups.length || a.annos.length!==g.annos.length)
    openLost.push(`#${gi} 노드 ${a.nodes.length}/${g.nodes.length} 연결 ${a.links.length}/${g.links.length} 그룹 ${a.groups.length}/${g.groups.length} 메모 ${a.annos.length}/${g.annos.length}`)
  if(a.seq !== g.seq) openSeq.push(`#${gi} seq ${g.seq} → ${a.seq}`)
  a.nodes.forEach((n,ni)=>{
    const w=n.w||{}, w0=g.nodes[ni].w
    if(w.generating||w.upscaling||w.extracting||w.toolBusy) openBusy.push(`#${gi} ${n.type} 처리중이 남음`)
    for(const k of ['img','poster','upscaled'])
      if(typeof w[k]==='string' && w[k].startsWith('blob:')) openBlob.push(`#${gi} ${n.type}.${k} 깨진 임시주소가 남음`)
    // data: 는 이 탭에서 계속 볼 수 있어야 하므로 화면 상태에서는 남아 있어야 정상
    for(const k of ['img','poster','upscaled'])
      if(typeof w0[k]==='string' && w0[k].startsWith('https:') && w[k]!==w0[k]) openKeep.push(`#${gi} ${n.type}.${k} 진짜 주소가 사라짐`)
  })
})
ok('다시 열면 노드·연결·그룹·메모가 그대로', openLost.length===0, openLost.slice(0,3).join(' | ') || `${graphs.length}개 그래프 전부 일치`)
ok('다시 열면 번호(seq)도 그대로', openSeq.length===0, openSeq.slice(0,3).join(' | ') || '전부 일치')
ok('다시 열 때 깨진 임시주소(blob:)가 화면에 남지 않음', openBlob.length===0, openBlob.slice(0,3).join(' | ') || '전부 정리됨')
ok('다시 열어도 진짜 주소는 그대로', openKeep.length===0, openKeep.slice(0,3).join(' | ') || '전부 유지')
ok("다시 열 때 화면의 '처리 중' 이 전부 꺼짐", openBusy.length===0, openBusy.slice(0,3).join(' | ') || '전부 꺼짐')

// ── 불러오기 후 화면 상태 ──
const loaded = await page.evaluate((g) => {
  const C = window.__cn
  C.loadDocIntoState({ data: JSON.parse(JSON.stringify(g)) })
  const els = document.querySelectorAll('.node').length
  return { els }
}, graphs[0])
ok('불러온 뒤 노드가 화면에 그려짐', loaded.els >= graphs[0].nodes.length,
   `화면 노드 ${loaded.els}개 / 문서 ${graphs[0].nodes.length}개`)

// ── 모르는 노드 종류가 섞여 있어도 나머지가 정상으로 보이는가 ──
//  다른 버전에서 만든 파일, 이름이 바뀐 기능 등으로 실제로 생길 수 있다.
//  예전에는 이런 노드가 하나만 있어도 화면 그리기가 중단돼 작업물 전체가 안 보였다.
const unknown = await page.evaluate(async () => {
  const C = window.__cn
  const types = Object.keys(C.DEFS||{})
  const real = types.slice(0, 4)
  const doc = { data: { nodes: [
      ...real.map((t,i)=>({ id:'r'+i, type:t, x:i*300, y:0, w:{} })),
      { id:'x1', type:'존재하지않는종류', x:0,   y:300, w:{ prompt:'지켜져야 할 값' } },
      { id:'x2', type:'future_feature_v9', x:320, y:300, w:{ sec: 42 } },
    ], links:[], groups:[], annos:[], seq:50 } }
  let err=null
  try{ C.loadDocIntoState(doc) }catch(e){ err=String(e&&e.message||e).slice(0,120) }
  await new Promise(k=>setTimeout(k,300))
  const st = C._stateSnapshot()
  return { err,
    화면노드수: document.querySelectorAll('.node').length,
    문서노드수: doc.data.nodes.length,
    보존됨: st && st.nodes.length===doc.data.nodes.length &&
            st.nodes.find(n=>n.id==='x1')?.w?.prompt === '지켜져야 할 값' &&
            st.nodes.find(n=>n.id==='x2')?.w?.sec === 42 }
})
ok('모르는 노드가 섞여도 화면 전체가 멀쩡함', !unknown.err && unknown.화면노드수 === unknown.문서노드수,
   unknown.err ? ('그리는 중 오류: '+unknown.err) : `화면 ${unknown.화면노드수}개 / 문서 ${unknown.문서노드수}개`)
ok('모르는 노드의 내용도 그대로 보존됨', unknown.보존됨 === true,
   unknown.보존됨 ? '설정값 유지 확인' : '값이 사라짐')

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await browser.close(); server.close()
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n씨앗 ${SEED} · ${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
