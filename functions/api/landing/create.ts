// SUPERPLACE 이식: POST /api/landing/create — 커스텀 HTML 랜딩페이지 생성 (구독한도 게이팅 제거, 관리자/회원 공용)
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema, randSlug, extractFormFields } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 200)

  const b: any = await request.json().catch(() => ({}))
  const title = String(b.title || '제목 없음').trim()
  const subtitle = b.subtitle != null ? String(b.subtitle) : null
  const template_type = String(b.template_type || 'custom')
  const input_data = b.input_data || {}
  const og_title = b.og_title || null
  const og_description = b.og_description || null
  const thumbnail_url = b.thumbnail_url || null
  const folder_id = b.folder_id || null
  const form_id = b.form_id || null

  // 커스텀 빌더: input_data.html 을 그대로 저장
  let html = String((input_data && input_data.html) || b.html_content || '')
  const slug = randSlug()
  if (html.includes('SLUG_HERE')) html = html.replace(/SLUG_HERE/g, slug)

  const origin = new URL(request.url).origin
  const landingUrl = `${origin}/landing/${slug}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(landingUrl)}`
  const formFields = b.form_fields || extractFormFields(html)

  try {
    const res = await db.prepare(
      `INSERT INTO landing_pages (user_id, academy_id, slug, title, subtitle, template_type, content_json, content, html_content, qr_code_url, thumbnail_url, og_title, og_description, folder_id, form_id, form_fields, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
    ).bind(
      me.id, me.academy_id || me.id, slug, title, subtitle, template_type,
      JSON.stringify({ ...(input_data || {}), html: '__inline__' }), html, html,
      qrCodeUrl, thumbnail_url, og_title, og_description, folder_id, form_id, formFields,
    ).run()
    return j({ success: true, message: '랜딩페이지가 생성되었습니다.', slug, url: `/landing/${slug}`, qrCodeUrl, id: res.meta.last_row_id })
  } catch (e: any) {
    return j({ success: false, error: '랜딩페이지 생성 실패: ' + String(e?.message || e).slice(0, 160) }, 200)
  }
}
