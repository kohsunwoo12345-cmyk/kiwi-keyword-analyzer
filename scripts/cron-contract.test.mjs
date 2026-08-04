/* 크론 워커 ↔ 엔드포인트 계약 검증 —  node scripts/cron-contract.test.mjs
 *
 * 정기 실행은 두 조각이 따로 배포된다.
 *   workers/cron/src/index.js      — Cloudflare Workers Cron Trigger (따로 배포)
 *   functions/api/cron/…           — Pages Functions (본 사이트와 함께 배포)
 *
 * 워커는 응답 "본문 문자열" 을 정규식으로 읽어 다음 행동을 정한다.
 *   · /"due"\s*:\s*0\b/        → 처리할 게 없으면 POST 를 아예 안 보낸다
 *   · /"processed"\s*:\s*0\b/  → 더 처리할 게 없으면 반복을 멈춘다
 *   · /"hasMore"\s*:\s*true/   → 남아 있으면 다음 배치를 이어서 돈다
 *
 * 이름이 하나라도 어긋나면 아무도 오류를 보지 못한 채 이렇게 된다.
 *   · due 를 못 읽으면 → 매분 쓸데없이 POST 를 5번씩 때린다
 *   · processed 를 못 읽으면 → 처리할 게 없어도 5번을 끝까지 돈다
 *   · hasMore 를 못 읽으면 → 순위 추적이 하루 20건에서 멈춘다(밀린 건 영영 안 돈다)
 *
 * 그래서 워커 소스에서 정규식을 그대로 꺼내, 진짜 엔드포인트가 내놓는 본문에 대고 맞춰 본다.
 */
import fs from 'node:fs'
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

async function load(file) {
  const out = await build({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console, AbortController,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}', { status: 200 }), btoa, atob, setTimeout, clearTimeout, structuredClone,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

const WORKER = fs.readFileSync(ROOT + 'workers/cron/src/index.js', 'utf8')

/** 워커 소스에서 정규식 리터럴을 그대로 꺼낸다 — 손으로 옮겨 적으면 검사가 헛돈다. */
function reFrom(needle) {
  const m = new RegExp(String.raw`(/[^/\n]*${needle}[^/\n]*/)\.test`).exec(WORKER)
  if (!m) return null
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m[1]}`)()
}

const TOKEN = 'cron-token-for-contract-check-123456'
const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString()

/* 크론 엔드포인트가 실제로 도는 데 필요한 만큼만 흉내 낸다. */
function makeDB({ dueRows = [], trackRows = [] } = {}) {
  const state = { sql: [] }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/COUNT\(\*\)/i.test(s)) return { n: dueRows.length, c: dueRows.length }
    return null
  }
  const all = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM studio_schedules/i.test(s)) return { results: dueRows }
    if (/FROM naver_place_tracking/i.test(s)) return { results: trackRows }
    return { results: [] }
  }
  return {
    __state: state,
    prepare(sql) {
      const s = String(sql)
      const mk = (b) => ({ first: () => first(s, b), run: async () => ({ meta: { changes: 1 } }), all: () => all(s, b) })
      return { bind: (...b) => mk(b), ...mk([]) }
    },
    async batch(st) { return (st || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
}

const vs = await load('functions/api/cron/video-schedules.ts')
const nt = await load('functions/api/naver-place/update-all-tracking.ts')

const call = async (mod, method, path, db, token = TOKEN) => {
  const handler = method === 'GET' ? mod.onRequestGet : mod.onRequestPost
  const res = await handler({
    request: new Request('https://bygency.com' + path, {
      method, headers: { host: 'bygency.com', 'X-Cron-Token': token, 'content-type': 'application/json' },
    }),
    env: { DB: db, CRON_TOKEN: TOKEN }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  return { status: res.status, body: await res.text() }
}

console.log('\n① 토큰이 맞아야만 돈다')
{
  const db = makeDB()
  const noTok = await call(vs, 'GET', '/api/cron/video-schedules', db, '')
  ok(noTok.status === 401, '토큰이 없으면 401', String(noTok.status))
  const wrong = await call(vs, 'GET', '/api/cron/video-schedules', db, 'X'.repeat(TOKEN.length))
  ok(wrong.status === 401, '길이만 같은 틀린 토큰도 401', String(wrong.status))
  const good = await call(vs, 'GET', '/api/cron/video-schedules', db)
  ok(good.status === 200, '맞는 토큰이면 200', String(good.status))

  const ntNo = await call(nt, 'POST', '/api/naver-place/update-all-tracking?limit=20', db, '')
  ok(ntNo.status === 401, '순위 추적도 토큰이 없으면 401', String(ntNo.status))
}

console.log('\n② 워커가 읽는 "due" 를 엔드포인트가 실제로 내놓는다')
{
  const reDue = reFrom('due')
  ok(!!reDue, '워커 소스에서 due 정규식을 찾았다', String(reDue))

  const empty = await call(vs, 'GET', '/api/cron/video-schedules', makeDB({ dueRows: [] }))
  ok(reDue.test(empty.body), '대기 0건일 때 워커가 "쉬어도 된다" 로 읽는다', empty.body.slice(0, 80))

  const busy = await call(vs, 'GET', '/api/cron/video-schedules', makeDB({ dueRows: [{ id: 's1' }, { id: 's2' }] }))
  ok(!reDue.test(busy.body), '대기가 있으면 그 규칙에 걸리지 않는다(POST 로 넘어간다)', busy.body.slice(0, 80))
  ok(/"due"\s*:\s*2\b/.test(busy.body), '대기 건수를 그대로 알려 준다', busy.body.slice(0, 80))
}

console.log('\n③ 워커가 읽는 "processed" 를 엔드포인트가 실제로 내놓는다')
{
  const reDone = reFrom('processed')
  ok(!!reDone, '워커 소스에서 processed 정규식을 찾았다', String(reDone))
  const none = await call(vs, 'POST', '/api/cron/video-schedules', makeDB({ dueRows: [] }))
  ok(reDone.test(none.body), '처리할 게 없으면 워커가 반복을 멈춘다', none.body.slice(0, 80))
}

console.log('\n④ 워커가 읽는 "hasMore" 를 엔드포인트가 실제로 내놓는다')
{
  /* 이 이름이 어긋나면 순위 추적이 하루 한 배치(20건)에서 멈춘다 —
     오류가 없어서 "다 돌고 있다" 고 믿게 된다. */
  const reMore = reFrom('hasMore')
  ok(!!reMore, '워커 소스에서 hasMore 정규식을 찾았다', String(reMore))

  const done = await call(nt, 'POST', '/api/naver-place/update-all-tracking?limit=20', makeDB({ trackRows: [] }))
  ok(/"hasMore"/.test(done.body), '응답에 hasMore 가 들어 있다', done.body.slice(0, 120))
  ok(!reMore.test(done.body), '남은 게 없으면 워커가 멈춘다', done.body.slice(0, 120))
}

console.log('\n⑤ 워커가 두드리는 경로가 실제로 존재한다')
{
  /* 경로가 어긋나면 매분 404 만 받는다 — 워커는 로그만 남기고 계속 돈다. */
  const paths = [...WORKER.matchAll(/['`](\/api\/[^'`]+)['`]/g)].map((m) => m[1].split('?')[0].split('$')[0])
  const uniq = [...new Set(paths)]
  ok(uniq.length >= 2, '워커가 두드리는 경로를 소스에서 찾았다', JSON.stringify(uniq))
  for (const p of uniq) {
    const file = p.replace(/^\/api\//, 'functions/api/') + '.ts'
    ok(fs.existsSync(ROOT + file), `${p} 에 해당하는 파일이 있다`, file)
  }
}

console.log('\n⑥ 미들웨어가 그 경로만 우회시킨다')
{
  //  우회 범위가 넓어지면 보안 검사를 건너뛰는 문이 늘어난다
  const mw = fs.readFileSync(ROOT + 'functions/_middleware.ts', 'utf8')
  const m = /const CRON_PATH_RE = (\/[^\n]*\/)/.exec(mw)
  ok(!!m, '미들웨어의 크론 경로 규칙을 찾았다', String(m && m[1]))
  // eslint-disable-next-line no-new-func
  const re = new Function(`return ${m[1]}`)()
  const paths = [...new Set([...WORKER.matchAll(/['`](\/api\/[^'`]+)['`]/g)].map((x) => x[1].split('?')[0].split('$')[0]))]
  for (const p of paths) ok(re.test(p), `${p} 는 크론 우회 대상이다`, String(re))
  for (const p of ['/api/me', '/api/generate', '/api/payments/confirm', '/api/admin/notices'])
    ok(!re.test(p), `${p} 는 우회 대상이 아니다`, String(re))
}

console.log(failed === 0 ? '\n크론 계약 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
