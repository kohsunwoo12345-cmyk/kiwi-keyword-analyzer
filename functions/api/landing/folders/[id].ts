// SUPERPLACE 이식: PUT(이름수정)/DELETE(삭제) /api/landing/folders/:id
import { Env, resolveDB, ensureSchema, getSessionUser, asText } from '../../_utils'
import { ensureLandingSchema } from '../_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String((params as any).id || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const b: any = await (request.json().catch(() => null)) ?? {}
  const name = asText(b.name, 100).trim()
  if (!name) return j({ success: false, error: '폴더 이름을 입력하세요.' }, 400)
  const r = await db.prepare('UPDATE landing_folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').bind(name, id, me.id).run()
  // 남의 폴더 id 를 넣어도 "수정되었습니다" 라고 답했다 — 안 바뀐 건 안 바뀌었다고 해야 한다.
  if (!r.meta || r.meta.changes === 0) return j({ success: false, error: '폴더를 찾을 수 없거나 권한이 없습니다.' }, 404)
  return j({ success: true, message: '폴더가 수정되었습니다.' })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String((params as any).id || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  // ⚠ 순서와 범위가 둘 다 틀렸다. 예전에는 "그 폴더에 든 페이지" 를 주인 구분 없이 먼저 떼어 낸 뒤
  //   폴더만 본인 것으로 지웠다. 그래서 남의 폴더 id 를 넣으면 폴더 삭제는 막히지만
  //   그 폴더에 정리해 둔 남의 랜딩페이지가 전부 폴더 밖으로 튀어나왔다.
  //   폴더를 먼저 본인 것으로 지우고, 성공했을 때만 내 페이지를 떼어 낸다.
  const r = await db.prepare('DELETE FROM landing_folders WHERE id = ? AND user_id = ?').bind(id, me.id).run()
  if (!r.meta || r.meta.changes === 0) return j({ success: false, error: '폴더를 찾을 수 없거나 권한이 없습니다.' }, 404)
  await db.prepare('UPDATE landing_pages SET folder_id = NULL WHERE folder_id = ? AND user_id = ?').bind(id, me.id).run().catch(() => {})
  return j({ success: true, message: '폴더가 삭제되었습니다.' })
}
