// MCP OAuth 2.1 공용 저장소·헬퍼 (RFC 7591 DCR · RFC 8414 · RFC 9728 · PKCE S256)
//  · Claude 커스텀 커넥터가 "연결" 한 번으로 로그인·승인까지 끝내도록 하는 인가 서버.
//  · 토큰/코드는 평문 저장하지 않고 SHA-256 해시로만 보관한다.

export const ACCESS_TTL_SEC = 60 * 60 * 24 * 30 // 액세스 토큰 30일
export const CODE_TTL_SEC = 600                 // 인가 코드 10분
export const MCP_SCOPE = 'mcp'

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export function rand(prefix: string, bytes = 32): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return prefix + [...a].map((b) => b.toString(16).padStart(2, '0')).join('')
}
/** 상수 시간 문자열 비교 */
export function ctEq(a: string, b: string): boolean {
  a = String(a || ''); b = String(b || '')
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
/** base64url 디코딩 없이 PKCE S256 검증: BASE64URL(SHA256(verifier)) === challenge */
export async function verifyPkce(verifier: string, challenge: string): Promise<boolean> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  let bin = ''
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b)
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return ctEq(b64, challenge)
}

export async function ensureOauthSchema(db: D1Database): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_secret_hash TEXT DEFAULT '',
    client_name TEXT DEFAULT '',
    redirect_uris TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS oauth_codes (
    code_hash TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    code_challenge TEXT DEFAULT '',
    scope TEXT DEFAULT '',
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS oauth_tokens (
    token_hash TEXT PRIMARY KEY,
    kind TEXT NOT NULL,           -- access | refresh
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    scope TEXT DEFAULT '',
    expires_at TEXT,
    revoked INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user ON oauth_tokens(user_id)').run().catch(() => {})
}

/** 액세스 토큰으로 사용자 조회 (MCP 인증에서 사용). 만료/폐기 시 null. */
export async function getUserByAccessToken(db: D1Database, token: string | null): Promise<any | null> {
  const raw = String(token || '').trim()
  if (!raw || raw.length < 20) return null
  try {
    await ensureOauthSchema(db)
    const h = await sha256(raw)
    const row: any = await db.prepare(
      "SELECT user_id, expires_at, revoked FROM oauth_tokens WHERE token_hash = ? AND kind = 'access' LIMIT 1",
    ).bind(h).first()
    if (!row || row.revoked) return null
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null
    const u: any = await db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(row.user_id).first()
    return u || null
  } catch { return null }
}

/** 인가 코드 발급 */
export async function issueCode(db: D1Database, o: {
  clientId: string; userId: string; redirectUri: string; codeChallenge: string; scope: string
}): Promise<string> {
  await ensureOauthSchema(db)
  const code = rand('bgc_', 32)
  await db.prepare(
    'INSERT INTO oauth_codes (code_hash,client_id,user_id,redirect_uri,code_challenge,scope,expires_at,used) VALUES (?,?,?,?,?,?,?,0)',
  ).bind(await sha256(code), o.clientId, o.userId, o.redirectUri, o.codeChallenge || '', o.scope || MCP_SCOPE,
    new Date(Date.now() + CODE_TTL_SEC * 1000).toISOString()).run()
  return code
}

/** 토큰 발급(액세스+리프레시) */
export async function issueTokens(db: D1Database, clientId: string, userId: string, scope: string) {
  const access = rand('bga_', 32)
  const refresh = rand('bgr_', 32)
  const now = new Date().toISOString()
  await db.prepare(
    'INSERT INTO oauth_tokens (token_hash,kind,client_id,user_id,scope,expires_at,revoked,created_at) VALUES (?,?,?,?,?,?,0,?)',
  ).bind(await sha256(access), 'access', clientId, userId, scope,
    new Date(Date.now() + ACCESS_TTL_SEC * 1000).toISOString(), now).run()
  await db.prepare(
    'INSERT INTO oauth_tokens (token_hash,kind,client_id,user_id,scope,expires_at,revoked,created_at) VALUES (?,?,?,?,?,NULL,0,?)',
  ).bind(await sha256(refresh), 'refresh', clientId, userId, scope, now).run()
  return { access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: ACCESS_TTL_SEC, scope }
}

/** 인가 서버 메타데이터 (RFC 8414) */
export function asMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    scopes_supported: [MCP_SCOPE],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
  }
}
/** 보호 리소스 메타데이터 (RFC 9728) — Claude 가 인가 서버를 찾아가는 출발점 */
export function prMetadata(origin: string) {
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ['header'],
  }
}
