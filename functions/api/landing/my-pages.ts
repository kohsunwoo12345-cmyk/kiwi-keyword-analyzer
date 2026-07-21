// SUPERPLACE 이식: GET /api/landing/my-pages — 내 랜딩페이지 목록 (세션 기반)
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)

  const url = new URL(request.url)
  const folderId = url.searchParams.get('folderId')
  let sql = 'SELECT id, slug, title, template_type, view_count, status, folder_id, form_id, form_fields, thumbnail_url, created_at FROM landing_pages WHERE user_id = ?'
  const params: any[] = [me.id]
  if (folderId && folderId !== 'null') { sql += ' AND folder_id = ?'; params.push(folderId) }
  else if (folderId === 'null') sql += ' AND folder_id IS NULL'
  sql += ' ORDER BY created_at DESC'
  try {
    const r = await db.prepare(sql).bind(...params).all()
    return j({ success: true, pages: r.results || [], _uid: me.id })
  } catch (e: any) {
    return j({ success: false, error: '목록 조회 실패: ' + String(e?.message || e).slice(0, 120) }, 500)
  }
}
