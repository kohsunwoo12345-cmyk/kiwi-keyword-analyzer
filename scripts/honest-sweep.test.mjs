/* 전 엔드포인트 정직성 훑기 —  node scripts/honest-sweep.test.mjs
 *
 * 조회를 전부 실패시켜 놓고 GET 엔드포인트를 하나씩 불러 본다.
 * "성공했다" 고 답하면서 빈 목록·0 을 돌려주는 곳이 있으면 잡는다.
 *
 * 이 방식이 아니면 안 잡히는 이유:
 *   문자열 규칙(catch 안에 success:true 가 있나)으로는 모양이 조금만 달라도 새어 나간다.
 *   실제로 이렇게 생긴 자리들이 있었다.
 *     · catch 는 로그만 남기고, 그 아래 성공 return 으로 그냥 흘러간다
 *     · .all().catch(() => ({ results: [] })) 처럼 질의에 바로 붙어 있다
 *     · 헬퍼가 안에서 삼키고 기본값을 돌려준다(설정 화면이 초기값으로 보인다)
 *   전부 "오류 없음 + 빈 화면" 으로 끝나서, 당한 사람만 안다.
 *
 * ⚠ 가짜 D1 은 resolveDB 가 D1 로 인정하는 모양이어야 한다(prepare·batch·dump).
 *   하나라도 빠지면 db 가 null 로 잡혀 "DB 없음" 분기만 확인하고 끝난다 —
 *   실제로 그렇게 헛돌고 있었다.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '\n         ' + detail : ''}`) }
}

/* 회원의 데이터가 아니거나, 비어도 화면이 멀쩡해야 하는 것들.
   여기 적을 때는 "왜 비워도 되는지" 를 함께 남긴다. */
const OK_TO_DEGRADE = new Map([
  ['geo.ts', '접속 국가 — DB 를 안 쓴다'],
  ['health.ts', '헬스체크 — 못 읽는 상태 자체를 보고하는 게 일이다'],
  ['me.ts', '세션으로 나를 알려 준다 — 다른 조회가 실패해도 로그인 상태는 맞다'],
  ['plan-config.ts', '요금제 안내 — 코드에 든 기본값이 정답이다'],
  ['v1/models.ts', '빌릴 수 있는 모델 카탈로그 — 코드에 든 목록이다'],
  ['v1/controlnet.ts', '사용법 안내 — DB 와 무관하다'],
  ['studio/models.ts', '모델 목록 — 화면에 기본값이 따로 있다'],
  ['notices.ts', '공지 — 못 읽었다고 화면을 막을 이유가 없다'],
  ['public-notices.ts', '공지·광고 — 방문자 화면을 막으면 안 된다'],
  ['pixabay/search.ts', '외부 이미지 검색 — 우리 DB 가 아니다'],
  ['instagram/app-config.ts', '환경변수 설정 여부만 본다'],
  ['team/pay.ts', '좌석 단가는 코드 값 — 회원 행은 세션에서 온다'],
  ['funnel/sms/check-config.ts', '연동 설정 여부 — 못 읽으면 "설정 필요" 가 맞다'],
  ['kakao/alimtalk/templates.ts', '제공사 목록이 우선 — DB 는 보조 사본이다'],
  ['blog-analysis/monitoring/list.ts', '표가 아직 없을 수 있는 자리 — 빈 목록이 맞다'],
  ['students.ts', '학원 SaaS 이식 잔재 — 표도 없고 부르는 화면도 없다(제품 결정 대기)'],
  ['account/mcp-token.ts', '토큰은 세션 기준으로 만든다 — 저장이 실패하면 그때 던진다'],
  ['landing/form-submissions.ts', 'slug 없이 부르면 빈 목록이 맞다(있으면 아래 정직성 검사가 따로 본다)'],
  //  관리자 화면 중 "상태를 보고하는 것이 일" 인 자리 — 못 읽는 것도 보고할 내용이다
  ['admin/self-test.ts', '자가진단 — 못 읽는 상태 자체를 결과로 보고한다'],
  ['admin/security-risk.ts', '보안 점검 — 항목별 통과/실패를 세어 보여 준다'],
  ['admin/aligo-test.ts', '문자 연동 진단 — 설정 여부를 보고한다'],
  ['admin/api-balance.ts', '제공사 잔액 안내 — 목록은 코드에 있다'],
  ['admin/ai-models.ts', '모델 점검 — 코드에 든 목록 위에 상태를 표시한다'],
  //  코드에 든 기본값이 곧 정답인 설정 화면들
  ['admin/plan-config.ts', '요금제 기본값 — DB 는 덮어쓰기용이다'],
  ['admin/msg-rates.ts', '문자 단가 기본값 — DB 는 덮어쓰기용이다'],
  ['admin/model-pricing.ts', '모델 단가 기본값 — DB 는 덮어쓰기용이다'],
  //  이식된 분석 모듈 — 스키마를 PRAGMA 로 훑어 만드는 구조라 통째로 손봐야 한다(따로 다룬다)
  ['admin/funnel-landing-analytics.ts', 'SUPERPLACE 이식 분석 모듈 — 칸 탐색부터 삼킨다(별도 정리 대상)'],
])

async function load(file) {
  const out = await build({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_,
    console: { log() {}, warn() {}, error() {} },
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}'), btoa, atob, setTimeout, clearTimeout, structuredClone, AbortController,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

/** 세션은 살아 있고, 그 외의 SELECT 는 전부 터지는 D1. */
function brokenDB(role = 'user') {
  const userRow = { id: 'u1', email: 'a@b.c', role, name: 'n' }
  const st = (sql) => ({
    bind: () => st(sql),
    async first() {
      //  집계는 회원 행이 아니다 — 여기서 회원 행을 돌려주면 0 이 "진짜 0" 처럼 보여 검사가 헛돈다
      if (/\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(sql)) throw new Error('D1_ERROR: boom')
      if (/FROM sessions/i.test(sql)) return userRow
      if (/FROM users/i.test(sql)) return userRow
      if (/AS ok FROM|AS x FROM|SELECT 1 /i.test(sql)) return { ok: 1, x: 1 }
      if (/^\s*SELECT/i.test(sql)) throw new Error('D1_ERROR: boom')
      return null
    },
    async run() { return { meta: { changes: 1 } } },
    async all() {
      if (/^\s*SELECT/i.test(sql) && !/sqlite_master|PRAGMA/i.test(sql)) throw new Error('D1_ERROR: boom')
      return { results: [] }
    },
  })
  return {
    prepare: (s) => st(String(s)),
    async batch(x) { return (x || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.ts$/.test(e.name) && !e.name.startsWith('_')) out.push(p)
  }
  return out
}

const bad = []
let scanned = 0
for (const p of walk(path.join(ROOT, 'functions/api'))) {
  const src = fs.readFileSync(p, 'utf8')
  if (!/export const onRequestGet/.test(src)) continue
  const rel = path.relative(path.join(ROOT, 'functions/api'), p)
  //  관리자 화면도 같이 본다 — "매출 0원" · "회원 0명" 을 오류 없이 보여 주면 더 나쁘다
  let mod
  try { mod = await load(path.relative(ROOT, p)) } catch { continue }
  if (typeof mod.onRequestGet !== 'function') continue
  const url = 'https://bygency.com/api/' + rel.replace(/\.ts$/, '').replace(/\[\[.*?\]\]/, 'x').replace(/\[(\w+)\]/g, '1')
  let res
  try {
    res = await mod.onRequestGet({
      request: new Request(url, { headers: { host: 'bygency.com', cookie: 'bg_session=t' } }),
      env: { DB: brokenDB(rel.startsWith('admin/') ? 'admin' : 'user') },
      params: { id: '1', key: ['x'], path: ['x'], slug: 'x', token: 'x', templateId: '1', groupId: '1' },
      waitUntil: () => {}, next: async () => new Response(''),
    })
  } catch { continue }          // 던지면 500 이 된다 — 그건 정직하다
  scanned++
  const txt = await res.text().catch(() => '')
  let body = {}
  try { body = JSON.parse(txt) } catch { /* HTML 응답 등 */ }
  const claimsOk = body.success === true || body.ok === true
  if (res.status < 400 && claimsOk && !OK_TO_DEGRADE.has(rel))
    bad.push(`${rel}  ${res.status}  ${txt.slice(0, 90)}`)
}

console.log('\n① 조회가 전부 실패하면 어떤 엔드포인트도 "성공" 이라고 답하지 않는다')
{
  ok(scanned > 80, `GET 엔드포인트를 충분히 불러 봤다 (${scanned}곳)`, String(scanned))
  ok(bad.length === 0, '실패를 성공으로 답하는 곳이 없다', bad.join('\n         '))
}

console.log('\n② 비워도 되는 예외가 조용히 늘지 않는다')
{
  const have = new Set(walk(path.join(ROOT, 'functions/api')).map((p) => path.relative(path.join(ROOT, 'functions/api'), p)))
  const stale = [...OK_TO_DEGRADE.keys()].filter((k) => !have.has(k))
  ok(stale.length === 0, '없는 파일이 예외에 남아 있지 않다', stale.join(', '))
  ok(OK_TO_DEGRADE.size <= 28, `예외가 늘지 않았다 (${OK_TO_DEGRADE.size}개)`, String(OK_TO_DEGRADE.size))
}

console.log(failed === 0 ? '\n정직성 훑기 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
