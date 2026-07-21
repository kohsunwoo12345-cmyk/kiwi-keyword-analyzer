// SUPERPLACE 이식: PUT(이름수정)/DELETE(삭제) /api/landing/folders/:id
import { Env, resolveDB, ensureSchema, getSessionUser } from '../../_utils'
import { ensureLandingSchema } from '../_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String((params as any).id || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const b: any = await request.json().catch(() => ({}))
  const name = String(b.name || '').trim()
  if (!name) return j({ success: false, error: '폴더 이름을 입력하세요.' }, 400)
  await db.prepare('UPDATE landing_folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').bind(name, id, me.id).run()
  return j({ success: true, message: '폴더가 수정되었습니다.' })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String((params as any).id || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  await db.prepare('UPDATE landing_pages SET folder_id = NULL WHERE folder_id = ?').bind(id).run().catch(() => {})
  await db.prepare('DELETE FROM landing_folders WHERE id = ? AND user_id = ?').bind(id, me.id).run()
  return j({ success: true, message: '폴더가 삭제되었습니다.' })
}
