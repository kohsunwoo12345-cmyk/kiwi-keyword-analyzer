// SUPERPLACE 이식: POST /api/landing/form-submissions/delete — 신청자 삭제(본인 랜딩만)
import { Env, resolveDB, ensureSchema, getSessionUser, asIdList } from '../../_utils'
import { ensureLandingSchema } from '../_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: 'Unauthorized' }, 401)
  const b: any = await (request.json().catch(() => null)) ?? {}
  const ids = asIdList(b.ids)   // 객체·배열이 섞여 오면 D1 바인딩에서 터진다(500)
  if (!ids.length) return j({ success: false, error: 'ids required' }, 400)
  for (const id of ids) {
    await db.prepare(`DELETE FROM form_submissions WHERE id = ? AND landing_page_id IN (SELECT id FROM landing_pages WHERE user_id = ?)`).bind(id, me.id).run().catch(() => {})
  }
  return j({ success: true, deleted: ids.length })
}
