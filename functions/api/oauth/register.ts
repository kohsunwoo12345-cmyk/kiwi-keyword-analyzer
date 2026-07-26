import { Env, json, resolveDB } from '../_utils'
import { ensureOauthSchema, rand, sha256 } from './_oauth'

// POST /api/oauth/register — 동적 클라이언트 등록 (RFC 7591)
//  Claude 가 커넥터를 만들 때 스스로 호출한다. 사람이 미리 앱을 등록할 필요가 없다.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { status: 204, headers: cors })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ error: 'server_error', error_description: 'DB 바인딩 없음' }, 500, cors)
  await ensureOauthSchema(db)

  let b: any = {}
  try { b = await request.json() } catch { return json({ error: 'invalid_client_metadata' }, 400, cors) }

  const uris: string[] = Array.isArray(b.redirect_uris) ? b.redirect_uris.filter((u: any) => typeof u === 'string') : []
  if (!uris.length) return json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris 필수' }, 400, cors)
  // http(s) 만 허용 (loopback 은 네이티브 클라이언트용으로 허용)
  for (const u of uris) {
    try {
      const p = new URL(u)
      if (p.protocol !== 'https:' && p.hostname !== 'localhost' && p.hostname !== '127.0.0.1')
        return json({ error: 'invalid_redirect_uri', error_description: 'https 또는 로컬호스트만 허용' }, 400, cors)
    } catch { return json({ error: 'invalid_redirect_uri' }, 400, cors) }
  }

  const clientId = rand('bgcl_', 16)
  // 공개 클라이언트(PKCE) 기본. token_endpoint_auth_method 가 none 이 아니면 시크릿 발급.
  const wantsSecret = b.token_endpoint_auth_method && b.token_endpoint_auth_method !== 'none'
  const secret = wantsSecret ? rand('bgcs_', 32) : ''
  await db.prepare(
    'INSERT INTO oauth_clients (client_id,client_secret_hash,client_name,redirect_uris,created_at) VALUES (?,?,?,?,?)',
  ).bind(clientId, secret ? await sha256(secret) : '', String(b.client_name || 'MCP Client').slice(0, 120),
    JSON.stringify(uris), new Date().toISOString()).run()

  return json({
    client_id: clientId,
    ...(secret ? { client_secret: secret } : {}),
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: uris,
    client_name: String(b.client_name || 'MCP Client').slice(0, 120),
    token_endpoint_auth_method: secret ? 'client_secret_post' : 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  }, 201, cors)
}
