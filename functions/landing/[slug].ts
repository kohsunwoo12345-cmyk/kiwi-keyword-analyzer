// SUPERPLACE 이식: 공개 랜딩페이지 렌더 (/landing/:slug) — landing_pages.html_content 그대로 서빙 + 조회 기록
import { Env, resolveDB, ensureSchema, geoFrom, clientIp } from '../api/_utils'
import { ensureLandingSchema } from '../api/landing/_lschema'

const attr = (s: any) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** <head> 안(닫는 태그 직전)에 끼워 넣는다. head 가 없으면 body/html 앞에 만들어 준다. */
function injectHead(html: string, extra: string): string {
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
function injectBodyTop(html: string, extra: string): string {
  if (!extra) return html
  const m = html.match(/<body[^>]*>/i)
  if (!m) return html + extra
  const at = html.indexOf(m[0]) + m[0].length
  return html.slice(0, at) + extra + html.slice(at)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const slug = String((params as any).slug || '')
  const db = resolveDB(env)
  if (!db) return new Response('DB 미연결', { status: 500 })
  await ensureSchema(db); await ensureLandingSchema(db)
  const page: any = await db.prepare(
    `SELECT id, html_content, status, title, og_title, og_description, thumbnail_url, header_script, header_pixel, body_pixel
       FROM landing_pages WHERE slug = ?`,
  ).bind(slug).first().catch(() => null)
  if (!page || !page.html_content) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>페이지 없음</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0a0f1e;color:#e5e7eb"><div style="text-align:center"><h1>페이지를 찾을 수 없습니다</h1><p style="color:#94a3b8">삭제되었거나 잘못된 주소입니다.</p></div></body>`,
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }
  // 조회수 + 유입 경로 로그 (UTM + 지역) — 랜딩 경로 분석용
  db.prepare('UPDATE landing_pages SET view_count = view_count + 1 WHERE slug = ?').bind(slug).run().catch(() => {})
  const url = new URL(request.url)
  const qp = (k: string) => (url.searchParams.get(k) || '').slice(0, 200)
  const geo = geoFrom(request)
  db.prepare(`INSERT INTO landing_page_views (landing_page_id, landing_slug, user_agent, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ip_address, country, region, city)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(page.id, slug, request.headers.get('user-agent') || '', request.headers.get('referer') || '',
      qp('utm_source'), qp('utm_medium'), qp('utm_campaign'), qp('utm_content'), qp('utm_term'),
      clientIp(request) || '', geo.country || '', geo.region || '', geo.city || '').run().catch(() => {})

  // ⚠ 예전에는 html_content 만 그대로 뱉었다. 빌더의 "공유 설정" 탭에서 넣은
  //   OG 제목/설명/썸네일과 헤더 스크립트(픽셀)가 DB 에는 저장되고 편집기에도 다시 보이는데,
  //   정작 공개 페이지에는 하나도 들어가지 않았다 —
  //   카톡·문자로 공유해도 미리보기가 안 뜨고, 붙여 넣은 추적 픽셀은 한 번도 실행되지 않았다.
  let html = String(page.html_content)
  const head: string[] = []
  const has = (re: RegExp) => re.test(html)
  const ogTitle = page.og_title || page.title || ''
  if (ogTitle && !has(/property\s*=\s*["']og:title["']/i)) {
    head.push(`<meta property="og:title" content="${attr(ogTitle)}">`)
    head.push(`<meta name="twitter:title" content="${attr(ogTitle)}">`)
  }
  if (page.og_description && !has(/property\s*=\s*["']og:description["']/i)) {
    head.push(`<meta property="og:description" content="${attr(page.og_description)}">`)
    head.push(`<meta name="twitter:description" content="${attr(page.og_description)}">`)
  }
  if (page.thumbnail_url && !has(/property\s*=\s*["']og:image["']/i)) {
    head.push(`<meta property="og:image" content="${attr(page.thumbnail_url)}">`)
    head.push(`<meta name="twitter:image" content="${attr(page.thumbnail_url)}">`)
    head.push(`<meta name="twitter:card" content="summary_large_image">`)
  }
  if (!has(/property\s*=\s*["']og:url["']/i))
    head.push(`<meta property="og:url" content="${attr(url.origin + '/landing/' + slug)}">`)
  if (!has(/property\s*=\s*["']og:type["']/i)) head.push(`<meta property="og:type" content="website">`)
  // 회원이 직접 붙여 넣은 태그는 그대로 둔다(스크립트/메타를 넣으라고 만든 칸이다).
  if (page.header_pixel) head.push(String(page.header_pixel))
  if (page.header_script) head.push(String(page.header_script))

  html = injectHead(html, head.join(''))
  if (page.body_pixel) html = injectBodyTop(html, String(page.body_pixel))

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
