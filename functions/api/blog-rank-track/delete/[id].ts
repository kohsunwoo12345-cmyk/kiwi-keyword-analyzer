// Ported from SUPERPLACE: DELETE /api/blog-rank-track/delete/:id (src/index.tsx ~125712)
// 소프트 삭제 (status='deleted'). admin 은 전체, 일반 유저는 본인 것만.
import { json, resolveDB } from '../../_utils'
import { getBrtUser } from '../_brt'

export const onRequestDelete: PagesFunction = async ({ request, env, params }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
    const auth = await getBrtUser(request, db)
    if (!auth) return json({ success: false, error: '로그인 필요' }, 401)
    const id = parseInt(String((params as any).id))

    let result: any
    if (auth.isAdmin) {
      result = await db.prepare(`UPDATE blog_rank_tracks SET status='deleted', updated_at=datetime('now') WHERE id=?`).bind(id).run()
    } else {
      result = await db.prepare(`UPDATE blog_rank_tracks SET status='deleted', updated_at=datetime('now') WHERE id=? AND user_id=?`).bind(id, auth.userId).run()
    }
    if ((result?.meta?.changes ?? result?.changes ?? 1) === 0) {
      return json({ success: false, error: '삭제할 항목이 없거나 권한이 없습니다.' }, 404)
    }
    return json({ success: true })
  } catch (e: any) {
    return json({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
