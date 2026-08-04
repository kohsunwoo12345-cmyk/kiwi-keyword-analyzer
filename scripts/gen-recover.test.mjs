/* 잃어버린 결과물 되찾기 — 영상만 되찾고, 요금은 건드리지 않는다.
 *
 * "미리보기 없음 (아카이브 안 됨)" 은 우리 표에 결과 주소가 없다는 뜻이지 영상이 없다는
 * 뜻이 아니다. 대부분은 제공사 쪽에 그대로 있고 우리가 주소를 잃은 것뿐이라, 작업 번호로
 * 다시 물어보면 되찾을 수 있다.
 *
 * ⚠ 만들면서 실제로 사고를 하나 냈다. 완료된 작업을 다시 조회하면 응답에 제공사 실측
 *   토큰이 실려 오고, 평소 경로(reconcileGenCharge)가 그 값으로 요금을 다시 매긴다.
 *   생성 직후라면 맞는 동작이지만 몇 달 지난 기록에서 돌면 지나간 청구가 조용히 바뀐다 —
 *   검사에서 ₩2,471 짜리 한 건이 ₩0 으로 덮이는 것을 봤다(잠금을 빼고 다시 돌려 재현).
 *   되찾기는 영상을 되찾는 일이지 요금을 다시 매기는 일이 아니다.
 *
 * 실제로 돌려서 확인한 것(workerd + 로컬 D1/R2 + 제공사를 흉내 낸 ARK):
 *   성공 → 되찾아 R2 에 보관(/api/media/… · 256,000바이트 재생 확인) · 요금 38.02 그대로
 *   만료 → 손대지 않음   실패 → 손대지 않음(그 자리에서 환불됨)   진행 중 → 손대지 않음
 */
import fs from 'node:fs'
const ROOT = new URL('../', import.meta.url).pathname
const src = fs.readFileSync(ROOT + 'functions/api/admin/gen-recover.ts', 'utf8')
const page = fs.readFileSync(ROOT + 'app/adminsunkoh028741_11263/ai-generations/page.tsx', 'utf8')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

// ① 요금을 건드리지 않는다 — 이게 제일 중요하다
{
  ok('① 조회 전에 정산 자리를 잠근다',
     /UPDATE gen_charges SET reconciled_at = COALESCE\(reconciled_at, \?\) WHERE id = \?/.test(src),
     '안 잠그면 되찾다가 지나간 청구가 다시 매겨진다(실측: ₩2,471 → ₩0)')
  //  잠금이 조회보다 뒤에 있으면 아무 소용이 없다
  const iLock = src.indexOf('SET reconciled_at = COALESCE')
  const iPoll = src.indexOf('await fetch(new URL(taskKey, origin)')
  ok('①-b 잠금이 조회보다 먼저다', iLock > 0 && iPoll > 0 && iLock < iPoll)
  ok('①-c 이미 잠긴 것은 덮어쓰지 않는다', /COALESCE\(reconciled_at, \?\)/.test(src))
  //  결과 주소 말고 다른 칸을 쓰지 않는다
  const updates = src.match(/UPDATE ai_usage SET [^`']*/g) || []
  ok('①-d ai_usage 는 결과 주소만 고친다',
     updates.length === 1 && /result_url = \?/.test(updates[0]) && !/credits|revenue_krw|cost_krw|usd/.test(updates[0]),
     updates.join(' | '))
}

// ② 못 찾은 것을 찾은 것처럼 적지 않는다
{
  //  옮기는 코드가 _media.ts 로 합쳐지면서 이름이 stored → saved.moved 로 바뀌었다.
  //  동작은 그대로다 — 옮겨진 것만 기록한다.
  ok('② 받아 오지 못하면 기록하지 않는다',
     /if \(saved\.moved\) \{/.test(src) && /gone\+\+; details\.push/.test(src),
     '못 가져온 것을 되찾은 것처럼 적으면 화면만 멀쩡해지고 영상은 여전히 없다')
  ok('②-b 실패·진행 중은 손대지 않는다',
     /failed\+\+; details\.push/.test(src) && /running\+\+; details\.push/.test(src) &&
     !/UPDATE ai_usage[\s\S]{0,200}failed/.test(src))
  ok('②-c 환불된 건은 아예 묻지 않는다', /g\.status != 'refunded'/.test(src),
     '실패로 확정돼 환불까지 끝난 건은 결과가 있을 리 없다')
  ok('②-d 아무것도 지우지 않는다', !/DELETE FROM/.test(src))
}

// ③ 한 번에 다 하지 않는다 — 그러면 그 요청이 죽고 아무것도 안 고쳐진다
{
  ok('③ 한 번에 처리할 건수를 제한한다', /const BATCH = \d+/.test(src) && /LIMIT \?'\)\.bind\(BATCH\)/.test(src.replace(/\s+/g, ' ')))
  ok('③-b 남은 건수를 알려 준다', /remaining/.test(src))
  //  못 고치는 건(실패·만료·진행 중)을 빼지 않으면 화면이 영원히 다시 부른다
  ok('③-c 못 고칠 건수는 남은 수에서 뺀다', /const stuck = failed \+ running \+ gone/.test(src))
  ok('③-d 화면도 진전이 없으면 멈춘다', /if \(!\(r\.remaining \|\| 0\) \|\| !\(r\.recovered \|\| 0\)\) break/.test(page))
}

// ④ 관리자만 · 보관할 곳이 있을 때만
{
  ok('④ 관리자 확인이 있다', /requireAdminUser\(request, db\)/.test(src))
  ok('④-b R2 가 없으면 시작도 안 한다', /if \(!bucket\) return json\(/.test(src),
     '되찾아 와도 보관할 곳이 없으면 제공사만 두들기는 셈이다')
  //  상한도 _media.ts 로 옮겨 갔다. 되찾기가 그 코드를 쓰는지 + 그 코드에 상한이 있는지 둘 다 본다.
  //  (src 에서 MAX_BYTES 만 찾으면 상한이 살아 있는데도 실패로 뜬다 — 실제로 그렇게 떴다)
  const med = fs.readFileSync(ROOT + 'functions/api/_media.ts', 'utf8')
  ok('④-c 너무 큰 파일은 건너뛴다',
     /saveMediaToR2\(env, String\(j\.url\)\)/.test(src) &&
     /MAX_STREAM_BYTES/.test(med) && /MAX_BUFFER_BYTES/.test(med))
}

// ⑤ 화면이 결과를 정직하게 말한다
{
  ok('⑤ 되찾은 수를 보여 준다', /되찾음/.test(page))
  ok('⑤-b 못 되찾은 것도 말한다', /원본이 이미 사라진 건/.test(page) && /제공사에서 실패했던 건/.test(page),
     '"몇 건 복구" 만 쓰면 나머지가 왜 그대로인지 몰라 같은 단추를 계속 누르게 된다')
  ok('⑤-c 되살릴 수 없다는 것도 말한다', /되살릴 수 없습니다/.test(page))
}

console.log(fails.length === 0
  ? '\n결과물 되찾기 — 실패 0 (요금 불변 · 못 찾은 건 그대로 · 조금씩 · 관리자만)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
