/* 우회 제출도 똑같이 청구된다 — 새어 나가던 자리를 못 박는다.
 *
 * 씨댄스는 POST 가 (원인불명) 플랫폼 502 로 막힐 때 스튜디오가 GET(?submit=seedance)으로
 * 한 번 더 제출한다. 그런데 잔액 게이트·과금 토큰 발급은 POST 안에만 있었다.
 * 그래서 그 길로 만들어진 영상은 제공사 비용만 나가고 회원에게는 한 푼도 청구되지 않았다 —
 * 토큰이 없으면 정산(settleGenCharge)이 소비할 것도 없기 때문이다.
 * 예외 상황에서만 타는 길이라 화면에도 안 보이고, 그래서 더 오래 갔다.
 *
 * 실제로 돌려서 확인한 내용(workerd + 로컬 D1 + 제공사를 흉내 낸 서버):
 *   고치기 전 — 영상은 만들어지고(제출 도달) 잔액 500 그대로 · 과금 기록 0건
 *   고친 뒤   — 잔액 500 → 407.64 · gen_charges status='charged' · 응답에 charged 92.36
 *   잔액 부족 — 제공사 호출 전에 402 로 막힘(제출 횟수가 늘지 않음)
 * 그 확인은 손으로 돌린 것이라 여기 남지 않는다. 다시 새지 않도록 구조를 붙잡아 둔다.
 */
import fs from 'node:fs'
const ROOT = new URL('../', import.meta.url).pathname
const src = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

// ① 게이트가 한 군데에 있다 — 두 벌로 갈라지면 한쪽만 고쳐지고 다시 어긋난다
{
  ok('① 잔액 게이트·토큰 발급이 함수 하나로 있다', /async function billingGate\(context, env, u, db, me, pbody\)/.test(src))
  ok('①-b 통과하면 null, 막으면 Response 를 돌려준다',
     /return null;\n\}/.test(src) && /needPlan: true \}, 402\)/.test(src))
  const calls = src.match(/await billingGate\(/g) || []
  ok('①-c 두 길이 모두 이 함수를 지난다(POST · GET 우회)', calls.length >= 2, `${calls.length}곳에서 부름`)
}

// ② GET 우회 제출이 실제로 게이트를 지난다
{
  const i = src.indexOf('u.searchParams.get("submit") === "seedance"')
  ok('② GET 우회 제출 경로가 있다', i > 0)
  //  제출을 실제로 보내는 자리보다 "앞" 이어야 의미가 있다 — 뒤면 이미 돈이 나간 뒤다
  const seg = src.slice(i, i + 4000)
  const iGate = seg.indexOf('await billingGate(')
  const iSend = seg.indexOf('/contents/generations/tasks')
  ok('②-b 게이트가 제출보다 앞에 있다', iGate > 0 && iSend > 0 && iGate < iSend,
     `게이트 ${iGate} · 제출 ${iSend} — 뒤에 있으면 이미 제공사 비용이 나간 뒤다`)
  ok('②-c 잔액 0 이면 먼저 끊는다', /if \(!\(Number\(gme\.credits\) > 0\)\)/.test(seg))
  ok('②-d 관리자는 예전처럼 면제된다', /gme\.role !== "admin"/.test(seg))
  //  막혔으면 그대로 돌려줘야 한다 — 삼키면 그냥 통과한다
  ok('②-e 막히면 그 응답을 그대로 돌려준다', /if \(blocked\) return blocked;/.test(seg))
}

/* ③ 제출 주소를 본 경로와 같은 방식으로 정한다
   이 자리만 ARK_HOSTS 를 직접 보고 있었다. 그래서 제공사를 흉내 낸 서버로 돌려
   실제로 태워 보는 검사가 이 길만 못 태웠다 — 새는 걸 못 잡은 이유이기도 하다. */
{
  const i = src.indexOf('u.searchParams.get("submit") === "seedance"')
  const seg = src.slice(i, i + 4000)
  ok('③ 우회 제출도 arkBase 로 주소를 정한다', /arkBase\(env, "bp"\) \+ "\/contents\/generations\/tasks"/.test(seg),
     'ARK_HOST_OVERRIDE 가 안 먹으면 이 길은 실물로 검사할 수 없다')
}

/* ④ 다른 우회 제출 경로가 몰래 생기지 않았는지
   ?submit= 로 시작하는 길이 늘어나면 각자 게이트를 지나야 한다. 지금은 씨댄스 하나뿐이다. */
{
  const subs = [...src.matchAll(/u\.searchParams\.get\("submit"\) === "([a-z0-9_]+)"/g)].map((m) => m[1])
  ok('④ 우회 제출 경로는 씨댄스 하나뿐이다', subs.length === 1 && subs[0] === 'seedance',
     '새로 생겼다면 그 경로도 billingGate 를 지나야 한다: ' + subs.join(','))
}

console.log(fails.length === 0
  ? '\n우회 제출 과금 — 실패 0 (게이트 공유 · 제출보다 앞 · 잔액 확인 · 주소 해석 일치)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
