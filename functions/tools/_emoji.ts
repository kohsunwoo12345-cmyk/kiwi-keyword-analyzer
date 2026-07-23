// iframe 으로 서빙되는 도구 HTML 페이지에 전역 이모지 → 고퀄 SVG 파서를 주입한다.
//  · 도구 페이지는 별도 HTML 문서(iframe)라 상위 Next 앱의 EmojiParser 가 닿지 않는다.
//  · 정적 public/tools/*.html 과 동일하게 /emoji-parser.js 를 로드해 raw 이모지를
//    /emoji/{codepoint}.svg 로 바꿔 사이트 전체와 동일한 고퀄 SVG 로 표시한다.
const EMOJI_PARSER_TAG = '<script src="/emoji-parser.js" defer></script>'

export function withEmojiParser(html: string): string {
  if (html.includes('/emoji-parser.js')) return html
  const i = html.lastIndexOf('</body>')
  if (i === -1) return html + EMOJI_PARSER_TAG
  return html.slice(0, i) + EMOJI_PARSER_TAG + html.slice(i)
}
