// 실행 취소 · 다시 실행 — '임의(랜덤)' 검증.
//
//  작업물을 잃는 가장 흔한 경로가 '되돌리기가 어긋나는 것' 이다.
//  무작위 편집을 길게 이어 붙인 뒤, 되돌리기를 한 단계씩 밟으며
//  '그때 그 상태와 글자 하나까지 같은가' 를 매번 대조한다.
//
//   1) 되돌릴 때마다 정확히 직전 상태로 돌아가는가
//   2) 다시 실행하면 정확히 원래대로 복구되는가
//   3) 맨 처음보다 더 되돌리려 해도 깨지지 않는가
//   4) 되돌린 뒤 새 편집을 하면 '다시 실행' 이 올바르게 지워지는가
//   5) 오래 편집해도(기록 상한을 넘겨도) 최근 것은 정확히 되돌아가는가
//
//  실행: node scripts/undo-random-test.mjs        (SEED=123 · N=40)
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'

const PUB = path.resolve('public')
const SEED = Number(process.env.SEED || (Date.now() % 1e9))
const N = Number(process.env.N || 40)
console.log(`씨앗(SEED)=${SEED} · 무작위 편집 ${N}단계  ← 실패 시 SEED=${SEED} 로 재현됩니다\n`)

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

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

const r = await page.evaluate(async ({ SEED, N }) => {
  const C = window.__cn
  let s = SEED >>> 0
  const rnd = ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296 }
  const ri = (lo,hi)=>lo+Math.floor(rnd()*(hi-lo+1))
  const pick = a=>a[Math.floor(rnd()*a.length)]
  const TYPES = Object.keys(C.DEFS||{})
  const st = C.state

  // 깨끗한 상태에서 시작
  C.loadDocIntoState({ data:{ nodes:[], links:[], groups:[], annos:[], seq:100 } })
  const snap = ()=>JSON.stringify(C._stateSnapshot())
  const history = [snap()]        // history[i] = i번째 편집 뒤의 상태
  const ops = []

  for(let i=0;i<N;i++){
    const kinds = st.nodes.length ? ['추가','이동','값변경','삭제','연결','그룹','메모','색'] : ['추가','메모']
    const kind = pick(kinds)
    try{
      if(kind==='추가'){
        const t = pick(TYPES)
        st.nodes.push({ id:'u'+i, type:t, x:ri(-800,800), y:ri(-800,800), w:{} })
      } else if(kind==='이동'){
        const n = st.nodes[ri(0,st.nodes.length-1)]
        n.x = ri(-1500,1500); n.y = ri(-1500,1500)
      } else if(kind==='값변경'){
        const n = st.nodes[ri(0,st.nodes.length-1)]
        n.w = n.w||{}
        n.w[pick(['prompt','sec','size','label'])] = pick(['가',  'BYGENCY', 42, true, '줄\n바꿈', ''])
      } else if(kind==='삭제'){
        const idx = ri(0,st.nodes.length-1)
        const gone = st.nodes.splice(idx,1)[0]
        st.links = st.links.filter(l=>l.from!==gone.id && l.to!==gone.id)
      } else if(kind==='연결'){
        if(st.nodes.length>=2){
          const a=st.nodes[ri(0,st.nodes.length-1)], b=st.nodes[ri(0,st.nodes.length-1)]
          if(a.id!==b.id) st.links.push({ from:a.id, to:b.id })
        }
      } else if(kind==='그룹'){
        st.groups.push({ id:'g'+i, name:'묶음'+i, x:ri(-500,500), y:ri(-500,500), w:ri(100,600), h:ri(100,600) })
      } else if(kind==='메모'){
        st.annos.push({ id:'a'+i, text:'메모 '+i, x:ri(-500,500), y:ri(-500,500) })
      } else if(kind==='색'){
        st.nodes[ri(0,st.nodes.length-1)].color = pick(['#3a1c1c','#1c3346',null])
      }
      st.seq = (st.seq||100) + 1
      C.snapshot()                                   // UI 가 편집 후 하는 것과 같다
      C.render()
    }catch(e){ return { err: '편집 중 오류: '+String(e&&e.message||e).slice(0,100), at:i, kind } }
    ops.push(kind)
    history.push(snap())
  }

  // ── 되돌리기: 한 단계씩 밟으며 그때 상태와 대조 ──
  //  기록 상한(60) 때문에 아주 오래된 것까지는 못 돌아간다 → 돌아갈 수 있는 만큼만 본다
  const LIMIT = Math.min(N, 55)
  const undoBad = []
  for(let k=1;k<=LIMIT;k++){
    C.doUndo()
    const want = history[history.length-1-k]
    const got = snap()
    if(got !== want) undoBad.push({ step:k, op:ops[ops.length-k] })
  }
  // ── 다시 실행: 원래대로 돌아오는가 ──
  const redoBad = []
  for(let k=LIMIT-1;k>=0;k--){
    C.doRedo()
    const want = history[history.length-1-k]
    const got = snap()
    if(got !== want) redoBad.push({ step:LIMIT-k })
  }
  const backToLatest = snap() === history[history.length-1]

  // ── 맨 처음보다 더 되돌리기 ──
  for(let k=0;k<LIMIT+10;k++) C.doUndo()
  const afterOverUndo = C._stateSnapshot()
  const overUndoOk = !!afterOverUndo && Array.isArray(afterOverUndo.nodes)

  // ── 되돌린 뒤 새 편집 → '다시 실행' 은 지워져야 한다 ──
  st.nodes.push({ id:'fresh', type:TYPES[0], x:0, y:0, w:{} })
  C.snapshot(); C.render()
  const afterNewEdit = snap()
  C.doRedo()                                        // 지워졌다면 아무 일도 없어야 한다
  const redoCleared = snap() === afterNewEdit

  return { ops, undoBad, redoBad, backToLatest, overUndoOk, redoCleared, limit:LIMIT }
}, { SEED, N })

if(r.err){
  ok('무작위 편집이 오류 없이 진행됨', false, `${r.at}번째(${r.kind}) — ${r.err}`)
} else {
  ok('무작위 편집이 오류 없이 진행됨', true, `${r.ops.length}단계 · ${[...new Set(r.ops)].join('·')}`)
  ok('되돌릴 때마다 정확히 그때 상태로 돌아감', r.undoBad.length===0,
     r.undoBad.length ? `${r.undoBad.length}곳 어긋남 (예: ${r.undoBad[0].step}번째 되돌리기 · 직전 편집 ${r.undoBad[0].op})`
                      : `${r.limit}단계 모두 일치`)
  ok('다시 실행하면 정확히 원래대로 복구됨', r.redoBad.length===0 && r.backToLatest,
     r.redoBad.length ? `${r.redoBad.length}곳 어긋남 (예: ${r.redoBad[0].step}번째)` : `${r.limit}단계 모두 일치`)
  ok('맨 처음보다 더 되돌려도 깨지지 않음', r.overUndoOk === true, r.overUndoOk ? '정상' : '상태가 망가짐')
  ok("되돌린 뒤 새로 편집하면 '다시 실행' 이 올바르게 지워짐", r.redoCleared === true,
     r.redoCleared ? '정상' : '지워진 미래가 되살아남')
}
ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await browser.close(); server.close()
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n씨앗 ${SEED} · ${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
