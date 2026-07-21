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

/** 환경변수 조회 — 이름 대소문자를 가리지 않고(Cloudflare 는 대소문자 구분) 찾는다. */
function envAny(env: any, ...names: string[]): string {
  if (!env) return ''
  // 1) 정확히 일치 우선
  for (const n of names) { const v = env[n]; if (v && String(v).trim()) return String(v).trim() }
  // 2) 대소문자 무시 매칭 (예: Resend_API_KEY / resend_api_key)
  const wanted = new Set(names.map((n) => n.toLowerCase()))
  for (const k of Object.keys(env)) {
    if (wanted.has(k.toLowerCase())) { const v = env[k]; if (v && String(v).trim()) return String(v).trim() }
  }
  return ''
}

// 이메일에 들어갈 로고(호스팅 PNG — 이메일 클라이언트 호환성 위해 인라인 SVG 대신 이미지 사용)
const EMAIL_LOGO_URL = 'https://bygency.co/brand/app-icon.png'
const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_cxdNfX'

/** 브랜드 이메일 공통 셸 — 상단 로고 + 본문 + 푸터. innerHtml 만 넣으면 로고가 포함된 메일이 완성된다. */
export function emailShell(innerHtml: string): string {
  return `
  <div style="background:#f6f7fb;padding:32px 0;font-family:system-ui,-apple-system,'Segoe UI','Malgun Gothic',sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #eef0f4;border-radius:18px;overflow:hidden">
      <div style="padding:24px 28px 8px;text-align:center">
        <img src="${EMAIL_LOGO_URL}" alt="BYGENCY" width="44" height="44" style="display:inline-block;border-radius:11px;vertical-align:middle" />
        <span style="display:inline-block;margin-left:10px;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#1d4ed8;vertical-align:middle">BYGENCY</span>
      </div>
      <div style="padding:8px 28px 28px;color:#0f172a">${innerHtml}</div>
      <div style="padding:20px 28px;background:#fafbfd;border-top:1px solid #eef0f4;text-align:center">
        <p style="margin:0 0 12px;color:#475569;font-size:13px;font-weight:600">궁금한 점이 있으신가요?</p>
        <p style="margin:0 0 14px;color:#94a3b8;font-size:12px;line-height:1.6">카카오톡 채널로 편하게 문의하시거나, 이메일로 문의해 주세요.</p>
        <a href="${KAKAO_CHANNEL_URL}" target="_blank" style="display:inline-block;background:#FEE500;color:#191600;font-size:13px;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:10px">💬 카카오톡 채널 문의</a>
        <a href="mailto:cs@bygency.co" style="display:inline-block;margin-left:8px;background:#ffffff;color:#334155;font-size:13px;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:10px;border:1px solid #e2e8f0">✉️ 이메일 문의</a>
        <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">© BYGENCY · <a href="mailto:cs@bygency.co" style="color:#94a3b8">cs@bygency.co</a> · <a href="${KAKAO_CHANNEL_URL}" style="color:#94a3b8">카카오톡 채널</a></p>
      </div>
    </div>
  </div>`
}

/** Resend 이메일 발송 — RESEND_API_KEY(대소문자 무관) / 발신 기본 cs@bygency.co.
 *  log.db 를 넘기면 email_log 테이블에 발송 이력(수신/발신/제목/내용/상태/시각)을 기록한다. */
export async function resendEmail(
  env: any,
  o: { to: string | string[]; subject: string; html: string; from?: string; scheduledAt?: string },
  log?: { db?: any; kind?: string; userId?: string },
): Promise<{ ok: boolean; error?: string; id?: string }> {
  // 환경변수 이름 대소문자 무관 (RESEND_API_KEY / Resend_API_KEY / resend_api_key 등 모두 허용)
  const key = envAny(env, 'RESEND_API_KEY', 'RESEND_KEY', 'RESEND_APIKEY')
  // 발신 주소 우선순위: 명시 인자 > 환경변수 > 기본값(cs@bygency.co)
  const from = o.from || envAny(env, 'RESEND_FROM') || 'BYGENCY <cs@bygency.co>'
  const toStr = Array.isArray(o.to) ? o.to.join(', ') : String(o.to || '')

  const record = async (status: string, resendId: string, error: string) => {
    if (!log?.db) return
    try {
      await log.db.prepare(
        `INSERT INTO email_log (id, to_email, from_email, subject, kind, status, resend_id, error, body, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        'em_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18),
        toStr, from, String(o.subject || '').slice(0, 300), String(log.kind || 'general'),
        status, resendId || '', error.slice(0, 400), String(o.html || '').slice(0, 20000),
        log.userId || '', new Date().toISOString(),
      ).run()
    } catch { /* 로그 실패는 발송에 영향 없음 */ }
  }

  if (!key) { await record('failed', '', 'RESEND_API_KEY 환경변수 미설정'); return { ok: false, error: 'RESEND_API_KEY 환경변수 미설정' } }
  try {
    const payload: any = { from, to: o.to, subject: o.subject, html: o.html }
    if (o.scheduledAt) payload.scheduled_at = o.scheduledAt // Resend 예약 발송(ISO8601)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) { const err = data?.message || `Resend 오류 (${res.status})`; await record('failed', '', err); return { ok: false, error: err } }
    await record(o.scheduledAt ? 'scheduled' : 'sent', data?.id || '', '')
    return { ok: true, id: data?.id }
  } catch (e: any) {
    const err = String(e?.message || e).slice(0, 120)
    await record('failed', '', err)
    return { ok: false, error: err }
  }
}

/** Resend 배치 발송 (최대 100건/호출) — 대량 마케팅 이메일용. 각 건을 email_log 에 기록. */
export async function resendBatch(
  env: any,
  items: { to: string; subject: string; html: string; from?: string }[],
  log?: { db?: any; kind?: string },
): Promise<{ ok: boolean; sent: number; failed: number; error?: string }> {
  const key = envAny(env, 'RESEND_API_KEY', 'RESEND_KEY', 'RESEND_APIKEY')
  const defFrom = envAny(env, 'RESEND_FROM') || 'BYGENCY <cs@bygency.co>'
  const list = (items || []).filter((i) => i && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(i.to || '')))
  if (!list.length) return { ok: false, sent: 0, failed: 0, error: '유효한 수신 이메일이 없습니다.' }
  if (!key) return { ok: false, sent: 0, failed: list.length, error: 'RESEND_API_KEY 환경변수 미설정' }

  const recordMany = async (status: string, err: string) => {
    if (!log?.db) return
    for (const it of list) {
      try {
        await log.db.prepare(
          `INSERT INTO email_log (id, to_email, from_email, subject, kind, status, resend_id, error, body, user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind('em_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18), it.to, it.from || defFrom,
          String(it.subject || '').slice(0, 300), String(log.kind || 'campaign'), status, '', err.slice(0, 400),
          String(it.html || '').slice(0, 20000), '', new Date().toISOString()).run()
      } catch { /* ignore */ }
    }
  }

  try {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(list.map((i) => ({ from: i.from || defFrom, to: i.to, subject: i.subject, html: i.html }))),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) { const err = data?.message || `Resend 배치 오류 (${res.status})`; await recordMany('failed', err); return { ok: false, sent: 0, failed: list.length, error: err } }
    await recordMany('sent', '')
    return { ok: true, sent: list.length, failed: 0 }
  } catch (e: any) {
    const err = String(e?.message || e).slice(0, 120)
    await recordMany('failed', err)
    return { ok: false, sent: 0, failed: list.length, error: err }
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
