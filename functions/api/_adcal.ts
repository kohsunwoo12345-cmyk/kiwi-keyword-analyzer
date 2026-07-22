// 광고 집행 캘린더 공유 토큰 (HMAC-SHA256 서명) — 서명/검증 공용 (_ 프리픽스 = import 전용)
//  토큰 payload: { aid: <advertiser_id | "_general">, k: "adcal" }
//  ad-campaigns.ts(발급) 와 adcal/[token] 공개 페이지(검증) 가 같은 비밀키를 써야 한다.

function secretOf(env: any): string {
  return String((env && (env.ADCAL_SECRET || env.ADCAL_SHARE_SECRET)) || 'bygency_adcal_share_2026_v1')
}

function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(b: string): string {
  const s = b.replace(/-/g, '+').replace(/_/g, '/')
  const p = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  return new TextDecoder().decode(Uint8Array.from(atob(s + p), (c) => c.charCodeAt(0)))
}
async function hmacKey(env: any): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secretOf(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

/** 광고주 캘린더 공유 토큰 발급 */
export async function signAdcalShare(env: any, advertiserId: string): Promise<string> {
  const payload = b64urlEncode(JSON.stringify({ aid: String(advertiserId), k: 'adcal' }))
  const key = await hmacKey(env)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return payload + '.' + sigB64
}

/** 공유 토큰 검증 → { aid } | null */
export async function verifyAdcalShare(env: any, token: string): Promise<{ aid: string } | null> {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  try {
    const key = await hmacKey(env)
    const ok = await crypto.subtle.verify(
      'HMAC', key,
      Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
      new TextEncoder().encode(payload),
    )
    if (!ok) return null
    const p = JSON.parse(fromB64url(payload))
    if (p.k !== 'adcal' || !p.aid) return null
    return { aid: String(p.aid) }
  } catch {
    return null
  }
}
