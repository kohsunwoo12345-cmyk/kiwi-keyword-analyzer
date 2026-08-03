/* 생성물은 평생 남아야 한다 — 만료되는 남의 주소를 저장하지 않는다.
 *
 * 두 가지가 겹쳐서 "만든 게 사라졌다" 가 됐다.
 *   ㉠ 제공사 결과 주소(http)를 그대로 저장했다. 저장한 그날은 잘 보이니 아무도 모르다가
 *      며칠 뒤 원본이 만료되면 보관함과 관리자 화면에서 한꺼번에 죽는다.
 *   ㉡ 새로고침해서 이어받은 생성(resumePendingJobs)은 요금 줄 번호도 토큰도 못 보낸다 —
 *      둘 다 제출 응답에만 실려 왔고 새로고침에 사라진다. 그래서 결과물이 돈 붙은 줄에
 *      안 붙고, 금액 0짜리 줄이 따로 생겼다(관리자 화면 "미리보기 없음 (아카이브 안 됨)").
 *
 * 실제로 돌려서 확인한 것(workerd + 로컬 D1/R2 + 제공사를 흉내 낸 미디어 서버):
 *   고치기 전 — 돈 붙은 줄 result_url 은 빈 값 · 제공사 주소를 든 0원 줄이 하나 더 생김
 *   고친 뒤   — 줄 하나만 남고 result_url 이 /api/media/gen/….mp4 (받아 보니 307,200바이트)
 *   예전 기록 — 보관함을 열면 제공사 주소가 R2 주소로 바뀌어 저장됨
 * 그 확인은 손으로 돌린 것이라 여기 남지 않는다. 다시 새지 않도록 구조를 붙잡아 둔다.
 */
import fs from 'node:fs'
const ROOT = new URL('../', import.meta.url).pathname
const rec = fs.readFileSync(ROOT + 'functions/api/usage/record.ts', 'utf8')
const gal = fs.readFileSync(ROOT + 'functions/api/studio/gallery.ts', 'utf8')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

// ① 제공사 주소를 그대로 저장하지 않는다
{
  //  예전 코드는 http(s) 를 만나면 곧바로 돌려줬다. 그 한 줄이 원인이었다.
  ok('① http 주소를 그대로 돌려주지 않는다',
     !/return url \/\/ http\(s\)/.test(rec),
     '제공사 주소를 저장하면 며칠 뒤 원본이 만료돼 결과물이 사라진다')
  ok('①-b 제공사 주소를 받아서 R2 에 넣는다',
     /const r = await fetch\(url\)/.test(rec) && /bucket\.put\(key, r\.body/.test(rec))
  ok('①-c 통째로 메모리에 안 올린다(스트리밍)', /bucket\.put\(key, r\.body/.test(rec),
     '큰 영상을 통째로 읽으면 워커가 죽는다')
  ok('①-d 우리 주소로 바꿔 저장한다', /return '\/api\/media\/' \+ key/.test(rec))
  //  실패해도 아무것도 안 보이는 것보다는 원본이라도 보이는 편이 낫다
  ok('①-e 옮기기에 실패하면 원본 주소로 물러난다',
     /if \(!r\.ok \|\| !r\.body\) return url/.test(rec) && /if \(!bucket\) return url/.test(rec))
  ok('①-f 너무 큰 파일은 원본으로 둔다', /if \(len > MAX_PERSIST_BYTES\) return url/.test(rec))
  //  확장자가 틀리면 브라우저가 영상을 못 연다
  ok('①-g 확장자를 주소에서도 추정한다', /ctExt\(ct\) \|\| guessExt\(url\)/.test(rec))
}

// ② 새로고침해서 이어받은 생성도 같은 줄에 붙는다
{
  ok('② 작업 주소로 요금 줄을 찾는다',
     /SELECT usage_id FROM gen_charges WHERE task_key = \? AND user_id = \?/.test(rec),
     '브라우저는 새로고침 뒤 줄 번호를 모른다 — 서버가 작업 주소로 찾아야 한다')
  ok('②-b 남의 줄을 건드리지 않는다(user_id 확인)', /task_key = \? AND user_id = \?/.test(rec))
  ok('②-c 줄 번호가 있을 때만 쓴다', /usage_id != ''/.test(rec))
  ok('②-d 찾은 값이 실제로 쓰인다',
     /String\(b\.chargeRef \|\| staked\?\.usageId \|\| byTask \|\| ''\)/.test(rec),
     '찾아 놓고 안 쓰면 그대로 별도 줄이 생긴다')
  //  순서가 뒤바뀌면 원래 있던 값이 무시된다
  ok('②-e 클라이언트가 준 값이 우선이다',
     rec.indexOf('b.chargeRef ||') < rec.indexOf('byTask ||'))
}

// ③ 이미 쌓인 기록도 뒤늦게 옮긴다
{
  ok('③ 보관함을 열 때 옮기는 경로가 있다', /async function healToR2\(/.test(gal))
  ok('③-b 실제로 호출된다', /await healToR2\(env, db, rows\.results \|\| \[\], me\.id\)/.test(gal))
  ok('③-c 제공사 주소인 것만 고른다', /\/\^https\?:\\\/\\\/\/i\.test\(String\(r\.result_url/.test(gal))
  //  200건을 한 요청에서 옮기면 그 요청이 죽는다
  ok('③-d 한 번에 조금씩만 옮긴다', /HEAL_PER_LOAD/.test(gal) && /slice\(0, HEAL_PER_LOAD\)/.test(gal))
  ok('③-e 옮긴 주소를 DB 에 되쓴다', /UPDATE ai_usage SET result_url = \? WHERE id = \? AND user_id = \?/.test(gal))
  ok('③-f 이번 응답부터 새 주소로 준다', /r\.result_url = '\/api\/media\/' \+ key/.test(gal),
     '되쓰기만 하고 응답은 옛 주소면 그 화면에서는 여전히 깨져 보인다')
  //  만료된 것은 살릴 수 없다 — 그렇다고 지우면 안 된다(기록은 남아야 한다)
  ok('③-g 못 옮겨도 지우지 않는다', !/DELETE FROM ai_usage/.test(gal))
}

console.log(fails.length === 0
  ? '\n생성물 영구 보관 — 실패 0 (R2 로 옮김 · 이어받은 생성도 같은 줄 · 예전 기록 뒤늦게 복구)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
