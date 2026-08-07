/* 이모지 이미지 크기 규칙이 정말 모든 화면에 닿는지 —  node scripts/emoji-size.test.mjs
 *
 * 무슨 일이 있었나:
 *   EmojiParser 는 최상위 레이아웃에 붙어 **모든 페이지**에서 돈다. 글 속 이모지를
 *   <img class="bg-emoji" src="/emoji/{코드}.svg"> 로 바꾼다. 그런데 그 이미지를 1em 으로
 *   묶는 CSS 는 app/styles/legal.css 에 있었고, 그 파일은 /legal/* 에서만 불러온다.
 *   → 약관 화면 밖에서는 크기 규칙이 없는 <img> 가 만들어졌다. 이 SVG 들은 viewBox 만
 *     있고 width/height 가 없어서, 브라우저가 부모 폭만큼 늘려 버린다.
 *
 *   눈에 띈 자리는 푸터였다. "© 2026 (주)넥스트 바이전시." 의 © 는 U+00A9 이고
 *   Extended_Pictographic 이라 이모지로 잡힌다. 그 한 글자가 화면을 가로지르는 거대한
 *   회색 ⓒ 가 되어 모든 페이지 아래를 덮고 있었다. 글자 크기는 처음부터 정상이었다 —
 *   커진 건 글자가 아니라 이미지였다.
 *
 * 왜 아무도 못 봤나: 오류가 안 난다. 콘솔도 깨끗하고, 빌드도 통과하고, /legal/* 에서는
 *   멀쩡해 보인다. 같은 파일(legal.css)에서 pipeFlow 를 옮길 때 이 규칙만 남겨진 것이라
 *   "옮기다 하나 빠뜨린" 종류의 사고다. 그래서 사람 눈이 아니라 여기서 잡는다.
 */
import fs from 'node:fs'

const ROOT = new URL('../', import.meta.url).pathname
let failed = 0
const ok = (c, name, detail = '') => {
  if (c) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name}${detail ? '  — ' + detail : ''}`) }
}

const globals = fs.readFileSync(ROOT + 'app/globals.css', 'utf8')
const layout = fs.readFileSync(ROOT + 'app/layout.tsx', 'utf8')
const parser = fs.readFileSync(ROOT + 'components/EmojiParser.tsx', 'utf8')
const standalone = fs.readFileSync(ROOT + 'public/emoji-parser.js', 'utf8')

console.log('\n① 이모지를 만드는 쪽은 모든 페이지에서 돈다')
{
  ok(/<EmojiParser \/>/.test(layout), 'EmojiParser 가 최상위 레이아웃에 붙어 있다')
  ok(/import '\.\/globals\.css'/.test(layout), 'globals.css 도 최상위에서 불러온다',
     '규칙을 넣어 둘 곳은 여기뿐이다')
  ok(/className = 'bg-emoji'/.test(parser), '만들어지는 이미지에 bg-emoji 가 붙는다')
}

console.log('\n② 크기 규칙이 전역 스타일에 있다')
{
  const rule = globals.slice(globals.indexOf('img.bg-emoji'))
  ok(/img\.bg-emoji\s*\{/.test(globals), 'globals.css 에 img.bg-emoji 규칙이 있다',
     '이게 라우트별 스타일에만 있으면 그 라우트 밖에서는 이미지가 부모 폭만큼 늘어난다')
  ok(/height:\s*1em/.test(rule.slice(0, 300)) && /width:\s*1em/.test(rule.slice(0, 300)),
     '가로·세로가 1em 으로 묶여 있다', rule.slice(0, 200))
}

console.log('\n③ 라우트별 스타일에만 있는 상태로 되돌아가지 않는다')
{
  //  이 파일들은 특정 화면에서만 불러온다. 여기에만 있으면 나머지 화면이 깨진다.
  for (const f of ['app/styles/legal.css', 'app/styles/console.css']) {
    let css = ''
    try { css = fs.readFileSync(ROOT + f, 'utf8') } catch { continue }
    const hasSizing = /img\.bg-emoji\s*\{[^}]*(height|width)\s*:/.test(css)
    ok(!hasSizing || /img\.bg-emoji\s*\{/.test(globals),
       `${f} 만 믿고 있지 않다`,
       '전역에 없고 여기만 있으면 그 화면 밖에서 이모지가 통째로 커진다')
  }
}

console.log('\n④ 스타일시트가 없는 문서(정적 HTML·함수 HTML)는 스스로 크기를 챙긴다')
{
  /* iframe 도구·랜딩·퍼널 같은 별도 HTML 문서에는 globals.css 가 안 붙는다.
     그래서 그쪽 파서는 CSS 에 기대지 않고 인라인으로 크기를 박는다 — 그 보장이 사라지면
     그 페이지들이 조용히 같은 방식으로 깨진다. */
  ok(/style\.cssText\s*=\s*'[^']*height:1em[^']*width:1em/.test(standalone),
     'public/emoji-parser.js 가 인라인으로 1em 을 박는다',
     '이 문서들에는 붙는 스타일시트가 없다 — CSS 에 기대면 안 된다')
}

console.log('\n⑤ 푸터의 © 가 바로 그 이모지다')
{
  const footer = fs.readFileSync(ROOT + 'components/layout/Footer.tsx', 'utf8')
  const line = (footer.match(/^.*All rights reserved.*$/m) || [''])[0]
  ok(/©/.test(line), '푸터 문구에 © 가 들어 있다', line.trim())
  //  © 는 U+00A9 이고 Extended_Pictographic 이다 = 파서가 이미지로 바꾼다. 확인해 둔다.
  ok(/\p{Extended_Pictographic}/u.test('©'), '© 는 파서가 이모지로 보는 문자다',
     '그래서 크기 규칙이 없으면 이 한 글자가 화면을 덮는다')
  ok(/text-xs/.test(footer.slice(Math.max(0, footer.indexOf('All rights reserved') - 400), footer.indexOf('All rights reserved'))),
     '문구 자체는 text-xs(작은 글씨)다', '커졌던 것은 글자가 아니라 이미지였다')
}

console.log(failed === 0
  ? '\n이모지 크기 — 실패 0 (모든 화면에서 1em · 정적 문서는 인라인으로 보장)\n'
  : `\n실패 ${failed}건\n`)
process.exit(failed ? 1 : 0)
