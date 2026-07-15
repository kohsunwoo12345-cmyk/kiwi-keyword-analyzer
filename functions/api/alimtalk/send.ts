import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, logActivity } from '../_utils'
import { aligoAlimtalk, aligoAlimtalkConfigured } from '../_aligo'

// POST /api/alimtalk/send { to, text, templateId, senderKey?, failover? } → 알리고 카카오 알림톡 (건당 1 크레딧)
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
  // 템플릿 코드(tpl_code) · 발신프로필 키(senderkey)
  const templateId = String(body.templateId || body.tplCode || env?.ALIGO_TEMPLATE_CODE || '')
  let senderKey = String(body.senderKey || '')
  if (!senderKey) {
    // 본인이 등록한 카카오 채널(발신프로필)의 senderkey 사용
    const ch: any = await db.prepare('SELECT channel_id FROM kakao_channels WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(me.id).first().catch(() => null)
    if (ch?.channel_id) senderKey = String(ch.channel_id)
  }
  if (!senderKey) senderKey = String(env?.ALIGO_SENDER_KEY || '')
  if (recipients.length === 0) return json({ ok: false, error: '수신 번호를 입력하세요.' }, 400)
  if (!text) return json({ ok: false, error: '내용을 입력하세요.' }, 400)

  const cost = recipients.length
  const spend = await spendCredits(db, me.id, cost, '알림톡 발송', `${recipients.length}건`)
  if (!spend.ok) return json({ ok: false, error: spend.error }, 402)

  // 발신번호: 요청 지정 → 본인 승인 발신번호 → 환경변수 폴백 (등록된 번호를 API로 전달)
  let from = String(body.sender || body.from || '').replace(/[^0-9]/g, '')
  if (!from) {
    const sr: any = await db.prepare("SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1").bind(me.id).first()
    if (sr?.phone) from = String(sr.phone).replace(/[^0-9]/g, '')
  }
  if (!from) from = String(env?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')

  // 알리고는 다건을 한 번에 전송(receiver_1..N). 동일 문구 → 전 수신자.
  const r = await aligoAlimtalk(env, {
    tplCode: templateId,
    senderKey,
    from,
    failover: body.failover !== false, // 기본 실패 시 SMS 대체발송
    items: recipients.map((to: string) => ({ to, message: text, subject: String(body.subject || 'BYGENCY') })),
  })
  const sent = r.ok ? (r.sent || recipients.length) : 0
  const failed = recipients.length - sent
  if (failed > 0) await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(failed, me.id).run()

  await logActivity(db, me.id, 'credit', `알림톡 발송 ${sent}/${recipients.length}건`)
  const fresh: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
  const configured = aligoAlimtalkConfigured(env) && !!templateId
  return json({
    ok: true, sent, failed, total: recipients.length, configured,
    note: configured ? undefined : '알림톡은 알리고 키(ALIGO_API_KEY/USER_ID/SENDER)·발신프로필 키(ALIGO_SENDER_KEY)·템플릿 코드가 필요합니다. (실패분 크레딧 환불됨)',
    reason: r.ok ? undefined : r.error,
    credits: fresh?.credits ?? null,
  })
}
