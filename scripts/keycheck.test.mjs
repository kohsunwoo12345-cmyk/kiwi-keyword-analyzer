/* 제공사 API 키 확인 검사 (LTX · Recraft · Bria · Stability) —  node scripts/keycheck.test.mjs
 *
 * 이 진단은 "아직 연동 안 된 제공사의 키로 남의 서버를 두들기는" 코드다. 알리바바에서
 * 똑같은 것을 만들다 실제로 돈을 냈다 — 확인만 한다고 보낸 요청이 태스크 5건을 만들었고
 * (파라미터 검사가 큐 뒤에서 돌았다) 취소도 못 걸었다. 그래서 규칙을 하나로 줄였다:
 *
 *   ⚠ **GET 만 보낸다.** 만들 수 있는 요청이 없으면 만들어질 것도 없다.
 *
 * 그 규칙과, 판정이 실제로 맞는지를 여기서 붙잡아 둔다. 판정은 글로만 검사하면 못 잡는다 —
 * 그래서 가짜 제공사 서버를 세우고 진짜로 돌려 본다.
 *
 * 이 검사가 막는 것:
 *   ㉠ 나중에 누가 "확인 하나만 더" 하며 POST 를 섞는 것 (= 돈)
 *   ㉡ 200 하나 보고 "키가 된다" 고 단정하는 것. 인증을 안 보는 주소도 200 을 준다 —
 *      그래서 일부러 틀린 키로 한 번 더 읽어 **갈리는지**를 본다. 안 갈리면 "확인 못 함" 이다.
 *   ㉢ 확인도 안 된 모델을 노드 피커에 올리는 것 (등록부에 꺼진 채로 심겨야 한다)
 *   ㉣ 키 값이 응답에 실려 나가는 것 (지문 앞6·뒤4 만)
 *   ㉤ 제공사가 늘 때 판정을 한 벌 더 적는 것 (루마·클링 단가표가 그렇게 어긋났다)
 *   ㉥ 인증 방식을 Bearer 로 단정하는 것. Bria 는 `api_token` 헤더다 — Bearer 로 물었으면
 *      멀쩡한 키가 401 로 돌아오고 우리는 그걸 믿고 키를 재발급하러 갔을 것이다.
 *      확인 도구가 틀린 답을 확신에 차서 말하는 게 제일 나쁘다.
 *   ㉦ "키 없음" 과 "환경변수 이름이 다름" 을 뭉뚱그리는 것. Stability 는 받은 이름이
 *      `Stabilitya-API-KEY` 였다 — 오타처럼 보이지만 진짜 그 이름일 수 있다.
 *      화면이 **실제로 잡힌 이름**을 보여 주지 않으면 멀쩡한 키를 두고 헤매게 된다.
 */
import fs from 'node:fs'
import { build } from 'esbuild'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

const gen = fs.readFileSync(ROOT + 'functions/api/generate.js', 'utf8')
const kc = fs.readFileSync(ROOT + 'functions/api/studio/_keycheck.ts', 'utf8')
const reg = fs.readFileSync(ROOT + 'functions/api/studio/_registry.ts', 'utf8')
const ltx = fs.readFileSync(ROOT + 'functions/api/studio/_ltx.ts', 'utf8')
const rec = fs.readFileSync(ROOT + 'functions/api/studio/_recraft.ts', 'utf8')
const bria = fs.readFileSync(ROOT + 'functions/api/studio/_bria.ts', 'utf8')
const stab = fs.readFileSync(ROOT + 'functions/api/studio/_stability.ts', 'utf8')
const price = fs.readFileSync(ROOT + 'functions/api/studio/_pricing.ts', 'utf8')

console.log('\n① 판정은 한 군데에만 있다')
{
  ok(/export async function runKeyCheck/.test(kc), '공용 판정 함수가 있다')
  ok(/runKeyCheck\(prov, key, fetchT, ovHost, foundName\)/.test(gen), 'generate.js 는 그걸 부르기만 한다')
  //  제공사가 늘 때 표 한 줄만 추가하면 되는 구조인지 — 판정이 generate.js 로 새면 두 벌이 된다
  ok(!/대조키|대조거절/.test(gen), '판정 로직이 generate.js 로 새지 않았다',
     '한 벌 더 적히는 순간 한쪽만 고쳐지는 날이 온다')
  ok(/LTX_KEYCHECK/.test(ltx) && /RECRAFT_KEYCHECK/.test(rec) && /BRIA_KEYCHECK/.test(bria)
     && /STABILITY_KEYCHECK/.test(stab), '제공사 정의는 각자 표 파일에 있다')
}

console.log('\n② 아무나 못 부른다')
{
  const iGate = gen.indexOf('진단 엔드포인트는 관리자 전용입니다.')
  const iKc = gen.indexOf('const KEYCHECKS =')
  ok(iGate > 0 && iKc > 0 && iGate < iKc, '관리자 게이트가 키 확인보다 먼저다',
     '게이트 위에 두면 비로그인이 남의 계정 키로 제공사를 두들길 수 있다')
  ok(gen.split('const KEYCHECKS =').length - 1 === 1, '키 확인 블록이 하나뿐이다')
}

console.log('\n③ 생성이 일어날 수 없다 — 보내는 자리가 GET 하나뿐이다')
{
  ok(!/method:\s*['"]POST['"]/.test(kc), 'POST 가 한 줄도 없다',
     '확인하려다 만들어지면 그 순간 돈이 나간다 — 알리바바에서 실제로 그랬다')
  ok(!/\bbody:/.test(kc), '본문(body)을 붙이는 자리가 없다',
     'GET 이어도 본문을 실으면 제출로 해석하는 서버가 있다')
  ok(/method: 'GET'/.test(kc), '보내는 함수에 GET 이 박혀 있다')
  ok((kc.match(/await fetchT\(/g) || []).length === 1, '제공사로 나가는 자리가 하나뿐이다',
     '자리가 늘면 그중 하나가 POST 로 바뀌어도 눈에 안 띈다')
  /* Recraft 는 생성 경로를 아예 안 건드린다 — GET 이라도 생성 주소를 두들기면
     "확인만 했는데" 라는 말이 나오게 된다. 그럴 필요가 없으니 하지 않는다. */
  const probes = rec.slice(rec.indexOf('RECRAFT_KEYCHECK'))
  ok(!/images\/generations/.test(probes.slice(0, 1500)), 'Recraft 확인은 생성 경로를 건드리지 않는다',
     '명세에 있는 유일한 GET(/users/me)이 계정·잔액을 주므로 그럴 이유가 없다')
}

console.log('\n③-b 인증 방식을 Bearer 로 단정하지 않는다')
{
  ok(/auth\?: \(key: string\) => Record<string, string>/.test(kc), '제공사가 인증 헤더를 정할 수 있다',
     'Bearer 를 박아 두면 api_token 을 쓰는 제공사에서 멀쩡한 키가 401 로 나온다')
  ok(/const auth = p\.auth \|\| bearerAuth/.test(kc), '안 적으면 Bearer 로 떨어진다(기존 제공사 유지)')
  ok(/headers: \{ \.\.\.auth\(key\), Accept/.test(kc), '실제로 그 헤더로 보낸다',
     '정의만 받아 두고 안 쓰면 아무 의미가 없다')
  ok(/export const briaAuth = \(key: string\) => \(\{ api_token: key \}\)/.test(bria),
     'Bria 는 api_token 헤더다', '공식 ComfyUI 노드(nodes/common.py)가 쓰는 그대로')
  /* ⚠ 처음엔 "_bria.ts 어디에도 Bearer 라는 글자가 없다" 로 검사했다가 헛돌았다.
     그 파일에는 화면에 보여 줄 설명("인증은 Bearer 가 아니라 api_token 입니다")이 있고,
     그건 고쳐야 할 것이 아니라 있어야 할 문장이다. 글자를 세면 이런 걸 잡는다.
     실제로 막아야 하는 것은 **Authorization 헤더를 만드는 것**이라 그것만 본다.
     (진짜 보장은 아래 실행 검사가 한다 — 가짜 서버가 api_token 에서만 키를 읽는다.) */
  ok(!/Authorization/.test(bria), 'Bria 는 Authorization 헤더를 만들지 않는다')
  //  헤더를 만드는 곳이 두 군데면 한쪽만 고쳐지는 날이 온다
  const bal = fs.readFileSync(ROOT + 'functions/api/admin/api-balance.ts', 'utf8')
  ok(/briaAuth\(key\)/.test(bal) && !/api_token:\s*key/.test(bal),
     '잔액 확인도 같은 헤더 함수를 쓴다', 'api-balance 에서 또 적으면 어긋난다')
}

console.log('\n③-c "키 없음" 과 "이름이 다름" 을 구분한다')
{
  ok(/찾은이름\?: string \| null/.test(kc), '잡힌 환경변수 이름을 결과에 담는다')
  ok(/찾은이름: foundEnvName \|\| null/.test(kc), '실제로 채운다')
  ok(/const foundName = prov\.envNames\.find/.test(gen), 'generate.js 가 어느 이름이 잡혔는지 찾아 넘긴다')
  const panel = fs.readFileSync(ROOT + 'components/admin/KeyCheckPanel.tsx', 'utf8')
  ok(/res\.찾은이름/.test(panel), '화면이 그 이름을 보여 준다',
     '안 보여 주면 오타인지 미설정인지 관리자가 알 수 없다')
  //  키가 없을 때는 우리가 무슨 이름을 찾는지 전부 알려 줘야 콘솔과 맞대 볼 수 있다
  ok(/이름이 다를 수 있습니다/.test(kc), '키가 없을 때 "이름이 다를 수 있다" 고 짚어 준다')
  ok(/p\.envNames\.join/.test(kc), '찾는 이름을 전부 나열한다')
  /* ⚠ 받은 이름을 오타처럼 보인다고 빼면, 진짜 그 이름일 때 "키 없음" 이라는 틀린 답이 나온다. */
  ok(/'Stabilitya-API-KEY'/.test(stab), '받은 이름(Stabilitya-API-KEY)을 후보에 그대로 넣었다',
     '오타로 단정하고 빼면 진짜 그 이름일 때 멀쩡한 키를 못 찾는다')
  ok(/'STABILITY_API_KEY'/.test(stab), '표준형도 함께 본다 — 나중에 이름을 고쳐도 잡힌다')
}

console.log('\n④ 키 값은 어떤 경우에도 응답에 안 실린다')
{
  ok(/키지문: String\(key\)\.slice\(0, 6\) \+ '…' \+ String\(key\)\.slice\(-4\)/.test(kc),
     '지문만 내보낸다(앞 6자·뒤 4자)')
  ok(!/키: key|apiKey: key|token: key/.test(kc), '키를 통째로 담는 자리가 없다')
}

console.log('\n⑤ 확인 안 된 모델은 노드에 안 올라간다')
{
  for (const [fn, endMark, label] of [
    ['export async function seedLtx', 'export async function seedRecraft', 'LTX'],
    ['export async function seedRecraft', 'export async function seedBria', 'Recraft'],
    ['export async function seedBria', 'export async function seedStability', 'Bria'],
    ['export async function seedStability', 'const parseOpts', 'Stability'],
  ]) {
    const seed = reg.slice(reg.indexOf(fn), reg.indexOf(endMark))
    ok(/VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,0,NULL,\?,\?\)/.test(seed), `${label}: enabled 0 · verified_at NULL 로 심는다`,
       '켜서 심으면 "고를 수는 있는데 누르면 실패" 인 모델이 회원에게 나간다')
    ok(/INSERT OR IGNORE/.test(seed), `${label}: 관리자가 켜 둔 것을 배포할 때마다 덮지 않는다`)
  }
  ok(/LTX 공식 문서|403/.test(ltx), 'LTX: 모델 ID 를 확인 못 했다는 사실이 표에 적혀 있다')
  ok(/OpenAPI 명세/.test(rec), 'Recraft: 모델 ID 를 어디서 가져왔는지 적혀 있다',
     '출처를 안 적으면 다음 사람은 그게 추측인지 확인인지 알 수 없다')
  ok(/ComfyUI-BRIA-API/.test(bria), 'Bria: 경로를 어디서 가져왔는지 적혀 있다')
  ok(/api-evangelist\/stability-ai|OpenAPI 명세/.test(stab), 'Stability: 경로를 어디서 가져왔는지 적혀 있다')
  /* ⚠ Stability 는 단가가 특히 위험하다 — 2026-08 에 장당 크레딧이 크게 바뀌었다는 보고가 있다.
     그 경고가 코드에서 사라지면 다음 사람이 표를 믿고 그냥 켠다. */
  ok(/2026.?년? ?8월|2026-08/.test(stab) && /2026-08|2026년 8월/.test(reg),
     'Stability: 단가가 막 바뀌었을 수 있다는 경고가 표와 등록부에 남아 있다')

  /* 켜는 순간 정말 노드에 뜨는가 — 등록부는 분류(cat)를 그대로 스튜디오에 넘기고,
     스튜디오는 '영상'/'이미지' 로 시작하는 분류만 각 피커에 싣는다. 분류를 '벡터' 처럼
     적어 두면 등록은 되는데 피커에는 안 뜬다(아무 오류도 안 난다 — 그냥 안 보인다). */
  const studio = fs.readFileSync(ROOT + 'public/studio-nvc-prv-8b3k2/index.html', 'utf8')
  const ltxCats = [...ltx.matchAll(/cat: '([^']+)'/g)].map((m) => m[1])
  ok(ltxCats.length > 0 && ltxCats.every((c) => c.startsWith('영상')), 'LTX 분류가 영상 피커에 걸린다', JSON.stringify(ltxCats))
  const recCats = [...rec.matchAll(/CAT_(?:RASTER|VECTOR) = '([^']+)'/g)].map((m) => m[1])
  ok(recCats.length === 2 && recCats.every((c) => c.startsWith('이미지')), 'Recraft 분류가 이미지 피커에 걸린다', JSON.stringify(recCats))
  const briaCats = [...bria.matchAll(/CAT_(?:GEN|EDIT) = '([^']+)'/g)].map((m) => m[1])
  ok(briaCats.length === 2 && briaCats.every((c) => c.startsWith('이미지')), 'Bria 분류가 이미지 피커에 걸린다', JSON.stringify(briaCats))
  const stabCats = [...stab.matchAll(/const CAT = '([^']+)'/g)].map((m) => m[1])
  ok(stabCats.length === 1 && stabCats[0].startsWith('이미지'), 'Stability 분류가 이미지 피커에 걸린다', JSON.stringify(stabCats))
  ok(/MODELS\.filter\(function\(m\)\{ return \/\^영상\/\.test\(m\[0\]\); \}\)/.test(studio),
     '스튜디오가 그 규칙으로 영상 목록을 만든다')
  ok(/MODELS\.filter\(function\(m\)\{ return \/\^이미지\/\.test\(m\[0\]\); \}\)/.test(studio),
     '스튜디오가 그 규칙으로 이미지 목록을 만든다')
  ok(/MODEL_PROVIDER\[name\] = String\(r\.provider\|\|''\);/.test(studio), '등록부의 제공사가 노드로 그대로 넘어간다')
}

console.log('\n⑥ 켜지더라도 조용히 실패하지 않는다')
{
  /*  Recraft 는 이제 진짜로 연결됐다(래스터). 그래서 "아직 연결되지 않았습니다" 를
      기대하면 안 된다 — 그 기대는 연결 전 사실을 적어 둔 것이고 지금은 낡았다.
      연결된 것과 아직인 것을 나눠서, 각각 맞는 것을 본다. */
  const WIRED = ['recraft', 'stability']
  const NOT_WIRED = ['ltx', 'bria']
  for (const p of [...WIRED, ...NOT_WIRED]) {
    ok(new RegExp(`if \\(provider === "${p}"\\)`).test(gen), `${p}: 생성 경로에 자리가 있다`)
  }
  for (const p of NOT_WIRED) {
    const br = gen.slice(gen.indexOf(`if (provider === "${p}")`), gen.indexOf(`if (provider === "${p}")`) + 600)
    ok(/아직 연결되지 않았습니다/.test(br), `${p}: 왜 안 되는지와 어디로 가야 하는지를 말한다`,
       '"지원하지 않는 provider" 로 떨어지면 관리자는 오타를 의심하며 엉뚱한 데를 뒤진다')
  }
  for (const p of WIRED) {
    const i = gen.indexOf(`if (provider === "${p}")`)
    const br = gen.slice(i, i + 2200)
    ok(!/아직 연결되지 않았습니다/.test(br), `${p}: 연결됐으므로 안내문이 아니라 실제 호출을 한다`)
    ok(/fetchT\(/.test(br), `${p}: 제공사를 실제로 부른다`)
    //  키가 없는데 부르면 401 을 받으러 가는 셈이다. 부르기 전에 막아야 한다.
    ok(/연동이 설정되지 않았습니다/.test(br), `${p}: 키가 없으면 부르기 전에 막고 이유를 말한다`)
  }
  //  "연결됨" 표시는 표 한 곳에서만 나와야 한다 — 화면과 코드가 어긋나면 관리자가 속는다
  ok(/export const RECRAFT_WIRED = true/.test(rec), 'Recraft 표가 연결됨으로 되어 있다')
  ok(/export const LTX_WIRED = false/.test(ltx) || !/LTX_WIRED = true/.test(ltx),
     'LTX 표는 아직 연결 전이다')
}

console.log('\n⑦ 단가는 표 한 곳에서만 온다')
{
  ok(/for \(const r of LTX_MODELS\)/.test(price) && /for \(const r of RECRAFT_MODELS\)/.test(price)
     && /for \(const r of BRIA_MODELS\)/.test(price) && /for \(const r of STABILITY_MODELS\)/.test(price),
     '네 표를 그대로 얹는다', '단가를 두 군데 적으면 반드시 어긋난다 — 루마·클링이 그랬다')
  ok(/ltx: 'LTX \(Lightricks\)'/.test(price) && /recraft: 'Recraft/.test(price) && /bria: 'Bria/.test(price)
     && /stability: 'Stability AI'/.test(price), '제공사 이름표가 넷 다 있다')
  /* Bria 는 편집이 생성보다 싸다(배경 제거 $0.018 < 생성 $0.03). 한 값으로 뭉뚱그리면
     편집을 비싸게 받게 된다 — 회원에게 과청구다. */
  const bRows = [...bria.matchAll(/[GE]\('([^']+)',\s*'([^']+)',\s*([\d.]+)\)/g)]
  ok(bRows.length >= 8, 'Bria 모델 줄을 읽었다', String(bRows.length))
  const rmbg = bRows.find(([, , id]) => /remove_background/.test(id))
  const gen = bRows.find(([, , id]) => id === '/v2/image/generate')
  ok(rmbg && gen && Number(rmbg[3]) < Number(gen[3]), '배경 제거가 생성보다 싸게 잡혀 있다',
     JSON.stringify([rmbg && rmbg[3], gen && gen[3]]))
  //  경로가 곧 식별자다. 공식 노드에 없는 경로를 지어내면 켜는 순간 전부 실패한다.
  ok(bRows.every(([, , id]) => id.startsWith('/v2/image/')), '경로가 전부 v2 이미지 경로다',
     JSON.stringify(bRows.filter(([, , id]) => !id.startsWith('/v2/image/')).map((r) => r[2])))

  /* Recraft 는 **같은 모델 ID 가 래스터/벡터로 갈리고 단가가 두 배쯤 다르다.**
     한 줄로 합치면 벡터를 래스터 값으로 청구하게 되고 그 차액은 전부 우리 손해다. */
  const rows = [...rec.matchAll(/R\('([^']+)',\s*'([^']+)',\s*([\d.]+),\s*(true|false)\)/g)]
  ok(rows.length >= 10, 'Recraft 모델 줄을 읽었다', String(rows.length))
  const byId = {}
  for (const [, name, id, usd, vec] of rows) (byId[id] ||= {})[vec] = Number(usd)
  const paired = Object.entries(byId).filter(([, v]) => v.true != null && v.false != null)
  ok(paired.length >= 5, '같은 모델 ID 가 래스터·벡터 두 줄로 나뉘어 있다', JSON.stringify(paired.map(([k]) => k)))
  ok(paired.every(([, v]) => v.true > v.false), '벡터가 래스터보다 비싸게 잡혀 있다',
     JSON.stringify(paired.filter(([, v]) => !(v.true > v.false))))
  //  OpenAPI enum 에 있는 이름만 쓴다 — 지어낸 ID 가 섞이면 켜는 순간 전부 실패한다
  const ENUM = ['recraftv4_1', 'recraftv4_1_pro', 'recraftv4_1_utility', 'recraftv4_1_utility_pro',
                'recraftv4', 'recraftv4_pro', 'recraftv3', 'recraftv2']
  const bad = Object.keys(byId).filter((id) => !ENUM.includes(id))
  ok(bad.length === 0, '모델 ID 가 전부 명세의 enum 값이다', JSON.stringify(bad))
}

/* ══════════════════════════════════════════════════════════════════════════
   ⑧~ 실제로 돌려 본다 — 가짜 제공사 서버를 세우고 판정이 맞는지 본다.
   글 검사만으로는 "200 하나 보고 된다고 우기는" 판정을 못 잡는다.
   ══════════════════════════════════════════════════════════════════════════ */
const out = await build({
  entryPoints: [ROOT + 'functions/api/generate.js'], bundle: true, write: false,
  format: 'cjs', platform: 'neutral', target: 'es2022', external: ['node:*'],
})

const REAL = {
  ltx: 'ltx_live_ABCDEF_MIDDLE_SECRET_7890',
  recraft: 'rc_live_ZYXWVU_MIDDLE_SECRET_4321',
  bria: 'bria_live_QWERTY_MIDDLE_SECRET_5678',
  stability: 'sk-stab_ASDFGH_MIDDLE_SECRET_9012',
}
/* ⚠ Stability 만 일부러 **받은 그대로의(오타로 보이는) 이름**으로 넣어 검사한다.
   표준형만 검사하면 "진짜 그 이름이었을 때" 를 한 번도 안 보게 된다. */
const ENVKEY = {
  ltx: 'LTX_API_KEY', recraft: 'Recraft_API_KEY', bria: 'BRIA_API_KEY',
  stability: 'Stabilitya-API-KEY',
}
const HOSTRE = {
  ltx: /\/\/api\.ltx\./,
  recraft: /\/\/external\.api\.recraft\.ai/,
  bria: /\/\/engine\.prod\.bria-api\.com/,
  stability: /\/\/api\.stability\.ai/,
}

let seen = []          // 요청 전부 — 환율 조회 등 이 진단과 무관한 것도 섞인다
/* 이 진단이 제공사로 보낸 것만 센다. 같은 요청 안에서 환율(open.er-api 등)을 따로 읽는
   자리가 있어서, 전부 세면 "안 닿는 호스트를 계속 두들긴다" 는 엉뚱한 실패가 난다. */
const calls = (who) => seen.filter((x) => HOSTRE[who].test(x.url))

/** kind: 어떤 제공사 서버를 흉내 내는가 */
function makeFetch(kind, who) {
  return async (url, init) => {
    const u = String(url)
    const H = (init && init.headers) || {}
    /* ⚠ 제공사가 실제로 보는 헤더에서만 키를 읽는다.
       Bria 를 Bearer 로 읽어 주면, 우리가 Bearer 로 보내도 검사가 통과해 버린다 —
       그러면 이 검사는 "헤더가 맞는지" 를 하나도 안 보는 셈이 된다. */
    const key = who === 'bria'
      ? String(H['api_token'] || '')
      : String(H['Authorization'] || '').replace(/^Bearer\s+/, '')
    seen.push({
      url: u, method: (init && init.method) || 'GET', hasBody: !!(init && init.body), key,
      authHeaders: Object.keys(H).filter((h) => /^(authorization|api_token)$/i.test(h)),
    })
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } })

    if (kind === 'dead') throw new Error('getaddrinfo ENOTFOUND')
    if (kind === 'reject') return J({ error: { code: 'unauthorized', message: 'invalid api key' } }, 401)
    if (kind === 'nocheck') return J({ data: [{ id: 'x' }] })   // 틀린 키에도 200 — 인증을 안 본다
    if (kind === 'real') {
      if (key !== REAL[who]) return J({ error: { code: 'unauthorized', message: 'invalid api key' } }, 401)
      //  Recraft: 명세대로 계정·잔액을 준다(credits 는 API unit — 1,000 = $1)
      if (/\/users\/me$/.test(u)) return J({ id: 'u_1', email: 'a@b.c', credits: 12500 })
      if (/\/v1\/models$/.test(u)) return J({ data: [{ id: 'ltx-2.3-pro' }, { id: 'ltx-2.3-fast' }] })
      if (/\/v1\/credits$/.test(u)) return J({ credits: 1234 })
      //  Bria: 맞춤 모델 목록. 없는 모델은 404 — 인증은 통과했다는 뜻이다.
      if (/\/v1\/tailored-gen\/models\/$/.test(u)) return J([{ id: 'my_brand_v1' }, { id: 'my_brand_v2' }])
      if (/\/v1\/tailored-gen\/models\//.test(u)) return J({ message: 'model not found' }, 404)
      //  Stability: 크레딧 잔액. 1 credit = $0.01 이라 1250 크레딧 = $12.50
      if (/\/v1\/user\/balance$/.test(u)) return J({ credits: 1250 })
      if (/\/v1\/user\/account$/.test(u)) return J({ id: 'u_1', email: 'a@b.c' })
      if (/\/v1\/engines\/list$/.test(u)) return J([{ id: 'stable-diffusion-v1-6' }])
      return J({ error: { code: 'not_found', message: 'no such job' } }, 404)
    }
    return J({}, 500)
  }
}

function load(fetchImpl) {
  const sandbox = {
    module: { exports: {} }, exports: {}, require: require_,
    console: { log() {}, warn() {}, error() {} },
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    fetch: fetchImpl, btoa, atob, setTimeout, clearTimeout, structuredClone, AbortController,
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(out.outputFiles[0].text, sandbox, { filename: 'generate.js' })
  return sandbox.module.exports
}

function makeDB(who) {
  const row = who ? { id: 'u1', email: 'a@b.c', role: who, credits: 100 } : null
  const st = (sql) => ({
    bind: () => st(sql),
    async first() { return /FROM sessions/i.test(sql) ? row : null },
    async run() { return { meta: { changes: 1 } } },
    async all() { return { results: [] } },
  })
  //  dump 가 없으면 resolveDB 의 isLikelyD1 이 이 객체를 D1 으로 안 본다 = 관리자 판정이 통째로 실패한다
  return {
    prepare: (s) => st(String(s)),
    async batch(x) { return (x || []).map(() => ({ results: [] })) },
    async dump() { return new ArrayBuffer(0) },
  }
}

async function runDiag(who, kind, role = 'admin', envExtra = null) {
  seen = []
  const mod = load(makeFetch(kind, who))
  const env = envExtra === null ? { [ENVKEY[who]]: REAL[who] } : envExtra
  const res = await mod.onRequest({
    request: new Request(`https://bygency.com/api/generate?diag=${who}`, {
      headers: { host: 'bygency.com', cookie: role ? 'bg_session=t' : '' },
    }),
    env: { DB: makeDB(role), ...env },
    params: {}, waitUntil: () => {}, next: async () => new Response(''),
  })
  const txt = await res.text().catch(() => '')
  let body = {}; try { body = JSON.parse(txt) } catch { /* noop */ }
  return { status: res.status, body, txt }
}

for (const who of ['ltx', 'recraft', 'bria', 'stability']) {
  console.log(`\n⑧ [${who}] 관리자만 부를 수 있다`)
  for (const role of [null, 'user']) {
    const r = await runDiag(who, 'real', role)
    ok(r.status === 403, `${role || '비로그인'} 은 403`, String(r.status))
    ok(!r.txt.includes(REAL[who]), '거절 응답에도 키가 안 새어 나간다')
  }

  console.log(`\n⑨ [${who}] 키가 진짜 되는 서버 — "작동한다" 를 확정한다`)
  {
    const r = await runDiag(who, 'real')
    ok(r.body.키작동 === true, '키작동 = true', JSON.stringify(r.body.판정 || r.body).slice(0, 160))
    ok(/확정/.test(String(r.body.판정 || '')), '판정에 확정이라고 적는다', String(r.body.판정))
    ok(calls(who).some((x) => x.key !== REAL[who]), '대조(일부러 틀린 키) 요청을 실제로 보냈다',
       '안 보내면 200 이 인증을 통과한 증거인지 알 수 없다')
    ok(calls(who).every((x) => x.method === 'GET'), '보낸 요청이 전부 GET 이다',
       JSON.stringify(calls(who).filter((x) => x.method !== 'GET').slice(0, 3)))
    ok(calls(who).every((x) => !x.hasBody), '본문을 실은 요청이 하나도 없다')
    ok(!r.txt.includes(REAL[who]), '응답 어디에도 키 전체가 없다')
    ok(typeof r.body.키지문 === 'string' && r.body.키지문.includes('…'), '지문은 준다', String(r.body.키지문))

    if (who === 'ltx') {
      const 모델 = (r.body.모델목록 || []).flatMap((g) => g.모델)
      ok(모델.includes('ltx-2.3-pro'), '제공사가 알려 준 모델 ID 를 그대로 보여 준다', JSON.stringify(모델))
      ok(r.body.잔액 === 1234, '잔액을 읽어 온다', String(r.body.잔액))
    } else if (who === 'recraft') {
      //  12500 API unit = $12.50. 단위를 안 바꾸면 12500 이 돈인지 장수인지 아무도 모른다.
      ok(r.body.잔액 === 12.5 && r.body.잔액단위 === 'USD', '잔액을 달러로 바꿔 준다(1,000 unit = $1)',
         `${r.body.잔액} ${r.body.잔액단위}`)
      ok(calls(who).every((x) => /\/users\/me$/.test(x.url)), '읽은 주소가 /users/me 뿐이다',
         JSON.stringify(calls(who).map((x) => x.url)))
      ok(!calls(who).some((x) => /images\/generations/.test(x.url)), '생성 주소를 한 번도 부르지 않았다')
    } else if (who === 'stability') {
      /* ⚠ 이 갈래의 핵심은 **환경변수 이름**이다. 위 runDiag 는 키를 `Stabilitya-API-KEY`
         (받은 그대로의, 오타로 보이는 이름)로만 넣었다. 그런데도 키작동 = true 가 나왔다면
         후보 목록이 그 이름을 실제로 잡았다는 뜻이다. 그리고 화면이 헤맬 일이 없도록
         **무엇으로 잡혔는지**까지 돌려준다. */
      ok(r.body.찾은이름 === 'Stabilitya-API-KEY', '잡힌 환경변수 이름을 그대로 돌려준다',
         String(r.body.찾은이름))
      //  1250 credit × $0.01 = $12.50. 크레딧 숫자만 띄우면 그게 돈인지 장수인지 모른다.
      ok(r.body.잔액 === 12.5 && r.body.잔액단위 === 'USD', '크레딧을 달러로 바꿔 준다(1 credit = $0.01)',
         `${r.body.잔액} ${r.body.잔액단위}`)
      ok(!calls(who).some((x) => /stable-image\/generate/.test(x.url)), '생성 주소를 한 번도 부르지 않았다',
         JSON.stringify(calls(who).map((x) => x.url)))
    } else {
      /* ⚠ 여기가 이번에 새로 막는 자리다. 가짜 Bria 서버는 api_token 헤더에서만 키를 읽는다 —
         우리가 Bearer 로 보냈다면 키가 빈 값으로 읽혀 401 이 나고 판정이 false 로 떨어진다.
         즉 위의 "키작동 = true" 가 통과했다는 것 자체가 헤더가 맞다는 증거다. 그래도
         무엇을 보냈는지 눈으로 확인할 수 있게 헤더 이름까지 본다. */
      const hs = [...new Set(calls(who).flatMap((x) => x.authHeaders))]
      ok(hs.includes('api_token'), 'api_token 헤더로 보낸다', JSON.stringify(hs))
      ok(!hs.some((h) => /^authorization$/i.test(h)), 'Bearer(Authorization)를 같이 보내지 않는다',
         '두 개를 다 보내면 어느 쪽이 통했는지 알 수 없어 확인이 흐려진다')
      const 모델 = (r.body.모델목록 || []).flatMap((g) => g.모델)
      ok(모델.includes('my_brand_v1'), '이 계정의 맞춤 모델을 그대로 보여 준다', JSON.stringify(모델))
      /*  ⚠ 예전엔 "tailored-gen/models 만 읽는다" 로 못 박아 뒀다. 그런데 Bria 는 그 경로가
          느려서(실측 8초 초과) 판정이 안 섰고, 그래서 루트(/ · /v1/ · /v2/)를 후보로 넣었다.
          루트도 조회(GET)이고 생성 경로가 아니다. 확인해야 할 것은 "특정 경로만" 이 아니라
          **생성 경로를 건드리지 않는가** 이므로, 그걸 그대로 본다. */
      const 생성경로 = /\/(generate|image\/generate|video|edit|erase|expand|background|enhance)\b/i
      ok(calls(who).every((x) => !생성경로.test(x.url)), '읽은 주소에 생성 경로가 없다',
         JSON.stringify(calls(who).map((x) => x.url)))
      ok(!calls(who).some((x) => /\/v2\/image\//.test(x.url)), '생성 주소를 한 번도 부르지 않았다')
    }
  }

  console.log(`\n⑩ [${who}] 인증을 안 보는 서버 — 200 이 와도 "확인 못 함" 이어야 한다`)
  {
    const r = await runDiag(who, 'nocheck')
    ok(r.body.키작동 === null, '키작동 = null (확정 못 함)', JSON.stringify(r.body.판정))
    ok(/인증을 보지 않습니다/.test(String(r.body.판정 || '')), '왜 확정 못 하는지 말한다', String(r.body.판정))
    ok(!/키가 작동합니다/.test(String(r.body.판정 || '')), '200 을 근거로 "된다" 고 하지 않는다',
       '이 한 줄이 이 진단의 존재 이유다 — 여기서 우기면 확인이 아니라 요식행위가 된다')
  }

  console.log(`\n⑪ [${who}] 키를 거절하는 서버 — "안 된다" 를 확정한다`)
  {
    const r = await runDiag(who, 'reject')
    ok(r.body.키작동 === false, '키작동 = false', JSON.stringify(r.body.판정))
    ok(/거절/.test(String(r.body.판정 || '')), '거절이라고 말한다', String(r.body.판정))
  }

  console.log(`\n⑫ [${who}] 닿지 않는 서버 — 키 탓으로 돌리지 않는다`)
  {
    const r = await runDiag(who, 'dead')
    ok(r.body.키작동 === null, '키작동 = null', JSON.stringify(r.body.판정))
    ok(/닿지 않/.test(String(r.body.판정 || '')), '"키가 틀렸다" 가 아니라 "못 물어봤다" 라고 한다',
       '못 물어본 것을 안 된다고 적으면 멀쩡한 키를 버리게 된다')
    /*  ⚠ 이 줄은 옛 동작을 지키고 있었다 — "첫 요청이 안 닿으면 그 호스트는 포기" 였다.
        그게 Bria 에서 틀린 결론을 냈다. 한 경로가 **느린 것** 과 호스트가 **죽은 것** 은 다른데,
        느린 경로 하나 때문에 나머지를 묻지도 않고 "닿지 않음" 으로 끝냈다.
        이제는 다 물어보고, 전부 안 닿을 때만 그렇게 말한다. 그래서 여기서 볼 것은
        "적게 물었는가" 가 아니라 **"물어본 뒤 올바로 판정했는가"** 다(위 두 줄이 그걸 본다).
        다만 무한정 두들기면 안 되므로 상한은 여전히 본다 — 경로 수만큼이다. */
    ok(calls(who).length <= 12, '안 닿아도 경로 수를 넘겨 두들기지 않는다',
       `${calls(who).length}번: ` + calls(who).map((x) => x.url).join(' '))
  }

  console.log(`\n⑬ [${who}] 키가 없으면 없다고만 한다`)
  {
    const r = await runDiag(who, 'real', 'admin', {})
    ok(r.status === 400 && r.body.키있음 === false, '키 없음을 400 으로 알린다', String(r.status))
    ok(String(r.body.판정 || '').includes(ENVKEY[who]), '어느 환경변수를 찾는지 말한다', String(r.body.판정))
    ok(calls(who).length === 0, '키가 없으면 제공사를 두들기지 않는다',
       `${calls(who).length}번: ` + calls(who).map((x) => x.url).join(' '))
  }
}

console.log(failed === 0
  ? '\n제공사 키 확인 — 실패 0 (관리자만 · GET 만 · 키 비노출 · 대조로 확정 · 확인 전 모델은 꺼짐)\n'
  : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
