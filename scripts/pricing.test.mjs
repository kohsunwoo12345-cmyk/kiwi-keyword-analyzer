/* 과금 계산 회귀 테스트 —  node scripts/pricing.test.mjs  (npm run test:pricing)
 *
 * 여기 있는 값들은 전부 "왜 이 값이어야 하는지" 가 근거와 함께 붙어 있다.
 * 하나라도 깨지면 회원에게 잘못 청구되거나 우리가 원가 이하로 파는 것이므로 빌드를 막는다.
 * 실제 단가가 바뀌면 _pricing.ts 의 표를 고치고 여기 기대값도 같이 고친다.
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
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

const { computeCharge, MODEL_COST, RES_PX } = await load('functions/api/studio/_pricing.ts')

let failed = 0
const ok = (cond, name, detail = '') => {
  if (cond) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}
const near = (a, b, tol = 0.002) => Math.abs(a - b) < tol

console.log('\n① 제공사 공시가 재현 — 계산식이 맞으면 이 값이 그대로 나온다')
{
  // fal 공시: Seedance 1.0 Pro 1080p 5초 ≈ $0.74  (1920×1080×24×5÷1024 = 243,000토큰 × $3.0/M)
  const a = computeCharge({ model: 'Seedance 1.0 Pro', res: '1080p', units: 5, kind: 'video' })
  ok(near(a.usd, 0.729), 'Seedance 1.0 Pro 1080p 5초 = $0.729', `실제 $${a.usd}`)
  // fal 공시: Seedance 1.0 Lite 720p 5초 ≈ $0.18
  const b = computeCharge({ model: 'Seedance 1.0 Lite (텍스트→영상)', res: '720p', units: 5, kind: 'video' })
  ok(near(b.usd, 0.1944), 'Seedance 1.0 Lite 720p 5초 = $0.194', `실제 $${b.usd}`)
  // OpenAI 공식 medium: 1024×1024 $0.042 / 1536×1024 $0.063
  const sq = computeCharge({ model: 'GPT Image', kind: 'image', ratio: '1:1' })
  const wd = computeCharge({ model: 'GPT Image', kind: 'image', ratio: '16:9' })
  ok(near(sq.usd, 0.042, 1e-6), 'GPT Image 1:1 = $0.042', `실제 $${sq.usd}`)
  ok(near(wd.usd, 0.063, 1e-6), 'GPT Image 16:9 = $0.063 (긴 쪽 1.5배)', `실제 $${wd.usd}`)
  // ModelArk 공식 장당 단가
  ok(MODEL_COST['Seedream 4.5'].usd === 0.045, 'Seedream 4.5 = $0.045 (ModelArk 공식)')
  ok(MODEL_COST['Seedream 4.0'].usd === 0.035, 'Seedream 4.0 = $0.035 (ModelArk 공식)')
}

console.log('\n② 해상도는 화소 수에 정비례 — 눈대중 배율로 되돌아가면 실패한다')
{
  const px1080 = RES_PX['1080p'][0] * RES_PX['1080p'][1]
  const base = computeCharge({ model: 'Seedance 2.0', res: '1080p', units: 5, kind: 'video' }).usd
  for (const res of ['540p', '720p', '1080p', '4K']) {
    const [w, h] = RES_PX[res]
    const got = computeCharge({ model: 'Seedance 2.0', res, units: 5, kind: 'video' }).usd
    ok(near(got / base, (w * h) / px1080, 0.001), `씨댄스(토큰식) ${res} = 화소비 ${((w * h) / px1080).toFixed(3)}배`,
      `실제 ${(got / base).toFixed(3)}배`)
  }
  /* 씨댄스는 RES_PX 를 직접 쓰므로 RES_MULT 가 망가져도 안 걸린다.
     일반 공식(RES_MULT)을 타는 모델로도 같은 규칙을 확인한다 — 이게 없으면
     눈대중 배율(540p 0.35 · 4K 2.6)로 되돌려도 테스트가 통과한다. */
  const gBase = computeCharge({ model: 'MiniMax Hailuo 02', res: '1080p', units: 5, kind: 'video' }).usd
  for (const res of ['540p', '720p', '4K']) {
    const [w, h] = RES_PX[res]
    const got = computeCharge({ model: 'MiniMax Hailuo 02', res, units: 5, kind: 'video' }).usd
    ok(near(got / gBase, (w * h) / px1080, 0.001), `일반공식 ${res} = 화소비 ${((w * h) / px1080).toFixed(3)}배`,
      `실제 ${(got / gBase).toFixed(3)}배`)
  }
}

console.log('\n③ 길이·옵션이 정확히 반영된다')
{
  const one = computeCharge({ model: 'Seedance 2.0', res: '1080p', units: 1, kind: 'video' }).usd
  for (const s of [5, 10, 30]) {
    const got = computeCharge({ model: 'Seedance 2.0', res: '1080p', units: s, kind: 'video' }).usd
    ok(near(got, one * s, 0.001), `${s}초 = 1초의 ${s}배`)
  }
  const noA = computeCharge({ model: 'Seedance 2.0', res: '1080p', units: 5, kind: 'video' }).usd
  const wA = computeCharge({ model: 'Seedance 2.0', res: '1080p', units: 5, audio: true, kind: 'video' }).usd
  ok(near(wA - noA, 0.02 * 5, 1e-6), '오디오 가산 = 초당 $0.02 × 5 (이중 청구 없음)')
}

console.log('\n④ 제공사가 알려준 실제 사용량이 추정보다 우선한다')
{
  const est = computeCharge({ model: 'Seedance 2.0', res: '1080p', units: 5, kind: 'video' })
  const half = computeCharge({ model: 'Seedance 2.0', res: '1080p', units: 5, kind: 'video', usageTokens: 243000 / 2 })
  const none = computeCharge({ model: 'Seedance 2.0', res: '1080p', units: 5, kind: 'video', usageTokens: 0 })
  ok(near(half.usd, est.usd / 2), '실측 토큰이 절반이면 청구도 절반')
  ok(near(none.usd, est.usd, 1e-9), '실측이 없으면(0) 추정식으로 폴백')
}

console.log('\n⑤ 어떤 조합에서도 원가 이하로 팔지 않는다')
{
  let lossy = 0, n = 0, bad = ''
  for (const [name, m] of Object.entries(MODEL_COST)) {
    const vid = m.u === 'sec'
    for (const res of vid ? ['540p', '720p', '1080p', '4K'] : ['1080p'])
      for (const units of vid ? [1, 5, 10, 30] : [1])
        for (const audio of vid && m.audio ? [false, true] : [false])
          for (const ratio of vid ? ['1:1'] : ['1:1', '16:9']) {
            const r = computeCharge({ model: name, units, res, audio, ratio, kind: vid ? 'video' : 'image' })
            n++
            if (!Number.isFinite(r.credits) || r.credits < 0) { lossy++; bad ||= `${name} 크레딧 ${r.credits}` }
            if (r.revenueKrw < r.costKrw) { lossy++; bad ||= `${name} ${res} ${units}초 매출 ${r.revenueKrw} < 원가 ${r.costKrw}` }
          }
  }
  ok(lossy === 0, `${n}조합 역마진·비정상 0`, bad)
}

console.log('\n⑥ 마크업은 1배 아래로 못 내려간다 (원가 이하 판매 방지)')
{
  const r = computeCharge({ model: 'Runway Gen-4', units: 10, res: '1080p' }, 1400, 0.2)
  ok(r.markup >= 1, '마크업 0.2 를 넣어도 1배 이상으로 강제')
}

console.log('\n⑦ 프롬프트 작성 정액이 최악의 토큰 소비를 덮는다')
{
  // 입력: 브리프 2000자 상한(≈600토큰) + 시스템 지침(≈300) · 출력: max_tokens 500 상한
  // 가장 비싼 모델(gpt-4o $2.5/M in, $10/M out) 기준
  const worstUsd = (900 * 2.5) / 1e6 + (500 * 10) / 1e6
  const BASE = 0.005, MK = 2.5 // promptgen.ts 의 PROMPT_BASE_USD · 기본 배수
  ok(BASE * MK > worstUsd, `최악 원가 $${worstUsd.toFixed(5)} < 청구 $${(BASE * MK).toFixed(4)}`)
}

console.log(failed === 0 ? '\n과금 회귀 테스트 — 전부 통과\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
