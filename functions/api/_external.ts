// 외부 API 연동 헬퍼 — 환경변수 미설정 시 { error } 반환(호출부에서 크레딧 환불/폴백 처리)

/** 네이버 검색 오픈API (blog | local) — NAVER_CLIENT_ID / NAVER_CLIENT_SECRET */
export async function naverSearch(
  env: any,
  type: 'blog' | 'local' | 'webkr',
  query: string,
  opts: { display?: number; sort?: string } = {},
): Promise<{ ok: boolean; error?: string; data?: any }> {
  const id = env?.NAVER_CLIENT_ID
  const secret = env?.NAVER_CLIENT_SECRET
  if (!id || !secret) return { ok: false, error: 'NAVER_CLIENT_ID/SECRET 환경변수 미설정' }
  const url = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=${opts.display || 10}${opts.sort ? `&sort=${opts.sort}` : ''}`
  try {
    const res = await fetch(url, { headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret } })
    if (!res.ok) return { ok: false, error: `네이버 API 오류 (${res.status})` }
    return { ok: true, data: await res.json() }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 120) }
  }
}

/** Resend 이메일 발송 — RESEND_API_KEY / RESEND_FROM */
export async function resendEmail(
  env: any,
  o: { to: string | string[]; subject: string; html: string; from?: string },
): Promise<{ ok: boolean; error?: string; id?: string }> {
  // 환경변수 이름 대소문자 혼용 허용 (RESEND_API_KEY / resend_API_KEY)
  const key = env?.RESEND_API_KEY || env?.resend_API_KEY || env?.RESEND_KEY
  // 발신 주소 우선순위: 명시 인자 > 환경변수 > 기본값(cs@bygency.co)
  const from = o.from || env?.RESEND_FROM || 'BYGENCY <cs@bygency.co>'
  if (!key) return { ok: false, error: 'RESEND_API_KEY 환경변수 미설정' }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: o.to, subject: o.subject, html: o.html }),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data?.message || `Resend 오류 (${res.status})` }
    return { ok: true, id: data?.id }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 120) }
  }
}

/** Toss Payments 결제 승인 — TOSS_SECRET_KEY */
export async function tossConfirm(
  env: any,
  o: { paymentKey: string; orderId: string; amount: number },
): Promise<{ ok: boolean; error?: string; data?: any }> {
  const secret = env?.TOSS_SECRET_KEY || env?.TOSS_API_PG_SECRET || env?.TOSS_PG_SECRET_KEY
  if (!secret) return { ok: false, error: 'TOSS_SECRET_KEY 환경변수 미설정' }
  try {
    const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(secret + ':')}` },
      body: JSON.stringify({ paymentKey: o.paymentKey, orderId: o.orderId, amount: o.amount }),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data?.message || `Toss 승인 오류 (${res.status})`, data }
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 120) }
  }
}

// 카카오 알림톡은 알리고(Aligo)로 이관됨 → functions/api/_aligo.ts 의 aligoAlimtalk 사용
