// 모든 모델의 금액이 정확히 계산되는지 전수 감사.
//  확인 항목
//   1) 스튜디오 목록에 있는 모든 모델이 단가표에 있는가 (없으면 기본값 $0.05/$0.06 으로 잘못 청구된다)
//   2) 클라이언트 단가표(스튜디오)와 서버 단가표(_pricing.ts)가 완전히 일치하는가
//   3) 영상 모델의 '청구 초' 가 실제로 제공사에 요청하는 초와 같은가 (전 모델 × 여러 길이)
//   4) 단가표에만 있고 목록에 없는 유령 항목이 있는가
//  실행:  npm i -D esbuild && node scripts/model-cost-audit.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const HTML = fs.readFileSync('public/studio-nvc-prv-8b3k2/index.html', 'utf8')

/** 스튜디오 소스에서 객체/배열 리터럴을 통째로 떼어내 그대로 평가한다(사본이 아니라 실제 값) */
function literalAfter(marker, open, close) {
  const i = HTML.indexOf(marker)
  if (i < 0) throw new Error('찾을 수 없음: ' + marker)
  const s = HTML.indexOf(open, i)
  let depth = 0, j = s
  for (; j < HTML.length; j++) {
    if (HTML[j] === open) depth++
    else if (HTML[j] === close) { depth--; if (!depth) break }
  }
  return HTML.slice(s, j + 1)
}
const clientCost = (0, eval)('(' + literalAfter('var MODEL_COST = {', '{', '}') + ')')
const modelList = (0, eval)('(' + literalAfter('var MODELS = [', '[', ']') + ')')
const listed = [...new Set(modelList.map((r) => r[1]).filter(Boolean))]

// ── 서버 코드(실물) 불러오기 ──
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'))
fs.mkdirSync(path.join(dir, 'studio')); fs.mkdirSync(path.join(dir, 'payments'))
fs.writeFileSync(path.join(dir, '_utils.mjs'), 'export const getSessionUser=()=>null,resolveDB=()=>null,getUserByMcpToken=()=>null;\n')
fs.writeFileSync(path.join(dir, '_apikeys.mjs'), 'export const getUserByApiKey=()=>null,enforceRateLimit=()=>null,ensureApiKeysSchema=()=>null;\n')
fs.writeFileSync(path.join(dir, 'payments/prepare.mjs'), 'export const creditPriceFor=async()=>50;\n')
execFileSync('npx', ['esbuild', 'functions/api/studio/_pricing.ts', '--format=esm', '--platform=neutral',
  '--outfile=' + path.join(dir, 'studio/_pricing.mjs'), '--log-level=error'], { stdio: 'inherit' })
fs.writeFileSync(path.join(dir, 'gen.mjs'), fs.readFileSync('functions/api/generate.js', 'utf8')
  .replace('from "./_utils"', 'from "./_utils.mjs"').replace('from "./_apikeys"', 'from "./_apikeys.mjs"')
  .replace('from "./studio/_pricing"', 'from "./studio/_pricing.mjs"').replace('from "./payments/prepare"', 'from "./payments/prepare.mjs"'))
const G = await import(path.join(dir, 'gen.mjs'))
const P = await import(path.join(dir, 'studio/_pricing.mjs'))
const serverCost = P.MODEL_COST

/** 제공사 페이로드에서 '실제 요청 길이(초)' — 없으면 null(길이 파라미터 없는 모델) */
const actualSec = {
  seedance: (b) => {
    const p = G.buildSeedancePayload(b, {})
    if (p.duration != null) return Number(p.duration)
    const m = /--duration (\d+)/.exec(String(p.content?.[0]?.text || ''))
    return m ? Number(m[1]) : null
  },
  runway: (b) => Number(G.buildRunwayPayload(b).duration),
  hailuo: (b) => Number(G.buildHailuoPayload(b).duration),
  luma: (b) => Number(String(JSON.stringify(G.buildLumaPayload(b)).match(/"duration":"?(\d+)/)?.[1])),
  google: (b) => Number(JSON.stringify(G.buildVeoPayload(b)).match(/durationSeconds":(\d+)/)?.[1]),
  kling: (b) => ((Number(b.seconds) || 5) <= 6 ? 5 : 10),
  // 길이 파라미터가 없는 제공사 — 출력 길이 = 원본/실제 길이 → 청구도 그대로 통과해야 한다
  runway_aleph: null, v2v_auto: null, motion: null, xai: null,
  narrate: null, lipsync: null, music: null, upscale: null,
}

const out = []
const ok = (n, c, i) => out.push([n, !!c, i == null ? '' : String(i)])

// 1) 목록의 모든 모델이 단가표에 있는가
{
  const missC = listed.filter((m) => !clientCost[m])
  const missS = listed.filter((m) => !serverCost[m])
  ok(`목록 ${listed.length}개 모델이 모두 단가표에 있음(스튜디오)`, missC.length === 0, missC.join(' , '))
  ok(`목록 ${listed.length}개 모델이 모두 단가표에 있음(서버)`, missS.length === 0, missS.join(' , '))
}

// 스튜디오 목록에는 없지만 서버에는 단가가 있어야 하는 모델
//  — 회원 API/MCP 로만 호출되는 모델. 단가가 없으면 기본값으로 잘못 청구되므로 서버에는 있어야 한다.
const API_ONLY = ['Seedream 3.0', 'SeedEdit 3.0 (레퍼런스 편집)']

// 2) 클라이언트 ↔ 서버 단가표 일치 (스튜디오에 있는 항목은 서버와 값이 같아야 한다)
{
  const keys = [...new Set([...Object.keys(clientCost), ...Object.keys(serverCost)])]
  const diff = []
  for (const k of keys) {
    const a = clientCost[k], b = serverCost[k]
    if (!a) { if (!API_ONLY.includes(k)) diff.push(`${k}: 스튜디오 없음`); continue }
    if (!b) { diff.push(`${k}: 서버 없음`); continue }
    if (a.u !== b.u) diff.push(`${k}: 단위 ${a.u}≠${b.u}`)
    if (Math.abs(a.usd - b.usd) > 1e-9) diff.push(`${k}: 단가 $${a.usd}≠$${b.usd}`)
    if ((a.audio || 0) !== (b.audio || 0)) diff.push(`${k}: 오디오 ${a.audio || 0}≠${b.audio || 0}`)
    if (a.prov !== b.prov) diff.push(`${k}: 제공사 ${a.prov}≠${b.prov}`)
  }
  ok(`단가표 ${keys.length}개 항목이 스튜디오·서버 완전 일치`, diff.length === 0, diff.slice(0, 5).join(' / '))
}

// 3) 영상 모델 전수 — 청구 초 = 실제 요청 초
{
  const SECONDS = [0, 3, 4, 5, 6, 7, 8, 10, 15, 20]
  const bad = []
  const checked = []
  for (const model of listed) {
    const m = serverCost[model]
    if (!m || m.u !== 'sec') continue
    const fn = actualSec[m.prov]
    if (fn === undefined) { bad.push(`${model}: 제공사 ${m.prov} 길이규칙 미정의`); continue }
    if (fn === null) {   // 길이 파라미터 없음 → 통과(그대로 청구)
      for (const s of SECONDS) {
        const billed = P.billedSeconds(model, s)
        const expect = Math.max(1, Math.round(s || 8))
        if (billed !== expect) bad.push(`${model}: ${s}초 → 청구 ${billed}초(그대로여야 함 ${expect})`)
      }
      checked.push(model); continue
    }
    for (const s of SECONDS) {
      const billed = P.billedSeconds(model, s)
      const real = fn({ model, seconds: s, prompt: 'x', ratio: '16:9' })
      if (!Number.isFinite(real)) { bad.push(`${model}: ${s}초 요청값 못읽음`); continue }
      if (billed !== real) bad.push(`${model}: ${s}초 요청 → 실제 ${real}초, 청구 ${billed}초`)
    }
    checked.push(model)
  }
  ok(`영상 모델 ${checked.length}개 × 길이 ${SECONDS.length}종 — 청구 초 = 실제 초`, bad.length === 0, bad.slice(0, 6).join(' / '))
}

// 4) 이미지 모델 — 장당 단가가 그대로 원가가 되는가
{
  const bad = []
  let n = 0
  for (const model of listed) {
    const m = serverCost[model]
    if (!m || m.u !== 'img') continue
    n++
    const c = P.computeCharge({ model, units: 1, kind: 'image' }, 1400)
    if (Math.abs(c.usd - m.usd) > 1e-9) bad.push(`${model}: $${c.usd} ≠ 단가 $${m.usd}`)
    if (c.costKrw !== Math.round(m.usd * 1400)) bad.push(`${model}: 원화 ${c.costKrw} ≠ ${Math.round(m.usd * 1400)}`)
  }
  ok(`이미지 모델 ${n}개 — 원가 = 장당 단가 × 환율`, bad.length === 0, bad.slice(0, 4).join(' / '))
}

// 5) 단가표에만 있고 목록에 없는 항목(유령 단가) — 오탈자로 매칭이 깨진 경우를 잡는다
{
  const extra = Object.keys(serverCost).filter((k) => !listed.includes(k) && !API_ONLY.includes(k) && !/업스케일|나레이션|립싱크|음악/.test(k))
  ok('단가표에 정체불명 항목 없음(오탈자 탐지)', extra.length === 0, extra.join(' , '))
  // API 전용 모델도 단가가 반드시 있어야 한다(없으면 기본값 $0.05 로 잘못 청구된다)
  const apiMiss = API_ONLY.filter((k) => !serverCost[k])
  ok('API 전용 모델도 단가 보유', apiMiss.length === 0, apiMiss.join(' , '))
}

// 6) 오디오 가산이 있는 모델만 오디오 요금이 붙는가
{
  const bad = []
  for (const model of listed) {
    const m = serverCost[model]
    if (!m || m.u !== 'sec') continue
    const off = P.computeCharge({ model, units: 5, kind: 'video', audio: false }, 1400)
    const on = P.computeCharge({ model, units: 5, kind: 'video', audio: true }, 1400)
    const gap = +(on.usd - off.usd).toFixed(6)
    const expect = +((m.audio || 0) * P.billedSeconds(model, 5)).toFixed(6)
    if (gap !== expect) bad.push(`${model}: 오디오 가산 ${gap} ≠ ${expect}`)
  }
  ok('오디오 가산이 단가표와 일치', bad.length === 0, bad.slice(0, 4).join(' / '))
}

fs.rmSync(dir, { recursive: true, force: true })
let fail = 0
for (const [n, pass, info] of out) { if (!pass) fail++; console.log((pass ? 'PASS ' : 'FAIL ') + n + (info ? '\n        → ' + info : '')) }
console.log(`\n${out.length - fail}/${out.length} passed`)
process.exit(fail ? 1 : 0)
