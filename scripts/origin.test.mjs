/* 남의 도메인이 박혀 있지 않은지 검증 —  node scripts/origin.test.mjs
 *
 * 이 제품은 다른 서비스(SUPERPLACE, wearesuperplace.com)에서 이식됐다.
 * 그때 따라온 주소가 코드에 그대로 남아 있으면 조용히 이런 일이 벌어진다.
 *   · 퍼널 빌더의 "페이지 열기" 링크와 슬러그 안내가 남의 도메인을 가리킨다
 *   · /api/landing-pages 가 회원 페이지 주소를 남의 도메인으로 돌려준다 —
 *     회원이 그걸 복사해 문자·알림톡으로 뿌리면 고객이 엉뚱한 데로 간다
 *   · 인스타 연동 안내(리다이렉트 URI·웹훅 주소)를 적힌 대로 넣으면 연동이 안 된다
 *   · 공유 리포트 바닥에 남의 브랜드가 찍힌다
 * 화면은 멀쩡하고 오류도 없다. 링크를 눌러 본 사람만 안다.
 *
 * 그래서 "지금 접속한 주소" 를 쓰게 하고(location.origin · new URL(request.url).origin),
 * 회원에게 보이는 자리에 다른 도메인이 다시 박히면 여기서 걸린다.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname

let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '\n         ' + detail : ''}`) }
}

const FOREIGN = /wearesuperplace\.com|superplace\.kr/i

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!/node_modules|\.next|^out$/.test(e.name)) walk(p, out) }
    else if (/\.(ts|tsx|js|html)$/.test(e.name)) out.push(p)
  }
  return out
}

const files = ['functions', 'public', 'app', 'components']
  .map((d) => path.join(ROOT, d)).filter((d) => fs.existsSync(d)).flatMap((d) => walk(d))

console.log('\n① 회원·고객에게 나가는 자리에 남의 도메인이 없다')
{
  const hits = []
  for (const p of files) {
    const rel = path.relative(ROOT, p)
    fs.readFileSync(p, 'utf8').split('\n').forEach((ln, i) => {
      if (!FOREIGN.test(ln)) return
      //  주석에 남은 설명은 화면에 나가지 않는다
      const t = ln.trim()
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
      hits.push(`${rel}:${i + 1}\n           ${t.slice(0, 110)}`)
    })
  }
  ok(hits.length === 0, `실행되는 코드·화면에 남의 도메인이 없다 (파일 ${files.length}개)`, hits.join('\n         '))
}

console.log('\n② 주소는 지금 접속한 곳을 쓴다')
{
  const cases = [
    ['functions/api/landing-pages.ts', /new URL\(request\.url\)\.origin/, '랜딩페이지 목록이 돌려주는 주소'],
    ['public/tools/funnel-builder.html', /location\.origin \+ '\/f\/' \+ slug/, '퍼널 빌더의 페이지 열기 링크'],
    ['public/tools/funnel-builder.html', /_hint\.textContent = location\.host/, '슬러그 입력 옆 주소 안내'],
    ['functions/tools/_instagram_page.ts', /ig-redirect-uri.*\n?.*location\.origin|location\.origin \+ '\/api\/instagram\/oauth\/callback'/, '인스타 리다이렉트 URI 안내'],
    ['functions/tools/_sms_page.ts', /location\.origin \+ '\/landing\/'/, '문자에 넣는 랜딩 주소'],
    ['functions/tools/_alimtalk_page.ts', /location\.origin \+ '\/landing\/'/, '알림톡에 넣는 랜딩 주소'],
  ]
  for (const [file, re, what] of cases) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8')
    ok(re.test(src), `${what} — 지금 도메인을 쓴다`, file)
  }
}

console.log('\n③ 검사가 헛돌지 않는다')
{
  ok(files.length > 100, `파일을 충분히 훑었다 (${files.length}개)`, String(files.length))
  ok(FOREIGN.test('https://wearesuperplace.com/x'), '찾는 규칙 자체는 살아 있다')
}

console.log(failed === 0 ? '\n도메인 — 실패 0\n' : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
