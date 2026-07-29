/* 과금 토큰 회귀 테스트 —  node scripts/charge-token.test.mjs
 *
 * 스튜디오 경로는 /api/generate 가 차감하지 않고 /api/usage/record 가 차감한다.
 * 그 record 가 모델 이름을 요청 본문에서 받아 쓰고 있어서, 비싼 모델로 만들고
 * 싼 모델로 신고하면 차액만큼 덜 냈다. 생성 시점에 서버가 확정값을 토큰에 묶고
 * 차감할 때 그 값을 쓰도록 바꿨다 — 그 성질이 유지되는지 지킨다.
 */
import { buildSync } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require_ = createRequire(import.meta.url)

function load(file) {
  const out = buildSync({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'] })
  const sandbox = { module: { exports: {} }, exports: {}, require: require_, console, Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto, fetch, btoa, atob, setTimeout, clearTimeout, structuredClone }
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
          if (/UPDATE gen_charges SET consumed_at/i.test(s)) {
            const row = charges.get(bound[1])
            if (!row || row.consumed_at) return { success: true, meta: { changes: 0 } }
            row.consumed_at = bound[0]
            return { success: true, meta: { changes: 1 } }
          }
          if (/UPDATE users SET credits/i.test(s)) { credits = Math.round((credits - Number(bound[0])) * 100) / 100; return { success: true, meta: { changes: 1 } } }
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

  const call = async (db, body) => {
    const request = new Request('https://x/api/usage/record', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: 'bg_session=fake' },
      body: JSON.stringify(body),
    })
    const res = await rec.onRequestPost({ request, env: { DB: db, marketing: db }, params: {}, waitUntil: () => {}, next: async () => new Response('') })
    return { status: res.status, body: await res.json() }
  }

  // ① 서버는 Veo(비싼) 로 확정했는데 클라이언트가 Lite(싼) 로 신고
  {
    const db = makeDB(USER)
    const token = await gc.issueGenCharge(db, '1', { model: 'Google Veo 3.1', units: 10, res: '1080p' })
    const r = await call(db, { chargeToken: token, model: 'Seedance 1.0 Lite (텍스트→영상)', units: 1, res: '540p', kind: 'video' })
    // 같은 조건을 토큰 없이 신고했을 때와 비교
    const db2 = makeDB(USER)
    const r2 = await call(db2, { model: 'Seedance 1.0 Lite (텍스트→영상)', units: 1, res: '540p', kind: 'video' })
    const ok = r.body.credits > r2.body.credits * 10
    if (!ok) fails.push(`① 스푸핑 차단 실패: 토큰 ${r.body.credits} vs 무토큰 ${r2.body.credits}`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ① 비싼 모델로 만들고 싸게 신고 → 청구 ${r.body.credits}크레딧 (신고대로였다면 ${r2.body.credits}크레딧)`)
  }

  // ② 같은 토큰을 두 번 신고
  {
    const db = makeDB(USER)
    const token = await gc.issueGenCharge(db, '1', { model: 'Google Veo 3.1', units: 10, res: '1080p' })
    const a = await call(db, { chargeToken: token, model: 'Google Veo 3.1', units: 10, res: '1080p', kind: 'video' })
    const b = await call(db, { chargeToken: token, model: 'Google Veo 3.1', units: 10, res: '1080p', kind: 'video' })
    const ok = a.body.charged > 0 && b.body.duplicate === true && b.body.charged === 0
    if (!ok) fails.push(`② 중복 청구: 1회차 ${a.body.charged} · 2회차 ${JSON.stringify(b.body)}`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ② 같은 토큰 두 번 → 1회차 ${a.body.charged}크레딧, 2회차 ${b.body.charged}크레딧(중복표시 ${b.body.duplicate})`)
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
    console.log(`${ok ? 'OK  ' : 'FAIL'} ③ 다른 회원 토큰 → 무시하고 폴백 (${r.body.credits}크레딧)`)
  }

  // ④ 토큰 없는 구버전 클라이언트도 그대로 청구된다
  {
    const db = makeDB(USER)
    const r = await call(db, { model: 'Google Veo 3.1', units: 10, res: '1080p', kind: 'video' })
    const ok = r.body.charged > 0
    if (!ok) fails.push(`④ 무토큰 폴백이 과금하지 않음: ${JSON.stringify(r.body)}`)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ④ 토큰 없는 구버전 → 예전대로 ${r.body.charged}크레딧 청구`)
  }

  console.log(fails.length === 0 ? '\n과금 토큰 — 실패 0' : `\n실패 ${fails.length}건:`)
  fails.forEach((f) => console.log('  ✗ ' + f))
  process.exit(fails.length ? 1 : 0)
})()
