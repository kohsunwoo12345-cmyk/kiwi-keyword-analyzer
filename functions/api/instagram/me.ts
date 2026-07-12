import { Env, getSessionUser, resolveDB } from '../_utils'
import { ensureIgSchema, getIgCredentials } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/me → 실제 프로필 + 팔로워/게시물 수 (graph.instagram.com/v25.0/me)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
  await ensureIgSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const userId = String(me.id)
  const creds = await getIgCredentials(db, userId)
  if (!creds) return j({ success: false, error: '연결된 계정이 없습니다.' }, 401)

  try {
    const fields = 'user_id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website,account_type'
    const res = await fetch(`https://graph.instagram.com/v25.0/me?fields=${fields}&access_token=${creds.token}`)
    const data = (await res.json()) as any
    if (data.error) return j({ success: false, error: data.error.message, code: data.error.code, type: data.error.type }, 400)

    await db
      .prepare(`UPDATE instagram_account_settings SET follower_count=?, ig_username=?, updated_at=datetime('now') WHERE user_id=?`)
      .bind(data.followers_count || 0, data.username || creds.username, userId)
      .run()

    return j({ success: true, profile: data })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
