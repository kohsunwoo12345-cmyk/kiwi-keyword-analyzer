// GET /api/crm/summary — 집행 결과 총괄
//   ?from=&to=  기간(집행일 기준) · ?all=1 (관리자) 전 회원
// 결과 페이지 상단의 합계 지표와 집행별 성과 표를 한 번에 만든다.
import { Env, json, ensureSchema, getSessionUser, resolveDB, asText } from '../_utils'
import { ensureCrmSchema, STATUS_LABEL } from './_schema'
import { ensureLandingSchema } from '../landing/_lschema'

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const isAdmin = me.role === 'admin' || me.role === 'superadmin'

  const url = new URL(request.url)
  const from = asText(url.searchParams.get('from'), 10)
  const to = asText(url.searchParams.get('to'), 10)
  const wantAll = isAdmin && url.searchParams.get('all') === '1'

  const where: string[] = []
  const binds: any[] = []
  if (!wantAll) { where.push('c.user_id = ?'); binds.push(me.id) }
  if (isDate(from)) { where.push('c.run_date >= ?'); binds.push(from) }
  if (isDate(to)) { where.push('c.run_date <= ?'); binds.push(to) }
  const wh = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const sql = `
    SELECT c.id, c.name, c.run_date, c.landing_slug, c.landing_url, c.channel, c.status,
           c.ad_budget, c.recipients, c.sent, c.failed, c.points_used, c.unit_points, c.msg_kind,
           c.sent_at, c.user_id,
           g.name AS group_name, u.name AS owner_name, u.email AS owner_email
      FROM crm_executions c
      LEFT JOIN contact_groups g ON g.id = c.group_id
      LEFT JOIN users u ON u.id = c.user_id
      ${wh}
     ORDER BY c.run_date DESC, c.created_at DESC
     LIMIT 300`
  const camps = ((await (binds.length ? db.prepare(sql).bind(...binds) : db.prepare(sql)).all().catch(() => ({ results: [] }))).results as any[]) || []

  // 집행별 랜딩 성과 — 집행일 00:00(KST) 이후만 그 집행의 성과로 본다.
  const rows: any[] = []
  for (const c of camps) {
    let views = 0, leads = 0
    if (c.landing_slug) {
      const since = c.run_date ? new Date(`${c.run_date}T00:00:00+09:00`).toISOString() : ''
      /* ⚠ 시각 저장 형식이 표마다 다르다 — landing_page_views 는 CURRENT_TIMESTAMP 라
         '2026-07-31 15:04:43'(공백), 앱이 넣는 값은 ISO '…T15:04:43.000Z'.
         글자 그대로 견주면 공백(0x20)이 'T'(0x54)보다 앞서서 같은 날 조회가 통째로 빠진다.
         (캠페인 결과 표의 조회수가 0으로 나오던 자리다.) 형식을 맞춘 뒤 견준다. */
      const GE = (col: string) => `substr(replace(${col}, ' ', 'T'), 1, 19) >= substr(?, 1, 19)`
      const v: any = await db.prepare(
        `SELECT COUNT(*) AS n FROM landing_page_views WHERE landing_slug = ?${since ? ` AND ${GE('created_at')}` : ''}`,
      ).bind(...(since ? [c.landing_slug, since] : [c.landing_slug])).first().catch(() => null)
      views = Number(v?.n || 0)
      const l: any = await db.prepare(
        `SELECT COUNT(*) AS n FROM form_submissions fs JOIN landing_pages lp ON lp.id = fs.landing_page_id
          WHERE lp.slug = ?${since ? ` AND ${GE('fs.created_at')}` : ''}`,
      ).bind(...(since ? [c.landing_slug, since] : [c.landing_slug])).first().catch(() => null)
      leads = Number(l?.n || 0)
    }
    const adBudget = Number(c.ad_budget) || 0
    const sendCost = Number(c.points_used) || 0 // 1P = 1원
    const totalCost = adBudget + sendCost
    rows.push({
      ...c,
      statusLabel: STATUS_LABEL[c.status] || c.status,
      views, leads,
      adBudget, sendCost, totalCost,
      cpa: leads > 0 ? Math.round(totalCost / leads) : 0,
      convRate: views > 0 ? Math.round((leads / views) * 1000) / 10 : 0,
      reachRate: Number(c.recipients) > 0 ? Math.round((Number(c.sent) / Number(c.recipients)) * 1000) / 10 : 0,
    })
  }

  const sum = (k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
  const totals = {
    campaigns: rows.length,
    sentCampaigns: rows.filter((r) => r.status === 'sent').length,
    recipients: sum('recipients'),
    sent: sum('sent'),
    failed: sum('failed'),
    views: sum('views'),
    leads: sum('leads'),
    adBudget: sum('adBudget'),
    sendCost: sum('sendCost'),
    totalCost: sum('totalCost'),
  }
  const t: any = totals
  t.cpa = totals.leads > 0 ? Math.round(totals.totalCost / totals.leads) : 0
  t.convRate = totals.views > 0 ? Math.round((totals.leads / totals.views) * 1000) / 10 : 0
  t.sentToLead = totals.sent > 0 ? Math.round((totals.leads / totals.sent) * 1000) / 10 : 0

  return json({ ok: true, totals: t, campaigns: rows, isAdmin })
}
