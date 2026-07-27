// 생성 비용이 '실제로 만든 것' 과 맞는지 검증한다.
//  제공사는 영상 길이를 자기 규격으로 반올림한다(8초 요청 → 10초 생성). 과금은 요청값이 아니라
//  실제로 보내는 값을 따라야 하므로, 과금 규칙(_pricing.ts billedSeconds)과 실제 요청 페이로드
//  (generate.js 의 build*Payload)가 항상 같은 숫자를 내는지 대조한다.
//  실행:  npm i -D esbuild && node scripts/cost-accuracy-test.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cost-'))
fs.mkdirSync(path.join(dir, 'studio')); fs.mkdirSync(path.join(dir, 'payments'))
fs.writeFileSync(path.join(dir, '_utils.mjs'), 'export const getSessionUser=()=>null,resolveDB=()=>null,getUserByMcpToken=()=>null;\n')
fs.writeFileSync(path.join(dir, '_apikeys.mjs'), 'export const getUserByApiKey=()=>null,enforceRateLimit=()=>null,ensureApiKeysSchema=()=>null;\n')
fs.writeFileSync(path.join(dir, 'payments/prepare.mjs'), 'export const creditPriceFor=async()=>50;\n')
// 과금 규칙(TypeScript) 을 그대로 변환해 불러온다 — 사본이 아니라 실제 파일
execFileSync('npx', ['esbuild', 'functions/api/studio/_pricing.ts', '--format=esm', '--platform=neutral',
  '--outfile=' + path.join(dir, 'studio/_pricing.mjs'), '--log-level=error'], { stdio: 'inherit' })
fs.writeFileSync(path.join(dir, 'gen.mjs'), fs.readFileSync('functions/api/generate.js', 'utf8')
  .replace('from "./_utils"', 'from "./_utils.mjs"').replace('from "./_apikeys"', 'from "./_apikeys.mjs"')
  .replace('from "./studio/_pricing"', 'from "./studio/_pricing.mjs"').replace('from "./payments/prepare"', 'from "./payments/prepare.mjs"'))

const G = await import(path.join(dir, 'gen.mjs'))
const P = await import(path.join(dir, 'studio/_pricing.mjs'))

/** 각 제공사 페이로드에서 '실제 요청 길이(초)' 를 뽑아낸다 */
const actual = {
  seedance: (b) => {
    const p = G.buildSeedancePayload(b, {})
    if (p.duration != null) return Number(p.duration)                       // 2.0
    const m = /--duration (\d+)/.exec(String(p.content?.[0]?.text || ''))   // 1.x
    return m ? Number(m[1]) : NaN
  },
  runway: (b) => Number(G.buildRunwayPayload(b).duration),
  // Aleph 는 길이 파라미터가 없다 — 출력 길이 = 원본 영상 길이. 따라서 과금은
  // 클라이언트가 잰 '원본 실제 길이' 를 그대로 통과시켜야 맞다(스튜디오 effSecondsFor 가 잰다).
  runway_aleph: (b) => Math.max(1, Math.round(Number(b.seconds) || 8)),
  hailuo: (b) => Number(G.buildHailuoPayload(b).duration),
  luma: (b) => Number(String(JSON.stringify(G.buildLumaPayload(b)).match(/"duration":"?(\d+)/)?.[1])),
  google: (b) => Number(JSON.stringify(G.buildVeoPayload(b)).match(/durationSeconds":(\d+)/)?.[1]),
  kling: (b) => Number((Number(b.seconds) || 5) <= 6 ? 5 : 10),            // klingApiSpec 제출 규칙
}

const MODELS = [
  'Seedance 2.0', 'Seedance 2.0 Fast', 'Seedance 1.0 Pro', 'Seedance 1.0 Lite (텍스트→영상)',
  'Runway Gen-4', 'Runway Aleph (영상→실사 V2V)', 'MiniMax Hailuo 02', 'Luma Ray 2',
  'Google Veo 3.1', 'Kling 2.1 Master (텍스트→영상)',
]
const SECONDS = [0, 3, 5, 6, 7, 8, 10, 20]

const out = []
const ok = (n, c, i) => out.push([n, !!c, i == null ? '' : String(i)])

let mismatches = 0
for (const model of MODELS) {
  const prov = P.MODEL_COST[model]?.prov
  const fn = actual[prov]
  if (!fn) { ok(`${model} — 길이 규칙 확인 불가`, false, 'prov=' + prov); continue }
  const bad = []
  for (const s of SECONDS) {
    const billed = P.billedSeconds(model, s)
    const real = fn({ model, seconds: s, prompt: 'x', ratio: '16:9' })
    if (!Number.isFinite(real)) { bad.push(`${s}초→요청값 못읽음`); continue }
    if (billed !== real) bad.push(`${s}초 요청 → 실제 ${real}초, 청구 ${billed}초`)
  }
  if (bad.length) mismatches++
  ok(`${model} 청구 초 = 실제 생성 초`, bad.length === 0, bad.slice(0, 3).join(' / '))
}

// 해상도 배수: 제공사에 해상도를 보내지 않으므로 노드 설정으로 원가가 달라지면 안 된다
{
  const a = P.computeCharge({ model: 'Seedance 2.0', units: 5, kind: 'video', res: '720p' }, 1400)
  const b = P.computeCharge({ model: 'Seedance 2.0', units: 5, kind: 'video', res: '4K' }, 1400)
  ok('해상도 선택이 원가를 바꾸지 않음(요청에 반영 안 되므로)', a.usd === b.usd, `720p $${a.usd} vs 4K $${b.usd}`)
}
// 대표 계산 한 건이 손으로 계산한 값과 맞는가
{
  const c = P.computeCharge({ model: 'Seedance 2.0', units: 5, kind: 'video', res: '1080p', audio: false }, 1400)
  ok('Seedance 2.0 · 5초 원가 = 단가×초', Math.abs(c.usd - 0.062 * 5) < 1e-9, `$${c.usd} (기대 $${(0.062 * 5).toFixed(3)})`)
  ok('원가(원) = USD × 환율', c.costKrw === Math.round(0.31 * 1400), `${c.costKrw}원`)
}
// 오디오 켜면 초당 추가요금이 붙는가
{
  const off = P.computeCharge({ model: 'Seedance 2.0', units: 5, kind: 'video', audio: false }, 1400)
  const on = P.computeCharge({ model: 'Seedance 2.0', units: 5, kind: 'video', audio: true }, 1400)
  ok('오디오 ON 시 초당 추가요금 반영', Math.abs(on.usd - off.usd - 0.02 * 5) < 1e-9, `+$${(on.usd - off.usd).toFixed(3)}`)
}
// 자체 업스케일 — 원가(제공사 비용)는 0, 대신 서비스 요금으로 크레딧이 나간다
{
  const IMG = '화질 업스케일 (이미지 · 브라우저 초해상)'
  const VID = '화질 업스케일 (영상 · 브라우저 초해상)'
  const c = P.computeCharge({ model: IMG, units: 1, kind: 'image' }, 1400, undefined, 50)
  ok('업스케일 원가(제공사 비용) 0', c.usd === 0 && c.costKrw === 0, `$${c.usd}`)
  ok('업스케일 크레딧 과금됨(기본 100원=2크레딧)', c.credits === 2, `${c.credits}크레딧`)
  // 영상은 초당 요금
  const v = P.computeCharge({ model: VID, units: 10, kind: 'video' }, 1400, undefined, 50)
  ok('영상 업스케일은 초당 과금(30원×10초=6크레딧)', v.credits === 6, `${v.credits}크레딧`)
  // 배수(전역·회원별 설정)가 그대로 적용되는가
  const x3 = P.computeCharge({ model: IMG, units: 1, kind: 'image' }, 1400, 3, 50)
  ok('배수 설정이 업스케일 요금에 적용', x3.credits === 6, `${x3.credits}크레딧 (3배)`)
  // 요금 기준가 자체를 관리자가 바꿀 수 있는가
  const fee = P.computeCharge({ model: IMG, units: 1, kind: 'image' }, 1400, undefined, 50, 250)
  ok('요금 기준가 변경 반영(250원=5크레딧)', fee.credits === 5, `${fee.credits}크레딧`)
  // 크레딧 단가가 다른 회원(65원)
  const c65 = P.computeCharge({ model: IMG, units: 1, kind: 'image' }, 1400, undefined, 65)
  ok('회원 크레딧 단가 반영(100원÷65)', Math.abs(c65.credits - 1.54) < 0.01, `${c65.credits}크레딧`)
  // 매출은 잡히고 원가는 0 → 순이익 = 매출
  ok('업스케일 순이익 = 매출(원가 0)', c.profitKrw === c.revenueKrw && c.revenueKrw === 100, `${c.profitKrw}원`)
}

// ── 관리자 화면의 '계산 내역' 이 실제 기록을 정확히 되짚는가 ──
{
  // 정상 기록: 씨댄스 2.0 · 12초 · 오디오 ON · 환율 1484
  const usd = 0.062 * 12 + 0.02 * 12
  const e = P.explainCost({ model: 'Seedance 2.0', kind: 'video', units: 12, usd, usdKrw: 1484, costKrw: Math.round(usd * 1484) })
  ok('계산 내역: 단가×초 분해', e.unitPrice === 0.062 && e.units === 12 && Math.abs(e.baseTotal - 0.744) < 1e-9, `${e.unitPrice}×${e.units}=${e.baseTotal}`)
  ok('계산 내역: 오디오 분리', Math.abs(e.audioUsd - 0.24) < 1e-9, '$' + e.audioUsd)
  ok('계산 내역: 설명 안 되는 금액 없음', e.unexplained === 0, String(e.unexplained))
  ok('계산 내역: 원화 환산 일치', e.krwOk === true)
  ok('계산 내역: 현재 규칙과 일치', e.matchesNow === true, `$${e.nowUsd}`)
}
{
  // 옛 기록 재현: 16초를 요청했지만 씨댄스 2.0 은 15초까지만 만든다 → 16초로 청구된 기록
  const oldUsd = 0.062 * 16
  const e = P.explainCost({ model: 'Seedance 2.0', kind: 'video', units: 16, usd: oldUsd, usdKrw: 1472, costKrw: Math.round(oldUsd * 1472) })
  ok('옛 기록 감지: 현재 규칙과 다름', e.matchesNow === false, `기록 $${oldUsd.toFixed(3)} vs 현재 $${e.nowUsd}`)
  ok('옛 기록: 현재 규칙은 15초로 환산', e.nowUnits === 15, `${e.nowUnits}초`)
}
{
  // 해상도 배수가 섞인 옛 기록(4K 2.6배) → '설명 안 되는 금액' 으로 잡혀야 한다
  const oldUsd = 0.062 * 2.6 * 5
  const e = P.explainCost({ model: 'Seedance 2.0', kind: 'video', units: 5, usd: oldUsd, usdKrw: 1400, costKrw: Math.round(oldUsd * 1400) })
  ok('해상도 배수 섞인 옛 기록 탐지', e.unexplained > 0.4, '$' + e.unexplained.toFixed(3))
}
{
  // 단가표에 없는 모델은 '기본 단가로 계산됨' 으로 표시되어야 한다
  const e = P.explainCost({ model: '없는 모델', kind: 'image', units: 1, usd: 0.05, usdKrw: 1400, costKrw: 70 })
  ok('단가표에 없는 모델 표시', e.priced === false)
}

fs.rmSync(dir, { recursive: true, force: true })
let fail = 0
for (const [n, pass, info] of out) { if (!pass) fail++; console.log((pass ? 'PASS ' : 'FAIL ') + n + (info ? '  — ' + info : '')) }
console.log(`\n${out.length - fail}/${out.length} passed`)
process.exit(fail ? 1 : 0)
