// SUPERPLACE 이식: GET /api/landing/total-submissions — 내 랜딩 전체 신청자 수
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ total: 0 })
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ total: 0 })
  try {
    const row: any = await db.prepare(
      `SELECT COUNT(fs.id) AS total FROM form_submissions fs JOIN landing_pages lp ON fs.landing_page_id = lp.id WHERE lp.user_id = ?`,
    ).bind(me.id).first()
    return j({ total: Number(row?.total || 0) })
  } catch { return j({ total: 0 }) }
}
