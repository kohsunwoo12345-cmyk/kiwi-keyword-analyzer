/* API 키 인증·자격·한도 회귀 테스트 —  node scripts/apikey.test.mjs
 *
 * 외부에서 API 키로 부르는 경로다. 여기가 뚫리면 남의 크레딧으로 생성이 돌고,
 * 한도가 없으면 한 회원이 제공사 요금을 무제한으로 태울 수 있다.
 *
 * 돌연변이 점검에서 일곱 가지로 망가뜨려 보니 전부 살아남았다 —
 * 정지된 키를 통과시켜도, 정지된 회원의 키를 통과시켜도, 접두사 검사를 빼도,
 * 플랜 없이 쓰게 해도, 만료된 플랜을 유효로 봐도, 분당 한도와 동시 진행 제한을
 * 없애도 아무 테스트가 울지 않았다.
 *
 * ⚠ 가짜 D1 은 "진짜 SQL 에 적힌 조건" 만 적용한다.
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

const ak = await load('functions/api/_apikeys.ts')

const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString()
const PAST = new Date(Date.now() - 86400_000).toISOString()

/* api_keys / users / api_rate / api_calls 만 흉내 낸다.
   rate 는 "지금까지 이만큼 쌓였다" 를 바깥에서 정해 준다. */
function makeDB({ keys = [], users = [], rate = {}, pending = 0 } = {}) {
  const state = { keys: keys.map((k) => ({ ...k })), users: users.map((u) => ({ ...u })), inserted: [], sql: [] }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM api_keys WHERE key_hash/i.test(s)) {
      const k = state.keys.find((x) => x.key_hash === b[0])
      return k ? { id: k.id, user_id: k.user_id, status: k.status } : null
    }
    if (/FROM users WHERE id = \?/i.test(s)) {
      const u = state.users.find((x) => String(x.id) === String(b[0]))
      if (!u) return null
      //  ⚠ 정지 조건은 진짜 SQL 에 있을 때만 적용한다
      if (/status\s*!=\s*'suspended'/.test(s) && !(u.status == null || u.status !== 'suspended')) return null
      return { ...u }
    }
    if (/FROM api_rate WHERE user_id/i.test(s)) {
      return { b: rate.burst || 0, m: rate.min || 0, h: rate.hour || 0, d: rate.day || 0 }
    }
    if (/FROM api_calls WHERE user_id=\? AND status='pending'/i.test(s)) return { n: pending }
    return null
  }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/INSERT INTO api_rate/i.test(s)) state.inserted.push('rate')
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

const PLAIN = ak.generateApiKeyPlain()
const HASH = await ak.hashApiKey(PLAIN)
const USER = { id: 'u1', email: 'a@x.co', status: 'active', role: 'user', video_plan: 'Pro', video_plan_until: FUTURE }

const lookup = (db, header) => ak.getUserByApiKey(db, header)

console.log('\n① 키가 유효할 때만 회원을 찾아 준다')
{
  const base = { keys: [{ id: 'k1', key_hash: HASH, user_id: 'u1', status: 'active' }], users: [USER] }
  ok(!!(await lookup(makeDB(base), 'Bearer ' + PLAIN)), '정상 키는 통과한다')
  ok(!!(await lookup(makeDB(base), PLAIN)), 'Bearer 없이 보내도 통과한다')

  const revoked = { ...base, keys: [{ id: 'k1', key_hash: HASH, user_id: 'u1', status: 'revoked' }] }
  ok((await lookup(makeDB(revoked), 'Bearer ' + PLAIN)) === null, '해지된 키는 통과하지 못한다')

  ok((await lookup(makeDB(base), 'Bearer bg_live_없는키값입니다')) === null, '없는 키는 통과하지 못한다')
  ok((await lookup(makeDB(base), 'Bearer ' + PLAIN.slice(0, -1) + 'X')) === null, '한 글자만 달라도 통과하지 못한다')
  ok((await lookup(makeDB(base), null)) === null, '헤더가 없으면 통과하지 못한다')
  /* 접두사 검사가 없으면 아무 문자열이나 해시를 계산해 조회한다 —
     쓸데없는 D1 왕복이 늘고, 키 형식이 아닌 값도 인증 후보가 된다. */
  ok((await lookup(makeDB(base), 'Bearer ' + HASH)) === null, '키 형식(bg_live_)이 아니면 조회조차 하지 않는다')
}

console.log('\n② 정지된 회원의 키는 통하지 않는다')
{
  /* 쿠키 세션은 정지를 확인하는데 API 키만 안 보면, 정지당한 회원이 키로 계속 쓴다. */
  const db = makeDB({
    keys: [{ id: 'k1', key_hash: HASH, user_id: 'u1', status: 'active' }],
    users: [{ ...USER, status: 'suspended' }],
  })
  ok((await lookup(db, 'Bearer ' + PLAIN)) === null, '정지된 회원은 키가 있어도 막힌다')

  //  status 가 비어 있는 옛 회원은 그대로 써야 한다
  const legacy = makeDB({
    keys: [{ id: 'k1', key_hash: HASH, user_id: 'u1', status: 'active' }],
    users: [{ ...USER, status: null }],
  })
  ok(!!(await lookup(legacy, 'Bearer ' + PLAIN)), 'status 가 없는 옛 회원은 그대로 쓴다')
}

console.log('\n③ 영상 플랜이 있어야 API 를 쓸 수 있다')
{
  ok(ak.hasVideoApiAccess({ video_plan: 'Pro', video_plan_until: FUTURE }) === true, '유효한 플랜은 통과한다')
  ok(ak.hasVideoApiAccess({ videoPlan: 'Pro', videoPlanUntil: FUTURE }) === true, '매핑된 객체(camelCase)도 통과한다')
  ok(ak.hasVideoApiAccess({ video_plan: 'Pro', video_plan_until: PAST }) === false, '만료된 플랜은 막힌다')
  ok(ak.hasVideoApiAccess({ video_plan: '없음' }) === false, '플랜이 "없음" 이면 막힌다')
  ok(ak.hasVideoApiAccess({}) === false, '플랜 정보가 없으면 막힌다')
  ok(ak.hasVideoApiAccess(null) === false, '회원이 없으면 막힌다')
  ok(ak.hasVideoApiAccess({ role: 'admin' }) === true, '관리자는 통과한다')
  ok(ak.hasVideoApiAccess({ video_plan: 'Pro' }) === true, '만료일이 없으면 무기한으로 본다')
}

console.log('\n④ 생성 요청 한도가 실제로 막는다')
{
  const under = await ak.enforceRateLimit(makeDB({ rate: { min: 1, hour: 1, day: 1 } }), 'u1', 'post')
  ok(under.ok === true, '한도 안이면 통과한다', JSON.stringify(under))

  /* 한도가 없으면 한 회원이 제공사 요금을 무제한으로 태울 수 있다.
     API_RATE 값은 코드에 있으므로 "충분히 큰 수" 로 넘겨 본다. */
  const overMin = await ak.enforceRateLimit(makeDB({ rate: { min: 99999, hour: 0, day: 0 } }), 'u1', 'post')
  ok(overMin.ok === false, '분당 한도를 넘으면 막힌다', JSON.stringify(overMin))
  ok(/분당/.test(String(overMin.reason)), '분당 한도라고 알려 준다', String(overMin.reason))
  ok(Number(overMin.retryAfter) > 0, '언제 다시 시도할지 알려 준다', String(overMin.retryAfter))

  const overHour = await ak.enforceRateLimit(makeDB({ rate: { min: 0, hour: 99999, day: 0 } }), 'u1', 'post')
  ok(overHour.ok === false && /시간당/.test(String(overHour.reason)), '시간당 한도를 넘으면 막힌다', JSON.stringify(overHour))

  const overDay = await ak.enforceRateLimit(makeDB({ rate: { min: 0, hour: 0, day: 99999 } }), 'u1', 'post')
  ok(overDay.ok === false && /일일/.test(String(overDay.reason)), '일일 한도를 넘으면 막힌다', JSON.stringify(overDay))

  //  진행 중인 생성이 너무 많으면 새 생성을 받지 않는다
  const busy = await ak.enforceRateLimit(makeDB({ rate: {}, pending: 9999 }), 'u1', 'post')
  ok(busy.ok === false && /동시/.test(String(busy.reason)), '동시 진행이 많으면 막힌다', JSON.stringify(busy))

  //  상태 조회도 한도가 있다
  const getOver = await ak.enforceRateLimit(makeDB({ rate: { min: 99999 } }), 'u1', 'get')
  ok(getOver.ok === false && /조회/.test(String(getOver.reason)), '상태 조회 한도도 막는다', JSON.stringify(getOver))

  //  관리자는 면제
  const admin = await ak.enforceRateLimit(makeDB({ rate: { min: 99999, hour: 99999, day: 99999 } }), 'u1', 'post', true)
  ok(admin.ok === true, '관리자는 한도에서 면제된다', JSON.stringify(admin))
}

console.log('\n⑤ 키는 매번 다르고 원문이 남지 않는다')
{
  const a = ak.generateApiKeyPlain()
  const b = ak.generateApiKeyPlain()
  ok(a !== b, '두 번 만들면 다른 키가 나온다')
  ok(a.startsWith('bg_live_'), '정해진 접두사로 시작한다', a.slice(0, 12))
  ok(a.length >= 32, '충분히 길다', String(a.length))

  const h = await ak.hashApiKey(a)
  ok(h !== a && !h.includes(a.slice(8)), '해시에 원문이 들어 있지 않다')
  ok((await ak.hashApiKey(a)) === h, '같은 키는 같은 해시가 된다')
  ok((await ak.hashApiKey(b)) !== h, '다른 키는 다른 해시가 된다')

  const masked = ak.maskApiKey(a)
  ok(masked !== a && masked.length < a.length + 8, '화면 표시용은 가려진다', masked)
  ok(!masked.includes(a.slice(-8, -4)) || masked.includes('*') || masked.includes('…'),
     '가운데가 가려져 그대로 복원되지 않는다', masked)
}

console.log(failed === 0 ? '\nAPI 키 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
