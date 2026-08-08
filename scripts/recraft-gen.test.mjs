/* Recraft 생성 경로 — 진짜 onRequest 를 그대로 돌린다.
 *
 * 키는 관리자 화면에서 확정됐다(계정 조회 200 · 잔액 $5.00 · 틀린 키 401).
 * 확정된 것은 키뿐이고, **보내는 모양이 맞는지는 별개다.** 그래서 실제 핸들러를 돌려
 * Recraft 로 나가는 요청의 주소·헤더·본문을 그대로 들여다본다.
 *
 * 여기서 잡으려는 것:
 *   ㉠ 벡터(SVG)를 켜 버리면 "만들어지긴 했는데 화면에 안 뜨는" 결과물이 쌓인다 — 막혀야 한다
 *   ㉡ 비율만 보내면 회원이 고른 비율이 조용히 무시된다(size 를 가로x세로로 보내야 한다)
 *   ㉢ 결과 자리가 한 곳이 아니다 — data[].url · b64_json · 평평한 url
 *   ㉣ 과금 토큰이 안 붙으면 생성만 되고 청구가 안 된다
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require_ = createRequire(import.meta.url)
let calls = []
let reply = null            // 다음 응답을 시험별로 갈아 끼운다

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs',
                            platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console, AbortController,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: async (url, init) => {
      const u = String(url)
      if (!/recraft/.test(u)) return new Response('{}', { status: 200 })
      let body = null
      try { body = init && init.body ? JSON.parse(init.body) : null } catch {}
      calls.push({ url: u, method: (init && init.method) || 'GET',
                   headers: Object.fromEntries(Object.entries((init && init.headers) || {})), body })
      const r = reply || { status: 200, json: { data: [{ url: 'https://img.recraft.ai/out.png' }] } }
      reply = null
      return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json' } })
    },
    btoa, atob, setTimeout, clearTimeout, structuredClone,
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

const gen = await load('functions/api/generate.js')
const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString()
const ENV = { DB: null, Recraft_API_KEY: 'rk-test' }

function makeDB() {
  const user = { id: 'u1', email: 'a@x.co', role: 'user', status: 'active', credits: 1_000_000,
                 credit_price: 65, credit_markup: 0, plan: 'Pro', plan_until: FUTURE,
                 video_plan: 'Pro', video_plan_until: FUTURE }
  const state = { tokens: [] }
  const first = async (s) => {
    if (/FROM sessions s JOIN users u/i.test(s)) return { ...user }
    if (/FROM users WHERE id/i.test(s)) return { ...user }
    if (/FROM api_rate WHERE user_id/i.test(s)) return { b: 0, m: 0, h: 0, d: 0 }
    return null
  }
  return {
    __state: state,
    prepare(sql) {
      const s = String(sql)
      const mk = (b) => ({ first: () => first(s, b),
        run: async () => { if (/INSERT INTO gen_charges/i.test(s)) state.tokens.push({ model: b[2] }); return { meta: { changes: 1 } } },
        all: async () => ({ results: [] }) })
      return { bind: (...b) => mk(b), ...mk([]) }
    },
    async batch(st) { return (st || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
}

async function post(body) {
  calls = []
  const db = makeDB()
  const res = await gen.onRequest({
    request: new Request('https://bygency.com/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bg_session=t', host: 'bygency.com', origin: 'https://bygency.com' },
      body: JSON.stringify(body),
    }),
    env: { ...ENV, DB: db }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  let parsed = {}
  try { parsed = JSON.parse(await res.text()) } catch {}
  return { status: res.status, body: parsed, calls: calls.slice(), db }
}

const RASTER = 'Recraft V4.1 (이미지)'
const VECTOR = 'Recraft V4.1 (벡터 SVG)'

console.log('\n① 래스터 제출 — 주소·헤더·본문')
{
  const r = await post({ provider: 'recraft', model: RASTER, prompt: '파란 로고', ratio: '16:9' })
  const c = r.calls[0]
  ok(!!c, 'Recraft 를 실제로 불렀다', JSON.stringify(r.body).slice(0, 140))
  ok(c && c.url === 'https://external.api.recraft.ai/v1/images/generations', '래스터 경로로 간다', c && c.url)
  ok(c && c.headers.Authorization === 'Bearer rk-test', 'Bearer 로 인증한다(Recraft 는 Bearer 다)',
     JSON.stringify(c && c.headers))
  ok(c && c.body.model === 'recraftv4_1', '표시명이 아니라 제공사 모델 ID 로 보낸다', c && c.body.model)
  ok(c && c.body.prompt === '파란 로고', '프롬프트를 그대로 보낸다', c && c.body.prompt)
  ok(c && c.body.size === '1820x1024',
     '㉡ 비율을 가로x세로로 바꿔 보낸다 — 비율만 주면 회원이 고른 값이 조용히 무시된다',
     JSON.stringify(c && c.body.size))
  ok(r.body.url === 'https://img.recraft.ai/out.png', '결과 주소를 돌려준다', JSON.stringify(r.body))
  ok(r.body.kind === 'image', '이미지로 표시한다', String(r.body.kind))
  ok(r.db.__state.tokens.length === 1, '㉣ 과금 토큰을 발급한다 — 없으면 생성만 되고 청구가 안 된다',
     String(r.db.__state.tokens.length))
}

console.log('\n② 벡터(SVG)는 아직 막혀 있어야 한다')
{
  const r = await post({ provider: 'recraft', model: VECTOR, prompt: 'x' })
  ok(r.calls.length === 0, '㉠ 제공사를 부르지 않는다 — 돈이 안 나간다', JSON.stringify(r.calls.map((c) => c.url)))
  ok(/벡터/.test(String(r.body.error)), '왜 안 되는지 알려 준다', String(r.body.error))
}

console.log('\n③ 결과 자리가 여러 곳이다 — 셋 다 꺼낸다')
{
  reply = { status: 200, json: { data: [{ b64_json: 'AAAA' }] } }
  let r = await post({ provider: 'recraft', model: RASTER, prompt: 'x' })
  ok(/^data:image\/png;base64,AAAA/.test(String(r.body.url)), 'data[].b64_json', JSON.stringify(r.body).slice(0, 90))

  reply = { status: 200, json: { url: 'https://img.recraft.ai/flat.png' } }
  r = await post({ provider: 'recraft', model: RASTER, prompt: 'x' })
  ok(r.body.url === 'https://img.recraft.ai/flat.png', '평평한 url', JSON.stringify(r.body).slice(0, 90))
}

console.log('\n④ 실패를 성공으로 넘기지 않는다')
{
  reply = { status: 402, json: { message: 'Insufficient credits' } }
  let r = await post({ provider: 'recraft', model: RASTER, prompt: 'x' })
  ok(!r.body.url && /Recraft/.test(String(r.body.error)), '제공사 거절을 그대로 알린다', JSON.stringify(r.body))

  //  200 인데 주소가 없는 경우 — 성공으로 넘기면 회원 돈만 나가고 결과가 없다
  reply = { status: 200, json: { created: 1, data: [] } }
  r = await post({ provider: 'recraft', model: RASTER, prompt: 'x' })
  ok(!r.body.url && !!r.body.error, '200 이어도 결과가 없으면 실패로 넘긴다', JSON.stringify(r.body))
}

console.log('\n⑤ 모르는 모델·빈 프롬프트는 부르기 전에 막는다')
{
  let r = await post({ provider: 'recraft', model: '없는 모델', prompt: 'x' })
  ok(r.calls.length === 0 && /없는 모델/.test(String(r.body.error)), '없는 모델이면 부르지 않는다', String(r.body.error))
  r = await post({ provider: 'recraft', model: RASTER, prompt: '' })
  ok(r.calls.length === 0, '프롬프트가 비면 부르지 않는다', JSON.stringify(r.calls.length))
}

console.log('\n⑥ 표가 서로 어긋나지 않는다')
{
  const rc = fs.readFileSync(new URL('../functions/api/studio/_recraft.ts', import.meta.url), 'utf8')
  const reg = fs.readFileSync(new URL('../functions/api/studio/_registry.ts', import.meta.url), 'utf8')
  const gj = fs.readFileSync(new URL('../functions/api/generate.js', import.meta.url), 'utf8')
  const pr = fs.readFileSync(new URL('../functions/api/studio/_pricing.ts', import.meta.url), 'utf8')
  ok(/export const RECRAFT_WIRED = true/.test(rc), '연결됨으로 표시된다 — 화면의 "연결 전" 딱지가 걷힌다')
  ok(/for \(const r of RECRAFT_MODELS\)/.test(pr), '서버 단가표가 같은 표를 얹는다(손으로 안 베낀다)')
  ok(/RECRAFT_BY_NAME/.test(gj), '생성 경로도 같은 표에서 모델을 찾는다')
  ok(/"recraft"\]\);/.test(gj) || /, "recraft"/.test(gj), '공식 API 로만 나간다(OFFICIAL_ONLY)')
  ok(/enable_recraft_raster_v1/.test(reg), '래스터만 켜는 자리가 있다')
  ok(/if \(r\.vector\) continue/.test(reg), '벡터는 켜지 않는다')
  ok(/AND enabled = 0 AND note LIKE '연결 전 —%'/.test(reg),
     '관리자가 손댄 줄은 건드리지 않는다', '켜 두거나 꺼 둔 것을 배포가 되돌리면 관리자 화면이 소용없어진다')
  ok(/recraft: !!k\.recraft/.test(gj), '키가 없으면 스튜디오가 Recraft 를 숨긴다')
}

console.log(failed === 0
  ? '\nRecraft 생성 경로 — 실패 0 (래스터 연결 · 벡터 차단 · 결과 3자리 · 실패 처리 · 과금 토큰)'
  : `\n실패 ${failed}건`)
process.exit(failed ? 1 : 0)
