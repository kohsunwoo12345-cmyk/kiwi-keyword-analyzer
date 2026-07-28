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
  // ⚠ 이건 빌더의 "편집용 불러오기" 다(공개 페이지는 /landing/:slug 와 /l/:slug 가 따로 그린다).
  //   그런데 인증이 없어, 주소만 알면 남의 랜딩페이지 원본 HTML·헤더 스크립트·픽셀 ID 까지
  //   그대로 가져갈 수 있었다. slug 는 공개 주소라 누구나 안다.
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const page: any = await db.prepare('SELECT * FROM landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
  if (!page) return j({ success: false, error: '페이지를 찾을 수 없습니다.' }, 404)
  const isAdmin = me.role === 'admin' || me.role === 'superadmin'
  if (!isAdmin && String(page.user_id || '') !== String(me.id))
    return j({ success: false, error: '권한이 없습니다.' }, 403)
  // ⚠ 조회수는 올리지 않는다. 여기는 편집기를 열 때 도는 곳이라,
  //   주인이 편집할 때마다 "조회수" 가 올라가 실제 방문 수와 어긋났다.
  //   공개 페이지 렌더(functions/landing/[slug].ts)에서 이미 세고 있다.
  return j({ success: true, page })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String((params as any).slug || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '사용자 인증 정보가 없습니다.' }, 401)
  // ⚠ 순서가 중요하다. 예전에는 신청자부터 지우고 나서 페이지를 "본인 것만" 지웠는데,
  //   남의 페이지 id 를 넣으면 페이지 삭제는 404 로 막히지만 그 페이지의 신청자는
  //   이미 지워진 뒤였다. 소유권을 먼저 확인한다.
  const r = await db.prepare('DELETE FROM landing_pages WHERE id = ? AND user_id = ?').bind(id, me.id).run()
  if (!r.meta || r.meta.changes === 0) return j({ success: false, error: '삭제할 페이지를 찾을 수 없거나 권한이 없습니다.' }, 404)
  await db.prepare('DELETE FROM form_submissions WHERE landing_page_id = ?').bind(id).run().catch(() => {})
  return j({ success: true, message: '삭제되었습니다.' })
}
