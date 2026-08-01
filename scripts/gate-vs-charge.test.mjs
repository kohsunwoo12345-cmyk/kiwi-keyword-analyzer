/* 사전 잔액 게이트가 말한 "필요 크레딧" 과 실제로 빠지는 금액이 같아야 한다.
 *
 * 둘이 어긋나면 두 방향 모두 나쁘다.
 *   게이트가 적게 잡으면 → "충분합니다" 하고 통과시킨 뒤 더 크게 빠져 잔액이 음수가 된다.
 *   게이트가 많이 잡으면 → 잔액이 충분한 사람을 "크레딧 부족" 으로 막는다.
 * 실제로 게이트만 ratio·refs·hdr·exr 을 빼고 계산하고 있었고, hdr 은 필드 이름까지 달랐다
 * (스튜디오는 lumaHdr 로 보내는데 게이트는 pbody.hdr 을 봤다 → 루마 HDR 이 표준 요금으로 잡혔다).
 *
 * 게이트가 토큰에 적어 둔 값(=차감의 근거)과, 게이트가 계산한 need 를 같은 식으로 대조한다.
 */
import { buildSync } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require_ = createRequire(import.meta.url)
/* 저장소 위치는 체크아웃마다 다르다 — 배포 서버는 /home/user 가 아니다.
   빌드가 npm test 를 먼저 돌리므로, 경로를 박아 두면 그 서버에서 테스트가 파일을 못 찾아
   빌드 자체가 죽는다. 이 파일 위치에서 저장소 뿌리를 구한다. */
const ROOT = new URL('../', import.meta.url).pathname

function load(file) {
  const out = buildSync({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs',
                          platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console, AbortController, Response, Request,
                    Headers, URL, TextEncoder, TextDecoder, crypto, fetch, btoa, atob, setTimeout, clearTimeout, structuredClone }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

const gen = load('functions/api/generate.js')
const pricing = load('functions/api/studio/_pricing.ts')

/* 게이트가 하는 계산을 그대로 재현한다 — generate.js 원문에서 확인한 순서다.
   (여기서 손으로 다른 식을 쓰면 대조가 아니라 창작이 된다) */
function gateNeed(pbody, rate, mk, ckw, surPct, cnPct) {
  const MODEL_COST = pricing.MODEL_COST
  const asked = String(pbody.model || '')
  const mdl = MODEL_COST[asked] ? asked : asked
  if (!mdl || !MODEL_COST[mdl]) return null
  const isImg = MODEL_COST[mdl].u !== 'sec'
  const units = isImg ? 1 : gen.effectiveUnits({ ...pbody, model: mdl }, {})
  const res = isImg ? undefined : gen.effectiveRes({ ...pbody, model: mdl }, {})
  const flags = gen.effectiveFlags({ ...pbody, model: mdl,
                                     hdr: pbody.hdr === true || pbody.lumaHdr === true,
                                     exr: pbody.exr === true || pbody.lumaExr === true })
  const ratio = gen.effectiveRatio({ ...pbody, model: mdl })
  const refs = Array.isArray(pbody.refImages) ? pbody.refImages.length
             : Math.max(0, Number(pbody.refCount) || Number(pbody.refs) || 0)
  const cn = Math.max(0, (pbody.controlnets && pbody.controlnets.length) || Number(pbody.cn) || 0)
  const cc = pricing.computeCharge({ model: mdl, units, res, audio: !!pbody.generateAudio,
                                     refs, hdr: flags.hdr, exr: flags.exr, ratio }, rate, mk, ckw)
  const need = Math.round(cc.credits * (1 + (surPct / 100) * refs) * (cn > 0 ? 1 + cnPct / 100 : 1) * 100) / 100
  //  토큰에 담기는 값 = 차감의 근거
  return { need, spec: { model: mdl, units, res, audio: !!pbody.generateAudio, ratio, refs, cn, hdr: flags.hdr, exr: flags.exr } }
}

/* 차감(settleGenCharge)이 토큰 값으로 내는 금액 — 실제 코드의 식과 같아야 한다. */
function chargeFromSpec(spec, rate, mk, ckw, surPct, cnPct) {
  const c = pricing.computeCharge({ model: spec.model, units: spec.units, res: spec.res, audio: !!spec.audio,
                                    ratio: spec.ratio, refs: spec.refs || 0, hdr: !!spec.hdr, exr: !!spec.exr },
                                  rate, mk, ckw)
  return Math.round(c.credits * (1 + (surPct / 100) * (spec.refs || 0)) * ((spec.cn || 0) > 0 ? 1 + cnPct / 100 : 1) * 100) / 100
}

const RATE = 1400, MK = undefined, CKW = 50, SUR = 0.5, CN = 10
const CASES = []
for (const model of Object.keys(pricing.MODEL_COST)) {
  const isSec = pricing.MODEL_COST[model].u === 'sec'
  for (const extra of [
    {},
    { lumaHdr: true },                      // 스튜디오가 실제로 쓰는 이름
    { lumaHdr: true, lumaExr: true },
    { hdr: true, exr: true },               // API 가 쓰는 이름
    { ratio: '3:2' }, { ratio: '7:3' },     // 표에 있는 비율 / 없는 비율
    { refCount: 3 }, { refImages: ['a', 'b', 'c', 'd'] },
    { controlnets: [1, 2] }, { generateAudio: true },
  ]) {
    CASES.push({ model, prompt: 't', seconds: isSec ? 10 : undefined,
                 res: isSec ? '1080p' : undefined, ...extra })
  }
}

const fails = []

/* 위 재현식은 내가 손으로 옮긴 것이라, 원본이 바뀌어도 이 파일만 그대로면 통과해 버린다.
   그래서 원본 게이트가 정말 그 값들을 쓰는지 소스에서 직접 확인한다 — 재현식의 근거를 지킨다. */
{
  const raw = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')
  /* ⚠ 주석을 반드시 먼저 지운다. 처음엔 안 지우고 'lumaHdr' 이 있는지만 봤는데,
     바로 위에 내가 써 둔 주석에 그 낱말이 있어서 실제 코드에서 lumaHdr 을 빼도 통과했다
     — 검사가 자기 설명문을 읽고 안심하고 있었다. */
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
  const gate = /issueGenCharge\(db, me\.id, \{[\s\S]*?\}\);/.exec(src)
  const gateStart = gate ? src.lastIndexOf('const asked =', gate.index) : -1
  const block = gate && gateStart >= 0 ? src.slice(gateStart, gate.index + gate[0].length).replace(/\s+/g, ' ') : ''
  if (!block) { fails.push('게이트 블록을 소스에서 찾지 못했다 — 검사가 무의미해진다'); }
  const MUST = [
    ['pbody.lumaHdr === true', '스튜디오가 보내는 HDR 필드명 — 없으면 루마 HDR 이 표준 요금으로 잡힌다'],
    ['pbody.lumaExr === true', '같은 이유(EXR)'],
    ['effectiveFlags(', '실제 요청에 실릴 값만 인정'],
    ['effectiveRatio(', '표에 없는 비율에 1.5배가 붙지 않게'],
    ['refs: gRefs', '레퍼런스 장수가 토큰에 담겨야 차감이 같아진다'],
    ['hdr: gFlags.hdr', 'HDR 이 토큰에 담겨야 차감이 같아진다'],
    ['ratio: gRatio', '비율이 토큰에 담겨야 차감이 같아진다'],
  ]
  for (const [needle, why] of MUST)
    if (block && !block.includes(needle)) fails.push(`게이트 코드에 '${needle}' 이 없다 — ${why}`)
  if (block && !/computeCharge\(\{[^}]*refs:[^}]*hdr:[^}]*ratio:[^}]*\}/.test(block))
    fails.push('게이트의 computeCharge 가 refs·hdr·ratio 를 넘기지 않는다 — 통과시킨 뒤 더 크게 빠진다')
}

for (const pbody of CASES) {
  const g = gateNeed(pbody, RATE, MK, CKW, SUR, CN)
  if (!g) continue
  const charged = chargeFromSpec(g.spec, RATE, MK, CKW, SUR, CN)
  if (Math.abs(g.need - charged) > 0.011)
    fails.push(`${pbody.model} ${JSON.stringify(Object.keys(pbody).filter((k) => !['model', 'prompt', 'seconds', 'res'].includes(k)))} — 게이트 ${g.need} ≠ 차감 ${charged}`)
}

console.log(`게이트 vs 실제 차감 — ${CASES.length}조합 (모델 ${Object.keys(pricing.MODEL_COST).length}종 × 옵션 10가지)`)
if (!fails.length) console.log('\n어긋남 0건 — 통과시킨 금액이 그대로 빠진다 ✅')
else { console.log(`\n어긋남 ${fails.length}건`); fails.slice(0, 15).forEach((f) => console.log('  ✗ ' + f)) }
process.exit(fails.length ? 1 : 0)
