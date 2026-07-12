import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, logActivity } from '../_utils'
import { solapiAlimtalk } from '../_external'

// POST /api/alimtalk/send { to, text, pfId, templateId, variables? } → Solapi 카카오 알림톡 (건당 1 크레딧)
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const rawTo = Array.isArray(body.to) ? body.to : [body.to]
  const recipients = rawTo.map((t: any) => String(t || '').replace(/[^0-9]/g, '')).filter((t: string) => t.length >= 10)
  const text = String(body.text || '').trim()
  const pfId = String(body.pfId || env?.KAKAO_PFID || '')
  const templateId = String(body.templateId || env?.KAKAO_TEMPLATE_ID || '')
  if (recipients.length === 0) return json({ ok: false, error: '수신 번호를 입력하세요.' }, 400)
  if (!text) return json({ ok: false, error: '내용을 입력하세요.' }, 400)

  const cost = recipients.length
  const spend = await spendCredits(db, me.id, cost, '알림톡 발송', `${recipients.length}건`)
  if (!spend.ok) return json({ ok: false, error: spend.error }, 402)

  let sent = 0
  let firstErr = ''
  for (const to of recipients) {
    const r = await solapiAlimtalk(env, { to, text, pfId, templateId, variables: body.variables })
    if (r.ok) sent++
    else if (!firstErr) firstErr = r.error || ''
  }
  const failed = recipients.length - sent
  if (failed > 0) await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(failed, me.id).run()

  await logActivity(db, me.id, 'credit', `알림톡 발송 ${sent}/${recipients.length}건`)
  const fresh: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
  const configured = !!(env?.SOLAPI_API_KEY && pfId && templateId)
  return json({
    ok: true, sent, failed, total: recipients.length, configured,
    note: configured ? undefined : '알림톡은 SOLAPI 키와 채널(pfId)·템플릿(templateId)이 필요합니다. (실패분 크레딧 환불됨)',
    reason: firstErr || undefined,
    credits: fresh?.credits ?? null,
  })
}
