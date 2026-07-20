import { Env, json, ensureSchema, resolveDB, requireAdminUser, sameOriginOk, logAudit, clientIp } from '../_utils'
import { ensureFunnelSchema } from '../funnel/_schema'
import { sendSms, aligoAlimtalk, kstStringToReserve } from '../_aligo'
import { resendBatch, emailShell } from '../_external'

const isEmail = (s: any) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || ''))

// 이메일 세그먼트 — 마케팅 수신동의 + 이메일 보유 회원
async function segmentEmails(db: D1Database, segment: string, plan?: string): Promise<{ email: string; name: string }[]> {
  let sql = `SELECT email, name FROM users WHERE email IS NOT NULL AND email != '' AND marketing_consent = 1 AND status != 'deleted'`
  const binds: any[] = []
  if (segment === 'plan' && plan) { sql += ' AND plan = ?'; binds.push(plan) }
  else if (segment === 'active') { sql += " AND last_active IS NOT NULL AND last_active >= ?"; binds.push(new Date(Date.now() - 30 * 864e5).toISOString()) }
  const rows = (await db.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }))).results || []
  return (rows as any[]).map((r) => ({ email: String(r.email || '').trim().toLowerCase(), name: r.name || '' })).filter((r) => isEmail(r.email))
}

// 관리자: 실제 회원 대상 CRM 타깃 마케팅 발송(문자/알림톡, 즉시 또는 KST 예약)
//  · 세그먼트: all(전체) · plan(요금제) · active(최근30일 활동)  — 모두 "마케팅 수신동의" 회원만
//  · 광고성 정보는 (광고) 표기 + 무료수신거부 안내 자동 부착(정보통신망법)
//  GET  /api/admin/crm-campaign            → 최근 캠페인 목록 + 세그먼트별 대상 수 미리보기
//  POST /api/admin/crm-campaign { segment, plan?, channel, content, sender, scheduleAt?, tplCode?, test?, testPhone? }

const uid = (p: string) => p + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
const digits = (s: any) => String(s || '').replace(/[^0-9]/g, '')

async function segmentPhones(db: D1Database, segment: string, plan?: string): Promise<{ phone: string; name: string }[]> {
  let sql = `SELECT phone, name FROM users WHERE phone IS NOT NULL AND phone != '' AND marketing_consent = 1 AND status != 'deleted'`
  const binds: any[] = []
  if (segment === 'plan' && plan) { sql += ' AND plan = ?'; binds.push(plan) }
  else if (segment === 'active') { sql += " AND last_active IS NOT NULL AND last_active >= ?"; binds.push(new Date(Date.now() - 30 * 864e5).toISOString()) }
  const rows = (await db.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }))).results || []
  return (rows as any[]).map((r) => ({ phone: digits(r.phone), name: r.name || '' })).filter((r) => r.phone.length >= 10)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureFunnelSchema(db)
  const guard = await requireAdminUser(request, db); if (guard.error) return guard.error

  // 세그먼트별 대상 수 미리보기 (마케팅 동의 회원)
  const all = (await segmentPhones(db, 'all')).length
  const active = (await segmentPhones(db, 'active')).length
  const planRows = (await db.prepare(`SELECT plan, COUNT(*) AS n FROM users WHERE phone IS NOT NULL AND phone != '' AND marketing_consent = 1 AND status != 'deleted' GROUP BY plan`).all().catch(() => ({ results: [] }))).results || []
  // 이메일 세그먼트 대상 수
  const emailAll = (await segmentEmails(db, 'all')).length
  const emailActive = (await segmentEmails(db, 'active')).length
  const campaigns = (await db.prepare(`SELECT id, segment, plan, channel, content, sender, schedule_at, total, sent, reserved, status, created_at FROM crm_campaigns ORDER BY created_at DESC LIMIT 100`).all().catch(() => ({ results: [] }))).results || []
  return json({ ok: true, preview: { all, active, byPlan: planRows, emailAll, emailActive }, campaigns })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureFunnelSchema(db)
  const guard = await requireAdminUser(request, db); if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const b: any = await request.json().catch(() => ({}))
  const segment = String(b.segment || 'all')
  const plan = b.plan ? String(b.plan) : undefined
  const channel = String(b.channel || 'sms')
  const sender = digits(b.sender)
  const subject = String(b.subject || '').trim()
  const rawContent = String(b.content || '').trim()
  const scheduleAt = String(b.scheduleAt || '').trim()
  const tplCode = String(b.tplCode || '').trim()
  const isTest = !!b.test
  if (!rawContent) return json({ ok: false, error: '발송 내용을 입력하세요.' }, 400)
  if (channel === 'sms' && !sender) return json({ ok: false, error: '발신번호가 필요합니다.' }, 400)
  if (channel === 'email' && !subject && !isTest) return json({ ok: false, error: '이메일 제목을 입력하세요.' }, 400)

  const now = new Date().toISOString()

  // ─────────── 이메일(Resend) 채널 — 마케팅 수신동의 회원 대상 ───────────
  if (channel === 'email') {
    let emailRecipients: { email: string; name: string }[]
    if (isTest) {
      const te = String(b.testEmail || '').trim().toLowerCase()
      if (!isEmail(te)) return json({ ok: false, error: '테스트 이메일이 올바르지 않습니다.' }, 400)
      emailRecipients = [{ email: te, name: '테스트' }]
    } else {
      emailRecipients = await segmentEmails(db, segment, plan)
    }
    if (emailRecipients.length === 0) return json({ ok: false, error: '대상(마케팅 수신동의·이메일 보유) 회원이 없습니다.' }, 400)
    if (emailRecipients.length > 5000) return json({ ok: false, error: '이메일은 한 번에 최대 5,000명까지 발송할 수 있습니다.' }, 400)

    // 광고성 표기(정보통신망법) — 테스트 제외. 제목 (광고) 접두 + 본문 하단 수신거부 안내(emailShell 푸터)
    const subj = isTest ? (subject || 'BYGENCY 안내') : `(광고) ${subject}`
    const willSchedule = !!scheduleAt
    const scheduledAt = willSchedule ? new Date(new Date(scheduleAt.replace(' ', 'T')).getTime()).toISOString() : undefined

    let esent = 0, efail = 0
    for (let i = 0; i < emailRecipients.length; i += 100) {
      const chunk = emailRecipients.slice(i, i + 100)
      // 예약 발송은 배치 대신 개별 발송(scheduled_at 지원)
      if (scheduledAt) {
        for (const c of chunk) {
          const html = emailShell(`<div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${rawContent.replace(/\{이름\}|\{name\}/g, c.name || '고객').replace(/</g, '&lt;')}</div><p style="color:#94a3b8;font-size:12px;margin-top:16px">본 메일은 광고성 정보이며, 수신을 원치 않으시면 cs@bygency.co 로 회신해 주세요.</p>`)
          const { resendEmail } = await import('../_external')
          const er = await resendEmail(env, { to: c.email, subject: subj, html, scheduledAt }, { db, kind: 'campaign' })
          if (er.ok) esent++; else efail++
        }
      } else {
        const items = chunk.map((c) => ({
          to: c.email, subject: subj,
          html: emailShell(`<div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${rawContent.replace(/\{이름\}|\{name\}/g, c.name || '고객').replace(/</g, '&lt;')}</div><p style="color:#94a3b8;font-size:12px;margin-top:16px">본 메일은 광고성 정보이며, 수신을 원치 않으시면 cs@bygency.co 로 회신해 주세요.</p>`),
        }))
        const br = await resendBatch(env, items, { db, kind: 'campaign' })
        esent += br.sent; efail += br.failed
      }
    }
    const estatus = isTest ? 'test' : (efail === 0 ? (willSchedule ? 'reserved' : 'sent') : (esent > 0 ? 'partial' : 'failed'))
    if (!isTest) {
      await db.prepare(`INSERT INTO crm_campaigns (id, admin_id, segment, plan, channel, content, sender, schedule_at, total, sent, reserved, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(uid('cc_'), guard.me.id, segment, plan || null, 'email', `${subject} | ${rawContent}`.slice(0, 500), null, scheduleAt || null, emailRecipients.length, esent, willSchedule ? esent : 0, estatus, now).run().catch(() => {})
      await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'crm_campaign', `${segment}:${emailRecipients.length}`, `email ${estatus}`, 'info', clientIp(request))
    }
    return json({ ok: esent > 0, total: emailRecipients.length, sent: esent, reserved: willSchedule ? esent : 0, errors: efail, status: estatus, reservedAtKst: scheduleAt || null })
  }

  // 광고성 표기(정보통신망법) — 테스트 발송은 제외
  const optout = digits((env as any).SMS_OPTOUT || '') || sender
  const content = isTest ? rawContent : `(광고) ${rawContent}\n무료수신거부 ${optout}`

  // 대상 수집
  let recipients: { phone: string; name: string }[]
  if (isTest) {
    const tp = digits(b.testPhone); if (tp.length < 10) return json({ ok: false, error: '테스트 번호가 올바르지 않습니다.' }, 400)
    recipients = [{ phone: tp, name: '테스트' }]
  } else {
    recipients = await segmentPhones(db, segment, plan)
  }
  if (recipients.length === 0) return json({ ok: false, error: '대상(마케팅 수신동의) 회원이 없습니다.' }, 400)
  if (recipients.length > 20000) return json({ ok: false, error: '한 번에 최대 20,000명까지 발송할 수 있습니다.' }, 400)

  // 예약(KST) 계산
  const rv = scheduleAt ? kstStringToReserve(scheduleAt) : null
  const willReserve = !!rv

  let sent = 0, reserved = 0, errors = 0
  const phones = recipients.map((r) => r.phone)

  if (channel === 'alimtalk' && tplCode) {
    // 알림톡: 100건씩 배치
    for (let i = 0; i < recipients.length; i += 100) {
      const chunk = recipients.slice(i, i + 100)
      const ar = await aligoAlimtalk(env, { tplCode, items: chunk.map((c) => ({ to: c.phone, message: content.replace(/\{이름\}|\{name\}/g, c.name || '고객') })), from: sender || undefined, failover: true, senddate: rv?.senddate })
      if (ar.ok) { sent += (ar.sent || chunk.length); if (willReserve) reserved += chunk.length } else errors += chunk.length
    }
  } else {
    // 문자(SMS/LMS): 500건씩 mass 발송 (동일 내용)
    for (let i = 0; i < phones.length; i += 500) {
      const chunk = phones.slice(i, i + 500)
      const sr = await sendSms(env, chunk, content, { from: sender, rdate: rv?.rdate, rtime: rv?.rtime })
      if (sr.sent) { sent += (sr.successCnt || chunk.length); if (sr.reserved) reserved += chunk.length } else errors += chunk.length
    }
  }

  const status = isTest ? 'test' : (errors === 0 ? (willReserve ? 'reserved' : 'sent') : (sent > 0 ? 'partial' : 'failed'))
  if (!isTest) {
    await db.prepare(`INSERT INTO crm_campaigns (id, admin_id, segment, plan, channel, content, sender, schedule_at, total, sent, reserved, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(uid('cc_'), guard.me.id, segment, plan || null, channel, rawContent.slice(0, 500), sender || null, scheduleAt || null, recipients.length, sent, reserved, status, now).run().catch(() => {})
    await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'crm_campaign', `${segment}:${recipients.length}`, `${channel} ${status}`, 'info', clientIp(request))
  }
  return json({ ok: sent > 0 || willReserve, total: recipients.length, sent, reserved, errors, status, reservedAtKst: scheduleAt || null })
}
