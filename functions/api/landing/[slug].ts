// SUPERPLACE 이식:
//  GET    /api/landing/:slug  → 편집용 단일 조회(+조회수) — 단, my-pages/create/folders/total-submissions 등 예약어는 제외
//  DELETE /api/landing/:id    → 삭제(본인 것만)
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const RESERVED = new Set(['create', 'my-pages', 'folders', 'form-submissions', 'total-submissions', 'submissions-count', 'all-submissions', 'stats', 'move-to-folder', 'init-tables'])

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const slug = String((params as any).slug || '')
  if (!slug || RESERVED.has(slug)) return j({ success: false, error: '잘못된 경로' }, 404)
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const page: any = await db.prepare('SELECT * FROM landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
  if (!page) return j({ success: false, error: '페이지를 찾을 수 없습니다.' }, 404)
  db.prepare('UPDATE landing_pages SET view_count = view_count + 1 WHERE slug = ?').bind(slug).run().catch(() => {})
  return j({ success: true, page })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String((params as any).slug || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '사용자 인증 정보가 없습니다.' }, 401)
  await db.prepare('DELETE FROM form_submissions WHERE landing_page_id = ?').bind(id).run().catch(() => {})
  const r = await db.prepare('DELETE FROM landing_pages WHERE id = ? AND user_id = ?').bind(id, me.id).run()
  if (!r.meta || r.meta.changes === 0) return j({ success: false, error: '삭제할 페이지를 찾을 수 없거나 권한이 없습니다.' }, 404)
  return j({ success: true, message: '삭제되었습니다.' })
}
