import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'

// GET /api/sms/logs → 로그인 회원의 문자 발송 이력·통계 (실데이터).
//   sms_logs 테이블(발송 시 기록)을 집계해 통계·최근 이력·7일 추이를 반환.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  await db.prepare(`CREATE TABLE IF NOT EXISTS sms_logs (
    id TEXT PRIMARY KEY, user_id TEXT, sender TEXT, msg_type TEXT, text TEXT,
    recipients INTEGER, sent INTEGER, failed INTEGER, cost INTEGER, created_at TEXT)`).run().catch(() => {})

  try {
    const agg: any = await db.prepare(
      `SELECT COUNT(*) AS batches, COALESCE(SUM(recipients),0) AS recipients, COALESCE(SUM(sent),0) AS sent,
              COALESCE(SUM(failed),0) AS failed, COALESCE(SUM(cost),0) AS cost
       FROM sms_logs WHERE user_id=?`,
    ).bind(me.id).first()

    const typeAgg: any = await db.prepare(
      `SELECT msg_type AS type, COALESCE(SUM(recipients),0) AS n FROM sms_logs WHERE user_id=? GROUP BY msg_type`,
    ).bind(me.id).all()

    // 최근 7일 추이 (일자별 발송/성공)
    const since = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    const trendRows: any = await db.prepare(
      `SELECT substr(created_at,1,10) AS d, COALESCE(SUM(recipients),0) AS reqd, COALESCE(SUM(sent),0) AS ok
       FROM sms_logs WHERE user_id=? AND substr(created_at,1,10) >= ? GROUP BY d ORDER BY d ASC`,
    ).bind(me.id, since).all()

    const logsRows: any = await db.prepare(
      `SELECT id, sender, msg_type, text, recipients, sent, failed, created_at
       FROM sms_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 100`,
    ).bind(me.id).all()

    const sent = Number(agg?.sent || 0)
    const recipients = Number(agg?.recipients || 0)
    const failed = Number(agg?.failed || 0)
    const successRate = recipients > 0 ? Math.round((sent / recipients) * 1000) / 10 : 0

    return json({
      ok: true,
      stats: { batches: Number(agg?.batches || 0), recipients, sent, failed, cost: Number(agg?.cost || 0), successRate },
      byType: (typeAgg?.results || []).map((r: any) => ({ type: r.type || 'SMS', count: Number(r.n || 0) })),
      trend: (trendRows?.results || []).map((r: any) => ({ date: r.d, requested: Number(r.reqd || 0), sent: Number(r.ok || 0) })),
      logs: (logsRows?.results || []).map((r: any) => ({
        id: r.id, sender: r.sender || '', type: r.msg_type || 'SMS', text: r.text || '',
        recipients: Number(r.recipients || 0), sent: Number(r.sent || 0), failed: Number(r.failed || 0), createdAt: r.created_at,
      })),
    })
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500)
  }
}
