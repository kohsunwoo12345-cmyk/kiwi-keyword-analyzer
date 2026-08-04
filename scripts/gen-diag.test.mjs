/* 생성 진단 엔드포인트 노출 검증 —  node scripts/gen-diag.test.mjs
 *
 * /api/generate 의 GET 진단들은 편하려고 열어 두기 쉬운 자리다.
 *   · ?health   — 스튜디오가 "어떤 모델을 보여 줄지" 고르는 데 쓰므로 로그인 없이 열려 있어야 한다.
 *                 그런데 응답 안에 배포된 API 키의 앞뒤 몇 글자(지문)가 같이 나가고 있었다.
 *                 화면에서는 아무도 안 쓰고, 관리자가 키를 대조할 때만 보는 값이다.
 *   · ?trace    — 죽은 요청의 발자국. 표만 알면 아무나 읽을 수 있어서, 남의 모델 이름과
 *                 차감 크레딧이 익명으로 새어 나갈 수 있었다.
 *   · ?diag=…   — 실제 제공사에 유료 호출을 넣는다. 관리자 전용이어야 한다.
 */
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

const out = await build({ entryPoints: [ROOT + 'functions/api/generate.js'], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
const sandbox = {
  module: { exports: {} }, exports: {}, require: require_, console: { log() {}, warn() {}, error() {} },
  Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
  fetch: async () => new Response('{}', { status: 200 }), btoa, atob, setTimeout, clearTimeout, structuredClone, AbortController,
}
sandbox.module.exports = sandbox.exports
vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: 'generate.js' })
const mod = sandbox.module.exports

/** who: null 비로그인 · 'user' 회원 · 'admin' 관리자 */
function makeDB(who) {
  const row = who ? { id: 'u1', email: 'a@b.c', role: who, credits: 100 } : null
  const st = (sql) => ({
    bind: () => st(sql),
    async first() { return /FROM sessions/i.test(sql) ? row : null },
    async run() { return { meta: { changes: 1 } } },
    async all() { return { results: [{ step: '제공사 호출 직전', note: 'Seedance 2.0 · 차감 258', at: '2026-08-04' }] } },
  })
  return { prepare: (s) => st(String(s)), async batch(x) { return (x || []).map(() => ({ results: [] })) }, async dump() { return new ArrayBuffer(0) } }
}

const ENV = {
  DB: null,
  //  키가 있어야 지문이 만들어진다 — 없으면 검사가 헛돈다
  Seedance_API_KEY: 'sd_abcdefgh_MIDDLE_PART_wxyz',
  DASHSCOPE_API_KEY: 'ali_abcdef_MIDDLE_PART_7890',
}

const get = async (qs, who) => {
  const db = makeDB(who)
  const res = await mod.onRequest({
    request: new Request('https://bygency.com/api/generate' + qs, { headers: { host: 'bygency.com', cookie: who ? 'bg_session=t' : '' } }),
    env: { ...ENV, DB: db }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  let body = {}
  const txt = await res.text().catch(() => '')
  try { body = JSON.parse(txt) } catch { /* noop */ }
  return { status: res.status, body, txt }
}

console.log('\n① ?health 는 열려 있되 키 지문은 관리자에게만 준다')
{
  const anon = await get('?health=1', null)
  ok(anon.status === 200, '비로그인도 200 (스튜디오가 모델 목록을 거른다)', String(anon.status))
  ok(typeof anon.body.seedance === 'boolean', '제공사 사용 가능 여부는 그대로 알려 준다', JSON.stringify(anon.body).slice(0, 80))
  ok(anon.body.seedanceKeyId == null, '비로그인에게 씨댄스 키 지문을 주지 않는다', String(anon.body.seedanceKeyId))
  ok(anon.body.alibabaKeyId == null, '비로그인에게 알리바바 키 지문을 주지 않는다', String(anon.body.alibabaKeyId))
  ok(!/abcdefgh|abcdef/.test(anon.txt), '응답 어디에도 키 조각이 없다', anon.txt.slice(0, 120))

  const user = await get('?health=1', 'user')
  ok(user.body.seedanceKeyId == null, '일반 회원에게도 주지 않는다', String(user.body.seedanceKeyId))

  const admin = await get('?health=1', 'admin')
  ok(typeof admin.body.seedanceKeyId === 'string' && admin.body.seedanceKeyId.length > 0,
     '관리자에게는 준다 (배포 키 대조용)', String(admin.body.seedanceKeyId))
}

console.log('\n② ?trace 는 로그인해야 읽는다')
{
  const anon = await get('?trace=tr_abc123', null)
  ok(anon.status === 401, '비로그인은 401', String(anon.status))
  ok(!/Seedance/.test(anon.txt), '발자국 내용이 새지 않는다', anon.txt.slice(0, 100))

  const user = await get('?trace=tr_abc123', 'user')
  ok(user.status === 200, '회원은 자기 표로 읽는다', String(user.status))
  ok(Array.isArray(user.body.marks) && user.body.marks.length > 0, '발자국이 돌아온다', JSON.stringify(user.body).slice(0, 90))
}

console.log('\n③ ?diag 는 관리자 전용이다 (제공사에 유료 호출이 나간다)')
{
  for (const who of [null, 'user']) {
    const r = await get('?diag=alibaba', who)
    ok(r.status === 403, `${who || '비로그인'} 은 403`, String(r.status))
  }
}

console.log(failed === 0 ? '\n생성 진단 노출 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
