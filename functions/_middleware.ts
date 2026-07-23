import { resolveDB, clientIp, geoFrom, isBlocked, isWhitelistMode, isWhitelisted, logSecurity, json, countRecentSuspicious, autoBlockIp, isAdminLockEnabled, isAdminAccessAllowed, parseCookies, ADMIN_DEVICE_COOKIE } from './api/_utils'

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

// 화이트리스트 모드에서도 항상 허용해야 관리자가 복구 가능
const WHITELIST_ALLOW_RE = /^\/(login|api\/(login|me|logout|admin\/)|adminsunkoh028741_11263)/

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env, next } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (ASSET_RE.test(path) || path.startsWith('/_next/')) return next()

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
      //   · 관리자 잠금 관리 API(/api/admin/access-lock)는 예외로 두어 잠금을 해제/복구할 수 있게 한다
      //     (엔드포인트 자체가 requireAdminUser 로 보호됨 — 로그인한 관리자만 접근).
      if ((path.startsWith(ADMIN_BASE) || path.startsWith(ADMIN_API)) && !path.startsWith(ADMIN_API + 'access-lock')) {
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

  const res = await next()
  return withSecurityHeaders(res, path)
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
