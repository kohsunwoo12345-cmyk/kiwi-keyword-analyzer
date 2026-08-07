/* 생성 실패 ↔ 크레딧 무결성 검사 —  node --disable-warning=ExperimentalWarning scripts/genmoney.test.mjs
 *
 * 지켜야 할 한 줄: "만들어지지 않았으면 한 푼도 빠져 있으면 안 된다."
 *
 * 기존 검사들은 계산기(computeCharge)와 차감 한 번(settleGenCharge)까지는 본다.
 * 그런데 회원이 실제로 겪는 것은 그 뒤다 — 제출은 됐는데 제공사가 실패했을 때,
 * 취소했을 때, 폴링이 끊겼을 때 지갑이 원래대로 돌아오는가.
 * 그래서 여기서는 진짜 SQLite 위에 그 수명주기를 통째로 재현하고, 매 단계마다
 * ㉠ 회원 잔액 ㉡ gen_charges.status ㉢ 관리자 정산 표(ai_usage) 세 곳을 함께 본다.
 *
 * 돈이 실제로 나가는 호출은 하나도 하지 않는다 — 제공사 응답은 전부 우리가 만든 값이다.
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
const note = (s) => console.log(`  ·    ${s}`)

async function load(file) {
  const out = await build({
    entryPoints: [ROOT + file], bundle: true, write: false, format: 'cjs',
    platform: 'neutral', target: 'es2022', external: ['node:*'],
  })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_,
    console: { log() {}, warn() {}, error() {} },
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}'), btoa, atob, setTimeout, clearTimeout, structuredClone,
    AbortController,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

/* ── 진짜 SQLite 를 D1 인터페이스로 감싼다 ──
   WHERE 조건·조건부 UPDATE·changes 카운트가 실제 그대로 동작해야
   "동시에 두 번 들어와도 한 번만" 같은 주장을 검증할 수 있다. */
const sqlite = new DatabaseSync(':memory:')
const d1 = {
  prepare(sql) {
    const s = String(sql)
    const mk = (b) => ({
      async run() {
        const r = sqlite.prepare(s).run(...b)
        return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }
      },
      async first() { return sqlite.prepare(s).get(...b) ?? null },
      async all() { return { results: sqlite.prepare(s).all(...b) } },
    })
    return { bind: (...b) => mk(b), ...mk([]) }
  },
  async batch(st) { return (st || []).map(() => ({ results: [] })) },
  async dump() { return new ArrayBuffer(0) },
}

sqlite.exec(`
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT, role TEXT,
                      credits REAL DEFAULT 0, credit_markup REAL, credit_price REAL,
                      ref_surcharge REAL, academy TEXT);
  CREATE TABLE transactions (id TEXT PRIMARY KEY, user_id TEXT, kind TEXT, amount REAL,
                             balance_after REAL, memo TEXT, created_at TEXT);
  CREATE TABLE fx_rates (date TEXT PRIMARY KEY, usd_krw REAL NOT NULL, updated_at TEXT);
  CREATE TABLE user_model_markups (user_id TEXT, model TEXT, multiplier REAL);
`)
const TODAY = new Date().toISOString().slice(0, 10)
const FX = 1400
sqlite.prepare('INSERT INTO fx_rates (date, usd_krw, updated_at) VALUES (?,?,?)').run(TODAY, FX, new Date().toISOString())

const START = 10000
sqlite.prepare(`INSERT INTO users (id,email,name,role,credits,credit_price) VALUES (?,?,?,?,?,?)`)
  .run('u1', 'a@b.c', '홍길동', 'member', START, 50)

const pricing = await load('functions/api/studio/_pricing.ts')
const gc = await load('functions/api/studio/_gencharge.ts')
const { creditPriceFor } = await load('functions/api/payments/prepare.ts')

const DEPS = {
  computeCharge: pricing.computeCharge,
  getUsdKrw: pricing.getUsdKrw,
  resolveMarkup: pricing.resolveMarkup,
  resolveRefSurcharge: pricing.resolveRefSurcharge,
  resolveCnSurcharge: pricing.resolveCnSurcharge,
  creditPriceFor,
  ensureAiUsage: pricing.ensureAiUsage,
  resolveCostOverride: pricing.resolveCostOverride,
}
await pricing.ensureAiUsage(d1)
await gc.ensureGenCharges(d1)

const ME = { id: 'u1', email: 'a@b.c', name: '홍길동', role: 'member', credit_price: 50 }
const bal = () => Number(sqlite.prepare('SELECT credits FROM users WHERE id = ?').get('u1').credits)
const chargeRow = (id) => sqlite.prepare('SELECT * FROM gen_charges WHERE id = ?').get(id)
/* 관리자 정산 화면(/api/admin/ai-usage)이 합계를 내는 방식 그대로 센다.
   그 화면이 실제로 이 조건을 쓰는지는 아래 ⑫ 정적 검사가 확인한다 —
   검사만 새 규칙을 알고 화면은 옛 규칙을 쓰면 이 검증은 아무 의미가 없다. */
const LIVE = 'COALESCE(refunded,0) = 0'
const usageSum = () => sqlite.prepare(
  `SELECT COUNT(*) c,
          COALESCE(SUM(CASE WHEN ${LIVE} THEN credits END),0) cr,
          COALESCE(SUM(CASE WHEN ${LIVE} THEN revenue_krw END),0) rv,
          COALESCE(SUM(CASE WHEN ${LIVE} THEN cost_krw END),0) co
     FROM ai_usage`).get()

/* onRequest(generate.js) 가 쓰는 판정을 그대로 옮겨 온다.
   문구가 바뀌면 아래 ⑪ 정적 검사가 걸린다 — 검사만 혼자 옛 규칙을 붙들고 있지 않게. */
const shouldCharge = (body) => !!((body.url && !body.error) || body.statusUrl)
const isFailedPoll = (body) => !!(body.status === 'failed' || (body.error && !body.url))

/** 제출(POST) 한 번을 흉내 낸다 — 게이트에서 토큰을 발급하고, 응답에 따라 청구까지. */
async function submit(spec, body) {
  const token = await gc.issueGenCharge(d1, 'u1', spec)
  if (!shouldCharge(body)) return { token, charged: 0, usageId: '' }
  const out = await gc.settleGenCharge(d1, ME, token, body.statusUrl || null, DEPS)
  return { token, charged: out.credits, usageId: out.usageId }
}

const VIDEO = { model: 'Seedance 2.0', units: 5, res: '1080p', audio: false, ratio: '16:9', refs: 0, cn: 0 }
const IMAGE = { model: 'Seedream 4.0', units: 1, ratio: '1:1', refs: 0, cn: 0 }

console.log('\n① 즉시 결과형(이미지) — 성공하면 정확히 한 번 빠진다')
{
  const b0 = bal()
  const r = await submit(IMAGE, { url: 'https://x/i.png', kind: 'image' })
  ok(r.charged > 0, '차감이 일어났다', String(r.charged))
  ok(Math.abs(b0 - bal() - r.charged) < 0.001, '잔액이 정확히 그만큼 줄었다', `${b0} → ${bal()}`)
  ok(!!r.usageId, '관리자 정산 줄이 생겼다')
}

console.log('\n② 즉시 결과형 실패 — 제출이 거절되면 한 푼도 안 빠진다')
{
  const b0 = bal()
  const r = await submit(IMAGE, { error: '얼굴이 포함된 이미지는 생성할 수 없습니다.' })
  ok(r.charged === 0, '차감 0', String(r.charged))
  ok(bal() === b0, '잔액 그대로', `${b0} → ${bal()}`)
  ok(!chargeRow(r.token).consumed_at, '토큰이 소비되지 않았다 (재시도해도 이중청구 없음)')
}

console.log('\n③ 비동기 영상 — 제출 시 차감되고, 제공사 실패가 확인되면 전액 돌아온다')
{
  const b0 = bal()
  const key = '/api/generate?provider=seedance&host=bp&task=T3'
  const r = await submit(VIDEO, { statusUrl: key })
  ok(r.charged > 0, '제출 시점에 차감된다', String(r.charged))
  const mid = bal()
  ok(Math.abs(b0 - mid - r.charged) < 0.001, '그만큼 줄었다', `${b0} → ${mid}`)

  const body = { status: 'failed', error: 'seedance failed' }
  ok(isFailedPoll(body), '이 응답을 실패로 판정한다')
  const back = await gc.refundGenCharge(d1, key)
  ok(Math.abs(back - r.charged) < 0.001, '뺀 금액 전액이 환불액이다', `${back} vs ${r.charged}`)
  ok(Math.abs(bal() - b0) < 0.001, '★ 순변동 0 — 실패했는데 돈이 나간 자리가 없다', `${b0} → ${bal()}`)
  ok(chargeRow(r.token).status === 'refunded', 'gen_charges 가 refunded 로 남는다')
}

console.log('\n④ 실패 응답이 여러 번 지나가도 환불은 한 번뿐이다 (폴링은 겹친다)')
{
  const key = '/api/generate?provider=seedance&host=bp&task=T4'
  const r = await submit(VIDEO, { statusUrl: key })
  const b1 = bal()
  const outs = await Promise.all([
    gc.refundGenCharge(d1, key), gc.refundGenCharge(d1, key),
    gc.refundGenCharge(d1, key), gc.refundGenCharge(d1, key),
  ])
  const paid = outs.filter((n) => n > 0)
  ok(paid.length === 1, '환불이 정확히 한 번만 나갔다', JSON.stringify(outs))
  ok(Math.abs(bal() - (b1 + r.charged)) < 0.001, '잔액이 두 배로 늘지 않았다', `${b1} → ${bal()}`)
}

console.log('\n⑤ 취소 — 제공사가 못 멈춰도 회원 크레딧은 전액 돌아온다')
{
  const key = '/api/generate?provider=luma&task=T5'
  const b0 = bal()
  const r = await submit({ ...VIDEO, model: 'Luma Ray 3.2' }, { statusUrl: key })
  const back = await gc.refundGenCharge(d1, key)      // cancel.ts 가 부르는 바로 그 함수
  ok(Math.abs(back - r.charged) < 0.001, '전액 환불', `${back} vs ${r.charged}`)
  ok(Math.abs(bal() - b0) < 0.001, '순변동 0', `${b0} → ${bal()}`)
}

console.log('\n⑥ 실측 정산으로 금액이 바뀐 뒤 실패하면, "바뀐 금액" 이 돌아와야 한다')
{
  const key = '/api/generate?provider=seedance&host=bp&task=T6'
  const b0 = bal()
  const r = await submit(VIDEO, { statusUrl: key })
  // 제공사가 알려준 실제 토큰이 추정보다 크다 → 차액만큼 더 빠진다
  const diff = await gc.reconcileGenCharge(d1, key, 400_000, DEPS)
  ok(diff !== 0, '실측 정산이 차액을 움직였다', String(diff))
  const owed = Number(chargeRow(r.token).credits)
  ok(Math.abs(b0 - bal() - owed) < 0.02, '지갑에서 빠진 총액 = 정산 후 금액', `${b0 - bal()} vs ${owed}`)
  const back = await gc.refundGenCharge(d1, key)
  ok(Math.abs(back - owed) < 0.001, '환불액도 정산 후 금액이다', `${back} vs ${owed}`)
  ok(Math.abs(bal() - b0) < 0.02, '★ 순변동 0', `${b0} → ${bal()}`)
}

console.log('\n⑦ 환불된 뒤에는 다시 청구되지 않는다 (늦게 도착한 실측 응답)')
{
  const key = '/api/generate?provider=seedance&host=bp&task=T7'
  const b0 = bal()
  const r = await submit(VIDEO, { statusUrl: key })
  await gc.refundGenCharge(d1, key)
  const after = bal()
  const diff = await gc.reconcileGenCharge(d1, key, 900_000, DEPS)
  ok(diff === 0, '환불된 건에는 실측 정산이 붙지 않는다', String(diff))
  ok(bal() === after, '잔액이 다시 줄지 않았다', `${after} → ${bal()}`)
  ok(Math.abs(bal() - b0) < 0.001, '순변동 0', `${b0} → ${bal()}`)
}

console.log('\n⑧ 폴링이 끊긴 채 방치된 건 — 서버가 스스로 결말을 확인하고 되돌린다')
{
  const key = '/api/generate?provider=seedance&host=bp&task=T8'
  const b0 = bal()
  const r = await submit(VIDEO, { statusUrl: key })
  //  회원이 탭을 닫았다 = 이 뒤로 아무 폴링도 오지 않는다. 시간만 흐른다.
  sqlite.prepare(`UPDATE gen_charges SET created_at = ? WHERE id = ?`)
    .run(new Date(Date.now() - 3 * 3600000).toISOString(), r.token)
  ok(bal() < b0, '(사실 확인) 제출 시점에 차감돼 있다', `${b0} → ${bal()}`)

  /* 그물(/api/cron/gen-sweep)이 집어야 할 줄로 잡히는가 — 크론이 쓰는 조건 그대로 본다.
     유예 30분, 시도 상한 8회. 조건이 어긋나면 이 줄은 영원히 안 집힌다. */
  const due = sqlite.prepare(
    `SELECT COUNT(*) c FROM gen_charges
      WHERE status='charged' AND COALESCE(task_key,'') <> '' AND swept_at IS NULL
        AND created_at < ? AND COALESCE(sweep_tries,0) < 8`)
    .get(new Date(Date.now() - 30 * 60000).toISOString()).c
  ok(due >= 1, '★ 결말 없는 차감이 회수 대상으로 잡힌다', `대상 ${due}건`)

  //  그물이 제공사에 물어봤더니 실패였다 → 그 자리에서 되돌린다(크론이 하는 일과 같은 호출)
  const back = await gc.refundGenCharge(d1, key)
  ok(Math.abs(back - r.charged) < 0.001, '실패로 확인되면 전액 되돌린다', `${back} vs ${r.charged}`)
  ok(Math.abs(bal() - b0) < 0.001, '★ 순변동 0', `${b0} → ${bal()}`)
  ok(!!chargeRow(r.token).swept_at, '되돌린 줄은 다시 집히지 않게 표시된다')

  const left = sqlite.prepare(
    `SELECT COUNT(*) c FROM gen_charges
      WHERE status='charged' AND COALESCE(task_key,'') <> '' AND swept_at IS NULL
        AND created_at < ?`).get(new Date(Date.now() - 30 * 60000).toISOString()).c
  note(`회수 뒤 남은 미결: ${left}건`)
  ok(left === 0, '★ 미결이 남지 않는다', `미결 ${left}건`)
}

console.log('\n⑨ 관리자 정산 표(ai_usage) — 환불된 건이 매출에서 빠지는가')
{
  const before = usageSum()
  const key = '/api/generate?provider=seedance&host=bp&task=T9'
  const r = await submit(VIDEO, { statusUrl: key })
  const mid = usageSum()
  ok(mid.c === before.c + 1, '생성 한 줄이 정산 표에 들어갔다')
  await gc.refundGenCharge(d1, key)
  const after = usageSum()
  note(`환불 전 매출 ${mid.rv}원 · 환불 후 매출 ${after.rv}원 (환불액 ${r.charged}크레딧)`)
  ok(after.rv < mid.rv, '★ 환불하면 정산 표의 매출도 줄어든다', `${mid.rv} → ${after.rv}`)
  ok(after.cr < mid.cr, '★ 환불하면 정산 표의 차감 크레딧도 줄어든다', `${mid.cr} → ${after.cr}`)
  ok(Math.abs((mid.rv - after.rv) - r.charged * 50) < 1,
     '줄어든 매출이 정확히 그 건의 매출이다', `${mid.rv - after.rv} vs ${r.charged * 50}`)

  //  줄 자체는 남아 있어야 한다 — 무엇을 얼마에 팔려다 돌려줬는지가 사라지면 되짚을 수 없다
  const kept = sqlite.prepare('SELECT refunded, refund_credits, revenue_krw FROM ai_usage WHERE id = ?').get(r.usageId)
  ok(Number(kept?.refunded) === 1, '줄은 지우지 않고 환불 표시만 남는다')
  ok(Math.abs(Number(kept?.refund_credits) - r.charged) < 0.001, '돌려준 금액이 그 줄에 적힌다', String(kept?.refund_credits))
  ok(Number(kept?.revenue_krw) > 0, '원래 매출 금액도 그대로 남는다(되짚을 수 있게)', String(kept?.revenue_krw))
}

console.log('\n⑩ 같은 작업 주소가 두 번 나오면 환불이 엉뚱한 줄을 집지 않는가')
{
  const key = '/api/generate?provider=kling&task=DUP'
  const a = await submit({ ...VIDEO, model: 'Kling 2.1 Master (이미지→영상)', units: 5 }, { statusUrl: key })
  const b = await submit({ ...VIDEO, model: 'Kling 2.1 Master (이미지→영상)', units: 10 }, { statusUrl: key })
  ok(a.charged !== b.charged, '두 건의 금액이 서로 다르다 (구분 가능한 상황)', `${a.charged} vs ${b.charged}`)
  const back = await gc.refundGenCharge(d1, key)
  //  실패한 것은 나중 건(b)인데, 환불이 앞 건(a)의 금액을 집으면 회원은 차액만큼 손해다.
  ok(Math.abs(back - b.charged) < 0.001,
     '★ 마지막(실패한) 건의 금액이 환불된다', `환불 ${back} · 앞건 ${a.charged} · 뒷건 ${b.charged}`)
  await gc.refundGenCharge(d1, key)   // 나머지 한 줄도 정리
}

console.log('\n⑪ 검사와 실제 코드가 같은 규칙을 보고 있는가 (문구가 바뀌면 여기서 걸린다)')
const fs = await import('node:fs')
{
  const src = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')
  ok(src.includes('const ok = (body.url && !body.error) || body.statusUrl;'),
     '청구 판정이 그대로다')
  ok(src.includes('body.status === "failed" || (body.error && !body.url)'),
     '실패 판정이 그대로다')
  ok(/refundGenCharge\(resolveDB\(context\.env\), key\)/.test(src), '실패 시 환불을 부른다')
}

console.log('\n⑫ 관리자 정산 화면이 환불 건을 합계에서 빼고 있는가')
{
  const src = fs.readFileSync(ROOT + 'functions/api/admin/ai-usage.ts', 'utf8')
  ok(/COALESCE\(refunded,0\)\s*=\s*0/.test(src), '환불 건을 가르는 조건이 있다')
  //  금액 칸 넷이 모두 그 조건을 지나야 한다 — 하나라도 빠지면 그 칸만 부풀어 오른다
  for (const col of ['revenue_krw', 'cost_krw', 'credits', 'usd'])
    ok(new RegExp(`S\\('${col}'\\)`).test(src), `${col} 합계가 조건을 탄다`)
  ok(/refundedCount/.test(src) && /refundedCredits/.test(src), '뺀 금액을 따로 내보낸다(숨기지 않는다)')
  ok(/status = 'charged' AND swept_at IS NULL/.test(src), '결말 없는 차감 건수도 함께 내보낸다')

  const page = fs.readFileSync(ROOT + 'app/adminsunkoh028741_11263/ai-usage/page.tsx', 'utf8')
  ok(/실패 · 환불/.test(page), '화면이 환불 건수를 적는다')
  ok(/결말 없는 차감/.test(page), '화면이 결말 없는 차감을 적는다')

  const cron = fs.readFileSync(ROOT + 'functions/api/cron/gen-sweep.ts', 'utf8')
  ok(/refundGenCharge/.test(cron), '회수 크론이 환불을 부른다')
  ok(/state === 'succeeded'/.test(cron), '성공한 건은 환불하지 않는다')
  const worker = fs.readFileSync(ROOT + 'workers/cron/src/index.js', 'utf8')
  ok(/\/api\/cron\/gen-sweep/.test(worker), '크론 워커가 그 경로를 두드린다')
}

console.log(`\n생성 실패 ↔ 크레딧 — 실패 ${failed}\n`)
process.exit(failed ? 1 : 0)
