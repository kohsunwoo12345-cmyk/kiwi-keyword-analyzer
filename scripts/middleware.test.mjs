/* 바깥문(미들웨어) 회귀 테스트 —  node scripts/middleware.test.mjs
 *
 * 모든 요청이 여기를 먼저 지난다. 차단 IP·화이트리스트·관리자 콘솔 잠금·
 * 스크래핑 자동 차단이 전부 이 한 파일에 걸려 있는데, 돌연변이 점검에서
 * 여섯 가지로 망가뜨려 보니 전부 살아남았다 — 아무 테스트도 없었다.
 *
 * 특히 크론 우회는 조심스러운 자리다. 크론 경로는 보안 휴리스틱을 건너뛰는데,
 * 토큰 확인이 느슨해지면 그 경로가 통째로 무방비가 된다.
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

const mw = await load('functions/_middleware.ts')

/* settings·blocked_ips·security_log 만 흉내 낸다. 상태는 바깥에서 정해 준다. */
function makeDB({ blocked = [], whitelistMode = false, whitelist = [], adminLock = false, adminAllowIps = [], adminDevices = [], recentSuspicious = 0 } = {}) {
  const state = { logs: [], blockedAdds: [], sql: [] }
  //  진짜 키 이름·값과 정확히 같아야 한다 — 다르면 테스트가 헛돈다
  const setting = (k) => {
    if (k === 'whitelist_mode') return whitelistMode ? 'on' : 'off'
    if (k === 'admin_lock_enabled') return adminLock ? 'on' : 'off'
    return null
  }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM blocked_ips WHERE ip/i.test(s)) return blocked.includes(b[0]) ? { ip: b[0] } : null
    if (/FROM settings WHERE key/i.test(s)) { const v = setting(b[0]); return v == null ? null : { value: v } }
    if (/FROM ip_whitelist WHERE ip/i.test(s)) return whitelist.includes(b[0]) ? { ip: b[0] } : null
    if (/FROM admin_acl WHERE kind='ip'/i.test(s)) return adminAllowIps.includes(b[0]) ? { 1: 1 } : null
    if (/FROM admin_acl WHERE kind='device'/i.test(s)) return adminDevices.includes(b[0]) ? { 1: 1 } : null
    if (/COUNT\(\*\)/i.test(s) && /security_log/i.test(s)) return { n: recentSuspicious, c: recentSuspicious }
    return null
  }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/INSERT INTO security_log/i.test(s)) state.logs.push(b)
    if (/INTO blocked_ips/i.test(s)) state.blockedAdds.push(b[0])
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

const CRON_TOKEN = 'cron-secret-token-1234567890'
let reached = 0

async function go(db, path, { ip = '203.0.113.5', ua = 'Mozilla/5.0 Chrome/126', headers = {}, env = {}, search = '' } = {}) {
  reached = 0
  const request = new Request('https://bygency.com' + path + search, {
    headers: { host: 'bygency.com', 'CF-Connecting-IP': ip, 'User-Agent': ua, ...headers },
  })
  const res = await mw.onRequest({
    request,
    env: { DB: db, CRON_TOKEN, ...env },
    params: {},
    waitUntil: () => {},
    next: async () => { reached++; return new Response('통과', { status: 200 }) },
  })
  return { status: res.status, reached, text: await res.text().catch(() => '') }
}

console.log('\n① 차단된 IP 는 들어오지 못한다')
{
  const db = makeDB({ blocked: ['203.0.113.5'] })
  const r = await go(db, '/api/me')
  ok(r.reached === 0, '앱까지 도달하지 못한다', `도달 ${r.reached}회`)
  ok(r.status === 403, '403 이다', String(r.status))
  ok(db.__state.logs.length > 0, '차단 시도가 보안 기록에 남는다', String(db.__state.logs.length))

  //  다른 IP 는 그대로 통과해야 한다 — 막느라 전체를 죽이면 안 된다
  const okr = await go(makeDB({ blocked: ['203.0.113.5'] }), '/api/me', { ip: '198.51.100.7' })
  ok(okr.reached === 1, '차단되지 않은 IP 는 그대로 통과한다', `도달 ${okr.reached}회`)
}

console.log('\n② 화이트리스트 모드에서는 허용 IP 만 통과한다')
{
  const cfg = { whitelistMode: true, whitelist: ['198.51.100.7'] }
  const blockedR = await go(makeDB(cfg), '/pricing', { ip: '203.0.113.5' })
  ok(blockedR.reached === 0 && blockedR.status === 403, '목록에 없으면 막힌다', `${blockedR.status} · 도달 ${blockedR.reached}`)

  const allowedR = await go(makeDB(cfg), '/pricing', { ip: '198.51.100.7' })
  ok(allowedR.reached === 1, '목록에 있으면 통과한다', `도달 ${allowedR.reached}회`)

  //  모드가 꺼져 있으면 아무나 통과해야 한다
  const offR = await go(makeDB({ whitelistMode: false }), '/pricing', { ip: '203.0.113.5' })
  ok(offR.reached === 1, '모드가 꺼져 있으면 그대로 통과한다', `도달 ${offR.reached}회`)

  /* 로그인·관리자 경로는 화이트리스트 모드에서도 열어 둔다 —
     아니면 모드를 켠 관리자가 밖에서 다시 들어올 방법이 없어진다. */
  for (const p of ['/login', '/api/login', '/api/me', '/api/logout', '/adminsunkoh028741_11263/']) {
    const r = await go(makeDB(cfg), p, { ip: '203.0.113.5' })
    ok(r.reached === 1, `화이트리스트 모드에서도 ${p} 는 열려 있다(스스로 못 들어오는 상황 방지)`, `도달 ${r.reached}회`)
  }
}

console.log('\n③ 관리자 콘솔 잠금은 허용 IP·기기만 통과시킨다')
{
  const cfg = { adminLock: true, adminAllowIps: ['198.51.100.7'], adminDevices: ['adv_devicetoken_1234567890'] }
  const denied = await go(makeDB(cfg), '/adminsunkoh028741_11263/', { ip: '203.0.113.5' })
  ok(denied.reached === 0, '허용되지 않은 곳에서는 관리자 콘솔에 못 들어간다', `도달 ${denied.reached}회`)

  const byIp = await go(makeDB(cfg), '/adminsunkoh028741_11263/', { ip: '198.51.100.7' })
  ok(byIp.reached === 1, '허용 IP 는 통과한다', `도달 ${byIp.reached}회`)

  const byDevice = await go(makeDB(cfg), '/adminsunkoh028741_11263/', {
    ip: '203.0.113.5', headers: { cookie: 'bygency_admdev=adv_devicetoken_1234567890' },
  })
  ok(byDevice.reached === 1, '등록된 기기는 통과한다', `도달 ${byDevice.reached}회`)

  /* 잠긴 상태에서도 잠금 관리 화면·API 는 열려 있어야 한다 —
     아니면 관리자가 스스로 잠긴 문을 열 방법이 없어진다. */
  const mgmt = await go(makeDB(cfg), '/adminsunkoh028741_11263/access', { ip: '203.0.113.5' })
  ok(mgmt.reached === 1, '잠금 관리 화면은 잠긴 상태에서도 열린다(스스로 못 푸는 상황 방지)', `도달 ${mgmt.reached}회`)

  //  일반 회원 화면은 잠금과 무관하다
  const normal = await go(makeDB(cfg), '/api/me', { ip: '203.0.113.5' })
  ok(normal.reached === 1, '관리자 경로가 아니면 잠금과 무관하다', `도달 ${normal.reached}회`)

  //  잠금이 꺼져 있으면 아무 곳에서나 들어간다
  const off = await go(makeDB({ adminLock: false }), '/adminsunkoh028741_11263/', { ip: '203.0.113.5' })
  ok(off.reached === 1, '잠금이 꺼져 있으면 그대로 통과한다', `도달 ${off.reached}회`)
}

console.log('\n④ 크론 우회는 토큰이 정확히 맞을 때만 열린다')
{
  /* 크론 경로는 보안 휴리스틱을 통째로 건너뛴다. 그 문이 느슨하면
     "차단된 IP 도 크론 경로로는 들어온다" 가 되어 버린다. */
  const blockedIp = { blocked: ['203.0.113.5'] }

  const good = await go(makeDB(blockedIp), '/api/cron/video-schedules', { headers: { 'X-Cron-Token': CRON_TOKEN } })
  ok(good.reached === 1, '토큰이 맞으면 통과한다(차단 IP 라도 크론은 돌아야 한다)', `도달 ${good.reached}회`)

  //  길이는 같지만 내용이 다른 토큰 — 상수시간 비교가 빠지면 여기가 뚫린다
  const sameLen = 'X'.repeat(CRON_TOKEN.length)
  const wrong = await go(makeDB(blockedIp), '/api/cron/video-schedules', { headers: { 'X-Cron-Token': sameLen } })
  ok(wrong.reached === 0, '길이만 같고 내용이 다른 토큰은 막힌다', `도달 ${wrong.reached}회`)

  const none = await go(makeDB(blockedIp), '/api/cron/video-schedules')
  ok(none.reached === 0, '토큰이 없으면 막힌다', `도달 ${none.reached}회`)

  const short = await go(makeDB(blockedIp), '/api/cron/video-schedules', { headers: { 'X-Cron-Token': CRON_TOKEN.slice(0, 5) } })
  ok(short.reached === 0, '길이가 다른 토큰도 막힌다', `도달 ${short.reached}회`)

  //  크론 경로가 아니면 토큰이 맞아도 우회되지 않는다
  const elsewhere = await go(makeDB(blockedIp), '/api/me', { headers: { 'X-Cron-Token': CRON_TOKEN } })
  ok(elsewhere.reached === 0, '크론 경로가 아니면 토큰이 있어도 우회되지 않는다', `도달 ${elsewhere.reached}회`)
}

console.log('\n⑤ 반복 스크래핑은 자동으로 차단된다')
{
  /* 의심 요청이 임계를 넘으면 그 IP 를 실제로 차단 목록에 넣는다.
     이게 없으면 스크래퍼가 하루 종일 긁어도 아무 일도 일어나지 않는다. */
  const db = makeDB({ recentSuspicious: 9999 })
  const r = await go(db, '/api/me', { ua: 'curl/8.0' })   // 의심 UA
  ok(db.__state.blockedAdds.length > 0, '임계를 넘으면 차단 목록에 올린다', JSON.stringify(db.__state.blockedAdds))
  ok(r.reached === 0, '그 요청부터 바로 막힌다', `도달 ${r.reached}회`)

  //  임계 아래면 기록만 남기고 통과시킨다 — 정상 이용자를 끊으면 안 된다
  const db2 = makeDB({ recentSuspicious: 0 })
  const r2 = await go(db2, '/api/me', { ua: 'curl/8.0' })
  ok(db2.__state.blockedAdds.length === 0, '임계 아래면 차단하지 않는다', JSON.stringify(db2.__state.blockedAdds))
  ok(r2.reached === 1, '임계 아래면 통과시킨다', `도달 ${r2.reached}회`)
  ok(db2.__state.logs.length > 0, '대신 의심 기록은 남긴다', String(db2.__state.logs.length))

  //  평범한 브라우저는 아무 기록도 남기지 않아야 한다
  const db3 = makeDB({ recentSuspicious: 9999 })
  const r3 = await go(db3, '/api/me', { ua: 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/126 Safari/537.36' })
  ok(r3.reached === 1, '평범한 브라우저는 그대로 통과한다', `도달 ${r3.reached}회`)
  ok(db3.__state.blockedAdds.length === 0, '평범한 브라우저는 차단되지 않는다')
}

console.log('\n⑤-b 프로그램이 부르는 API 는 UA 만으로 끊지 않는다')
{
  /* curl/ 과 python-requests/ 는 "브라우저를 흉내 내지 않는 스크래퍼" 를 잡는 규칙인데,
     공개 API·MCP·OAuth 에서는 정상 이용자가 바로 그 모습으로 온다.
     그대로 두면 10분에 24번만 불러도 그 회사 IP 가 통째로 자동 차단된다 —
     고객은 이유도 모른 채 403 만 받고, 차단 사유는 "스크래핑 의심" 으로 남는다. */
  for (const path of ['/api/v1/generate', '/api/v1/model-file/x.onnx', '/api/mcp/tools', '/api/oauth/token', '/api/instagram/webhook']) {
    for (const ua of ['curl/8.0', 'python-requests/2.31.0']) {
      const db = makeDB({ recentSuspicious: 9999 })
      const r = await go(db, path, { ua })
      ok(r.reached === 1, `${path} — ${ua} 로 불러도 통과한다`, `도달 ${r.reached}회`)
      ok(db.__state.blockedAdds.length === 0, `${path} — ${ua} 때문에 IP 가 차단되지 않는다`, JSON.stringify(db.__state.blockedAdds))
    }
  }

  //  그렇다고 아무거나 열어 주는 건 아니다 — 공격 도구와 의심 경로는 그대로 막는다
  const db2 = makeDB({ recentSuspicious: 9999 })
  const r2 = await go(db2, '/api/v1/generate', { ua: 'sqlmap/1.7' })
  ok(r2.reached === 0, '공격 도구는 공개 API 경로에서도 막힌다', `도달 ${r2.reached}회`)
  const db3 = makeDB({ recentSuspicious: 9999 })
  const r3 = await go(db3, '/api/v1/generate', { ua: 'curl/8.0', search: '?q=union%20select%201' })
  ok(r3.reached === 0, '의심 페이로드는 공개 API 경로에서도 막힌다', `도달 ${r3.reached}회`)

  /* ATTACK_UA_RE 에만 있는 이름들 — 예전에는 경로가 멀쩡하면 이 블록에 들어오지도
     못해서 "즉시 차단" 이 이름만 있었다. */
  for (const ua of ['nuclei/3.1', 'feroxbuster/2.10', 'dirsearch/0.4']) {
    const d = makeDB({ recentSuspicious: 0 })
    const r = await go(d, '/api/me', { ua })
    ok(r.reached === 0, `${ua} 는 첫 요청부터 막힌다`, `도달 ${r.reached}회`)
    ok(d.__state.blockedAdds.length > 0, `${ua} 는 차단 목록에 올라간다`, JSON.stringify(d.__state.blockedAdds))
  }

  //  사람이 쓰는 경로에서는 예전 그대로다
  const db4 = makeDB({ recentSuspicious: 9999 })
  const r4 = await go(db4, '/api/me', { ua: 'curl/8.0' })
  ok(r4.reached === 0, '일반 경로에서는 여전히 막는다', `도달 ${r4.reached}회`)
}

console.log('\n⑥ 정적 자원은 검사 없이 빠르게 지나간다')
{
  //  이미지·스크립트마다 D1 을 두드리면 서브리퀘스트 한도를 갉아먹는다
  const db = makeDB({ blocked: ['203.0.113.5'] })
  const r = await go(db, '/_next/static/chunks/main.js')
  ok(r.reached === 1, '정적 자원은 통과한다', `도달 ${r.reached}회`)
  ok(db.__state.sql.length === 0, '정적 자원에는 D1 질의를 하지 않는다', `${db.__state.sql.length}회 질의`)
}

console.log(failed === 0 ? '\n바깥문(미들웨어) — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
