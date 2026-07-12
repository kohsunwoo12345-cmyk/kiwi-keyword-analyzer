import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, logActivity } from '../_utils'
import { resendEmail } from '../_external'

// POST /api/email/send { to, subject, html|text } → Resend 실제 이메일 발송 (수신자당 1 크레딧)
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const rawTo = Array.isArray(body.to) ? body.to : [body.to]
  const to = rawTo.map((t: any) => String(t || '').trim()).filter((t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t))
  const subject = String(body.subject || '').trim()
  const html = String(body.html || body.text || '').trim()
  if (to.length === 0) return json({ ok: false, error: '올바른 수신 이메일을 입력하세요.' }, 400)
  if (!subject || !html) return json({ ok: false, error: '제목과 내용을 입력하세요.' }, 400)

  const cost = to.length
  const spend = await spendCredits(db, me.id, cost, '이메일 발송', `${to.length}명`)
  if (!spend.ok) return json({ ok: false, error: spend.error }, 402)

  const r = await resendEmail(env, { to, subject, html: html.replace(/\n/g, '<br>') })
  if (!r.ok) {
    await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(cost, me.id).run()
    return json({ ok: false, error: r.error, refunded: true }, 200)
  }
  await logActivity(db, me.id, 'credit', `이메일 발송 ${to.length}건 (-${cost})`)
  const fresh: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
  return json({ ok: true, sent: to.length, id: r.id, credits: fresh?.credits ?? null })
}
