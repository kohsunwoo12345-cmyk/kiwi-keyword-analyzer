// 알리고(Aligo) 문자·알림톡 발송 헬퍼
// 환경변수:
//   ALIGO_API_KEY   : 알리고 API 키 (필수)
//   ALIGO_ID_KEY    : 알리고 로그인 아이디 (필수) — ALIGO_USER_ID 도 허용
//   ALIGO_SENDER    : (선택) 시스템 발송 기본 발신번호 — 회원 발송은 등록·승인 번호 사용
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

// ───────── 한국시간(KST) 예약 발송 시각 계산 ─────────
// Cloudflare 는 UTC 로 동작하므로 KST(UTC+9) 벽시계 값을 직접 만들어 알리고에 넘긴다.
// 알리고 서버는 KST 기준이라 rdate/rtime(SMS)·senddate(알림톡)에 KST 값을 그대로 넣으면 그 시각에 발송된다.
const _pad = (n: number) => String(n).padStart(2, '0')
/** 지금부터 offsetMinutes 후의 KST 예약 시각 → SMS 용 {rdate:YYYYMMDD, rtime:HHMM} */
export function kstReserve(offsetMinutes: number): { rdate: string; rtime: string } {
  const t = new Date(Date.now() + offsetMinutes * 60_000 + 9 * 3600_000)
  return { rdate: `${t.getUTCFullYear()}${_pad(t.getUTCMonth() + 1)}${_pad(t.getUTCDate())}`, rtime: `${_pad(t.getUTCHours())}${_pad(t.getUTCMinutes())}` }
}
/** 지금부터 offsetMinutes 후의 KST 예약 시각 → 알림톡용 senddate(YYYYMMDDHHMMSS) */
export function kstSenddate(offsetMinutes: number): string {
  const t = new Date(Date.now() + offsetMinutes * 60_000 + 9 * 3600_000)
  return `${t.getUTCFullYear()}${_pad(t.getUTCMonth() + 1)}${_pad(t.getUTCDate())}${_pad(t.getUTCHours())}${_pad(t.getUTCMinutes())}${_pad(t.getUTCSeconds())}`
}
/** 관리자가 고른 KST 벽시계 문자열("YYYY-MM-DDTHH:MM") → 예약 값. 이미 KST 라 시차 계산 없이 분해만. */
export function kstStringToReserve(s: string): { rdate: string; rtime: string; senddate: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s || ''))
  if (!m) return null
  return { rdate: m[1] + m[2] + m[3], rtime: m[4] + m[5], senddate: m[1] + m[2] + m[3] + m[4] + m[5] + '00' }
}
/** timing 키워드 → 분 오프셋 (즉시/N분/N시간/N일) */
export function timingToMinutes(timing: string): number {
  switch (String(timing || '').toLowerCase()) {
    case '5min': return 5
    case '1hour': return 60
    case '1day': return 1440
    case 'immediate': default: return 0
  }
}

// 알리고 로그인 아이디(user_id). 환경변수명은 ALIGO_ID_KEY 우선, ALIGO_USER_ID 도 허용.
function aligoUserId(env: any): string {
  return String(env?.ALIGO_ID_KEY || env?.ALIGO_USER_ID || '').trim()
}
function aligoApiKey(env: any): string {
  return String(env?.ALIGO_API_KEY || '').trim()
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
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
  try {
    let res: Response
    if (proxy) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'X-Aligo-Target': target,
        'User-Agent': UA,
      }
      const token = String(env?.ALIGO_PROXY_TOKEN || '').trim()
      if (token) headers['X-Aligo-Token'] = token
      res = await fetch(proxy, { method: 'POST', headers, body })
    } else {
      res = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*' },
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

// 계정 자격증명만 확인(발신번호는 발송 시 등록된 번호를 넘김)
export function aligoConfigured(env: any): boolean {
  return !!(aligoApiKey(env) && aligoUserId(env))
}
export function aligoAlimtalkConfigured(env: any): boolean {
  return !!(aligoApiKey(env) && aligoUserId(env) && String(env?.ALIGO_SENDER_KEY || '').trim())
}

/**
 * SMS/LMS 발송 (동일 내용 → 여러 수신자 가능). 성공 여부 반환.
 * from(발신번호)는 앱에 등록·승인된 발신번호를 넘겨받는다. 미지정 시 ALIGO_SENDER(선택) 폴백.
 */
export async function sendSms(
  env: any,
  to: string | string[],
  text: string,
  opts: { from?: string; title?: string; msgType?: 'SMS' | 'LMS' | 'MMS'; rdate?: string; rtime?: string } = {},
): Promise<{ sent: boolean; reason?: string; status?: number; successCnt?: number; errorCnt?: number; reserved?: boolean }> {
  const key = aligoApiKey(env)
  const userId = aligoUserId(env)
  const sender = onlyDigits(opts.from || env?.ALIGO_SENDER)
  if (!key || !userId) return { sent: false, reason: '알리고 계정(ALIGO_API_KEY/ALIGO_USER_ID) 미설정' }
  if (!sender) return { sent: false, reason: '발신번호가 없습니다. 발신번호를 등록·승인 받아 선택해 주세요.' }

  const recipients = (Array.isArray(to) ? to : [to]).map(onlyDigits).filter((t) => t.length >= 10)
  if (recipients.length === 0) return { sent: false, reason: '수신 전화번호 없음' }
  const receiver = recipients.join(',')

  // 90byte(한글 45자) 초과면 LMS 로 자동 판정
  const msgType = opts.msgType || (byteLen(text) > 90 ? 'LMS' : 'SMS')
  const params: Record<string, any> = {
    key, user_id: userId, sender, receiver, msg: text, msg_type: msgType,
  }
  if (msgType !== 'SMS' && opts.title) params.title = opts.title.slice(0, 44)
  // 예약 발송(KST) — rdate(YYYYMMDD)+rtime(HHMM) 지정 시 그 시각에 발송
  const reserved = !!(opts.rdate && opts.rtime)
  if (reserved) { params.rdate = opts.rdate; params.rtime = opts.rtime }

  const r = await aligoCall(env, SMS_URL, params)
  if (r.error) return { sent: false, reason: r.error, status: r.status }
  const code = Number(r.data?.result_code)
  if (code > 0) {
    return { sent: true, reserved, status: r.status, successCnt: Number(r.data?.success_cnt) || recipients.length, errorCnt: Number(r.data?.error_cnt) || 0 }
  }
  return { sent: false, status: r.status, reason: r.data?.message || `알리고 응답코드 ${r.data?.result_code ?? r.status}` }
}

/** 알림톡 인증 토큰 발급 (30초 유효) */
async function createAlimtalkToken(env: any): Promise<{ ok: boolean; token?: string; error?: string }> {
  const key = aligoApiKey(env)
  const userId = aligoUserId(env)
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
    from?: string
    failover?: boolean
    senddate?: string   // KST 예약(YYYYMMDDHHMMSS)
  },
): Promise<{ ok: boolean; sent?: number; error?: string; data?: any }> {
  const key = aligoApiKey(env)
  const userId = aligoUserId(env)
  const sender = onlyDigits(o.from || env?.ALIGO_SENDER)
  const senderKey = String(o.senderKey || env?.ALIGO_SENDER_KEY || '').trim()
  if (!key || !userId) return { ok: false, error: '알리고 계정(ALIGO_API_KEY/ALIGO_USER_ID) 미설정' }
  if (!sender) return { ok: false, error: '발신번호가 없습니다. 발신번호를 등록·승인 받아 선택해 주세요.' }
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
  if (o.senddate) params.senddate = o.senddate   // KST 예약 발송
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
  const key = aligoApiKey(env)
  const userId = aligoUserId(env)
  const sk = String(senderKey || env?.ALIGO_SENDER_KEY || '').trim()
  if (!key || !userId || !sk) return { ok: false, error: '알리고 환경변수/발신프로필 키 미설정' }
  const tok = await createAlimtalkToken(env)
  if (!tok.ok) return { ok: false, error: tok.error }
  const r = await aligoCall(env, TEMPLATE_LIST_URL, { apikey: key, userid: userId, token: tok.token, senderkey: sk })
  if (r.error) return { ok: false, error: r.error }
  if (Number(r.data?.code) === 0) {
    const list = r.data?.list || []
    const templates = list.map((t: any) => {
      const insp = String(t.inspStatus || t.insp_status || '').toUpperCase()
      const raw = String(t.status || '').toUpperCase()
      // 알리고 검수상태 정규화: APPROVED / PENDING(심사중) / REGISTERED(요청전) / REJECTED
      let status = 'REGISTERED'
      if (insp === 'APR' || raw === 'A' || raw === 'APPROVED' || raw.includes('승인')) status = 'APPROVED'
      else if (insp === 'REJ' || raw.includes('반려') || raw.includes('REJECT')) status = 'REJECTED'
      else if (insp === 'REQ' || raw === 'R' || raw.includes('심사') || raw.includes('검수')) status = 'PENDING'
      return {
        templateId: t.templtCode || t.templateCode || '',
        name: t.templtName || t.templateName || '',
        content: t.templtContent || t.templateContent || '',
        status,
        inspStatus: insp || raw,
        rejectReason: t.comments || t.rejectReason || t.reject_reason || '',
        messageType: t.templtMessageType || 'BA',
        buttons: t.buttons || [],
        dateCreated: t.cdate || '',
      }
    })
    return { ok: true, templates }
  }
  return { ok: false, error: r.data?.message || `템플릿 조회 실패 (${r.data?.code ?? r.status})` }
}

/* ───────── 카카오 채널(발신프로필) 등록 ───────── */
const PROFILE_AUTH_URL = 'https://kakaoapi.aligo.in/akv10/profile/auth/'
const PROFILE_ADD_URL = 'https://kakaoapi.aligo.in/akv10/profile/add/'
const CATEGORY_URL = 'https://kakaoapi.aligo.in/akv10/category/'
const TEMPLATE_ADD_URL = 'https://kakaoapi.aligo.in/akv10/template/add/'
const TEMPLATE_REQUEST_URL = 'https://kakaoapi.aligo.in/akv10/template/request/'

// 알리고 규격: plusid 는 반드시 "@아이디" 형태(예: @테스트). @ 를 빼면
// "존재하지 않는 카카오톡 채널입니다" 오류가 난다. 앞의 @ 를 하나로 정규화.
function normalizePlusId(s: any): string {
  const id = String(s || '').trim().replace(/^@+/, '')
  return id ? '@' + id : ''
}

/** 1) 채널 인증번호 요청 — 카카오톡 관리자에게 인증번호 발송 */
export async function aligoProfileAuth(env: any, o: { plusid: string; phonenumber: string }): Promise<{ ok: boolean; error?: string; data?: any }> {
  const key = aligoApiKey(env), userId = aligoUserId(env)
  if (!key || !userId) return { ok: false, error: '알리고 계정 미설정' }
  const plusid = normalizePlusId(o.plusid)          // @포함 필수
  const phonenumber = onlyDigits(o.phonenumber)
  if (!plusid || phonenumber.length < 10) return { ok: false, error: '채널 검색용 아이디와 관리자 휴대폰번호가 필요합니다.' }
  const tok = await createAlimtalkToken(env)
  if (!tok.ok) return { ok: false, error: tok.error }
  const r = await aligoCall(env, PROFILE_AUTH_URL, { apikey: key, userid: userId, token: tok.token, plusid, phonenumber })
  if (r.error) return { ok: false, error: r.error }
  if (Number(r.data?.code) === 0) return { ok: true, data: r.data }
  return { ok: false, error: r.data?.message || `인증번호 요청 실패 (${r.data?.code ?? r.status})`, data: r.data }
}

/** 2) 채널 등록 완료 — 인증번호로 발신프로필 생성 → senderkey 발급 */
export async function aligoProfileAdd(env: any, o: { plusid: string; phonenumber: string; authnum: string; categorycode?: string }): Promise<{ ok: boolean; senderKey?: string; error?: string; data?: any }> {
  const key = aligoApiKey(env), userId = aligoUserId(env)
  if (!key || !userId) return { ok: false, error: '알리고 계정 미설정' }
  const plusid = normalizePlusId(o.plusid)          // @포함 필수
  const phonenumber = onlyDigits(o.phonenumber)
  const authnum = String(o.authnum || '').trim()
  const categorycode = String(o.categorycode || '').trim()
  if (!plusid || !phonenumber || !authnum) return { ok: false, error: '채널 아이디·휴대폰·인증번호가 모두 필요합니다.' }
  if (!categorycode) return { ok: false, error: '카카오 채널 카테고리를 선택해 주세요. (알리고 발신프로필 등록 필수 항목)' }
  const tok = await createAlimtalkToken(env)
  if (!tok.ok) return { ok: false, error: tok.error }
  const params: Record<string, any> = { apikey: key, userid: userId, token: tok.token, plusid, phonenumber, authnum, categorycode }
  const r = await aligoCall(env, PROFILE_ADD_URL, params)
  if (r.error) return { ok: false, error: r.error }
  const sk = r.data?.senderKey || r.data?.senderkey || r.data?.data?.senderKey
  if (Number(r.data?.code) === 0 && sk) return { ok: true, senderKey: String(sk), data: r.data }
  return { ok: false, error: r.data?.message || `채널 등록 실패 (${r.data?.code ?? r.status})`, data: r.data }
}

/** 카카오 채널 카테고리 목록 (등록 시 필요) — 알리고는 대>중>소 3단계 계층으로 내려주므로
 *  최종 리프(코드가 있는 말단) 만 골라 "대 > 중 > 소" 이름과 코드로 평탄화한다. */
export async function aligoCategories(env: any): Promise<{ ok: boolean; categories?: { code: string; name: string }[]; error?: string }> {
  const key = aligoApiKey(env), userId = aligoUserId(env)
  if (!key || !userId) return { ok: false, error: '알리고 계정 미설정' }
  const tok = await createAlimtalkToken(env)
  if (!tok.ok) return { ok: false, error: tok.error }
  const r = await aligoCall(env, CATEGORY_URL, { apikey: key, userid: userId, token: tok.token })
  if (r.error) return { ok: false, error: r.error }
  if (Number(r.data?.code) !== 0) return { ok: false, error: r.data?.message || `카테고리 조회 실패 (${r.data?.code ?? r.status})` }

  const codeOf = (n: any) => String(n?.code ?? n?.categorycode ?? n?.value ?? n?.id ?? '').trim()
  const nameOf = (n: any) => String(n?.name ?? n?.category_name ?? n?.categoryName ?? n?.label ?? n?.title ?? codeOf(n)).trim()
  const kidsOf = (n: any) => (Array.isArray(n?.sub) ? n.sub : Array.isArray(n?.children) ? n.children : Array.isArray(n?.list) ? n.list : Array.isArray(n?.categories) ? n.categories : Array.isArray(n?.items) ? n.items : [])
  const out: { code: string; name: string }[] = []
  const seen = new Set<string>()
  const walk = (node: any, path: string[]) => {
    const nm = nameOf(node)
    const kids = kidsOf(node)
    const nextPath = nm ? [...path, nm] : path
    if (kids.length) { for (const k of kids) walk(k, nextPath); return }
    // 리프: 코드가 있으면 채택
    const code = codeOf(node)
    if (code && !seen.has(code)) { seen.add(code); out.push({ code, name: nextPath.join(' > ') || code }) }
  }
  // 응답 루트 후보: data(객체/배열) 또는 list
  const root = r.data?.data ?? r.data?.list ?? []
  const roots = Array.isArray(root) ? root : kidsOf(root).length ? kidsOf(root) : Object.values(root || {}).flat()
  for (const node of roots as any[]) walk(node, [])
  return { ok: true, categories: out }
}

/** 3) 템플릿 등록 — 알리고에 템플릿 추가 → tpl_code 발급 */
export async function aligoTemplateAdd(
  env: any,
  o: { senderKey: string; name: string; content: string; buttons?: any; emphasizeType?: string; extra?: string; ad?: string },
): Promise<{ ok: boolean; tplCode?: string; error?: string; data?: any }> {
  const key = aligoApiKey(env), userId = aligoUserId(env)
  const sk = String(o.senderKey || env?.ALIGO_SENDER_KEY || '').trim()
  if (!key || !userId) return { ok: false, error: '알리고 계정 미설정' }
  if (!sk) return { ok: false, error: '발신프로필 키(senderkey)가 필요합니다. 먼저 카카오 채널을 등록하세요.' }
  const name = String(o.name || '').trim().slice(0, 30)
  const content = String(o.content || '').trim()
  if (!name || !content) return { ok: false, error: '템플릿 이름과 내용을 입력하세요.' }
  const tok = await createAlimtalkToken(env)
  if (!tok.ok) return { ok: false, error: tok.error }
  const params: Record<string, any> = { apikey: key, userid: userId, token: tok.token, senderkey: sk, tpl_name: name, tpl_content: content }
  if (o.buttons) params.tpl_button = typeof o.buttons === 'string' ? o.buttons : JSON.stringify(o.buttons)
  if (o.emphasizeType) params.tpl_emphasize_type = o.emphasizeType
  if (o.extra) params.tpl_extra = o.extra
  if (o.ad) params.tpl_ad = o.ad
  const r = await aligoCall(env, TEMPLATE_ADD_URL, params)
  if (r.error) return { ok: false, error: r.error }
  const code = r.data?.data?.templtCode || r.data?.templtCode || r.data?.tpl_code
  if (Number(r.data?.code) === 0 && code) return { ok: true, tplCode: String(code), data: r.data }
  return { ok: false, error: r.data?.message || `템플릿 등록 실패 (${r.data?.code ?? r.status})`, data: r.data }
}

/** 4) 템플릿 승인(심사) 요청 */
export async function aligoTemplateRequest(env: any, o: { senderKey: string; tplCode: string }): Promise<{ ok: boolean; error?: string; data?: any }> {
  const key = aligoApiKey(env), userId = aligoUserId(env)
  const sk = String(o.senderKey || env?.ALIGO_SENDER_KEY || '').trim()
  if (!key || !userId || !sk || !o.tplCode) return { ok: false, error: '발신프로필 키와 템플릿 코드가 필요합니다.' }
  const tok = await createAlimtalkToken(env)
  if (!tok.ok) return { ok: false, error: tok.error }
  const r = await aligoCall(env, TEMPLATE_REQUEST_URL, { apikey: key, userid: userId, token: tok.token, senderkey: sk, tpl_code: o.tplCode })
  if (r.error) return { ok: false, error: r.error }
  if (Number(r.data?.code) === 0) return { ok: true, data: r.data }
  return { ok: false, error: r.data?.message || `승인 요청 실패 (${r.data?.code ?? r.status})`, data: r.data }
}

/** 잔여 문자 건수 조회 (health/디버그용) */
export async function aligoRemain(env: any): Promise<{ ok: boolean; sms?: number; lms?: number; mms?: number; error?: string }> {
  const key = aligoApiKey(env)
  const userId = aligoUserId(env)
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
