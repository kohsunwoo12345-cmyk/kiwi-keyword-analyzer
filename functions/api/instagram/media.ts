import { Env, getSessionUser, resolveDB } from '../_utils'
import { ensureIgSchema, getIgCredentials } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/media?limit=12&after=cursor → 실제 게시물 목록
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
  await ensureIgSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const userId = String(me.id)
  const params = new URL(request.url).searchParams
  const limit = parseInt(params.get('limit') || '12')
  const after = params.get('after') || ''
  const creds = await getIgCredentials(db, userId)
  if (!creds) return j({ success: false, error: '연결된 계정이 없습니다.' }, 401)

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,media_product_type'
    let url = `https://graph.instagram.com/v25.0/me/media?fields=${fields}&limit=${limit}&access_token=${creds.token}`
    if (after) url += `&after=${after}`

    const res = await fetch(url)
    const data = (await res.json()) as any
    if (data.error) return j({ success: false, error: data.error.message }, 400)

    return j({ success: true, media: data.data || [], paging: data.paging || null })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
