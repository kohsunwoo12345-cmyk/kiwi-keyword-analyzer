// 신청자 발생 시 랜딩페이지 주인에게 가는 자동 알림 (_ 프리픽스 = 라우팅 제외, import 전용)
//
// 원래는 퍼널 페이지에 "자동응답" 규칙을 만들어 둔 회원만, 그것도 신청자 본인에게만
// 문자가 나갔다. 정작 페이지 주인은 신청이 들어온 걸 알 방법이 없어서
// 신청 DB 화면을 직접 열어보기 전까지 몰랐다. 신청이 들어오면 주인에게 바로 알린다.
//
// 비용 원칙
//  · 앱 알림·이메일은 무료라 기본 켬.
//  · 문자·알림톡은 포인트가 나가므로 회원이 켠 경우에만 보낸다(기본 끔).
import { addNotification, getSetting, setSetting, spendPoints, resolveDB } from './_utils'
import { unitCost, smsKindOf } from './_msgcost'
import { sendSms } from './_aligo'
import { resendEmail, emailShell } from './_external'
import { logNotify } from './_notify'

export interface LeadAlertPrefs {
  app: boolean
  email: boolean
  sms: boolean
  extraEmail: string
  extraPhone: string
}

const KEY = (uid: string) => `lead_alert:${uid}`

export const DEFAULT_PREFS: LeadAlertPrefs = { app: true, email: true, sms: false, extraEmail: '', extraPhone: '' }

export async function getLeadAlertPrefs(db: D1Database, userId: string): Promise<LeadAlertPrefs> {
  try {
    const raw = await getSetting(db, KEY(String(userId)))
    if (!raw) return { ...DEFAULT_PREFS }
    const o = JSON.parse(raw)
    return {
      app: o.app !== false,
      email: o.email !== false,
      sms: !!o.sms,
      extraEmail: typeof o.extraEmail === 'string' ? o.extraEmail.slice(0, 120) : '',
      extraPhone: typeof o.extraPhone === 'string' ? o.extraPhone.replace(/[^0-9]/g, '').slice(0, 12) : '',
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export async function setLeadAlertPrefs(db: D1Database, userId: string, o: any): Promise<LeadAlertPrefs> {
  const next: LeadAlertPrefs = {
    app: o?.app !== false,
    email: o?.email !== false,
    sms: !!o?.sms,
    extraEmail: typeof o?.extraEmail === 'string' ? o.extraEmail.trim().slice(0, 120) : '',
    extraPhone: typeof o?.extraPhone === 'string' ? o.extraPhone.replace(/[^0-9]/g, '').slice(0, 12) : '',
  }
  await setSetting(db, KEY(String(userId)), JSON.stringify(next))
  return next
}

const emailValid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)
const mask = (p: string) => {
  const d = String(p || '').replace(/[^0-9]/g, '')
  return d.length >= 8 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : d
}

/**
 * 신청자 1건이 들어왔을 때 페이지 주인에게 알린다.
 * 어떤 경로로 알렸든 notify_log 에 "자동 발송" 으로 남는다.
 */
export async function alertOwnerOfLead(
  env: any,
  db: D1Database,
  o: {
    ownerId: string | number
    landingSlug: string
    landingTitle?: string
    lead: { name?: string; phone?: string; email?: string }
    refId?: string | number
  },
): Promise<{ app: boolean; email: boolean; sms: boolean }> {
  const ownerId = String(o.ownerId || '')
  const out = { app: false, email: false, sms: false }
  if (!ownerId) return out

  const owner: any = await db.prepare('SELECT id, name, email, phone, points FROM users WHERE id = ?').bind(ownerId).first().catch(() => null)
  if (!owner) return out
  const prefs = await getLeadAlertPrefs(db, ownerId)

  const title = String(o.landingTitle || o.landingSlug || '랜딩페이지')
  const leadName = String(o.lead?.name || '').slice(0, 40) || '이름 미입력'
  const leadPhone = String(o.lead?.phone || '').replace(/[^0-9]/g, '')
  const body = `"${title}" 에 새 신청이 접수되었습니다. ${leadName}${leadPhone ? ` · ${mask(leadPhone)}` : ''}`

  // 1) 앱 알림 — 무료
  if (prefs.app) {
    await addNotification(db, ownerId, '새 신청자가 접수되었습니다', body).catch(() => {})
    out.app = true
    await logNotify(db, {
      userId: ownerId, trigger: 'auto', event: 'lead', kind: 'app',
      recipient: String(owner.email || ownerId), recipientName: String(owner.name || ''),
      subject: '새 신청자가 접수되었습니다', content: body, ok: true,
      landingSlug: o.landingSlug, landingTitle: title, refId: o.refId,
    })
  }

  // 2) 이메일 — 무료
  const to = prefs.extraEmail && emailValid(prefs.extraEmail) ? prefs.extraEmail : String(owner.email || '')
  if (prefs.email && emailValid(to)) {
    const html = emailShell(
      `<div style="font-size:14px;line-height:1.8;color:#0f172a">
         <p><b>${title}</b> 에 새 신청이 접수되었습니다.</p>
         <table style="margin-top:12px;border-collapse:collapse;font-size:13px">
           <tr><td style="padding:4px 12px 4px 0;color:#64748b">이름</td><td><b>${leadName.replace(/</g, '&lt;')}</b></td></tr>
           <tr><td style="padding:4px 12px 4px 0;color:#64748b">연락처</td><td>${mask(leadPhone) || '-'}</td></tr>
           <tr><td style="padding:4px 12px 4px 0;color:#64748b">이메일</td><td>${String(o.lead?.email || '-').replace(/</g, '&lt;')}</td></tr>
         </table>
         <p style="margin-top:14px;color:#64748b;font-size:12px">신청자 전체 정보는 대시보드의 랜딩 신청 DB에서 확인할 수 있습니다.</p>
       </div>`,
    )
    const r = await resendEmail(env, { to, subject: `[BYGENCY] "${title}" 새 신청 1건`, html }, { db, kind: 'lead', userId: ownerId }).catch((e: any) => ({ ok: false, error: String(e?.message || e) }))
    out.email = !!(r as any).ok
    await logNotify(db, {
      userId: ownerId, trigger: 'auto', event: 'lead', kind: 'email',
      recipient: to, recipientName: String(owner.name || ''),
      subject: `[BYGENCY] "${title}" 새 신청 1건`, content: body,
      ok: out.email, reason: (r as any).error,
      landingSlug: o.landingSlug, landingTitle: title, refId: o.refId,
    })
  }

  // 3) 문자 — 포인트가 나가므로 켠 경우에만. 잔액이 없으면 조용히 건너뛰지 않고 이유를 남긴다.
  const toPhone = prefs.extraPhone || String(owner.phone || '').replace(/[^0-9]/g, '')
  if (prefs.sms && toPhone.length >= 10) {
    const text = `[BYGENCY] ${body}`
    const kind = smsKindOf(text)
    const unit = await unitCost(db, kind, ownerId)
    const spend = await spendPoints(db, ownerId, unit, '신청자 알림 문자', `${title} · 신청 알림`)
    if (!spend.ok) {
      await logNotify(db, {
        userId: ownerId, trigger: 'auto', event: 'lead', kind, recipient: toPhone,
        recipientName: String(owner.name || ''), content: text, ok: false, reason: spend.error,
        landingSlug: o.landingSlug, landingTitle: title, refId: o.refId,
      })
    } else {
      // 발신번호는 그 회원의 승인 번호 → 없으면 시스템 기본 번호
      const sr: any = await db
        .prepare("SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1")
        .bind(ownerId).first().catch(() => null)
      const from = String(sr?.phone || env?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')
      const r = await sendSms(env, toPhone, text, { from }).catch((e: any) => ({ sent: false, reason: String(e?.message || e) }))
      out.sms = !!(r as any).sent
      if (!out.sms) {
        // 나가지 않은 문자값을 받을 이유가 없다
        await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(unit, ownerId).run().catch(() => {})
      }
      await logNotify(db, {
        userId: ownerId, trigger: 'auto', event: 'lead', kind, recipient: toPhone,
        recipientName: String(owner.name || ''), content: text,
        ok: out.sms, reason: (r as any).reason, points: out.sms ? unit : 0,
        landingSlug: o.landingSlug, landingTitle: title, refId: o.refId,
      })
    }
  }

  return out
}
