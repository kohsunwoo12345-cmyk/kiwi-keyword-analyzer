// SUPERPLACE 이식: GET(목록)/POST(생성) /api/landing/folders
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const folders = ((await db.prepare('SELECT id, name, created_at FROM landing_folders WHERE user_id = ? ORDER BY created_at DESC').bind(me.id).all()).results as any[]) || []
  const withCount = await Promise.all(folders.map(async (f) => {
    const c: any = await db.prepare('SELECT COUNT(*) AS count FROM landing_pages WHERE folder_id = ?').bind(f.id).first()
    return { ...f, page_count: Number(c?.count || 0) }
  }))
  const total: any = await db.prepare('SELECT COUNT(*) AS count FROM landing_pages WHERE user_id = ?').bind(me.id).first()
  return j({ success: true, folders: withCount, totalPages: Number(total?.count || 0) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const b: any = await request.json().catch(() => ({}))
  const name = String(b.name || '').trim()
  if (!name) return j({ success: false, error: '폴더 이름을 입력하세요.' }, 400)
  const r = await db.prepare('INSERT INTO landing_folders (user_id, name, description) VALUES (?, ?, ?)').bind(me.id, name, b.description || null).run()
  return j({ success: true, folderId: r.meta.last_row_id, message: '폴더가 생성되었습니다.' })
}
