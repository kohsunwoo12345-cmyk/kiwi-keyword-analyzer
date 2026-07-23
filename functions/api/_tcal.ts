// 팀 집행 캘린더 공유 토큰 (HMAC-SHA256) — 발급/검증 공용.
//  토큰 payload: { bid: <board_id>, k: "tcal" }
//  team.ts(발급) 와 tcal/[token] 공개 페이지(검증) 가 같은 비밀키를 써야 한다.

function secretOf(env: any): string {
  return String((env && (env.TCAL_SECRET || env.ADCAL_SECRET || env.ADCAL_SHARE_SECRET)) || 'bygency_tcal_share_2026_v1')
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

/** 캘린더 보드 공유 토큰 발급 */
export async function signTcalShare(env: any, boardId: string): Promise<string> {
  const payload = b64urlEncode(JSON.stringify({ bid: String(boardId), k: 'tcal' }))
  const key = await hmacKey(env)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return payload + '.' + sigB64
}

/** 공유 토큰 검증 → { bid } | null */
export async function verifyTcalShare(env: any, token: string): Promise<{ bid: string } | null> {
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
    if (p.k !== 'tcal' || !p.bid) return null
    return { bid: String(p.bid) }
  } catch {
    return null
  }
}
