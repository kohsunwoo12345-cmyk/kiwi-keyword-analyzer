// SUPERPLACE 이식: PUT /api/landing/move-to-folder — 랜딩을 폴더로 이동
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const b: any = await request.json().catch(() => ({}))
  await db.prepare('UPDATE landing_pages SET folder_id = ? WHERE id = ? AND user_id = ?').bind(b.folderId || null, b.pageId, me.id).run()
  return j({ success: true, message: '폴더로 이동되었습니다.' })
}
