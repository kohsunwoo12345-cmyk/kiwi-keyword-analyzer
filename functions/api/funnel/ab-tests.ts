// Ported from SUPERPLACE: POST /api/funnel/ab-tests (Hono → CF Pages Functions)
import { resolveDB } from '../_utils'
import { ensureFunnelSchema } from './_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// A/B 테스트 생성
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const { landing_page_id, name, traffic_split_a, traffic_split_b, variant_type, variant_html } = (await request.json()) as any

    // 권한 확인 (페이지 존재 여부)
    const page: any = await db.prepare(`
      SELECT flp.id
      FROM funnel_landing_pages flp
      INNER JOIN funnel_groups fg ON flp.group_id = fg.id
      WHERE flp.id = ?
    `).bind(landing_page_id).first()

    if (!page) {
      return j({ success: false, error: '권한이 없습니다.' }, 403)
    }

    const result = await db.prepare(`
      INSERT INTO funnel_ab_tests (
        landing_page_id, name, traffic_split_a, traffic_split_b,
        variant_type, variant_html, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(landing_page_id, name, traffic_split_a, traffic_split_b, variant_type, variant_html, new Date().toISOString()).run()

    return j({
      success: true,
      message: 'A/B 테스트가 시작되었습니다.',
      id: result.meta.last_row_id,
    })
  } catch (error) {
    console.error('Error creating A/B test:', error)
    return j({ success: false, error: 'A/B 테스트 생성 실패' }, 500)
  }
}
