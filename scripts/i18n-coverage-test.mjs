// 번역 빠짐 검사 — 영어·일본어·중국어로 바꿨을 때 한국어가 그대로 남는 곳을 찾는다.
//
//  스튜디오는 화면 문구를 사전(I18N)으로 바꿔 보여준다. 사전에 없는 문구는 한국어 그대로 나온다.
//  기능을 새로 만들면서 사전에 넣는 것을 잊기 쉬운데, 해외 사용자에게는 바로 보인다.
//
//  검사 방법
//   · 노드 정의(DEFS)에 들어 있는 화면 문구를 전부 긁는다
//     — 제목 · 입출력 이름 · 설정 이름 · 선택지 · 안내문 · 버튼 글자
//   · 한글이 들어간 문구마다 en·ja·zh 사전에 번역이 있는지 본다
//   · 실제로 화면을 영어로 바꿔 놓고, 눈에 보이는 한국어가 남는지도 확인한다
//
//  실행: node scripts/i18n-coverage-test.mjs
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

const browser=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page=await browser.newPage(); const errs=[]
page.on('pageerror',e=>errs.push(String(e).slice(0,200)))
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1200)

const LANGS = ['en','ja','zh']

const r = await page.evaluate((LANGS) => {
  const C = window.__cn
  const DEFS = C.DEFS || {}
  const I18N = C.I18N || {}
  const hasKo = (s) => /[가-힣]/.test(String(s||''))
  // 노드 정의에서 화면에 보이는 문구를 전부 긁는다
  const strings = new Map()          // 문구 → 어디에 쓰였는지
  const add = (s, where) => { s=String(s==null?'':s).trim(); if(s && hasKo(s) && !strings.has(s)) strings.set(s, where) }
  for(const [key, d] of Object.entries(DEFS)){
    add(d.title, `${key}.제목`)
    ;(d.ins||[]).forEach(p=>add(p[1], `${key}.입력`))
    ;(d.outs||[]).forEach(p=>add(p[1], `${key}.출력`))
    ;(d.widgets||[]).forEach(w=>{
      add(w.label, `${key}.${w.k}.이름`)
      add(w.ph, `${key}.${w.k}.안내`)
      add(w.hint, `${key}.${w.k}.설명`)
      // opts 는 배열일 때도, 조건에 따라 목록을 돌려주는 함수일 때도 있다
      let opts = w.opts
      if(typeof opts === 'function'){ try{ opts = opts({}) }catch(_){ opts = [] } }
      ;(Array.isArray(opts)?opts:[]).forEach(o=>add(typeof o==='string'?o:(o&&o.label), `${key}.${w.k}.선택지`))
    })
    add(d.cat, `${key}.분류`)
  }
  const missing = {}
  for(const lang of LANGS){
    const dict = I18N[lang] || {}
    missing[lang] = []
    for(const [s, where] of strings) if(dict[s] == null) missing[lang].push({ s, where })
  }
  return { total: strings.size, missing, langs: Object.keys(I18N) }
}, LANGS)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

console.log(`노드 화면 문구 중 한글이 들어간 것: ${r.total}개 · 사전 언어: ${r.langs.join(', ')}\n`)
for(const lang of LANGS){
  const m = r.missing[lang]
  const label = lang==='en'?'영어':lang==='ja'?'일본어':'중국어'
  if(m.length){
    console.log(`[${label}] 번역 없음 ${m.length}개:`)
    m.slice(0, 60).forEach(x=>console.log(`   ${x.where.padEnd(26)} "${x.s}"`))
    if(m.length>60) console.log(`   … 그 외 ${m.length-60}개`)
    console.log('')
  }
  ok(`${label} 번역이 빠진 문구가 없음`, m.length===0,
     m.length ? `${m.length}개 (예: "${m[0].s}" — ${m[0].where})` : `${r.total}개 모두 번역됨`)
}

// 실제 화면을 각 언어로 바꿨을 때 한국어가 남는지 — 노드를 전부 놓고 확인한다.
//  그 언어에 번역이 없으면 영어로라도 보여야 한다(한국어가 남으면 안 된다).
const ALL = await page.evaluate(async () => Object.keys((window.__cn.I18N)||{}))
for(const lang of ALL){
  const live = await page.evaluate(async (lang) => {
    const C = window.__cn
    const types = Object.keys(C.DEFS||{})
    const doc = { data: { nodes: types.map((t,i)=>({ id:'n'+i, type:t, x:(i%5)*320, y:Math.floor(i/5)*260, w:{} })),
                          links:[], groups:[], annos:[], seq:999 } }
    C.applyLang(lang)
    await new Promise(k=>setTimeout(k,200))
    C.loadDocIntoState(doc)
    await new Promise(k=>setTimeout(k,300))
    C.applyLang(lang)
    await new Promise(k=>setTimeout(k,300))
    const found=[]
    const w=document.createTreeWalker(document.getElementById('world'), NodeFilter.SHOW_TEXT, null)
    let n
    while((n=w.nextNode())){
      const t=(n.nodeValue||'').trim()
      if(/[가-힣]/.test(t)){
        const el=n.parentElement, node=el && el.closest('.node')
        found.push({ t: t.slice(0,50), node: node ? (node.getAttribute('data-type')||node.className) : '?' })
      }
    }
    return { found: found.slice(0,20), count: found.length, types: types.length }
  }, lang).catch(e=>({ err:String(e&&e.message||e).slice(0,120) }))

  if(live.err){ ok(`[${lang}] 화면에 한국어가 남지 않음`, false, live.err); continue }
  if(live.count){
    console.log(`[${lang}] 화면에 남은 한국어 ${live.count}곳 (앞 20개):`)
    live.found.forEach(x=>console.log(`   [${x.node}] "${x.t}"`))
    console.log('')
  }
  ok(`[${lang}] 화면에 한국어가 남지 않음`, live.count===0,
     live.count ? `${live.count}곳 (예: "${live.found[0].t}")` : `노드 ${live.types}종 전부 번역 표시`)
}

ok('페이지 오류 없음', errs.length===0, errs.slice(0,2).join(' | ')||'없음')

await browser.close(); server.close()
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
