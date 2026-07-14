import { Env } from '../../_utils'

// GET /api/auth/google/start?ref=CODE&next=/path → 구글 동의화면으로 리다이렉트
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const clientId = env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return Response.redirect(new URL('/login?error=google_not_configured', request.url).toString(), 302)
  }
  const url = new URL(request.url)
  const ref = (url.searchParams.get('ref') || '').slice(0, 32)
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`

  // CSRF 방지용 state (+ 추천인 코드 동봉)
  const state = crypto.randomUUID().replace(/-/g, '')
  const statePayload = `${state}.${encodeURIComponent(ref)}`

  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  auth.searchParams.set('client_id', clientId)
  auth.searchParams.set('redirect_uri', redirectUri)
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('scope', 'openid email profile')
  auth.searchParams.set('state', state)
  auth.searchParams.set('access_type', 'online')
  auth.searchParams.set('include_granted_scopes', 'true')
  auth.searchParams.set('prompt', 'select_account')

  const stateCookie = `g_oauth=${statePayload}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=600`
  return new Response(null, {
    status: 302,
    headers: { Location: auth.toString(), 'Set-Cookie': stateCookie },
  })
}
