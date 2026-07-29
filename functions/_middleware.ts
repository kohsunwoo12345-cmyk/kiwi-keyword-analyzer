import { resolveDB, clientIp, geoFrom, isBlocked, isWhitelistMode, isWhitelisted, logSecurity, json, countRecentSuspicious, autoBlockIp, isAdminLockEnabled, isAdminAccessAllowed, parseCookies, ADMIN_DEVICE_COOKIE } from './api/_utils'
import { asMetadata, prMetadata } from './api/oauth/_oauth'

// 관리자 콘솔 경로 (난독화된 base) + 관리자 API
const ADMIN_BASE = '/adminsunkoh028741_11263'
const ADMIN_API = '/api/admin/'

// 정적 자산은 건너뜀(성능). 문서/‑API 요청만 보안 검사.
const ASSET_RE = /\.(js|mjs|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map|txt|xml|json)$/i
// 의심 경로/페이로드 (SQL 인젝션 · 경로 탐색 · 알려진 스캐너 경로)
const SUSPICIOUS_RE = /(\.env|\.git|wp-admin|wp-login|phpmyadmin|xmlrpc|\/\.\.|%2e%2e|sqlmap|union\s+select|select.+from|information_schema|eval\(|base64_|\/etc\/passwd|<script|onerror=|\bor\b\s+1=1)/i
// 의심 User-Agent (자동 스캐너/공격 도구 · 스크래퍼)
const BAD_UA_RE = /(sqlmap|nikto|nmap|masscan|acunetix|nessus|dirbuster|gobuster|wpscan|hydra|zgrab|semrush|python-requests\/|curl\/|libwww|httpclient)/i
// 명백한 공격/침투 도구 — 최초 1회 요청에도 즉시 자동 차단(오탐 위험 낮음)
const ATTACK_UA_RE = /(sqlmap|nikto|nmap|masscan|acunetix|nessus|dirbuster|gobuster|wpscan|hydra|zgrab|nuclei|feroxbuster|dirsearch)/i
// 우리 프로그램 무단 복제/스크래핑·API 남용 임계값: 10분 내 의심요청 이 횟수 초과 시 자동 차단
const ABUSE_THRESHOLD = 24
// 정기 실행(크론) 엔드포인트 — 토큰이 맞으면 보안 휴리스틱을 건너뛴다(아래 설명 참고)
const CRON_PATH_RE = /^\/api\/(cron\/|naver-place\/update-all-tracking)/
/** 상수시간 문자열 비교 — 타이밍으로 토큰을 캐내지 못하게 */
function ctEqStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// 화이트리스트 모드에서도 항상 허용해야 관리자가 복구 가능
const WHITELIST_ALLOW_RE = /^\/(login|api\/(login|me|logout|admin\/)|adminsunkoh028741_11263)/

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env, next } = context
  const url = new URL(request.url)
  const path = url.pathname

  // ── MCP OAuth 디스커버리 (RFC 9728 / RFC 8414) ──
  //  Claude 가 커넥터를 연결할 때 가장 먼저 읽는 공개 메타데이터.
  //  보안 검사보다 앞에 두어 어떤 상황에서도 항상 응답되게 한다(연결 실패 방지).
  //  경로 뒤에 리소스 경로가 붙는 형태(/.well-known/...-resource/api/mcp)도 함께 수용.
  if (path.startsWith('/.well-known/oauth-')) {
    const origin = url.origin
    const meta = path.startsWith('/.well-known/oauth-protected-resource')
      ? prMetadata(origin)
      : path.startsWith('/.well-known/oauth-authorization-server')
      ? asMetadata(origin)
      : null
    if (meta) {
      return new Response(JSON.stringify(meta), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=300',
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'Content-Type, Authorization, Mcp-Protocol-Version',
          'access-control-allow-methods': 'GET, OPTIONS',
        },
      })
    }
  }

  if (ASSET_RE.test(path) || path.startsWith('/_next/')) return next()

  // ── 정기 실행(크론) 호출은 보안 휴리스틱을 건너뛴다 ──────────────────────────
  //  크론은 Cloudflare Workers 가 이 사이트를 HTTP 로 두드리는 구조라, 발신 IP 가
  //  다른 이용자와 공유될 수 있다. 그 IP 가 어떤 이유로든 자동 차단되면 크론은
  //  아무 에러도 없이 403 만 받으며 영원히 멈춘다 — 가장 알아채기 어려운 고장이다.
  //  X-Cron-Token 이 정확히 일치할 때만(= 이미 이 값으로 엔드포인트가 보호된다)
  //  크론 경로에 한해 통과시킨다. 토큰이 틀리면 아래 검사와 엔드포인트가 그대로 막는다.
  if (CRON_PATH_RE.test(path)) {
    const expected = String((env as any).CRON_TOKEN || '')
    const got = request.headers.get('X-Cron-Token') || ''
    if (expected && got.length === expected.length && ctEqStr(got, expected)) return next()
  }

  const db = resolveDB(env)
  if (db) {
    const ip = clientIp(request)
    const geo = geoFrom(request)
    const ua = request.headers.get('User-Agent') || ''
    try {
      // 1) 명시적 차단 IP
      if (await isBlocked(db, ip)) {
        await logSecurity(db, { ip, method: request.method, path, status: 403, severity: 'high', detail: '차단된 IP 접근 시도', country: geo.country, city: geo.city, ua })
        return blockedResponse(path)
      }
      // 2) 화이트리스트 모드 (허용 IP만 접근)
      if (!WHITELIST_ALLOW_RE.test(path) && (await isWhitelistMode(db))) {
        if (!(await isWhitelisted(db, ip))) {
          await logSecurity(db, { ip, method: request.method, path, status: 403, severity: 'high', detail: '화이트리스트 모드 차단', country: geo.country, city: geo.city, ua })
          return blockedResponse(path, true)
        }
      }
      // 2-b) 관리자 콘솔 접근 잠금 — 활성화 시 허용 IP/기기만 관리자 접근 가능
      //   · 잠금 관리 API(/api/admin/access-lock)와 관리 페이지(/access)는 예외로 두어
      //     잠긴 상태에서도 로그인한 관리자가 잠금을 해제/복구할 수 있게 한다
      //     (API·페이지 모두 로그인 관리자 기준으로 데이터가 보호됨).
      const isLockMgmt = path.startsWith(ADMIN_API + 'access-lock') || path.startsWith(ADMIN_BASE + '/access')
      if ((path.startsWith(ADMIN_BASE) || path.startsWith(ADMIN_API)) && !isLockMgmt) {
        if (await isAdminLockEnabled(db)) {
          const devTok = parseCookies(request)[ADMIN_DEVICE_COOKIE] || ''
          if (!(await isAdminAccessAllowed(db, ip, devTok))) {
            await logSecurity(db, { ip, method: request.method, path, status: 403, severity: 'high', detail: '관리자 접근 잠금 차단(허용 IP/기기 아님)', country: geo.country, city: geo.city, ua }).catch(() => {})
            return adminBlockedResponse(path)
          }
        }
      }
    } catch {
      /* 테이블 미생성 등 무시 */
    }
    // 3) 이상 행동 감지 (경로/페이로드 + UA) — 스캐닝/스크래핑/공격도구 자동 차단
    let decoded = path + url.search
    try { decoded = decodeURIComponent(decoded) } catch { /* 잘못된 인코딩 자체가 의심 신호 */ }
    const suspiciousPath = SUSPICIOUS_RE.test(decoded)
    const attackTool = ATTACK_UA_RE.test(ua)
    const badUa = BAD_UA_RE.test(ua)
    if (suspiciousPath || badUa) {
      const sev = suspiciousPath || attackTool ? 'high' : 'warn'
      await logSecurity(db, {
        ip,
        method: request.method,
        path,
        status: 0,
        severity: sev,
        detail: suspiciousPath ? '의심 경로/페이로드 감지' : `의심 User-Agent: ${ua.slice(0, 60)}`,
        country: geo.country,
        city: geo.city,
        ua,
      }).catch(() => {})

      // 3-a) 명백한 침투/스캐너 도구 → 즉시 자동 차단 후 접속 차단
      if (attackTool) {
        const blocked = await autoBlockIp(db, ip, `공격 도구 자동 차단: ${ua.slice(0, 80)}`, geo).catch(() => false)
        if (blocked) return blockedResponse(path)
      }
      // 3-b) 반복 스캐닝/스크래핑·API 남용 → 임계값 초과 시 자동 차단
      const recent = await countRecentSuspicious(db, ip, 10).catch(() => 0)
      if (recent > ABUSE_THRESHOLD) {
        const blocked = await autoBlockIp(db, ip, `반복 의심요청 자동 차단 (10분 내 ${recent}회 · 스크래핑/API 남용 의심)`, geo).catch(() => false)
        if (blocked) {
          await logSecurity(db, { ip, method: request.method, path, status: 403, severity: 'high', detail: `자동 차단(남용 임계 초과 ${recent}회)`, country: geo.country, city: geo.city, ua }).catch(() => {})
          return blockedResponse(path)
        }
      }
    }
  }

  // 들어오는 JSON 본문에서 "원시값으로 바꿀 수 없는 값" 을 무력화한다.
  const safe = await defusedRequest(request, path)

  let res: Response
  try {
    res = safe ? await next(safe) : await next()
  } catch (err: any) {
    // 처리기에서 새어 나온 예외 — 여기서 잡지 않으면 스택 추적이 그대로 본문에 실린다.
    await logSecurity(resolveDB(env), {
      ip: clientIp(request), method: request.method, path, status: 500, severity: 'medium',
      detail: `처리 중 예외: ${String(err?.message || err).slice(0, 200)}`,
      country: geoFrom(request).country, city: geoFrom(request).city,
      ua: request.headers.get('User-Agent') || '',
    }).catch(() => {})
    const out = path.startsWith('/api/')
      ? json({ ok: false, error: '요청을 처리하지 못했습니다.' }, 500)
      : new Response('Internal Server Error', { status: 500 })
    return withSecurityHeaders(out, path)
  }
  return withSecurityHeaders(res, path)
}

/**
 * {"toString":1} 같은 값은 String()/Number() 에 넣는 순간 TypeError 를 던진다.
 * 본문 값을 그대로 String() 에 넘기는 곳이 곳곳에 있어(로그인·문의 같은 비로그인 경로 포함)
 * 그 한 줄로 400 이어야 할 요청이 500 이 됐다. 문턱에서 한 번에 막는다.
 * toString·valueOf·__proto__·constructor 는 JSON 본문의 키로 쓰일 이유가 없다.
 */
function defuse(v: any, depth = 0): any {
  if (v === null || typeof v !== 'object' || depth > 12) return v
  if (Array.isArray(v)) return v.map((x) => defuse(x, depth + 1))
  const out: any = {}
  for (const k of Object.keys(v)) {
    if (k === 'toString' || k === 'valueOf' || k === '__proto__' || k === 'constructor') continue
    out[k] = defuse(v[k], depth + 1)
  }
  return out
}

/** 손 볼 필요가 있을 때만 본문을 다시 만든다(평상시 요청은 그대로 흘려보낸다) */
async function defusedRequest(request: Request, path: string): Promise<Request | undefined> {
  try {
    if (!path.startsWith('/api/')) return undefined
    const m = request.method.toUpperCase()
    if (m === 'GET' || m === 'HEAD') return undefined
    if (!/application\/json/i.test(request.headers.get('content-type') || '')) return undefined
    // 서명이 붙은 요청(웹훅)은 본문 바이트 그대로가 서명 대상이다 — 한 글자만 바뀌어도 검증이 깨진다.
    for (const h of ['x-hub-signature', 'x-hub-signature-256', 'x-signature', 'x-signature-256', 'stripe-signature']) {
      if (request.headers.get(h)) return undefined
    }
    const raw = await request.clone().text()
    // 문제되는 키가 없으면(거의 모든 요청) 아무것도 하지 않는다
    if (!raw || raw.length > 2_000_000 || !/"(toString|valueOf|__proto__|constructor)"\s*:/.test(raw)) return undefined
    return new Request(request, { body: JSON.stringify(defuse(JSON.parse(raw))) })
  } catch {
    return undefined // 파싱 실패는 각 처리기가 알아서 400 으로 돌려준다
  }
}

// 응답에 보안 헤더 부착 (문서 응답에 한함 — 정적 자산/_next는 위에서 이미 통과)
function withSecurityHeaders(res: Response, path: string): Response {
  try {
    const ct = res.headers.get('content-type') || ''
    // API(JSON)와 HTML 문서에만 적용. 리다이렉트/스트림 등은 헤더만 얹어도 안전.
    const h = new Headers(res.headers)
    h.set('X-Content-Type-Options', 'nosniff')
    h.set('X-Frame-Options', 'SAMEORIGIN')
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    h.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()')
    h.set('Cross-Origin-Opener-Policy', 'same-origin')
    h.set('X-XSS-Protection', '0')
    if (ct.includes('text/html')) {
      // 클릭재킹 방지 + 인라인 스크립트 허용(정적 export 특성상 unsafe-inline 필요)
      h.set('Content-Security-Policy', "frame-ancestors 'self'")
    }
    if (path.startsWith('/api/')) h.set('X-Robots-Tag', 'noindex')
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
  } catch {
    return res
  }
}

// 관리자 콘솔 접근 잠금 차단 응답
function adminBlockedResponse(path: string) {
  if (path.startsWith('/api/')) return json({ ok: false, error: '관리자 접근이 제한되었습니다. 허용된 IP 또는 기기에서만 접근할 수 있습니다.', adminLocked: true }, 403)
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>관리자 접근 제한</title>
     <style>body{margin:0;height:100vh;display:grid;place-items:center;font-family:'Inter','Noto Sans KR',system-ui,sans-serif;background:#0c0e13;color:#e6e9f2}
     .b{text-align:center;max-width:440px;padding:36px}
     .m{width:60px;height:60px;margin:0 auto 18px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:grid;place-items:center}
     .m svg{width:30px;height:30px;stroke:#fff;fill:none;stroke-width:2}
     h1{font-size:21px;margin:0 0 10px;font-weight:800}p{color:#9aa4b2;line-height:1.7;font-size:14px;margin:0}</style></head>
     <body><div class="b">
       <div class="m"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
       <h1>관리자 접근이 제한되었습니다</h1>
       <p>이 관리자 콘솔은 허용된 IP 주소 또는 등록된 기기에서만 접근할 수 있습니다.<br>접근이 필요하면 등록된 기기에서 다시 시도하거나 관리자에게 문의해 주세요.</p>
     </div></body></html>`,
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

function blockedResponse(path: string, whitelist = false) {
  if (path.startsWith('/api/')) return json({ ok: false, error: '접근이 차단되었습니다.' }, 403)
  const msg = whitelist
    ? '현재 사이트는 허용된 IP에서만 접근할 수 있습니다(화이트리스트 모드). 접근 권한이 필요하시면 관리자에게 문의해 주세요.'
    : '귀하의 IP는 보안 정책에 의해 이 사이트 접근이 제한되었습니다. 오류라고 생각되시면 관리자에게 문의해 주세요.'
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>접근 차단</title>
     <style>body{margin:0;height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#0a0f1e;color:#e5e7eb}
     .b{text-align:center;max-width:420px;padding:32px}h1{font-size:22px;margin:0 0 10px}p{color:#9aa4b2;line-height:1.6;font-size:14px}</style></head>
     <body><div class="b"><h1>🛡️ 접근이 차단되었습니다</h1><p>${msg}</p></div><script src="/emoji-parser.js" defer></script></body></html>`,
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}
