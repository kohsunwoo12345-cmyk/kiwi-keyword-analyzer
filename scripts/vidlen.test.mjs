/* MP4 길이 파서 검증 — ffmpeg 없이, 실제 파일 구조를 바이트로 지어 놓고 되읽는다.
 *
 * 원본 영상 길이는 과금 기준이다(업스케일·나레이션·V2V 등 8종). 그동안은 클라이언트가
 * 신고한 값을 그대로 믿었다. 서버가 직접 재려면 MP4 의 moov→mvhd 를 읽어야 하는데,
 * 이런 바이너리 파서를 "돌려보지 않고" 과금 경로에 넣는 것만큼 위험한 게 없다.
 * 그래서 규격대로 파일을 지어 넣어 본다 — 실제로 나오는 변형을 전부:
 *   · mvhd v0(32비트) / v1(64비트)
 *   · moov 가 앞(faststart) / 뒤(일반 인코더)
 *   · 64비트 크기 박스(size=1) · size=0(파일 끝까지)
 *   · moov 가 없는 파일 · 잘린 파일 · 쓰레기 바이트 → null 이어야 한다(무한루프·오판 금지)
 */
import { buildSync } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require_ = createRequire(import.meta.url)
const ROOT = '/home/user/kiwi-keyword-analyzer/'

function load(file) {
  const out = buildSync({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs',
                          platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console, fetch,
                    AbortController, setTimeout, clearTimeout, TextEncoder, TextDecoder }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}
const { parseMp4Duration } = load('functions/api/studio/_vidlen.ts')

// ── 바이트로 MP4 박스를 짓는 도구 ──
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b }
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b }
const box = (type, ...parts) => {
  const body = Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p))))
  return Buffer.concat([u32(body.length + 8), Buffer.from(type, 'latin1'), body])
}
/** 64비트 크기(largesize) 형식 박스 — 대용량 mdat 에서 실제로 쓰인다 */
const box64 = (type, ...parts) => {
  const body = Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p))))
  return Buffer.concat([u32(1), Buffer.from(type, 'latin1'), u64(body.length + 16), body])
}
const mvhdV0 = (timescale, duration) =>
  box('mvhd', Buffer.from([0, 0, 0, 0]), u32(0), u32(0), u32(timescale), u32(duration), Buffer.alloc(80))
const mvhdV1 = (timescale, duration) =>
  box('mvhd', Buffer.from([1, 0, 0, 0]), u64(0), u64(0), u32(timescale), u64(duration), Buffer.alloc(80))
const ftyp = () => box('ftyp', 'isom', u32(512), 'isomiso2avc1mp41')
const mdat = (n) => box('mdat', Buffer.alloc(n, 0x11))

const fails = []
const check = (name, bytes, want) => {
  let got
  try { got = parseMp4Duration(new Uint8Array(bytes)) } catch (e) { got = '예외: ' + e.message }
  const ok = want === null ? got === null
                           : typeof got === 'number' && Math.abs(got - want) < 0.001
  if (!ok) fails.push(`${name} — 기대 ${want} · 실제 ${got}`)
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(46)} → ${got === null ? 'null' : typeof got === 'number' ? got.toFixed(3) + '초' : got}`)
}

// ── 정상 파일들 ──
check('v0 · moov 앞 (faststart) · 30000/1001 fps 기준 10초',
      Buffer.concat([ftyp(), box('moov', mvhdV0(30000, 300000)), mdat(2000)]), 10)
check('v1(64비트) · moov 앞 · 8.5초',
      Buffer.concat([ftyp(), box('moov', mvhdV1(1000, 8500)), mdat(2000)]), 8.5)
check('moov 뒤 (일반 인코더) · 12초',
      Buffer.concat([ftyp(), mdat(4000), box('moov', mvhdV0(600, 7200))]), 12)
check('mvhd 가 trak 안쪽까지 들어간 구조 · 5초',
      Buffer.concat([ftyp(), box('moov', box('trak', box('mdia', mvhdV0(1000, 5000))))]), 5)
check('64비트 크기 mdat 을 건너뛰고 뒤 moov 찾기 · 3.2초',
      Buffer.concat([ftyp(), box64('mdat', Buffer.alloc(1000)), box('moov', mvhdV0(1000, 3200))]), 3.2)
check('아주 긴 영상 (1시간)',
      Buffer.concat([ftyp(), box('moov', mvhdV0(1000, 3600000))]), 3600)

// ── 읽으면 안 되는(=null 이어야 하는) 것들 ──
check('moov 가 없는 파일', Buffer.concat([ftyp(), mdat(500)]), null)
check('빈 바이트', Buffer.alloc(0), null)
check('쓰레기 바이트', Buffer.from('이건 영상이 아니다 그냥 텍스트다'), null)
check('mvhd 가 잘린 파일', Buffer.concat([ftyp(), box('moov', Buffer.concat([u32(60), Buffer.from('mvhd'), Buffer.alloc(8)]))]), null)
check('timescale 이 0 (0 나누기)', Buffer.concat([ftyp(), box('moov', mvhdV0(0, 1000))]), null)
check('박스 크기가 헤더보다 작음 (무한루프 유발)',
      Buffer.concat([Buffer.concat([u32(3), Buffer.from('moov')]), mvhdV0(1000, 1000)]), null)
// webm 은 못 읽는 게 맞다 — 신고값으로 물러나야 한다
check('webm (EBML) — 못 읽는 게 정상', Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(200)]), null)

// ── 무한루프 방지: 크기 0 박스가 뒤에 있어도 끝난다 ──
{
  const t0 = Date.now()
  const weird = Buffer.concat([ftyp(), Buffer.concat([u32(0), Buffer.from('free')]), Buffer.alloc(1000)])
  try { parseMp4Duration(new Uint8Array(weird)) } catch { /* 예외는 위에서 잡힌다 */ }
  const ms = Date.now() - t0
  const ok = ms < 500
  if (!ok) fails.push(`크기 0 박스에서 ${ms}ms — 멈추지 않는다`)
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${'크기 0 박스에서도 즉시 끝난다'.padEnd(46)} → ${ms}ms`)
}

console.log(fails.length === 0 ? '\nMP4 길이 파서 — 실패 0' : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
