// SUPERPLACE 퍼널 빌더 이식: PUT /api/funnels/:id/settings (DB중복방지 모드 + 헤더 스크립트)
import { resolveDB } from '../../_utils'
import { ensureFunnelSchema } from '../../funnel/_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestPut: PagesFunction = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const id = params.id as string
    const body = (await request.json()) as any
    const { db_dedup_mode, header_scripts } = body
    const validModes = ['none', 'group', 'funnel']
    const mode = validModes.includes(db_dedup_mode) ? db_dedup_mode : 'none'
    await db.prepare(`
      UPDATE funnels SET db_dedup_mode=?, header_scripts=?, updated_at=?
      WHERE id=?
    `).bind(mode, header_scripts || '', new Date().toISOString(), id).run()
    return j({ success: true, message: '퍼널 설정이 저장되었습니다.', db_dedup_mode: mode })
  } catch (err) {
    return j({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, 500)
  }
}
