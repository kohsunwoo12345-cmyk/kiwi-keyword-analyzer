/* 크레딧 전체 회수 회귀 테스트 —  node scripts/admin-recall.test.mjs
 *
 * 이 엔드포인트는 한 번 부르면 전 회원의 크레딧을 0으로 만든다.
 * 되돌릴 방법이 없는 조작인데, 돌연변이 점검에서 확인 문자열·관리자 권한·
 * 관리자 제외 조건·감사 로그를 각각 없애 봐도 아무 테스트도 울지 않았다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}', { status: 200 }), btoa, atob, setTimeout, clearTimeout, structuredClone,
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

const recall = await load('functions/api/admin/credits-recall.ts')
const FUTURE = new Date(Date.now() + 86400_000).toISOString()

const ADMIN = { id: 'adm', email: 'admin@bygency.co', name: '관리자', role: 'admin', status: 'active', credits: 500 }
const U1 = { id: 'u1', email: 'a@x.co', name: '회원1', role: 'user', status: 'active', credits: 100 }
const U2 = { id: 'u2', email: 'b@x.co', name: '회원2', role: 'user', status: 'active', credits: 250.5 }
const U0 = { id: 'u3', email: 'c@x.co', name: '회원3', role: 'user', status: 'active', credits: 0 }

function makeDB(sessionUser) {
  const state = { users: [ADMIN, U1, U2, U0].map((u) => ({ ...u })), audits: [], sql: [] }
  //  진짜 SQL 의 WHERE 를 그대로 해석한다 — 가짜가 제 나름대로 거르면 조건을 지워도 통과한다
  const match = (u, where) => {
    if (/credits > 0/.test(where) && !(Number(u.credits) > 0)) return false
    if (/role\s*!=\s*'admin'/.test(where) && u.role === 'admin') return false
    return true
  }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM sessions s JOIN users u/i.test(s)) return sessionUser ? { ...sessionUser } : null
    const agg = /FROM users WHERE (.+?)(?:$|\s*")/.exec(s.replace(/\s+/g, ' '))
    if (/COUNT\(\*\) c, COALESCE\(SUM\(credits\),0\) s FROM users WHERE/i.test(s)) {
      const where = s.slice(s.indexOf('WHERE') + 5)
      const hit = state.users.filter((u) => match(u, where))
      return { c: hit.length, s: hit.reduce((a, u) => a + Number(u.credits || 0), 0) }
    }
    return null
  }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/UPDATE users SET credits = 0 WHERE/i.test(s)) {
      const where = s.slice(s.indexOf('WHERE') + 5)
      let n = 0
      for (const u of state.users) if (match(u, where)) { u.credits = 0; n++ }
      return { meta: { changes: n } }
    }
    if (/INSERT INTO audit/i.test(s)) state.audits.push(b)
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

const ctx = (db, request) => ({ request, env: { DB: db }, params: {}, waitUntil: () => {}, next: async () => new Response('') })
const post = (db, body, cookie = 'bg_session=t') => recall.onRequestPost(ctx(db, new Request('https://bygency.com/api/admin/credits-recall', {
  method: 'POST',
  headers: { host: 'bygency.com', origin: 'https://bygency.com', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
}))).then(async (r) => ({ status: r.status, body: await r.json() }))

const creditsOf = (db, id) => Number(db.__state.users.find((u) => u.id === id).credits)

console.log('\n① 확인 문자열이 없으면 아무것도 하지 않는다')
{
  /* 되돌릴 수 없는 조작이다. 실수로 한 번 눌러서 전 회원이 0이 되면 복구할 방법이 없다. */
  for (const body of [{}, { confirm: '' }, { confirm: 'recall' }, { confirm: 'RECALL ' }, { includeAdmin: true }]) {
    const db = makeDB(ADMIN)
    const r = await post(db, body)
    ok(r.status === 400, `${JSON.stringify(body)} 는 400 이다`, String(r.status))
    ok(creditsOf(db, 'u1') === 100 && creditsOf(db, 'u2') === 250.5,
       `${JSON.stringify(body)} — 잔액이 그대로다`, `${creditsOf(db, 'u1')}·${creditsOf(db, 'u2')}`)
  }
}

console.log('\n② 관리자가 아니면 부를 수 없다')
{
  const asUser = makeDB(U1)
  const r1 = await post(asUser, { confirm: 'RECALL' })
  ok(r1.status === 403, '일반 회원은 403 이다', String(r1.status))
  ok(creditsOf(asUser, 'u2') === 250.5, '잔액이 그대로다', String(creditsOf(asUser, 'u2')))

  const anon = makeDB(null)
  const r2 = await post(anon, { confirm: 'RECALL' }, '')
  ok(r2.status === 401, '비로그인은 401 이다', String(r2.status))
  ok(creditsOf(anon, 'u2') === 250.5, '잔액이 그대로다', String(creditsOf(anon, 'u2')))
}

console.log('\n③ 기본은 관리자 크레딧을 남긴다')
{
  /* 관리자 크레딧까지 날리면 그 계정으로 하던 점검·복구 생성이 그 자리에서 멈춘다. */
  const db = makeDB(ADMIN)
  const r = await post(db, { confirm: 'RECALL' })
  ok(r.body.ok === true, '회수가 실행된다', JSON.stringify(r.body))
  ok(creditsOf(db, 'u1') === 0 && creditsOf(db, 'u2') === 0, '일반 회원 크레딧은 0이 된다',
     `${creditsOf(db, 'u1')}·${creditsOf(db, 'u2')}`)
  ok(creditsOf(db, 'adm') === 500, '관리자 크레딧은 남는다', String(creditsOf(db, 'adm')))
  ok(r.body.affected === 2, '대상 인원을 정확히 센다(잔액 0인 회원은 빼고)', String(r.body.affected))
  ok(Math.abs(Number(r.body.recalled) - 350.5) < 0.011, '회수 합계를 정확히 알려 준다', String(r.body.recalled))
  ok(r.body.includeAdmin === false, '관리자 제외였다고 알려 준다', String(r.body.includeAdmin))
}

console.log('\n④ 관리자 포함을 고르면 그때만 관리자도 회수된다')
{
  const db = makeDB(ADMIN)
  const r = await post(db, { confirm: 'RECALL', includeAdmin: true })
  ok(creditsOf(db, 'adm') === 0, '관리자 크레딧도 0이 된다', String(creditsOf(db, 'adm')))
  ok(r.body.affected === 3, '관리자까지 세 명이다', String(r.body.affected))
  ok(Math.abs(Number(r.body.recalled) - 850.5) < 0.011, '합계에 관리자 몫이 들어간다', String(r.body.recalled))
}

console.log('\n⑤ 되돌릴 수 없는 조작이므로 기록을 남긴다')
{
  const db = makeDB(ADMIN)
  await post(db, { confirm: 'RECALL' })
  ok(db.__state.audits.length > 0, '감사 기록이 남는다', String(db.__state.audits.length))
  const flat = JSON.stringify(db.__state.audits)
  ok(/credits_recall_all/.test(flat), '무슨 조작이었는지 남는다')
  ok(/350\.5|350/.test(flat), '얼마를 회수했는지 남는다')
  ok(/high/.test(flat), '고위험으로 표시된다')
}

console.log('\n⑥ 미리보기(GET)는 아무것도 바꾸지 않는다')
{
  const db = makeDB(ADMIN)
  const res = await recall.onRequestGet(ctx(db, new Request('https://bygency.com/api/admin/credits-recall', {
    headers: { host: 'bygency.com', cookie: 'bg_session=t' },
  })))
  const body = await res.json()
  ok(body.ok === true, '미리보기가 동작한다', JSON.stringify(body).slice(0, 80))
  ok(creditsOf(db, 'u1') === 100 && creditsOf(db, 'adm') === 500, '잔액이 하나도 바뀌지 않는다',
     `${creditsOf(db, 'u1')}·${creditsOf(db, 'adm')}`)
  ok(body.nonAdmin.users === 2 && Math.abs(body.nonAdmin.credits - 350.5) < 0.011,
     '관리자 제외 기준 숫자를 미리 보여 준다', JSON.stringify(body.nonAdmin))
  ok(body.total.users === 3 && Math.abs(body.total.credits - 850.5) < 0.011,
     '전체 기준 숫자도 보여 준다', JSON.stringify(body.total))

  //  미리보기도 관리자만
  const asUser = makeDB(U1)
  const denied = await recall.onRequestGet(ctx(asUser, new Request('https://bygency.com/api/admin/credits-recall', {
    headers: { host: 'bygency.com', cookie: 'bg_session=t' },
  })))
  ok(denied.status === 403, '일반 회원은 미리보기도 403 이다', String(denied.status))
}

console.log(failed === 0 ? '\n크레딧 전체 회수 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
