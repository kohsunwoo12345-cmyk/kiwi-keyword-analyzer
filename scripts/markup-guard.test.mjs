/* 배수(원가율)를 못 읽었을 때 조용히 ×1 로 저장하지 않는다.
 *
 * ×1 은 "원가 그대로 팔아라" 라는 뜻이다. 그런데 저장 함수가 이랬다:
 *     const clampMk = (v) => Math.max(1, Math.min(100, Math.round((Number(v) || 1) * 100) / 100))
 * `Number(v) || 1` — 빈칸·공백·문자·0 이 전부 1 이 된다.
 * 화면의 [전체 모델 ×N 적용] 은 입력칸이 비어 있어도 눌렸고, 라벨에는 "×0 적용" 이라고
 * 적혀 있었다. 즉 관리자는 0 을 보고 눌렀는데 저장된 값은 1 이었다 —
 * 모든 모델·모든 회원이 한 번에 마진 0 이 될 수 있었고, 화면만 봐서는 알 수도 없었다.
 * 실제로 그렇게 찍힌 기록을 봤다: Seedance 2.0 5초 · 차감 ₩2,471 · 원가 ₩2,472 · 마진 ₩-1 (×1).
 *
 * 못 읽으면 저장하지 않고 400 으로 되돌려 보낸다.
 * "모르겠으니 원가로" 는 어느 쪽으로도 안전하지 않다 — 기본 배수로 되돌리는 것은
 * 별도 동작(reset_*)이 이미 따로 있다.
 *
 * 실제로 돌려서 확인한 것(workerd + 로컬 D1):
 *   markup 0 / "" / null / "abc" → 400, 저장 안 됨
 *   markup 3 → 200, credit_markup=3        markup 1(의도적 원가 판매) → 200, =1
 */
import fs from 'node:fs'
const ROOT = new URL('../', import.meta.url).pathname
/* 주석은 실행되지 않는다. 걷어내지 않으면 "예전 코드는 Number(v) || 1 이었다" 는
   설명까지 위반으로 잡혀서, 고칠 것이 없는데도 계속 빨간불이 뜬다.
   (같은 실수를 업스케일 문구 검사에서 한 번 했다 — 그때는 반대로 너무 좁아서 놓쳤다.) */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
const api = strip(fs.readFileSync(ROOT + 'functions/api/admin/model-pricing.ts', 'utf8'))
const ui = strip(fs.readFileSync(ROOT + 'components/admin/ModelPricing.tsx', 'utf8'))
const users = strip(fs.readFileSync(ROOT + 'functions/api/admin/users.ts', 'utf8'))

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

// ① 못 읽은 값을 1 로 채우는 코드가 없다
{
  ok('① `Number(v) || 1` 로 배수를 채우지 않는다', !/Number\(v\)\s*\|\|\s*1/.test(api),
     '빈칸·문자·0 이 전부 원가 판매(×1)가 된다')
  ok('①-b 옛 clampMk 가 남아 있지 않다', !/clampMk/.test(api))
  ok('①-c 못 읽으면 null 을 돌려준다', /const readMk = \(v: any\): number \| null =>/.test(api))
  ok('①-d 0 도 거절한다', /n < 1 \|\| n > 100/.test(api))
}

// ② 배수를 쓰는 모든 자리가 그 판정을 지난다
{
  //  set_* 계열은 전부 검사해야 한다. 하나만 빠져도 그 길로 ×1 이 들어온다.
  const setters = ['set_global', 'set_global_all', 'set_user', 'set_user_all', 'set_user_overall', 'set_promptgen']
  for (const a of setters) {
    const i = api.indexOf(`action === '${a}'`)
    const seg = i < 0 ? '' : api.slice(i, i + 700)
    ok(`② ${a} 이 값을 검사한다`, /readMk\(b\.markup\)/.test(seg) && /return json\(MK_ERR, 400\)/.test(seg),
       i < 0 ? '동작 자체가 없다' : seg.slice(0, 120))
  }
  //  검사와 저장 사이가 벌어지면 의미가 없다 — 검사 실패 시 반드시 그 자리에서 끊어야 한다
  const bodies = api.split("if (action === '").slice(1)
  const leaky = bodies.filter((s) => /readMk\(/.test(s) && !/if \(mk\w* == null\) return json\(MK_ERR, 400\)/.test(s))
  ok('②-b 검사한 뒤 반드시 끊는다', leaky.length === 0, leaky.map((s) => s.slice(0, 40)).join(' | '))
}

// ③ 화면에서도 빈칸으로 누를 수 없다
{
  ok('③ 일괄 적용 버튼이 빈칸이면 안 눌린다', /disabled=\{busy \|\| !okMk\(bulk\)\}/.test(ui))
  ok('③-b 모델별 저장 버튼도 마찬가지다', /disabled=\{busy \|\| !okMk\(val\)\}/.test(ui))
  ok('③-c 빈칸이면 라벨이 "×0 적용" 이라고 하지 않는다', !/전체 모델 ×\{r2\(Number\(bulk\) \|\| 0\)\} 적용/.test(ui),
     '0 을 보여 주고 1 을 저장하면 화면만 봐서는 알 수 없다')
  ok('③-d 무엇을 해야 하는지 말한다', /배수를 입력하세요/.test(ui))
}

/* ④ 회원 관리 쪽과 뜻이 어긋나지 않는다
   users.ts 는 raw <= 0 을 "기본값으로 초기화(null)" 로 본다. 같은 0 이 한쪽에서는
   기본값이고 다른 쪽에서는 원가 판매였다 — 이 어긋남이 사고의 뿌리였다. */
{
  ok('④ 회원 관리는 0 이하를 기본값으로 되돌린다', /if \(!Number\.isFinite\(raw\) \|\| raw <= 0\) markup = null/.test(users))
  ok('④-b 이제 두 곳 모두 0 을 "원가 판매" 로 읽지 않는다',
     !/Number\(v\)\s*\|\|\s*1/.test(api) && !/Number\([^)]*\)\s*\|\|\s*1/.test(users))
}

console.log(fails.length === 0
  ? '\n배수 가드 — 실패 0 (빈 값은 저장 거부 · 모든 설정 경로 · 화면에서도 차단)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
