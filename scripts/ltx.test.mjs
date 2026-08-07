/* LTX(Lightricks) 키 확인 검사 —  node scripts/ltx.test.mjs
 *
 * 이 진단은 "아직 연동 안 된 제공사의 키로 남의 서버를 두들기는" 코드다. 알리바바에서
 * 똑같은 것을 만들다 실제로 돈을 냈다 — 확인만 한다고 보낸 요청이 태스크 5건을 만들었고
 * (파라미터 검사가 큐 뒤에서 돌았다) 취소도 못 걸었다. 그래서 여기서는 규칙을 하나로 줄였다:
 *
 *   ⚠ **GET 만 보낸다.** 만들 수 있는 요청이 없으면 만들어질 것도 없다.
 *
 * 그 규칙과, 판정이 실제로 맞는지를 여기서 붙잡아 둔다. 판정은 글로만 검사하면 못 잡는다 —
 * 그래서 가짜 LTX 서버를 세우고 진짜로 돌려 본다.
 *
 * 이 검사가 막는 것:
 *   ㉠ 나중에 누가 "확인 하나만 더" 하며 POST 를 섞는 것 (= 돈)
 *   ㉡ 200 하나 보고 "키가 된다" 고 단정하는 것. 인증을 안 보는 주소도 200 을 준다 —
 *      그래서 일부러 틀린 키로 한 번 더 읽어 **갈리는지**를 본다. 안 갈리면 "확인 못 함" 이다.
 *   ㉢ 확인도 안 된 모델을 노드 피커에 올리는 것 (등록부에 꺼진 채로 심겨야 한다)
 *   ㉣ 키 값이 응답에 실려 나가는 것 (지문 앞6·뒤4 만)
 */
import fs from 'node:fs'
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

const gen = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')
const reg = fs.readFileSync(ROOT + 'functions/api/studio/_registry.ts', 'utf8')
const ltx = fs.readFileSync(ROOT + 'functions/api/studio/_ltx.ts', 'utf8')
const price = fs.readFileSync(ROOT + 'functions/api/studio/_pricing.ts', 'utf8')

/* 진단 블록만 잘라 본다. 길이를 숫자로 박아 두면 블록이 자라면서 창 밖으로 밀려나
   엉뚱한 통과/실패가 난다(알리바바 검사에서 실제로 그랬다) — 끝을 찾아서 자른다. */
const iGate = gen.indexOf('진단 엔드포인트는 관리자 전용입니다.')
const iLtx = gen.indexOf('u.searchParams.get("diag") === "ltx"')
const iEnd = gen.indexOf('GET 기반 Seedance 제출', iLtx)
const block = iLtx > 0 ? gen.slice(iLtx, iEnd > 0 ? iEnd : iLtx + 20000) : ''

console.log('\n① 아무나 못 부른다')
{
  ok(iGate > 0 && iLtx > 0 && iGate < iLtx, '관리자 게이트가 진단보다 먼저다',
     '게이트 위에 두면 비로그인이 남의 계정 키로 제공사를 두들길 수 있다')
  ok(gen.split('u.searchParams.get("diag") === "ltx"').length - 1 === 1, '진단 블록이 하나뿐이다',
     '옛 블록을 안 지우면 읽는 사람은 닿지도 않는 코드를 보고 판단하게 된다')
}

console.log('\n② 생성이 일어날 수 없다 — 보내는 자리가 GET 하나뿐이다')
{
  ok(block.length > 500, '진단 블록을 찾았다', String(block.length))
  ok(!/method:\s*"POST"/.test(block) && !/method:\s*'POST'/.test(block),
     'POST 가 한 줄도 없다', '확인하려다 만들어지면 그 순간 돈이 나간다 — 알리바바에서 실제로 그랬다')
  ok(!/\bbody:/.test(block), '본문(body)을 붙이는 자리가 없다', 'GET 이어도 본문을 실으면 제출로 해석하는 서버가 있다')
  ok(/method: "GET"/.test(block), '보내는 함수에 GET 이 박혀 있다')
  ok((block.match(/await fetchT\(/g) || []).length === 1, '제공사로 나가는 자리가 하나뿐이다',
     '자리가 늘면 그중 하나가 POST 로 바뀌어도 눈에 안 띈다')
}

console.log('\n③ 키 값은 어떤 경우에도 응답에 안 실린다')
{
  ok(/키지문: String\(k\.ltx\)\.slice\(0, 6\) \+ "…" \+ String\(k\.ltx\)\.slice\(-4\)/.test(block),
     '지문만 내보낸다(앞 6자·뒤 4자)')
  ok(!/키: k\.ltx|key: k\.ltx|apiKey: k\.ltx/.test(block), '키를 통째로 담는 자리가 없다')
}

console.log('\n④ 확인 안 된 모델은 노드에 안 올라간다')
{
  ok(/seedLtx/.test(reg), '등록부에 LTX 를 심는 자리가 있다')
  //  알리바바는 ...,1,?,?,?) 로 켜서 심는다. LTX 는 0 이어야 한다.
  const seed = reg.slice(reg.indexOf('export async function seedLtx'), reg.indexOf('const parseOpts'))
  ok(/VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,0,NULL,\?,\?\)/.test(seed), 'enabled 0 · verified_at NULL 로 심는다',
     '켜서 심으면 "고를 수는 있는데 누르면 404" 인 모델이 회원에게 나간다')
  ok(/INSERT OR IGNORE/.test(seed), '관리자가 켜 둔 것을 배포할 때마다 덮지 않는다')
  ok(/LTX 공식 문서|403/.test(ltx), '모델 ID 를 확인 못 했다는 사실이 표에 적혀 있다',
     '못 확인한 것을 확인한 것처럼 두면 다음 사람이 그대로 믿고 켠다')
  /* 켜는 순간 정말 노드에 뜨는가 — 등록부는 분류(cat)를 그대로 스튜디오에 넘기고,
     스튜디오는 '영상' 으로 시작하는 분류만 영상 노드 피커에 싣는다. 분류를 '동영상' 처럼
     적어 두면 등록은 되는데 피커에는 안 뜬다(아무 오류도 안 난다 — 그냥 안 보인다). */
  const studio = fs.readFileSync(ROOT + 'public/studio-nvc-prv-8b3k2/index.html', 'utf8')
  const cats = [...ltx.matchAll(/cat: '([^']+)'/g)].map((m) => m[1])
  ok(cats.length > 0 && cats.every((c) => c.startsWith('영상')), '분류가 영상 노드 피커에 걸리는 이름이다',
     JSON.stringify(cats))
  ok(/MODELS\.filter\(function\(m\)\{ return \/\^영상\/\.test\(m\[0\]\); \}\)/.test(studio),
     '스튜디오가 그 규칙으로 영상 목록을 만든다', '규칙이 바뀌면 위 분류도 같이 바뀌어야 한다')
  ok(/MODEL_PROVIDER\[name\] = String\(r\.provider\|\|''\);/.test(studio),
     '등록부의 제공사가 노드로 그대로 넘어간다')
}

console.log('\n⑤ 켜지더라도 조용히 실패하지 않는다')
{
  ok(/if \(provider === "ltx"\)/.test(gen), '생성 경로에 LTX 자리가 있다')
  const br = gen.slice(gen.indexOf('if (provider === "ltx")'))
  ok(/아직 연결되지 않았습니다/.test(br.slice(0, 600)), '왜 안 되는지와 어디로 가야 하는지를 말한다',
     '"지원하지 않는 provider" 로 떨어지면 관리자는 오타를 의심하며 엉뚱한 데를 뒤진다')
}

console.log('\n⑥ 단가는 표 한 곳에서만 온다')
{
  ok(/for \(const r of LTX_MODELS\)/.test(price), '_ltx.ts 표를 그대로 얹는다',
     '단가를 두 군데 적으면 반드시 어긋난다 — 루마·클링이 그랬다')
  ok(!/'LTX [\s\S]{0,40}': \{ u: 'sec'/.test(price), '단가를 손으로 또 적은 줄이 없다')
  ok(/ltx: 'LTX \(Lightricks\)'/.test(price), '제공사 이름표가 있다 — AI 정산 표에 내부 이름이 안 찍힌다')
}

/* ══════════════════════════════════════════════════════════════════════════
   ⑦ 실제로 돌려 본다 — 가짜 LTX 서버를 세우고 판정이 맞는지 본다.
   글 검사만으로는 "200 하나 보고 된다고 우기는" 판정을 못 잡는다.
   ══════════════════════════════════════════════════════════════════════════ */
const out = await build({
  entryPoints: [ROOT + 'functions/api/generate.js'], bundle: true, write: false,
  format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'],
})

const REAL = 'ltx_live_ABCDEF_MIDDLE_SECRET_7890'
let seen = []          // 요청 전부 — 환율 조회 등 이 진단과 무관한 것도 섞인다
/* 이 진단이 LTX 로 보낸 것만 센다. 같은 요청 안에서 환율(open.er-api·frankfurter 등)을
   따로 읽는 자리가 있어서, 전부 세면 "안 닿는 호스트를 계속 두들긴다" 는 엉뚱한 실패가 난다. */
const ltxCalls = () => seen.filter((x) => /\/\/api\.ltx\./.test(x.url))

/** kind: 어떤 LTX 서버를 흉내 내는가 */
function makeFetch(kind) {
  return async (url, init) => {
    const u = String(url)
    const auth = String(((init && init.headers) || {})['Authorization'] || '')
    const key = auth.replace(/^Bearer\s+/, '')
    seen.push({ url: u, method: (init && init.method) || 'GET', hasBody: !!(init && init.body), key })
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } })

    if (kind === 'dead') throw new Error('getaddrinfo ENOTFOUND')
    if (kind === 'reject') return J({ error: { code: 'unauthorized', message: 'invalid api key' } }, 401)
    if (kind === 'nocheck') return J({ data: [{ id: 'ltx-2.3-pro' }] })   // 틀린 키에도 200 — 인증을 안 본다
    if (kind === 'real') {
      if (key !== REAL) return J({ error: { code: 'unauthorized', message: 'invalid api key' } }, 401)
      if (/\/v1\/models$/.test(u)) return J({ data: [{ id: 'ltx-2.3-pro' }, { id: 'ltx-2.3-fast' }] })
      if (/\/v1\/credits$/.test(u)) return J({ credits: 1234 })
      return J({ error: { code: 'not_found', message: 'no such job' } }, 404)
    }
    return J({}, 500)
  }
}

function load(fetchImpl) {
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_,
    console: { log() {}, warn() {}, error() {} },
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: fetchImpl, btoa, atob, setTimeout, clearTimeout, structuredClone, AbortController,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: 'generate.js' })
  return sandbox.module.exports
}

function makeDB(who) {
  const row = who ? { id: 'u1', email: 'a@b.c', role: who, credits: 100 } : null
  const st = (sql) => ({
    bind: () => st(sql),
    async first() { return /FROM sessions/i.test(sql) ? row : null },
    async run() { return { meta: { changes: 1 } } },
    async all() { return { results: [] } },
  })
  //  dump 가 없으면 resolveDB 의 isLikelyD1 이 이 객체를 D1 으로 안 본다 = 관리자 판정이 통째로 실패한다
  return {
    prepare: (s) => st(String(s)),
    async batch(x) { return (x || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
}

async function runDiag(kind, who = 'admin', env = {}) {
  seen = []
  const mod = load(makeFetch(kind))
  const res = await mod.onRequest({
    request: new Request('https://bygency.com/api/generate?diag=ltx', {
      headers: { host: 'bygency.com', cookie: who ? 'bg_session=t' : '' },
    }),
    env: { DB: makeDB(who), LTX_API_KEY: REAL, ...env },
    params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  const txt = await res.text().catch(() => '')
  let body = {}; try { body = JSON.parse(txt) } catch { /* noop */ }
  return { status: res.status, body, txt }
}

console.log('\n⑦ 관리자만 부를 수 있다')
{
  for (const who of [null, 'user']) {
    const r = await runDiag('real', who)
    ok(r.status === 403, `${who || '비로그인'} 은 403`, String(r.status))
    ok(!r.txt.includes(REAL) && !/ABCDEF/.test(r.txt), '거절 응답에도 키가 안 새어 나간다')
  }
}

console.log('\n⑧ 키가 진짜 되는 서버 — "작동한다" 를 확정한다')
{
  const r = await runDiag('real')
  ok(r.body.키작동 === true, '키작동 = true', JSON.stringify(r.body.판정 || r.body))
  ok(/확정/.test(String(r.body.판정 || '')), '판정에 확정이라고 적는다', String(r.body.판정))
  ok(r.body.잔액 === 1234, '잔액도 함께 읽어 온다', String(r.body.잔액))
  const 모델 = (r.body.모델목록 || []).flatMap((g) => g.모델)
  ok(모델.includes('ltx-2.3-pro') && 모델.includes('ltx-2.3-fast'),
     '제공사가 알려 준 모델 ID 를 그대로 보여 준다', JSON.stringify(모델))
  ok(ltxCalls().some((x) => x.key !== REAL), '대조(일부러 틀린 키) 요청을 실제로 보냈다',
     '안 보내면 200 이 인증을 통과한 증거인지 알 수 없다')
  ok(ltxCalls().every((x) => x.method === 'GET'), 'LTX 로 보낸 요청이 전부 GET 이다',
     JSON.stringify(ltxCalls().filter((x) => x.method !== 'GET').slice(0, 3)))
  ok(ltxCalls().every((x) => !x.hasBody), '본문을 실은 요청이 하나도 없다')
  ok(!r.txt.includes(REAL), '응답 어디에도 키 전체가 없다')
  ok(typeof r.body.키지문 === 'string' && r.body.키지문.includes('…'), '지문은 준다', String(r.body.키지문))
}

console.log('\n⑨ 인증을 안 보는 서버 — 200 이 와도 "확인 못 함" 이어야 한다')
{
  const r = await runDiag('nocheck')
  ok(r.body.키작동 === null, '키작동 = null (확정 못 함)', JSON.stringify(r.body.판정))
  ok(/인증을 보지 않습니다/.test(String(r.body.판정 || '')), '왜 확정 못 하는지 말한다', String(r.body.판정))
  ok(!/키가 작동합니다/.test(String(r.body.판정 || '')), '200 을 근거로 "된다" 고 하지 않는다',
     '이 한 줄이 이 진단의 존재 이유다 — 여기서 우기면 확인이 아니라 요식행위가 된다')
}

console.log('\n⑩ 키를 거절하는 서버 — "안 된다" 를 확정한다')
{
  const r = await runDiag('reject')
  ok(r.body.키작동 === false, '키작동 = false', JSON.stringify(r.body.판정))
  ok(/거절/.test(String(r.body.판정 || '')), '거절이라고 말한다', String(r.body.판정))
}

console.log('\n⑪ 닿지 않는 서버 — 키 탓으로 돌리지 않는다')
{
  const r = await runDiag('dead')
  ok(r.body.키작동 === null, '키작동 = null', JSON.stringify(r.body.판정))
  ok(/닿지 않/.test(String(r.body.판정 || '')), '"키가 틀렸다" 가 아니라 "못 물어봤다" 라고 한다',
     '못 물어본 것을 안 된다고 적으면 멀쩡한 키를 버리게 된다')
  //  후보 주소 2곳 × 경로 5개 = 10번을 다 두들길 이유가 없다. 첫 요청이 안 닿으면 그 호스트는 끝이다.
  ok(ltxCalls().length <= 2, '안 닿는 호스트의 남은 경로는 더 묻지 않는다',
     `${ltxCalls().length}번 보냄: ` + ltxCalls().map((x) => x.url).join(' '))
}

console.log('\n⑫ 키가 없으면 없다고만 한다')
{
  const mod = load(makeFetch('real'))
  seen = []
  const res = await mod.onRequest({
    request: new Request('https://bygency.com/api/generate?diag=ltx', { headers: { host: 'bygency.com', cookie: 'bg_session=t' } }),
    env: { DB: makeDB('admin') }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  const body = await res.json().catch(() => ({}))
  ok(res.status === 400 && body.키있음 === false, '키 없음을 400 으로 알린다', String(res.status))
  ok(ltxCalls().length === 0, '키가 없으면 제공사를 두들기지 않는다',
     `${ltxCalls().length}번 보냄: ` + ltxCalls().map((x) => x.url).join(' '))
}

console.log(failed === 0
  ? '\nLTX 키 확인 — 실패 0 (관리자만 · GET 만 · 키 비노출 · 대조로 확정 · 확인 전 모델은 꺼짐)\n'
  : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
