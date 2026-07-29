// 네트워크가 막혔을 때(모델을 못 받을 때) 기능이 어떻게 되는가.
//
//  사용자의 인터넷이 끊기거나, 우리 모델 서버가 잠깐 죽거나, 회사 방화벽이 막는 일은 실제로 있다.
//  그때 가장 나쁜 것은 '버튼이 영원히 도는 것' 이다 — 사용자는 뭘 해야 할지 알 수 없다.
//
//  확인하는 것
//   1) 모든 편집 기능이 정해진 시간 안에 끝난다 (영원히 돌지 않는다)
//   2) 끝난 뒤 '처리 중' 표시가 반드시 꺼진다
//   3) 실패했으면 실패했다고 알린다 (조용히 아무 일도 없는 척하지 않는다)
//   4) 모델이 필요 없는 기능(비율·자막·색보정·합성)은 네트워크와 무관하게 그대로 된다
//   5) 업스케일은 자체 모델이 우리 서버에 함께 있으므로 그대로 동작한다
//
//  실행: node scripts/offline-resilience-test.mjs
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'

const PUB = path.resolve('public')
const ORT_DIR = path.resolve('node_modules/onnxruntime-web/dist')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'offl-'))
const ORT_ESM = path.join(tmp, 'ortweb.mjs')
execFileSync('npx', ['esbuild','onnxruntime-web','--bundle','--format=esm','--platform=browser',
  '--outfile='+ORT_ESM,'--log-level=error'], { stdio:'inherit' })

// MODE=all  : 자체 모델을 뺀 모든 모델 경로 차단(현실적인 '모델 서버 장애')
// MODE=hard : 자체 모델까지 전부 차단(최악의 경우)
const MODE = process.env.MODE || 'all'
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css', '.onnx':'application/octet-stream', '.json':'application/json' }
const server = http.createServer((req,res)=>{
  const u = new URL(req.url,'http://x'); const p = u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p === '/models/lib/ortweb') return send(200, fs.readFileSync(ORT_ESM), 'text/javascript')
  if(p.startsWith('/models/ortw/')){
    const f = path.join(ORT_DIR, path.basename(p))
    return fs.existsSync(f) ? send(200, fs.readFileSync(f), 'application/wasm') : send(404,'no','text/plain')
  }
  if(p.startsWith('/models/')){                       // 모델 서버가 죽은 상황
    if(u.searchParams.get('probe')==='1') return send(200, JSON.stringify({ ok:false }))
    return send(503,'모델 서버 장애(검사)','text/plain')
  }
  if(MODE==='hard' && p.startsWith('/models-own/')) return send(503,'자체 모델도 차단(검사)','text/plain')
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ ok:true }))
  const f = path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port
console.log(`모델 서버를 막은 상태로 검사합니다 (MODE=${MODE}${MODE==='hard'?' — 자체 모델까지 차단':''})\n`)

const browser=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page=await browser.newPage(); const errs=[]
page.on('pageerror',e=>errs.push(String(e).slice(0,200)))
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1200)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 각 기능을 직접 불러 '끝나는가 · 알리는가' 를 본다
const CASES = [
  { key:'배경 제거', fn:'removeBackground', args:['투명하게', 2], needsModel:true },
  { key:'비율 맞추기', fn:'fitToRatio', args:['9:16 (릴스·쇼츠)','꽉 채우기(가장자리 잘림)'], needsModel:false },
  { key:'자막', fn:'captionImage', opts:{ text:'네트워크 검사', size:6, pos:'아래', style:'외곽선' }, needsModel:false },
  { key:'색보정', fn:'gradeImage', opts:{ preset:'따뜻하게', bright:110, contrast:100, satur:100, temp:20 }, needsModel:false },
  { key:'업스케일', fn:'upscaleImageURL', args:[2], needsModel:'own' },
]

for(const c of CASES){
  const r = await page.evaluate(async (c) => {
    const mk=(w,h)=>{ const cv=document.createElement('canvas');cv.width=w;cv.height=h
      const x=cv.getContext('2d'); const g=x.createLinearGradient(0,0,w,h)
      g.addColorStop(0,'#2a4a7a'); g.addColorStop(1,'#d0a070'); x.fillStyle=g; x.fillRect(0,0,w,h)
      x.fillStyle='#fff'; x.fillRect(w*0.3,h*0.3,w*0.4,h*0.4); return cv.toDataURL('image/png') }
    const src=mk(240,180)
    const t0=performance.now()
    let res=null, err=null
    try{
      const p = c.opts ? window.__cn[c.fn](src, c.opts) : window.__cn[c.fn](src, ...(c.args||[]))
      res = await Promise.race([p, new Promise((_,n)=>setTimeout(()=>n(new Error('__TIMEOUT__')), 90000))])
    }catch(e){ err = String(e&&e.message||e).slice(0,120) }
    return { ms: Math.round(performance.now()-t0), ok: !!res,
             url: res && String(res.url||'').slice(0,20), engine: res&&res.engine||'',
             fallback: !!(res&&res.fallback), err }
  }, c)

  const label = c.key
  const timedOut = r.err === '__TIMEOUT__'
  ok(`[${label}] 영원히 돌지 않고 끝남`, !timedOut, timedOut ? '90초 안에 끝나지 않음' : `${r.ms}ms`)
  if(c.needsModel === true){
    // 모델이 꼭 필요한 기능 — 성공하지 못했다면 '실패했다' 고 분명히 말해야 한다
    ok(`[${label}] 실패를 조용히 넘기지 않고 알림`, r.ok || (!!r.err && r.err !== '__TIMEOUT__'),
       r.ok ? '오히려 성공함(모델이 캐시돼 있었음)' : (r.err||'(메시지 없음)'))
  } else if(c.needsModel === 'own'){
    ok(`[${label}] 결과가 반드시 나옴`, r.ok, r.err || `${r.engine}${r.fallback?' (단순 확대 대체)':''}`)
    ok(`[${label}] 단순 확대로 대체됐으면 숨기지 않음`, r.ok && (!r.fallback || /리샘플|확대/.test(r.engine)),
       `${r.engine} · fallback=${r.fallback}`)
  } else {
    ok(`[${label}] 네트워크와 무관하게 정상 동작`, r.ok && !r.err, r.err || `${r.ms}ms · 결과 있음`)
  }
  console.log(`${label.padEnd(10)} → ${r.ok ? '성공' : '실패'} ${r.ms}ms ${r.engine||''} ${r.err?('· '+r.err):''}`)
}

// 실제 노드 버튼으로도 확인 — 눌렀을 때 '처리 중' 이 반드시 꺼지는가
const btn = await page.evaluate(async () => {
  const C = window.__cn
  const mk=(w,h)=>{ const cv=document.createElement('canvas');cv.width=w;cv.height=h
    const x=cv.getContext('2d'); x.fillStyle='#3060a0'; x.fillRect(0,0,w,h)
    x.fillStyle='#fff'; x.fillRect(w*0.3,h*0.3,w*0.4,h*0.4); return cv.toDataURL('image/png') }
  const img = mk(200,150)
  C.loadDocIntoState({ data:{ nodes:[
    { id:'src', type:'imageref', x:0, y:0, w:{ img, imgs:[img] } },
    { id:'bg',  type:'bgremove', x:340, y:0, w:{} },
  ], links:[{ from:'src', to:'bg' }], groups:[], annos:[], seq:9 } })
  await new Promise(k=>setTimeout(k,300))
  const el=document.getElementById('nd-bg')
  const b=el && el.querySelector('[data-tool]')
  if(!b) return { noBtn:true }
  b.click()
  // 최대 60초까지 기다리며 '처리 중' 이 꺼지는지 본다
  const t0=performance.now()
  while(performance.now()-t0 < 60000){
    const st=C._stateSnapshot()
    const n=st.nodes.find(x=>x.id==='bg')
    if(!n.w.toolBusy) return { ms:Math.round(performance.now()-t0), busy:false, hasImg:!!n.w.img }
    await new Promise(k=>setTimeout(k,300))
  }
  return { ms:60000, busy:true }
})
if(btn.noBtn) ok('배경 제거 버튼을 눌러도 화면이 멈추지 않음', false, '실행 버튼을 찾지 못함')
else ok('배경 제거 버튼을 눌러도 화면이 멈추지 않음', btn.busy===false,
        btn.busy ? '60초가 지나도 처리 중 표시가 남아 있음' : `${btn.ms}ms 만에 처리 중 해제 (결과 ${btn.hasImg?'있음':'없음'})`)

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await browser.close(); server.close(); fs.rmSync(tmp,{recursive:true,force:true})
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
