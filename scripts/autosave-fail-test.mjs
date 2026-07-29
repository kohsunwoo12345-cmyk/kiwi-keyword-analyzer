// 자동 저장이 실패하는 상황 — 사용자에게 반드시 알려야 한다.
//
//  저장 공간이 꽉 찼거나(브라우저 용량 한도), 시크릿 모드처럼 저장이 막힌 경우에 실제로 일어난다.
//  예전에는 조용히 넘어가서, 사용자는 저장된 줄 알고 작업하다가 탭을 닫고 전부 잃을 수 있었다.
//
//  검사 방법 — 페이지가 뜨기 전에 두 저장소를 모두 막아 둔다.
//   · indexedDB 를 없애고
//   · localStorage.setItem 이 '용량 초과' 로 실패하게 만든다
//  그 상태에서 편집하면 안내가 떠야 한다. 그리고 저장이 다시 되면 조용해져야 한다.
//
//  실행: node scripts/autosave-fail-test.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'

const PUB = path.resolve('public')
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

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])
const browser=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page=await browser.newPage(); const errs=[]
page.on('pageerror',e=>errs.push(String(e).slice(0,200)))

// 페이지가 뜨기 전에 저장소를 막는다
await page.addInitScript(() => {
  try{ Object.defineProperty(window,'indexedDB',{ get(){ return undefined } }) }catch(_){}
  // 처음에는 막지 않는다 — 페이지가 뜰 때의 저장은 성공시켜 두고, 검사에서 직접 막는다
  window.__saveBlocked = false
  const real = Storage.prototype.setItem
  Storage.prototype.setItem = function(k,v){
    if(window.__saveBlocked && /nvNodeStudio/.test(String(k))){
      const e=new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e
    }
    return real.call(this,k,v)
  }
})
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1500)

const r = await page.evaluate(async () => {
  const C = window.__cn
  const t = document.getElementById('toast')
  const seen = []
  // 안내가 뜨는 것을 놓치지 않도록 계속 지켜본다
  const mo = new MutationObserver(()=>{ const s=(t&&t.textContent||'').trim(); if(s) seen.push(s) })
  if(t) mo.observe(t, { childList:true, characterData:true, subtree:true })

  // 먼저 정상 저장을 한 번 시켜 경고 상태를 확실히 풀어 둔다
  C.state.nodes.push({ id:'z0', type:Object.keys(C.DEFS)[0], x:-100, y:0, w:{} })
  C.snapshot()
  await new Promise(k=>setTimeout(k,1200))
  seen.length = 0

  window.__saveBlocked = true
  C.state.nodes.push({ id:'z1', type:Object.keys(C.DEFS)[0], x:0, y:0, w:{} })
  C.snapshot()
  await new Promise(k=>setTimeout(k,1200))
  const warned = seen.some(s=>/자동 저장에 실패/.test(s))

  // 저장이 다시 되게 풀고, 한 번 더 편집하면 조용해야 한다
  window.__saveBlocked = false
  seen.length = 0
  C.state.nodes.push({ id:'z2', type:Object.keys(C.DEFS)[0], x:100, y:0, w:{} })
  C.snapshot()
  await new Promise(k=>setTimeout(k,1200))
  const quietAfterFix = !seen.some(s=>/자동 저장에 실패/.test(s))

  // 다시 막으면 또 알려야 한다(한 번 알리고 영영 침묵하면 안 된다)
  window.__saveBlocked = true
  seen.length = 0
  C.state.nodes.push({ id:'z3', type:Object.keys(C.DEFS)[0], x:200, y:0, w:{} })
  C.snapshot()
  await new Promise(k=>setTimeout(k,1200))
  const warnedAgain = seen.some(s=>/자동 저장에 실패/.test(s))

  mo.disconnect()
  return { warned, quietAfterFix, warnedAgain, nodes:C.state.nodes.length }
})

ok('저장이 막히면 사용자에게 알림', r.warned === true, r.warned ? '안내 표시됨' : '아무 말 없이 넘어감')
ok('저장이 다시 되면 조용해짐', r.quietAfterFix === true, r.quietAfterFix ? '정상' : '계속 경고가 뜸')
ok('다시 막히면 또 알림 (한 번 알리고 영영 침묵하지 않음)', r.warnedAgain === true,
   r.warnedAgain ? '정상' : '두 번째 실패를 알리지 않음')
ok('저장이 막혀도 편집 자체는 계속 가능', r.nodes >= 3, `노드 ${r.nodes}개`)
ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await browser.close(); server.close()
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
