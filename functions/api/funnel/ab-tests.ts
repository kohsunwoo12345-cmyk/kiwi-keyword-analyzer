// Ported from SUPERPLACE: POST /api/funnel/ab-tests (Hono → CF Pages Functions)
import { resolveDB, getSessionUser } from '../_utils'
import { ownsPage, forbidden } from './_own'
import { ensureFunnelSchema } from './_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// A/B 테스트 생성
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const { landing_page_id, name, traffic_split_a, traffic_split_b, variant_type, variant_html } = (((await request.json().catch(() => null)) as any) || {})

    // 권한 확인 — 예전에는 "페이지가 존재하는가"만 봐서 남의 페이지에도 A/B 테스트를 걸 수 있었다
    if (!(await ownsPage(db, me, landing_page_id))) return forbidden()

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
