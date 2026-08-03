/* 생성 게이트 회귀 테스트 —  node scripts/gen-gate.test.mjs
 *
 * /api/generate 의 잔액 게이트는 "유료 제공사를 부르기 전 마지막 문" 이다.
 * 여기가 열리면 제공사 비용은 우리가 내고 회원에게는 청구되지 않는다.
 *
 * scripts/gate-vs-charge.test.mjs 는 게이트의 계산식을 손으로 재현해 차감과 대조한다.
 * 그건 "식이 같은가" 를 보는 것이고, 이 파일은 "그 문이 실제로 닫히는가" 를 본다 —
 * 돌연변이 점검에서 잔액 검사·과금 토큰 발급·가산·요청 한도·버스트 가드를 전부
 * 없애 보니 여섯 가지가 그대로 살아남았다(계산식만 보던 탓이다).
 *
 * 그래서 진짜 onRequest 를 그대로 돌린다. 제공사 호출 앞에서 멈추는지,
 * 통과할 때 과금 토큰을 실제로 발급하는지 본다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

let providerCalls = []

/* 돈이 나가는 제공사만 센다. 새 제공사를 붙이면 여기에도 넣어야 한다. */
const AI_HOST_RE = /(bytepluses|volces|byteimg|runwayml|lumalabs|bfl\.ai|fal\.(run|ai|media)|x\.ai|klingai|kling\.ai|minimax|hailuo|openai|googleapis|aliyuncs|replicate|stability)/i

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console, AbortController,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    /* 환율 조회(er-api·frankfurter·jsdelivr)는 제공사 호출이 아니다 —
       그것까지 세면 "유료 제공사를 불렀다" 가 아니라 "아무 요청이나 했다" 를 보게 된다. */
    fetch: async (url) => {
      const u = String(url)
      if (AI_HOST_RE.test(u)) providerCalls.push(u)
      return new Response('{}', { status: 200 })
    },
    btoa, atob, setTimeout, clearTimeout, structuredClone,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

const gen = await load('functions/api/generate.js')
const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString()

/* gen_charges·users·api_rate 만 흉내 낸다.
   rate 는 "지금까지 이만큼 쌓였다" 를 바깥에서 정해 준다. */
function makeDB({ credits = 1_000_000, rate = {}, pending = 0 } = {}) {
  const user = {
    id: 'u1', email: 'a@x.co', name: '회원', role: 'user', status: 'active',
    credits, credit_price: 65, credit_markup: 0,
    video_plan: 'Pro', video_plan_until: FUTURE, plan: 'Pro', plan_until: FUTURE,
  }
  const state = { user, tokens: [], sql: [] }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM sessions s JOIN users u/i.test(s)) return { ...user }
    if (/FROM users WHERE id/i.test(s)) return { ...user }
    if (/FROM api_rate WHERE user_id/i.test(s)) return { b: rate.burst || 0, m: rate.min || 0, h: rate.hour || 0, d: rate.day || 0 }
    if (/FROM api_calls WHERE user_id=\? AND status='pending'/i.test(s)) return { n: pending }
    return null
  }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/INSERT INTO gen_charges/i.test(s)) state.tokens.push({ id: b[0], user_id: b[1], model: b[2], units: b[3], res: b[4] })
    return { meta: { changes: 1 } }
  }
  return {
    __state: state,
    prepare(sql) {
      const s = String(sql)
      const mk = (b) => ({ first: () => first(s, b), run: () => run(s, b), all: async () => ({ results: [] }) })
      return { bind: (...b) => mk(b), ...mk([]) }
    },
    async batch(st) { return (st || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
}

async function post(db, body) {
  providerCalls = []
  const res = await gen.onRequest({
    request: new Request('https://bygency.com/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bg_session=t', host: 'bygency.com', origin: 'https://bygency.com' },
      body: JSON.stringify(body),
    }),
    env: { DB: db }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  let parsed = {}
  const text = await res.text()
  try { parsed = JSON.parse(text) } catch { parsed = { _raw: text.slice(0, 200) } }
  return { status: res.status, body: parsed, providerCalls: providerCalls.slice() }
}

const JOB = { model: 'Seedance 2.0', prompt: '광고 영상', seconds: 10, res: '1080p' }

console.log('\n① 잔액이 모자라면 제공사를 부르기 전에 막는다')
{
  //  1크레딧만 남겨 둔다 — 앞단의 credits>0 게이트는 지나고 잔액 게이트에서 걸려야 한다
  const db = makeDB({ credits: 1 })
  const r = await post(db, JOB)
  ok(r.status === 402, '402 로 막는다', String(r.status))
  ok(/부족/.test(String(r.body.error)), '크레딧 부족이라고 알려 준다', String(r.body.error))
  ok(Number(r.body.need) > 1, '얼마가 필요한지 알려 준다', JSON.stringify(r.body.need))
  ok(Number(r.body.balance) === 1, '지금 잔액도 알려 준다', JSON.stringify(r.body.balance))
  ok(r.providerCalls.length === 0, '제공사를 부르지 않는다 (부르면 그 비용은 우리 몫이다)', JSON.stringify(r.providerCalls))
  ok(db.__state.tokens.length === 0, '과금 토큰도 발급하지 않는다', String(db.__state.tokens.length))
}

console.log('\n② 잔액이 충분하면 통과하고 과금 토큰을 발급한다')
{
  /* 토큰이 없으면 정산이 소비할 것이 없다 — 생성은 되고 청구는 안 되는 상태가 된다.
     실제로 GET 우회로가 그래서 오래 새고 있었다. */
  const db = makeDB({ credits: 1_000_000 })
  const r = await post(db, JOB)
  ok(r.status !== 402, '잔액 게이트에서 막히지 않는다', String(r.status))
  ok(db.__state.tokens.length === 1, '과금 토큰을 발급한다', String(db.__state.tokens.length))
  const t = db.__state.tokens[0]
  ok(t.model === 'Seedance 2.0', '토큰에 실제 모델이 적힌다(신고값이 아니라)', String(t.model))
  ok(Number(t.units) === 10, '토큰에 실제 길이가 적힌다', String(t.units))
  ok(String(t.res) === '1080p', '토큰에 실제 해상도가 적힌다', String(t.res))
}

console.log('\n③ 게이트가 요구하는 금액에 레퍼런스·ControlNet 가산이 들어간다')
{
  /* 가산을 빼고 통과시키면 "충분합니다" 해 놓고 더 크게 빠져 잔액이 음수가 된다. */
  const plain = await post(makeDB({ credits: 1 }), JOB)
  const refs = await post(makeDB({ credits: 1 }), { ...JOB, refImages: ['a', 'b', 'c', 'd'] })
  const cn = await post(makeDB({ credits: 1 }), { ...JOB, controlnets: [1] })

  ok(Number(refs.body.need) > Number(plain.body.need), '레퍼런스를 넣으면 더 요구한다',
     `${plain.body.need} → ${refs.body.need}`)
  ok(Number(cn.body.need) > Number(plain.body.need), 'ControlNet 을 쓰면 더 요구한다',
     `${plain.body.need} → ${cn.body.need}`)
}

console.log('\n④ 게이트는 신고값이 아니라 실제로 만들어질 값으로 센다')
{
  /* 요청에 적힌 길이를 그대로 믿으면, 짧게 신고하고 길게 만드는 우회가 열린다.
     빌더가 실제로 보낼 값(effectiveUnits)으로 계산해야 한다. */
  const short = await post(makeDB({ credits: 1 }), { ...JOB, seconds: 5 })
  const long = await post(makeDB({ credits: 1 }), { ...JOB, seconds: 10 })
  ok(Number(long.body.need) > Number(short.body.need), '길수록 더 요구한다', `${short.body.need} → ${long.body.need}`)

  //  해상도도 마찬가지 — 4K 를 1080p 값으로 받으면 안 된다
  const hd = await post(makeDB({ credits: 1 }), { ...JOB, res: '720p' })
  const fhd = await post(makeDB({ credits: 1 }), { ...JOB, res: '1080p' })
  ok(Number(fhd.body.need) > Number(hd.body.need), '해상도가 높을수록 더 요구한다', `${hd.body.need} → ${fhd.body.need}`)
}

console.log('\n⑤ 요청이 너무 잦으면 막는다 (제공사 요금 폭주 방지)')
{
  const over = await post(makeDB({ credits: 1_000_000, rate: { min: 99999 } }), JOB)
  ok(over.status === 429, '분당 한도를 넘으면 429 다', String(over.status))
  ok(over.providerCalls.length === 0, '제공사를 부르지 않는다', JSON.stringify(over.providerCalls))

  const burst = await post(makeDB({ credits: 1_000_000, rate: { burst: 99 } }), JOB)
  ok(burst.status === 429, '15초 버스트가 많으면 429 다', String(burst.status))
  ok(/짧은 시간/.test(String(burst.body.error)), '버스트라고 알려 준다', String(burst.body.error))

  const busy = await post(makeDB({ credits: 1_000_000, pending: 9999 }), JOB)
  ok(busy.status === 429, '동시 진행이 많으면 429 다', String(busy.status))
}

console.log('\n⑥ 로그인하지 않으면 생성 자체가 시작되지 않는다')
{
  providerCalls = []
  const db = makeDB({ credits: 1_000_000 })
  const res = await gen.onRequest({
    request: new Request('https://bygency.com/api/generate', {
      method: 'POST', headers: { 'content-type': 'application/json', host: 'bygency.com' },
      body: JSON.stringify(JOB),
    }),
    env: { DB: db }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  ok(res.status === 401 || res.status === 403, '비로그인은 막힌다', String(res.status))
  ok(providerCalls.length === 0, '제공사를 부르지 않는다', JSON.stringify(providerCalls))
  ok(db.__state.tokens.length === 0, '과금 토큰도 발급하지 않는다')
}

console.log(failed === 0 ? '\n생성 게이트 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
