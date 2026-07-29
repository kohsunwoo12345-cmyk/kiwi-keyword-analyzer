import { Env, json, ensureSchema, getSessionUser, resolveDB, spendPoints, refundPoints, logActivity, publicUser, asText } from '../_utils'
import { smsKindOf, unitCost, KIND_LABEL } from '../_msgcost'
import { sendSms, aligoConfigured, kstStringToReserve } from '../_aligo'

// POST /api/sms/send → 알리고 발송. 비용은 포인트로 나간다.
//   { to: string | string[], text }        같은 문구를 여러 명에게
//   { items: [{ to, text }] }              수신자마다 다른 문구(이름·링크 치환)
//   공통 옵션: senderId | sender, reserveTime("YYYY-MM-DDTHH:MM", KST 예약 발송)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await (request.json().catch(() => null)) ?? {}
  const text = String(body.text || '').trim()

  // 수신자마다 문구가 다른 경우(이름·랜딩 URL 치환)를 items 로 받는다.
  //  같은 문구 발송은 to/text 를 그대로 쓴다 — 두 경로 모두 아래 한 흐름으로 합류한다.
  type Job = { to: string; text: string }
  let jobs: Job[] = []
  if (Array.isArray(body.items)) {
    for (const it of body.items.slice(0, 1000)) {
      // asText 는 객체·배열을 '' 로 떨어뜨린다 — String({toString:1}) 은 TypeError 를 던져 500 이 된다.
      const to = asText(it?.to ?? it?.phone).replace(/[^0-9]/g, '')
      const t = (asText(it?.text ?? it?.message, 2000) || text).trim()
      if (to.length >= 10 && t) jobs.push({ to, text: t })
    }
    if (jobs.length === 0) return json({ ok: false, error: '보낼 수신자와 내용이 없습니다.' }, 400)
  } else {
    const rawTo = Array.isArray(body.to) ? body.to : [body.to]
    const recipients = rawTo.map((t: any) => String(t || '').replace(/[^0-9]/g, '')).filter((t: string) => t.length >= 10)
    if (!text) return json({ ok: false, error: '문자 내용을 입력하세요.' }, 400)
    if (recipients.length === 0) return json({ ok: false, error: '올바른 수신 번호를 입력하세요.' }, 400)
    if (recipients.length > 1000) return json({ ok: false, error: '한 번에 최대 1,000명까지 발송할 수 있습니다.' }, 400)
    jobs = recipients.map((to) => ({ to, text }))
  }
  if (jobs.length > 1000) return json({ ok: false, error: '한 번에 최대 1,000명까지 발송할 수 있습니다.' }, 400)
  const recipients = jobs.map((j) => j.to)

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
  //  문구가 제각각이면 건마다 단가가 다를 수 있다(단문/장문) — 건별로 계산해 더한다.
  const unitSms = await unitCost(db, 'sms', me.id)
  const unitLms = await unitCost(db, 'lms', me.id)
  const unitOf = (t: string) => (smsKindOf(t) === 'lms' ? unitLms : unitSms)
  const kind = smsKindOf(jobs[0].text)          // 대표 종류(응답 표시용)
  const unit = unitOf(jobs[0].text)
  const cost = jobs.reduce((sum, j) => sum + unitOf(j.text), 0)
  const spend = await spendPoints(db, me.id, cost, '문자 발송', `${KIND_LABEL[kind]} ${jobs.length}건 · ${unit}P/건`)
  if (!spend.ok) return json({ ok: false, error: spend.error, balance: (spend as any).balance, need: (spend as any).need, unit, kind }, 402)

  // 예약 발송(KST) — 알리고는 rdate/rtime 에 KST 벽시계 값을 그대로 받는다.
  //  화면에 예약 옵션이 있는데 서버가 무시하면 "예약했다고 믿고 즉시 나가는" 사고가 난다.
  const reserveRaw = String(body.reserveTime || body.reserveAt || '').trim()
  const reserve = reserveRaw ? kstStringToReserve(reserveRaw) : null
  if (reserveRaw && !reserve) {
    await refundPoints(db, me.id, cost, '문자 예약 시각 형식 오류 — 전액 환불')
    return json({ ok: false, error: '예약 시각 형식이 올바르지 않습니다. (예: 2026-07-30T09:00)' }, 400)
  }

  // 알리고 발송
  let sent = 0
  let refund = 0
  const fails: { to: string; reason?: string }[] = []
  for (const j of jobs) {
    const r = await sendSms(env, j.to, j.text, { from, rdate: reserve?.rdate, rtime: reserve?.rtime })
    if (r.sent) sent++
    else { fails.push({ to: j.to, reason: r.reason }); refund += unitOf(j.text) }
  }

  // 실패분 포인트 환불 — 나가지 않은 문자까지 받을 이유가 없다
  if (refund > 0) await refundPoints(db, me.id, refund, `문자 발송 실패 ${fails.length}건 환불`)

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
        'sl_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18), me.id, from, msgType, jobs[0].text.slice(0, 500),
        jobs.length, sent, fails.length, cost - refund, new Date().toISOString()).run()
  } catch { /* 로그 실패 무시 */ }

  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()

  const configured = aligoConfigured(env)
  return json({
    ok: true,
    // 예전 화면들이 success/sentCount 를 보고 있어 같이 내려준다(성공했는데 실패로 뜨던 문제).
    success: true,
    sent,
    sentCount: sent,
    failed: fails.length,
    total: jobs.length,
    kind,
    unitPoints: unit,
    pointsUsed: cost - refund,
    totalCost: cost - refund,
    reserved: !!reserve,
    reservedAt: reserve ? `${reserve.rdate} ${reserve.rtime}` : undefined,
    configured,
    note: configured ? undefined : '알리고 환경변수(ALIGO_API_KEY/USER_ID/SENDER)가 설정되지 않아 실제 발송은 되지 않았습니다(포인트는 환불됨).',
    reason: fails[0]?.reason,
    remainingPoints: Number(fresh?.points) || 0,
    user: publicUser(fresh),
  })
}
