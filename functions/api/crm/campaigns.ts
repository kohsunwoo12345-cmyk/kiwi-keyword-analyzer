// GET/POST /api/crm/campaigns — CRM 마케팅 집행 목록·등록
//   GET  ?from=YYYY-MM-DD&to=YYYY-MM-DD  캘린더가 보는 기간
//        ?all=1 (관리자) 전 회원 집행
//   POST 집행 등록
import { Env, json, ensureSchema, getSessionUser, resolveDB, asText, asBindable } from '../_utils'
import { ensureCrmSchema, CHANNELS } from './_schema'
import { getMsgRates, smsKindOf } from '../_msgcost'

const uid = () => 'cmp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

/** 집행에 붙은 타깃 그룹의 인원수 (내 그룹만) */
async function groupSize(db: D1Database, userId: string, groupId: string): Promise<number> {
  if (!groupId) return 0
  const r: any = await db.prepare(
    `SELECT COUNT(*) AS n FROM contact_group_members m
      JOIN contact_groups g ON g.id = m.group_id
     WHERE m.group_id = ? AND g.user_id = ?`,
  ).bind(groupId, userId).first().catch(() => null)
  return Number(r?.n || 0)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db)
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
    SELECT c.*, g.name AS group_name, u.name AS owner_name, u.email AS owner_email,
           (SELECT COUNT(*) FROM contact_group_members m WHERE m.group_id = c.group_id) AS group_size
      FROM crm_executions c
      LEFT JOIN contact_groups g ON g.id = c.group_id
      LEFT JOIN users u ON u.id = c.user_id
      ${wh}
     ORDER BY c.run_date DESC, c.created_at DESC
     LIMIT 500`
  const rows = ((await (binds.length ? db.prepare(sql).bind(...binds) : db.prepare(sql)).all().catch(() => ({ results: [] }))).results as any[]) || []
  const rates = await getMsgRates(db)
  return json({ ok: true, campaigns: rows, rates: rates.charge, isAdmin })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await (request.json().catch(() => null)) ?? {}
  const name = asText(b.name, 120).trim()
  const runDate = asText(b.run_date, 10)
  if (!name) return json({ ok: false, error: '집행 이름을 입력하세요.' }, 400)
  if (!isDate(runDate)) return json({ ok: false, error: '집행일을 선택하세요.' }, 400)

  const channel = CHANNELS.includes(asText(b.channel) as any) ? asText(b.channel) : 'sms'
  const groupId = asText(b.group_id, 40)
  // 남의 타깃 그룹을 붙일 수 없다 — 그 그룹엔 다른 사람의 전화번호가 들어 있다.
  if (groupId) {
    const own = await db.prepare('SELECT id FROM contact_groups WHERE id = ? AND user_id = ?')
      .bind(groupId, me.id).first().catch(() => null)
    if (!own) return json({ ok: false, error: '내 타깃 그룹이 아닙니다.' }, 403)
  }
  // 랜딩 slug 도 내 것만 (결과 집계가 그 페이지의 신청자·조회수를 가져오기 때문)
  const landingSlug = asText(b.landing_slug, 120)
  if (landingSlug) {
    const own = await db.prepare('SELECT id FROM landing_pages WHERE slug = ? AND user_id = ?')
      .bind(landingSlug, me.id).first().catch(() => null)
    if (!own) return json({ ok: false, error: '내 랜딩페이지가 아닙니다.' }, 403)
  }

  const message = asText(b.message, 2000)
  const scheduledAt = asText(b.scheduled_at, 40)
  const status = scheduledAt ? 'scheduled' : 'draft'
  const now = new Date().toISOString()
  const id = uid()

  await db.prepare(
    `INSERT INTO crm_executions
       (id, user_id, name, run_date, landing_slug, landing_url, group_id, ad_budget, channel,
        template_code, sender_key, sender_phone, message, scheduled_at, status, memo, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    id, me.id, name, runDate, landingSlug || null, asText(b.landing_url, 500) || null,
    groupId || null, Math.max(0, Math.floor(Number(b.ad_budget) || 0)), channel,
    asText(b.template_code, 60) || null, asText(b.sender_key, 120) || null,
    asText(b.sender_phone, 20).replace(/[^0-9]/g, '') || null,
    message || null, scheduledAt || null, status, asText(b.memo, 500) || null, now, now,
  ).run()

  const size = await groupSize(db, me.id, groupId)
  const rates = await getMsgRates(db)
  const kind = channel === 'alimtalk' ? 'alimtalk' : smsKindOf(message)
  return json({ ok: true, id, status, targetCount: size, estimatePoints: rates.charge[kind] * size, unitPoints: rates.charge[kind], msgKind: kind })
}
