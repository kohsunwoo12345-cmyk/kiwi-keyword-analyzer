import { Env, json, ensureSchema, resolveDB, requireAdminUser, sameOriginOk, logAudit, clientIp } from '../_utils'
import { resendEmail, resendBatch, emailShell } from '../_external'

// POST /api/admin/send-email — 관리자 직접 이메일 발송(Resend)
//  { to?: "a@x.com, b@y.com" , segment?: 'all'|'plan'|'active', plan?, subject, content }
//   · to 지정 시 해당 주소로 직접 발송
//   · segment 지정 시 마케팅 수신동의·이메일 보유 회원에게 발송(광고 표기)
const isEmail = (s: any) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || ''))

async function segmentEmails(db: D1Database, segment: string, plan?: string) {
  let sql = `SELECT email, name FROM users WHERE email IS NOT NULL AND email != '' AND marketing_consent = 1 AND status != 'deleted'`
  const binds: any[] = []
  if (segment === 'plan' && plan) { sql += ' AND plan = ?'; binds.push(plan) }
  else if (segment === 'active') { sql += " AND last_active IS NOT NULL AND last_active >= ?"; binds.push(new Date(Date.now() - 30 * 864e5).toISOString()) }
  const rows = (await db.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }))).results || []
  return (rows as any[]).map((r) => ({ email: String(r.email || '').trim().toLowerCase(), name: r.name || '' })).filter((r) => isEmail(r.email))
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const b: any = await request.json().catch(() => ({}))
  const toRaw = String(b.to || '').trim()
  const segment = String(b.segment || '').trim()
  const plan = b.plan ? String(b.plan) : undefined
  const subject = String(b.subject || '').trim()
  const content = String(b.content || '').trim()
  if (!subject) return json({ ok: false, error: '이메일 제목을 입력하세요.' }, 400)
  if (!content) return json({ ok: false, error: '이메일 내용을 입력하세요.' }, 400)

  const bodyHtml = (name: string, ad: boolean) => emailShell(
    `<div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${content.replace(/\{이름\}|\{name\}/g, name || '고객').replace(/</g, '&lt;')}</div>` +
    (ad ? `<p style="color:#94a3b8;font-size:12px;margin-top:16px">본 메일은 광고성 정보이며, 수신을 원치 않으시면 cs@bygency.co 로 회신해 주세요.</p>` : ''),
  )

  // 1) 직접 수신자 지정
  if (toRaw) {
    const list = toRaw.split(/[,\s;]+/).map((s) => s.trim().toLowerCase()).filter(isEmail)
    if (!list.length) return json({ ok: false, error: '올바른 수신 이메일을 입력하세요.' }, 400)
    if (list.length > 200) return json({ ok: false, error: '직접 발송은 최대 200명까지 가능합니다.' }, 400)
    let sent = 0, failed = 0
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100)
      const br = await resendBatch(env, chunk.map((e) => ({ to: e, subject, html: bodyHtml('', false) })), { db, kind: 'admin' })
      sent += br.sent; failed += br.failed
      if (br.error && sent === 0) return json({ ok: false, error: br.error }, 200)
    }
    await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'admin_email', `direct:${list.length}`, subject, 'info', clientIp(request))
    return json({ ok: sent > 0, total: list.length, sent, failed })
  }

  // 2) 세그먼트(마케팅 동의 회원)
  if (segment) {
    const recips = await segmentEmails(db, segment, plan)
    if (!recips.length) return json({ ok: false, error: '대상(마케팅 수신동의·이메일 보유) 회원이 없습니다.' }, 400)
    if (recips.length > 5000) return json({ ok: false, error: '세그먼트 발송은 최대 5,000명까지 가능합니다.' }, 400)
    const subj = `(광고) ${subject}`
    let sent = 0, failed = 0
    for (let i = 0; i < recips.length; i += 100) {
      const chunk = recips.slice(i, i + 100)
      const br = await resendBatch(env, chunk.map((c) => ({ to: c.email, subject: subj, html: bodyHtml(c.name, true) })), { db, kind: 'admin' })
      sent += br.sent; failed += br.failed
    }
    await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'admin_email', `${segment}:${recips.length}`, subject, 'info', clientIp(request))
    return json({ ok: sent > 0, total: recips.length, sent, failed })
  }

  return json({ ok: false, error: '수신자(이메일) 또는 세그먼트를 지정하세요.' }, 400)
}
