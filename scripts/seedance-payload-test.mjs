// Seedance 2.0 에 '실제로 나가는' 요청을 서버 코드(buildSeedancePayload) 그대로 불러 검증한다.
//  확인 대상: 첫 프레임이 first_frame 역할로 가는가 / 레퍼런스가 함께(그리고 중복 없이) 가는가 /
//            프롬프트의 @ImageN 번호가 실제로 보내는 레퍼런스 순서와 맞는가.
//  실행:  node scripts/seedance-payload-test.mjs
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// generate.js 는 Pages Functions 용 ESM 이라 그대로는 import 되지 않는다 →
// 임시 폴더에 .mjs 로 복사하고 의존 모듈만 최소 스텁으로 채워 불러온다.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seedpay-'))
fs.mkdirSync(path.join(dir, 'studio')); fs.mkdirSync(path.join(dir, 'payments'))
fs.writeFileSync(path.join(dir, '_utils.mjs'), 'export const getSessionUser=()=>null, resolveDB=()=>null, getUserByMcpToken=()=>null;\n')
fs.writeFileSync(path.join(dir, '_apikeys.mjs'), 'export const getUserByApiKey=()=>null, enforceRateLimit=()=>null, ensureApiKeysSchema=()=>null;\n')
fs.writeFileSync(path.join(dir, 'studio/_pricing.mjs'), 'export const MODEL_COST={}, computeCharge=()=>({}), getUsdKrw=async()=>1400, resolveMarkup=async()=>1, resolveRefSurcharge=async()=>0, resolveCnSurcharge=async()=>0;\n')
fs.writeFileSync(path.join(dir, 'payments/prepare.mjs'), 'export const creditPriceFor=async()=>50;\n')
fs.writeFileSync(path.join(dir, 'gen.mjs'), fs.readFileSync('functions/api/generate.js', 'utf8')
  .replace('from "./_utils"', 'from "./_utils.mjs"')
  .replace('from "./_apikeys"', 'from "./_apikeys.mjs"')
  .replace('from "./studio/_pricing"', 'from "./studio/_pricing.mjs"')
  .replace('from "./payments/prepare"', 'from "./payments/prepare.mjs"'))

const { buildSeedancePayload } = await import(path.join(dir, 'gen.mjs'))

const IMG = (n) => 'data:image/jpeg;base64,AAAA' + n
const A = IMG('A'), B = IMG('B'), C = IMG('C')
const tail = (u) => String(u || '').slice(-1)
const roleOf = (p, role) => (p.content || []).filter((x) => x.role === role).map((x) => tail(x.image_url?.url || x.video_url?.url))
const promptOf = (p) => (p.content || []).find((x) => x.type === 'text')?.text || ''

const out = []
const ok = (name, cond, info) => out.push([name, !!cond, info == null ? '' : String(info)])

// 1) 첫 프레임 1장 + 배경사진 2장 — 스튜디오가 보내는 형태
{
  const p = buildSeedancePayload({ model: 'Seedance 2.0', prompt: '테스트', seconds: 5, firstFrame: A, refImages: [B, C] }, {})
  const first = roleOf(p, 'first_frame'), refs = roleOf(p, 'reference_image')
  const tags = (promptOf(p).match(/@Image\d/g) || [])
  ok('첫 프레임이 first_frame 역할로 전송', first.length === 1 && first[0] === 'A', first.join(','))
  ok('레퍼런스도 함께 전송(첫 프레임 제외)', refs.join(',') === 'B,C', refs.join(','))
  ok('@Image 번호 개수 = 레퍼런스 개수', new Set(tags).size === refs.length, tags.join(','))
}
// 2) 레퍼런스만 (첫 프레임 지정 안 함) — i2v 모드로 새지 않아야 한다
{
  const p = buildSeedancePayload({ model: 'Seedance 2.0', prompt: '테스트', seconds: 5, firstFrame: null, refImages: [A, B, C] }, {})
  ok('첫 프레임 미지정 시 first_frame 없음', roleOf(p, 'first_frame').length === 0)
  ok('레퍼런스 3장 모두 전송', roleOf(p, 'reference_image').join(',') === 'A,B,C', roleOf(p, 'reference_image').join(','))
}
// 3) 첫 프레임이 레퍼런스 목록에도 들어온 경우 — 같은 그림이 두 역할로 중복 전송되면 안 된다
{
  const p = buildSeedancePayload({ model: 'Seedance 2.0', prompt: '테스트', seconds: 5, firstFrame: A, refImages: [A, B, C] }, {})
  const refs = roleOf(p, 'reference_image')
  ok('첫 프레임은 레퍼런스에서 제외(중복 전송 없음)', refs.indexOf('A') < 0 && refs.join(',') === 'B,C', refs.join(','))
}
// 4) 마지막 프레임은 첫 프레임이 있을 때만 유효
{
  const p = buildSeedancePayload({ model: 'Seedance 2.0', prompt: '테스트', seconds: 5, firstFrame: null, lastFrame: B, refImages: [A] }, {})
  ok('첫 프레임 없이 마지막 프레임만 오면 무시', roleOf(p, 'last_frame').length === 0)
}
// 5) 사용자가 프롬프트에 직접 @태그를 쓰면 자동 안내문을 덧붙이지 않는다
{
  const p = buildSeedancePayload({ model: 'Seedance 2.0', prompt: '@Image1 을 배경으로', seconds: 5, refImages: [A, B] }, {})
  ok('사용자 @태그 사용 시 자동 안내문 미추가', !/레퍼런스 바인딩/.test(promptOf(p)), promptOf(p).slice(0, 40))
}

fs.rmSync(dir, { recursive: true, force: true })
let fail = 0
for (const [name, pass, info] of out) { if (!pass) fail++; console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  — ' + info : '')) }
console.log(`\n${out.length - fail}/${out.length} passed`)
process.exit(fail ? 1 : 0)
