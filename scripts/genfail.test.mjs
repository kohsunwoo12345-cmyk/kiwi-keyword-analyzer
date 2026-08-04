/* 생성 실패 기록 검증 —  node --disable-warning=ExperimentalWarning scripts/genfail.test.mjs
 *
 * 실패 기록은 두 가지만 지키면 된다.
 *   ① 실패를 적다가 회원의 생성이 죽으면 안 된다 — 여기서 나는 오류는 전부 삼킨다
 *   ② 같은 실패가 여러 줄로 쌓이면 안 된다 — 폴링은 실패 응답을 여러 번 지나간다
 *
 * ② 는 SELECT 로 "이미 있나" 를 보는 것만으로는 못 막는다. 폴링 두 개가 겹치면
 * 둘 다 "아직 없다" 를 보고 둘 다 넣는다. 그래서 진짜 SQLite 에 대고,
 * 검사와 넣기 사이가 겹치는 상황을 만들어 확인한다.
 */
import vm from 'node:vm'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

let DatabaseSync
try { ({ DatabaseSync } = await import('node:sqlite')) } catch {
  console.log('\n건너뜀 — 이 Node 에는 node:sqlite 가 없습니다(22+ 필요).\n')
  process.exit(0)
}

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

async function load(file) {
  const out = await build({ entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_,
    console: { log() {}, warn() {}, error() {} },
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}'), btoa, atob, setTimeout, clearTimeout, structuredClone,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

const sqlite = new DatabaseSync(':memory:')
let threwOnce = false
const d1 = {
  prepare(sql) {
    const s = String(sql)
    const mk = (b) => ({
      async run() { const r = sqlite.prepare(s).run(...b); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } } },
      async first() { return sqlite.prepare(s).get(...b) ?? null },
      async all() { return { results: sqlite.prepare(s).all(...b) } },
    })
    return { bind: (...b) => mk(b), ...mk([]) }
  },
  async batch(st) { return (st || []).map(() => ({ results: [] })) },
  async dump() { return new ArrayBuffer(0) },
}

const { recordGenFailure, ensureGenFailures, markRefunded } = await load('functions/api/studio/_genfail.ts')
await ensureGenFailures(d1)

const row = (over = {}) => ({
  userId: 'u1', email: 'a@b.c', name: '홍길동', provider: 'fal', model: 'seedance',
  kind: 'video', stage: 'run', reason: '제공사가 실패로 끝냈습니다.', taskKey: 'task-1',
  refunded: 12, prompt: '고양이', ...over,
})
const count = (where = '1=1') => Number(sqlite.prepare(`SELECT COUNT(*) c FROM gen_failures WHERE ${where}`).get().c)

console.log('\n① 실패 한 건이 남는다')
{
  await recordGenFailure(d1, row())
  ok(count() === 1, '한 줄이 적힌다', String(count()))
  const r = sqlite.prepare('SELECT * FROM gen_failures LIMIT 1').get()
  ok(r.stage === 'run' && r.task_key === 'task-1', '단계와 작업 주소가 남는다', JSON.stringify(r).slice(0, 120))
  ok(Number(r.refunded) === 12, '환불액이 남는다', JSON.stringify(r).slice(0, 120))
}

console.log('\n② 같은 실패는 여러 번 지나가도 한 줄이다')
{
  await recordGenFailure(d1, row())
  await recordGenFailure(d1, row())
  ok(count("task_key='task-1'") === 1, '폴링이 여러 번 지나가도 한 줄', String(count("task_key='task-1'")))

  /* 겹치는 경우: 둘 다 "아직 없다" 를 본 뒤에 둘 다 넣는다.
     SELECT 만으로는 못 막는 자리라, 표 자체가 막아야 한다. */
  await Promise.all([
    recordGenFailure(d1, row({ taskKey: 'task-race' })),
    recordGenFailure(d1, row({ taskKey: 'task-race' })),
    recordGenFailure(d1, row({ taskKey: 'task-race' })),
  ])
  ok(count("task_key='task-race'") === 1, '동시에 들어와도 한 줄', String(count("task_key='task-race'")))
}

console.log('\n③ 단계가 다르면 따로 남는다')
{
  await recordGenFailure(d1, row({ stage: 'archive', reason: 'R2 로 못 옮겼습니다.' }))
  ok(count("task_key='task-1'") === 2, 'run 과 archive 는 다른 줄이다', String(count("task_key='task-1'")))
}

console.log('\n④ 작업 주소가 없는 실패(제출 거절)는 서로 다른 건이다')
{
  const before = count("task_key=''")
  await recordGenFailure(d1, row({ stage: 'submit', taskKey: '', reason: '얼굴이 있는 이미지는 거절되었습니다.' }))
  await recordGenFailure(d1, row({ stage: 'submit', taskKey: '', reason: '모델이 아직 열리지 않았습니다.' }))
  ok(count("task_key=''") === before + 2, '두 건이 각각 남는다', String(count("task_key=''")))
}

console.log('\n⑤ 뒤늦은 환불액은 환불 대상 단계에만 적힌다')
{
  sqlite.prepare("UPDATE gen_failures SET refunded = 0 WHERE task_key='task-1'").run()
  await markRefunded(d1, 'task-1', 30)
  const run = sqlite.prepare("SELECT refunded r FROM gen_failures WHERE task_key='task-1' AND stage='run'").get()
  const arc = sqlite.prepare("SELECT refunded r FROM gen_failures WHERE task_key='task-1' AND stage='archive'").get()
  ok(Number(run.r) === 30, '진행 중 실패에 환불액이 적힌다', JSON.stringify(run))
  ok(Number(arc.r) === 0, '보관 실패에는 안 적힌다 (합계가 두 배로 보이면 안 된다)', JSON.stringify(arc))
}

console.log('\n⑥ 실패를 적다가 생성을 죽이지 않는다')
{
  const broken = { prepare() { throw new Error('D1 죽음') }, async batch() { throw new Error('D1 죽음') } }
  try { await recordGenFailure(broken, row()); ok(true, 'DB 가 죽어도 던지지 않는다') }
  catch (e) { ok(false, 'DB 가 죽어도 던지지 않는다', String(e && e.message)) }
  try { await markRefunded(broken, 'task-1', 5); ok(true, '환불 표시도 던지지 않는다') }
  catch (e) { ok(false, '환불 표시도 던지지 않는다', String(e && e.message)) }
  try { await recordGenFailure(null, row()); ok(true, 'DB 가 없어도 던지지 않는다') }
  catch (e) { ok(false, 'DB 가 없어도 던지지 않는다', String(e && e.message)) }
}

console.log(failed === 0 ? '\n실패 기록 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
