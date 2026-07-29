// SUPERPLACE 퍼널 빌더 이식: POST /api/funnel/sms/send
//  퍼널 신청자에게 대량 발송. 전화번호는 문자(SMS/LMS, Aligo), 이메일은 Resend 로 함께 발송.
//  body: { sender, recipients:[{phone,name,email}], message, msg_type? }
//  resp: { success, successCount, failCount, results[] }
import { resolveDB, getSessionUser, spendPoints, refundPoints, logActivity } from '../../_utils'
import { smsKindOf, unitCost, KIND_LABEL } from '../../_msgcost'
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
    const body = (((await request.json().catch(() => null)) as any) || {})
    const sender = digits(body.sender)
    const message = String(body.message || '').trim()
    const msgType = String(body.msg_type || '').toLowerCase() // '', 'sms', 'lms', 'email'
    const recipients: any[] = Array.isArray(body.recipients) ? body.recipients : []
    if (!message) return j({ success: false, error: '발송 내용을 입력하세요.' }, 400)
    if (!recipients.length) return j({ success: false, error: '발송 대상이 없습니다.' }, 400)
    if (recipients.length > 1000) return j({ success: false, error: '한 번에 최대 1,000명까지 발송할 수 있습니다.' }, 400)

    const emailOnly = msgType === 'email'

    // ── 발신번호 검증 ────────────────────────────────────────────────────────
    //  ⚠ 예전에는 body.sender 를 그대로 알리고에 넘겼다. 남의 번호를 발신번호로 찍어
    //     문자를 보낼 수 있다는 뜻이고(발신번호 사전등록제 위반), /api/sms/send 는
    //     이미 본인 승인 번호만 쓰도록 막고 있었다. 같은 기준을 여기에도 적용한다.
    let from = ''
    if (!emailOnly) {
      if (sender) {
        const r: any = await db.prepare(
          "SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' AND REPLACE(REPLACE(phone,'-',''),' ','') = ?",
        ).bind(me.id, sender).first().catch(() => null)
        if (r?.phone) from = sender
      }
      if (!from) {
        const r: any = await db.prepare(
          "SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1",
        ).bind(me.id).first().catch(() => null)
        if (r?.phone) from = String(r.phone).replace(/[^0-9]/g, '')
      }
      if (!from) from = String((env as any)?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')
    }

    // ── 포인트 선차감 ────────────────────────────────────────────────────────
    //  ⚠ 예전에는 이 경로만 과금이 없었다. 잔액 0인 회원도 대량 문자를 보낼 수 있어
    //     알리고 요금이 그대로 우리 쪽 손실이 됐다. /api/sms/send 와 같은 기준으로 받는다.
    //     발송 비용은 포인트(알리고 단가 × 배수). 이메일은 다른 경로와 마찬가지로 과금하지 않는다.
    const smsTargets = emailOnly ? 0 : recipients.filter((r: any) => digits(r.phone).length >= 10).length
    const msgKind = smsKindOf(message)
    const unit = await unitCost(db, msgKind, me.id)
    if (smsTargets > 0) {
      const spend = await spendPoints(db, me.id, unit * smsTargets, '퍼널 문자 발송', `${KIND_LABEL[msgKind]} ${smsTargets}건 · ${unit}P/건`)
      if (!spend.ok) return j({ success: false, error: spend.error, need: (spend as any).need, balance: (spend as any).balance, unit }, 402)
    }

    let successCount = 0
    let failCount = 0
    let smsFailed = 0
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
        if (!from) { reason = '승인된 발신번호가 없습니다. 발신번호를 등록하고 관리자 승인을 받아주세요.' }
        else {
          try {
            const sr = await sendSms(env, phone, personalized, { from })
            smsOk = !!sr.sent
            if (!smsOk) reason = sr.reason || '문자 발송 실패'
          } catch (e: any) { reason = String(e?.message || e).slice(0, 80) }
        }
        if (!smsOk && phone.length >= 10) smsFailed++
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

    // 실패분 포인트 환불 — 나가지 않은 문자까지 받을 이유가 없다(/api/sms/send 와 동일)
    if (smsFailed > 0) await refundPoints(db, me.id, unit * smsFailed, `퍼널 문자 발송 실패 ${smsFailed}건 환불`)
    if (smsTargets > 0) await logActivity(db, me.id, 'sms', `퍼널 문자 발송 ${smsTargets - smsFailed}/${smsTargets}건`).catch(() => {})

    return j({ success: successCount > 0, successCount, failCount, results })
  } catch (error: any) {
    return j({ success: false, error: error?.message || '발송 처리 중 오류가 발생했습니다.' }, 500)
  }
}
