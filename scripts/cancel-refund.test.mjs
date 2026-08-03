/* 제작 취소 — "그만두면 돈이 안 나가는가" 를 코드에 못 박는다.
 *
 * 이 검사가 지키려는 약속은 딱 하나다: 취소하면 회원 크레딧은 전액 돌아온다.
 * 제공사 원가는 약속하지 못한다 — 확인해 본 취소 규격이 하나같이 "아직 시작 안 한
 * 작업만" 이라고 못 박기 때문이다(fal·Luma·ModelArk). 그래서 여기서는
 *   ㉠ 제공사에 중지를 알리는 자리가 실제로 있는가(되는 곳만, 올바른 method·주소로)
 *   ㉡ 그 호출이 실패하거나 규격이 없어도 환불은 그대로 되는가
 *   ㉢ 남의 작업을 취소해 남의 크레딧을 건드리지 못하는가
 * 를 본다. ㉡ 이 제일 중요하다 — 제공사가 안 받아 줬다고 환불을 미루면
 * 회원은 아무것도 못 받은 채로 돈만 빠진 상태가 된다.
 */
import { buildSync } from 'esbuild'
import vm from 'node:vm'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

/* 제공사 호출을 가로채는 가짜 fetch. 무엇을 어떤 방법으로 불렀는지 그대로 적어 둔다. */
let CALLS = []
let NEXT_STATUS = 200
const fakeFetch = async (url, opts) => {
  CALLS.push({ url: String(url), method: (opts && opts.method) || 'GET' })
  return new Response('{}', { status: NEXT_STATUS, headers: { 'content-type': 'application/json' } })
}

function load(file) {
  const out = buildSync({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs',
                          platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console, Response, Request,
                    Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto, fetch: fakeFetch,
                    btoa, atob, setTimeout, clearTimeout, AbortController }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}
const cancel = load('functions/api/studio/cancel.ts')
const srv = fs.readFileSync(ROOT + 'functions/api/studio/cancel.ts', 'utf8')
const studio = fs.readFileSync(ROOT + 'public/studio-nvc-prv-8b3k2/index.html', 'utf8')

const ENV = { Runway_API_KEY: 'rw', Seedance_API_KEY: 'sd', Luma_API_KEY: 'lm', Fal_API_KEY: 'fl' }
const run = async (taskKey) => { CALLS = []; const r = await cancel.cancelAtProvider(ENV, taskKey); return { r, calls: CALLS } }

// ① 취소 규격이 있는 제공사는 실제로 부른다 — 방법과 주소까지 맞아야 한다
{
  const cases = [
    ['runway',  '/api/generate?provider=runway&task=T1',            'DELETE', /api\.dev\.runwayml\.com\/v1\/tasks\/T1$/],
    ['seedance','/api/generate?provider=seedance&task=T2&host=bp',  'DELETE', /\/contents\/generations\/tasks\/T2$/],
    ['ark3d',   '/api/generate?provider=ark3d&task=T3',             'DELETE', /\/contents\/generations\/tasks\/T3$/],
    ['luma',    '/api/generate?provider=luma&task=T4',              'DELETE', /\/generations\/T4$/],
    ['falq',    '/api/generate?provider=falq&task=T5&model=fal-ai%2Fx', 'PUT', /\/requests\/T5\/cancel$/],
  ]
  for (const [name, key, method, urlRe] of cases) {
    NEXT_STATUS = 200
    const { r, calls } = await run(key)
    ok(`① ${name} 에 중지를 알린다`, calls.length === 1 && calls[0].method === method && urlRe.test(calls[0].url),
       JSON.stringify(calls))
    ok(`①-b ${name} 이 성공하면 중지됨으로 본다`, r.stopped === true, JSON.stringify(r))
  }
  //  fal 컨트롤넷은 status 주소에서 취소 주소를 만들어 낸다 — 모델 경로를 잃으면 안 된다
  NEXT_STATUS = 200
  const cn = await run('/api/generate?provider=falcontrol&status=' +
    encodeURIComponent('https://queue.fal.run/fal-ai/cn/requests/T6/status'))
  ok('①-c falcontrol 도 취소 주소를 만들어 부른다',
     cn.calls.length === 1 && cn.calls[0].method === 'PUT' &&
     cn.calls[0].url === 'https://queue.fal.run/fal-ai/cn/requests/T6/cancel', JSON.stringify(cn.calls))
}

// ② 취소 규격이 없는 제공사는 아예 찌르지 않는다
{
  for (const [name, key] of [['kling', 'kling&task=T'], ['hailuo', 'hailuo&task=T'],
                             ['flux', 'flux&poll=https%3A%2F%2Fapi.bfl.ai%2Fx'],
                             ['google', 'google&op=o/1'], ['xai', 'xai&task=T']]) {
    const { r, calls } = await run('/api/generate?provider=' + key)
    ok(`② ${name} 은 없는 취소 주소를 찌르지 않는다`, calls.length === 0, JSON.stringify(calls))
    //  "모른다"(null)와 "해 봤는데 안 됐다"(false)는 다른 사실이다 — 뭉치면 화면에서 거짓말이 된다
    ok(`②-b ${name} 은 '규격 없음'으로 답한다`, r.stopped === null, JSON.stringify(r))
  }
}

// ③ 제공사가 거절해도 그건 그거고, 환불은 별개다
{
  NEXT_STATUS = 409                       // 이미 돌기 시작해 취소 못 하는 상황
  const { r } = await run('/api/generate?provider=falq&task=T9&model=fal-ai%2Fx')
  ok('③ 제공사가 거절하면 중지 실패로 적는다', r.stopped === false, JSON.stringify(r))
  //  코드 자리 확인 — 환불이 제공사 응답에 매달려 있으면 안 된다
  const iCancel = srv.indexOf('await cancelAtProvider')
  const iRefund = srv.indexOf('await refundGenCharge')
  ok('③-b 환불이 제공사 결과와 무관하게 실행된다',
     iCancel > 0 && iRefund > iCancel && !/if\s*\([^)]*stopped[^)]*\)[^\n]*refundGenCharge/.test(srv),
     '제공사가 안 받아 주면 환불도 안 하는 구조면, 회원은 못 받고 돈만 빠진다')
  ok('③-c 환불은 조건 없이 부른다', /const refunded = await refundGenCharge\(db, taskKey\)/.test(srv))
}

// ④ 남의 작업은 취소도 환불도 못 한다
{
  ok('④ 작업 주인을 확인한다', /row\.user_id\) !== String\(me\.id\)/.test(srv),
     '작업 주소만 알면 남의 생성을 멈추고 남의 크레딧을 건드릴 수 있다')
  ok('④-b 주인이 아니면 403 으로 끊는다', /403\)/.test(srv))
  //  확인이 제공사 호출·환불보다 앞에 있어야 의미가 있다
  const iOwn = srv.indexOf('!== String(me.id)')
  ok('④-c 확인이 취소·환불보다 먼저다', iOwn > 0 && iOwn < srv.indexOf('await cancelAtProvider'))
}

// ⑤ 스튜디오 쪽 — 취소가 "다시 제출"로 이어지지 않는다
{
  /* 여기가 제일 위험한 자리였다. generateWithAPI 는 실패하면 다른 길로 한 번 더 제출한다
     (씨댄스 GET 우회). 취소를 그냥 실패로 흘리면 그만두라고 한 그 순간에 같은 생성을
     다시 보내고 — 한 번 더 과금된다. 화면에는 취소했다고 떠 있는 채로. */
  ok('⑤ 취소는 프록시 실패로 삼키지 않고 위로 던진다',
     /catch\(e\)\{ if\(isCancel\(e\)\) throw e; err=String/.test(studio),
     '삼키면 우회 재제출로 이어져 두 번 과금된다')
  ok('⑤-b GET 우회 제출 전에도 취소를 본다',
     /if\(_stopGen\(\)\) throw new CancelledError\(\);/.test(studio))
  ok('⑤-c GET 우회 경로의 실패 처리도 취소를 통과시킨다',
     /catch\(ge\)\{ if\(isCancel\(ge\)\) throw ge;/.test(studio))
  ok('⑤-d 보내기 직전에 한 번 더 본다(제출 전 취소 = 0원)',
     /if\(_stop\(\)\) throw new CancelledError\(\);[\s\S]{0,400}?fetch\(base,\{method:'POST'/.test(studio))
  ok('⑤-e 취소는 오류 상자로 띄우지 않는다', /if\(isCancel\(e\)\)\{[\s\S]{0,300}?tellCancel\(id, _ck\)/.test(studio))
  ok('⑤-f 진행률에 취소 버튼이 있다', /data-cancelrun/.test(studio))
  ok('⑤-g 새로고침해 이어받은 생성도 취소할 수 있다',
     /_runningNodes\[nid\]=1; _taskOf\[nid\]=url;/.test(studio),
     '껐다 켜면 멈출 방법이 없어지면 안 된다')
  //  끝난 뒤 표시가 남으면 다음 실행이 시작하자마자 취소된다
  ok('⑤-h 끝나면 취소 표시를 걷는다', /delete _cancelWant\[id\]; delete _taskOf\[id\];/.test(studio))
}

/* ⑥ 앞 30% 는 아직 아무것도 안 보낸 구간이다
   이 구간이 있어야 "취소하면 한 푼도 안 나간다" 를 지킬 수 있다. 제공사 취소 규격이
   전부 "아직 시작 안 한 작업만" 이라, 보내고 나면 되돌린다는 말을 지킬 방법이 없다. */
{
  ok('⑥ 보내기 전 대기 구간이 있다', /function holdBeforeSend\(/.test(studio))
  ok('⑥-b 대기가 끝나야 생성으로 넘어간다', /return holdBeforeSend\(id\);/.test(studio),
     '이 줄이 빠지면 대기가 그림일 뿐이고 요청은 곧바로 나간다')
  ok('⑥-c 대기 중 취소하면 아예 안 보낸다', /if\(_cancelWant\[id\]\) return rej\(new CancelledError\(\)\);/.test(studio))
  //  3초가 끝나는 그 찰나에 누른 취소를 흘려보내면 이 구간을 둔 이유가 통째로 무너진다
  ok('⑥-d 대기가 끝나는 순간에도 한 번 더 본다',
     (studio.match(/if\(_cancelWant\[id\]\) return rej\(new CancelledError\(\)\);/g) || []).length >= 2)
  ok('⑥-e 막대는 30% 에서 이어 붙는다', /var HOLD_MS=\d+, HOLD_PCT=30;/.test(studio))
  ok('⑥-f 보낸 뒤에는 취소 버튼을 없앤다',
     /var xb=box\.querySelector\('\.rl-x'\); if\(xb\) xb\.remove\(\);/.test(studio),
     '누를 수는 있는데 제공사는 안 멈추는 버튼이 제일 나쁘다')
  //  진행률은 원래 어림이라 매 초 "(예상)" 이라고 되뇔 말이 아니다
  ok('⑥-g 퍼센트에 "(예상)" 을 붙이지 않는다', !/\+'% \(예상\)'/.test(studio))
  //  이어받은 작업은 이미 나간 것이다 — 대기 구간을 다시 보여 주면 거짓말이 된다
  ok('⑥-h 이어받은 생성은 대기 구간을 건너뛴다',
     /_liveSt\[nid\]\.phase='run'/.test(studio))
}

console.log(fails.length === 0
  ? '\n제작 취소 — 실패 0 (제공사 중지 · 무조건 환불 · 남의 작업 차단 · 재제출 방지)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
