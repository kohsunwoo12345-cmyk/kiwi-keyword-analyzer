import { Env, getSessionUser, resolveDB } from '../../_utils'
import { ensureIgSchema, getIgAppConfig } from '../_ig'

const html = (body: string) => new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } })

// GET /api/instagram/oauth/start → Instagram 로그인 페이지로 리다이렉트 (팝업)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return html(`<!DOCTYPE html><html><body>DB 바인딩 없음</body></html>`)
  await ensureIgSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) {
    return html(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">
      <h2 style="color:#dc2626;">⚠️ 로그인이 필요합니다</h2>
      <p>Instagram 연동은 로그인 후 사용할 수 있습니다.</p>
      <script>setTimeout(()=>window.close(),3000)</script>
    </body></html>`)
  }
  const cfg = await getIgAppConfig(env, db)
  const appId = cfg.appId
  const userId = String(me.id)

  if (!appId) {
    return html(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">
      <h2 style="color:#dc2626;">⚠️ 앱 설정 필요</h2>
      <p>Instagram 계정 패널에서 Meta 앱 ID와 시크릿을 먼저 설정해주세요.</p>
      <script>setTimeout(()=>window.close(),4000)</script>
    </body></html>`)
  }

  const state = btoa(JSON.stringify({ userId, ts: Date.now() }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const redirectUri = new URL(request.url).origin + '/'

  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
  ].join(',')

  const oauthUrl =
    'https://www.instagram.com/oauth/authorize' +
    '?force_reauth=true' +
    '&client_id=' + appId +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent(scopes) +
    '&state=' + state

  return Response.redirect(oauthUrl, 302)
}
