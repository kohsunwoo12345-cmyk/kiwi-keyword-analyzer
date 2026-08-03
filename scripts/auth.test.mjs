/* 인증·세션 회귀 테스트 —  node scripts/auth.test.mjs
 *
 * 돌연변이 점검을 인증 쪽으로 넓혔더니 9건 중 7건이 살아남았다.
 * 정지된 회원의 세션을 살려 둬도, 만료된 세션을 통과시켜도, 비밀번호를 앞 8자만
 * 비교해도, 비밀번호를 바꾼 뒤 남의 기기 세션을 남겨 둬도 — 아무 테스트도 울지 않았다.
 * 진짜 런타임에서 손으로 확인한 적은 있지만, 손으로 한 건 다음 배포를 지켜 주지 않는다.
 *
 * ⚠ 가짜 D1 은 "진짜 SQL 에 적힌 조건" 만 적용한다.
 *    가짜가 제 나름대로 엄격하게 굴면, 제품에서 조건이 빠져도 가짜가 대신 막아 줘서
 *    테스트가 통과해 버린다(환불 잠금에서 실제로 그렇게 당했다).
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console,
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto, fetch, btoa, atob,
    setTimeout, clearTimeout, structuredClone,
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

const utils = await load('functions/api/_utils.ts')
const pwPage = await load('functions/api/account/password.ts')
const forgot = await load('functions/api/account/forgot-password.ts')

const FUTURE = new Date(Date.now() + 86400_000).toISOString()
const PAST = new Date(Date.now() - 60_000).toISOString()

/* 아주 작은 인메모리 D1. sessions·users·password_resets·rate_hits 만 본다.
   조건은 SQL 문자열에 실제로 적혀 있을 때만 적용한다. */
function makeDB({ users = [], sessions = [], resets = [] } = {}) {
  const state = { users: users.map((u) => ({ ...u })), sessions: sessions.map((s) => ({ ...s })), resets: resets.map((r) => ({ ...r })), rate: [], sql: [] }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/^\s*DELETE FROM sessions/i.test(s)) {
      const before = state.sessions.length
      //  진짜 SQL 에 있는 조건만 적용한다
      const byUser = /user_id\s*=\s*\?/.test(s)
      const keepCur = /token\s*!=\s*\?/.test(s)
      const byToken = /WHERE token\s*=\s*\?/.test(s)
      state.sessions = state.sessions.filter((x) => {
        if (byToken) return x.token !== b[0]
        let hit = true
        if (byUser) hit = hit && String(x.user_id) === String(b[0])
        if (keepCur) hit = hit && x.token !== b[1]
        return !hit
      })
      return { meta: { changes: before - state.sessions.length } }
    }
    if (/UPDATE users SET password_hash/i.test(s)) {
      const u = state.users.find((x) => String(x.id) === String(b[b.length - 1]))
      if (u) { u.password_hash = b[0]; u.password_set = 1 }
      return { meta: { changes: u ? 1 : 0 } }
    }
    if (/UPDATE password_resets SET attempts/i.test(s)) {
      const capped = /attempts\s*<\s*\?/.test(s)          // 있어야 병렬 무제한이 막힌다
      const r = state.resets.find((x) => x.email === b[0])
      if (!r) return { meta: { changes: 0 } }
      if (capped && !(r.attempts < Number(b[1]))) return { meta: { changes: 0 } }
      r.attempts++
      return { meta: { changes: 1 } }
    }
    if (/DELETE FROM password_resets/i.test(s)) {
      const n = state.resets.length
      state.resets = state.resets.filter((x) => x.email !== b[0])
      return { meta: { changes: n - state.resets.length } }
    }
    if (/INSERT INTO rate_hits/i.test(s)) { state.rate.push({ k: b[0], at: b[1] }); return { meta: { changes: 1 } } }
    return { meta: { changes: 1 } }
  }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM sessions s JOIN users u/i.test(s)) {
      const sess = state.sessions.find((x) => x.token === b[0])
      if (!sess) return null
      //  ⚠ 조건이 SQL 에 적혀 있을 때만 본다 — 빠지면 여기서도 통과해야 잡힌다
      if (/expires_at\s*>\s*\?/.test(s) && !(sess.expires_at > b[1])) return null
      const u = state.users.find((x) => String(x.id) === String(sess.user_id))
      if (!u) return null
      if (/status\s*!=\s*'suspended'/.test(s) && !(u.status == null || u.status !== 'suspended')) return null
      return { ...u }
    }
    if (/FROM users WHERE email/i.test(s)) return state.users.find((x) => x.email === b[0]) || null
    if (/FROM users WHERE id/i.test(s)) return state.users.find((x) => String(x.id) === String(b[0])) || null
    if (/FROM password_resets WHERE email/i.test(s)) return state.resets.find((x) => x.email === b[0]) || null
    if (/COUNT\(\*\) AS n FROM security_log/i.test(s)) return { n: 0 }
    if (/COUNT\(\*\) AS c FROM rate_hits/i.test(s)) {
      const since = b[1]
      return { c: state.rate.filter((r) => r.k === b[0] && r.at > since).length }
    }
    return null
  }
  const db = {
    __state: state,
    prepare(sql) {
      const s = String(sql)
      const mk = (b) => ({ run: () => run(s, b), first: () => first(s, b), all: async () => ({ results: [] }) })
      return { bind: (...b) => mk(b), ...mk([]) }
    },
    async batch(st) { return (st || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
  return db
}

const req = (url, init = {}) => new Request(url, {
  ...init,
  headers: { host: 'bygency.com', origin: 'https://bygency.com', 'content-type': 'application/json', ...(init.headers || {}) },
})
const ctx = (db, request) => ({ request, env: { DB: db }, params: {}, waitUntil: () => {}, next: async () => new Response('') })

const HASH = await utils.hashPassword('OldPass1234!')

console.log('\n① 세션은 만료·정지 상태를 매번 확인한다')
{
  const base = {
    users: [{ id: 'u1', email: 'a@x.co', name: '회원', role: 'user', status: 'active', password_hash: HASH, password_set: 1 }],
    sessions: [{ token: 'tok', user_id: 'u1', expires_at: FUTURE }],
  }
  const live = makeDB(base)
  ok(!!(await utils.getSessionUser(req('https://bygency.com/x', { headers: { cookie: 'bg_session=tok' } }), live)),
     '정상 세션은 통과한다')

  const expired = makeDB({ ...base, sessions: [{ token: 'tok', user_id: 'u1', expires_at: PAST }] })
  ok((await utils.getSessionUser(req('https://bygency.com/x', { headers: { cookie: 'bg_session=tok' } }), expired)) === null,
     '만료된 세션은 통과하지 못한다')

  /* 관리자가 계정을 정지시켜도 이미 로그인해 둔 세션이 살아 있으면
     그 회원은 계속 크레딧을 쓰고 문자를 보낼 수 있다 — 로그인 화면에서만 막힌다. */
  const susp = makeDB({ ...base, users: [{ ...base.users[0], status: 'suspended' }] })
  ok((await utils.getSessionUser(req('https://bygency.com/x', { headers: { cookie: 'bg_session=tok' } }), susp)) === null,
     '정지된 회원의 세션은 그 자리에서 끊긴다')

  //  status 가 비어 있는 옛 회원까지 로그아웃시키면 안 된다
  const legacy = makeDB({ ...base, users: [{ ...base.users[0], status: null }] })
  ok(!!(await utils.getSessionUser(req('https://bygency.com/x', { headers: { cookie: 'bg_session=tok' } }), legacy)),
     'status 가 없는 옛 회원은 그대로 쓴다')

  ok((await utils.getSessionUser(req('https://bygency.com/x'), live)) === null, '쿠키가 없으면 비로그인이다')
}

console.log('\n② 비밀번호 대조는 전체를 본다')
{
  ok((await utils.verifyPassword('OldPass1234!', HASH)) === true, '맞는 비밀번호는 통과한다')
  ok((await utils.verifyPassword('OldPass1234?', HASH)) === false, '한 글자만 달라도 막힌다')
  /* 해시는 "salt:본문" 이라 앞부분이 salt 다. 앞자리만 비교하면 salt 만 맞으면 뚫린다. */
  const [salt] = HASH.split(':')
  ok((await utils.verifyPassword('zzzzzzzz', salt + ':' + 'A'.repeat(44))) === false,
     'salt 가 같아도 본문이 다르면 막힌다 (앞자리만 비교하면 뚫린다)')
  ok((await utils.verifyPassword('무엇이든', '')) === false, '비밀번호 해시가 비어 있으면 로그인되지 않는다')
  ok((await utils.verifyPassword('무엇이든', null)) === false, '해시가 아예 없어도 로그인되지 않는다')
}

console.log('\n③ 비밀번호를 바꾸면 다른 기기는 끊고 내 브라우저만 남긴다')
{
  /* 비밀번호를 바꾸는 가장 큰 이유는 "누가 내 계정을 쓰는 것 같다" 이다.
     다른 기기 세션이 살아 있으면 바꿔도 그 사람은 계속 들어와 있다. */
  const db = makeDB({
    users: [{ id: 'u1', email: 'a@x.co', name: '회원', role: 'user', status: 'active', password_hash: HASH, password_set: 1, provider: 'email' }],
    sessions: [
      { token: 'mine', user_id: 'u1', expires_at: FUTURE },
      { token: 'other', user_id: 'u1', expires_at: FUTURE },
      { token: 'someone-else', user_id: 'u2', expires_at: FUTURE },
    ],
  })
  const res = await pwPage.onRequestPost(ctx(db, req('https://bygency.com/api/account/password', {
    method: 'POST', headers: { cookie: 'bg_session=mine' },
    body: JSON.stringify({ current: 'OldPass1234!', next: 'NewPass5678!' }),
  })))
  const body = await res.json()
  ok(body.ok === true, '변경이 성공한다', JSON.stringify(body))

  const left = db.__state.sessions.map((s) => s.token)
  ok(left.includes('mine'), '내 브라우저는 로그인 상태로 남는다', JSON.stringify(left))
  ok(!left.includes('other'), '다른 기기 세션은 끊긴다', JSON.stringify(left))
  ok(left.includes('someone-else'), '남의 계정 세션은 건드리지 않는다', JSON.stringify(left))

  const u = db.__state.users[0]
  ok(u.password_hash !== HASH, '비밀번호가 실제로 바뀐다')
  ok((await utils.verifyPassword('NewPass5678!', u.password_hash)) === true, '새 비밀번호로 대조가 통과한다')
  ok((await utils.verifyPassword('OldPass1234!', u.password_hash)) === false, '옛 비밀번호는 더 이상 통하지 않는다')
}

console.log('\n④ 현재 비밀번호가 틀리면 아무것도 바뀌지 않는다')
{
  const db = makeDB({
    users: [{ id: 'u1', email: 'a@x.co', role: 'user', status: 'active', password_hash: HASH, password_set: 1, provider: 'email' }],
    sessions: [{ token: 'mine', user_id: 'u1', expires_at: FUTURE }, { token: 'other', user_id: 'u1', expires_at: FUTURE }],
  })
  const res = await pwPage.onRequestPost(ctx(db, req('https://bygency.com/api/account/password', {
    method: 'POST', headers: { cookie: 'bg_session=mine' },
    body: JSON.stringify({ current: '틀린비밀번호', next: 'NewPass5678!' }),
  })))
  ok((await res.json()).ok === false, '거절한다')
  ok(db.__state.users[0].password_hash === HASH, '비밀번호가 그대로다')
  ok(db.__state.sessions.length === 2, '세션도 그대로다', String(db.__state.sessions.length))
}

console.log('\n⑤ 다른 사이트에서 온 비밀번호 변경 요청은 받지 않는다')
{
  const db = makeDB({
    users: [{ id: 'u1', email: 'a@x.co', role: 'user', status: 'active', password_hash: HASH, password_set: 1, provider: 'email' }],
    sessions: [{ token: 'mine', user_id: 'u1', expires_at: FUTURE }],
  })
  const res = await pwPage.onRequestPost(ctx(db, req('https://bygency.com/api/account/password', {
    method: 'POST', headers: { cookie: 'bg_session=mine', origin: 'https://evil.example.com' },
    body: JSON.stringify({ current: 'OldPass1234!', next: 'NewPass5678!' }),
  })))
  ok(res.status === 403, '403 으로 막는다', String(res.status))
  ok(db.__state.users[0].password_hash === HASH, '비밀번호가 그대로다')
}

console.log('\n⑥ 재설정 인증코드는 병렬로 던져도 정해진 횟수까지만 대조된다')
{
  /* 예전 방식(검사한 뒤 증가)은 동시에 들어온 요청이 전부 attempts=0 을 읽어 통과했다.
     6자리 코드는 그렇게 뚫린다. 증가하면서 검사해야 한다. */
  const CODE_HASH = await utils.hashPassword('123456')
  const db = makeDB({
    users: [{ id: 'u1', email: 'a@x.co', role: 'user', status: 'active', password_hash: HASH, password_set: 1, provider: 'email' }],
    sessions: [{ token: 's1', user_id: 'u1', expires_at: FUTURE }, { token: 's2', user_id: 'u1', expires_at: FUTURE }],
    resets: [{ email: 'a@x.co', code_hash: CODE_HASH, expires_at: FUTURE, attempts: 0 }],
  })
  const tryCode = (code) => forgot.onRequestPost(ctx(db, req('https://bygency.com/api/account/forgot-password', {
    method: 'POST', body: JSON.stringify({ action: 'verify', email: 'a@x.co', code, next: 'Hacked12345!' }),
  }))).then((r) => r.json())

  const burst = await Promise.all(Array.from({ length: 15 }, (_, i) => tryCode('90000' + i)))
  const compared = burst.filter((b) => /올바르지 않습니다/.test(String(b.error))).length
  const blocked = burst.filter((b) => /시도 횟수/.test(String(b.error))).length
  ok(compared <= 5, `실제 대조는 5회 이하다 (${compared}회)`, `대조 ${compared} · 차단 ${blocked}`)
  ok(burst.every((b) => b.ok !== true), '어느 것도 통과하지 못한다')
  ok(db.__state.resets.length === 0, '한도를 넘기면 코드가 파기된다')
  ok(db.__state.users[0].password_hash === HASH, '비밀번호가 바뀌지 않았다')
}

console.log('\n⑦ 재설정이 성공하면 모든 세션을 끊는다')
{
  const CODE_HASH = await utils.hashPassword('123456')
  const db = makeDB({
    users: [{ id: 'u1', email: 'a@x.co', role: 'user', status: 'active', password_hash: HASH, password_set: 1, provider: 'email' }],
    sessions: [
      { token: 's1', user_id: 'u1', expires_at: FUTURE },
      { token: 'stolen', user_id: 'u1', expires_at: FUTURE },
      { token: 'other-user', user_id: 'u2', expires_at: FUTURE },
    ],
    resets: [{ email: 'a@x.co', code_hash: CODE_HASH, expires_at: FUTURE, attempts: 0 }],
  })
  const res = await forgot.onRequestPost(ctx(db, req('https://bygency.com/api/account/forgot-password', {
    method: 'POST', body: JSON.stringify({ action: 'verify', email: 'a@x.co', code: '123456', next: 'ResetPass999!' }),
  })))
  const body = await res.json()
  ok(body.ok === true, '재설정이 성공한다', JSON.stringify(body))

  const left = db.__state.sessions.map((s) => s.token)
  /* 재설정은 "계정을 빼앗겼다" 는 상황이다. 훔쳐 간 세션이 하나라도 살아 있으면
     비밀번호를 바꾼 의미가 없다 — 그래서 이쪽은 내 세션까지 전부 끊는다. */
  ok(!left.includes('stolen'), '훔쳐 간 세션이 끊긴다', JSON.stringify(left))
  ok(!left.includes('s1'), '본인 세션도 함께 끊긴다(전부 다시 로그인)', JSON.stringify(left))
  ok(left.includes('other-user'), '남의 계정 세션은 건드리지 않는다', JSON.stringify(left))

  ok((await utils.verifyPassword('ResetPass999!', db.__state.users[0].password_hash)) === true, '새 비밀번호가 적용된다')
  ok(db.__state.resets.length === 0, '쓴 코드는 파기된다')
}

console.log('\n⑧ 만료된 코드는 통하지 않는다')
{
  const CODE_HASH = await utils.hashPassword('123456')
  const db = makeDB({
    users: [{ id: 'u1', email: 'a@x.co', role: 'user', status: 'active', password_hash: HASH, password_set: 1, provider: 'email' }],
    sessions: [{ token: 's1', user_id: 'u1', expires_at: FUTURE }],
    resets: [{ email: 'a@x.co', code_hash: CODE_HASH, expires_at: PAST, attempts: 0 }],
  })
  const body = await (await forgot.onRequestPost(ctx(db, req('https://bygency.com/api/account/forgot-password', {
    method: 'POST', body: JSON.stringify({ action: 'verify', email: 'a@x.co', code: '123456', next: 'ResetPass999!' }),
  })))).json()
  ok(body.ok !== true, '만료된 코드는 거절한다', JSON.stringify(body))
  ok(db.__state.users[0].password_hash === HASH, '비밀번호가 그대로다')
  ok(db.__state.sessions.length === 1, '세션도 그대로다')
}

console.log(failed === 0 ? '\n인증·세션 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
