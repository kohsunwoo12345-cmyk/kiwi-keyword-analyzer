/* 생성물 영구 보관 그물 검증 —  node --disable-warning=ExperimentalWarning scripts/media-archive.test.mjs
 *
 * 회원이 만든 영상은 아무도 아무것도 안 눌러도 우리 도메인에 남아 있어야 한다.
 * 그 그물이 /api/cron/media-archive 다.
 *
 * 여기서 조용히 망가지는 자리는 "줄 서기" 다.
 *   제공사 주소는 며칠이면 만료돼서, 아무리 해도 못 가져오는 줄이 반드시 쌓인다.
 *   그런 줄을 세어 두지 않으면 목록 맨 앞에 영원히 남아
 *     · 정기 실행마다 같은 여섯 건을 다시 내려받으려 하고(제공사에 헛되이 두드린다)
 *     · 그 뒤에 있는 "아직 살릴 수 있는" 줄에는 영영 닿지 못하고
 *     · due 가 0 이 되지 않아 워커가 매번 POST 를 때린다
 *   오류는 안 난다. 로그도 정상이다. 영상만 조용히 사라진다.
 *
 * 그래서 진짜 SQLite 에 대고, 앞줄이 전부 막힌 상태를 만들어 놓고 돌려 본다.
 */
import fs from 'node:fs'
import vm from 'node:vm'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

let DatabaseSync
try { ({ DatabaseSync } = await import('node:sqlite')) } catch {
  console.log('\n건너뜀 — 이 Node 에는 node:sqlite 가 없습니다(22+ 필요).\n')
  process.exit(0)
}

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

const TOKEN = 'cron-token-for-archive-check-1234567'
/** 이 주소만 옮겨진다 — 나머지는 만료된 것으로 친다. */
const MOVABLE = /alive/

async function load(file) {
  const out = await build({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  /* saveMediaToR2 는 진짜 구현을 그대로 쓴다 — 바깥세상(fetch·R2)만 흉내 낸다.
     살아 있는 주소만 200 을 주고, 만료된 주소는 404 를 준다. */
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_,
    console: { log() {}, warn() {}, error() {} },
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: async (u) => {
      //  R2 로 옮기는 대신, 살아 있는 주소만 200 을 준다
      if (MOVABLE.test(String(u))) return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'video/mp4' } })
      return new Response('gone', { status: 404 })
    },
    btoa, atob, setTimeout, clearTimeout, structuredClone, AbortController,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

const sqlite = new DatabaseSync(':memory:')
const d1 = {
  prepare(sql) {
    const s = String(sql)
    const mk = (b) => ({
      async run() { const r = sqlite.prepare(s).run(...b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } } },
      async first() { return sqlite.prepare(s).get(...b) ?? null },
      async all() { return { results: sqlite.prepare(s).all(...b) } },
    })
    return { bind: (...b) => mk(b), ...mk([]) }
  },
  async batch(st) { return (st || []).map(() => ({ results: [] })) },
  async dump() { return new ArrayBuffer(0) },
}

/** R2 흉내 — 넣은 것만 기억한다 */
const putKeys = []
const bucket = {
  async put(key, body) { putKeys.push(key); return { key } },
  async get() { return null },
  async list() { return { objects: [] } },
  async head() { return null },
  async delete() { return undefined },
}

const { ensureAiUsage } = await load('functions/api/studio/_pricing.ts')
await ensureAiUsage(d1)

console.log('\n① 시도 횟수 칸이 실제로 만들어진다')
{
  const cols = sqlite.prepare('PRAGMA table_info(ai_usage)').all().map((r) => r.name)
  ok(cols.includes('archive_tries'), 'ai_usage.archive_tries 가 있다', JSON.stringify(cols.slice(0, 20)))
  ok(cols.includes('result_url'), 'ai_usage.result_url 이 있다')
}

/* 앞줄(최근 것) 여섯 건은 만료, 그 뒤에 아직 살릴 수 있는 한 건. */
const ins = sqlite.prepare(
  `INSERT INTO ai_usage (id, user_id, provider, model, kind, units, usd, created_at, result_url) VALUES (?,?,?,?,?,?,?,?,?)`)
for (let i = 0; i < 6; i++) ins.run(`dead${i}`, 'u1', 'p', 'm', 'video', 1, 0, `2026-08-0${i + 2}T00:00:00.000Z`, `https://provider.example/expired-${i}.mp4`)
ins.run('alive1', 'u1', 'p', 'm', 'video', 1, 0, '2026-08-01T00:00:00.000Z', 'https://provider.example/alive-1.mp4')

const mod = await load('functions/api/cron/media-archive.ts')
const call = async (method) => {
  const h = method === 'GET' ? mod.onRequestGet : mod.onRequestPost
  const res = await h({
    request: new Request('https://bygency.com/api/cron/media-archive', { method, headers: { host: 'bygency.com', 'X-Cron-Token': TOKEN } }),
    env: { DB: d1, CRON_TOKEN: TOKEN, BUCKET: bucket }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  return { status: res.status, body: JSON.parse(await res.text()) }
}

console.log('\n② 토큰이 맞아야만 돈다')
{
  const noTok = await mod.onRequestGet({
    request: new Request('https://bygency.com/api/cron/media-archive', { headers: { host: 'bygency.com' } }),
    env: { DB: d1, CRON_TOKEN: TOKEN }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  ok(noTok.status === 401, '토큰이 없으면 401', String(noTok.status))
}

console.log('\n③ 앞줄이 막혀 있어도 뒤에 있는 살릴 수 있는 줄에 닿는다')
{
  const before = await call('GET')
  ok(before.body.due === 7, '옮길 게 7건이라고 본다', JSON.stringify(before.body))

  /* 못 옮기는 여섯 건이 맨 앞이다. 시도 횟수를 세지 않으면 여기서 영원히 제자리다. */
  let movedTotal = 0
  for (let run = 0; run < 40; run++) {
    const r = await call('POST')
    movedTotal += Number(r.body.moved || 0)
    if (movedTotal > 0) break
  }
  ok(movedTotal === 1, '결국 살아 있는 한 건이 옮겨진다 (앞줄에 막히지 않는다)', String(movedTotal))

  const row = sqlite.prepare("SELECT result_url FROM ai_usage WHERE id='alive1'").get()
  ok(!/^http/.test(String(row.result_url)), '옮겨진 줄은 더 이상 제공사 주소가 아니다', JSON.stringify(row))
}

console.log('\n④ 못 옮기는 줄은 결국 손을 떼고, due 가 0 이 된다')
{
  for (let run = 0; run < 40; run++) {
    const r = await call('POST')
    if (Number(r.body.left || 0) === 0) break
  }
  const after = await call('GET')
  ok(after.body.due === 0, '더 해 볼 게 없으면 due 가 0 이다 (워커가 헛되이 POST 하지 않는다)', JSON.stringify(after.body))
  ok(after.body.hasMore === false, '워커에게 멈추라고 말한다', JSON.stringify(after.body))
  ok(Number(after.body.gaveUp) === 6, '포기한 줄 수를 숨기지 않고 알려 준다', JSON.stringify(after.body))
  ok(putKeys.length === 1, 'R2 에 실제로 한 건만 올라갔다', JSON.stringify(putKeys))
  const tries = sqlite.prepare("SELECT archive_tries t FROM ai_usage WHERE id='dead0'").get()
  ok(Number(tries.t) >= 5, '만료된 줄의 시도 횟수가 실제로 쌓였다', JSON.stringify(tries))
}

console.log(failed === 0 ? '\n보관 그물 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
