/* 모델 전수 점검 —  node scripts/model-sweep.mjs [--json]
 *
 * 단가표에 있는 모델을 하나도 빼지 않고 대표 조건으로 계산해 본다.
 * 돈이 나가는 호출은 하나도 하지 않는다 — 계산기(computeCharge)만 돌린다.
 *
 * 보는 것:
 *   ① 원가(USD) · 원가(원) · 마크업 · 차감 크레딧 · 매출(원) · 순이익(원) · 마진율
 *   ② 팔수록 손해인 모델이 있는가 (매출 < 원가)
 *   ③ 실수로 0원이 되는 모델이 있는가 (크레딧 0)
 *   ④ 초당 모델이 길이에 비례하는가 / 장당 모델이 길이에 안 흔들리는가
 *   ⑤ 관리자 실측단가(override)가 항상 이기는가
 */
import vm from 'node:vm'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname
const JSON_OUT = process.argv.includes('--json')

async function load(file) {
  const out = await build({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console: { log() {}, warn() {}, error() {} },
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}'), btoa, atob, setTimeout, clearTimeout, structuredClone, AbortController,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

const { MODEL_COST, computeCharge, PROV_LABEL } = await load('functions/api/studio/_pricing.ts')

const FX = 1400        // 환율 고정 — 비교 가능한 숫자를 만들기 위해
const CREDIT = 50      // 1크레딧 = 50원 (기본)
const SECS = 5         // 영상 대표 길이
const RES = '1080p'    // 영상 대표 해상도

let failed = 0
const bad = []
const rows = []

for (const [model, m] of Object.entries(MODEL_COST)) {
  const isSec = m.u === 'sec'
  const input = isSec
    ? { model, units: SECS, res: RES, ratio: '16:9' }
    : { model, units: 1, kind: 'image', ratio: '1:1' }
  const c = computeCharge(input, FX, undefined, CREDIT)
  const marginPct = c.revenueKrw > 0 ? Math.round(((c.revenueKrw - c.costKrwExact) / c.revenueKrw) * 1000) / 10 : 0
  rows.push({
    model, prov: m.prov, label: PROV_LABEL[m.prov] || m.prov, unit: m.u,
    tableUsd: m.usd, usd: c.usd, costKrw: c.costKrwExact, markup: c.markup,
    credits: c.credits, revenueKrw: c.revenueKrw, profitKrw: Math.round(c.revenueKrw - c.costKrwExact),
    marginPct, kind: c.kind,
  })

  // ② 팔수록 손해 — 매출이 원가에 못 미치면 그 모델은 팔릴수록 적자다
  if (c.revenueKrw < c.costKrwExact - 0.5) { failed++; bad.push(`적자: ${model} 매출 ${c.revenueKrw}원 < 원가 ${c.costKrwExact}원`) }
  // ③ 사실상 무료 — 원가가 0보다 큰데 크레딧이 0이면 우리가 그냥 물어 준다
  if (c.costKrwExact > 0 && !(c.credits > 0)) { failed++; bad.push(`무과금: ${model} 원가 ${c.costKrwExact}원인데 0크레딧`) }
  // 마크업이 1 미만이면 원가 이하 판매다
  if (!(c.markup >= 1)) { failed++; bad.push(`배수이상: ${model} markup=${c.markup}`) }

  // ④ 단위 규칙
  if (isSec) {
    const twice = computeCharge({ ...input, units: SECS * 2 }, FX, undefined, CREDIT)
    if (!(twice.usd > c.usd)) { failed++; bad.push(`길이무시: ${model} ${SECS}초 $${c.usd} → ${SECS * 2}초 $${twice.usd}`) }
  } else {
    const twice = computeCharge({ ...input, units: 99 }, FX, undefined, CREDIT)
    if (twice.usd !== c.usd) { failed++; bad.push(`장당인데 길이영향: ${model} $${c.usd} → $${twice.usd}`) }
  }

  // ⑤ 관리자 실측단가는 언제나 이긴다
  const OV = 0.123456
  const ovc = computeCharge(input, FX, undefined, CREDIT, OV)
  const want = isSec ? OV * SECS : OV
  if (Math.abs(ovc.usd - Math.round(want * 10000) / 10000) > 0.0002) {
    failed++; bad.push(`실측단가 무시: ${model} 기대 $${want} 실제 $${ovc.usd}`)
  }
}

if (JSON_OUT) { console.log(JSON.stringify({ fx: FX, creditKrw: CREDIT, secs: SECS, res: RES, rows, bad }, null, 2)); process.exit(failed ? 1 : 0) }

rows.sort((a, b) => (a.label + a.model).localeCompare(b.label + b.model, 'ko'))
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
console.log(`\n환율 $1=₩${FX} · 1크레딧=${CREDIT}원 · 영상 ${SECS}초 ${RES} · 이미지 1장 기준\n`)
console.log(pad('제공사', 22) + pad('모델', 46) + padL('단위', 5) + padL('원가$', 10) + padL('원가₩', 9) + padL('배수', 6) + padL('크레딧', 9) + padL('매출₩', 9) + padL('순이익₩', 9) + padL('마진', 7))
console.log('─'.repeat(132))
let lastProv = ''
for (const r of rows) {
  if (r.label !== lastProv) { console.log(''); lastProv = r.label }
  console.log(pad(r.label, 22) + pad(r.model.slice(0, 45), 46) + padL(r.unit, 5) +
    padL(r.usd.toFixed(4), 10) + padL(Math.round(r.costKrw), 9) + padL(r.markup + 'x', 6) +
    padL(r.credits, 9) + padL(r.revenueKrw, 9) + padL(r.profitKrw, 9) + padL(r.marginPct + '%', 7))
}
console.log('\n' + '─'.repeat(132))
console.log(`모델 ${rows.length}종 · 영상 ${rows.filter((r) => r.unit === 'sec').length} · 이미지/건당 ${rows.filter((r) => r.unit !== 'sec').length}`)
if (bad.length) { console.log('\n문제:'); for (const b of bad) console.log('  ✗ ' + b) }
else console.log('\n적자 모델 0 · 무과금 모델 0 · 단위 규칙 위반 0 · 실측단가 우선 적용 OK')
process.exit(failed ? 1 : 0)
