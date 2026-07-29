/* 과금 연쇄 회귀 테스트 —  node scripts/charge-chain.test.mjs  (npm run test:pricing 에 포함)
 *
 * pricing.test.mjs 는 계산기(computeCharge) 하나만 본다. 그런데 회원 지갑에서 실제로 빠지는 값은
 * 계산기 → 서버 확정값(길이·해상도·옵션) → 배수 → 크레딧 → UPDATE users 로 이어지는 연쇄의 끝이다.
 * 중간 한 칸만 어긋나도 계산기는 멀쩡한데 청구는 틀린다(실제로 그런 적이 있다 —
 * 해상도를 요청값 그대로 믿던 시절, 4K 로 신고하면 1080p 를 받으면서 4배를 냈다).
 *
 * 그래서 여기서는 실제로 돈을 빼는 함수(settleGenCharge)를 인메모리 D1 위에서 돌려 놓고,
 * 그것이 남긴 감사 기록(ai_usage) 안의 숫자들끼리 앞뒤가 맞는지만 본다.
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

/* ai_usage 의 INSERT 컬럼 순서 — 정산(15칸)과 보관 신고(19칸)가 앞 15칸을 공유한다. */
const AI_USAGE_COLS = ['id', 'user_id', 'email', 'name', 'provider', 'model', 'kind', 'units', 'usd',
  'cost_krw', 'credits', 'revenue_krw', 'markup', 'usd_krw', 'created_at', 'prompt', 'refs', 'result_url', 'result_kind']

/* 인메모리 D1 — gen_charges / users / ai_usage 만 흉내 낸다.
   isLikelyD1 이 prepare·batch·dump 로 판별하므로 셋 다 있어야 진짜 D1 취급을 받는다. */
function makeDB(user) {
  const charges = new Map()
  const usage = new Map()          // ai_usage — id → 컬럼 배열 (UPDATE 도 실제로 반영한다)
  let credits = 10_000_000
  const deductions = []
  return {
    prepare(sql) {
      const s = String(sql)
      let bound = []
      const stmt = {
        bind: (...a) => { bound = a; return stmt },
        first: async () => {
          // 실제 SQL 의 WHERE 조건을 흉내 내야 검증이 의미가 있다(소유자·상태 조건 포함)
          if (/FROM gen_charges WHERE task_key/i.test(s)) {
            for (const r of charges.values())
              if (String(r.task_key || '') === String(bound[0]) && r.status === 'charged' &&
                  (!/reconciled_at IS NULL/i.test(s) || !r.reconciled_at)) return r
            return null
          }
          if (/FROM gen_charges/i.test(s)) {
            const r = charges.get(bound[0])
            return r && String(r.user_id) === String(bound[1]) ? r : null
          }
          if (/FROM fx_rates/i.test(s)) return { usd_krw: FX }
          if (/COUNT\(\*\).*FROM ai_usage/i.test(s)) return { c: usage.size }
          if (/SELECT credits/i.test(s)) return { credits }
          if (/FROM\s+users|session/i.test(s)) return { ...user, credits }
          return null
        },
        //  관리자 화면은 ai_usage 를 목록으로 읽는다 — 저장한 컬럼 배열을 이름 있는 행으로 되돌린다.
        all: async () => {
          if (!/FROM ai_usage/i.test(s)) return { results: [] }
          return { results: [...usage.values()].map((b) => Object.fromEntries(AI_USAGE_COLS.map((c, i) => [c, b[i]]))) }
        },
        run: async () => {
          if (/INSERT INTO gen_charges/i.test(s)) {
            const [id, user_id, model, units, res, audio, ratio, refs, cn, hdr, exr, created_at] = bound
            charges.set(id, { id, user_id, model, units, res, audio, ratio, refs, cn, hdr, exr, created_at,
                              consumed_at: null, credits: 0, task_key: '', status: '', usage_id: '', reconciled_at: null })
          }
          if (/UPDATE gen_charges SET consumed_at/i.test(s)) {
            const r = charges.get(bound[1])
            if (!r || r.consumed_at) return { success: true, meta: { changes: 0 } }
            r.consumed_at = bound[0]
          }
          if (/UPDATE gen_charges SET credits = \?, task_key/i.test(s)) {
            const r = charges.get(bound[2]); if (r) { r.credits = bound[0]; r.task_key = bound[1]; r.status = 'charged' }
          }
          if (/UPDATE gen_charges SET usage_id/i.test(s)) { const r = charges.get(bound[1]); if (r) r.usage_id = bound[0] }
          if (/UPDATE gen_charges SET reconciled_at/i.test(s)) {
            const r = charges.get(bound[1])
            if (!r || r.reconciled_at) return { success: true, meta: { changes: 0 } }
            r.reconciled_at = bound[0]
          }
          if (/UPDATE gen_charges SET credits = \? WHERE/i.test(s)) { const r = charges.get(bound[1]); if (r) r.credits = bound[0] }
          if (/UPDATE users SET credits/i.test(s)) {
            // 정산은 ROUND(credits - ?) 한 줄이므로 음수 델타(환급)도 그대로 들어온다
            deductions.push(Number(bound[0]))
            credits = Math.round((credits - Number(bound[0])) * 100) / 100
          }
          if (/INSERT INTO ai_usage/i.test(s)) usage.set(bound[0], bound.slice())
          if (/UPDATE ai_usage SET usd/i.test(s)) {
            const r = usage.get(bound[4])
            if (!r) return { success: true, meta: { changes: 0 } }
            r[8] = bound[0]; r[9] = bound[1]; r[10] = bound[2]; r[11] = bound[3]
          }
          if (/UPDATE ai_usage SET prompt/i.test(s)) {
            const r = usage.get(bound[4])
            if (!r || String(r[1]) !== String(bound[5])) return { success: true, meta: { changes: 0 } }
          }
          return { success: true, meta: { changes: 1 } }
        },
      }
      return stmt
    },
    batch: async () => [],
    exec: async () => ({}),
    dump: async () => new ArrayBuffer(0),
    __deductions: deductions,
    get __usage() { return [...usage.values()] },
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
const agen = await load('functions/api/admin/ai-generations.ts')
const pricing = await load('functions/api/studio/_pricing.ts')
const { creditPriceFor } = await load('functions/api/payments/prepare.ts')
const { computeCharge, MODEL_COST } = pricing

// settleGenCharge 가 받는 의존성 묶음 — generate.js 가 넘기는 것과 같은 함수들이다.
const DEPS = {
  computeCharge: pricing.computeCharge, getUsdKrw: pricing.getUsdKrw,
  resolveMarkup: pricing.resolveMarkup, resolveRefSurcharge: pricing.resolveRefSurcharge,
  resolveCnSurcharge: pricing.resolveCnSurcharge, creditPriceFor, ensureAiUsage: pricing.ensureAiUsage,
  resolveCostOverride: pricing.resolveCostOverride,
}

let failed = 0
const ok = (cond, name, detail = '') => {
  if (cond) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol

/* 생성(토큰 발급) → 차감(settleGenCharge) 을 실제 코드로 한 바퀴 돈다.
   차감은 생성이 성공한 자리에서 서버가 한다 — 클라이언트가 부르는 신고 창구가 아니다.
   reportAs 를 주면 그 뒤에 "클라이언트가 이렇게 신고했다" 까지 이어서 돌린다(거짓 신고 시험용). */
async function run(spec, opts) {
  const db = makeDB(USER)
  /* generate.js 가 토큰에 적는 값과 똑같이 만든다 — 요청값이 아니라 "실제로 생성될 값" 이다.
     여기서 요청값을 그대로 넣으면 해상도 스냅(씨댄스 540p→480p, 4K→1080p)이 검증에서 빠진다. */
  const isImg = MODEL_COST[spec.model] ? MODEL_COST[spec.model].u !== 'sec' : spec.kind === 'image'
  const pbody = { ...spec, seconds: spec.units, generateAudio: !!spec.audio }
  const issueSpec = {
    ...spec,
    units: isImg ? 1 : gen.effectiveUnits(pbody, {}),
    res: isImg ? undefined : gen.effectiveRes(pbody, {}),
    ratio: gen.effectiveRatio(pbody),
    ...gen.effectiveFlags(pbody),
  }
  const token = await gc.issueGenCharge(db, '1', issueSpec)
  const taskKey = '/api/generate?task=' + token
  const settled = await gc.settleGenCharge(db, USER, token, taskKey, DEPS)
  const atSubmit = db.__deductions.reduce((a, b) => a + b, 0)
  /* 비동기 영상은 완료 응답에 제공사가 실제로 쓴 토큰 수가 실려 온다 — 그때 차액을 맞춘다. */
  let adjusted = 0
  if (opts && opts.usageTokens) adjusted = await gc.reconcileGenCharge(db, taskKey, opts.usageTokens, DEPS)
  let reported = null
  const reportAs = opts && opts.reportAs
  if (reportAs) {
    const request = new Request('https://x/api/usage/record', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'bg_session=fake' },
      body: JSON.stringify({ chargeToken: token, model: spec.model, kind: spec.kind || 'video', ...reportAs }),
    })
    const res = await rec.onRequestPost({ request, env: { DB: db, marketing: db }, params: {}, waitUntil: () => {}, next: async () => new Response('') })
    reported = await res.json()
  }
  // INSERT 컬럼 순서: id,user_id,email,name,provider,model,kind,units,usd,cost_krw,credits,revenue_krw,markup,usd_krw,created_at
  const row = db.__usage[0] || []
  return {
    body: { credits: Math.round((settled.credits + adjusted) * 100) / 100 }, reported,
    atSubmit, adjusted,
    deducted: db.__deductions.reduce((a, b) => a + b, 0),
    usageRows: db.__usage.length,
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
  const px480 = (854 * 480 * (24 * 5 + 1)) / 1024   // 프레임 = 24×초 + 1 (청구서 확인)
  ok(near(S['540p 5초'].usd, (px480 * 7.0) / 1e6, 0.002), '540p 선택 = 480p 요금(제공사가 480p 로 만든다)', `$${S['540p 5초'].usd}`)
}

console.log('\n② 제공사가 알려준 실제 소비 토큰으로 차액을 정산한다')
{
  /* 비동기 영상은 "제출된 순간" 에 추정치로 차감한다 — 그때는 제공사가 얼마를 쓸지 모른다.
     완료 응답에 실제 토큰 수가 실려 오면 그 차액만큼만 한 번 더 맞춘다.
     이게 없으면 추정이 빗나간 만큼 회원이 더 내거나 덜 낸 채로 끝난다. */
  const est = (1920 * 1080 * (24 * 5 + 1)) / 1024
  const base = S['1080p 5초']

  // ⓐ 제공사가 추정의 절반만 썼다 → 절반이 환급돼야 한다
  const less = await run({ model: 'Seedance 2.0', units: 5, res: '1080p' }, { usageTokens: est / 2 })
  ok(near(less.atSubmit, base.deducted, 0.011), 'ⓐ 제출 시점에는 추정치로 차감', `${less.atSubmit}`)
  ok(less.adjusted < 0 && near(less.deducted, base.deducted / 2, 0.011),
     'ⓐ 실측이 절반이면 최종 차감도 절반(차액 환급)', `${less.deducted} (조정 ${less.adjusted})`)
  ok(near(less.usd, base.usd / 2, 0.002), 'ⓐ 정산행 실비도 실측값으로 고쳐진다', `$${less.usd}`)

  // ⓑ 제공사가 추정보다 많이 썼다 → 그만큼 더 빠져야 한다
  const more = await run({ model: 'Seedance 2.0', units: 5, res: '1080p' }, { usageTokens: est * 1.5 })
  ok(more.adjusted > 0 && near(more.deducted, base.deducted * 1.5, 0.02),
     'ⓑ 실측이 1.5배면 최종 차감도 1.5배(차액 추가 차감)', `${more.deducted} (조정 ${more.adjusted})`)

  // ⓒ 추정이 맞았으면 아무것도 건드리지 않는다
  const same = await run({ model: 'Seedance 2.0', units: 5, res: '1080p' }, { usageTokens: est })
  ok(same.adjusted === 0 && near(same.deducted, base.deducted, 0.011),
     'ⓒ 추정이 맞으면 조정하지 않는다', `${same.deducted} (조정 ${same.adjusted})`)

  // ⓓ 폴링은 여러 번 들어온다 — 두 번째부터는 아무 일도 일어나지 않아야 한다
  const db = makeDB(USER)
  const token = await gc.issueGenCharge(db, '1', { model: 'Seedance 2.0', units: 5, res: '1080p' })
  const key = '/api/generate?task=' + token
  await gc.settleGenCharge(db, USER, token, key, DEPS)
  const d1 = await gc.reconcileGenCharge(db, key, est / 2, DEPS)
  const d2 = await gc.reconcileGenCharge(db, key, est / 2, DEPS)
  ok(d1 < 0 && d2 === 0, 'ⓓ 같은 작업을 다시 정산해도 두 번째는 0', `1회차 ${d1} · 2회차 ${d2}`)
  ok(db.__usage.length === 1, 'ⓓ 정산 후에도 관리자 줄은 한 줄뿐이다', `${db.__usage.length}줄`)

  /* ⓔ 폴링이 겹쳐 들어오면 둘 다 "아직 정산 안 됨" 을 보고 통과한다 — 조건부 UPDATE 로
     한쪽만 실제로 정산해야 한다. 순서대로 부르면 SELECT 에서 걸러져 이 경로를 못 밟는다. */
  const db2 = makeDB(USER)
  const t2 = await gc.issueGenCharge(db2, '1', { model: 'Seedance 2.0', units: 5, res: '1080p' })
  const k2 = '/api/generate?task=' + t2
  await gc.settleGenCharge(db2, USER, t2, k2, DEPS)
  const before = db2.__deductions.reduce((a, b) => a + b, 0)
  const both = await Promise.all([
    gc.reconcileGenCharge(db2, k2, est / 2, DEPS),
    gc.reconcileGenCharge(db2, k2, est / 2, DEPS),
  ])
  const applied = both.filter((d) => d !== 0)
  ok(applied.length === 1, 'ⓔ 동시에 두 번 들어와도 한쪽만 정산된다', `${JSON.stringify(both)}`)
  ok(near(db2.__deductions.reduce((a, b) => a + b, 0), before / 2, 0.011),
     'ⓔ 겹쳐 들어와도 최종 차감은 실측치 그대로', `${db2.__deductions.reduce((a, b) => a + b, 0)}`)

  /* ⓕ 관리자가 청구서를 보고 넣은 실측 단가가 있으면 그게 우선이다.
     제공사 토큰 수로 다시 계산해 덮으면 "이 값으로 청구하라" 는 지시를 말없이 뒤집는 것이 된다. */
  const db3 = makeDB(USER)
  const t3 = await gc.issueGenCharge(db3, '1', { model: 'Seedance 2.0', units: 5, res: '1080p' })
  const k3 = '/api/generate?task=' + t3
  const OV = { ...DEPS, resolveCostOverride: async () => 0.5 }   // 초당 $0.5 로 못 박아 둔 상태
  await gc.settleGenCharge(db3, USER, t3, k3, OV)
  const paid = db3.__deductions.reduce((a, b) => a + b, 0)
  const d3 = await gc.reconcileGenCharge(db3, k3, est / 2, OV)
  ok(d3 === 0 && near(db3.__deductions.reduce((a, b) => a + b, 0), paid, 1e-9),
     'ⓕ 실측 단가가 설정돼 있으면 토큰 정산이 그것을 덮지 않는다', `조정 ${d3}`)
}

console.log('\n③ 신고 창구(/api/usage/record)는 금액을 건드리지 못한다')
{
  /* 차감은 생성이 성공한 자리에서 이미 끝났다. 신고 창구는 보관·아카이브만 맡는다.
     ⓐ 신고를 아예 안 해도 차감돼 있어야 하고(호출을 생략해 공짜로 쓰던 구멍),
     ⓑ 거짓으로 신고해도 금액이 움직이면 안 된다(싸게 신고해 덜 내던 구멍). */
  const silent = await run({ model: 'Seedance 2.0', units: 10, res: '1080p' })
  ok(near(silent.deducted, S['1080p 10초'].deducted, 0.011),
     'ⓐ 신고를 생략해도 이미 차감돼 있다', `${silent.deducted}`)

  const lied = await run(
    { model: 'Seedance 2.0', units: 10, res: '1080p' },
    { reportAs: { model: 'Seedance 1.0 Lite (텍스트→영상)', units: 1, res: '480p', kind: 'image' } },
  )
  ok(near(lied.deducted, S['1080p 10초'].deducted, 0.011),
     'ⓑ "Lite 480p 1초 이미지" 로 거짓 신고해도 차감액이 그대로다',
     `${lied.deducted} vs ${S['1080p 10초'].deducted}`)
  ok(lied.reported && lied.reported.charged === 0, 'ⓑ 신고 창구는 추가로 청구하지 않는다', JSON.stringify(lied.reported))
  // 금액이 붙은 줄이 두 개면 관리자 정산 합계가 갈린다
  ok(lied.usageRows === 1, 'ⓑ 정산행은 한 줄뿐이다', `${lied.usageRows}줄`)
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
    /* 업스케일(화질 올리기)은 여기서 뺐다 — 유료 경로를 없애고 브라우저의 우리 자체 모델로 옮겨
       단가표에 항목이 없다(무료). "길이가 늘면 값이 오른다" 를 볼 대상이 아니다.
       그 무료가 유지되는지는 scripts/upscale-free.test.mjs 가 따로 지킨다.
       초당 과금 + 길이 비례는 바로 아래 나레이션으로 같은 성질을 본다. */
    ['나레이션 길이', { model: '나레이션 (AI 음성 해설)', units: 10 }, { model: '나레이션 (AI 음성 해설)', units: 40 }, 'lt'],
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

console.log('\n⑥ 관리자 생성기록 화면이 "실제로 나간 금액" 을 그대로 보여 준다')
{
  /* 화면이 읽는 건 ai_usage 인데, 예전에는 크레딧과 원가만 내보내고
     "회원 지갑에서 실제로 얼마가 빠졌는지(원)" 는 아예 없었다.
     여기서는 진짜 관리자 핸들러를 돌려서, 화면에 나가는 숫자가 실제 차감액과 같은지 본다. */
  const db = makeDB({ ...USER, role: 'admin' })   // 조회는 관리자 세션으로
  const token = await gc.issueGenCharge(db, '1', { model: 'Seedance 2.0', units: 10, res: '1080p' })
  //  settle 은 me 를 인자로 받는다 — 차감은 일반 회원으로, 조회는 관리자로 돌릴 수 있다.
  const settled = await gc.settleGenCharge(db, USER, token, '/api/generate?task=' + token, DEPS)
  const deducted = db.__deductions.reduce((a, b) => a + b, 0)

  const request = new Request('https://x/api/admin/ai-generations?limit=10', { headers: { cookie: 'bg_session=fake' } })
  const res = await agen.onRequestGet({ request, env: { DB: db, marketing: db }, params: {}, waitUntil: () => {}, next: async () => new Response('') })
  const body = await res.json()
  const row = (body.items || [])[0]

  ok(!!row, '생성기록에 줄이 나온다', JSON.stringify(body).slice(0, 120))
  if (row) {
    ok(near(row.credits, deducted, 1e-9), '크레딧 = 실제 차감 크레딧', `${row.credits} vs ${deducted}`)
    ok(near(row.revenueKrw, Math.round(deducted * CREDIT_KRW), 0.5),
       '실제 차감(원) = 크레딧 × 회원 단가', `${row.revenueKrw} vs ${Math.round(deducted * CREDIT_KRW)}`)
    ok(near(row.costKrw, row.usd * row.usdKrw, 0.00005 * row.usdKrw + 0.01),
       'AI 원가(원) = 실비USD × 그날 환율', `${row.costKrw} vs ${row.usd}×${row.usdKrw}`)
    ok(near(row.profitKrw, row.revenueKrw - row.costKrw, 1e-9), '마진 = 실제 차감 − 원가')
    ok(row.units === 10, '길이가 함께 나온다(금액을 눈으로 검산할 수 있게)', `${row.units}`)
    ok(row.archiveOnly === false, '금액이 붙은 줄은 보관 전용으로 표시되지 않는다')
    ok(near(row.credits, settled.credits, 1e-9), '화면 값과 정산이 돌려준 값이 같다')
  }

  //  금액이 안 붙은 보관 전용 줄은 "0원" 이 아니라 보관 기록으로 구분돼야 한다
  const db2 = makeDB({ ...USER, role: 'admin' })
  await db2.prepare(
    `INSERT INTO ai_usage (id,user_id,email,name,provider,model,kind,units,usd,cost_krw,credits,revenue_krw,markup,usd_krw,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind('au_arch', '1', '', '', 'seedance', 'Seedance 2.0', 'video', 10, 0, 0, 0, 0, 2.5, FX, new Date().toISOString()).run()
  const r2 = await agen.onRequestGet({
    request: new Request('https://x/api/admin/ai-generations?limit=10', { headers: { cookie: 'bg_session=fake' } }),
    env: { DB: db2, marketing: db2 }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  const b2 = await r2.json()
  const arch = (b2.items || [])[0]
  ok(arch && arch.archiveOnly === true, '금액 0 인 줄은 보관 전용으로 표시된다(공짜 생성으로 읽히지 않게)', JSON.stringify(arch || {}).slice(0, 100))
}

console.log(failed === 0 ? '\n과금 연쇄 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
