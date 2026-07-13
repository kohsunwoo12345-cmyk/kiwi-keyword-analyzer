// Solapi(솔라피) SMS 발송 헬퍼 — 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER
// 미설정 시 { sent:false, reason } 반환 (알림은 이미 대시보드에 저장됨)

async function hmacSha256Hex(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Solapi HMAC-SHA256 Authorization 헤더 생성 (카카오 채널/템플릿 조회 등 raw API 호출용) */
export async function makeSolapiAuthHeader(apiKey: string, apiSecret: string): Promise<string> {
  const date = new Date().toISOString()
  const salt = crypto.randomUUID().replace(/-/g, '')
  const signature = await hmacSha256Hex(apiSecret, date + salt)
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

export async function sendSms(
  env: any,
  to: string,
  text: string,
): Promise<{ sent: boolean; reason?: string; status?: number }> {
  const apiKey = env?.SOLAPI_API_KEY
  const apiSecret = env?.SOLAPI_API_SECRET
  const from = String(env?.SOLAPI_SENDER || '').replace(/[^0-9]/g, '')
  if (!apiKey || !apiSecret || !from) return { sent: false, reason: 'Solapi 환경변수(SOLAPI_API_KEY/SECRET/SENDER) 미설정' }
  if (!to || to.length < 10) return { sent: false, reason: '수신 전화번호 없음' }

  // Solapi HMAC-SHA256 인증
  const date = new Date().toISOString()
  const salt = crypto.randomUUID().replace(/-/g, '')
  const signature = await hmacSha256Hex(apiSecret, date + salt)
  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`

  try {
    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authorization },
      body: JSON.stringify({ message: { to, from, text } }),
    })
    const ok = res.ok
    return { sent: ok, status: res.status, reason: ok ? undefined : `Solapi 응답 ${res.status}` }
  } catch (e: any) {
    return { sent: false, reason: String(e?.message || e) }
  }
}
