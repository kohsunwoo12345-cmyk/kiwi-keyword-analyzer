// iframe 으로 서빙되는 도구 HTML 페이지의 이모지 처리 유틸.
//  · 도구 페이지는 별도 HTML 문서(iframe)라 상위 Next 앱의 EmojiParser 가 닿지 않는다.
const EMOJI_PARSER_TAG = '<script src="/emoji-parser.js" defer></script>'

// 이모지 → 고퀄 SVG 파서 주입 (사이트 전체와 동일한 SVG 로 표시)
export function withEmojiParser(html: string): string {
  if (html.includes('/emoji-parser.js')) return html
  const i = html.lastIndexOf('</body>')
  if (i === -1) return html + EMOJI_PARSER_TAG
  return html.slice(0, i) + EMOJI_PARSER_TAG + html.slice(i)
}

// 이모지를 완전히 제거한다(치환이 아니라 삭제).
//  · 그림 이모지(Extended_Pictographic)에 변형선택자(U+FE0F)·ZWJ(U+200D)·피부톤 modifier 를
//    하나의 클러스터로 묶어 제거하고, 뒤따르는 공백 1칸도 함께 정리("🔥 제목" → "제목").
//  · 화살표(←→) 같은 일반 텍스트 기호는 Extended_Pictographic 이 아니라 보존된다.
export function stripEmojis(html: string): string {
  try {
    return html.replace(
      /(?:\p{Extended_Pictographic}(?:️|‍|[\u{1F3FB}-\u{1F3FF}])*)+[ \t]?/gu,
      '',
    )
  } catch {
    return html
  }
}
