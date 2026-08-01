/* 과금 토큰 회귀 테스트 —  node scripts/charge-token.test.mjs
 *
 * 생성 시점에 서버가 확정한 값(모델·길이·해상도·옵션)을 토큰에 묶어 두고, 그 값으로만 청구한다.
 * 신고 내용은 금액에 영향을 주지 못한다.
 *
 * ※ 차감이 일어나는 곳이 바뀌었다.
 *   예전에는 /api/usage/record 가 차감했는데, 그건 클라이언트가 부를지 말지 정하는 신고 창구다.
 *   토큰으로 "얼마인지" 는 서버가 정하게 됐지만 "낼지 말지" 는 여전히 클라이언트가 정했고,
 *   그 호출을 생략하면 생성물만 받고 한 푼도 내지 않았다.
 *   이제 생성이 성공한 자리에서 서버가 토큰을 소비하며 직접 차감한다(settleGenCharge).
 *   record 는 보관·아카이브 전용이라 늘 charged:0 이다 — 그 성질까지 함께 지킨다.
 */
import { buildSync } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require_ = createRequire(import.meta.url)

function load(file) {
  const out = buildSync({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console, AbortController, Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto, fetch, btoa, atob, setTimeout, clearTimeout, structuredClone }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: file })
  return sandbox.module.exports
}

// 아주 작은 인메모리 D1 — gen_charges 와 users 만 흉내 낸다
function makeDB(user) {
  const charges = new Map()
  let credits = 100000
  const db = {
    prepare(sql) {
      const s = String(sql)
      let bound = []
      const stmt = {
        bind: (...a) => { bound = a; return stmt },
        first: async () => {
          if (/FROM gen_charges/i.test(s)) {
            // 환불은 task_key 로 찾는다(소비된 토큰 id 를 모르는 상태에서 부르므로)
            if (/WHERE task_key/i.test(s))
              return [...charges.values()].find((r) => r.task_key === bound[0] && r.status === 'charged') || null
            // 실제 SQL 은 WHERE id = ? AND user_id = ? 다 — 소유자 조건까지 흉내 내야 검증이 의미가 있다
            const row = charges.get(bound[0])
            return row && String(row.user_id) === String(bound[1]) ? row : null
          }
          if (/SELECT credits/i.test(s)) return { credits }
          if (/FROM\s+users|session/i.test(s)) return user
          return null
        },
        all: async () => ({ results: [] }),
        run: async () => {
          if (/INSERT INTO gen_charges/i.test(s)) {
            const [id, user_id, model, units, res, audio, ratio, refs, cn, hdr, exr, created_at] = bound
            charges.set(id, { id, user_id, model, units, res, audio, ratio, refs, cn, hdr, exr, created_at, consumed_at: null })
            return { success: true, meta: { changes: 1 } }
          }
          if (/UPDATE gen_charges SET credits/i.test(s)) {
            // 정산이 실제로 빼 간 금액과 작업 열쇠를 적어 둔다 — 환불이 이 값을 되돌린다
            const row = charges.get(bound[2])
            if (row) { row.credits = bound[0]; row.task_key = bound[1]; row.status = 'charged' }
            return { success: true, meta: { changes: row ? 1 : 0 } }
          }
          if (/UPDATE gen_charges SET status = 'refunded'/i.test(s)) {
            const row = charges.get(bound[0])
            if (!row || row.status !== 'charged') return { success: true, meta: { changes: 0 } }
            row.status = 'refunded'
            return { success: true, meta: { changes: 1 } }
          }
          if (/UPDATE gen_charges SET consumed_at/i.test(s)) {
            const row = charges.get(bound[1])
            if (!row || row.consumed_at) return { success: true, meta: { changes: 0 } }
            row.consumed_at = bound[0]
            return { success: true, meta: { changes: 1 } }
          }
          if (/UPDATE users SET credits/i.test(s)) {
            // 차감(- ?)과 환불(+ ?) 을 부호까지 구분해 흉내 낸다 — 안 그러면 환불도 빼기가 된다
            const sign = /-\s*\?/.test(s) ? -1 : 1
            credits = Math.round((credits + sign * Number(bound[0])) * 100) / 100
            return { success: true, meta: { changes: 1 } }
          }
          return { success: true, meta: { changes: 1 } }
        },
      }
      return stmt
    },
    batch: async () => [], exec: async () => ({}), dump: async () => new ArrayBuffer(0),
    __charges: charges, __bal: () => credits,
  }
  return db
}

const USER = { id: '1', email: 'u@x.co', name: '회원', role: 'user', credits: 100000, user_id: '1', expires_at: '2099-01-01T00:00:00Z', credit_markup: 0 }

;(async () => {
  const gc = load('functions/api/studio/_gencharge.ts')
  const rec = load('functions/api/usage/record.ts')
  const fails = []

  /* 생성 시점 차감 — 실제 코드(settleGenCharge)를 그대로 부른다.
     요금 계산에 필요한 함수들은 진짜 _pricing 에서 가져온다(값을 손으로 옮기지 않는다). */
  const pricing = load('functions/api/studio/_pricing.ts')
  const prepare = load('functions/api/payments/prepare.ts')
  const settle = (db, token, taskKey = null) =>
    gc.settleGenCharge(db, USER, token, taskKey, {
      computeCharge: pricing.computeCharge, getUsdKrw: pricing.getUsdKrw,
      resolveMarkup: pricing.resolveMarkup, resolveRefSurcharge: pricing.resolveRefSurcharge,
      resolveCnSurcharge: pricing.resolveCnSurcharge, creditPriceFor: prepare.creditPriceFor,
      ensureAiUsage: pricing.ensureAiUsage,
    })

  const call = async (db, body) => {
    const request = new Request('https://x/api/usage/record', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: 'bg_session=fake' },
      body: JSON.stringify(body),
    })
    const res = await rec.onRequestPost({ request, env: { DB: db, marketing: db }, params: {}, waitUntil: () => {}, next: async () => new Response('') })
    return { status: res.status, body: await res.json() }
  }

  /* ① 서버는 Veo(비싼) 로 확정했는데 클라이언트가 Lite(싼) 로 신고.
        차감은 신고를 아예 보지 않으므로(생성 자리에서 끝난다) Veo 값이 빠져야 한다. */
  {
    const db = makeDB(USER)
    const before = db.__bal()
    const token = await gc.issueGenCharge(db, '1', { model: 'Google Veo 3.1', units: 10, res: '1080p' })
    const out = await settle(db, token)                       // ← 실제 차감
    await call(db, { chargeToken: token, model: 'Seedance 1.0 Lite (텍스트→영상)', units: 1, res: '540p', kind: 'video' })
    //  같은 내용을 싼 모델로 "확정" 했다면 얼마였을지 — 그 몇 배를 냈는지 본다
    const db2 = makeDB(USER)
    const t2 = await gc.issueGenCharge(db2, '1', { model: 'Seedance 1.0 Lite (텍스트→영상)', units: 1, res: '540p' })
    const cheap = (await settle(db2, t2)).credits
    const ok = out.credits > cheap * 10 && db.__bal() === Math.round((before - out.credits) * 100) / 100
    if (!ok) fails.push(`① 스푸핑 차단 실패: 실제 차감 ${out.credits} vs 싼 모델 ${cheap} · 잔액 ${before}→${db.__bal()}`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ① 비싼 모델로 만들고 싸게 신고 → 실제 ${out.credits}크레딧 차감 (신고대로였다면 ${cheap}크레딧)`)
  }

  // ② 같은 토큰으로 두 번 정산 → 한 번만 빠진다
  {
    const db = makeDB(USER)
    const token = await gc.issueGenCharge(db, '1', { model: 'Google Veo 3.1', units: 10, res: '1080p' })
    const a = await settle(db, token)
    const b = await settle(db, token)
    const ok = a.credits > 0 && b.credits === 0
    if (!ok) fails.push(`② 중복 청구: 1회차 ${a.credits} · 2회차 ${b.credits}`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ② 같은 토큰 두 번 정산 → 1회차 ${a.credits}크레딧, 2회차 ${b.credits}크레딧`)
  }

  // ②-b 신고 창구는 돈을 못 움직인다 (부르든 안 부르든 잔액이 그대로여야 한다)
  {
    const db = makeDB(USER)
    const token = await gc.issueGenCharge(db, '1', { model: 'Google Veo 3.1', units: 10, res: '1080p' })
    const before = db.__bal()
    const r = await call(db, { chargeToken: token, model: 'Google Veo 3.1', units: 10, res: '1080p', kind: 'video' })
    const ok = r.body.charged === 0 && r.body.archiveOnly === true && db.__bal() === before
    if (!ok) fails.push(`②-b 신고로 돈이 움직였다: charged ${r.body.charged} · 잔액 ${before}→${db.__bal()}`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ②-b 신고 창구는 보관 전용 → charged ${r.body.charged}, 잔액 ${before}→${db.__bal()}`)
  }

  // ③ 남의 토큰은 쓸 수 없다
  {
    const db = makeDB(USER)
    const token = await gc.issueGenCharge(db, '999', { model: 'Google Veo 3.1', units: 10, res: '1080p' })
    const r = await call(db, { chargeToken: token, model: 'Seedance 1.0 Lite (텍스트→영상)', units: 1, res: '540p', kind: 'video' })
    const db2 = makeDB(USER)
    const r2 = await call(db2, { model: 'Seedance 1.0 Lite (텍스트→영상)', units: 1, res: '540p', kind: 'video' })
    const ok = r.body.credits === r2.body.credits   // 남의 토큰은 무시 → 폴백 경로
    if (!ok) fails.push(`③ 남의 토큰이 먹혔다: ${r.body.credits} vs ${r2.body.credits}`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ③ 다른 회원 토큰 → 무시 (아카이브가 남의 확정값을 쓰지 않는다, ${r.body.credits}크레딧 상당)`)
  }

  /* ④ 신고를 아예 안 해도 이미 빠져 있다 — 예전 구멍(신고 생략 = 공짜)이 막혔는지.
        차감은 생성 자리에서 끝나므로, record 를 한 번도 부르지 않아도 잔액이 줄어 있어야 한다. */
  {
    const db = makeDB(USER)
    const before = db.__bal()
    const token = await gc.issueGenCharge(db, '1', { model: 'Google Veo 3.1', units: 10, res: '1080p' })
    const out = await settle(db, token)
    const ok = out.credits > 0 && db.__bal() === Math.round((before - out.credits) * 100) / 100
    if (!ok) fails.push(`④ 신고 없이 차감되지 않음: ${out.credits} · 잔액 ${before}→${db.__bal()}`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ④ 신고를 안 해도 생성 시점에 ${out.credits}크레딧 차감 (잔액 ${before}→${db.__bal()})`)
  }

  // ⑤ 실패로 확정된 비동기 생성은 정확히 한 번만 환불된다
  {
    const db = makeDB(USER)
    const key = '/api/generate?provider=kling&task=zzz'
    const token = await gc.issueGenCharge(db, '1', { model: 'Google Veo 3.1', units: 10, res: '1080p' })
    const out = await settle(db, token, key)
    const mid = db.__bal()
    const r1 = await gc.refundGenCharge(db, key)
    const r2 = await gc.refundGenCharge(db, key)
    const ok = Math.abs(r1 - out.credits) < 1e-9 && r2 === 0 && db.__bal() === Math.round((mid + out.credits) * 100) / 100
    if (!ok) fails.push(`⑤ 환불: 1회 ${r1} · 2회 ${r2} · 잔액 ${mid}→${db.__bal()} (청구 ${out.credits})`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ⑤ 실패 환불 → 1회차 ${r1}크레딧, 2회차 ${r2}크레딧`)
  }

  console.log(fails.length === 0 ? '\n과금 토큰 — 실패 0' : `\n실패 ${fails.length}건:`)
  fails.forEach((f) => console.log('  ✗ ' + f))
  process.exit(fails.length ? 1 : 0)
})()
