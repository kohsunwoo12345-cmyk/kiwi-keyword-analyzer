/* 알리바바(DashScope) 반응 확인 — 돈 안 쓰고 "무엇이 되는지" 만 본다.
 *
 * 이 진단은 아직 연동되지 않은 제공사의 키로 남의 서버를 두들기는 코드다. 그래서
 * ① 관리자만 · ② 키 값은 절대 응답에 안 나가고 · ③ 생성이 일어나지 않는 요청만 보낸다.
 *
 * 실제로 돌려서 확인한 것(workerd + DashScope 를 흉내 낸 서버):
 *   비로그인 403 · 관리자 200 · 모델 234개 중 200번대에 숨겨 둔 wan 5개를 전부 찾아냄
 *   필드 이름을 models/model_name → data/id 로 바꿔도 그대로 찾아냄
 *
 * ⚠ 만들면서 실제로 낸 버그 두 개를 여기 붙잡아 둔다.
 *   ㉠ 응답 본문을 600자로 자르고 있었다. 운영에서 모델 목록이 200 으로 잘 왔는데
 *      정작 목록이 600자 뒤에 있어서 "무슨 모델이 되는지" 를 한 번도 못 봤다.
 *   ㉡ 페이지를 넘기는 조건에서 "지금까지 모은 개수" 를 총개수와 비교했다. 그 안에는
 *      앞서 받은 OpenAI 호환 목록이 이미 들어 있어서, 첫 장(20개)만 받고도 다 받은 줄
 *      알고 멈췄다 — 뒤쪽에 있던 wan 이 통째로 빠졌다. 흉내 서버로 재현해서 봤다.
 *   둘 다 "아무 오류도 안 나고 그냥 안 보이는" 종류라 눈으로는 못 잡는다.
 */
import fs from 'node:fs'
const ROOT = new URL('../', import.meta.url).pathname
const src = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

const iGate = src.indexOf('진단 엔드포인트는 관리자 전용입니다.')
const iDiag = src.indexOf('u.searchParams.get("diag") === "alibaba"')

// ① 아무나 못 부른다
{
  ok('① 관리자 게이트가 진단보다 먼저다', iGate > 0 && iDiag > 0 && iGate < iDiag,
     '한 번 게이트 위에 뒀다가 비로그인이 200 을 받는 것을 봤다 — 남의 계정 키로 제공사를 두들기는 통로가 된다')
  ok('①-b 진단 블록이 하나뿐이다',
     src.split('u.searchParams.get("diag") === "alibaba"').length - 1 === 1,
     '고쳐 쓴 블록을 위에 얹고 옛 블록을 안 지우면, 읽는 사람은 닿지도 않는 옛 코드를 보고 판단하게 된다')
}

// ② 키 값은 어떤 경우에도 응답에 안 나간다
{
  //  진단 블록 전체를 본다. 길이를 숫자로 박아 뒀더니 블록이 자라면서 창 밖으로
  //  밀려나 "지문을 안 내보낸다" 는 엉뚱한 실패가 났다 — 끝을 실제로 찾아서 자른다.
  const iEnd = src.indexOf('결과: results,', iDiag)
  const body = src.slice(iDiag, iEnd > 0 ? iEnd : iDiag + 20000)
  ok('② 지문만 내보낸다(앞 6자·뒤 4자)',
     /키지문: String\(k\.alibaba\)\.slice\(0, 6\) \+ "…" \+ String\(k\.alibaba\)\.slice\(-4\)/.test(body))
  ok('②-b 키를 통째로 담는 자리가 없다',
     !/키: k\.alibaba|key: k\.alibaba|apiKey: k\.alibaba/.test(body))
}

// ③ 생성이 일어나지 않는 요청만 보낸다
{
  ok('③ 없는 모델 이름으로만 제출한다', /model: "__bygency_probe_nonexistent__"/.test(src))
  //  전에는 models=1 하나로 돌았다. 그게 태스크를 만들어 버려서 이제 두 개가 있어야 돈다.
  ok('③-b 실존 모델 찌르기가 models=1 하나로는 안 돈다',
     !/get\("models"\) === "1"\)\s*\{/.test(src),
     '실존 모델로 POST 하면 접수된다 = 돈이 나갈 수 있다. 확인 하나로는 부족하다')
  /*  models=1 은 "돈 안 쓰고 개통 여부까지" 보는 칸이다. 실존 모델 이름으로 POST 하되
      필수값을 다 빼서 값 검사에서 죽게 만든다. 그래도 만에 하나 접수되면 그 자리에서
      취소를 걸어야 한다 — 안 걸면 그 순간 돈이 나간다. */
  /*  ⚠ 여기서 내가 틀렸다. "필수값을 빼면 값 검사에서 죽으니 아무것도 안 만들어진다" 고
      봤는데, 알리바바는 모델 이름만 그 자리에서 보고 파라미터는 큐에 넣은 뒤에 본다.
      운영에서 5건이 전부 200 + task_id 로 접수됐고 나중에 FAILED 로 끝났다.
      취소도 못 걸었다(PENDING 을 이미 지남). 그래서 기본으로 못 돌게 막는다. */
  ok('③-j models=1 만으로는 안 돈다(태스크를 만들기 때문)',
     /u\.searchParams\.get\("models"\) === "1" && u\.searchParams\.get\("confirm"\) === "creates-tasks"/.test(src),
     '"돈 안 드는 확인" 인 줄 알고 켰다가 실제 태스크 5건을 만들었다 — 같은 일이 또 나면 안 된다')
  ok('③-k 왜 막혔는지 응답에 적어 준다', /태스크만듦경고/.test(src))
  ok('③-l 만든 태스크의 최종 상태를 조회할 길이 있다',
     /const taskQ = String\(u\.searchParams\.get\("task"\)/.test(src) &&
     /조회: "태스크 상태\(읽기 전용 · 돈 안 듦\)"/.test(src),
     '만들어 놓고 어떻게 끝났는지 못 보면 과금됐는지도 모른다')
  ok('③-m 상태 조회는 제출을 하지 않는다',
     src.indexOf('const taskQ = String(u.searchParams.get("task")') < src.indexOf('모델 열려 있나: '),
     '조회하러 들어왔는데 제출까지 돌면 확인하려다 또 만든다')
  ok('③-e 접수돼 버리면 그 자리에서 취소를 건다',
     /\/api\/v1\/tasks\/" \+ tid \+ "\/cancel/.test(src),
     '취소는 PENDING 일 때만 먹는다 — 나중에 하면 늦는다')
  ok('③-f 취소하고 끝내지 않고 상태를 다시 확인한다',
     /취소 확인: " \+ id/.test(src) && /task_status/.test(src))
  ok('③-g 취소가 안 먹었으면 그렇게 적는다',
     /취소 안 됐을 수 있다\. 콘솔에서 확인할 것/.test(src),
     '취소를 걸었다는 사실과 취소됐다는 사실은 다르다 — 섞어 적으면 돈 나간 걸 모르고 지나간다')
  ok('③-h 기본은 대표 몇 개만 찌른다',
     /const 대표 = \[최신\(/.test(src) && /대표\.length \? 대표 : found\.slice\(0, 5\)/.test(src),
     '37개를 다 찌르면 그만큼 남의 서버를 두들기고, 2xx 가 섞이면 뒷정리할 것도 그만큼 는다')
  ok('③-i 날짜 붙은 고정판은 빼고 고른다',
     /날짜없음 = \(x\) => !\/\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(x\)/.test(src),
     '같은 모델의 다른 이름이라 새로 알려 주는 게 없는데 호출만 두 배가 된다')
  ok('③-c 제출에는 비동기 헤더가 붙는다',
     /"X-DashScope-Async": "enable"/.test(src),
     '빠지면 "동기 호출 미지원" 으로 100% 거절돼서 경로가 맞는지조차 못 가린다')
  ok('③-d 조회에는 그 헤더를 붙이지 않는다',
     /const GET_H = \{ "Authorization": "Bearer " \+ k\.alibaba \};/.test(src),
     '조회에 붙이면 거절된다 — 붙여야 하는 곳과 붙이면 안 되는 곳이 반대다')
}

// ④ ㉠ 목록을 자르지 않는다
{
  ok('④ 목록 응답은 파싱해서 쓴다(600자 자르기에 안 걸린다)',
     /_json: keep \? parsed : undefined/.test(src),
     '자르면 모델 목록이 200 으로 와도 정작 이름이 안 보인다 — 실제로 그렇게 한 바퀴 헛돌았다')
  ok('④-b 파싱본은 응답에 안 싣는다', /results\.forEach\(\(r\) => \{ delete r\._json; \}\)/.test(src))
}

// ⑤ ㉡ 목록을 끝까지 넘긴다
{
  ok('⑤ 페이지를 넘긴다', /page_no=" \+ page \+ "&page_size=100/.test(src),
     '실측 응답이 total 234 · page_size 20 이었다. 첫 장만 보면 234개 중 20개를 보고 결론 내는 셈이다')
  ok('⑤-b 총개수는 네이티브로 받은 개수와만 비교한다',
     /nativeCount \+= got\.length/.test(src) && /nativeCount >= total/.test(src) &&
     !/ids\.length >= total/.test(src),
     '모아 둔 전체(ids)와 비교하면 앞의 호환 목록 때문에 첫 장에서 멈춘다 — wan 이 통째로 빠졌다')
  ok('⑤-c 안 끝나는 경우를 대비한 상한이 있다', /page <= 20; page\+\+/.test(src))
  /*  분류에서 새면 목록에는 있는데 화면에는 안 보인다 — "이게 전부" 라고 볼 뻔했다.
      실제로 r2v(참조 이미지 → 영상) 4개가 영상에도 이미지에도 안 걸려서 빠졌다. */
  ok('⑤-e r2v 를 영상으로 센다',
     /t2v\|i2v\|r2v\|s2v\|kf2v\|video\|animate\|vace/.test(src),
     'r2v 는 이름에 t2v/i2v 가 없다 — 빼면 wan 37개 중 4개가 조용히 사라진다')
  ok('⑤-f 어느 쪽에도 안 걸린 것을 따로 보여 준다', /"wan_미분류": wan\.filter/.test(src),
     '새는 것을 눈에 보이게 해 두지 않으면 다음에도 같은 식으로 빠진다')
  ok('⑤-g 영상 편집 모델이 이미지로도 세어지지 않는다',
     /이미지인가 = \(x\) => .*&& !\/video\/i\.test\(x\)/.test(src),
     'wan2.7-videoedit 은 edit 이 들어가지만 영상이다')
  ok('⑤-d 배열·이름 필드 이름이 달라도 뽑는다',
     /"model_name", "model", "name", "id", "model_id"/.test(src),
     '문서마다 models\\/data\\/list, model_name\\/name\\/id 로 다르게 적혀 있다 — 하나로 못 박으면 조용히 빈 목록이 된다')
}

// ⑥ 판정이 리전 분리를 안다
{
  ok('⑥ 호스트별로 따로 판정한다', /const 호스트별 = HOSTS\.map/.test(src),
     '베이징·싱가포르는 키가 아예 분리돼 있다 — "한쪽 200, 한쪽 401" 이 정상이다')
  ok('⑥-b 양쪽 다 막혀야 키가 죽은 것으로 본다',
     /전부401 = 닿음\.length > 0 && 닿음\.every\(\(r\) => r\.status === 401\)/.test(src))
  ok('⑥-c 403·429·연체는 키 문제로 세지 않는다',
     /accessdenied\|commoditynotpurchased/.test(src) && /arrearage/.test(src) &&
     /throttling\|insufficientquota/.test(src))
}

// ⑦ 단가는 아직 넣지 않는다
{
  ok('⑦ 알리바바 단가를 요금표에 넣지 않았다',
     !/MODEL_COST[\s\S]{0,4000}?wan2\./.test(src),
     '조사에서 같은 720p 1초 단가가 출처마다 1.7배까지 갈렸다 — 추측으로 넣으면 그 차이만큼 우리가 손해를 본다')
}

console.log(fails.length === 0
  ? '\n알리바바 진단 — 실패 0 (관리자만 · 키 비노출 · 생성 안 함 · 목록 끝까지)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
