/* 쿠폰 회귀 테스트 —  node scripts/coupon.test.mjs
 *
 * 쿠폰은 실결제 금액을 정한다. 매출은 할인 적용 후 금액으로 집계되므로,
 * 여기가 틀리면 매출이 그대로 어긋난다.
 *
 * 돌연변이 점검에서 아홉 가지로 망가뜨려 보니 전부 살아남았다 —
 * 만료·비활성 쿠폰을 받아 줘도, 한도를 무시해도, 할인이 원금을 넘어도,
 * 사용 확정의 조건부 UPDATE 를 풀어도 아무 테스트도 울지 않았다.
 *
 * ⚠ 가짜 D1 은 "진짜 SQL 에 적힌 조건" 만 적용한다.
 */
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)

async function load(file) {
  const out = await build({ entryPoints: [file], bundle: true, write: false, format: 'cjs', platform: 'neutral', target: 'es2022' })
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_, console,
    Response, Request, Headers, URL, TextEncoder, TextDecoder, crypto,
    fetch: async () => new Response('{}'), btoa, atob, setTimeout, clearTimeout, structuredClone,
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

const cp = await load('functions/api/_coupons.ts')

const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString()
const PAST = new Date(Date.now() - 86400_000).toISOString()

const BASE = {
  id: 'c1', code: 'WELCOME20', active: 1, discount_type: 'percent', discount_value: 20,
  scope_track: '', scope_plan: '', min_months: 0, max_uses: 0, used_count: 0, per_user_limit: 0,
  starts_at: null, expires_at: null,
}

function makeDB(coupon, redemptions = []) {
  const state = { coupon: coupon ? { ...coupon } : null, redemptions: redemptions.slice(), sql: [] }
  const first = async (s, b) => {
    state.sql.push({ s, b })
    if (/FROM coupons WHERE code/i.test(s)) return state.coupon && state.coupon.code === b[0] ? { ...state.coupon } : null
    if (/COUNT\(\*\) AS n FROM coupon_redemptions/i.test(s))
      return { n: state.redemptions.filter((r) => r.coupon_id === b[0] && r.user_id === b[1]).length }
    return null
  }
  const run = async (s, b) => {
    state.sql.push({ s, b })
    if (/UPDATE coupons SET used_count = COALESCE\(used_count, 0\) \+ 1/i.test(s)) {
      const c = state.coupon
      //  ⚠ 조건은 진짜 SQL 에 있을 때만 본다
      const guarded = /COALESCE\(used_count, 0\) < max_uses/.test(s)
      if (!c) return { meta: { changes: 0 } }
      if (guarded && Number(c.max_uses) > 0 && Number(c.used_count || 0) >= Number(c.max_uses)) return { meta: { changes: 0 } }
      c.used_count = Number(c.used_count || 0) + 1
      return { meta: { changes: 1 } }
    }
    if (/UPDATE coupons SET used_count = COALESCE\(used_count, 0\) - 1/i.test(s)) {
      const c = state.coupon
      if (c && Number(c.used_count || 0) > 0) { c.used_count-- ; return { meta: { changes: 1 } } }
      return { meta: { changes: 0 } }
    }
    if (/INSERT INTO coupon_redemptions/i.test(s)) {
      //  조건부 INSERT — 1인 한도가 SQL 에 실제로 걸려 있을 때만 적용한다
      const guarded = /WHERE \? <= 0 OR \(SELECT COUNT\(\*\)/.test(s)
      const perUser = Number(b[12]) || 0
      const couponId = b[13], userId = b[14], limit = Number(b[15]) || 0
      if (guarded && perUser > 0) {
        const used = state.redemptions.filter((r) => r.coupon_id === couponId && r.user_id === userId).length
        if (!(used < limit)) return { meta: { changes: 0 } }
      }
      state.redemptions.push({ id: b[0], coupon_id: b[1], user_id: b[3], final_krw: b[10] })
      return { meta: { changes: 1 } }
    }
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

const check = (coupon, opts = {}, reds = []) => cp.validateCoupon(makeDB(coupon, reds), {
  code: 'WELCOME20', track: 'video', plan: 'Pro', months: 1, monthlyPrice: 100000, ...opts,
}).then((r) => r)

console.log('\n① 할인 계산이 정확하다')
{
  const pct = await check(BASE)
  ok(pct.ok === true, '정상 쿠폰은 통과한다', JSON.stringify(pct.error))
  ok(pct.original === 100000 && pct.discount === 20000 && pct.final === 80000,
     '20% 할인 → 10만 원이 8만 원이 된다', JSON.stringify([pct.original, pct.discount, pct.final]))

  const fixed = await check({ ...BASE, discount_type: 'fixed', discount_value: 30000 })
  ok(fixed.discount === 30000 && fixed.final === 70000, '정액 3만 원 할인이 그대로 빠진다', JSON.stringify([fixed.discount, fixed.final]))

  const months = await check(BASE, { months: 6 })
  ok(months.original === 600000 && months.final === 480000, '6개월이면 원금·할인 모두 6배다', JSON.stringify([months.original, months.final]))
}

console.log('\n② 할인이 원금을 넘지 않는다')
{
  /* 넘으면 최종 금액이 음수가 되어 "결제하면 돈을 돌려주는" 상품이 된다. */
  const big = await check({ ...BASE, discount_type: 'fixed', discount_value: 500000 })
  ok(big.discount === 100000, '정액 할인은 원금까지만 적용된다', String(big.discount))
  ok(big.final === 0, '최종 금액이 0 이다(음수가 아니다)', String(big.final))

  const over = await check({ ...BASE, discount_type: 'percent', discount_value: 150 })
  ok(over.discount <= 100000, '할인율이 100%를 넘지 않는다', String(over.discount))
  ok(over.final >= 0, '최종 금액이 음수가 되지 않는다', String(over.final))

  const neg = await check({ ...BASE, discount_type: 'percent', discount_value: -50 })
  ok(neg.discount >= 0, '음수 할인율은 0으로 본다(금액이 늘지 않는다)', String(neg.discount))
  ok(neg.final <= 100000, '원금보다 비싸지지 않는다', String(neg.final))
}

console.log('\n③ 쓸 수 없는 쿠폰은 거절한다')
{
  const inactive = await check({ ...BASE, active: 0 })
  ok(inactive.ok === false && /비활성/.test(String(inactive.error)), '비활성 쿠폰은 거절한다', String(inactive.error))
  ok(inactive.final === 100000, '거절하면 원금 그대로다', String(inactive.final))

  const expired = await check({ ...BASE, expires_at: PAST })
  ok(expired.ok === false && /만료/.test(String(expired.error)), '만료된 쿠폰은 거절한다', String(expired.error))

  const early = await check({ ...BASE, starts_at: FUTURE })
  ok(early.ok === false && /기간/.test(String(early.error)), '아직 시작 전이면 거절한다', String(early.error))

  const none = await check(null)
  ok(none.ok === false && /존재하지 않는/.test(String(none.error)), '없는 코드는 거절한다', String(none.error))

  const live = await check({ ...BASE, starts_at: PAST, expires_at: FUTURE })
  ok(live.ok === true, '기간 안이면 통과한다', String(live.error))
}

console.log('\n④ 적용 범위·최소 개월을 지킨다')
{
  const otherPlan = await check({ ...BASE, scope_plan: 'Business' })
  ok(otherPlan.ok === false, '다른 플랜 전용 쿠폰은 거절한다', String(otherPlan.error))
  const samePlan = await check({ ...BASE, scope_plan: 'Pro' })
  ok(samePlan.ok === true, '지정된 플랜이면 통과한다', String(samePlan.error))

  const otherTrack = await check({ ...BASE, scope_track: 'marketing' })
  ok(otherTrack.ok === false, '다른 트랙 전용 쿠폰은 거절한다', String(otherTrack.error))

  const minM = await check({ ...BASE, min_months: 6 }, { months: 3 })
  ok(minM.ok === false && /6개월/.test(String(minM.error)), '최소 개월 미달이면 거절한다', String(minM.error))
  ok((await check({ ...BASE, min_months: 6 }, { months: 6 })).ok === true, '최소 개월을 채우면 통과한다')
}

console.log('\n⑤ 사용 한도를 지킨다')
{
  const exhausted = await check({ ...BASE, max_uses: 10, used_count: 10 })
  ok(exhausted.ok === false && /소진/.test(String(exhausted.error)), '전체 한도가 다 찼으면 거절한다', String(exhausted.error))
  ok((await check({ ...BASE, max_uses: 10, used_count: 9 })).ok === true, '한도가 남아 있으면 통과한다')

  const perUser = await check({ ...BASE, per_user_limit: 1 }, { userId: 'u1' }, [{ coupon_id: 'c1', user_id: 'u1' }])
  ok(perUser.ok === false && /이미 사용/.test(String(perUser.error)), '이미 쓴 회원은 거절한다', String(perUser.error))
  const otherUser = await check({ ...BASE, per_user_limit: 1 }, { userId: 'u2' }, [{ coupon_id: 'c1', user_id: 'u1' }])
  ok(otherUser.ok === true, '다른 회원은 그대로 쓸 수 있다', String(otherUser.error))
}

console.log('\n⑥ 사용 확정은 동시에 들어와도 한도를 넘지 않는다')
{
  /* 검증은 읽기 시점 기준이라 동시 요청을 막지 못한다.
     같은 코드를 여러 창에서 동시에 넣으면 1회짜리 쿠폰도 전부 통과해 버린다. */
  const db = makeDB({ ...BASE, max_uses: 1, used_count: 0 })
  const calc = await cp.validateCoupon(db, { code: 'WELCOME20', track: 'video', plan: 'Pro', months: 1, monthlyPrice: 100000 })
  ok(calc.ok === true, '검증은 통과한다')

  const both = await Promise.all([
    cp.redeemCoupon(db, calc, { userId: 'u1', planRequestId: 'p1', track: 'video', plan: 'Pro', months: 1 }),
    cp.redeemCoupon(db, calc, { userId: 'u2', planRequestId: 'p2', track: 'video', plan: 'Pro', months: 1 }),
  ])
  ok(both.filter(Boolean).length === 1, '한쪽만 확정된다', JSON.stringify(both))
  ok(Number(db.__state.coupon.used_count) === 1, '사용횟수가 1 이다(2가 되면 한도를 넘긴 것)', String(db.__state.coupon.used_count))
  ok(db.__state.redemptions.length === 1, '사용 기록도 하나뿐이다', String(db.__state.redemptions.length))
}

console.log('\n⑦ 1인 한도에 걸리면 전체 사용횟수를 되돌린다')
{
  /* 되돌리지 않으면 아무도 못 쓴 채 한도만 소진된다 — 쿠폰이 조용히 죽는다. */
  const db = makeDB({ ...BASE, max_uses: 10, used_count: 0, per_user_limit: 1 }, [{ coupon_id: 'c1', user_id: 'u1' }])
  const calc = { ok: true, coupon: { ...BASE, max_uses: 10, used_count: 0, per_user_limit: 1 }, original: 100000, discount: 20000, final: 80000 }
  const r = await cp.redeemCoupon(db, calc, { userId: 'u1', planRequestId: 'p1', track: 'video', plan: 'Pro', months: 1 })
  ok(r === false, '이미 쓴 회원은 확정되지 않는다', String(r))
  ok(Number(db.__state.coupon.used_count) === 0, '올렸던 전체 사용횟수를 되돌린다(안 되돌리면 한도만 축난다)',
     String(db.__state.coupon.used_count))
  ok(db.__state.redemptions.length === 1, '사용 기록이 늘지 않는다', String(db.__state.redemptions.length))
}

console.log('\n⑧ 정상 사용은 기록이 남는다')
{
  const db = makeDB({ ...BASE, max_uses: 10, used_count: 3, per_user_limit: 1 })
  const calc = { ok: true, coupon: { ...BASE, max_uses: 10, used_count: 3, per_user_limit: 1 }, original: 100000, discount: 20000, final: 80000 }
  const r = await cp.redeemCoupon(db, calc, { userId: 'u9', planRequestId: 'p9', track: 'video', plan: 'Pro', months: 1 })
  ok(r === true, '확정된다')
  ok(Number(db.__state.coupon.used_count) === 4, '사용횟수가 하나 올라간다', String(db.__state.coupon.used_count))
  ok(db.__state.redemptions.length === 1, '사용 기록이 남는다')
  ok(Number(db.__state.redemptions[0].final_krw) === 80000, '기록에 실결제 금액이 남는다(매출 집계 기준)',
     String(db.__state.redemptions[0].final_krw))
}

console.log('\n⑨ 코드 표기는 관대하게, 판정은 엄격하게')
{
  ok(cp.normalizeCode('  welcome20 ') === 'WELCOME20', '앞뒤 공백·소문자를 정리한다', cp.normalizeCode('  welcome20 '))
  ok(cp.normalizeCode('WEL COME 20') === 'WELCOME20', '가운데 공백도 지운다', cp.normalizeCode('WEL COME 20'))
  ok(cp.normalizeCode(null) === '', '빈 값은 빈 문자열이다')

  const empty = await cp.validateCoupon(makeDB(BASE), { code: '   ', track: 'video', plan: 'Pro', months: 1, monthlyPrice: 100000 })
  ok(empty.ok === false, '공백만 있는 코드는 거절한다', String(empty.error))
}

console.log(failed === 0 ? '\n쿠폰 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
