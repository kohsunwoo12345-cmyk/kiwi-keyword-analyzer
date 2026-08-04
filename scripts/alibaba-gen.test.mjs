/* 알리바바(Wan·Qwen) 생성 경로 — 진짜 onRequest 를 그대로 돌린다.
 *
 * 구조 검사(정규식으로 코드 모양 보기)만으로는 "보내는 모양이 맞는가" 를 못 잰다.
 * 그래서 gen-gate 와 같은 방식으로 실제 핸들러를 번들해 돌리고, 알리바바로 나가는
 * 요청을 가로채서 **주소·헤더·본문** 을 그대로 들여다본다. 응답도 진짜 모양으로 돌려주고
 * 폴링까지 태워 결과 주소가 나오는지 본다.
 *
 * 여기서 잡으려는 것(전부 조용히 틀리는 종류다):
 *   ㉠ 제출에 X-DashScope-Async 가 빠지면 100% 거절된다 — 그런데 코드는 멀쩡해 보인다
 *   ㉡ 조회에 그 헤더나 Content-Type 을 붙이면 거절된다 — 붙여야 하는 곳과 반대다
 *   ㉢ 이미지 계열은 t2i 인데 input.messages 를 받는다. prompt 로 보내면 접수는 되고
 *      나중에 FAILED 로 끝난다(파라미터 검사가 큐 뒤에 돈다) — 즉 제출 성공을 믿으면 안 된다
 *   ㉣ 결과 자리가 셋이다(video_url · results[].url · choices[].message.content[].image)
 *   ㉤ FAILED 를 실패로 안 넘기면 회원 돈만 잡아 두고 환불이 안 돈다
 *   ㉥ 베이징 호스트로 나가면 401 이다 — 우리 키는 국제판 전용이다
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

let calls = []            // 알리바바로 나간 요청 전부
let nextTask = {}         // task_id → 폴링에서 돌려줄 output

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs',
                            platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console, AbortController,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: async (url, init) => {
      const u = String(url)
      if (!/aliyuncs/.test(u)) return new Response('{}', { status: 200 })
      const method = (init && init.method) || 'GET'
      const headers = Object.fromEntries(Object.entries((init && init.headers) || {}))
      let body = null
      try { body = init && init.body ? JSON.parse(init.body) : null } catch { body = { _raw: String(init.body) } }
      calls.push({ url: u, method, headers, body })

      //  제출
      const m = u.match(/\/services\/aigc\/(.+)$/)
      if (method === 'POST' && m) {
        const tid = 'T-' + calls.length
        nextTask[tid] = nextTask.__next || { task_status: 'SUCCEEDED', video_url: 'https://ali.example/out.mp4' }
        delete nextTask.__next
        return new Response(JSON.stringify({ request_id: 'r', output: { task_id: tid, task_status: 'PENDING' } }),
                            { status: 200, headers: { 'content-type': 'application/json' } })
      }
      //  조회
      const t = u.match(/\/api\/v1\/tasks\/([^/?]+)$/)
      if (t) {
        const out2 = nextTask[t[1]] || { task_status: 'UNKNOWN' }
        return new Response(JSON.stringify({ request_id: 'r', output: { task_id: t[1], ...out2 } }),
                            { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('{}', { status: 404 })
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
const ENV = { DB: null, alibaba_API_KEY: 'sk-ws-test-key' }

function makeDB() {
  const user = { id: 'u1', email: 'a@x.co', name: '회원', role: 'user', status: 'active',
                 credits: 1_000_000, credit_price: 65, credit_markup: 0,
                 video_plan: 'Pro', video_plan_until: FUTURE, plan: 'Pro', plan_until: FUTURE }
  const state = { tokens: [] }
  const first = async (s) => {
    if (/FROM sessions s JOIN users u/i.test(s)) return { ...user }
    if (/FROM users WHERE id/i.test(s)) return { ...user }
    if (/FROM api_rate WHERE user_id/i.test(s)) return { b: 0, m: 0, h: 0, d: 0 }
    return null
  }
  const run = async (s, b) => {
    if (/INSERT INTO gen_charges/i.test(s)) state.tokens.push({ model: b[2], units: b[3] })
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
  try { parsed = JSON.parse(await res.text()) } catch { parsed = {} }
  return { status: res.status, body: parsed, calls: calls.slice(), db }
}

async function poll(statusUrl) {
  calls = []
  const res = await gen.onRequest({
    request: new Request('https://bygency.com' + statusUrl, {
      headers: { cookie: 'bg_session=t', host: 'bygency.com' },
    }),
    env: { ...ENV, DB: makeDB() }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  let parsed = {}
  try { parsed = JSON.parse(await res.text()) } catch { parsed = {} }
  return { status: res.status, body: parsed, calls: calls.slice() }
}

console.log('\n① 영상 제출 — 주소·헤더·본문이 실제로 맞는가')
{
  const r = await post({ provider: 'alibaba', model: 'Wan 2.7 (텍스트→영상)',
                         prompt: '노을 지는 해변', seconds: 5, res: '1080p', ratio: '16:9' })
  const c = r.calls[0]
  ok(!!c, '알리바바를 실제로 불렀다', JSON.stringify(r.body).slice(0, 160))
  ok(c && /^https:\/\/dashscope-intl\.aliyuncs\.com/.test(c.url),
     '국제판(싱가포르)으로 나간다 — 베이징은 우리 키로 401 이다', c && c.url)
  ok(c && /\/services\/aigc\/video-generation\/video-synthesis$/.test(c.url), '영상 경로가 맞다', c && c.url)
  ok(c && c.headers['X-DashScope-Async'] === 'enable',
     '㉠ 제출에 비동기 헤더가 붙는다 — 빠지면 100% 거절된다', JSON.stringify(c && c.headers))
  ok(c && c.body.model === 'wan2.7-t2v', '표시명이 아니라 제공사 모델 ID 로 보낸다', c && c.body.model)
  ok(c && c.body.input && c.body.input.prompt === '노을 지는 해변',
     'input.prompt 로 보낸다(실측 오류가 요구한 자리)', JSON.stringify(c && c.body.input))
  ok(c && c.body.parameters && c.body.parameters.duration === 5, '길이를 parameters.duration 으로 보낸다',
     JSON.stringify(c && c.body.parameters))
  ok(!!r.body.statusUrl && /provider=alibaba/.test(r.body.statusUrl), '폴링 주소를 돌려준다', r.body.statusUrl)
  ok(r.db.__state.tokens.length === 1, '과금 토큰을 발급한다 — 없으면 생성만 되고 청구가 안 된다',
     String(r.db.__state.tokens.length))
}

console.log('\n② 영상 폴링 — 결과 주소를 꺼내고 조회 헤더를 더럽히지 않는다')
{
  const s = await post({ provider: 'alibaba', model: 'Wan 2.7 (텍스트→영상)', prompt: 'x', seconds: 5 })
  const r = await poll(s.body.statusUrl)
  const c = r.calls[0]
  ok(r.body.url === 'https://ali.example/out.mp4', 'output.video_url 을 꺼낸다', JSON.stringify(r.body))
  ok(r.body.kind === 'video', '영상으로 표시한다', String(r.body.kind))
  ok(c && !c.headers['X-DashScope-Async'], '㉡ 조회에는 비동기 헤더를 안 붙인다(붙이면 거절된다)',
     JSON.stringify(c && c.headers))
  ok(c && !c.headers['Content-Type'], '㉡ 조회에는 Content-Type 도 안 붙인다', JSON.stringify(c && c.headers))
}

console.log('\n③ 이미지 — t2i 인데 대화형(messages) 이다')
{
  const r = await post({ provider: 'alibaba', model: 'Wan 2.7 이미지 Pro', prompt: '빨간 사과', ratio: '1:1' })
  const c = r.calls[0]
  ok(c && /\/services\/aigc\/image-generation\/generation$/.test(c.url), '이미지 비동기 경로로 간다', c && c.url)
  const msgs = c && c.body.input && c.body.input.messages
  ok(Array.isArray(msgs) && msgs[0] && msgs[0].role === 'user',
     '㉢ input.messages 로 보낸다 — prompt 로 보내면 접수만 되고 나중에 FAILED 로 끝난다',
     JSON.stringify(c && c.body.input))
  ok(Array.isArray(msgs && msgs[0].content) && msgs[0].content.some((e) => e.text === '빨간 사과'),
     'content 안에 {text} 로 들어간다', JSON.stringify(msgs && msgs[0].content))
}

console.log('\n③-b 구형 이미지(wan2.1/2.2)는 옛 경로 · 평평한 prompt')
{
  const r = await post({ provider: 'alibaba', model: 'Wan 2.1 Turbo (텍스트→이미지)', prompt: '사과', ratio: '16:9' })
  const c = r.calls[0]
  ok(c && /\/services\/aigc\/text2image\/image-synthesis$/.test(c.url), '옛 t2i 경로로 간다', c && c.url)
  ok(c && c.body.input.prompt === '사과' && !c.body.input.messages, '평평한 prompt 로 보낸다',
     JSON.stringify(c && c.body.input))
  ok(c && c.body.parameters.size === '1664*928',
     '비율을 가로*세로로 바꿔 보낸다 — 비율만 주면 회원이 고른 값이 조용히 무시된다',
     JSON.stringify(c && c.body.parameters))
}

console.log('\n④ 결과 자리가 셋이다 — 셋 다 꺼낸다')
{
  //  구형 이미지: output.results[].url
  nextTask.__next = { task_status: 'SUCCEEDED', results: [{ url: 'https://ali.example/a.png' }] }
  let s = await post({ provider: 'alibaba', model: 'Wan 2.1 Turbo (텍스트→이미지)', prompt: 'x' })
  let r = await poll(s.body.statusUrl)
  ok(r.body.url === 'https://ali.example/a.png', 'output.results[].url', JSON.stringify(r.body))
  ok(r.body.kind === 'image', '이미지로 표시한다', String(r.body.kind))

  //  대화형 이미지: output.choices[].message.content[].image
  nextTask.__next = { task_status: 'SUCCEEDED',
                      choices: [{ message: { content: [{ text: '설명' }, { image: 'https://ali.example/b.png' }] } }] }
  s = await post({ provider: 'alibaba', model: 'Wan 2.7 이미지 Pro', prompt: 'x' })
  r = await poll(s.body.statusUrl)
  ok(r.body.url === 'https://ali.example/b.png', 'output.choices[].message.content[].image', JSON.stringify(r.body))
}

console.log('\n⑤ 실패를 실패로 넘긴다 — 안 그러면 환불이 안 돈다')
{
  for (const [st, why] of [['FAILED', '파라미터 검사가 큐 뒤에 돌아 나중에 실패한다'],
                           ['UNKNOWN', '없는 작업을 성공으로 보면 안 된다'],
                           ['CANCELED', '취소도 결과가 아니다']]) {
    nextTask.__next = { task_status: st, message: 'Field required: input.prompt' }
    const s = await post({ provider: 'alibaba', model: 'Wan 2.7 (텍스트→영상)', prompt: 'x', seconds: 5 })
    const r = await poll(s.body.statusUrl)
    /* ⚠ status 만 보면 안 된다. 명시적으로 처리하지 않아도 "FAILED".toLowerCase() 가
       'failed' 라서 그냥 통과해 버린다 — 실제로 이 검사가 그렇게 헛통과했다.
       왜 실패했는지(error)까지 실려야 화면에도 뜨고 환불 사유로도 남는다. */
    ok(r.body.status === 'failed' && !r.body.url && !!r.body.error,
       `${st} → 실패로 넘기고 이유까지 싣는다 (${why})`, JSON.stringify(r.body))
  }
  //  아직 도는 중인 것을 실패로 만들면 멀쩡한 생성이 환불되고 끊긴다
  nextTask.__next = { task_status: 'RUNNING' }
  const s = await post({ provider: 'alibaba', model: 'Wan 2.7 (텍스트→영상)', prompt: 'x', seconds: 5 })
  const r = await poll(s.body.statusUrl)
  ok(r.body.status === 'running' && !r.body.url && !/failed/.test(String(r.body.status)),
     'RUNNING 은 실패가 아니다', JSON.stringify(r.body))
}

console.log('\n⑥ 모르는 모델·키 없음은 제공사를 부르기 전에 막는다')
{
  const r = await post({ provider: 'alibaba', model: '있지도 않은 모델', prompt: 'x' })
  ok(r.calls.length === 0, '없는 모델이면 부르지 않는다', JSON.stringify(r.calls.map((c) => c.url)))
  ok(/없는 모델/.test(String(r.body.error)), '왜 안 되는지 알려 준다', String(r.body.error))
}

console.log('\n⑦ r2v 는 media 배열을 따로 요구한다(실측 오류가 그렇게 말했다)')
{
  const r = await post({ provider: 'alibaba', model: 'Wan 2.7 (레퍼런스→영상)', prompt: 'x',
                         seconds: 5, refImages: ['https://x/1.png', 'https://x/2.png'] })
  const c = r.calls[0]
  const media = c && c.body.input && c.body.input.media
  ok(Array.isArray(media) && media.length === 2 && media[0].url === 'https://x/1.png',
     'input.media 로 레퍼런스를 보낸다', JSON.stringify(c && c.body.input))
}

console.log(failed === 0
  ? '\n알리바바 생성 경로 — 실패 0 (제출 형식 · 폴링 · 결과 3자리 · 실패 처리 · 과금 토큰)'
  : `\n실패 ${failed}건`)
process.exit(failed ? 1 : 0)
