// 공개 페이지(랜딩/퍼널)에 OG 메타·헤더 스크립트를 끼워 넣는 공용 헬퍼.
// (_ 프리픽스 = 라우팅 제외, import 전용)
//
// 왜 필요한가:
//  빌더의 "공유 설정" 에서 넣은 OG 제목/설명/썸네일과 헤더 스크립트가 DB 에 저장되고
//  편집기에도 다시 보이는데, 정작 공개 페이지에는 하나도 들어가지 않았다.
//  카톡·문자로 공유해도 미리보기가 안 뜨고 추적 픽셀은 한 번도 실행되지 않는다.

export const attrEsc = (s: any) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** <head> 안(닫는 태그 직전)에 끼워 넣는다. head 가 없으면 body/html 앞에 만들어 준다. */
export function injectHead(html: string, extra: string): string {
  if (!extra) return html
  const closeHead = html.search(/<\/head\s*>/i)
  if (closeHead >= 0) return html.slice(0, closeHead) + extra + html.slice(closeHead)
  const bodyOpen = html.search(/<body[\s>]/i)
  if (bodyOpen >= 0) return html.slice(0, bodyOpen) + `<head>${extra}</head>` + html.slice(bodyOpen)
  const htmlOpen = html.match(/<html[^>]*>/i)
  if (htmlOpen) {
    const at = html.indexOf(htmlOpen[0]) + htmlOpen[0].length
    return html.slice(0, at) + `<head>${extra}</head>` + html.slice(at)
  }
  return `<head>${extra}</head>` + html
}

/** 여는 <body ...> 태그 바로 뒤에 끼워 넣는다. */
export function injectBodyTop(html: string, extra: string): string {
  if (!extra) return html
  const m = html.match(/<body[^>]*>/i)
  if (!m) return html + extra
  const at = html.indexOf(m[0]) + m[0].length
  return html.slice(0, at) + extra + html.slice(at)
}

export interface ShareMeta {
  title?: any
  ogTitle?: any
  ogDescription?: any
  imageUrl?: any
  canonicalUrl?: string
  headerScript?: any
}

/** 이미 문서 안에 같은 og 태그가 있으면 건드리지 않는다(회원이 직접 넣은 쪽을 존중). */
export function buildShareHead(html: string, m: ShareMeta): string {
  const head: string[] = []
  const has = (re: RegExp) => re.test(html)
  const ogTitle = m.ogTitle || m.title || ''
  if (ogTitle && !has(/property\s*=\s*["']og:title["']/i)) {
    head.push(`<meta property="og:title" content="${attrEsc(ogTitle)}">`)
    head.push(`<meta name="twitter:title" content="${attrEsc(ogTitle)}">`)
  }
  if (m.ogDescription && !has(/property\s*=\s*["']og:description["']/i)) {
    head.push(`<meta property="og:description" content="${attrEsc(m.ogDescription)}">`)
    head.push(`<meta name="twitter:description" content="${attrEsc(m.ogDescription)}">`)
  }
  if (m.imageUrl && !has(/property\s*=\s*["']og:image["']/i)) {
    head.push(`<meta property="og:image" content="${attrEsc(m.imageUrl)}">`)
    head.push(`<meta name="twitter:image" content="${attrEsc(m.imageUrl)}">`)
    head.push(`<meta name="twitter:card" content="summary_large_image">`)
  }
  if (m.canonicalUrl && !has(/property\s*=\s*["']og:url["']/i))
    head.push(`<meta property="og:url" content="${attrEsc(m.canonicalUrl)}">`)
  if (!has(/property\s*=\s*["']og:type["']/i)) head.push(`<meta property="og:type" content="website">`)
  // 회원이 직접 붙여 넣은 태그는 그대로 둔다(스크립트/메타를 넣으라고 만든 칸이다).
  if (m.headerScript) head.push(String(m.headerScript))
  return head.join('')
}
