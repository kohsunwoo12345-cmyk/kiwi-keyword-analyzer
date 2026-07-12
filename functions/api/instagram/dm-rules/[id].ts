import { Env, resolveDB } from '../../_utils'
import { ensureIgSchema } from '../_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// DELETE /api/instagram/dm-rules/:id → DM 규칙 삭제
export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    const id = params.id
    await db.prepare(`DELETE FROM instagram_dm_rules WHERE id = ?`).bind(id).run()
    return j({ success: true })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
