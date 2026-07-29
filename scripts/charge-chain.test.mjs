/* 과금 연쇄 회귀 테스트 —  node scripts/charge-chain.test.mjs  (npm run test:pricing 에 포함)
 *
 * pricing.test.mjs 는 계산기(computeCharge) 하나만 본다. 그런데 회원 지갑에서 실제로 빠지는 값은
 * 계산기 → 서버 확정값(길이·해상도·옵션) → 배수 → 크레딧 → UPDATE users 로 이어지는 연쇄의 끝이다.
 * 중간 한 칸만 어긋나도 계산기는 멀쩡한데 청구는 틀린다(실제로 그런 적이 있다 —
 * 해상도를 요청값 그대로 믿던 시절, 4K 로 신고하면 1080p 를 받으면서 4배를 냈다).
 *
 * 그래서 여기서는 진짜 /api/usage/record 핸들러를 인메모리 D1 위에서 돌려 놓고,
 * 핸들러가 남긴 감사 기록(ai_usage) 안의 숫자들끼리 앞뒤가 맞는지만 본다.
 * 기대값을 따로 손으로 적지 않는 이유: 그러면 내 산수가 틀렸을 때 코드를 의심하게 된다.
 *
 *   ① 실비원   = 실비USD × 환율
 *   ② 크레딧   = 실비원 × 배수 ÷ 회원 크레딧 단가
 *   ③ 실제차감 = 청구 크레딧 = 정산행 credits,  매출 = 크레딧 × 단가
 *   ④ 과금에 쓴 길이·해상도 = 제공사에 실제로 나가는 길이·해상도
 *   ⑤ 옵션을 바꾸면 실비가 실제로 움직인다(움직이면 안 되는 옵션은 그대로다)
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({
    entryPoints: [file], bundle: true, write: false, format: 'cjs',
    platform: 'neutral', target: 'es2022',
  })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console,
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto, fetch,
    btoa, atob, setTimeout, clearTimeout, structuredClone,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

const FX = 1400        // 환율 고정 — fx_rates 캐시 행으로 넣어 준다
const CREDIT_KRW = 65  // 회원 1크레딧 단가 — users.credit_price 로 고정
const MARKUP = 2.5     // 기본 배수(회원·모델 override 없음)

/* 인메모리 D1 — gen_charges / users / ai_usage 만 흉내 낸다.
   isLikelyD1 이 prepare·batch·dump 로 판별하므로 셋 다 있어야 진짜 D1 취급을 받는다. */
function makeDB(user) {
  const charges = new Map()
  let credits = 10_000_000
  const deductions = []
  const usageRows = []
  return {
    prepare(sql) {
      const s = String(sql)
      let bound = []
      const stmt = {
        bind: (...a) => { bound = a; return stmt },
        first: async () => {
          // 실제 SQL 은 WHERE id = ? AND user_id = ? 다 — 소유자 조건까지 흉내 내야 검증이 의미가 있다
          if (/FROM gen_charges/i.test(s)) {
            const r = charges.get(bound[0])
            return r && String(r.user_id) === String(bound[1]) ? r : null
          }
          if (/FROM fx_rates/i.test(s)) return { usd_krw: FX }
          if (/SELECT credits/i.test(s)) return { credits }
          if (/FROM\s+users|session/i.test(s)) return user
          return null
        },
        all: async () => ({ results: [] }),
        run: async () => {
          if (/INSERT INTO gen_charges/i.test(s)) {
            const [id, user_id, model, units, res, audio, ratio, refs, cn, hdr, exr, created_at] = bound
            charges.set(id, { id, user_id, model, units, res, audio, ratio, refs, cn, hdr, exr, created_at, consumed_at: null })
          }
          if (/UPDATE gen_charges SET consumed_at/i.test(s)) {
            const r = charges.get(bound[1])
            if (!r || r.consumed_at) return { success: true, meta: { changes: 0 } }
            r.consumed_at = bound[0]
          }
          if (/UPDATE users SET credits/i.test(s)) {
            deductions.push(Number(bound[0]))
            credits = Math.round((credits - Number(bound[0])) * 100) / 100
          }
          if (/INSERT INTO ai_usage/i.test(s)) usageRows.push(bound)
          return { success: true, meta: { changes: 1 } }
        },
      }
      return stmt
    },
    batch: async () => [],
    exec: async () => ({}),
    dump: async () => new ArrayBuffer(0),
    __deductions: deductions,
    __usage: usageRows,
  }
}

const USER = {
  id: '1', user_id: '1', email: 'u@x.co', name: '회원', role: 'user',
  credits: 10_000_000, expires_at: '2099-01-01T00:00:00Z',
  credit_markup: 0, credit_price: CREDIT_KRW,
}

const gen = await load('functions/api/generate.js')
const gc = await load('functions/api/studio/_gencharge.ts')
const rec = await load('functions/api/usage/record.ts')
const { computeCharge, MODEL_COST } = await load('functions/api/studio/_pricing.ts')

let failed = 0
const ok = (cond, name, detail = '') => {
  if (cond) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol

/* 생성(토큰 발급) → 신고(record) → 차감 을 실제 핸들러로 한 바퀴 돈다.
   reportAs 로 "클라이언트가 뭐라고 신고하는지" 를 따로 줄 수 있다(거짓 신고 시험용). */
async function run(spec, reportAs) {
  const db = makeDB(USER)
  const token = await gc.issueGenCharge(db, '1', spec)
  const request = new Request('https://x/api/usage/record', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'bg_session=fake' },
    body: JSON.stringify({ chargeToken: token, model: spec.model, kind: spec.kind || 'video', ...(reportAs || {}) }),
  })
  const res = await rec.onRequestPost({ request, env: { DB: db, marketing: db }, params: {}, waitUntil: () => {}, next: async () => new Response('') })
  const body = await res.json()
  // INSERT 컬럼 순서: id,user_id,email,name,provider,model,kind,units,usd,cost_krw,credits,revenue_krw,markup,usd_krw,…
  const row = db.__usage[0] || []
  return {
    body,
    deducted: db.__deductions.reduce((a, b) => a + b, 0),
    units: Number(row[7]), usd: Number(row[8]), costKrw: Number(row[9]),
    credits: Number(row[10]), revenue: Number(row[11]), markup: Number(row[12]), fx: Number(row[13]),
  }
}

// 한 건에 대해 ①~③ 항등식이 성립하는지. 기록되는 usd 는 소수 4자리로 반올림되므로 그 폭까지는 오차로 인정한다.
function chain(tag, r) {
  ok(near(r.costKrw, r.usd * r.fx, 0.00005 * r.fx + 0.01), `${tag} · 실비원 = 실비USD × 환율`, `${r.costKrw} vs $${r.usd}×${r.fx}`)
  const derived = Math.round((r.costKrw * r.markup / CREDIT_KRW) * 100) / 100
  ok(near(r.body.credits, derived, 0.011), `${tag} · 크레딧 = 실비원 × 배수 ÷ ${CREDIT_KRW}`, `${r.body.credits} vs ${derived}`)
  ok(near(r.deducted, r.body.credits, 1e-9), `${tag} · 실제 차감 = 청구 크레딧`, `${r.deducted} vs ${r.body.credits}`)
  ok(near(r.credits, r.deducted, 1e-9), `${tag} · 정산행 credits = 차감액`, `${r.credits} vs ${r.deducted}`)
  ok(near(r.revenue, r.credits * CREDIT_KRW, 0.5), `${tag} · 매출 = 크레딧 × 단가`, `${r.revenue} vs ${r.credits * CREDIT_KRW}`)
}

console.log('\n① 씨댄스 2.0 — 옵션이 바뀌면 실비도·차감액도 같이 바뀐다')
const S = {}
{
  const CASES = [
    ['540p 5초', { model: 'Seedance 2.0', units: 5, res: '540p' }],
    ['720p 5초', { model: 'Seedance 2.0', units: 5, res: '720p' }],
    ['1080p 5초', { model: 'Seedance 2.0', units: 5, res: '1080p' }],
    ['1080p 10초', { model: 'Seedance 2.0', units: 10, res: '1080p' }],
    ['1080p 5초+오디오', { model: 'Seedance 2.0', units: 5, res: '1080p', audio: true }],
    ['4K 5초', { model: 'Seedance 2.0', units: 5, res: '4K' }],
  ]
  for (const [label, spec] of CASES) {
    const r = await run(spec)
    S[label] = r
    chain(label, r)
    // ④ 과금에 쓴 길이가 제공사로 실제 나가는 길이와 같은가
    const effSec = gen.effectiveUnits({ model: spec.model, seconds: spec.units, res: spec.res }, {})
    ok(r.units === effSec, `${label} · 과금 길이 = 실제 생성 길이`, `${r.units}초 vs ${effSec}초`)
  }
  ok(S['540p 5초'].usd < S['720p 5초'].usd && S['720p 5초'].usd < S['1080p 5초'].usd, '해상도가 오르면 실비가 오른다')
  ok(S['1080p 5초'].usd < S['1080p 10초'].usd, '길이가 늘면 실비가 는다')
  ok(S['1080p 5초'].usd < S['1080p 5초+오디오'].usd, '오디오를 켜면 실비가 는다')
  /* 씨댄스는 1080p 가 상한이다(SEEDANCE_RES 가 4K→1080p 로 내려보낸다).
     4K 를 골라도 1080p 가 생성되므로 1080p 요금이 맞다 — 여기가 깨지면 없는 화질에 돈을 받는 것이다. */
  ok(S['4K 5초'].usd === S['1080p 5초'].usd, '4K 선택 = 1080p 요금(제공사 상한이라 4K 는 생성되지 않는다)')
  // 540p 도 마찬가지로 480p 로 내려간다 — 480p 요금이어야 한다
  const px480 = (854 * 480 * 24 * 5) / 1024
  ok(near(S['540p 5초'].usd, (px480 * 4.7) / 1e6, 0.002), '540p 선택 = 480p 요금(제공사가 480p 로 만든다)', `$${S['540p 5초'].usd}`)
}

console.log('\n② 제공사가 알려준 실제 소비 토큰이 오면 추정 대신 그 값으로 청구된다')
{
  const half = (1920 * 1080 * 24 * 5) / 1024 / 2
  const r = await run({ model: 'Seedance 2.0', units: 5, res: '1080p' }, { usageTokens: half })
  ok(near(r.usd, S['1080p 5초'].usd / 2, 0.002), '실측 토큰이 추정의 절반이면 요금도 절반', `$${r.usd} vs $${S['1080p 5초'].usd / 2}`)
  ok(near(r.deducted, r.body.credits, 1e-9), '실측 토큰 경로도 차감액이 청구액과 같다')
}

console.log('\n③ 클라이언트가 옵션을 낮춰 신고해도 서버 확정값으로 빠진다')
{
  const r = await run(
    { model: 'Seedance 2.0', units: 10, res: '1080p' },
    { model: 'Seedance 1.0 Lite (텍스트→영상)', units: 1, res: '480p', kind: 'image' },
  )
  ok(near(r.deducted, S['1080p 10초'].deducted, 0.011),
     '1080p 10초를 "Lite 480p 1초 이미지" 로 신고 → 정상가 청구',
     `${r.deducted} vs ${S['1080p 10초'].deducted}`)
}

console.log('\n④ 나머지 모델군도 같은 연쇄가 성립한다')
{
  /* cmp 'lt' = 옵션 B 가 더 비싸야 한다 / 'eq' = 그 옵션이 실제 생성에 반영되지 않으므로 요금도 같아야 한다 */
  const GROUPS = [
    ['Veo 3.1 길이·해상도', { model: 'Google Veo 3.1', units: 4, res: '720p' }, { model: 'Google Veo 3.1', units: 8, res: '1080p' }, 'lt'],
    ['Kling 길이', { model: 'Kling 2.5 Turbo Pro', units: 5, res: '1080p' }, { model: 'Kling 2.5 Turbo Pro', units: 10, res: '1080p' }, 'lt'],
    // 클링은 해상도 필드를 아예 받지 않는다 — 무엇을 골라도 결과가 같으므로 요금도 같아야 한다
    ['Kling 해상도 미지원', { model: 'Kling 2.5 Turbo Pro', units: 5, res: '480p' }, { model: 'Kling 2.5 Turbo Pro', units: 5, res: '4K' }, 'eq'],
    ['Luma HDR', { model: 'Luma Ray 3.2', units: 5, res: '1080p' }, { model: 'Luma Ray 3.2', units: 5, res: '1080p', hdr: true }, 'lt'],
    ['Luma 해상도', { model: 'Luma Ray 3.2', units: 5, res: '720p' }, { model: 'Luma Ray 3.2', units: 5, res: '4K' }, 'lt'],
    ['MiniMax 길이', { model: 'MiniMax Hailuo 02', units: 6, res: '1080p' }, { model: 'MiniMax Hailuo 02', units: 10, res: '1080p' }, 'lt'],
    ['Runway 길이', { model: 'Runway Gen-4', units: 5, res: '1080p' }, { model: 'Runway Gen-4', units: 10, res: '1080p' }, 'lt'],
    ['Seedance Lite 해상도', { model: 'Seedance 1.0 Lite (텍스트→영상)', units: 5, res: '480p' }, { model: 'Seedance 1.0 Lite (텍스트→영상)', units: 5, res: '1080p' }, 'lt'],
    // OpenAI 이미지는 정사각이 아니면 원가가 1.5배다
    ['GPT Image 비율', { model: 'GPT Image', units: 1, ratio: '1:1', kind: 'image' }, { model: 'GPT Image', units: 1, ratio: '3:2', kind: 'image' }, 'lt'],
    // 표에 없는 비율은 빌더가 1024x1024 정사각으로 떨어뜨린다 — 정사각을 받으면서 1.5배를 받으면 안 된다
    ['GPT Image 표에 없는 비율', { model: 'GPT Image', units: 1, ratio: '1:1', kind: 'image' }, { model: 'GPT Image', units: 1, ratio: '7:3', kind: 'image' }, 'eq'],
    ['업스케일 길이', { model: '업스케일 4K (영상 화질 향상)', units: 5 }, { model: '업스케일 4K (영상 화질 향상)', units: 20 }, 'lt'],
    ['음악 길이', { model: '음악 생성 (BGM·뮤직)', units: 30 }, { model: '음악 생성 (BGM·뮤직)', units: 120 }, 'lt'],
  ]
  for (const [name, sa, sb, cmp] of GROUPS) {
    const ra = await run(sa)
    const rb = await run(sb)
    chain(`${name} A`, ra)
    chain(`${name} B`, rb)
    const pass = cmp === 'lt' ? ra.usd < rb.usd : ra.usd === rb.usd
    ok(pass, `${name} · 옵션 판정(${cmp})`, `$${ra.usd} vs $${rb.usd}`)
  }
}

console.log('\n⑤ 오디오 가산은 오디오가 실제로 나가는 모델에만 붙는다')
{
  /* 루마 HDR 때와 같은 부류 — 요금표엔 있는데 빌더가 안 싣는 옵션이 있으면 없는 기능에 돈을 받는다.
     반대로 나가는데 안 받으면 우리가 손해다. 두 방향 모두 본다. */
  for (const m of Object.keys(MODEL_COST).filter((k) => MODEL_COST[k].prov === 'seedance')) {
    const charged = !!MODEL_COST[m].audio
    let sent = false
    try {
      const p = gen.buildSeedancePayload({ model: m, seconds: 5, res: '1080p', prompt: 'x', generateAudio: true }, {})
      sent = p.generate_audio === true || /--audio\s+true/.test((p.content && p.content[0] && p.content[0].text) || '')
    } catch { sent = false }
    ok(charged === sent, `${m} · 가산 조건 = 실제 전송 조건`, `가산 ${charged} / 전송 ${sent}`)
    const a = computeCharge({ model: m, units: 5, res: '1080p', audio: false, kind: 'video' }, FX, MARKUP, CREDIT_KRW)
    const b = computeCharge({ model: m, units: 5, res: '1080p', audio: true, kind: 'video' }, FX, MARKUP, CREDIT_KRW)
    ok((b.usd > a.usd) === charged, `${m} · audio 플래그가 요금을 움직이는지가 요금표와 일치`, `${a.usd}→${b.usd}`)
  }
}

console.log(failed === 0 ? '\n과금 연쇄 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
