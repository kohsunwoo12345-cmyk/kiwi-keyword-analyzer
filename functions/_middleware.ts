import { resolveDB, clientIp, isBlocked, logSecurity, json } from './api/_utils'

// 정적 자산은 건너뜀(성능). 문서/‑API 요청만 보안 검사.
const ASSET_RE = /\.(js|mjs|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map|txt|xml|json)$/i
const SUSPICIOUS_RE = /(\.env|\.git|wp-admin|wp-login|phpmyadmin|xmlrpc|\/\.\.|sqlmap|union\s+select|eval\(|base64_|\/etc\/passwd)/i

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env, next } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (ASSET_RE.test(path) || path.startsWith('/_next/')) return next()

  const db = resolveDB(env)
  if (db) {
    const ip = clientIp(request)
    try {
      if (await isBlocked(db, ip)) {
        await logSecurity(db, { ip, method: request.method, path, status: 403, severity: 'high', detail: '차단된 IP 접근 시도' })
        return blockedResponse(path)
      }
    } catch {
      /* 테이블 미생성 등 무시 */
    }
    if (SUSPICIOUS_RE.test(path + url.search)) {
      await logSecurity(db, { ip, method: request.method, path, status: 0, severity: 'warn', detail: '의심 경로 접근' }).catch(() => {})
    }
  }

  return next()
}

function blockedResponse(path: string) {
  if (path.startsWith('/api/')) return json({ ok: false, error: '접근이 차단되었습니다.' }, 403)
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>접근 차단</title>
     <style>body{margin:0;height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#0a0f1e;color:#e5e7eb}
     .b{text-align:center;max-width:420px;padding:32px}h1{font-size:22px;margin:0 0 10px}p{color:#9aa4b2;line-height:1.6;font-size:14px}</style></head>
     <body><div class="b"><h1>🛡️ 접근이 차단되었습니다</h1><p>귀하의 IP는 보안 정책에 의해 이 사이트 접근이 제한되었습니다. 오류라고 생각되시면 관리자에게 문의해 주세요.</p></div></body></html>`,
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}
