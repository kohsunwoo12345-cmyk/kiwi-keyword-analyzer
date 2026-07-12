// Ported from SUPERPLACE: GET/PUT /api/funnel/landing-pages/:id (Hono → CF Pages Functions)
import { resolveDB } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 랜딩페이지 상세 조회
export const onRequestGet: PagesFunction = async ({ env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const pageId = params.id as string

    const page: any = await db.prepare(`
      SELECT flp.*
      FROM funnel_landing_pages flp
      INNER JOIN funnel_groups fg ON flp.group_id = fg.id
      WHERE flp.id = ?
    `).bind(pageId).first()

    if (!page) {
      return j({ success: false, error: '페이지를 찾을 수 없습니다.' }, 404)
    }

    return j({ success: true, ...page })
  } catch (error) {
    console.error('Error fetching landing page:', error)
    return j({ success: false, error: '페이지 조회 실패' }, 500)
  }
}

// 랜딩페이지 수정
export const onRequestPut: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const pageId = params.id as string
    const body = (await request.json()) as any
    const { title, description, status, og_title, og_description, thumbnail_url, form_fields_json, page_header_scripts } = body

    // html_content_b64 (base64 인코딩, CF WAF 우회) 또는 html_content (레거시) 지원
    let html_content: string | undefined = undefined
    if (body.html_content_b64 !== undefined) {
      try {
        // base64 → UTF-8 디코딩
        html_content = new TextDecoder().decode(Uint8Array.from(atob(body.html_content_b64), function (c) { return c.charCodeAt(0) }))
      } catch (_e) {
        return j({ success: false, error: 'html_content_b64 디코딩 실패' }, 400)
      }
    } else if (body.html_content !== undefined) {
      html_content = body.html_content
    }

    // css_content (에디터에서 전달)
    const css_content: string | undefined = body.css_content !== undefined ? body.css_content : undefined

    // 페이지 존재 확인
    const page: any = await db.prepare(`
      SELECT flp.id
      FROM funnel_landing_pages flp
      WHERE flp.id = ?
    `).bind(pageId).first()

    if (!page) {
      return j({ success: false, error: '페이지를 찾을 수 없습니다.' }, 404)
    }

    // 존재하는 컬럼만 업데이트
    const updates: string[] = []
    const paramsArr: any[] = []

    if (title !== undefined) { updates.push('title = ?'); paramsArr.push(title || '') }
    if (html_content !== undefined) { updates.push('html_content = ?'); paramsArr.push(html_content || '') }
    if (css_content !== undefined) { updates.push('css_content = ?'); paramsArr.push(css_content || '') }
    if (description !== undefined) { updates.push('description = ?'); paramsArr.push(description || '') }
    if (status !== undefined) { updates.push('status = ?'); paramsArr.push(status || 'active') }
    if (form_fields_json !== undefined) { updates.push('form_fields_json = ?'); paramsArr.push(form_fields_json || '') }

    updates.push('updated_at = ?')
    paramsArr.push(new Date().toISOString())

    if (updates.length === 1) {
      // updated_at만 있는 경우 (아무것도 바꿀 게 없음)
      return j({ success: true, message: '변경 사항 없음' })
    }

    paramsArr.push(pageId)
    await db.prepare(
      `UPDATE funnel_landing_pages SET ${updates.join(', ')} WHERE id = ?`,
    ).bind(...paramsArr).run()

    // og 메타 필드 별도 업데이트 (컬럼 없으면 무시)
    if (og_title !== undefined || og_description !== undefined || thumbnail_url !== undefined) {
      try {
        const ogUpdates: string[] = []
        const ogParams: any[] = []
        if (og_title !== undefined) { ogUpdates.push('og_title = ?'); ogParams.push(og_title || '') }
        if (og_description !== undefined) { ogUpdates.push('og_description = ?'); ogParams.push(og_description || '') }
        if (thumbnail_url !== undefined) { ogUpdates.push('thumbnail_url = ?'); ogParams.push(thumbnail_url || '') }
        if (ogUpdates.length > 0) {
          ogParams.push(pageId)
          await db.prepare(
            `UPDATE funnel_landing_pages SET ${ogUpdates.join(', ')} WHERE id = ?`,
          ).bind(...ogParams).run()
        }
      } catch (ogErr: any) {
        // og 컬럼 없으면 무시 (마이그레이션 후 자동 작동)
        console.warn('og fields update skipped:', ogErr.message)
      }
    }

    // page_header_scripts 별도 업데이트 (컬럼 없으면 무시)
    let resolvedHeaderScripts: string | undefined = undefined
    if (body.page_header_scripts_b64 !== undefined) {
      try {
        resolvedHeaderScripts = new TextDecoder().decode(Uint8Array.from(atob(body.page_header_scripts_b64), function (c) { return c.charCodeAt(0) }))
      } catch (_e) { resolvedHeaderScripts = '' }
    } else if (page_header_scripts !== undefined) {
      resolvedHeaderScripts = page_header_scripts
    }
    if (resolvedHeaderScripts !== undefined) {
      try {
        await db.prepare(
          `UPDATE funnel_landing_pages SET page_header_scripts = ? WHERE id = ?`,
        ).bind(resolvedHeaderScripts || '', pageId).run()
      } catch (scriptErr: any) {
        console.warn('page_header_scripts update skipped:', scriptErr.message)
      }
    }

    return j({ success: true, message: '랜딩페이지가 수정되었습니다.' })
  } catch (error: any) {
    console.error('Error updating landing page:', error)
    return j({ success: false, error: '페이지 수정 실패' }, 500)
  }
}
