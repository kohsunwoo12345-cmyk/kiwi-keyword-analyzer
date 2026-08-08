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
      if (!/recraft|stability/.test(u)) return new Response('{}', { status: 200 })
      let body = null, multipart = false
      //  FormData 면 JSON.parse 가 안 된다 — 그게 곧 multipart 라는 증거다
      if (init && init.body && typeof init.body !== 'string') {
        multipart = true
        try { body = Object.fromEntries([...init.body.entries()]) } catch { body = '(formdata)' }
      } else { try { body = init && init.body ? JSON.parse(init.body) : null } catch {} }
      calls.push({ url: u, method: (init && init.method) || 'GET', multipart,
                   headers: Object.fromEntries(Object.entries((init && init.headers) || {})), body })
      const r = reply || { status: 200, json: { data: [{ url: 'https://img.recraft.ai/out.png' }] } }
      reply = null
      return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json' } })
    },
    btoa, atob, setTimeout, clearTimeout, structuredClone,
    //  Stability 는 본문이 multipart 다. 이게 없으면 핸들러가 new FormData() 에서 먼저 죽는데,
    //  죽은 응답도 FAIL=200 이라 "실패로 넘겼다" 는 검사가 그냥 통과해 버린다(실제로 그랬다).
    //  워커 런타임에는 셋 다 있다 — 없는 쪽은 이 시험대였다.
    FormData, Blob, File,
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
const ENV = { DB: null, Recraft_API_KEY: 'rk-test', Stability_API_KEY: 'sk-test' }

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

console.log('\n⑦ Stability — 이 제공사만 본문이 multipart 다')
{
  //  JSON 으로 보내면 전부 거절된다. 그리고 Accept:application/json 이어야 base64 가 온다.
  reply = { status: 200, json: { image: 'QUJD', seed: 1, finish_reason: 'SUCCESS' } }
  const r = await post({ provider: 'stability', model: 'Stable Image Core', prompt: '로고', ratio: '1:1' })
  const c = r.calls[0]
  ok(!!c && /api\.stability\.ai\/v2beta\/stable-image\/generate\/core$/.test(c.url), '경로가 맞다', c && c.url)
  ok(c && c.multipart === true, '본문을 multipart 로 보낸다 — JSON 으로 보내면 전부 거절된다',
     JSON.stringify(c && c.body))
  ok(c && c.headers.Accept === 'application/json', 'Accept 를 json 으로 줘야 base64 가 온다',
     JSON.stringify(c && c.headers))
  ok(String(r.body.url).startsWith('data:image/png;base64,QUJD'),
     'base64 를 data: 주소로 만든다 — 그래야 R2 보관 경로가 그대로 받는다', String(r.body.url).slice(0, 40))
  ok(r.db.__state.tokens.length === 1, '과금 토큰을 발급한다', String(r.db.__state.tokens.length))

  reply = { status: 200, json: { finish_reason: 'CONTENT_FILTERED' } }
  const r2 = await post({ provider: 'stability', model: 'Stable Image Core', prompt: 'x' })
  //  "서버 예외" 도 error 필드를 채운다 — 그것까지 합격시키면 핸들러가 죽어도 초록불이 뜬다.
  //  실제로 FormData 가 없어서 죽었을 때 이 검사가 그냥 통과했다. 그래서 예외를 따로 뺀다.
  ok(!r2.body.url && !!r2.body.error && !/서버 예외/.test(r2.body.error) && r2.calls.length === 1,
     '이미지가 없으면 실패로 넘긴다 — 죽어서 나온 error 는 합격이 아니다', JSON.stringify(r2.body))
}

console.log('\n⑧ Stability 도 같은 표 하나만 본다 — 그리고 단가는 싸게 잡히면 안 된다')
{
  const st = fs.readFileSync(new URL('../functions/api/studio/_stability.ts', import.meta.url), 'utf8')
  const reg = fs.readFileSync(new URL('../functions/api/studio/_registry.ts', import.meta.url), 'utf8')
  const gj = fs.readFileSync(new URL('../functions/api/generate.js', import.meta.url), 'utf8')

  //  단가는 글자 검사로 안 본다 — 진짜 단가표를 돌려서 값이 실제로 얹히는지 잰다.
  const pricing = await load('functions/api/studio/_pricing.ts')
  const stab = await load('functions/api/studio/_stability.ts')
  const COST = pricing.MODEL_COST
  const rows = stab.STABILITY_MODELS
  ok(rows.length > 0 && rows.every((r) => COST[r.name] && COST[r.name].prov === 'stability'),
     '단가표가 Stability 줄을 전부 얹는다(손으로 안 베낀다)',
     JSON.stringify(rows.map((r) => r.name + ':' + (COST[r.name] && COST[r.name].usd))))

  /* 명세 원문 값이다. 우리 표가 이보다 **싸면** 장마다 차액을 우리가 물고 못 무른다.
     비싼 쪽은 관리자가 내리면 되니 통과시킨다 — 막으려는 건 한 방향뿐이다. */
  const 명세 = { 'Stable Image Ultra': 0.08, 'Stable Image Core': 0.03, 'Stable Diffusion 3.5': 0.065 }
  const 싼줄 = rows.filter((r) => COST[r.name] && COST[r.name].usd < 명세[r.name])
  ok(싼줄.length === 0, '어떤 줄도 명세보다 싸게 잡히지 않는다 — 싸게 잡으면 되돌릴 수 없다',
     JSON.stringify(싼줄.map((r) => r.name + ' ' + COST[r.name].usd + ' < ' + 명세[r.name])))

  ok(/export const STABILITY_WIRED = true/.test(st), '연결됨으로 표시된다')
  ok(/STABILITY_BY_NAME/.test(gj), '생성 경로도 같은 표에서 모델을 찾는다')
  ok(/, "stability"/.test(gj) || /"stability"\]\);/.test(gj), '공식 API 로만 나간다(OFFICIAL_ONLY)')
  ok(/stability: !!k\.stability/.test(gj), '키가 없으면 스튜디오가 Stability 를 숨긴다')
  ok(/enable_stability_v1/.test(reg), '켜는 자리가 있다 — 심을 때는 꺼져 있었다')
  /* seedStability 는 ensureOnce 라 운영에서 이미 한 번 돌았다. 그때 Core 는 $0.03 으로 들어갔다.
     켜기만 하고 usd 를 안 고치면 **싼 값 그대로 켜진다** — 위 검사가 잡지 못하는 자리다. */
  ok(/enable_stability_v1[\s\S]{0,600}?SET enabled = 1, verified_at = \?, usd = \?/.test(reg),
     '켤 때 단가도 같이 덮는다 — 먼저 심은 싼 값이 그대로 켜지면 안 된다')
  ok(/enable_stability_v1[\s\S]{0,800}?AND enabled = 0 AND note LIKE '연결 전 —%'/.test(reg),
     '관리자가 손댄 줄은 건드리지 않는다')
}

console.log(failed === 0
  ? '\nRecraft·Stability 생성 경로 — 실패 0 (연결 · 벡터 차단 · 결과 자리 · 실패 처리 · multipart · 과금 토큰 · 단가 하한)'
  : `\n실패 ${failed}건`)
process.exit(failed ? 1 : 0)
