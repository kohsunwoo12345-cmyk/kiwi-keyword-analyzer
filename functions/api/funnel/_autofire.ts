// 폼 제출 시 자동응답(문자/알림톡/이메일) 실행 — apply.ts, landing/form-submit.ts 공용 (_ 프리픽스 = 라우팅 제외)
import { sendSms, aligoAlimtalk, kstReserve, kstSenddate, timingToMinutes } from '../_aligo'
import { resendEmail, emailShell } from '../_external'

const digits = (s: any) => String(s || '').replace(/[^0-9]/g, '')
const emailValid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)

// page: { id, group_id, title }  contact: { name, phone(raw), email }
export async function fireAutoResponses(
  env: any,
  db: D1Database,
  page: { id: number | string; group_id: number | string; title?: string },
  contact: { name?: string; phone?: string; email?: string },
): Promise<any[]> {
  const rules = (await db.prepare(
    `SELECT * FROM funnel_auto_responses
     WHERE status = 'active' AND trigger = 'form_submit'
       AND (landing_page_id = ? OR landing_page_id IS NULL)
       AND (group_id = ? OR group_id IS NULL)`,
  ).bind(page.id, page.group_id).all().catch(() => ({ results: [] }))).results || []

  const name = String(contact.name || '').slice(0, 60)
  const phone = digits(contact.phone)
  const email = String(contact.email || '').trim().toLowerCase()
  const fired: any[] = []

  for (const r of rules as any[]) {
    const content = String(r.content || '')
      .replace(/\{이름\}|\{name\}/g, name || '고객')
      .replace(/\{페이지\}/g, page.title || '')
    const off = timingToMinutes(r.timing)
    if (!phone && r.type !== 'email') { fired.push({ id: r.id, sent: false, reason: '수신 전화번호 없음' }); continue }
    try {
      if (r.type === 'alimtalk' && r.tpl_code) {
        const ar = await aligoAlimtalk(env, { tplCode: r.tpl_code, items: [{ to: phone, message: content, subject: r.subject || '알림톡' }], from: r.sender_number, failover: true, senddate: off > 0 ? kstSenddate(off) : undefined })
        fired.push({ id: r.id, type: 'alimtalk', sent: ar.ok, reserved: off > 0, reason: ar.error })
      } else if (r.type === 'email') {
        if (!emailValid(email)) { fired.push({ id: r.id, type: 'email', sent: false, reason: '수신 이메일 없음' }); continue }
        const html = emailShell(`<div style="font-size:14px;line-height:1.7;color:#0f172a;white-space:pre-wrap">${content.replace(/</g, '&lt;')}</div>`)
        const scheduledAt = off > 0 ? new Date(Date.now() + off * 60_000).toISOString() : undefined
        const er = await resendEmail(env, { to: email, subject: r.subject || `[${page.title || 'BYGENCY'}] 신청이 접수되었습니다`, html, scheduledAt }, { db, kind: 'funnel' })
        fired.push({ id: r.id, type: 'email', sent: er.ok, reserved: off > 0, reason: er.error })
      } else {
        const opts: any = { from: r.sender_number }
        if (off > 0) { const rv = kstReserve(off); opts.rdate = rv.rdate; opts.rtime = rv.rtime }
        const sr = await sendSms(env, phone, content, opts)
        fired.push({ id: r.id, type: 'sms', sent: sr.sent, reserved: !!sr.reserved, reason: sr.reason })
      }
    } catch (e: any) { fired.push({ id: r.id, sent: false, reason: String(e?.message || e).slice(0, 100) }) }
  }
  return fired
}
