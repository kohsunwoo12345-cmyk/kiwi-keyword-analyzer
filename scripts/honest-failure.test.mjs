/* 실패를 성공으로 답하지 않는지 검증 —  node scripts/honest-failure.test.mjs
 *
 * 목록을 읽는 API 가 오류를 삼키고 빈 배열을 "성공" 으로 돌려주면,
 * 화면에는 "신청자 없음" · "퍼널이 없습니다" · "추적 키워드 없음" 이 뜬다.
 * 들어온 게 없는 것과 못 불러온 것은 완전히 다른 이야기다 —
 *   · 신청자 목록이 비면 "이번 달 문의가 하나도 없네" 하고 광고를 끄는 판단까지 간다
 *   · 플레이스 화면은 그 빈 목록을 localStorage 에 캐시한다. 다음 방문에도 없는 것처럼 보인다
 *   · 오류가 아니니 로그도 조용하고, 아무도 고장 났다는 걸 모른다
 *
 * 그래서 두 가지를 본다.
 *   ① catch 안에서 success/ok: true 로 답하는 자리가 없다(공개·부가 정보는 예외)
 *   ② 실제로 DB 를 실패시켰을 때 성공이라고 답하지 않는다(런타임 확인)
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '\n         ' + detail : ''}`) }
}

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

/* 회원의 데이터가 아니라 "있으면 좋고 없어도 화면은 떠야 하는" 것들.
   여기서 오류를 내면 페이지 전체가 망가진다 — 조용히 비워 두는 게 맞다. */
const OK_TO_DEGRADE = new Map([
  ['blog-analysis/posts.ts', '남의 블로그 공개 RSS — 못 읽으면 그냥 비운다'],
  ['public-notices.ts', '공지·광고 — 못 읽었다고 방문자 화면을 막을 이유가 없다'],
  ['studio/models.ts', '모델 목록(카탈로그) — 화면에 기본값이 따로 있다'],
])

console.log('\n① 목록 API 가 오류를 삼키고 성공이라고 답하지 않는다')
{
  const bad = []
  let scanned = 0
  for (const p of walk(path.join(ROOT, 'functions/api'))) {
    const rel = path.relative(path.join(ROOT, 'functions/api'), p)
    const src = strip(fs.readFileSync(p, 'utf8'))
    if (!/export const onRequest/.test(src)) continue
    for (const m of src.matchAll(/catch\s*(?:\([^)]*\))?\s*\{([\s\S]{0,400}?)\}/g)) {
      if (!/\b(success|ok)\s*:\s*true/.test(m[1])) continue
      scanned++
      if (OK_TO_DEGRADE.has(rel)) continue
      bad.push(`${rel}\n           ${m[0].replace(/\s+/g, ' ').slice(0, 130)}`)
    }
  }
  ok(scanned >= OK_TO_DEGRADE.size, `catch 안 성공 응답을 찾아봤다 (${scanned}곳)`, String(scanned))
  ok(bad.length === 0, '실패를 성공으로 답하는 자리가 없다', bad.join('\n         '))
  const have = new Set(walk(path.join(ROOT, 'functions/api')).map((p) => path.relative(path.join(ROOT, 'functions/api'), p)))
  ok([...OK_TO_DEGRADE.keys()].every((k) => have.has(k)), '예외 목록이 낡지 않았다', [...OK_TO_DEGRADE.keys()].join(', '))
  ok(OK_TO_DEGRADE.size <= 3, `예외가 늘지 않았다 (${OK_TO_DEGRADE.size}개)`, String(OK_TO_DEGRADE.size))
}

/* ── 런타임 확인 ─────────────────────────────────────────────────────────── */
async function load(file) {
  const out = await build({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console: { log() {}, warn() {}, error() {} },
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}', { status: 200 }), btoa, atob, setTimeout, clearTimeout, structuredClone, AbortController,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

/** 로그인은 되지만 목록 질의에서 터지는 D1 */
function brokenDB({ userRow = { id: 'u1', email: 'a@b.c', role: 'user' } } = {}) {
  const okStmt = (sql) => ({
    bind: () => okStmt(sql),
    async first() {
      if (/FROM sessions/i.test(sql) || /JOIN users/i.test(sql)) return userRow
      if (/FROM users/i.test(sql)) return userRow
      //  소유 확인과 퍼널 한 줄은 통과시켜야 목록 조회까지 도달한다
      if (/SELECT 1 AS ok FROM funnels/i.test(sql)) return { ok: 1 }
      if (/SELECT \* FROM funnels WHERE id/i.test(sql)) return { id: 1, name: 'f' }
      return null
    },
    async run() { return { meta: { changes: 1 } } },
    async all() {
      //  목록 질의만 터뜨린다 — 스키마 보장은 통과시켜야 진짜 경로까지 간다
      if (/form_submissions|funnel_applicants|funnel_landing_pages|FROM funnels|funnel_groups|funnel_group_connections|funnel_auto_responses|naver_place/i.test(sql))
        throw new Error('D1_ERROR: no such table')
      return { results: [] }
    },
  })
  return {
    prepare: (sql) => okStmt(String(sql)),
    async batch(st) { return (st || []).map(() => ({ results: [] })) },
  }
}

const call = async (mod, url, db, params = {}) => {
  const res = await mod.onRequestGet({
    request: new Request(url, { headers: { host: 'bygency.com', cookie: 'bygency_session=t' } }),
    env: { DB: db }, params, waitUntil: () => {}, next: async () => new Response(''),
  })
  let body = {}
  try { body = JSON.parse(await res.text()) } catch { /* noop */ }
  return { status: res.status, body }
}

console.log('\n② 실제로 목록 질의가 터지면 성공이라고 답하지 않는다')
{
  const cases = [
    ['functions/api/landing/all-submissions.ts', 'https://bygency.com/api/landing/all-submissions?limit=10', {}],
    ['functions/api/funnels/index.ts', 'https://bygency.com/api/funnels', {}],
    ['functions/api/funnel/landing-pages.ts', 'https://bygency.com/api/funnel/landing-pages', {}],
    //  아래 셋은 조회를 try 로 감싸고 로그만 남긴 뒤 성공으로 흘려보내던 자리다
    ['functions/api/funnel/groups.ts', 'https://bygency.com/api/funnel/groups', {}],
    ['functions/api/funnel/auto-responses.ts', 'https://bygency.com/api/funnel/auto-responses', {}],
    ['functions/api/funnels/[id].ts', 'https://bygency.com/api/funnels/1', { id: '1' }],
  ]
  for (const [file, url, params] of cases) {
    const mod = await load(file)
    const r = await call(mod, url, brokenDB(), params)
    const name = file.replace('functions/api/', '')
    ok(r.body.success !== true, `${name} — 성공이라고 답하지 않는다`, JSON.stringify(r.body).slice(0, 120))
    ok(r.status >= 500, `${name} — 상태 코드로도 알린다`, String(r.status))
    ok(typeof r.body.error === 'string' && r.body.error.length > 0, `${name} — 왜 못 불러왔는지 말해 준다`, JSON.stringify(r.body).slice(0, 120))
  }
}

console.log(failed === 0 ? '\n정직한 실패 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
