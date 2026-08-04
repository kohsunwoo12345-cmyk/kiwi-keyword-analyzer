/* 엔드포인트 인증 검사 —  node scripts/endpoint-auth.test.mjs
 *
 * 새 API 를 붙일 때 인증 한 줄을 빠뜨리는 것은 조용하다. 기능은 잘 돌고,
 * 테스트도 통과하고, 화면도 정상이다. 그 문이 열려 있다는 건 아무도 모른다.
 * 실제로 /api/videos/file 이 그랬다 — 키만 알면 신분증·사업자등록증이 그대로 나갔다.
 *
 * 그래서 뒤집어서 못 박는다.
 *   · 공개여도 되는 엔드포인트는 아래 PUBLIC 에 이유와 함께 적는다.
 *   · 나머지는 전부 자기 파일 안에서 "누구냐" 를 물어야 한다.
 *
 * 왜 "자기 파일 안" 인가:
 *   헬퍼를 타고 들어가며 찾으면 검사가 흐릿해진다(부르지도 않는 모듈을 import 만 해도
 *   통과한다). 인증 판단은 그 엔드포인트를 읽는 사람 눈에 보여야 한다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '\n         ' + detail : ''}`) }
}

/** 이 이름들 중 하나를 부르면 "누구냐" 를 물은 것이다. */
const AUTH_NAMES = ['getSessionUser', 'requireAdminUser', 'isAdminUser', 'getBrtUser', 'ytGuard',
  'getUserByApiKey', 'getUserByAccessToken', 'getUserByMcpToken', 'resolveLease', 'verifyLease',
  'getSession', 'aligoProfileAuth', 'isIgAdmin', 'igOwnerByBusinessId']
const AUTH = new RegExp('\\b(' + AUTH_NAMES.join('|') + ')\\s*\\(|\\bCRON_TOKEN\\b|X-Cron-Token', 'i')

/* 공개여도 되는 자리 — 이유가 없으면 여기 적지 마라. */
const PUBLIC = new Map([
  //  로그인 전에 쓰는 것들
  ['login.ts', '로그인 자체'],
  ['logout.ts', '쿠키만 지운다'],
  ['signup.ts', '가입'],
  ['account/forgot-password.ts', '비밀번호 재설정 메일 요청'],
  ['auth/google/start.ts', '구글 로그인 시작'],
  ['auth/google/callback.ts', '구글 로그인 콜백(state 로 검증)'],
  ['oauth/register.ts', 'OAuth 클라이언트 등록'],
  ['oauth/token.ts', '토큰 발급(자격증명으로 스스로 인증한다)'],
  //  방문자가 쓰는 것들
  ['funnel/apply.ts', '방문자 신청 폼'],
  ['landing/form-submit.ts', '랜딩 폼 제출'],
  ['leads/collect.ts', '리드 수집 폼'],
  ['contact.ts', '문의 폼'],
  ['public-notices.ts', '공개 공지 — 방문자 id 로만 구분한다'],
  ['geo.ts', '접속 국가'],
  ['health.ts', '헬스체크'],
  ['plan-config.ts', '요금제 안내(공개 정보)'],
  //  주소에 든 토큰·키가 곧 자격이다
  ['adcal/[token].ts', '공유 링크 토큰'],
  ['tcal/[token].ts', '공유 링크 토큰'],
  ['landing/traffic-report/[token].ts', '공유 링크 토큰'],
  ['media/[[key]].ts', 'R2 키 — 접두사로 공개 범위를 제한한다(media-access 검사)'],
  ['videos/file/[[key]].ts', 'R2 키 — videos/ 접두사만 연다(media-access 검사)'],
  //  다른 처리기로 그대로 넘긴다 — 인증은 그쪽에서 한다
  ['marketing-automation.ts', '_marketing 안에서 관리자 검사(공개 액션 4개는 의도된 것)'],
  ['v1/controlnet.ts', 'v1/generate 로 넘긴다 — 인증·과금은 그쪽'],
  ['v1/models.ts', '빌릴 수 있는 모델 목록(카탈로그) — 파일은 리스 토큰이 있어야 받는다'],
  ['studio/models.ts', '모델 목록(공개 정보)'],
  //  외부에서 우리를 부르는 자리 (서명·고정 대상)
  ['instagram/oauth/callback.ts', '인스타그램 OAuth 콜백'],
  //  바깥 공개 데이터만 읽는다 (우리 DB·과금과 무관)
  ['img-proxy.ts', '허용 도메인 이미지 CORS 우회'],
  ['audio-proxy.ts', '허용 도메인 오디오 CORS 우회'],
  ['blog-analysis/posts.ts', '네이버 공개 RSS'],
  ['blog-analysis/analyze-real.ts', '네이버 공개 RSS'],
  ['blog-analysis/analyze-post.ts', '네이버 공개 글'],
  ['youtube/status.ts', '키 설정 여부만 알려 준다'],
  //  스텁 (설정 필요만 답한다)
  ['instagram/apify-session.ts', '미구현 스텁'],
  ['instagram/dm-send-apify.ts', '미구현 스텁'],
])

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

const files = walk(path.join(ROOT, 'functions/api')).filter((p) => !path.basename(p).startsWith('_'))
const endpoints = []
for (const p of files) {
  const src = strip(fs.readFileSync(p, 'utf8'))
  const methods = [...src.matchAll(/export const onRequest(Get|Post|Put|Patch|Delete)?\b/g)].map((m) => m[1] || 'ANY')
  if (!methods.length) continue
  endpoints.push({ rel: path.relative(path.join(ROOT, 'functions/api'), p), methods, authed: AUTH.test(src) })
}

console.log('\n① 공개 목록에 없는 엔드포인트는 모두 "누구냐" 를 묻는다')
{
  const open = endpoints.filter((e) => !e.authed && !PUBLIC.has(e.rel))
  ok(open.length === 0, `인증 없이 열린 엔드포인트가 없다 (전체 ${endpoints.length}개)`,
     open.map((e) => `${e.rel}  [${e.methods.join(',')}]`).join('\n         '))
}

console.log('\n② 공개 목록이 낡지 않았다')
{
  /* 파일이 옮겨지거나 사라져도 예외만 남으면, 나중에 같은 이름으로 새 파일이 생겼을 때
     인증 없이 통과한다 — 그러니 없는 항목은 바로 지운다. */
  const have = new Set(endpoints.map((e) => e.rel))
  const stale = [...PUBLIC.keys()].filter((k) => !have.has(k))
  ok(stale.length === 0, `공개 목록에 없는 파일이 남아 있지 않다 (${PUBLIC.size}개)`, stale.join(', '))
  ok(PUBLIC.size <= 34, `공개 목록이 늘지 않았다 (${PUBLIC.size}개)`, String(PUBLIC.size))
}

console.log('\n③ 관리자 화면 뒤 API 는 하나도 빠짐없이 관리자 검사를 한다')
{
  const admin = endpoints.filter((e) => e.rel.startsWith('admin/'))
  ok(admin.length > 40, `관리자 API 를 충분히 찾았다 (${admin.length}개)`, String(admin.length))
  const bare = admin.filter((e) => !e.authed)
  ok(bare.length === 0, '관리자 검사를 안 하는 관리자 API 가 없다',
     bare.map((e) => e.rel).join(', '))
  //  admin/ 은 공개 예외를 둘 자리가 아니다
  ok([...PUBLIC.keys()].every((k) => !k.startsWith('admin/')), '관리자 API 는 공개 예외에 없다')

  /* "로그인했나" 와 "관리자인가" 는 다르다. 로그인까지만 보면 아무 회원이나
     관리자 화면 뒤 데이터를 그대로 받아 간다 — 조용하고, 화면은 멀쩡하다. */
  const ADMIN_RE = /requireAdminUser|isAdminUser|ADMIN_EMAIL|role\s*===\s*'(?:admin|superadmin)'/
  /* 회원 대시보드가 그대로 쓰는 경로만 예외다(경로가 admin/ 아래일 뿐). */
  const MEMBER_FACING = new Map([
    ['admin/landing-templates.ts', '대시보드 랜딩 빌더가 쓴다 — 잠그면 일반 회원이 막힌다(로그인까지 요구)'],
  ])
  const loginOnly = admin
    .filter((e) => !MEMBER_FACING.has(e.rel))
    .filter((e) => !ADMIN_RE.test(strip(fs.readFileSync(path.join(ROOT, 'functions/api', e.rel), 'utf8'))))
  ok(loginOnly.length === 0, '로그인만 보고 통과시키는 관리자 API 가 없다', loginOnly.map((e) => e.rel).join(', '))
  ok([...MEMBER_FACING.keys()].every((k) => admin.some((e) => e.rel === k)),
     `회원용 예외가 낡지 않았다 (${MEMBER_FACING.size}개)`, [...MEMBER_FACING.keys()].join(', '))
}

console.log('\n④ 검사가 헛돌지 않는다')
{
  //  이름 목록이 어긋나면 "전부 공개" 로 보이거나 "전부 인증됨" 으로 보인다
  ok(endpoints.length > 200, `엔드포인트를 충분히 찾았다 (${endpoints.length}개)`, String(endpoints.length))
  const authed = endpoints.filter((e) => e.authed).length
  ok(authed > 180, `인증을 부르는 엔드포인트가 대부분이다 (${authed}/${endpoints.length})`, String(authed))
}

console.log(failed === 0 ? '\n엔드포인트 인증 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
