import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, logActivity, publicUser } from '../_utils'
import { sendSms, aligoConfigured } from '../_aligo'

// POST /api/sms/send { to: string | string[], text } → 실제 알리고(Aligo) 발송 (건당 1 크레딧 차감)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const text = String(body.text || '').trim()
  const rawTo = Array.isArray(body.to) ? body.to : [body.to]
  const recipients = rawTo.map((t: any) => String(t || '').replace(/[^0-9]/g, '')).filter((t: string) => t.length >= 10)
  if (!text) return json({ ok: false, error: '문자 내용을 입력하세요.' }, 400)
  if (recipients.length === 0) return json({ ok: false, error: '올바른 수신 번호를 입력하세요.' }, 400)
  if (recipients.length > 1000) return json({ ok: false, error: '한 번에 최대 1,000명까지 발송할 수 있습니다.' }, 400)

  // 건당 1 크레딧 차감 (전체 먼저 선차감)
  const cost = recipients.length
  const spend = await spendCredits(db, me.id, cost, '문자 발송', `SMS ${recipients.length}건`)
  if (!spend.ok) return json({ ok: false, error: spend.error, balance: (spend as any).balance }, 402)

  // Solapi 발송
  let sent = 0
  const fails: { to: string; reason?: string }[] = []
  for (const to of recipients) {
    const r = await sendSms(env, to, text)
    if (r.sent) sent++
    else fails.push({ to, reason: r.reason })
  }

  // 실패분 크레딧 환불
  if (fails.length > 0) {
    await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(fails.length, me.id).run()
    await db
      .prepare(`INSERT INTO transactions (id, user_id, kind, amount, balance_after, memo, created_at) SELECT ?, ?, 'credit', ?, credits, ?, ? FROM users WHERE id = ?`)
      .bind('t_' + crypto.randomUUID().slice(0, 16), me.id, fails.length, `문자 발송 실패 ${fails.length}건 환불`, new Date().toISOString(), me.id)
      .run()
  }

  await logActivity(db, me.id, 'sms', `문자 발송 ${sent}/${recipients.length}건`)
  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()

  const configured = aligoConfigured(env)
  return json({
    ok: true,
    sent,
    failed: fails.length,
    total: recipients.length,
    configured,
    note: configured ? undefined : '알리고 환경변수(ALIGO_API_KEY/USER_ID/SENDER)가 설정되지 않아 실제 발송은 되지 않았습니다(크레딧은 환불됨).',
    reason: fails[0]?.reason,
    user: publicUser(fresh),
  })
}
