/* 공개 퍼널 신청 회귀 테스트 —  node scripts/funnel-apply.test.mjs
 *
 * /api/funnel/apply 는 방문자가 실제로 신청을 남기는 자리다. 돈이 걸린 끝단이다.
 *
 * 실제로 이랬다: 신청자 저장이 실패해도 응답은 언제나
 *   { success: true, applicantSaved: true }
 * 였다. INSERT 두 번이 모두 .catch(() => {}) 로 삼켜졌기 때문이다. 그러면
 *   · 방문자는 "신청 완료" 를 보고 떠나고
 *   · 자동응답 문자·알림톡이 "접수되었습니다" 라고 나가고(건당 유료다)
 *   · 정작 신청자 정보는 어디에도 없어 영업이 연락할 길이 없다.
 * 게다가 번호 제한(10분 1건)을 저장 "전에" 한 칸 쓰기 때문에, 방문자가 곧바로
 * 다시 넣으면 "이미 신청이 접수되었습니다" 로 막힌다 — 그대로 놓치는 손님이 된다.
 * 실측으로 확인했다(진짜 Workers 런타임 + 진짜 D1 에 INSERT 중단 트리거를 걸어).
 *
 * 그래서 여기서는 저장을 실제로 실패시켜 놓고 진짜 핸들러를 돌린다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console,
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto, fetch, btoa, atob,
    setTimeout, clearTimeout, structuredClone,
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

/* 필요한 것만 흉내 내는 D1.
   applicantInsert 로 신청자 저장의 성패를 바깥에서 조종한다.
   'full'  = 신구 컬럼 모두 있는 지금 스키마만 성공
   'legacy'= 첫 INSERT 는 실패하고 구버전 폴백만 성공
   'none'  = 둘 다 실패 (디스크 오류·제약 위반 등) */
function makeDB({ applicantInsert = 'full', phoneHits = 0 } = {}) {
  const sqls = []
  const run = async (sql, args) => {
    sqls.push({ sql, args })
    if (/INSERT INTO funnel_applicants/.test(sql)) {
      const isLegacy = !/name, phone, email/.test(sql)
      if (applicantInsert === 'none') throw new Error('디스크 오류 흉내')
      if (applicantInsert === 'legacy' && !isLegacy) throw new Error('구버전 스키마 — name 컬럼 없음')
    }
    return { meta: { changes: 1, last_row_id: 1 } }
  }
  const first = async (sql, args) => {
    sqls.push({ sql, args })
    if (/FROM funnel_landing_pages WHERE slug/.test(sql)) return { id: 7, group_id: 3, title: '검증 랜딩' }
    if (/COUNT\(\*\) AS c FROM rate_hits/.test(sql)) {
      //  번호 제한만 조종한다 — IP 제한은 늘 통과시킨다
      return { c: String(args[0] || '').startsWith('apply:7:') ? phoneHits : 0 }
    }
    return null
  }
  const db = {
    __sqls: sqls,
    prepare(sql) {
      const mk = (args) => ({
        run: () => run(sql, args),
        first: () => first(sql, args),
        all: async () => { sqls.push({ sql, args }); return { results: [] } },
      })
      return { bind: (...args) => mk(args), ...mk([]) }
    },
    async batch(stmts) { return (stmts || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
  return db
}

const apply = await load('functions/api/funnel/apply.ts')

async function post(db, body) {
  const res = await apply.onRequestPost({
    request: new Request('https://bygency.com/api/funnel/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
      body: JSON.stringify(body),
    }),
    env: { DB: db }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  return { status: res.status, body: await res.json() }
}

const APPLICANT = { slug: 'verify-apply', name: '홍길동', phone: '010-1234-5678', email: 'Test@Example.COM' }
const inserted = (db) => db.__sqls.filter((s) => /INSERT INTO funnel_applicants/.test(s.sql))
/* rateLimitOk 은 2% 확률로 오래된 기록을 청소한다(DELETE FROM rate_hits WHERE at < ?).
   그것까지 "되돌림" 으로 세면 가끔 실패하는 테스트가 된다 — 되돌리기 구문만 골라 본다. */
const releasedLimit = (db) => db.__sqls.some((s) => /DELETE FROM rate_hits WHERE rowid/.test(s.sql))

console.log('\n① 정상 신청은 저장되고 성공으로 답한다')
{
  const db = makeDB()
  const r = await post(db, APPLICANT)
  ok(r.status === 200 && r.body.success === true, '200 · success true', `${r.status} · ${r.body.success}`)
  ok(r.body.applicantSaved === true, 'applicantSaved 가 true 다')
  ok(inserted(db).length === 1, '신청자 INSERT 가 실제로 돌았다', String(inserted(db).length))
  ok(!releasedLimit(db), '성공했으니 번호 제한을 되돌리지 않는다')
}

console.log('\n② 저장이 실패하면 성공이라고 답하지 않는다')
{
  const db = makeDB({ applicantInsert: 'none' })
  const r = await post(db, APPLICANT)
  ok(r.body.success === false, 'success 가 false 다 (여기가 true 였다)', String(r.body.success))
  ok(r.body.applicantSaved === false, 'applicantSaved 가 false 다', String(r.body.applicantSaved))
  ok(r.status >= 500, '실패를 상태 코드로도 알린다', String(r.status))
  ok(inserted(db).length === 2, '폴백까지 두 번 다 시도한 뒤 포기했다', String(inserted(db).length))
}

console.log('\n③ 저장이 실패하면 유료 자동응답을 내보내지 않는다')
{
  const db = makeDB({ applicantInsert: 'none' })
  const r = await post(db, APPLICANT)
  ok(r.body.fired === undefined && r.body.firedCount === undefined,
     '자동응답을 아예 시도하지 않는다 — "접수되었습니다" 문자가 헛나가지 않는다')
  //  스키마 보장(CREATE TABLE IF NOT EXISTS)에도 표 이름이 나오므로 조회만 골라 본다
  ok(!db.__sqls.some((s) => /^\s*SELECT[\s\S]*funnel_auto_responses/i.test(s.sql)),
     '자동응답 규칙을 조회조차 하지 않는다')
}

console.log('\n④ 저장이 실패하면 번호 제한을 되돌려 바로 다시 넣을 수 있다')
{
  const db = makeDB({ applicantInsert: 'none' })
  await post(db, APPLICANT)
  ok(releasedLimit(db), '제한 기록을 지운다 (안 지우면 10분간 "이미 신청되었습니다" 로 막힌다)')

  //  되돌린 뒤라 제한이 비어 있는 상태 = 곧바로 재시도해도 중복으로 막히지 않는다
  const db2 = makeDB({ applicantInsert: 'full', phoneHits: 0 })
  const r2 = await post(db2, APPLICANT)
  ok(r2.body.success === true && r2.body.duplicate === undefined,
     '복구된 뒤 재시도는 정상 접수된다', JSON.stringify(r2.body).slice(0, 80))
}

console.log('\n⑤ 구버전 스키마 폴백은 여전히 성공으로 친다')
{
  const db = makeDB({ applicantInsert: 'legacy' })
  const r = await post(db, APPLICANT)
  ok(r.body.success === true && r.body.applicantSaved === true, '폴백으로 저장됐으면 성공이다', String(r.body.success))
  ok(inserted(db).length === 2, '첫 INSERT 실패 후 폴백을 탔다', String(inserted(db).length))
  ok(!releasedLimit(db), '저장됐으니 제한을 되돌리지 않는다')
}

console.log('\n⑥ 중복 제출 차단은 그대로 살아 있다')
{
  const db = makeDB({ phoneHits: 1 })
  const r = await post(db, APPLICANT)
  ok(r.body.duplicate === true, '같은 번호·같은 페이지는 막힌다')
  ok(inserted(db).length === 0, '막혔으면 저장도 하지 않는다', String(inserted(db).length))
}

console.log('\n⑦ 없는 랜딩페이지·빈 slug 는 그대로 거절한다')
{
  const db = makeDB()
  const a = await post(db, { ...APPLICANT, slug: '' })
  ok(a.status === 400, 'slug 가 없으면 400', String(a.status))
  const db2 = { ...makeDB(), prepare: makeDB().prepare }
  const bad = makeDB()
  bad.prepare = ((orig) => (sql) => {
    if (/FROM funnel_landing_pages WHERE slug/.test(sql))
      return { bind: () => ({ first: async () => null, run: async () => ({ meta: {} }), all: async () => ({ results: [] }) }) }
    return orig(sql)
  })(bad.prepare.bind(bad))
  const b = await post(bad, APPLICANT)
  ok(b.status === 404, '없는 랜딩페이지는 404', String(b.status))
}

/* ─────────────────────────────────────────────────────────────────────────────
   /api/landing/form-submit — 외부 임베드·랜딩 빌더가 쓰는 같은 성격의 문.
   여기도 INSERT 를 try/catch 로 삼키고 언제나 "신청이 완료되었습니다" 라고 답했다.
   이쪽이 더 나쁜 게, 페이지 주인에게 "신청 들어왔다" 알림까지 보낸다 —
   주인이 명단을 열어 보면 아무도 없다.
   ──────────────────────────────────────────────────────────────────────────── */
const formSubmit = await load('functions/api/landing/form-submit.ts')

function makeDB2({ applicantInsert = 'ok', phoneHits = 0 } = {}) {
  const sqls = []
  const run = async (sql, args) => {
    sqls.push({ sql, args })
    if (/INSERT INTO funnel_applicants/.test(sql) && applicantInsert === 'none') throw new Error('디스크 오류 흉내')
    return { meta: { changes: 1, last_row_id: 1 } }
  }
  const first = async (sql, args) => {
    sqls.push({ sql, args })
    if (/FROM funnel_landing_pages WHERE slug/.test(sql)) return { id: 7, group_id: 3, title: '검증 랜딩' }
    if (/FROM funnel_groups WHERE id/.test(sql)) return { funnel_id: null, user_id: 'u9' }
    if (/COUNT\(\*\) AS c FROM rate_hits/.test(sql))
      return { c: String(args[0] || '').startsWith('apply:slug:') ? phoneHits : 0 }
    return null
  }
  return {
    __sqls: sqls,
    prepare(sql) {
      const mk = (args) => ({
        run: () => run(sql, args),
        first: () => first(sql, args),
        all: async () => { sqls.push({ sql, args }); return { results: [] } },
      })
      return { bind: (...args) => mk(args), ...mk([]) }
    },
    async batch(stmts) { return (stmts || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
}

async function postForm(db, body) {
  const res = await formSubmit.onRequestPost({
    request: new Request('https://bygency.com/api/landing/form-submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
      body: JSON.stringify(body),
    }),
    env: { DB: db }, params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  return { status: res.status, body: await res.json() }
}

const FORM = { landing_slug: 'verify-apply', name: '박영희', phone: '010-7777-6666', email: 'a@b.co' }

console.log('\n⑧ 임베드 폼: 정상 제출은 저장되고 완료로 답한다')
{
  const db = makeDB2()
  const r = await postForm(db, FORM)
  ok(r.status === 200 && r.body.success === true, '200 · success true', `${r.status} · ${r.body.success}`)
  ok(inserted(db).length === 1, '신청자 INSERT 가 실제로 돌았다', String(inserted(db).length))
}

console.log('\n⑨ 임베드 폼: 저장이 실패하면 완료라고 답하지 않는다')
{
  const db = makeDB2({ applicantInsert: 'none' })
  const r = await postForm(db, FORM)
  ok(r.body.success === false, 'success 가 false 다 (여기가 true 였다)', String(r.body.success))
  ok(r.status >= 500, '실패를 상태 코드로도 알린다', String(r.status))
  ok(!/완료/.test(String(r.body.message || '')), '"신청이 완료되었습니다" 라고 말하지 않는다', String(r.body.message))
}

console.log('\n⑩ 임베드 폼: 저장이 실패하면 문자도 주인 알림도 나가지 않는다')
{
  const db = makeDB2({ applicantInsert: 'none' })
  await postForm(db, FORM)
  ok(!db.__sqls.some((s) => /^\s*SELECT[\s\S]*funnel_auto_responses/i.test(s.sql)),
     '자동응답 규칙을 조회조차 하지 않는다 (유료 문자가 헛나가지 않는다)')
  ok(!db.__sqls.some((s) => /SELECT user_id FROM funnel_groups/.test(s.sql)),
     '주인에게 "신청 들어왔다" 알림을 보내지 않는다 — 열어 보면 아무도 없는 알림이었다')
}

console.log('\n⑪ 임베드 폼: 저장이 실패하면 번호 제한을 되돌린다')
{
  const db = makeDB2({ applicantInsert: 'none' })
  await postForm(db, FORM)
  ok(releasedLimit(db), '제한 기록을 지운다 (안 지우면 10분간 재제출이 막힌다)')
}

console.log(failed === 0 ? '\n퍼널 신청 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
