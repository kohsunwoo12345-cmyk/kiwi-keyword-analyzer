/* 퍼널 소유권 회귀 테스트 —  node scripts/funnel-own.test.mjs
 *
 * 퍼널 그룹·랜딩페이지·신청자 엔드포인트는 다른 제품에서 이식되면서 소유자 조건이
 * 빠져 있었다. id 가 연속된 정수라, 로그인만 하면 남의 그룹을 지우고 남의 랜딩페이지를
 * 고치고 남의 신청자(이름·전화번호)를 지울 수 있었다. 지금은 _own.ts 가 막는다.
 *
 * 그런데 돌연변이 점검에서 이 세 함수를 전부 "무조건 통과" 로 바꿔도 아무 테스트도
 * 울지 않았다 — 막고 있다는 근거가 코드뿐이었다는 뜻이다.
 *
 * 여기서는 두 겹으로 본다.
 *  1) _own.ts 자체 — 주인/남/관리자 판정
 *  2) 실제 삭제 엔드포인트 — 그 판정이 진짜로 연결돼 있는지(연결이 빠지면 소용없다)
 *
 * ⚠ 가짜 D1 은 "진짜 SQL 에 적힌 조건" 만 적용한다. 가짜가 제 나름대로 엄격하면
 *    제품에서 user_id 조건이 빠져도 가짜가 대신 막아 줘서 테스트가 통과한다.
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

const own = await load('functions/api/funnel/_own.ts')

/* 회원 A(주인)와 회원 B(남)가 각각 그룹·페이지·신청자를 갖고 있다. */
const GROUPS = [{ id: 10, user_id: 'A' }, { id: 20, user_id: 'B' }]
const PAGES = [{ id: 100, group_id: 10 }, { id: 200, group_id: 20 }]
const APPS = [{ id: 1000, landing_page_id: 100 }, { id: 1001, landing_page_id: 100 }, { id: 2000, landing_page_id: 200 }]

const A = { id: 'A', role: 'user' }
const B = { id: 'B', role: 'user' }
const ADMIN = { id: 'Z', role: 'admin' }

function makeDB() {
  const state = { deleted: [], sql: [] }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM funnel_groups WHERE id = \?/.test(s)) {
      const g = GROUPS.find((x) => String(x.id) === String(b[0]))
      if (!g) return null
      //  진짜 SQL 에 주인 조건이 있을 때만 적용한다
      if (/user_id\s*=\s*\?/.test(s) && String(g.user_id) !== String(b[1])) return null
      return { ok: 1 }
    }
    if (/FROM funnel_landing_pages p JOIN funnel_groups g/.test(s)) {
      const p = PAGES.find((x) => String(x.id) === String(b[0]))
      if (!p) return null
      const g = GROUPS.find((x) => x.id === p.group_id)
      if (/g\.user_id\s*=\s*\?/.test(s) && String(g?.user_id) !== String(b[1])) return null
      return { ok: 1 }
    }
    if (/COUNT\(\*\) AS n FROM funnel_applicants a/.test(s)) {
      const ids = b.slice(0, b.length - 1).map(String)
      const uid = String(b[b.length - 1])
      const n = APPS.filter((a) => {
        if (!ids.includes(String(a.id))) return false
        const p = PAGES.find((x) => x.id === a.landing_page_id)
        const g = GROUPS.find((x) => x.id === p?.group_id)
        return !/g\.user_id\s*=\s*\?/.test(s) || String(g?.user_id) === uid
      }).length
      return { n }
    }
    if (/FROM funnels WHERE id = \?/.test(s)) return null
    return null
  }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/DELETE FROM funnel_applicants/i.test(s)) state.deleted.push(String(b[0]))
    return { meta: { changes: 1 } }
  }
  return {
    __state: state,
    prepare(sql) {
      const s = String(sql)
      const mk = (b) => ({ first: () => first(s, b), run: () => run(s, b), all: async () => ({ results: [] }) })
      return { bind: (...b) => mk(b), ...mk([]) }
    },
    async batch(st) { return (st || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
}

console.log('\n① 그룹 — 주인만 통과한다')
{
  const db = makeDB()
  ok((await own.ownsGroup(db, A, 10)) === true, '주인은 자기 그룹을 만질 수 있다')
  ok((await own.ownsGroup(db, B, 10)) === false, '남은 막힌다 (그룹을 지우면 랜딩·신청자까지 통째로 사라진다)')
  ok((await own.ownsGroup(db, ADMIN, 10)) === true, '관리자는 통과한다')
  ok((await own.ownsGroup(db, A, 999)) === false, '없는 그룹은 통과하지 않는다')
  ok((await own.ownsGroup(db, null, 10)) === false, '비로그인은 통과하지 않는다')
  ok((await own.ownsGroup(db, A, '')) === false, 'id 가 비면 통과하지 않는다')
}

console.log('\n② 랜딩페이지 — 그룹을 거쳐 주인을 확인한다')
{
  const db = makeDB()
  ok((await own.ownsPage(db, A, 100)) === true, '주인은 자기 페이지를 고칠 수 있다')
  ok((await own.ownsPage(db, B, 100)) === false, '남은 막힌다')
  ok((await own.ownsPage(db, A, 200)) === false, '남의 페이지는 못 만진다')
  ok((await own.ownsPage(db, ADMIN, 100)) === true, '관리자는 통과한다')
  ok((await own.ownsPage(db, A, 999)) === false, '없는 페이지는 통과하지 않는다')
}

console.log('\n③ 신청자 — 하나라도 남의 것이면 통째로 거절한다')
{
  /* 일부만 지우면 어디까지 지워졌는지 알 수 없어 더 나쁘다.
     신청자 행에는 이름·전화번호가 들어 있다. */
  const db = makeDB()
  ok((await own.ownsApplicants(db, A, [1000])) === true, '내 신청자 하나는 통과한다')
  ok((await own.ownsApplicants(db, A, [1000, 1001])) === true, '내 신청자 여럿도 통과한다')
  ok((await own.ownsApplicants(db, A, [1000, 2000])) === false, '내 것 + 남의 것 섞이면 통째로 거절한다')
  ok((await own.ownsApplicants(db, A, [2000])) === false, '남의 신청자만 있으면 거절한다')
  ok((await own.ownsApplicants(db, A, [1000, 99999])) === false, '없는 id 가 섞여도 거절한다')
  ok((await own.ownsApplicants(db, A, [])) === false, '빈 목록은 통과하지 않는다')
  ok((await own.ownsApplicants(db, ADMIN, [1000, 2000])) === true, '관리자는 통과한다')
}

console.log('\n④ 판정이 실제 삭제 문에 연결돼 있다 (연결이 빠지면 판정만 있고 소용없다)')
{
  const applicantDel = await load('functions/api/funnel/applicants/[id].ts')
  const call = async (me, id) => {
    const db = makeDB()
    //  getSessionUser 를 타지 않도록 세션 조회에만 답해 주는 껍데기를 씌운다
    const wrapped = {
      ...db,
      prepare(sql) {
        if (/FROM sessions s JOIN users u/i.test(String(sql)))
          return { bind: () => ({ first: async () => me, run: async () => ({ meta: {} }), all: async () => ({ results: [] }) }) }
        return db.prepare(sql)
      },
    }
    const res = await applicantDel.onRequestDelete({
      request: new Request('https://bygency.com/api/funnel/applicants/' + id, {
        method: 'DELETE', headers: { cookie: 'bg_session=t', origin: 'https://bygency.com', host: 'bygency.com' },
      }),
      env: { DB: wrapped }, params: { id: String(id) }, waitUntil: () => {}, next: async () => new Response(''),
    })
    return { status: res.status, body: await res.json(), deleted: db.__state.deleted }
  }

  const mine = await call(A, 1000)
  ok(mine.body.success === true, '주인은 자기 신청자를 지울 수 있다', JSON.stringify(mine.body))
  ok(mine.deleted.includes('1000'), '실제로 삭제문이 돌았다', JSON.stringify(mine.deleted))

  const theirs = await call(B, 1000)
  ok(theirs.status === 403, '남이 지우려 하면 403 이다', String(theirs.status))
  ok(theirs.deleted.length === 0, '삭제문이 아예 돌지 않는다', JSON.stringify(theirs.deleted))

  const anon = await call(null, 1000)
  ok(anon.status === 401, '비로그인은 401 이다', String(anon.status))
  ok(anon.deleted.length === 0, '비로그인도 삭제문이 돌지 않는다')
}

console.log(failed === 0 ? '\n퍼널 소유권 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
