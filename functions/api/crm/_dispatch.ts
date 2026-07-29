// 집행 발송 엔진 (_ 프리픽스 = 라우팅 제외, import 전용)
//  수동 발송(/api/crm/campaigns/:id/send)과 예약 발송(크론)이 같은 함수를 쓴다.
//  두 경로가 갈라지면 "수동은 되는데 예약은 안 되는" 종류의 고장이 생긴다.
import { spendPoints, refundPoints, logActivity, addNotification } from '../_utils'
import { unitCost, smsKindOf, KIND_LABEL } from '../_msgcost'
import { sendSms, aligoAlimtalk } from '../_aligo'

export interface DispatchResult {
  ok: boolean
  error?: string
  recipients?: number
  sent?: number
  failed?: number
  pointsUsed?: number
  unitPoints?: number
  msgKind?: string
}

/** 집행의 타깃 그룹에서 실제 발송 대상을 뽑는다(내 그룹만, 번호 중복 제거) */
async function loadTargets(db: D1Database, c: any): Promise<{ name: string; phone: string }[]> {
  if (!c.group_id) return []
  const rows = ((await db.prepare(
    `SELECT m.name, m.phone FROM contact_group_members m
       JOIN contact_groups g ON g.id = m.group_id
      WHERE m.group_id = ? AND g.user_id = ?
      ORDER BY m.created_at ASC LIMIT 5000`,
  ).bind(c.group_id, c.user_id).all().catch(() => ({ results: [] }))).results as any[]) || []
  const seen = new Set<string>()
  const out: { name: string; phone: string }[] = []
  for (const r of rows) {
    const phone = String(r.phone || '').replace(/[^0-9]/g, '')
    if (phone.length < 10 || seen.has(phone)) continue
    seen.add(phone)
    out.push({ name: String(r.name || ''), phone })
  }
  return out
}

/** 승인된 발신번호를 고른다 (집행에 지정된 번호 우선) */
async function resolveSender(db: D1Database, c: any, env: any): Promise<string> {
  const want = String(c.sender_phone || '').replace(/[^0-9]/g, '')
  if (want) {
    const r: any = await db.prepare(
      "SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' AND REPLACE(REPLACE(phone,'-',''),' ','') = ?",
    ).bind(c.user_id, want).first().catch(() => null)
    if (r?.phone) return want
  }
  const r: any = await db.prepare(
    "SELECT phone FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1",
  ).bind(c.user_id).first().catch(() => null)
  if (r?.phone) return String(r.phone).replace(/[^0-9]/g, '')
  return String(env?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')
}

/**
 * 집행 한 건을 실제로 발송한다.
 *
 * 순서가 중요하다.
 *  1) 'sending' 으로 조건부 선점 — 수동 발송과 예약 크론이 겹쳐도 두 번 나가지 않는다.
 *  2) 포인트 선차감 (부족하면 draft/scheduled 로 되돌리고 중단)
 *  3) 발송 → 실패분 환불
 * 선점을 안 하면 같은 집행이 두 번 나가고 회원 돈이 두 배로 빠진다.
 */
export async function dispatchCampaign(db: D1Database, env: any, campaignId: string): Promise<DispatchResult> {
  const c: any = await db.prepare('SELECT * FROM crm_executions WHERE id = ?').bind(campaignId).first().catch(() => null)
  if (!c) return { ok: false, error: '집행을 찾을 수 없습니다.' }
  if (c.status === 'sent' || c.status === 'sending') return { ok: false, error: '이미 발송되었거나 발송 중입니다.' }
  if (c.status === 'canceled') return { ok: false, error: '취소된 집행입니다.' }

  const message = String(c.message || '').trim()
  if (!message) return { ok: false, error: '발송 문구가 비어 있습니다.' }

  const targets = await loadTargets(db, c)
  if (!targets.length) return { ok: false, error: '발송 대상이 없습니다. 타깃 그룹을 확인해 주세요.' }

  const prevStatus = c.status
  const claim: any = await db.prepare(
    "UPDATE crm_executions SET status = 'sending', updated_at = ? WHERE id = ? AND status NOT IN ('sent','sending','canceled')",
  ).bind(new Date().toISOString(), campaignId).run().catch(() => null)
  if (!claim || Number(claim.meta?.changes || 0) === 0) return { ok: false, error: '이미 발송 처리 중입니다.' }

  const revert = async (err: string) => {
    await db.prepare("UPDATE crm_executions SET status = ?, error = ? WHERE id = ?")
      .bind(prevStatus === 'scheduled' ? 'scheduled' : 'draft', err.slice(0, 300), campaignId).run().catch(() => {})
  }

  const isAlimtalk = c.channel === 'alimtalk'
  const msgKind = isAlimtalk ? 'alimtalk' : smsKindOf(message)
  const unit = await unitCost(db, msgKind as any, c.user_id)
  const total = unit * targets.length

  const spend = await spendPoints(
    db, c.user_id, total, 'CRM 집행 발송',
    `${c.name} · ${KIND_LABEL[msgKind as keyof typeof KIND_LABEL]} ${targets.length}건 · ${unit}P/건`,
  )
  if (!spend.ok) {
    await revert(spend.error || '포인트 부족')
    await addNotification(db, c.user_id, 'CRM 집행 발송 실패', `"${c.name}" — ${spend.error}`).catch(() => {})
    return { ok: false, error: spend.error, recipients: targets.length, unitPoints: unit, msgKind }
  }

  // ── 실제 발송 ──
  let sent = 0
  const rows: { name: string; phone: string; ok: number; reason: string }[] = []

  if (isAlimtalk) {
    const r = await aligoAlimtalk(env, {
      tplCode: String(c.template_code || ''),
      senderKey: String(c.sender_key || env?.ALIGO_SENDER_KEY || ''),
      from: await resolveSender(db, c, env),
      failover: true,
      items: targets.map((t) => ({
        to: t.phone,
        message: message.replace(/\{이름\}|\{name\}/g, t.name || '고객'),
        subject: String(c.name || 'BYGENCY').slice(0, 40),
      })),
    }).catch((e: any) => ({ ok: false, error: String(e?.message || e) } as any))
    const okAll = !!(r as any).ok
    sent = okAll ? Number((r as any).sent || targets.length) : 0
    const reason = okAll ? '' : String((r as any).error || '알림톡 발송 실패').slice(0, 200)
    for (const t of targets) rows.push({ ...t, ok: okAll ? 1 : 0, reason })
  } else {
    const from = await resolveSender(db, c, env)
    if (!from) {
      await refundPoints(db, c.user_id, total, `CRM 집행 "${c.name}" 발신번호 없음 — 전액 환불`)
      await revert('승인된 발신번호가 없습니다.')
      return { ok: false, error: '승인된 발신번호가 없습니다. 발신번호를 등록하고 관리자 승인을 받아주세요.' }
    }
    for (const t of targets) {
      const personalized = message.replace(/\{이름\}|\{name\}/g, t.name || '고객')
      let ok = false, reason = ''
      try {
        const r = await sendSms(env, t.phone, personalized, { from })
        ok = !!r.sent
        if (!ok) reason = String(r.reason || '문자 발송 실패').slice(0, 200)
      } catch (e: any) { reason = String(e?.message || e).slice(0, 200) }
      if (ok) sent++
      rows.push({ ...t, ok: ok ? 1 : 0, reason })
    }
  }

  const failed = targets.length - sent
  if (failed > 0) await refundPoints(db, c.user_id, unit * failed, `CRM 집행 "${c.name}" 실패 ${failed}건 환불`)

  // 수신자 단위 결과 저장 (결과 화면에서 그대로 보여준다)
  await db.prepare('DELETE FROM crm_execution_sends WHERE campaign_id = ?').bind(campaignId).run().catch(() => {})
  const now = new Date().toISOString()
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50)
    await db.batch(chunk.map((r) =>
      db.prepare('INSERT INTO crm_execution_sends (id, campaign_id, user_id, name, phone, ok, reason, created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind('cms_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18), campaignId, c.user_id, r.name, r.phone, r.ok, r.reason || null, now),
    )).catch(() => {})
  }

  const pointsUsed = unit * sent
  await db.prepare(
    `UPDATE crm_executions SET status = ?, recipients = ?, sent = ?, failed = ?, msg_kind = ?,
       unit_points = ?, points_used = ?, sent_at = ?, error = ?, updated_at = ? WHERE id = ?`,
  ).bind(
    sent > 0 ? 'sent' : 'failed', targets.length, sent, failed, msgKind,
    unit, pointsUsed, now, sent > 0 ? null : (rows[0]?.reason || '전건 실패').slice(0, 300), now, campaignId,
  ).run().catch(() => {})

  await logActivity(db, c.user_id, 'sms', `CRM 집행 "${c.name}" 발송 ${sent}/${targets.length}건`).catch(() => {})
  await addNotification(
    db, c.user_id,
    sent > 0 ? 'CRM 집행 발송 완료' : 'CRM 집행 발송 실패',
    `"${c.name}" — ${targets.length}명 중 ${sent}건 발송${failed > 0 ? ` · 실패 ${failed}건(포인트 환불)` : ''} · ${pointsUsed.toLocaleString()}P 사용`,
  ).catch(() => {})

  return { ok: sent > 0, recipients: targets.length, sent, failed, pointsUsed, unitPoints: unit, msgKind, error: sent > 0 ? undefined : (rows[0]?.reason || '전건 실패') }
}
