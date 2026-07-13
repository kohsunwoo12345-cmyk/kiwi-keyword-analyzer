import { json, getSessionUser, resolveDB } from './_utils'

// GET /api/landing-pages → 세션 사용자의 랜딩페이지 목록. SUPERPLACE Hono 라우트 이식.
export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)
  const userId = String(me.id)

  try {
    const results = await db
      .prepare(
        `SELECT id, title, slug, status, view_count, created_at
         FROM landing_pages WHERE user_id = ? ORDER BY created_at DESC`,
      )
      .bind(userId)
      .all()

    const pages = (results.results || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      url: `https://wearesuperplace.com/landing/${p.slug}`,
      status: p.status,
      viewCount: p.view_count,
      createdAt: p.created_at,
    }))

    return json({ success: true, count: pages.length, pages })
  } catch (err) {
    return json({ success: false, error: `요청 처리 중 오류가 발생했습니다.` }, 500)
  }
}
