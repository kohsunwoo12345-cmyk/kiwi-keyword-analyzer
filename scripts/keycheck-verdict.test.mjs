/* 키 확인의 판정 — 멀쩡한 키를 "확인 못 함" 으로 버리지 않는가.
 *
 * LTX 에서 실제로 그랬다. 후보 주소가 전부 404 였는데 그 404 가 두 종류였다:
 *     "Cannot GET /v1/credits"   ← 라우터가 뱉은 일반 404. 인증까지 가지도 않는다.
 *     "Job 0000… not found"      ← **앱이 답한 것.** 라우팅도 인증도 지나간 자리다.
 * 대조(일부러 틀린 키)에 앞의 주소를 골라 버리면 틀린 키도 똑같이 404 라 아무것도 안 갈린다.
 * 그래서 판정이 "확인 못 함" 으로 끝났다 — 키는 멀쩡했을 수도 있는데 알 길이 없었다.
 *
 * 여기서는 그 상황을 그대로 만들어 놓고, 판정이 실제로 갈리는지 잰다.
 * (진짜 _keycheck.ts 를 번들해서 돌린다. 정규식으로 코드 모양만 보지 않는다.)
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs',
                            platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    AbortController, fetch: async () => new Response('{}'), btoa, atob, setTimeout, clearTimeout }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

const kc = await load('functions/api/studio/_keycheck.ts')
const GOOD = 'good-key-1234567890'

/** LTX 를 흉내 낸다. 인증을 보는 곳은 작업 조회 하나뿐이고, 나머지는 라우터 404 다. */
const makeFetch = (opt) => async (url, init) => {
  const u = String(url)
  const key = String(((init && init.headers) || {}).Authorization || '').replace(/^Bearer\s+/, '')
  const 우리키 = key === GOOD
  const H = { 'content-type': 'text/html' }
  if (/text-to-video\//.test(u)) {
    //  앱이 답하는 자리 — 인증을 본다
    if (!우리키 && opt.authChecked) return new Response('Unauthorized', { status: 401 })
    return new Response('Job 00000000-0000-4000-8000-000000000000 not found', { status: 404 })
  }
  //  라우터가 뱉는 일반 404 — 인증을 보지 않는다(틀린 키도 똑같이 404)
  return new Response('<!DOCTYPE html><html><head><title>Error</title></head><body><pre>Cannot GET '
    + new URL(u).pathname + '</pre></body></html>', { status: 404, headers: H })
}

const PROVIDER = {
  id: 'ltxtest', label: 'LTX(흉내)', envNames: ['X'], hosts: ['https://api.ltx.test'],
  console: 'https://x', wired: false, 주소근거: '검사용',
  probes: [
    { 이름: '모델 목록 v1', path: '/v1/models', 종류: 'models' },
    { 이름: '잔액 조회', path: '/v1/credits', 종류: 'account' },
    { 이름: '계정 조회', path: '/v1/me', 종류: 'account' },
    { 이름: '없는 작업 조회', path: '/v2/text-to-video/00000000-0000-4000-8000-000000000000', 종류: 'job' },
  ],
}
//  ⚠ 인자 순서는 (제공사, 키, fetchT, 호스트덮기, 찾은이름) 이다.
//    처음에 envName 을 세 번째로 넘겨서 fetchT 자리에 문자열이 들어갔고, 전부 "닿지 않음" 이 됐다.
//    코드가 틀린 게 아니라 이 호출이 틀렸던 것이다.
const run = (opt) => kc.runKeyCheck(PROVIDER, GOOD, makeFetch(opt), null, 'X')

console.log('\n① 인증을 보는 자리가 있으면 — 전부 404 여도 키를 확정해야 한다')
{
  const r = await run({ authChecked: true })
  ok(/text-to-video/.test(String(r.대조 && r.대조.url)),
     '대조를 앱이 답한 주소로 건다 — 라우터 404 를 고르면 아무것도 안 갈린다',
     String(r.대조 && r.대조.url))
  ok(r.대조 && r.대조.status === 401, '틀린 키는 그 주소에서 401 로 거절된다', String(r.대조 && r.대조.status))
  ok(r.키작동 === true, '판정: 키가 작동한다', r.판정)
  ok(/인증은 통과/.test(r.판정 + r.근거), '왜 그렇게 봤는지 근거를 남긴다', r.판정)
}

console.log('\n② 인증을 아무 데서도 안 보면 — 확정하면 안 된다')
{
  const r = await run({ authChecked: false })
  ok(r.키작동 === null, '판정: 확인 못 함 (틀린 키도 404 라 갈리지 않는다)', r.판정)
  ok(!/키가 작동합니다/.test(r.판정), '작동한다고 단정하지 않는다', r.판정)
}

console.log('\n③ 첫 경로가 느리다고 그 호스트를 통째로 포기하지 않는다')
{
  /* Bria 가 이 경우였다. 첫 경로 하나가 8초를 넘겼는데 그 이유로 나머지를 아예 묻지 않고
     "닿지 않음" 으로 끝냈다. 뒤 경로가 답했을지는 확인조차 못 했다.
     한 경로가 느린 것과 호스트가 죽은 것은 다르다. */
  const SLOW = { id: 'slowtest', label: '느린곳', envNames: ['X'], hosts: ['https://api.slow.test'],
    console: 'https://x', wired: false, 주소근거: '검사용',
    probes: [
      { 이름: '느린 경로', path: '/slow', 종류: 'models' },
      { 이름: '가벼운 경로', path: '/light', 종류: 'job' },
    ] }
  //  첫 경로는 시간 초과(status 0), 두 번째는 인증을 보고 답한다
  const f = async (url, init) => {
    if (/\/slow$/.test(String(url))) throw new Error('timeout')
    const key = String(((init && init.headers) || {}).Authorization || '').replace(/^Bearer\s+/, '')
    return new Response(key === GOOD ? 'ok' : 'no', { status: key === GOOD ? 200 : 401 })
  }
  const r = await kc.runKeyCheck(SLOW, GOOD, f, null, 'X')
  const 물어본것 = r.결과.filter((x) => /가벼운 경로/.test(x.검사))
  ok(물어본것.length === 1, '첫 경로가 안 닿아도 뒤 경로를 계속 묻는다',
     JSON.stringify(r.결과.map((x) => x.검사)))
  ok(r.키작동 === true, '뒤 경로가 답하면 판정이 선다', r.판정)
  ok(!/나머지 건너뜀/.test(JSON.stringify(r.결과)), '"나머지 건너뜀" 으로 끝내지 않는다')
}

console.log('\n④ 정말 아무 경로도 안 닿으면 그때는 그렇게 말한다')
{
  const DEAD = { id: 'deadtest', label: '죽은곳', envNames: ['X'], hosts: ['https://api.dead.test'],
    console: 'https://x', wired: false, 주소근거: '검사용',
    probes: [{ 이름: 'a', path: '/a', 종류: 'job' }, { 이름: 'b', path: '/b', 종류: 'job' }] }
  const r = await kc.runKeyCheck(DEAD, GOOD, async () => { throw new Error('timeout') }, null, 'X')
  ok(r.키작동 === null && /닿지 않았습니다/.test(r.판정), '전부 안 닿으면 "닿지 않음" 으로 판정한다', r.판정)
  ok(/어느 경로도 답하지 않음/.test(JSON.stringify(r.결과)), '왜 그렇게 봤는지 남긴다')
}

console.log('\n⑤ 인증 안 보는 200 하나에 속아 판정을 포기하지 않는다 (Bria 가 그랬다)')
{
  /* Bria 실측: 루트 / 는 200 {} 를 주는데 인증을 안 본다. 대조를 거기에 걸면 둘 다 200 이라
     "인증을 보지 않는다 → 확인 못 함" 으로 끝난다. 정작 답은 422 에 있었다 —
     "model_id 는 정수여야 한다" 는 **앱이 값을 따진 응답**이고, 인증을 지나야 나온다. */
  const BRIA = { id: 'briatest', label: 'Bria(흉내)', envNames: ['X'], hosts: ['https://engine.test'],
    console: 'https://x', wired: false, 주소근거: '검사용',
    probes: [
      { 이름: '느린 목록', path: '/v1/tailored-gen/models/', 종류: 'models' },
      { 이름: '없는 모델', path: '/v1/tailored-gen/models/__no_such__', 종류: 'job' },
      { 이름: '루트', path: '/', 종류: 'job' },
    ] }
  const f = async (url, init) => {
    const u = String(url)
    const key = String(((init && init.headers) || {}).Authorization || '').replace(/^Bearer\s+/, '')
    if (/tailored-gen\/models\/$/.test(u)) throw new Error('timeout')          // 느린 경로
    if (/__no_such__/.test(u)) {
      if (key !== GOOD) return new Response('Unauthorized', { status: 401 })     // 인증을 본다
      return new Response(JSON.stringify([{ type: 'int_parsing', msg: 'not an integer' }]), { status: 422 })
    }
    return new Response('{}', { status: 200 })                                   // 루트 — 인증 안 봄
  }
  const r = await kc.runKeyCheck(BRIA, GOOD, f, null, 'X')
  ok(/__no_such__/.test(String(r.대조 && r.대조.url)),
     '앱이 값을 따진 주소(422)로 대조한다 — 루트 200 을 고르면 안 갈린다', String(r.대조 && r.대조.url))
  ok(r.키작동 === true, '판정: 키가 작동한다', r.판정)
  ok(!/인증을 보지 않습니다/.test(r.판정), '"인증을 안 본다" 로 끝내지 않는다', r.판정)
}

console.log('\n⑥ 키 값은 어떤 경우에도 응답에 안 실린다')
{
  const r = await run({ authChecked: true })
  const dump = JSON.stringify(r)
  ok(!dump.includes(GOOD), '키 원문이 응답 어디에도 없다')
  ok(/^good-k…7890$/.test(String(r.키지문)), '앞 6자·뒤 4자 지문만 준다', String(r.키지문))
}

console.log(failed === 0
  ? '\n키 확인 판정 — 실패 0 (앱이 답한 주소로 대조 · 못 가르면 단정 안 함 · 키 비노출)'
  : `\n실패 ${failed}건`)
process.exit(failed ? 1 : 0)
