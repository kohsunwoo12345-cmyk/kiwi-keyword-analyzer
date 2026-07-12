import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'

// GET /api/landing/list → 내 랜딩페이지 목록 + 실제 조회수/리드수 통계
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const pages = (await db
    .prepare('SELECT id, slug, title, headline, subtext, cta, theme, fields, published, views, leads, created_at, updated_at FROM landing_pages WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
    .bind(me.id)
    .all()).results || []

  const totalViews = pages.reduce((s: number, p: any) => s + (p.views || 0), 0)
  const totalLeads = pages.reduce((s: number, p: any) => s + (p.leads || 0), 0)
  const publishedCount = pages.filter((p: any) => p.published).length
  const convRate = totalViews > 0 ? +((totalLeads / totalViews) * 100).toFixed(1) : 0

  return json({ ok: true, pages, stats: { totalPages: pages.length, publishedCount, totalViews, totalLeads, convRate } })
}
