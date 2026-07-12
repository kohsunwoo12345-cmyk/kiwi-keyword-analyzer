import { Env, getSessionUser, resolveDB } from '../_utils'
import { ensureIgSchema, getIgCredentials } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/audience → 팔로워 국가/나이/성별 분석 (follower_demographics)
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
    const baseUrl = `https://graph.instagram.com/v25.0/${creds.igId}/insights`
    const commonParams = `&period=lifetime&metric_type=total_value&access_token=${creds.token}`

    const [ageRes, genderRes, countryRes] = await Promise.all([
      fetch(`${baseUrl}?metric=follower_demographics&breakdown=age${commonParams}`),
      fetch(`${baseUrl}?metric=follower_demographics&breakdown=gender${commonParams}`),
      fetch(`${baseUrl}?metric=follower_demographics&breakdown=country${commonParams}`),
    ])

    const [ageData, genderData, countryData] = await Promise.all([
      ageRes.json() as any,
      genderRes.json() as any,
      countryRes.json() as any,
    ])

    const combined = [...(ageData.data || []), ...(genderData.data || []), ...(countryData.data || [])]

    if (combined.length === 0) {
      const firstError = ageData.error || genderData.error || countryData.error
      if (firstError) return j({ success: false, error: firstError.message, code: firstError.code }, 400)
    }

    return j({ success: true, audience: combined })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 500)
  }
}
