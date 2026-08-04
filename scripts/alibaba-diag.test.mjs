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
  const body = src.slice(iDiag, iDiag + 12000)
  ok('② 지문만 내보낸다(앞 6자·뒤 4자)',
     /키지문: String\(k\.alibaba\)\.slice\(0, 6\) \+ "…" \+ String\(k\.alibaba\)\.slice\(-4\)/.test(body))
  ok('②-b 키를 통째로 담는 자리가 없다',
     !/키: k\.alibaba|key: k\.alibaba|apiKey: k\.alibaba/.test(body))
}

// ③ 생성이 일어나지 않는 요청만 보낸다
{
  ok('③ 없는 모델 이름으로만 제출한다', /model: "__bygency_probe_nonexistent__"/.test(src))
  ok('③-b 실존 모델 찌르기는 기본으로 꺼져 있다',
     /if \(u\.searchParams\.get\("models"\) === "1"\)/.test(src),
     '실존 모델로 POST 하면 접수될 수 있다 = 돈이 나갈 수 있다. 사람이 켤 때만 돈다')
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
