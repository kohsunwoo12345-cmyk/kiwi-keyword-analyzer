import { Env, json, ensureSchema, getSessionUser, resolveDB, spendPoints, refundPoints, logActivity, publicUser } from '../_utils'
import { smsKindOf, unitCost, KIND_LABEL } from '../_msgcost'
import { sendSms, aligoConfigured } from '../_aligo'

// POST /api/sms/send { to: string | string[], text } → 실제 알리고(Aligo) 발송 (건당 1 크레딧 차감)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await (request.json().catch(() => null)) ?? {}
  const text = String(body.text || '').trim()
  const rawTo = Array.isArray(body.to) ? body.to : [body.to]
  const recipients = rawTo.map((t: any) => String(t || '').replace(/[^0-9]/g, '')).filter((t: string) => t.length >= 10)
  if (!text) return json({ ok: false, error: '문자 내용을 입력하세요.' }, 400)
  if (recipients.length === 0) return json({ ok: false, error: '올바른 수신 번호를 입력하세요.' }, 400)
  if (recipients.length > 1000) return json({ ok: false, error: '한 번에 최대 1,000명까지 발송할 수 있습니다.' }, 400)

  // 발신번호(sender) 결정: 요청에 지정된 승인 발신번호 우선 → 본인 승인 발신번호 → 환경변수 폴백
  //   (발신번호는 앱의 발신번호 등록·승인 시스템에서 가져와 API로 전달한다)
  let from = ''
  const reqSenderId = String(body.senderId || '')
  const reqSender = String(body.sender || body.from || '').replace(/[^0-9]/g, '')
  if (reqSenderId) {
    const r: any = await db.prepare("SELECT phone FROM sender_numbers WHERE id = ? AND user_id = ? AND status = 'approved'").bind(reqSenderId, me.id).first()
    if (r?.phone) from = String(r.phone).replace(/[^0-9]/g, '')
  }
  if (!from && reqSender) {
    const r: any = await db.prepare("SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' AND REPLACE(REPLACE(phone,'-',''),' ','') = ?").bind(me.id, reqSender).first()
    if (r?.phone) from = reqSender
  }
  if (!from) {
    const r: any = await db.prepare("SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1").bind(me.id).first()
    if (r?.phone) from = String(r.phone).replace(/[^0-9]/g, '')
  }
  if (!from) from = String((env as any)?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')
  if (!from) return json({ ok: false, error: '발신번호가 없습니다. 발신번호를 먼저 등록하고 관리자 승인을 받아주세요.' }, 400)

  // ── 포인트 선차감 ───────────────────────────────────────────────────────────
  //  발송 비용은 포인트로 나간다(AI 생성에 쓰는 크레딧과 별개 지갑).
  //  단가는 알리고 기준 단가 × 배수(기본 2배)이며 관리자 화면에서 조정한다.
  //  90byte 를 넘으면 LMS 라 단가가 올라간다 — 알리고와 같은 기준으로 판정한다.
  const kind = smsKindOf(text)
  const unit = await unitCost(db, kind)
  const cost = unit * recipients.length
  const spend = await spendPoints(db, me.id, cost, '문자 발송', `${KIND_LABEL[kind]} ${recipients.length}건 · ${unit}P/건`)
  if (!spend.ok) return json({ ok: false, error: spend.error, balance: (spend as any).balance, need: (spend as any).need, unit, kind }, 402)

  // 알리고 발송
  let sent = 0
  const fails: { to: string; reason?: string }[] = []
  for (const to of recipients) {
    const r = await sendSms(env, to, text, { from })
    if (r.sent) sent++
    else fails.push({ to, reason: r.reason })
  }

  // 실패분 포인트 환불 — 나가지 않은 문자까지 받을 이유가 없다
  if (fails.length > 0) await refundPoints(db, me.id, unit * fails.length, `문자 발송 실패 ${fails.length}건 환불`)

  await logActivity(db, me.id, 'sms', `문자 발송 ${sent}/${recipients.length}건`)

  // 발송 이력 기록 (발송 이력·통계 페이지 실데이터용). 실패해도 발송 결과에는 영향 없음.
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS sms_logs (
      id TEXT PRIMARY KEY, user_id TEXT, sender TEXT, msg_type TEXT, text TEXT,
      recipients INTEGER, sent INTEGER, failed INTEGER, cost INTEGER, created_at TEXT)`).run()
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON sms_logs(user_id, created_at)`).run().catch(() => {})
    const msgType = kind.toUpperCase()
    await db.prepare(`INSERT INTO sms_logs (id,user_id,sender,msg_type,text,recipients,sent,failed,cost,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
        'sl_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18), me.id, from, msgType, text.slice(0, 500),
        recipients.length, sent, fails.length, unit * sent, new Date().toISOString()).run()
  } catch { /* 로그 실패 무시 */ }

  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()

  const configured = aligoConfigured(env)
  return json({
    ok: true,
    sent,
    failed: fails.length,
    total: recipients.length,
    kind,
    unitPoints: unit,
    pointsUsed: unit * sent,
    configured,
    note: configured ? undefined : '알리고 환경변수(ALIGO_API_KEY/USER_ID/SENDER)가 설정되지 않아 실제 발송은 되지 않았습니다(포인트는 환불됨).',
    reason: fails[0]?.reason,
    user: publicUser(fresh),
  })
}
