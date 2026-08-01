/* 미디어 서빙 구간 요청(Range) 회귀 테스트 —  node scripts/media-range.test.mjs
 *
 * /api/media 는 스튜디오 생성물·보관함·광고 영상을 모두 내보내는 자리다.
 * 영상에는 재생 컨트롤이 붙어 있어 사용자가 타임라인을 끈다 — 그때 브라우저는 Range 를 보낸다.
 * 서버가 구간을 안 주면 끌 때마다 파일을 통째로 다시 받거나 아예 탐색이 안 된다.
 *
 * 실제로 그랬다: R2 의 range 옵션에 "bytes=0-1023" 같은 문자열을 넘기고 있었는데,
 * 규격은 {offset,length,suffix} 또는 Headers 만 받는다. 문자열은 무시되거나 예외가 나서
 * 전체 파일 응답으로 흘렀다 — Accept-Ranges: bytes 라고 알려 놓고 100바이트를 요청하면
 * 95,016바이트가 오는 상태였다(실측).
 *
 * 그래서 여기서는 R2 규격을 그대로 지키는 가짜 버킷을 두고 진짜 핸들러를 돌린다.
 * 핸들러가 문자열을 넘기면 가짜 버킷이 규격 위반으로 거절하므로 그 자리에서 잡힌다.
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

const SIZE = 95016
const DATA = new Uint8Array(SIZE)
for (let i = 0; i < SIZE; i++) DATA[i] = (i * 7 + 13) & 0xff   // 구간이 맞는지 볼 수 있게 위치마다 다른 값

/* R2 규격대로만 동작하는 가짜 버킷.
   range 로 문자열이 오면 규격 위반이므로 던진다 — 실제 R2 도 그 값을 구간으로 해석해 주지 않는다. */
function makeR2(only = 'u/ad.webm') {
  return {
    //  isLikelyR2 는 get·put·list·head 가 다 있어야 R2 로 본다 — 실제 판별 조건에 맞춘다
    async put() { return {} },
    async list() { return { objects: [] } },
    async head() { return null },
    async get(key, opts) {
      if (key !== only) return null
      let offset = 0
      let length = SIZE
      const r = opts && opts.range
      if (r != null) {
        if (typeof r === 'string') throw new TypeError('R2 range 는 문자열을 받지 않는다 — {offset,length} 또는 Headers 여야 한다')
        if (typeof r.get === 'function') {
          //  Headers → R2 가 직접 Range 헤더를 해석하는 경로
          const h = String(r.get('Range') || '')
          const m = /^bytes=(\d*)-(\d*)$/.exec(h.trim())
          if (!m) throw new RangeError('해석할 수 없는 Range: ' + h)
          if (m[1] === '') { length = Math.min(Number(m[2]), SIZE); offset = SIZE - length }
          else { offset = Number(m[1]); length = (m[2] === '' ? SIZE - offset : Number(m[2]) - offset + 1) }
        } else if (r.suffix != null) { length = Math.min(Number(r.suffix), SIZE); offset = SIZE - length }
        else { offset = Number(r.offset) || 0; length = r.length != null ? Number(r.length) : SIZE - offset }
        if (offset < 0 || offset >= SIZE || length <= 0) throw new RangeError('범위를 벗어났다')
        length = Math.min(length, SIZE - offset)
      }
      const slice = DATA.slice(offset, offset + length)
      return {
        size: SIZE,
        httpMetadata: { contentType: 'video/webm' },
        range: opts && opts.range != null ? { offset, length } : undefined,
        body: slice,
        __slice: slice,
      }
    },
  }
}

/* 영상을 내보내는 자리는 둘이다 — 광고·스튜디오·보관함의 /api/media 와
   제작 영상 보관함의 /api/videos/file. 둘 다 같은 방식으로 깨져 있었으므로 같이 본다. */
const ENDPOINTS = [
  {
    label: '/api/media',
    mod: await load('functions/api/media/[[key]].ts'),
    url: 'https://bygency.com/api/media/u/ad.webm',
    key: 'u/ad.webm',
    params: { key: ['u', 'ad.webm'] },
  },
  {
    label: '/api/videos/file',
    mod: await load('functions/api/videos/file/[[key]].ts'),
    url: 'https://bygency.com/api/videos/file/u/ad.webm',
    key: 'u/ad.webm',
    params: { key: ['u', 'ad.webm'] },
  },
]

async function get(ep, rangeHeader) {
  const headers = rangeHeader ? { Range: rangeHeader } : undefined
  const request = new Request(ep.url, { headers })
  const res = await ep.mod.onRequestGet({
    request, env: { BUCKET: makeR2(ep.key) }, params: ep.params,
    waitUntil: () => {}, next: async () => new Response(''),
  })
  const buf = new Uint8Array(await res.arrayBuffer())
  return { status: res.status, headers: res.headers, body: buf }
}

for (const ep of ENDPOINTS) {
  console.log(`\n===== ${ep.label} =====`)

  console.log('\n① Range 없는 요청은 전체 파일을 200 으로 준다')
  {
    const r = await get(ep)
    ok(r.status === 200, '200 이다', String(r.status))
    ok(r.headers.get('Content-Length') === String(SIZE), '전체 길이를 알려 준다', r.headers.get('Content-Length'))
    ok(r.headers.get('Accept-Ranges') === 'bytes', '구간 요청을 받는다고 알린다')
    ok(r.body.length === SIZE, '본문이 전체다', `${r.body.length}바이트`)
  }

  console.log('\n② 구간 요청에는 206 과 그 구간만 준다')
  {
    const r = await get(ep, 'bytes=0-1023')
    ok(r.status === 206, '206 Partial Content 다(200 이면 탐색이 깨진다)', String(r.status))
    ok(r.headers.get('Content-Range') === `bytes 0-1023/${SIZE}`, 'Content-Range 가 정확하다', r.headers.get('Content-Range'))
    ok(r.headers.get('Content-Length') === '1024', '길이가 구간 크기다', r.headers.get('Content-Length'))
    ok(r.body.length === 1024, '본문이 요청한 만큼만 온다', `${r.body.length}바이트`)
    ok([...r.body].every((v, i) => v === DATA[i]), '본문이 실제로 그 구간의 바이트다')
  }

  console.log('\n③ 뒤로 탐색(끝 열린 구간)도 정확하다')
  {
    const from = 50000
    const r = await get(ep, `bytes=${from}-`)
    ok(r.status === 206, '206 이다', String(r.status))
    ok(r.headers.get('Content-Range') === `bytes ${from}-${SIZE - 1}/${SIZE}`, 'Content-Range 가 끝까지다', r.headers.get('Content-Range'))
    ok(r.body.length === SIZE - from, '남은 길이만큼 온다', `${r.body.length}바이트`)
    ok([...r.body].every((v, i) => v === DATA[from + i]), '본문이 그 지점부터의 바이트다')
  }

  console.log('\n④ 중간 구간도 정확하다 (타임라인 가운데를 끌었을 때)')
  {
    const r = await get(ep, 'bytes=100-199')
    ok(r.status === 206 && r.body.length === 100, '100바이트 구간이 온다', `${r.status} · ${r.body.length}바이트`)
    ok([...r.body].every((v, i) => v === DATA[100 + i]), '본문이 100~199 구간과 정확히 같다')
  }

  console.log('\n⑤ 이상한 Range 는 전체 파일로 안전하게 떨어진다')
  {
    const r = await get(ep, 'bytes=abc')
    ok(r.status === 200 && r.body.length === SIZE, '해석 못 하는 Range 면 전체를 200 으로 준다(오류로 끊지 않는다)',
       `${r.status} · ${r.body.length}바이트`)
    /* 206 인데 Content-Range 가 없으면 규격 위반이다 — 브라우저가 재생을 포기한다. */
    ok(!(r.status === 206 && !r.headers.get('Content-Range')), 'Content-Range 없는 206 을 내보내지 않는다')
  }

  console.log('\n⑥ 없는 파일은 404 다 (전체 파일 폴백으로 새지 않는다)')
  {
    const request = new Request(ep.url.replace('ad.webm', 'none.webm'), { headers: { Range: 'bytes=0-99' } })
    const res = await ep.mod.onRequestGet({
      request, env: { BUCKET: makeR2(ep.key) }, params: { key: ['u', 'none.webm'] },
      waitUntil: () => {}, next: async () => new Response(''),
    })
    ok(res.status === 404, '404 다', String(res.status))
  }
}

console.log(failed === 0 ? '\n미디어 구간 요청 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
