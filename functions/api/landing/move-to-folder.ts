// SUPERPLACE 이식: PUT /api/landing/move-to-folder — 랜딩을 폴더로 이동
import { Env, resolveDB, ensureSchema, getSessionUser, asBindable } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const b: any = await (request.json().catch(() => null)) ?? {}
  // ⚠ folderId 를 그대로 믿었다 — 남의 폴더 번호를 적어 내 페이지를 그 안에 밀어 넣을 수 있었고,
  //   상대 폴더의 페이지 수가 부풀고 상대가 폴더를 지울 때 내 페이지까지 딸려 나갔다.
  const folderId = asBindable(b.folderId)
  const pageId = asBindable(b.pageId)
  if (pageId == null || pageId === '') return j({ success: false, error: '페이지를 지정하세요.' }, 400)
  if (folderId !== null && folderId !== '') {
    const own = await db.prepare('SELECT id FROM landing_folders WHERE id = ? AND user_id = ?').bind(folderId, me.id).first().catch(() => null)
    if (!own) return j({ success: false, error: '폴더를 찾을 수 없거나 권한이 없습니다.' }, 404)
  }
  const r = await db.prepare('UPDATE landing_pages SET folder_id = ? WHERE id = ? AND user_id = ?').bind(folderId, pageId, me.id).run()
  // 안 옮겨졌는데 "이동되었습니다" 라고 답하지 않는다.
  if (!r.meta || r.meta.changes === 0) return j({ success: false, error: '페이지를 찾을 수 없거나 권한이 없습니다.' }, 404)
  return j({ success: true, message: '폴더로 이동되었습니다.' })
}
