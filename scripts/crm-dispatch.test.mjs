/* CRM 집행 발송 회귀 테스트 —  node scripts/crm-dispatch.test.mjs
 *
 * 회원이 포인트로 문자를 사서 보내는 자리다. 순서가 틀리면 돈이 샌다.
 *  1) 'sending' 으로 조건부 선점 — 수동 발송과 예약 크론이 겹쳐도 두 번 나가지 않는다
 *  2) 포인트 선차감 (부족하면 되돌리고 중단)
 *  3) 발송 → 실패분 환불
 *
 * 돌연변이 점검에서 다섯 가지로 망가뜨려 보니 전부 살아남았다 —
 * 실패분을 환불하지 않아도, 포인트를 안 빼고 보내도, 이미 발송 중인 집행을
 * 또 보내도, 발신번호 없이 보내도, 실패를 성공으로 집계해도 아무 테스트도 없었다.
 *
 * ⚠ 가짜 D1 은 "진짜 SQL 에 적힌 조건" 만 적용한다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

let smsResult = { sent: true, successCnt: 0, errorCnt: 0 }
let smsCalls = []

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const fakeFetch = async (url, init) => {
    const u = String(url)
    if (/aligo/.test(u)) {
      const params = Object.fromEntries(new URLSearchParams(String(init?.body || '')))
      const n = Object.keys(params).filter((k) => /^rec_\d+$/.test(k)).length || Number(params.cnt) || 1
      smsCalls.push({ url: u, count: n, params })
      const ok = smsResult.successCnt === -1 ? n : smsResult.successCnt   // -1 = 전건 성공
      return new Response(JSON.stringify({ result_code: smsResult.sent ? 1 : -101, success_cnt: ok, error_cnt: n - ok, message: 'x' }), { status: 200 })
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

const crm = await load('functions/api/crm/_dispatch.ts')

const CAMP = {
  id: 'e1', user_id: 'u1', name: '8월 재구매 안내', status: 'draft', channel: 'sms',
  message: '안녕하세요 {이름}님, 이번 달 혜택 안내드립니다.', group_id: 'g1',
  sender_phone: '021234567', scheduled_at: null, landing_slug: '',
}

function makeDB({ campaign = CAMP, members = [], points = 1_000_000, senderApproved = true } = {}) {
  const state = { camp: { ...campaign }, points, spends: [], refunds: [], sends: [], sql: [] }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM crm_executions WHERE id/i.test(s)) return { ...state.camp }
    if (/FROM sender_numbers WHERE user_id/i.test(s)) return senderApproved ? { phone: '021234567' } : null
    if (/AS bal FROM users WHERE id/i.test(s)) return { bal: state.points }
    if (/SELECT points FROM users WHERE id/i.test(s)) return { points: state.points }
    if (/FROM users WHERE id/i.test(s)) return { id: 'u1', points: state.points, credits: 0 }
    if (/FROM settings WHERE key/i.test(s)) return null
    return null
  }
  const all = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM contact_group_members m/i.test(s)) return { results: members }
    return { results: [] }
  }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/UPDATE crm_executions SET status = 'sending'/i.test(s)) {
      //  ⚠ 조건은 진짜 SQL 에 있을 때만 본다
      const guarded = /status NOT IN \('sent','sending','canceled'\)/.test(s)
      if (guarded && ['sent', 'sending', 'canceled'].includes(state.camp.status)) return { meta: { changes: 0 } }
      state.camp.status = 'sending'
      return { meta: { changes: 1 } }
    }
    if (/UPDATE crm_executions SET status = \?/i.test(s)) { state.camp.status = b[0]; return { meta: { changes: 1 } } }
    /* 차감은 `points = points - ? WHERE ... AND points >= ?`, 환불은 `points = points + ?`.
       ⚠ 잔액 조건도 진짜 SQL 에 있을 때만 적용한다 — 가짜가 대신 막으면
          제품에서 조건이 빠져도 테스트가 통과한다. */
    if (/UPDATE users SET points\s*=\s*points\s*-/i.test(s)) {
      const amt = Number(b[0])
      const guarded = /points\s*>=\s*\?/.test(s)
      if (guarded && !(state.points >= Number(b[2]))) return { meta: { changes: 0 } }
      state.points = Math.round((state.points - amt) * 100) / 100
      state.spends.push(amt)
      return { meta: { changes: 1 } }
    }
    if (/UPDATE users SET points\s*=\s*points\s*\+/i.test(s)) {
      const amt = Number(b[0])
      state.points = Math.round((state.points + amt) * 100) / 100
      state.refunds.push(amt)
      return { meta: { changes: 1 } }
    }
    if (/INSERT INTO crm_execution_sends/i.test(s)) { state.sends.push({ phone: b[4], ok: b[5] }); return { meta: { changes: 1 } } }
    return { meta: { changes: 1 } }
  }
  const db = {
    __state: state,
    prepare(sql) {
      const s = String(sql)
      const mk = (b) => ({ first: () => first(s, b), run: () => run(s, b), all: () => all(s, b) })
      return { bind: (...b) => mk(b), ...mk([]) }
    },
    async batch(st) { for (const x of st || []) await x.run?.(); return (st || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
  return db
}

const MEMBERS = (n) => Array.from({ length: n }, (_, i) => ({ name: '회원' + i, phone: '0101234' + String(i).padStart(4, '0') }))
const ENV = { ALIGO_API_KEY: 'k', ALIGO_USER_ID: 'u', ALIGO_SENDER: '021234567' }
const reset = (r) => { smsCalls = []; smsResult = r || { sent: true, successCnt: -1, errorCnt: 0 } }

console.log('\n① 정상 집행 — 포인트를 빼고 한 번에 묶어 보낸다')
{
  reset()
  const db = makeDB({ members: MEMBERS(10) })
  const r = await crm.dispatchCampaign(db, ENV, 'e1')
  ok(r.ok === true, '발송에 성공한다', JSON.stringify(r).slice(0, 100))
  ok(r.recipients === 10 && r.sent === 10 && r.failed === 0, '10명 전원 발송으로 집계된다',
     `${r.recipients}·${r.sent}·${r.failed}`)
  ok(smsCalls.length === 1, '수신자가 몇 명이든 한 번으로 묶어 보낸다', `${smsCalls.length}회`)
  ok(smsCalls[0].count === 10, '한 요청에 10명이 실린다', String(smsCalls[0].count))
  ok(db.__state.spends.length === 1, '포인트를 한 번 차감한다', JSON.stringify(db.__state.spends))
  ok(db.__state.refunds.length === 0, '전건 성공이면 환불이 없다', JSON.stringify(db.__state.refunds))
  ok(db.__state.camp.status === 'sent', '집행이 발송 완료로 바뀐다', db.__state.camp.status)
}

console.log('\n② 실패한 건만큼 포인트를 돌려준다')
{
  //  안 돌려주면 나가지도 않은 문자값을 회원이 낸 채로 끝난다
  reset({ sent: true, successCnt: 6, errorCnt: 4 })
  const db = makeDB({ members: MEMBERS(10) })
  const r = await crm.dispatchCampaign(db, ENV, 'e1')
  ok(r.sent === 6 && r.failed === 4, '성공 6·실패 4로 집계된다', `${r.sent}·${r.failed}`)
  ok(db.__state.refunds.length === 1, '환불이 한 번 나간다', JSON.stringify(db.__state.refunds))
  const spent = db.__state.spends[0], refunded = db.__state.refunds[0]
  ok(Math.abs(refunded - spent * 0.4) < 0.011, '실패한 4건만큼만 돌려준다', `차감 ${spent} · 환불 ${refunded}`)
  ok(Math.abs(r.pointsUsed - (spent - refunded)) < 0.011, '실제 사용 포인트가 그 차액과 같다',
     `${r.pointsUsed} vs ${spent - refunded}`)
}

console.log('\n③ 전건 실패면 전액 돌려주고 실패로 남긴다')
{
  reset({ sent: false, successCnt: 0, errorCnt: 10 })
  const db = makeDB({ members: MEMBERS(10) })
  const r = await crm.dispatchCampaign(db, ENV, 'e1')
  ok(r.ok === false, '실패로 답한다', JSON.stringify(r).slice(0, 80))
  const net = db.__state.spends.reduce((a, b) => a + b, 0) - db.__state.refunds.reduce((a, b) => a + b, 0)
  ok(Math.abs(net) < 0.011, '차감과 환불이 정확히 상쇄된다', `순차감 ${net}`)
  ok(db.__state.points === 1_000_000, '잔액이 제자리로 돌아온다', String(db.__state.points))
  ok(db.__state.camp.status === 'failed', '집행이 실패로 남는다', db.__state.camp.status)
}

console.log('\n④ 포인트가 모자라면 발송하지 않는다')
{
  reset()
  const db = makeDB({ members: MEMBERS(100), points: 1 })
  const r = await crm.dispatchCampaign(db, ENV, 'e1')
  ok(r.ok === false, '거절한다', JSON.stringify(r).slice(0, 80))
  ok(smsCalls.length === 0, '문자를 한 통도 보내지 않는다', String(smsCalls.length))
  ok(db.__state.points === 1, '잔액이 그대로다', String(db.__state.points))
  ok(db.__state.camp.status === 'draft', '집행이 원래 상태로 되돌아간다(다시 시도할 수 있게)', db.__state.camp.status)
}

console.log('\n⑤ 이미 발송했거나 발송 중이면 다시 보내지 않는다')
{
  /* 수동 발송과 예약 크론이 겹치면 같은 집행이 두 번 나가고 회원 돈이 두 배로 빠진다. */
  for (const st of ['sent', 'sending', 'canceled']) {
    reset()
    const db = makeDB({ campaign: { ...CAMP, status: st }, members: MEMBERS(10) })
    const r = await crm.dispatchCampaign(db, ENV, 'e1')
    ok(r.ok === false, `status=${st} 는 거절한다`, JSON.stringify(r).slice(0, 60))
    ok(smsCalls.length === 0, `status=${st} — 문자를 보내지 않는다`, String(smsCalls.length))
    ok(db.__state.spends.length === 0, `status=${st} — 포인트도 빠지지 않는다`, JSON.stringify(db.__state.spends))
  }
}

console.log('\n⑥ 승인된 발신번호가 없으면 보내지 않고 전액 돌려준다')
{
  reset()
  const db = makeDB({ members: MEMBERS(10), senderApproved: false })
  const r = await crm.dispatchCampaign(db, { ...ENV, ALIGO_SENDER: '' }, 'e1')
  ok(r.ok === false && /발신번호/.test(String(r.error)), '발신번호가 없다고 알려 준다', String(r.error))
  ok(smsCalls.length === 0, '문자를 보내지 않는다', String(smsCalls.length))
  const net = db.__state.spends.reduce((a, b) => a + b, 0) - db.__state.refunds.reduce((a, b) => a + b, 0)
  ok(Math.abs(net) < 0.011, '먼저 뺀 포인트를 전액 돌려준다', `순차감 ${net}`)
}

console.log('\n⑦ 보낼 대상이 없거나 문구가 비면 아무 일도 하지 않는다')
{
  reset()
  const none = makeDB({ members: [] })
  const r1 = await crm.dispatchCampaign(none, ENV, 'e1')
  ok(r1.ok === false && /대상/.test(String(r1.error)), '대상이 없으면 거절한다', String(r1.error))
  ok(none.__state.spends.length === 0, '포인트가 빠지지 않는다')

  const empty = makeDB({ campaign: { ...CAMP, message: '   ' }, members: MEMBERS(5) })
  const r2 = await crm.dispatchCampaign(empty, ENV, 'e1')
  ok(r2.ok === false && /문구/.test(String(r2.error)), '문구가 비면 거절한다', String(r2.error))
  ok(empty.__state.spends.length === 0, '포인트가 빠지지 않는다')
}

console.log('\n⑧ 같은 번호가 여러 번 들어 있어도 한 번만 보낸다')
{
  //  중복만큼 요금이 그대로 더 나간다
  reset()
  const dup = [
    { name: 'A', phone: '01011112222' },
    { name: 'A(다시)', phone: '010-1111-2222' },
    { name: 'B', phone: '01033334444' },
    { name: '짧은번호', phone: '123' },
  ]
  const db = makeDB({ members: dup })
  const r = await crm.dispatchCampaign(db, ENV, 'e1')
  ok(r.recipients === 2, '중복·잘못된 번호를 뺀 2명이 대상이다', String(r.recipients))
  ok(smsCalls[0].count === 2, '실제로 2건만 나간다', String(smsCalls[0].count))
}

console.log('\n⑨ 문구의 {이름}이 사람마다 치환된다')
{
  reset()
  const db = makeDB({ members: [{ name: '홍길동', phone: '01011112222' }, { name: '', phone: '01033334444' }] })
  await crm.dispatchCampaign(db, ENV, 'e1')
  const p = smsCalls[0].params
  ok(/홍길동/.test(String(p.msg_1)), '이름이 들어간다', String(p.msg_1).slice(0, 30))
  ok(/고객/.test(String(p.msg_2)), '이름이 없으면 "고객" 으로 채운다', String(p.msg_2).slice(0, 30))
  ok(!/\{이름\}/.test(String(p.msg_1) + String(p.msg_2)), '치환되지 않은 자리표시자가 남지 않는다')
}

console.log(failed === 0 ? '\nCRM 집행 발송 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
