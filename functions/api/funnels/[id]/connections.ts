// SUPERPLACE 퍼널 빌더 이식: POST /api/funnels/:funnelId/connections (그룹 연결선 저장)
import { resolveDB } from '../../_utils'
import { ensureFunnelSchema } from '../../funnel/_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestPost: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const funnelId = params.id as string
    const { connections } = (await request.json()) as any
    const funnel = await db.prepare(`SELECT id FROM funnels WHERE id=?`).bind(funnelId).first()
    if (!funnel) return j({ success: false, error: '퍼널을 찾을 수 없습니다.' }, 404)
    // 기존 연결 삭제 후 재삽입
    await db.prepare(`DELETE FROM funnel_group_connections WHERE funnel_id=?`).bind(funnelId).run()
    const now = new Date().toISOString()
    for (const conn of (connections || [])) {
      await db.prepare(`
        INSERT INTO funnel_group_connections (funnel_id, from_group_id, to_group_id, condition_type, label, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(funnelId, conn.from_group_id, conn.to_group_id, conn.condition_type || 'always', conn.label || '', now).run()
    }
    return j({ success: true, message: '연결이 저장되었습니다.' })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
