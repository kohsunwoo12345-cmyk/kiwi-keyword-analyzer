import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureOauthSchema, issueCode, MCP_SCOPE } from './_oauth'

// GET  /api/oauth/authorize — 로그인 확인 → 승인(동의) 화면
// POST /api/oauth/authorize — 승인 처리 → 인가 코드와 함께 redirect_uri 로 되돌림
//  로그인 안 되어 있으면 /login 으로 보내고, 로그인 후 이 주소로 자동 복귀시킨다.

function esc(s: string) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
function errRedirect(redirectUri: string, state: string, code: string, desc: string) {
  const u = new URL(redirectUri)
  u.searchParams.set('error', code)
  if (desc) u.searchParams.set('error_description', desc)
  if (state) u.searchParams.set('state', state)
  return Response.redirect(u.toString(), 302)
}
function page(html: string, status = 200) {
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
function errPage(title: string, msg: string, status = 400) {
  return page(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,sans-serif;background:#0a0f1e;color:#e5e7eb}
.b{max-width:420px;padding:32px;text-align:center}h1{font-size:20px;margin:0 0 10px}p{color:#9aa4b2;line-height:1.6;font-size:14px}</style></head>
<body><div class="b"><h1>${esc(title)}</h1><p>${esc(msg)}</p></div></body></html>`, status)
}

async function loadClient(db: D1Database, clientId: string) {
  return await db.prepare('SELECT * FROM oauth_clients WHERE client_id = ? LIMIT 1').bind(clientId).first() as any
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return errPage('서버 오류', 'DB 바인딩이 없습니다.', 500)
  await ensureSchema(db); await ensureOauthSchema(db)

  const u = new URL(request.url)
  const clientId = u.searchParams.get('client_id') || ''
  const redirectUri = u.searchParams.get('redirect_uri') || ''
  const state = u.searchParams.get('state') || ''
  const challenge = u.searchParams.get('code_challenge') || ''
  const method = u.searchParams.get('code_challenge_method') || ''
  const respType = u.searchParams.get('response_type') || ''
  const scope = u.searchParams.get('scope') || MCP_SCOPE

  const client = await loadClient(db, clientId)
  // redirect_uri 검증 실패 시엔 리다이렉트하지 않고 화면에 표시 (오픈 리다이렉터 방지)
  if (!client) return errPage('연결할 수 없습니다', '알 수 없는 클라이언트입니다. 커넥터를 삭제 후 다시 추가해 주세요.')
  let allowed: string[] = []
  try { allowed = JSON.parse(client.redirect_uris) } catch {}
  if (!redirectUri || !allowed.includes(redirectUri))
    return errPage('연결할 수 없습니다', 'redirect_uri 가 등록된 값과 다릅니다.')

  if (respType !== 'code') return errRedirect(redirectUri, state, 'unsupported_response_type', 'response_type 은 code 여야 합니다')
  if (!challenge || method !== 'S256')
    return errRedirect(redirectUri, state, 'invalid_request', 'PKCE(S256) code_challenge 가 필요합니다')

  // 로그인 확인 — 안 되어 있으면 로그인 후 이 화면으로 복귀
  const me: any = await getSessionUser(request, db)
  if (!me) {
    const back = u.pathname + u.search
    return Response.redirect(`${u.origin}/login?next=${encodeURIComponent(back)}`, 302)
  }

  const q = u.search
  return page(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BYGENCY 연결 승인</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;background:#0a0f1e;color:#e5e7eb;padding:20px}
.card{width:100%;max-width:440px;background:#111827;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px}
.logo{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:15px;color:#fff;margin-bottom:18px}
.dot{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:grid;place-items:center;font-size:13px}
h1{font-size:19px;margin:0 0 6px;color:#fff}
.sub{color:#9aa4b2;font-size:13.5px;line-height:1.65;margin:0 0 18px}
.who{display:flex;align-items:center;gap:10px;background:#0b0f1a;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px;margin-bottom:14px}
.av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:grid;place-items:center;font-weight:700;color:#fff;font-size:14px}
.em{font-size:13px;color:#e5e7eb;font-weight:600}.cr{font-size:12px;color:#9aa4b2}
ul{list-style:none;padding:0;margin:0 0 18px}
li{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:#cbd5e1;padding:7px 0}
li b{color:#fff;font-weight:600}
.chk{color:#34d399;flex-shrink:0}
.warn{background:rgba(245,158,11,.09);border:1px solid rgba(245,158,11,.25);color:#fbbf24;font-size:12.5px;border-radius:10px;padding:10px 12px;margin-bottom:18px;line-height:1.55}
.row{display:flex;gap:10px}
button{flex:1;border:0;border-radius:11px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.ok{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff}
.no{background:rgba(255,255,255,.06);color:#cbd5e1}
.cl{font-size:12px;color:#6b7280;margin-top:14px;text-align:center;word-break:break-all}
</style></head><body>
<div class="card">
  <div class="logo"><span class="dot">B</span> BYGENCY</div>
  <h1>${esc(client.client_name || 'Claude')} 연결을 허용할까요?</h1>
  <p class="sub">승인하면 이 앱이 아래 계정으로 AI 생성을 요청할 수 있습니다.</p>
  <div class="who">
    <div class="av">${esc((me.name || me.email || '?').slice(0, 1))}</div>
    <div><div class="em">${esc(me.email || me.name || '')}</div>
    <div class="cr">보유 크레딧 ${Number(me.credits || 0).toLocaleString('ko-KR')}</div></div>
  </div>
  <ul>
    <li><span class="chk">✓</span><span>AI <b>이미지·영상 생성</b> 요청</span></li>
    <li><span class="chk">✓</span><span>사용 가능한 <b>모델 목록</b> 조회</span></li>
    <li><span class="chk">✓</span><span>생성 <b>진행 상태</b> 확인</span></li>
  </ul>
  <div class="warn">생성 1건마다 <b>이 계정의 크레딧이 실제로 차감</b>됩니다. 비밀번호는 앱에 전달되지 않습니다.</div>
  <form method="POST" action="/api/oauth/authorize${esc(q)}">
    <div class="row">
      <button type="submit" name="approve" value="0" class="no">취소</button>
      <button type="submit" name="approve" value="1" class="ok">연결 허용</button>
    </div>
  </form>
  <div class="cl">연결 대상: ${esc(redirectUri)}</div>
</div></body></html>`)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return errPage('서버 오류', 'DB 바인딩이 없습니다.', 500)
  await ensureSchema(db); await ensureOauthSchema(db)

  const u = new URL(request.url)
  const clientId = u.searchParams.get('client_id') || ''
  const redirectUri = u.searchParams.get('redirect_uri') || ''
  const state = u.searchParams.get('state') || ''
  const challenge = u.searchParams.get('code_challenge') || ''
  const scope = u.searchParams.get('scope') || MCP_SCOPE

  const client = await loadClient(db, clientId)
  if (!client) return errPage('연결할 수 없습니다', '알 수 없는 클라이언트입니다.')
  let allowed: string[] = []
  try { allowed = JSON.parse(client.redirect_uris) } catch {}
  if (!redirectUri || !allowed.includes(redirectUri)) return errPage('연결할 수 없습니다', 'redirect_uri 불일치.')

  const me: any = await getSessionUser(request, db)
  if (!me) return Response.redirect(`${u.origin}/login?next=${encodeURIComponent(u.pathname + u.search)}`, 302)

  let approve = '0'
  try {
    const form = await request.formData()
    approve = String(form.get('approve') || '0')
  } catch { /* 본문 없음 → 거부 처리 */ }
  if (approve !== '1') return errRedirect(redirectUri, state, 'access_denied', '사용자가 연결을 거부했습니다')

  const code = await issueCode(db, { clientId, userId: me.id, redirectUri, codeChallenge: challenge, scope })
  const back = new URL(redirectUri)
  back.searchParams.set('code', code)
  if (state) back.searchParams.set('state', state)
  return Response.redirect(back.toString(), 302)
}
