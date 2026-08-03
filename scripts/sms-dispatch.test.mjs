/* 문자 발송 회귀 테스트 —  node scripts/sms-dispatch.test.mjs
 *
 * 문자는 건당 유료다. 여기가 틀리면 요금이 그대로 새거나, 나갔다고 표시된 문자가
 * 실제로는 안 나간다. 그런데 돌연변이 점검에서 이 자리를 여섯 가지로 망가뜨려도
 * (묶음 상한 초과·쓰레기 번호 통과·짧은 문자를 LMS 로·긴 문자를 SMS 로·
 *  제공사 실패를 성공으로 집계·발신번호 없이 발송) 아무 테스트도 울지 않았다.
 *
 * 그래서 제공사(알리고) 대신 가짜 응답을 두고 진짜 발송 함수를 돌린다.
 * 무엇을, 몇 건씩, 어떤 종류로 보냈는지 실제 요청 본문에서 확인한다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

let calls = []
let responder = () => ({ result_code: 1, success_cnt: undefined, error_cnt: 0, message: 'ok' })

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const fakeFetch = async (url, init) => {
    const body = String(init?.body || '')
    const params = Object.fromEntries(new URLSearchParams(body))
    calls.push({ url: String(url), params })
    const data = responder(params, String(url))
    return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } })
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

const aligo = await load('functions/api/_aligo.ts')
const ENV = { ALIGO_API_KEY: 'k', ALIGO_USER_ID: 'u', ALIGO_SENDER: '021234567' }

const reset = (r) => { calls = []; if (r) responder = r; else responder = () => ({ result_code: 1, error_cnt: 0 }) }
const massCalls = () => calls.filter((c) => /send_mass/.test(c.url))
//  한 번의 묶음 요청에 실제로 몇 건이 실렸는지 — rec_N 개수를 센다
const recCount = (c) => Object.keys(c.params).filter((k) => /^rec_\d+$/.test(k)).length

const SHORT = '안녕하세요. 신청이 접수되었습니다.'                       // 90byte 이하
const LONG = '안'.repeat(80)                                              // 240byte — LMS 여야 한다

console.log('\n① 묶음 발송은 제공사 상한(500건)을 넘기지 않는다')
{
  /* 알리고 send_mass 는 한 번에 500건까지다. 넘겨 보내면 그 요청이 통째로 거절되는데,
     보낸 쪽에서는 "보냈다" 로 끝나 수천 명이 조용히 못 받는다. */
  reset()
  const items = Array.from({ length: 1200 }, (_, i) => ({ to: '0101234' + String(i).padStart(4, '0'), message: SHORT }))
  const r = await aligo.sendSmsMass(ENV, items, {})
  const mc = massCalls()
  ok(mc.length === 3, '1200건은 세 번으로 나눠 나간다', `${mc.length}회`)
  ok(mc.every((c) => recCount(c) <= 500), '어느 요청도 500건을 넘지 않는다', JSON.stringify(mc.map(recCount)))
  ok(mc.reduce((a, c) => a + recCount(c), 0) === 1200, '전부 합치면 1200건이다', String(mc.reduce((a, c) => a + recCount(c), 0)))
  ok(mc.every((c) => Number(c.params.cnt) === recCount(c)), 'cnt 가 실제 실린 건수와 같다',
     JSON.stringify(mc.map((c) => [c.params.cnt, recCount(c)])))
  ok(r.successCnt === 1200 && r.errorCnt === 0, '성공 집계가 1200건이다', `성공 ${r.successCnt} · 실패 ${r.errorCnt}`)
}

console.log('\n② 보낼 수 없는 번호는 요금이 나가기 전에 걸러진다')
{
  reset()
  const items = [
    { to: '01012345678', message: SHORT },   // 정상
    { to: '123', message: SHORT },           // 너무 짧다
    { to: '', message: SHORT },              // 없다
    { to: '01011112222', message: '   ' },   // 내용이 없다
    { to: '010-3333-4444', message: SHORT }, // 하이픈은 정리돼서 정상
  ]
  const r = await aligo.sendSmsMass(ENV, items, {})
  const mc = massCalls()
  ok(mc.length === 1, '한 번만 나간다', `${mc.length}회`)
  ok(recCount(mc[0]) === 2, '보낼 수 있는 2건만 실린다 (5건 다 실으면 쓰레기에 요금이 나간다)', String(recCount(mc[0])))
  ok(mc[0].params.rec_1 === '01012345678' && mc[0].params.rec_2 === '01033334444',
     '하이픈은 정리되고 못 쓰는 번호는 빠진다', JSON.stringify([mc[0].params.rec_1, mc[0].params.rec_2]))
  ok(r.successCnt === 2, '성공 집계도 2건이다', String(r.successCnt))

  //  전부 못 쓰는 번호면 아예 나가지 않아야 한다
  reset()
  const none = await aligo.sendSmsMass(ENV, [{ to: '1', message: SHORT }], {})
  ok(massCalls().length === 0, '보낼 게 없으면 요청 자체를 하지 않는다', `${massCalls().length}회`)
  ok(none.sent === false, '보냈다고 답하지 않는다')
}

console.log('\n③ 문자 종류가 길이에 맞게 정해진다 (LMS 는 요금이 더 비싸다)')
{
  reset()
  await aligo.sendSmsMass(ENV, [{ to: '01012345678', message: SHORT }], {})
  ok(massCalls()[0].params.msg_type === 'SMS', '짧은 문구는 SMS 로 나간다', massCalls()[0].params.msg_type)

  reset()
  await aligo.sendSmsMass(ENV, [{ to: '01012345678', message: LONG }], {})
  ok(massCalls()[0].params.msg_type === 'LMS', '90byte 를 넘으면 LMS 로 나간다(안 그러면 잘린다)', massCalls()[0].params.msg_type)

  //  섞여 있으면 가장 긴 것을 기준으로 — 잘려 나가는 것보다 낫다
  reset()
  await aligo.sendSmsMass(ENV, [{ to: '01012345678', message: SHORT }, { to: '01011112222', message: LONG }], {})
  ok(massCalls()[0].params.msg_type === 'LMS', '섞이면 긴 쪽에 맞춘다', massCalls()[0].params.msg_type)
}

console.log('\n④ 제공사가 실패로 답하면 성공으로 세지 않는다')
{
  //  나가지도 않은 문자를 "발송 완료" 로 보여 주면 회원이 응답을 기다리다 놓친다
  reset(() => ({ result_code: -101, message: '잔액 부족' }))
  const r = await aligo.sendSmsMass(ENV, [
    { to: '01012345678', message: SHORT }, { to: '01011112222', message: SHORT },
  ], {})
  ok(r.sent === false, '보냈다고 답하지 않는다', JSON.stringify(r))
  ok(r.successCnt === 0, '성공 0건이다', String(r.successCnt))
  ok(r.errorCnt === 2, '실패 2건으로 센다', String(r.errorCnt))
  ok(/잔액/.test(String(r.reason)), '제공사가 준 사유를 그대로 전한다', String(r.reason))

  //  일부만 실패한 경우도 그대로 반영돼야 한다
  reset(() => ({ result_code: 1, success_cnt: 1, error_cnt: 1, message: '일부 실패' }))
  const p = await aligo.sendSmsMass(ENV, [
    { to: '01012345678', message: SHORT }, { to: '01011112222', message: SHORT },
  ], {})
  ok(p.successCnt === 1 && p.errorCnt === 1, '일부 실패가 그대로 집계된다', `성공 ${p.successCnt} · 실패 ${p.errorCnt}`)
}

console.log('\n⑤ 계정·발신번호가 없으면 발송을 시도조차 하지 않는다')
{
  reset()
  const noSender = await aligo.sendSmsMass({ ALIGO_API_KEY: 'k', ALIGO_USER_ID: 'u' },
    [{ to: '01012345678', message: SHORT }], {})
  ok(massCalls().length === 0, '발신번호가 없으면 요청하지 않는다', `${massCalls().length}회`)
  ok(noSender.sent === false && /발신번호/.test(String(noSender.reason)), '이유를 발신번호라고 알려 준다', String(noSender.reason))

  reset()
  const noKey = await aligo.sendSmsMass({ ALIGO_SENDER: '021234567' }, [{ to: '01012345678', message: SHORT }], {})
  ok(massCalls().length === 0, '계정이 없으면 요청하지 않는다', `${massCalls().length}회`)
  ok(noKey.sent === false, '보냈다고 답하지 않는다')
}

console.log('\n⑥ 예약 발송은 예약으로 나간다')
{
  reset()
  const r = await aligo.sendSmsMass(ENV, [{ to: '01012345678', message: SHORT }], { rdate: '20260810', rtime: '0930' })
  const p = massCalls()[0].params
  ok(p.rdate === '20260810' && p.rtime === '0930', '예약 시각이 그대로 전달된다', JSON.stringify([p.rdate, p.rtime]))
  ok(r.reserved === true, '예약으로 표시된다')

  reset()
  const now = await aligo.sendSmsMass(ENV, [{ to: '01012345678', message: SHORT }], {})
  ok(massCalls()[0].params.rdate === undefined, '즉시 발송에는 예약 값이 붙지 않는다')
  ok(now.reserved === false, '예약이 아니라고 표시된다')
}

console.log('\n⑦ 단건 발송도 같은 기준을 따른다')
{
  reset()
  const r = await aligo.sendSms(ENV, '010-1234-5678', SHORT, {})
  const c = calls.find((x) => /\/send\//.test(x.url))
  ok(!!c, '단건 발송이 나간다')
  ok(c.params.receiver === '01012345678', '번호가 정리돼 나간다', c.params.receiver)
  ok(c.params.msg_type === 'SMS', '짧은 문구는 SMS 다', c.params.msg_type)
  ok(r.sent === true, '보냈다고 답한다')

  reset()
  await aligo.sendSms(ENV, '01012345678', LONG, {})
  ok(calls.find((x) => /\/send\//.test(x.url)).params.msg_type === 'LMS', '긴 문구는 LMS 다')

  reset(() => ({ result_code: -101, message: '잔액 부족' }))
  const bad = await aligo.sendSms(ENV, '01012345678', SHORT, {})
  ok(bad.sent === false, '제공사가 실패로 답하면 보냈다고 하지 않는다', JSON.stringify(bad))
}

console.log(failed === 0 ? '\n문자 발송 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
