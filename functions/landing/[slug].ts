// SUPERPLACE 이식: 공개 랜딩페이지 렌더 (/landing/:slug) — landing_pages.html_content 그대로 서빙 + 조회 기록
import { Env, resolveDB, ensureSchema, geoFrom, clientIp } from '../api/_utils'
import { ensureLandingSchema } from '../api/landing/_lschema'

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const slug = String((params as any).slug || '')
  const db = resolveDB(env)
  if (!db) return new Response('DB 미연결', { status: 500 })
  await ensureSchema(db); await ensureLandingSchema(db)
  const page: any = await db.prepare(`SELECT id, html_content, status FROM landing_pages WHERE slug = ?`).bind(slug).first().catch(() => null)
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
  return new Response(String(page.html_content), { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
