import { Env, json, resolveDB } from '../_utils'
import { ensureOauthSchema, sha256, ctEq, verifyPkce, issueTokens, MCP_SCOPE, ACCESS_TTL_SEC } from './_oauth'

// POST /api/oauth/token — 인가 코드 ↔ 액세스 토큰 교환 (PKCE 검증) · 리프레시 토큰 갱신

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}
const oerr = (code: string, desc?: string, status = 400) =>
  json({ error: code, ...(desc ? { error_description: desc } : {}) }, status, cors)

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { status: 204, headers: cors })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return oerr('server_error', 'DB 바인딩 없음', 500)
  await ensureOauthSchema(db)

  // application/x-www-form-urlencoded (표준) 및 JSON 모두 수용
  let p: Record<string, string> = {}
  const ct = request.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) {
      const j: any = await (request.json().catch(() => null)) ?? {}
      for (const k of Object.keys(j || {})) p[k] = String(j[k])
    } else {
      const f = await request.formData()
      f.forEach((v, k) => { p[k] = String(v) })
    }
  } catch { return oerr('invalid_request', '본문을 해석할 수 없습니다') }

  // 클라이언트 인증 (공개 클라이언트는 시크릿 없음)
  const clientId = p.client_id || ''
  if (!clientId) return oerr('invalid_client', 'client_id 필수')
  const client: any = await db.prepare('SELECT * FROM oauth_clients WHERE client_id = ? LIMIT 1').bind(clientId).first()
  if (!client) return oerr('invalid_client', '등록되지 않은 client_id', 401)
  if (client.client_secret_hash) {
    const got = p.client_secret ? await sha256(p.client_secret) : ''
    if (!got || !ctEq(got, client.client_secret_hash)) return oerr('invalid_client', 'client_secret 불일치', 401)
  }

  const grant = p.grant_type || ''

  if (grant === 'authorization_code') {
    const code = p.code || ''
    const redirectUri = p.redirect_uri || ''
    const verifier = p.code_verifier || ''
    if (!code) return oerr('invalid_request', 'code 필수')
    const h = await sha256(code)
    const row: any = await db.prepare('SELECT * FROM oauth_codes WHERE code_hash = ? LIMIT 1').bind(h).first()
    if (!row) return oerr('invalid_grant', '알 수 없는 코드')
    // ── 코드 선점 ────────────────────────────────────────────────────────────
    //  인가 코드는 "딱 한 번만" 쓸 수 있어야 한다(OAuth 규약).
    //  ⚠ 예전에는 used 를 읽어 보고 나서 따로 1 로 바꿨다. 같은 코드를 동시에 두 번 내밀면
    //     둘 다 used=0 을 읽고 둘 다 토큰을 받아 갔다 — 코드를 가로챈 쪽도 토큰을 얻는다.
    //     "아직 안 쓴 코드일 때만" 사용 처리하는 조건부 UPDATE 로 한 번만 통과시킨다.
    const claim: any = await db.prepare(
      'UPDATE oauth_codes SET used = 1 WHERE code_hash = ? AND COALESCE(used, 0) = 0',
    ).bind(h).run().catch(() => null)
    if (!claim || Number(claim.meta?.changes || 0) === 0) {
      // 재사용 시도 → 해당 클라이언트/사용자 토큰 폐기 (재생 공격 방어)
      await db.prepare("UPDATE oauth_tokens SET revoked = 1 WHERE client_id = ? AND user_id = ?")
        .bind(row.client_id, row.user_id).run().catch(() => {})
      return oerr('invalid_grant', '이미 사용된 코드')
    }
    if (new Date(row.expires_at).getTime() < Date.now()) return oerr('invalid_grant', '만료된 코드')
    if (!ctEq(row.client_id, clientId)) return oerr('invalid_grant', '코드가 다른 클라이언트의 것입니다')
    if (redirectUri && !ctEq(row.redirect_uri, redirectUri)) return oerr('invalid_grant', 'redirect_uri 불일치')
    if (row.code_challenge) {
      if (!verifier) return oerr('invalid_request', 'code_verifier 필수')
      if (!(await verifyPkce(verifier, row.code_challenge))) return oerr('invalid_grant', 'PKCE 검증 실패')
    }
    const t = await issueTokens(db, clientId, row.user_id, row.scope || MCP_SCOPE)
    return json(t, 200, cors)
  }

  if (grant === 'refresh_token') {
    const rt = p.refresh_token || ''
    if (!rt) return oerr('invalid_request', 'refresh_token 필수')
    const h = await sha256(rt)
    const row: any = await db.prepare(
      "SELECT * FROM oauth_tokens WHERE token_hash = ? AND kind = 'refresh' LIMIT 1",
    ).bind(h).first()
    if (!row || row.revoked) return oerr('invalid_grant', '유효하지 않은 refresh_token')
    if (!ctEq(row.client_id, clientId)) return oerr('invalid_grant', '클라이언트 불일치')
    // 회전: 기존 리프레시 폐기 후 새로 발급
    await db.prepare('UPDATE oauth_tokens SET revoked = 1 WHERE token_hash = ?').bind(h).run().catch(() => {})
    const t = await issueTokens(db, clientId, row.user_id, row.scope || MCP_SCOPE)
    return json(t, 200, cors)
  }

  return oerr('unsupported_grant_type', `지원하지 않는 grant_type: ${grant}`)
}
