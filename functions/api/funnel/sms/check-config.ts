// SUPERPLACE 퍼널 빌더 이식: GET /api/funnel/sms/check-config
//  원본은 Solapi 기준이었으나 BYGENCY 는 Aligo(문자) + Resend(이메일) 사용.
//  페이지 배너 계약({ solapi: { ready, keyMasked, hasKey, hasSecret } })을 그대로 채워 반환.
import { resolveDB, getSessionUser } from '../../_utils'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false })
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const e: any = env
    const apiKey = String(e?.ALIGO_API_KEY || '')
    const userId = String(e?.ALIGO_USER_ID || '')
    const hasKey = !!apiKey
    const hasSecret = !!userId
    const ready = hasKey && hasSecret
    const keyMasked = apiKey ? apiKey.slice(0, 4) + '••••' + apiKey.slice(-2) : '-'
    return j({ success: true, solapi: { ready, keyMasked, hasKey, hasSecret, provider: 'aligo' } })
  } catch (error) {
    return j({ success: false })
  }
}
