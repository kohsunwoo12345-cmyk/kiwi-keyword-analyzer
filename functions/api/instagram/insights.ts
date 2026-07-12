import { Env, getSessionUser, resolveDB } from '../_utils'
import { ensureIgSchema, getIgCredentials } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/insights?period=day → 계정 인사이트 (최근 28일)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
  await ensureIgSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
  const userId = String(me.id)
  const period = new URL(request.url).searchParams.get('period') || 'day'
  const creds = await getIgCredentials(db, userId)
  if (!creds) return j({ success: false, error: '연결된 계정이 없습니다.' }, 401)

  try {
    const until = Math.floor(Date.now() / 1000)
    const since = until - 28 * 86400
    const interactionMetrics = 'reach,total_interactions,likes,comments,shares,saved,follows'
    const res = await fetch(
      `https://graph.instagram.com/v25.0/${creds.igId}/insights` +
        `?metric=${interactionMetrics}` +
        `&period=${period}` +
        `&since=${since}` +
        `&until=${until}` +
        `&access_token=${creds.token}`,
    )
    const data = (await res.json()) as any
    if (data.error) return j({ success: false, error: data.error.message, code: data.error.code }, 400)
    return j({ success: true, insights: data.data || [], period })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
