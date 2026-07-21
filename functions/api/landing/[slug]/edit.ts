// SUPERPLACE 이식: PUT /api/landing/:slug/edit — 랜딩페이지 수정
import { Env, resolveDB, ensureSchema, getSessionUser } from '../../_utils'
import { ensureLandingSchema, extractFormFields } from '../_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const slug = String((params as any).slug || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => null)
  if (!b) return j({ success: false, error: 'JSON 파싱 오류(내용이 너무 크거나 형식 오류).' }, 200)
  const page: any = await db.prepare('SELECT * FROM landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
  if (!page) return j({ success: false, error: '랜딩페이지를 찾을 수 없습니다.' }, 200)

  const hasNewHtml = b.html_content != null && b.html_content !== ''
  const html = hasNewHtml ? String(b.html_content) : (page.html_content || '')
  const newTitle = (b.title != null && String(b.title).trim() !== '') ? String(b.title).trim() : (page.title || '')
  const newSubtitle = b.subtitle !== undefined ? (String(b.subtitle || '').trim() || null) : (page.subtitle ?? null)
  const formFields = b.form_fields || extractFormFields(html) || page.form_fields || null
  const newStatus = b.status === 'published' ? 'published' : (page.status || 'draft')

  await db.prepare(
    `UPDATE landing_pages SET title=?, subtitle=?, html_content=?, content=?, header_pixel=?, body_pixel=?, conversion_pixel=?,
       og_title=?, og_description=?, thumbnail_url=?, form_fields=?, header_script=?, status=?, updated_at=CURRENT_TIMESTAMP
     WHERE slug=?`,
  ).bind(
    newTitle, newSubtitle, html, html,
    b.header_pixel || null, b.body_pixel || null, b.conversion_pixel || null,
    b.og_title || null, b.og_description || null,
    b.thumbnail_url !== undefined ? (b.thumbnail_url || null) : (page.thumbnail_url || null),
    formFields,
    b.header_script !== undefined ? (b.header_script || null) : (page.header_script || null),
    newStatus, slug,
  ).run()
  return j({ success: true, message: '수정되었습니다.', slug, url: `/landing/${slug}` })
}
