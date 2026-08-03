/* 미디어 서빙 접근 범위 회귀 테스트 —  node scripts/media-access.test.mjs
 *
 * /api/media 와 /api/videos/file 은 둘 다 인증이 없다. 키를 URL 에서 그대로 받아
 * R2 에 넘기므로, 무엇을 내보낼지 문 앞에서 막지 않으면 버킷 안 전부가 나간다.
 *
 * 실제로 그랬다. 발신번호 승인 서류(sender-docs/ — 신분증·사업자등록증)는
 *   · /api/media       → 404 로 막혀 있었고
 *   · /api/sender/doc  → 로그인 + 본인/관리자 확인이 걸려 있었는데
 *   · /api/videos/file → 아무 확인 없이 200 으로 그대로 내보냈다.
 * 쿠키 하나 없이 서류 내용이 나오는 것을 실측으로 확인했다. 인증 검사를 통째로
 * 우회하는 문이었다. Access-Control-Allow-Origin: * 라 남의 사이트에서도 읽혔다.
 *
 * 그래서 여기서는 "이 키는 나가도 되는가" 만 본다. 구간 요청(Range)의 정확성은
 * scripts/media-range.test.mjs 가 따로 본다.
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

const SECRET = '주민등록증-스캔본-절대-공개-금지'
const DOC_KEY = 'sender-docs/1/7/idcard_1754000000000_ab12cd34.png'
const VIDEO_KEY = 'videos/9/1754000000000-a1b2c3d4e5f6.mp4'
const STUDIO_KEY = 'studio/9/result.png'

/* 버킷에는 서류도 영상도 스튜디오 결과물도 함께 들어 있다 — 실제와 같다. */
function makeR2() {
  const files = {
    [DOC_KEY]: { body: SECRET, ct: 'image/png' },
    [VIDEO_KEY]: { body: 'VIDEO-BYTES', ct: 'video/mp4' },
    [STUDIO_KEY]: { body: 'PNG-BYTES', ct: 'image/png' },
  }
  return {
    async put() { return {} },
    async list() { return { objects: [] } },
    async head() { return null },
    async get(key) {
      const f = files[key]
      if (!f) return null
      const bytes = new TextEncoder().encode(f.body)
      return { size: bytes.length, httpMetadata: { contentType: f.ct }, body: bytes, range: undefined }
    },
  }
}

/* R2 가 없을 때 /api/media 가 쓰는 D1 폴백에도 같은 서류가 들어 있다고 본다.
   앞문만 막고 뒷문이 열려 있으면 소용이 없다. */
function makeD1() {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (/media_blobs/.test(sql) && args[0] === DOC_KEY)
                return { content_type: 'image/png', data: new TextEncoder().encode(SECRET), size: SECRET.length }
              return null
            },
            async run() { return { meta: {} } },
            async all() { return { results: [] } },
          }
        },
        async first() { return null },
        async run() { return { meta: {} } },
        async all() { return { results: [] } },
      }
    },
    async batch() { return [] },
    async dump() { return new ArrayBuffer(0) },
  }
}

const mediaMod = await load('functions/api/media/[[key]].ts')
const videosMod = await load('functions/api/videos/file/[[key]].ts')

async function call(mod, base, key, env) {
  const res = await mod.onRequestGet({
    request: new Request(base + key),
    env,
    params: { key: key.split('/') },
    waitUntil: () => {}, next: async () => new Response(''),
  })
  const text = await res.text()
  return { status: res.status, text }
}

const media = (key, env = { BUCKET: makeR2() }) => call(mediaMod, 'https://bygency.com/api/media/', key, env)
const videos = (key, env = { BUCKET: makeR2() }) => call(videosMod, 'https://bygency.com/api/videos/file/', key, env)

console.log('\n① 승인 서류는 어느 공개 경로로도 나가지 않는다')
{
  const a = await media(DOC_KEY)
  ok(a.status === 404, '/api/media — 404 다', String(a.status))
  ok(!a.text.includes(SECRET), '/api/media — 서류 내용이 본문에 없다')

  const b = await videos(DOC_KEY)
  ok(b.status === 404, '/api/videos/file — 404 다(여기가 뚫려 있었다)', String(b.status))
  ok(!b.text.includes(SECRET), '/api/videos/file — 서류 내용이 본문에 없다')
}

console.log('\n② R2 가 없어 D1 폴백으로 가도 서류는 막힌다')
{
  const a = await media(DOC_KEY, { DB: makeD1() })
  ok(a.status === 404, '/api/media D1 폴백 — 404 다', String(a.status))
  ok(!a.text.includes(SECRET), 'D1 폴백으로도 서류 내용이 새지 않는다')
}

console.log('\n③ 대소문자를 바꿔도 막힌다')
{
  const a = await media(DOC_KEY.replace('sender-docs', 'Sender-Docs'))
  ok(a.status === 404, '/api/media — Sender-Docs/ 도 404 다', String(a.status))
  const b = await videos(DOC_KEY.replace('sender-docs', 'Sender-Docs'))
  ok(b.status === 404, '/api/videos/file — Sender-Docs/ 도 404 다', String(b.status))
}

console.log('\n④ /api/videos/file 은 영상 보관함 밖으로는 아무것도 안 내보낸다')
{
  const a = await videos(STUDIO_KEY)
  ok(a.status === 404, '스튜디오 결과물도 이 문으로는 안 나간다', String(a.status))
  const b = await videos('videos/../sender-docs/x.png')
  ok(b.status === 404, '상위 경로로 빠져나가려 해도 404 다', String(b.status))
}

console.log('\n⑤ 정상 콘텐츠는 그대로 나간다 (막느라 기능을 죽이지 않았다)')
{
  const a = await videos(VIDEO_KEY)
  ok(a.status === 200, '보관함 영상은 200 이다', String(a.status))
  ok(a.text.includes('VIDEO-BYTES'), '보관함 영상 본문이 온다')

  const b = await media(STUDIO_KEY)
  ok(b.status === 200 && b.text.includes('PNG-BYTES'), '/api/media 는 스튜디오 결과물을 그대로 준다',
     `${b.status}`)
  const c = await media(VIDEO_KEY)
  ok(c.status === 200 && c.text.includes('VIDEO-BYTES'), '/api/media 는 영상도 그대로 준다', `${c.status}`)
}

console.log(failed === 0 ? '\n미디어 접근 범위 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
