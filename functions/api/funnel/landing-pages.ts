// Ported from SUPERPLACE: POST /api/funnel/landing-pages (Hono → CF Pages Functions)
import { resolveDB } from '../_utils'
import { ensureFunnelSchema } from './_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 퍼널 랜딩페이지 목록 (?groupId= 로 그룹 필터) — 각 페이지의 신청자 수 포함
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: true, pages: [] })
    await ensureFunnelSchema(db)
    const url = new URL(request.url)
    const groupId = url.searchParams.get('groupId')
    let rows: any[] = []
    if (groupId) {
      const r = await db.prepare(
        `SELECT id, group_id, title, slug, description, status, created_at, updated_at FROM funnel_landing_pages WHERE group_id = ? ORDER BY created_at DESC`,
      ).bind(groupId).all()
      rows = (r.results as any[]) || []
    } else {
      const r = await db.prepare(
        `SELECT id, group_id, title, slug, description, status, created_at, updated_at FROM funnel_landing_pages ORDER BY created_at DESC LIMIT 500`,
      ).all()
      rows = (r.results as any[]) || []
    }
    for (const p of rows) {
      try {
        const c: any = await db.prepare(`SELECT COUNT(*) as count FROM funnel_applicants WHERE landing_page_id = ?`).bind(p.id).first()
        p.applicant_count = c?.count || 0
        p.url = `/f/${p.slug}`
      } catch { p.applicant_count = 0 }
    }
    return j({ success: true, pages: rows })
  } catch {
    return j({ success: true, pages: [] })
  }
}

// 퍼널 랜딩페이지 생성
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const body = (await request.json()) as any
    const { groupId, title, description, formFields } = body

    if (!groupId || !title) {
      return j({ success: false, error: '필수 정보를 입력해주세요.' }, 400)
    }

    // 고유한 slug 생성 (짧고 기억하기 쉬운 형태)
    const slug = `f-${Math.random().toString(36).substr(2, 8)}`

    // 폼 필드 기본값
    const defaultFields = formFields || [
      { name: 'name', label: '이름', type: 'text', required: true },
      { name: 'phone', label: '연락처', type: 'tel', required: true },
      { name: 'email', label: '이메일', type: 'email', required: false },
    ]

    // 에디터에서 전달한 HTML/CSS 콘텐츠 (없으면 기본 마크업)
    const htmlContent = typeof body.html_content === 'string' && body.html_content
      ? body.html_content
      : `<section class="py-12 px-4"><h1>${title}</h1><p>${description || ''}</p></section>`
    const cssContent = typeof body.css_content === 'string' ? body.css_content : ''

    const now = new Date().toISOString()
    const result = await db.prepare(`
      INSERT INTO funnel_landing_pages (
        group_id, title, slug, description, form_fields_json, html_content, css_content, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(groupId, title, slug, description || '', JSON.stringify(defaultFields), htmlContent, cssContent, now, now).run()

    const landingPageId = result.meta.last_row_id
    const publicUrl = `/f/${slug}`

    return j({
      success: true,
      message: '랜딩페이지가 생성되었습니다.',
      id: landingPageId,
      slug,
      url: publicUrl,
      htmlContent,
    })
  } catch (error) {
    console.error('Error creating landing page:', error)
    return j({ success: false, error: '랜딩페이지 생성 실패' }, 500)
  }
}
