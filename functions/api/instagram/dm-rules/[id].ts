import { Env, resolveDB, getSessionUser } from '../../_utils'
import { ensureIgSchema, isIgAdmin } from '../_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// DELETE /api/instagram/dm-rules/:id → DM 규칙 삭제
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    // ⚠ 인증이 없어 로그인하지 않아도 DM 규칙을 지울 수 있었다
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    await ensureIgSchema(db)
    const id = params.id
    // ⚠ 예전에는 id 만 보고 지워, 로그인만 하면 남의 규칙도 지울 수 있었다
    const r: any = await db.prepare(
      isIgAdmin(me)
        ? `DELETE FROM instagram_dm_rules WHERE id = ?`
        : `DELETE FROM instagram_dm_rules WHERE id = ? AND CAST(user_id AS TEXT) = CAST(? AS TEXT)`,
    ).bind(...(isIgAdmin(me) ? [id] : [id, me.id])).run().catch(() => null)
    if (!r || Number(r.meta?.changes || 0) === 0)
      return j({ success: false, error: '규칙을 찾을 수 없거나 권한이 없습니다.' }, 404)
    return j({ success: true })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
