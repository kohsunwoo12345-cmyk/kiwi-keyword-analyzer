// GET/PUT/DELETE /api/crm/campaigns/:id
//   GET    집행 상세 + 결과 집계 (발송 결과 · 랜딩 조회수 · 신청자 · 집행 금액)
//   PUT    수정 (발송 전에만 내용 수정 가능)
//   DELETE 삭제
import { Env, json, ensureSchema, getSessionUser, resolveDB, asText } from '../../_utils'
import { ensureCrmSchema, ownsCampaign, CHANNELS, STATUS_LABEL } from '../_schema'
import { getMsgRates, smsKindOf } from '../../_msgcost'
import { ensureLandingSchema } from '../../landing/_lschema'

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

/**
 * 집행 하나의 결과를 모은다.
 *  · 발송: crm_execution_sends (수신자 단위 성공/실패)
 *  · 랜딩: landing_page_views(조회수) · form_submissions(신청자)
 *    — 집행일 00:00(KST) 이후 것만 센다. 그 전 방문은 이 집행의 성과가 아니다.
 *  · 금액: 광고비(회원 입력) + 발송비(실제 나간 포인트, 1P = 1원)
 */
async function buildResult(db: D1Database, c: any) {
  const sends = ((await db.prepare(
    'SELECT name, phone, ok, reason, created_at FROM crm_execution_sends WHERE campaign_id = ? ORDER BY rowid ASC LIMIT 2000',
  ).bind(c.id).all().catch(() => ({ results: [] }))).results as any[]) || []

  // KST 집행일 00:00 → UTC 로 환산(한국은 UTC+9라 전날 15:00Z)
  const sinceUtc = c.run_date ? new Date(`${c.run_date}T00:00:00+09:00`).toISOString() : ''
  const slug = c.landing_slug || ''

  /* ⚠ 시각을 글자 그대로 비교하면 안 된다 — 표마다 저장 형식이 다르다.
       landing_page_views.created_at 은 CURRENT_TIMESTAMP 기본값이라 '2026-07-31 15:04:43'
       (사이가 공백), form_submissions 는 앱이 넣는 ISO '2026-07-31T15:04:43.000Z'.
       SQLite 는 이걸 문자열로 견주는데 공백(0x20)이 'T'(0x54)보다 앞서서
       '2026-07-31 15:04:43' >= '2026-07-31T15:00:00.000Z' 가 거짓이 된다.
       그래서 집행일 00:00~09:00(KST) 사이에 들어온 조회가 통째로 빠졌다 —
       조회수가 0으로 보이고, 조회 1회당 단가와 발송→조회 전환율까지 같이 틀어졌다.
       양쪽을 'YYYY-MM-DDTHH:MM:SS' 한 형태로 맞춘 뒤 견준다(옛 자료도 그대로 살아난다). */
  const AT = (col: string) => `substr(replace(${col}, ' ', 'T'), 1, 19)`
  const GE = (col: string) => `${AT(col)} >= substr(?, 1, 19)`

  let views = 0, viewsTotal = 0, leads = 0, leadsTotal = 0
  let recent: any[] = []
  if (slug) {
    const q = async (sql: string, ...b: any[]) => {
      const r: any = await db.prepare(sql).bind(...b).first().catch(() => null)
      return Number(r?.n || 0)
    }
    viewsTotal = await q('SELECT COUNT(*) AS n FROM landing_page_views WHERE landing_slug = ?', slug)
    leadsTotal = await q(
      `SELECT COUNT(*) AS n FROM form_submissions fs JOIN landing_pages lp ON lp.id = fs.landing_page_id WHERE lp.slug = ?`, slug)
    if (sinceUtc) {
      views = await q(`SELECT COUNT(*) AS n FROM landing_page_views WHERE landing_slug = ? AND ${GE('created_at')}`, slug, sinceUtc)
      leads = await q(
        `SELECT COUNT(*) AS n FROM form_submissions fs JOIN landing_pages lp ON lp.id = fs.landing_page_id
          WHERE lp.slug = ? AND ${GE('fs.created_at')}`, slug, sinceUtc)
    } else { views = viewsTotal; leads = leadsTotal }
    recent = ((await db.prepare(
      `SELECT fs.name, fs.phone, fs.email, fs.created_at FROM form_submissions fs
         JOIN landing_pages lp ON lp.id = fs.landing_page_id
        WHERE lp.slug = ?${sinceUtc ? ` AND ${GE('fs.created_at')}` : ''}
        ORDER BY fs.created_at DESC LIMIT 100`,
    ).bind(...(sinceUtc ? [slug, sinceUtc] : [slug])).all().catch(() => ({ results: [] }))).results as any[]) || []

    // 유입 경로 — 이 집행이 문자/알림톡으로 만든 유입이 얼마나 되는지
    const chans = ((await db.prepare(
      `SELECT CASE
          WHEN utm_source='sms' THEN 'SMS 문자'
          WHEN utm_source='kakao' THEN '카카오'
          WHEN utm_source!='' AND utm_source IS NOT NULL THEN utm_source
          WHEN referrer!='' AND referrer IS NOT NULL THEN '기타 외부 링크'
          ELSE '직접 방문' END AS channel, COUNT(*) AS cnt
         FROM landing_page_views
        WHERE landing_slug = ?${sinceUtc ? ` AND ${GE('created_at')}` : ''}
        GROUP BY channel ORDER BY cnt DESC LIMIT 12`,
    ).bind(...(sinceUtc ? [slug, sinceUtc] : [slug])).all().catch(() => ({ results: [] }))).results as any[]) || []
    ;(c as any)._channels = chans
  }

  const adBudget = Number(c.ad_budget) || 0
  const sendCost = Number(c.points_used) || 0     // 1 포인트 = 1 원
  const totalCost = adBudget + sendCost
  const sent = Number(c.sent) || 0
  const recipients = Number(c.recipients) || 0

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
  return {
    sends,
    send: {
      recipients,
      sent,
      failed: Number(c.failed) || 0,
      successRate: pct(sent, recipients),
      unitPoints: Number(c.unit_points) || 0,
      msgKind: c.msg_kind || '',
      pointsUsed: sendCost,
      sentAt: c.sent_at || '',
    },
    landing: {
      slug,
      url: c.landing_url || (slug ? `/landing/${slug}` : ''),
      views, viewsTotal, leads, leadsTotal,
      recent,
      channels: (c as any)._channels || [],
    },
    money: {
      adBudget,
      sendCost,
      totalCost,
      // 신청자 1명을 만드는 데 든 총 비용
      cpa: leads > 0 ? Math.round(totalCost / leads) : 0,
      // 조회 1회당 비용
      cpv: views > 0 ? Math.round((totalCost / views) * 10) / 10 : 0,
    },
    funnel: {
      // 발송 → 조회 → 신청 로 이어지는 전환
      sentToView: pct(views, sent),
      viewToLead: pct(leads, views),
      sentToLead: pct(leads, sent),
    },
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const id = String((params as any).id || '')
  if (!(await ownsCampaign(db, me, id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)

  const c: any = await db.prepare(
    `SELECT c.*, g.name AS group_name, u.name AS owner_name, u.email AS owner_email,
            (SELECT COUNT(*) FROM contact_group_members m WHERE m.group_id = c.group_id) AS group_size
       FROM crm_executions c
       LEFT JOIN contact_groups g ON g.id = c.group_id
       LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = ?`,
  ).bind(id).first().catch(() => null)
  if (!c) return json({ ok: false, error: '집행을 찾을 수 없습니다.' }, 404)

  const result = await buildResult(db, c)
  // 관리자가 남의 집행을 볼 때도 "그 회원에게 얼마가 청구되는지"가 맞다
  const rates = await getMsgRates(db, c.user_id)
  const kind = c.channel === 'alimtalk' ? 'alimtalk' : smsKindOf(c.message || '')
  return json({
    ok: true,
    campaign: { ...c, statusLabel: STATUS_LABEL[c.status] || c.status },
    result,
    estimate: { unitPoints: rates.charge[kind], msgKind: kind, targetCount: Number(c.group_size) || 0, points: rates.charge[kind] * (Number(c.group_size) || 0) },
  })
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const id = String((params as any).id || '')
  if (!(await ownsCampaign(db, me, id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)

  const cur: any = await db.prepare('SELECT * FROM crm_executions WHERE id = ?').bind(id).first().catch(() => null)
  if (!cur) return json({ ok: false, error: '집행을 찾을 수 없습니다.' }, 404)
  // 이미 나간 발송은 내용을 못 바꾼다 — 결과와 문구가 어긋나면 리포트를 믿을 수 없다.
  if (cur.status === 'sent' || cur.status === 'sending')
    return json({ ok: false, error: '이미 발송된 집행은 수정할 수 없습니다.' }, 409)

  const b: any = await (request.json().catch(() => null)) ?? {}
  const sets: string[] = []
  const vals: any[] = []
  const put = (col: string, v: any) => { sets.push(`${col} = ?`); vals.push(v) }

  if (b.name !== undefined) { const v = asText(b.name, 120).trim(); if (!v) return json({ ok: false, error: '집행 이름을 입력하세요.' }, 400); put('name', v) }
  if (b.run_date !== undefined) { const v = asText(b.run_date, 10); if (!isDate(v)) return json({ ok: false, error: '집행일이 올바르지 않습니다.' }, 400); put('run_date', v) }
  if (b.landing_slug !== undefined) {
    const v = asText(b.landing_slug, 120)
    if (v) {
      const own = await db.prepare('SELECT id FROM landing_pages WHERE slug = ? AND user_id = ?').bind(v, cur.user_id).first().catch(() => null)
      if (!own) return json({ ok: false, error: '내 랜딩페이지가 아닙니다.' }, 403)
    }
    put('landing_slug', v || null)
  }
  if (b.landing_url !== undefined) put('landing_url', asText(b.landing_url, 500) || null)
  if (b.group_id !== undefined) {
    const v = asText(b.group_id, 40)
    if (v) {
      const own = await db.prepare('SELECT id FROM contact_groups WHERE id = ? AND user_id = ?').bind(v, cur.user_id).first().catch(() => null)
      if (!own) return json({ ok: false, error: '내 타깃 그룹이 아닙니다.' }, 403)
    }
    put('group_id', v || null)
  }
  if (b.ad_budget !== undefined) put('ad_budget', Math.max(0, Math.floor(Number(b.ad_budget) || 0)))
  if (b.channel !== undefined) put('channel', CHANNELS.includes(asText(b.channel) as any) ? asText(b.channel) : 'sms')
  if (b.template_code !== undefined) put('template_code', asText(b.template_code, 60) || null)
  if (b.sender_key !== undefined) put('sender_key', asText(b.sender_key, 120) || null)
  if (b.sender_phone !== undefined) put('sender_phone', asText(b.sender_phone, 20).replace(/[^0-9]/g, '') || null)
  if (b.message !== undefined) put('message', asText(b.message, 2000) || null)
  if (b.memo !== undefined) put('memo', asText(b.memo, 500) || null)
  if (b.scheduled_at !== undefined) {
    const v = asText(b.scheduled_at, 40)
    put('scheduled_at', v || null)
    put('status', v ? 'scheduled' : 'draft')
  }
  if (!sets.length) return json({ ok: true, message: '변경 사항 없음' })

  put('updated_at', new Date().toISOString())
  vals.push(id)
  const r = await db.prepare(`UPDATE crm_executions SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
  if (!r.meta || r.meta.changes === 0) return json({ ok: false, error: '집행을 찾을 수 없습니다.' }, 404)
  return json({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const id = String((params as any).id || '')
  if (!(await ownsCampaign(db, me, id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)
  await db.prepare('DELETE FROM crm_execution_sends WHERE campaign_id = ?').bind(id).run().catch(() => {})
  const r = await db.prepare('DELETE FROM crm_executions WHERE id = ?').bind(id).run()
  if (!r.meta || r.meta.changes === 0) return json({ ok: false, error: '집행을 찾을 수 없습니다.' }, 404)
  return json({ ok: true })
}
