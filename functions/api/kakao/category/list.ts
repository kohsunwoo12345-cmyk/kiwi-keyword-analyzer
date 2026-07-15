import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../../_utils'
import { aligoCategories } from '../../_aligo'

// GET /api/kakao/category/list → 카카오 채널 카테고리 목록 (채널 등록 시 선택용)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const r = await aligoCategories(env)
  return json({ ok: r.ok, categories: r.categories || [], error: r.error })
}
