// SUPERPLACE 퍼널 빌더 이식: POST /api/funnel/applicants (엑셀 직접등록)
import { resolveDB, getSessionUser } from '../_utils'
import { ensureFunnelSchema } from './_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const body = (await request.json()) as any
    const { group_id, name, phone, extra } = body
    if (!group_id || !phone) return j({ success: false, error: 'group_id와 phone이 필요합니다.' }, 400)

    // group_id에 속한 "엑셀 전용" 대표 랜딩페이지를 1회 생성 후 재사용 (실제 페이지 있으면 우선 사용)
    const slug = 'excel-import-group-' + group_id
    let landingPageId: number
    const realLp: any = await db.prepare(`SELECT id FROM funnel_landing_pages WHERE group_id = ? AND slug != ? LIMIT 1`).bind(group_id, slug).first()
    if (realLp) {
      landingPageId = realLp.id
    } else {
      const importLp: any = await db.prepare(`SELECT id FROM funnel_landing_pages WHERE group_id = ? AND slug = ? LIMIT 1`).bind(group_id, slug).first()
      if (importLp) {
        landingPageId = importLp.id
      } else {
        const ins = await db.prepare(`
          INSERT INTO funnel_landing_pages (group_id, title, slug, status, html_content, created_at)
          VALUES (?, '[엑셀 직접등록]', ?, 'draft', '', ?)
        `).bind(group_id, slug, new Date().toISOString()).run()
        landingPageId = ins.meta.last_row_id as number
      }
    }

    const additionalData = JSON.stringify({ extra: extra || '', source: 'excel_import', group_id })
    const result = await db.prepare(`
      INSERT INTO funnel_applicants (landing_page_id, name, phone, additional_data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(landingPageId, name || '', phone || '', additionalData, new Date().toISOString()).run()
    return j({ success: true, id: result.meta.last_row_id })
  } catch (error: any) {
    return j({ success: false, error: error?.message || '신청자 추가 실패' }, 500)
  }
}
