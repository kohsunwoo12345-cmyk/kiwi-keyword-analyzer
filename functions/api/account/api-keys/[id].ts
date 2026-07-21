// 회원 API 키 폐기 (DELETE) — 본인 키만
import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../../_utils'
import { ensureApiKeysSchema } from '../../_apikeys'

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureApiKeysSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const id = String(params.id || '')
  await db.prepare(`UPDATE api_keys SET status = 'revoked', revoked_at = ? WHERE id = ? AND user_id = ?`)
    .bind(new Date().toISOString(), id, me.id).run()
  return json({ ok: true })
}
