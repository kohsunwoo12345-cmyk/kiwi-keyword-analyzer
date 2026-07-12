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
  const key = env?.RESEND_API_KEY
  const from = o.from || env?.RESEND_FROM
  if (!key || !from) return { ok: false, error: 'RESEND_API_KEY/RESEND_FROM 환경변수 미설정' }
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

/** Solapi 카카오 알림톡 발송 — SOLAPI_API_KEY/SECRET + pfId/templateId */
export async function solapiAlimtalk(
  env: any,
  o: { to: string; templateId: string; pfId: string; text: string; variables?: Record<string, string> },
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = env?.SOLAPI_API_KEY
  const apiSecret = env?.SOLAPI_API_SECRET
  const from = String(env?.SOLAPI_SENDER || '').replace(/[^0-9]/g, '')
  if (!apiKey || !apiSecret || !from) return { ok: false, error: 'SOLAPI 환경변수 미설정' }
  if (!o.pfId || !o.templateId) return { ok: false, error: '알림톡 채널(pfId)·템플릿(templateId)이 필요합니다.' }
  const enc = new TextEncoder()
  const date = new Date().toISOString()
  const salt = crypto.randomUUID().replace(/-/g, '')
  const keyObj = await crypto.subtle.importKey('raw', enc.encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', keyObj, enc.encode(date + salt))
  const signature = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  try {
    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: o.to, from, text: o.text,
          kakaoOptions: { pfId: o.pfId, templateId: o.templateId, variables: o.variables || {}, disableSms: false },
        },
      }),
    })
    return res.ok ? { ok: true } : { ok: false, error: `알림톡 응답 ${res.status}` }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 120) }
  }
}
