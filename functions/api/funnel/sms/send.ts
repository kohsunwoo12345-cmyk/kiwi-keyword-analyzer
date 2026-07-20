// SUPERPLACE 퍼널 빌더 이식: POST /api/funnel/sms/send
//  퍼널 신청자에게 대량 발송. 전화번호는 문자(SMS/LMS, Aligo), 이메일은 Resend 로 함께 발송.
//  body: { sender, recipients:[{phone,name,email}], message, msg_type? }
//  resp: { success, successCount, failCount, results[] }
import { resolveDB, getSessionUser } from '../../_utils'
import { ensureFunnelSchema } from '../_schema'
import { sendSms } from '../../_aligo'
import { resendEmail, emailShell } from '../../_external'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
const digits = (s: any) => String(s || '').replace(/[^0-9]/g, '')
const emailValid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const body = (await request.json()) as any
    const sender = digits(body.sender)
    const message = String(body.message || '').trim()
    const msgType = String(body.msg_type || '').toLowerCase() // '', 'sms', 'lms', 'email'
    const recipients: any[] = Array.isArray(body.recipients) ? body.recipients : []
    if (!message) return j({ success: false, error: '발송 내용을 입력하세요.' }, 400)
    if (!recipients.length) return j({ success: false, error: '발송 대상이 없습니다.' }, 400)

    const emailOnly = msgType === 'email'
    let successCount = 0
    let failCount = 0
    const results: any[] = []

    for (const r of recipients) {
      const phone = digits(r.phone)
      const name = String(r.name || '').slice(0, 60)
      const email = String(r.email || '').trim().toLowerCase()
      const personalized = message.replace(/\{이름\}|\{name\}/g, name || '고객')
      let smsOk = false
      let emailOk = false
      let reason = ''

      // 1) 문자 발송 (이메일 전용 모드가 아니고 번호가 있을 때)
      if (!emailOnly && phone) {
        if (!sender) { reason = '발신번호 미지정' }
        else {
          try {
            const sr = await sendSms(env, phone, personalized, { from: sender })
            smsOk = !!sr.sent
            if (!smsOk) reason = sr.reason || '문자 발송 실패'
          } catch (e: any) { reason = String(e?.message || e).slice(0, 80) }
        }
      }

      // 2) 이메일 발송 (수신 이메일이 유효하면 항상 함께 발송) — 등록한 이메일로 발송까지 지원
      if (email && emailValid(email)) {
        try {
          const html = emailShell(`<div style="font-size:14px;line-height:1.7;color:#0f172a;white-space:pre-wrap">${personalized.replace(/</g, '&lt;')}</div>`)
          const subject = String(body.subject || '').trim() || `${name ? name + '님, ' : ''}안내 말씀드립니다`
          const er = await resendEmail(env, { to: email, subject, html }, { db, kind: 'funnel', userId: String(me.id) })
          emailOk = !!er.ok
          if (!emailOk && !reason) reason = er.error || '이메일 발송 실패'
        } catch (e: any) { if (!reason) reason = String(e?.message || e).slice(0, 80) }
      }

      const ok = smsOk || emailOk
      if (ok) successCount++
      else failCount++
      results.push({ phone: r.phone || '', email: r.email || '', sms: smsOk, email_sent: emailOk, reason: ok ? '' : reason })
    }

    return j({ success: successCount > 0, successCount, failCount, results })
  } catch (error: any) {
    return j({ success: false, error: error?.message || '발송 처리 중 오류가 발생했습니다.' }, 500)
  }
}
