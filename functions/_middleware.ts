import { resolveDB, clientIp, geoFrom, isBlocked, isWhitelistMode, isWhitelisted, logSecurity, json } from './api/_utils'

// 정적 자산은 건너뜀(성능). 문서/‑API 요청만 보안 검사.
const ASSET_RE = /\.(js|mjs|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map|txt|xml|json)$/i
// 의심 경로/페이로드 (SQL 인젝션 · 경로 탐색 · 알려진 스캐너 경로)
const SUSPICIOUS_RE = /(\.env|\.git|wp-admin|wp-login|phpmyadmin|xmlrpc|\/\.\.|%2e%2e|sqlmap|union\s+select|select.+from|information_schema|eval\(|base64_|\/etc\/passwd|<script|onerror=|\bor\b\s+1=1)/i
// 의심 User-Agent (자동 스캐너/공격 도구)
const BAD_UA_RE = /(sqlmap|nikto|nmap|masscan|acunetix|nessus|dirbuster|gobuster|wpscan|hydra|zgrab|semrush|python-requests\/|curl\/|libwww|httpclient)/i

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
    } catch {
      /* 테이블 미생성 등 무시 */
    }
    // 3) 이상 행동 감지 (경로/페이로드 + UA)
    const suspiciousPath = SUSPICIOUS_RE.test(decodeURIComponent(path + url.search))
    const badUa = BAD_UA_RE.test(ua)
    if (suspiciousPath || badUa) {
      await logSecurity(db, {
        ip,
        method: request.method,
        path,
        status: 0,
        severity: 'warn',
        detail: suspiciousPath ? '의심 경로/페이로드 감지' : `의심 User-Agent: ${ua.slice(0, 60)}`,
        country: geo.country,
        city: geo.city,
        ua,
      }).catch(() => {})
    }
  }

  return next()
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
     <body><div class="b"><h1>🛡️ 접근이 차단되었습니다</h1><p>${msg}</p></div></body></html>`,
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}
