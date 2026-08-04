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
  ok(ali.length > 0 && ali.every((x) => x.costProvisional === true), '단가가 잠정이라고 화면에 넘긴다',
     '확정값처럼 보이면 그 값을 믿고 판다')
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

console.log(failed === 0
  ? '\n알리바바 관리자 노출 — 실패 0 (모델 화면 · 단가 화면 · 등록부 · 표 일치)'
  : `\n실패 ${failed}건`)
process.exit(failed ? 1 : 0)
