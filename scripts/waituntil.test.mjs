/* 응답 뒤에 남겨 둔 일이 없는지 검증 —  node scripts/waituntil.test.mjs
 *
 * Workers 는 응답을 돌려준 뒤 남아 있는 약속을 취소할 수 있다.
 * 그래서 await 도 waitUntil 도 없이 던져 놓은 DB 쓰기·외부 호출은
 * "될 때도 있고 안 될 때도 있는" 상태가 된다. 오류도 안 난다.
 *
 * 실제로 공개 랜딩페이지가 그랬다 — 조회수 증가와 유입 경로 기록을 던져만 놔서
 * 방문은 있었는데 조회수와 경로 분석에는 안 잡힐 수 있었다.
 * 이런 건 로그를 봐도 안 보이고, 숫자가 조금 적을 뿐이라 아무도 눈치채지 못한다.
 *
 * 문자열이 아니라 구문 트리로 본다 — 여러 줄에 걸친 호출을 정규식으로 세면
 * 오탐이 수백 건 나서 검사가 무용지물이 된다(실제로 그랬다).
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '\n         ' + detail : ''}`) }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

const D1_CALLS = ['run', 'all', 'first', 'batch']

/** 결과를 누가 받으면(await·return·대입·인자·then …) 요청 수명에 묶인 것으로 본다. */
function consumed(par) {
  if (!par) return false
  return ts.isAwaitExpression(par) || ts.isReturnStatement(par) || ts.isVariableDeclaration(par) ||
    ts.isBinaryExpression(par) || ts.isArrayLiteralExpression(par) || ts.isCallExpression(par) ||
    ts.isPropertyAssignment(par) || ts.isArrowFunction(par) || ts.isConditionalExpression(par) ||
    ts.isParenthesizedExpression(par) || ts.isSpreadElement(par) || ts.isTemplateSpan(par) ||
    ts.isPrefixUnaryExpression(par) || ts.isAsExpression(par) || ts.isNonNullExpression(par) ||
    ts.isPropertyAccessExpression(par) || ts.isElementAccessExpression(par)
}

const floating = []
let seen = 0
for (const p of walk(path.join(ROOT, 'functions'))) {
  const sf = ts.createSourceFile(p, fs.readFileSync(p, 'utf8'), ts.ScriptTarget.ES2022, true)
  const visit = (n) => {
    const isD1 = ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && D1_CALLS.includes(n.expression.name.text)
    const isFetch = ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'fetch'
    if (isD1 || isFetch) {
      seen++
      //  .catch(...) / .then(...) 로 감싼 경우는 그 바깥이 진짜 소비자다
      let cur = n, par = n.parent
      while (par && ts.isPropertyAccessExpression(par) && ['catch', 'then', 'finally'].includes(par.name.text)) {
        cur = par.parent; par = cur.parent
      }
      if (!consumed(par)) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart())
        floating.push(`${path.relative(ROOT, p)}:${line + 1}\n           ${n.getText().replace(/\s+/g, ' ').slice(0, 110)}`)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
}

console.log('\n① 응답 뒤로 던져 놓은 DB 쓰기·외부 호출이 없다')
{
  ok(floating.length === 0, `await 도 waitUntil 도 없는 호출이 없다 (검사 ${seen}곳)`, floating.join('\n         '))
}

console.log('\n② 검사가 헛돌지 않는다')
{
  ok(seen > 800, `DB·fetch 호출을 충분히 찾았다 (${seen}곳)`, String(seen))
  //  공개 랜딩페이지는 응답을 먼저 보내고 기록은 waitUntil 로 끝까지 돌린다
  const src = fs.readFileSync(path.join(ROOT, 'functions/landing/[slug].ts'), 'utf8')
  ok(/waitUntil\(\s*db\.batch\(/.test(src), '랜딩 조회 기록이 waitUntil 로 묶여 있다')
}

console.log(failed === 0 ? '\n응답 뒤 남은 일 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
