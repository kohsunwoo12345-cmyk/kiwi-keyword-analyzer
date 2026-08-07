/* 관리자 화면에 알리바바 모델이 다 올라왔는가 — 진짜 관리자 핸들러를 그대로 돌린다.
 *
 * "코드에 넣었다" 와 "관리자 화면에 뜬다" 는 다른 얘기다. 화면은 세 군데서 목록을 만든다.
 *   ㉠ AI 모델(ai-models)      — MODEL_COST 를 훑는다
 *   ㉡ 모델 단가(model-pricing) — 여기서 배수·원가를 바꾼다. 목록에 없으면 설정 자체를 못 한다
 *   ㉢ 모델 등록부(model-registry) — 노드 피커에 얹히는 목록. 켜고 끄는 자리다
 * 한 군데라도 빠지면 "모델은 있는데 요금을 못 만지는" 상태가 된다.
 *
 * 그리고 단가가 잠정이라는 사실이 화면까지 가야 한다. 확정값처럼 보이면 그걸 믿고 판다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs',
                            platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console, AbortController,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}', { status: 200 }),
    btoa, atob, setTimeout, clearTimeout, structuredClone,
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

const ADMIN = { id: 'a1', email: 'admin@x.co', name: '관리자', role: 'admin', status: 'active', credits: 0 }
function adminDB(rows = []) {
  const first = async (s) => {
    if (/FROM sessions s JOIN users u/i.test(s)) return { ...ADMIN }
    if (/FROM users WHERE id/i.test(s)) return { ...ADMIN }
    if (/FROM settings WHERE key/i.test(s)) return null
    return null
  }
  const all = async (s) => {
    if (/FROM model_registry/i.test(s)) return { results: rows }
    return { results: [] }
  }
  return {
    prepare(sql) {
      const s = String(sql)
      const mk = (b) => ({ first: () => first(s, b), run: async () => ({ meta: { changes: 1 } }), all: () => all(s, b) })
      return { bind: (...b) => mk(b), ...mk([]) }
    },
    async batch(st) { return (st || []).map(() => ({ results: [] })) },
    //  ⚠ dump 가 없으면 resolveDB 가 이 객체를 D1 으로 안 본다 → "DB 바인딩 없음" 500.
    //     실제로 그렇게 빈 목록을 받아 놓고 "0개" 를 세고 있었다.
    async dump() { return new ArrayBuffer(0) },
  }
}
const ENV = { DB: null, alibaba_API_KEY: 'sk-ws-test' }
const req = (path) => new Request('https://bygency.com' + path, {
  headers: { cookie: 'bg_session=t', host: 'bygency.com' },
})
const call = async (mod, db, path) => {
  const res = await mod.onRequestGet({ request: req(path), env: { ...ENV, DB: db }, params: {},
                                       waitUntil: () => {}, next: async () => new Response('') })
  try { return JSON.parse(await res.text()) } catch { return {} }
}

//  표는 한 군데(_alibaba.ts)가 정답이다. 몇 개여야 하는지도 거기서 읽는다 —
//  숫자를 여기 적어 두면 모델을 늘렸을 때 이 검사만 옛날 수를 붙들고 통과한다.
const src = fs.readFileSync(new URL('../functions/api/studio/_alibaba.ts', import.meta.url), 'utf8')
const EXPECT = (src.match(/^\s{2}[VI]\('/gm) || []).length
const EXPECT_V = (src.match(/^\s{2}V\('/gm) || []).length
const EXPECT_I = (src.match(/^\s{2}I\('/gm) || []).length

console.log(`\n(표에 적힌 알리바바 모델: 영상 ${EXPECT_V} · 이미지 ${EXPECT_I} · 합계 ${EXPECT})`)
ok(EXPECT > 50, '표에 모델이 실제로 들어 있다', String(EXPECT))

console.log('\n⓪ 모델 ID 가 제공사가 실제로 아는 것과 한 글자도 안 틀리는가')
{
  /* 이게 틀리면 회원이 고를 수는 있는데 누르면 "Model not exist." 가 난다.
     화면상으로는 멀쩡해 보여서 눌러 보기 전에는 아무도 모른다.
     그래서 운영 키로 받은 실제 목록을 그대로 떠 놓고(fixtures) 양방향으로 맞춘다 —
     빠진 것도, 목록에 없는데 우리가 지어낸 것도 둘 다 잡아야 한다. */
  const prod = JSON.parse(fs.readFileSync(new URL('./fixtures/alibaba-models.prod.json', import.meta.url), 'utf8'))
  const ours = [...src.matchAll(/^\s{2}[VI]\('[^']+',\s*'([^']+)'/gm)].map((m) => m[1])
  const want = [...prod.wan, ...prod.기타이미지]

  ok(ours.length === new Set(ours).size, '우리 표에 같은 모델 ID 가 두 번 들어가지 않았다',
     ours.filter((x, i) => ours.indexOf(x) !== i).join(', '))
  const missing = want.filter((x) => !ours.includes(x))
  ok(missing.length === 0, `제공사 목록의 ${want.length}개가 하나도 안 빠졌다`, missing.join(', '))
  const extra = ours.filter((x) => !want.includes(x))
  ok(extra.length === 0, '제공사에 없는 이름을 지어내지 않았다 — 누르면 "Model not exist." 가 난다',
     extra.join(', '))
  //  일부러 뺀 것은 뺀 채로 있어야 한다(슬그머니 들어오면 그것도 어긋난 것이다)
  const hh = ours.filter((x) => /^happyhorse/.test(x))
  ok(hh.length === 0, '알리바바 자체 모델이 아닌 것(happyhorse)은 안 들어 있다', hh.join(', '))
  console.log(`       (제공사 ${want.length}개 ↔ 우리 표 ${ours.length}개 — 양방향 일치)`)
}

console.log('\n① AI 모델 화면 — 56개가 다 보이고, 연동됨으로 잡히고, 모델 ID 가 붙는다')
{
  const m = await load('functions/api/admin/ai-models.ts')
  const j = await call(m, adminDB(), '/api/admin/ai-models')
  const ali = (j.models || []).filter((x) => x.provider === 'alibaba')
  ok(ali.length === EXPECT, `알리바바 모델이 ${EXPECT}개 다 보인다`, String(ali.length))
  //  빈 배열에 .every 는 언제나 참이다 — 목록이 0개일 때 이 줄이 그냥 통과했다
  ok(ali.length > 0 && ali.every((x) => x.keyConfigured), '키가 설정된 것으로 잡힌다 — 아니면 "연동 없음" 으로 뜬다',
     String(ali.filter((x) => !x.keyConfigured).length) + '개가 미연동')
  const noId = ali.filter((x) => /파이프라인/.test(x.modelId))
  ok(ali.length > 0 && noId.length === 0, '모델 ID 가 전부 붙는다', noId.slice(0, 3).map((x) => x.model).join(', '))
  const t2v = ali.find((x) => x.model === 'Wan 2.7 (텍스트→영상)')
  ok(t2v && t2v.modelId === 'wan2.7-t2v', '표시명이 실제 제공사 ID 로 이어진다', JSON.stringify(t2v && t2v.modelId))
  ok(t2v && Number(t2v.credits) > 0, '예상 크레딧이 계산된다 — 0 이면 사실상 공짜로 팔린다',
     JSON.stringify(t2v && t2v.credits))
  /* 확정(A)과 상한(C)을 화면에서 갈라 보여 줘야 한다.
     전부 [잠정] 이면 확정된 값까지 못 믿게 되고, 전부 확정처럼 보이면 상한을 믿고 판다. */
  const confirmed = ali.filter((x) => !x.costProvisional)
  const provisional = ali.filter((x) => x.costProvisional)
  ok(confirmed.length > 0 && provisional.length > 0, '확정과 상한이 둘 다 있고 갈라져 있다',
     `확정 ${confirmed.length} · 상한 ${provisional.length}`)
  ok(confirmed.some((x) => x.model === 'Wan 2.7 (텍스트→영상)'),
     '출처 둘이 일치한 값은 [잠정] 딱지가 없다', JSON.stringify(confirmed.map((x) => x.model).slice(0, 3)))
  ok(provisional.some((x) => /Qwen/.test(x.model)),
     '값이 안 나온 것은 [잠정] 딱지가 붙는다', String(provisional.length))
  ok((j.providers || []).some((p) => p.id === 'alibaba' && p.count === EXPECT),
     '제공사 묶음에도 알리바바가 잡힌다', JSON.stringify((j.providers || []).find((p) => p.id === 'alibaba')))
}

console.log('\n② 모델 단가 화면 — 여기 없으면 배수·원가를 아예 못 만진다')
{
  const m = await load('functions/api/admin/model-pricing.ts')
  const j = await call(m, adminDB(), '/api/admin/model-pricing')
  const ali = (j.models || []).filter((x) => /^(Wan|Qwen 이미지|Z-Image)/.test(String(x.model)))
  ok(ali.length === EXPECT, `단가 화면에도 ${EXPECT}개가 다 있다`, String(ali.length))
  /*  이 화면이 내려주는 이름은 usd·multiplier 가 아니다(내가 처음에 그렇게 짐작해서 헛failed 났다).
      실제로는 baseKrw(원가 원) · effectiveMarkup(적용 배수) · effectiveCredits(팔 크레딧) 이다. */
  const t2v = ali.find((x) => x.model === 'Wan 2.7 (텍스트→영상)')
  ok(t2v && Number(t2v.baseKrw) > 0, '원가가 0 이 아니다 — 0 이면 마진 계산이 통째로 무너진다',
     JSON.stringify(t2v && t2v.baseKrw))
  ok(t2v && Number(t2v.effectiveMarkup) >= 1, '배수가 1 이상으로 잡힌다 — 1 미만이면 원가보다 싸게 판다',
     JSON.stringify(t2v && t2v.effectiveMarkup))
  ok(t2v && Number(t2v.effectiveCredits) > Number(t2v.baseCredits),
     '팔 값이 원가보다 크다', JSON.stringify(t2v && { base: t2v.baseCredits, sell: t2v.effectiveCredits }))
  //  원가 덮어쓰기 자리가 열려 있어야 실측 단가로 고칠 수 있다
  ok(t2v && 'costOverrideUsd' in t2v, '실측 단가로 덮을 자리가 있다', JSON.stringify(t2v && t2v.costOverrideUsd))
}

console.log('\n③ 모델 등록부 — 노드 피커에 얹히고, 관리자가 켜고 끌 수 있다')
{
  //  등록부는 DB 를 읽는다. 심는 코드가 표 전체를 도는지 본다(몇 개만 심으면 나머지는 안 뜬다).
  const reg = fs.readFileSync(new URL('../functions/api/studio/_registry.ts', import.meta.url), 'utf8')
  ok(/for \(const r of ALIBABA_MODELS\)/.test(reg), '표 전체를 돌면서 심는다')
  ok(/INSERT OR IGNORE INTO model_registry/.test(reg),
     '관리자가 손댄 줄을 덮지 않는다 — 덮으면 껐던 모델이 배포 때마다 되살아난다')
  ok(/ensureOnce\(db, 'seed_alibaba_v1'/.test(reg), '한 번만 심는다')
  ok(/await seedAlibaba\(db\)/.test(reg), '등록부를 쓸 때 실제로 심긴다')
}

console.log('\n④ 표가 서로 어긋나지 않는다')
{
  const price = fs.readFileSync(new URL('../functions/api/studio/_pricing.ts', import.meta.url), 'utf8')
  ok(/for \(const r of ALIBABA_MODELS\)/.test(price),
     '서버 단가표는 표를 얹기만 한다 — 손으로 옮겨 적으면 반드시 어긋난다')
  ok(!/'Wan 2\.7 \(텍스트→영상\)':/.test(price), '단가표에 손으로 베껴 적은 줄이 없다')
  const aim = fs.readFileSync(new URL('../functions/api/admin/ai-models.ts', import.meta.url), 'utf8')
  ok(/ALIBABA_BY_NAME/.test(aim), '관리자 화면도 같은 표에서 모델 ID 를 가져온다')
}

console.log('\n⑤ 해상도 구간 — 720p 를 화소비로 깎으면 원가보다 싸게 판다')
{
  /* 알리바바 공개 단가는 720P ¥0.6 / 1080P ¥1.0 — 0.6 배다. 화소비(0.444)가 아니다.
     기본 계산에 맡기면 720p 를 실제 원가의 74%만 받는다. 그 26% 는 우리가 문다. */
  const pricing = await load('functions/api/studio/_pricing.ts')
  const { computeCharge } = pricing
  const M = 'Wan 2.7 (텍스트→영상)'
  const at = (res) => computeCharge({ model: M, units: 5, kind: 'video', res }, 1400, 1)  // 배수 1 = 원가 그대로
  const k1080 = at('1080p').costKrw, k720 = at('720p').costKrw
  ok(k1080 > 0 && k720 > 0, '두 구간 다 값이 나온다', `${k720} / ${k1080}`)
  ok(Math.abs(k720 / k1080 - 0.6) < 0.02,
     '720p 가 1080p 의 0.6 배다(공개 표 그대로)', `실제 비율 ${(k720 / k1080).toFixed(3)}`)
  ok(k720 / k1080 > 0.5,
     '화소비(0.444)로 깎이지 않는다 — 깎이면 720p 를 26% 덜 받는다', `${(k720 / k1080).toFixed(3)}`)
  //  ¥0.6/초 = $0.086 → 5초 × 1400원 = 602원. 중국 표와 국제판 공개가가 맞아떨어지는 지점이다.
  ok(Math.abs(k720 - 602) <= 2, '720p 5초 원가가 공개 단가와 맞는다(¥0.6/초 = $0.086 → ₩602)', String(k720))
  ok(Math.abs(k1080 - 1008) <= 2, '1080p 5초 원가가 맞는다(¥1.0/초 = $0.144 → ₩1,008)', String(k1080))
  //  확정된 다른 구간도 같이 본다 — 하나만 맞춰 두면 나머지가 어긋나도 모른다
  const w22 = computeCharge({ model: 'Wan 2.2 Plus (텍스트→영상)', units: 5, kind: 'video', res: '720p' }, 1400, 1)
  ok(Math.abs(w22.costKrw - 399) <= 3, 'wan2.2 plus 720p 도 공개 단가와 맞는다(¥0.4/초 = $0.057 → ₩399)',
     String(w22.costKrw))
  const t2i = computeCharge({ model: 'Wan 2.6 (텍스트→이미지)', units: 1, kind: 'image' }, 1400, 1)
  ok(Math.abs(t2i.costKrw - 41) <= 2, '이미지도 맞는다(¥0.2/장 = $0.029 → ₩41)', String(t2i.costKrw))
  //  배수를 태우면 반드시 원가보다 커야 한다
  const sell = computeCharge({ model: M, units: 5, kind: 'video', res: '720p' }, 1400)
  ok(sell.costKrw < sell.revenueKrw, '기본 배수로 팔면 원가보다 크다',
     `원가 ${sell.costKrw} → 매출 ${sell.revenueKrw}`)
}

console.log(failed === 0
  ? '\n알리바바 관리자 노출 — 실패 0 (모델 화면 · 단가 화면 · 등록부 · 표 일치 · 해상도 구간)'
  : `\n실패 ${failed}건`)
process.exit(failed ? 1 : 0)
