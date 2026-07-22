// Ported from SUPERPLACE: GET /api/blog-rank-track/usage (src/index.tsx ~125614)
import { json, resolveDB } from '../_utils'
import { initBrtTables, getBrtUser } from './_brt'

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db: any = resolveDB(env)
    if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
    const auth = await getBrtUser(request, db)
    if (!auth) return json({ success: false, error: '로그인 필요' }, 401)
    await initBrtTables(db)
    if (auth.isAdmin) return json({ success: true, used: 0, limit: null })
    const monthStart = new Date().toISOString().slice(0, 7) + '-01'
    const row = await db.prepare(
      `SELECT COUNT(*) as cnt FROM blog_rank_tracks WHERE user_id=? AND created_at>=? AND status='active'`
    ).bind(auth.userId, monthStart).first() as any
    const used = row?.cnt || 0
    return json({ success: true, used, limit: 15 })
  } catch (e: any) {
    return json({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
