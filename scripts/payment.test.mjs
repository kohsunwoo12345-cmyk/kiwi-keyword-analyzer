/* 크레딧 결제 회귀 테스트 —  node scripts/payment.test.mjs
 *
 * 여기는 실제 돈이 들어오는 자리다. 그런데 돌연변이 점검에서 여덟 가지로
 * 망가뜨려 보니 전부 살아남았다 — 아무 테스트도 보고 있지 않았다.
 *   · 남의 주문을 내가 승인해 크레딧만 받아 가기
 *   · 결제 금액 대조를 빼서 1원 내고 10만 크레딧 받기
 *   · 동시 요청에 두 배 지급
 *   · 이미 결제된 주문 재승인
 *   · 클라이언트가 보낸 금액만큼 지급
 *   · 승인 실패인데 지급
 *   · 주문 금액을 단가와 무관하게
 *   · 충전 수량 상한 제거
 *
 * 제공사(토스) 대신 가짜 응답을 두고 진짜 핸들러를 돌린다.
 * ⚠ 가짜 D1 은 "진짜 SQL 에 적힌 조건" 만 적용한다 — 가짜가 대신 막아 주면
 *   제품에서 조건이 빠져도 테스트가 통과한다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

let tossOk = true
let tossCalls = []

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const fakeFetch = async (url, init) => {
    const u = String(url)
    if (/tosspayments/.test(u)) {
      tossCalls.push(JSON.parse(String(init?.body || '{}')))
      return tossOk
        ? new Response(JSON.stringify({ status: 'DONE' }), { status: 200 })
        : new Response(JSON.stringify({ message: '카드 한도 초과' }), { status: 402 })
    }
    return new Response('{}', { status: 200 })
  }
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: fakeFetch, btoa, atob, setTimeout, clearTimeout, structuredClone,
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

const FUTURE = new Date(Date.now() + 86400_000).toISOString()

function makeDB({ users, orders = [] } = {}) {
  const state = {
    users: users.map((u) => ({ ...u })),
    orders: orders.map((o) => ({ ...o })),
    sessions: [{ token: 'tok', user_id: users[0].id, expires_at: FUTURE }],
    tx: [], sql: [],
  }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM sessions s JOIN users u/i.test(s)) {
      const sess = state.sessions.find((x) => x.token === b[0])
      if (!sess) return null
      if (/expires_at\s*>\s*\?/.test(s) && !(sess.expires_at > b[1])) return null
      return state.users.find((x) => String(x.id) === String(sess.user_id)) || null
    }
    if (/FROM credit_orders WHERE order_id/i.test(s)) return state.orders.find((x) => x.order_id === b[0]) || null
    if (/FROM users WHERE id/i.test(s)) return state.users.find((x) => String(x.id) === String(b[0])) || null
    if (/AS bal FROM users WHERE id/i.test(s)) {
      const u = state.users.find((x) => String(x.id) === String(b[0]))
      return u ? { bal: u.credits } : null
    }
    if (/FROM settings WHERE key/i.test(s)) return null
    return null
  }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/UPDATE credit_orders SET status = 'paid'/i.test(s)) {
      const o = state.orders.find((x) => x.order_id === b[2])
      //  ⚠ 조건은 진짜 SQL 에 있을 때만 본다
      const guarded = /status\s*!=\s*'paid'/.test(s)
      if (!o || (guarded && o.status === 'paid')) return { meta: { changes: 0 } }
      o.status = 'paid'; o.payment_key = b[0]; o.paid_at = b[1]
      return { meta: { changes: 1 } }
    }
    if (/UPDATE credit_orders SET status = 'failed'/i.test(s)) {
      const o = state.orders.find((x) => x.order_id === b[0])
      const guarded = /status\s*!=\s*'paid'/.test(s)
      if (!o || (guarded && o.status === 'paid')) return { meta: { changes: 0 } }
      o.status = 'failed'
      return { meta: { changes: 1 } }
    }
    if (/INSERT INTO credit_orders/i.test(s)) {
      state.orders.push({ order_id: b[0], user_id: b[1], credits: b[2], amount: b[3], status: 'pending', created_at: b[4] })
      return { meta: { changes: 1 } }
    }
    if (/UPDATE users SET credits\s*=\s*ROUND/i.test(s)) {
      const u = state.users.find((x) => String(x.id) === String(b[1]))
      if (u) u.credits = Math.round((Number(u.credits || 0) + Number(b[0])) * 100) / 100
      return { meta: { changes: u ? 1 : 0 } }
    }
    if (/INSERT INTO transactions/i.test(s)) { state.tx.push({ user_id: b[1], amount: b[3], memo: b[5] }); return { meta: { changes: 1 } } }
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

const confirm = await load('functions/api/payments/confirm.ts')
const prepare = await load('functions/api/payments/prepare.ts')

const ENV_BASE = { TOSS_SECRET_KEY: 'sk_test' }
const req = (url, body, cookie = 'bg_session=tok') => new Request(url, {
  method: 'POST',
  headers: { host: 'bygency.com', origin: 'https://bygency.com', 'content-type': 'application/json', cookie },
  body: JSON.stringify(body),
})
const ctx = (db, request) => ({ request, env: { DB: db, ...ENV_BASE }, params: {}, waitUntil: () => {}, next: async () => new Response('') })

const A = { id: 'A', email: 'a@x.co', name: '회원A', role: 'user', status: 'active', credits: 0, credit_price: 65 }
const B = { id: 'B', email: 'b@x.co', name: '회원B', role: 'user', status: 'active', credits: 0, credit_price: 65 }
const ORDER = { order_id: 'ord_1', user_id: 'A', credits: 100, amount: 6500, status: 'pending' }

const doConfirm = (db, body) => confirm.onRequestPost(ctx(db, req('https://bygency.com/api/payments/confirm', body)))
  .then(async (r) => ({ status: r.status, body: await r.json() }))

console.log('\n① 정상 결제는 주문에 적힌 만큼만 지급한다')
{
  tossOk = true; tossCalls = []
  const db = makeDB({ users: [A], orders: [ORDER] })
  const r = await doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 })
  ok(r.body.ok === true, '승인된다', JSON.stringify(r.body).slice(0, 80))
  ok(db.__state.users[0].credits === 100, '주문에 적힌 100크레딧이 지급된다', String(db.__state.users[0].credits))
  ok(db.__state.orders[0].status === 'paid', '주문이 결제 완료로 바뀐다', db.__state.orders[0].status)
  ok(tossCalls.length === 1 && tossCalls[0].amount === 6500, '제공사에 실제 금액으로 승인 요청한다', JSON.stringify(tossCalls))
}

console.log('\n② 남의 주문은 승인할 수 없다')
{
  /* 주문 id 만 알면 남이 결제한 건을 내 계정으로 승인해 크레딧만 받아 갈 수 있다. */
  tossOk = true; tossCalls = []
  const db = makeDB({ users: [B], orders: [ORDER] })   // 로그인은 B, 주문 주인은 A
  const r = await doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 })
  ok(r.status === 403, '403 으로 막는다', String(r.status))
  ok(db.__state.users[0].credits === 0, '크레딧이 지급되지 않는다', String(db.__state.users[0].credits))
  ok(db.__state.orders[0].status === 'pending', '주문 상태도 그대로다', db.__state.orders[0].status)
  ok(tossCalls.length === 0, '제공사에 승인 요청도 하지 않는다', String(tossCalls.length))
}

console.log('\n③ 결제 금액이 주문과 다르면 거절한다')
{
  //  클라이언트가 amount 를 마음대로 보낸다 — 1원 내고 10만 크레딧을 받으면 안 된다
  tossOk = true; tossCalls = []
  const db = makeDB({ users: [A], orders: [ORDER] })
  const r = await doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 1 })
  ok(r.status === 400, '400 으로 막는다', String(r.status))
  ok(db.__state.users[0].credits === 0, '크레딧이 지급되지 않는다', String(db.__state.users[0].credits))
  ok(tossCalls.length === 0, '제공사에 승인 요청도 하지 않는다', String(tossCalls.length))
}

console.log('\n④ 제공사 승인이 실패하면 지급하지 않는다')
{
  tossOk = false; tossCalls = []
  const db = makeDB({ users: [A], orders: [ORDER] })
  const r = await doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 })
  ok(r.body.ok === false, '실패로 답한다', JSON.stringify(r.body).slice(0, 80))
  ok(db.__state.users[0].credits === 0, '크레딧이 지급되지 않는다', String(db.__state.users[0].credits))
  ok(db.__state.orders[0].status === 'failed', '주문이 실패로 기록된다', db.__state.orders[0].status)
  ok(db.__state.tx.length === 0, '거래 내역도 남지 않는다', String(db.__state.tx.length))
}

console.log('\n⑤ 같은 주문을 두 번 승인해도 한 번만 지급한다')
{
  tossOk = true; tossCalls = []
  const db = makeDB({ users: [A], orders: [ORDER] })
  await doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 })
  const second = await doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 })
  ok(second.status === 409, '두 번째는 409 다', String(second.status))
  ok(db.__state.users[0].credits === 100, '크레딧은 100 그대로다(두 배가 되면 안 된다)', String(db.__state.users[0].credits))
}

console.log('\n⑥ 동시에 두 번 들어와도 한 번만 지급한다')
{
  /* 더블클릭·새로고침·자동 재시도로 겹쳐 들어오면 둘 다 "아직 pending" 을 읽고 통과한다.
     지급 선점(조건부 UPDATE)이 없으면 그대로 두 배가 지급된다. */
  tossOk = true; tossCalls = []
  const db = makeDB({ users: [A], orders: [ORDER] })
  const both = await Promise.all([
    doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 }),
    doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 }),
  ])
  const okCount = both.filter((r) => r.body.ok === true).length
  ok(okCount === 1, '한쪽만 성공한다', JSON.stringify(both.map((r) => r.body.ok)))
  ok(db.__state.users[0].credits === 100, '크레딧이 정확히 100 이다(두 배 지급이면 200)', String(db.__state.users[0].credits))
  ok(db.__state.tx.filter((t) => /충전/.test(String(t.memo))).length === 1, '충전 거래 내역도 하나뿐이다',
     String(db.__state.tx.filter((t) => /충전/.test(String(t.memo))).length))
}

console.log('\n⑦ 승인 실패 응답이 이미 지급된 주문을 실패로 덮지 않는다')
{
  //  뒤늦게 도착한 재시도가 토스에서 거절당해도, 이미 결제·지급된 주문을 '실패'로 바꾸면
  //  매출 집계에서 사라진다.
  tossOk = true; tossCalls = []
  const db = makeDB({ users: [A], orders: [ORDER] })
  await doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 })
  tossOk = false
  const late = await doConfirm(db, { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 })
  ok(late.body.ok === false, '뒤늦은 재시도는 실패로 답한다')
  ok(db.__state.orders[0].status === 'paid', '주문은 결제 완료로 남는다', db.__state.orders[0].status)
  ok(db.__state.users[0].credits === 100, '크레딧도 그대로다', String(db.__state.users[0].credits))
}

console.log('\n⑧ 주문 생성은 크레딧 단가로 금액을 정한다')
{
  const db = makeDB({ users: [A], orders: [] })
  const res = await prepare.onRequestPost(ctx(db, req('https://bygency.com/api/payments/prepare', { credits: 100 })))
  const body = await res.json()
  ok(body.ok === true, '주문이 만들어진다', JSON.stringify(body).slice(0, 80))
  ok(body.amount === 6500, '100크레딧 × 65원 = 6,500원이다', String(body.amount))
  const saved = db.__state.orders[0]
  ok(saved.amount === 6500 && Number(saved.credits) === 100, '저장된 주문도 같은 값이다', JSON.stringify(saved))
  ok(saved.status === 'pending', '아직 결제 전 상태다', saved.status)

  //  회원별 단가가 다르면 그 단가로 계산돼야 한다
  const db2 = makeDB({ users: [{ ...A, credit_price: 50 }], orders: [] })
  const b2 = await (await prepare.onRequestPost(ctx(db2, req('https://bygency.com/api/payments/prepare', { credits: 100 })))).json()
  ok(b2.amount === 5000, '회원 단가 50원이면 5,000원이다', String(b2.amount))
}

console.log('\n⑨ 말이 안 되는 충전 수량은 주문을 만들지 않는다')
{
  for (const c of [0, -100, 1000000, 'abc']) {
    const db = makeDB({ users: [A], orders: [] })
    const res = await prepare.onRequestPost(ctx(db, req('https://bygency.com/api/payments/prepare', { credits: c })))
    const body = await res.json()
    ok(body.ok !== true, `${JSON.stringify(c)} 는 거절한다`, JSON.stringify(body).slice(0, 60))
    ok(db.__state.orders.length === 0, `${JSON.stringify(c)} — 주문이 남지 않는다`, String(db.__state.orders.length))
  }
}

console.log('\n⑩ 비로그인은 결제에 손댈 수 없다')
{
  tossOk = true; tossCalls = []
  const db = makeDB({ users: [A], orders: [ORDER] })
  const res = await confirm.onRequestPost(ctx(db, req('https://bygency.com/api/payments/confirm',
    { paymentKey: 'pk_1', orderId: 'ord_1', amount: 6500 }, '')))
  ok(res.status === 401, '401 이다', String(res.status))
  ok(db.__state.users[0].credits === 0, '크레딧이 지급되지 않는다')
  ok(tossCalls.length === 0, '제공사 요청도 없다')
}

console.log(failed === 0 ? '\n크레딧 결제 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
