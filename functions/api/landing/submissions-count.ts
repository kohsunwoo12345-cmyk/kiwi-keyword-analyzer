// SUPERPLACE 이식: GET /api/landing/submissions-count?slugs=a,b,c — 페이지별 신청자 수
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ counts: {} })
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ counts: {} })
  const url = new URL(request.url)
  const slugsParam = url.searchParams.get('slugs') || ''
  const slugs = slugsParam.split(',').filter(Boolean).slice(0, 50)
  const counts: Record<string, number> = {}
  for (const slug of slugs) {
    try {
      const row: any = await db.prepare(`SELECT COUNT(fs.id) AS cnt FROM form_submissions fs JOIN landing_pages lp ON fs.landing_page_id = lp.id WHERE lp.slug = ? AND lp.user_id = ?`).bind(slug, me.id).first()
      counts[slug] = Number(row?.cnt || 0)
    } catch { counts[slug] = 0 }
  }
  return j({ counts })
}
