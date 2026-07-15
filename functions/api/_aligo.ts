// 알리고(Aligo) 문자·알림톡 발송 헬퍼
// 환경변수:
//   ALIGO_API_KEY   : 알리고 API 키 (필수)
//   ALIGO_USER_ID   : 알리고 아이디 (필수)
//   ALIGO_SENDER    : 등록된 발신번호 (SMS/알림톡 발신, 필수)
//   ALIGO_SENDER_KEY: 알림톡 발신프로필 키(senderkey) (알림톡 필수)
//   ALIGO_PROXY_URL : (선택) Vultr 고정 IP 프록시 URL. 설정 시 모든 알리고 호출을
//                     이 프록시로 보내 고정 IP(141.164.36.76)에서 알리고로 나가게 함.
//   ALIGO_PROXY_TOKEN: (선택) 프록시 인증 토큰(오픈 릴레이 방지)
// 미설정 시 { sent:false, reason } 반환 (알림/로그는 이미 대시보드에 저장됨)

const SMS_URL = 'https://apis.aligo.in/send/'
const SMS_MASS_URL = 'https://apis.aligo.in/send_mass/'
const REMAIN_URL = 'https://apis.aligo.in/remain/'
const TOKEN_URL = 'https://kakaoapi.aligo.in/akv10/token/create/30/s/'
const ALIMTALK_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/'
const TEMPLATE_LIST_URL = 'https://kakaoapi.aligo.in/akv10/template/list/'

function onlyDigits(s: any): string {
  return String(s || '').replace(/[^0-9]/g, '')
}

function formBody(params: Record<string, any>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    usp.append(k, String(v))
  }
  return usp.toString()
}

/**
 * 알리고 API 호출. ALIGO_PROXY_URL 이 설정되어 있으면 프록시를 경유(고정 IP)해서
 * 대상 알리고 URL 로 전달한다. 프록시는 X-Aligo-Target 헤더의 URL 로 그대로 포워딩한다.
 */
async function aligoCall(env: any, target: string, params: Record<string, any>): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const body = formBody(params)
  const proxy = String(env?.ALIGO_PROXY_URL || '').trim()
  try {
    let res: Response
    if (proxy) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'X-Aligo-Target': target,
      }
      const token = String(env?.ALIGO_PROXY_TOKEN || '').trim()
      if (token) headers['X-Aligo-Token'] = token
      res = await fetch(proxy, { method: 'POST', headers, body })
    } else {
      res = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
        body,
      })
    }
    const raw = await res.text()
    let data: any = {}
    try { data = raw ? JSON.parse(raw) : {} } catch { data = { _raw: raw } }
    return { ok: res.ok, status: res.status, data }
  } catch (e: any) {
    return { ok: false, status: 0, data: {}, error: String(e?.message || e).slice(0, 160) }
  }
}

export function aligoConfigured(env: any): boolean {
  return !!(env?.ALIGO_API_KEY && env?.ALIGO_USER_ID && String(env?.ALIGO_SENDER || '').trim())
}
export function aligoAlimtalkConfigured(env: any): boolean {
  return !!(env?.ALIGO_API_KEY && env?.ALIGO_USER_ID && String(env?.ALIGO_SENDER_KEY || '').trim())
}

/** SMS/LMS 발송 (동일 내용 → 여러 수신자 가능). 성공 여부 반환. */
export async function sendSms(
  env: any,
  to: string | string[],
  text: string,
  opts: { title?: string; msgType?: 'SMS' | 'LMS' | 'MMS' } = {},
): Promise<{ sent: boolean; reason?: string; status?: number; successCnt?: number; errorCnt?: number }> {
  const key = String(env?.ALIGO_API_KEY || '').trim()
  const userId = String(env?.ALIGO_USER_ID || '').trim()
  const sender = onlyDigits(env?.ALIGO_SENDER)
  if (!key || !userId || !sender) return { sent: false, reason: '알리고 환경변수(ALIGO_API_KEY/USER_ID/SENDER) 미설정' }

  const recipients = (Array.isArray(to) ? to : [to]).map(onlyDigits).filter((t) => t.length >= 10)
  if (recipients.length === 0) return { sent: false, reason: '수신 전화번호 없음' }
  const receiver = recipients.join(',')

  // 90byte(한글 45자) 초과면 LMS 로 자동 판정
  const msgType = opts.msgType || (byteLen(text) > 90 ? 'LMS' : 'SMS')
  const params: Record<string, any> = {
    key, user_id: userId, sender, receiver, msg: text, msg_type: msgType,
  }
  if (msgType !== 'SMS' && opts.title) params.title = opts.title.slice(0, 44)

  const r = await aligoCall(env, SMS_URL, params)
  if (r.error) return { sent: false, reason: r.error, status: r.status }
  const code = Number(r.data?.result_code)
  if (code > 0) {
    return { sent: true, status: r.status, successCnt: Number(r.data?.success_cnt) || recipients.length, errorCnt: Number(r.data?.error_cnt) || 0 }
  }
  return { sent: false, status: r.status, reason: r.data?.message || `알리고 응답코드 ${r.data?.result_code ?? r.status}` }
}

/** 알림톡 인증 토큰 발급 (30초 유효) */
async function createAlimtalkToken(env: any): Promise<{ ok: boolean; token?: string; error?: string }> {
  const key = String(env?.ALIGO_API_KEY || '').trim()
  const userId = String(env?.ALIGO_USER_ID || '').trim()
  const r = await aligoCall(env, TOKEN_URL, { apikey: key, userid: userId })
  if (r.error) return { ok: false, error: r.error }
  if (Number(r.data?.code) === 0 && r.data?.token) return { ok: true, token: r.data.token }
  return { ok: false, error: r.data?.message || `토큰 발급 실패 (${r.data?.code ?? r.status})` }
}

/**
 * 알림톡 발송 (템플릿 기반). 다수 수신자는 receiver_1..N 규격 사용.
 * items: [{ to, message, subject?, button? }]  — message 는 템플릿 치환 완료된 최종 문구
 * failoverText 지정 시 실패건 SMS 대체발송.
 */
export async function aligoAlimtalk(
  env: any,
  o: {
    tplCode: string
    items: { to: string; message: string; subject?: string; button?: any }[]
    senderKey?: string
    failover?: boolean
  },
): Promise<{ ok: boolean; sent?: number; error?: string; data?: any }> {
  const key = String(env?.ALIGO_API_KEY || '').trim()
  const userId = String(env?.ALIGO_USER_ID || '').trim()
  const sender = onlyDigits(env?.ALIGO_SENDER)
  const senderKey = String(o.senderKey || env?.ALIGO_SENDER_KEY || '').trim()
  if (!key || !userId || !sender) return { ok: false, error: '알리고 환경변수(ALIGO_API_KEY/USER_ID/SENDER) 미설정' }
  if (!senderKey) return { ok: false, error: '알림톡 발신프로필 키(ALIGO_SENDER_KEY)가 필요합니다.' }
  if (!o.tplCode) return { ok: false, error: '알림톡 템플릿 코드(tpl_code)가 필요합니다.' }

  const items = (o.items || []).filter((i) => onlyDigits(i.to).length >= 10 && String(i.message || '').trim())
  if (items.length === 0) return { ok: false, error: '유효한 수신자/내용이 없습니다.' }

  const tok = await createAlimtalkToken(env)
  if (!tok.ok) return { ok: false, error: tok.error }

  const params: Record<string, any> = {
    apikey: key, userid: userId, token: tok.token, senderkey: senderKey,
    tpl_code: o.tplCode, sender,
  }
  items.forEach((it, idx) => {
    const n = idx + 1
    params[`receiver_${n}`] = onlyDigits(it.to)
    params[`subject_${n}`] = (it.subject || '알림톡').slice(0, 50)
    params[`message_${n}`] = it.message
    if (it.button) params[`button_${n}`] = typeof it.button === 'string' ? it.button : JSON.stringify(it.button)
    if (o.failover) {
      params[`failover_${n}`] = 'Y'
      params[`fsubject_${n}`] = (it.subject || 'BYGENCY').slice(0, 44)
      params[`fmessage_${n}`] = it.message
    }
  })

  const r = await aligoCall(env, ALIMTALK_URL, params)
  if (r.error) return { ok: false, error: r.error }
  if (Number(r.data?.code) === 0) {
    const cnt = Number(r.data?.info?.scnt) || items.length
    return { ok: true, sent: cnt, data: r.data }
  }
  return { ok: false, error: r.data?.message || `알림톡 응답코드 ${r.data?.code ?? r.status}`, data: r.data }
}

/** 알림톡 템플릿 목록 조회 (발신프로필 기준) */
export async function aligoTemplates(env: any, senderKey?: string): Promise<{ ok: boolean; templates?: any[]; error?: string }> {
  const key = String(env?.ALIGO_API_KEY || '').trim()
  const userId = String(env?.ALIGO_USER_ID || '').trim()
  const sk = String(senderKey || env?.ALIGO_SENDER_KEY || '').trim()
  if (!key || !userId || !sk) return { ok: false, error: '알리고 환경변수/발신프로필 키 미설정' }
  const tok = await createAlimtalkToken(env)
  if (!tok.ok) return { ok: false, error: tok.error }
  const r = await aligoCall(env, TEMPLATE_LIST_URL, { apikey: key, userid: userId, token: tok.token, senderkey: sk })
  if (r.error) return { ok: false, error: r.error }
  if (Number(r.data?.code) === 0) {
    const list = r.data?.list || []
    const templates = list.map((t: any) => ({
      templateId: t.templtCode || t.templateCode || '',
      name: t.templtName || t.templateName || '',
      content: t.templtContent || t.templateContent || '',
      status: t.status || t.inspStatus || '',
      messageType: t.templtMessageType || 'BA',
      buttons: t.buttons || [],
      dateCreated: t.cdate || '',
    }))
    return { ok: true, templates }
  }
  return { ok: false, error: r.data?.message || `템플릿 조회 실패 (${r.data?.code ?? r.status})` }
}

/** 잔여 문자 건수 조회 (health/디버그용) */
export async function aligoRemain(env: any): Promise<{ ok: boolean; sms?: number; lms?: number; mms?: number; error?: string }> {
  const key = String(env?.ALIGO_API_KEY || '').trim()
  const userId = String(env?.ALIGO_USER_ID || '').trim()
  if (!key || !userId) return { ok: false, error: '알리고 환경변수 미설정' }
  const r = await aligoCall(env, REMAIN_URL, { key, user_id: userId })
  if (r.error) return { ok: false, error: r.error }
  if (Number(r.data?.result_code) === 1) {
    return { ok: true, sms: Number(r.data?.SMS_CNT) || 0, lms: Number(r.data?.LMS_CNT) || 0, mms: Number(r.data?.MMS_CNT) || 0 }
  }
  return { ok: false, error: r.data?.message || `잔여 조회 실패 (${r.data?.result_code ?? r.status})` }
}

/** 한글 2byte 기준 바이트 길이 (SMS/LMS 판정용) */
function byteLen(s: string): number {
  let n = 0
  for (const ch of String(s || '')) n += ch.charCodeAt(0) > 0x7f ? 2 : 1
  return n
}
