// 집행 후속 발송 — 신청자 / 미신청자 나누기
//
//  문자를 받은 사람 중 실제로 신청한 사람과 안 한 사람을 갈라서,
//  "미신청자에게만 한 번 더" 를 쉽게 보낼 수 있게 한다.
//
//  GET  /api/crm/campaigns/:id/segments            → 두 무리와 명단
//  POST /api/crm/campaigns/:id/segments
//       { segment: 'not_applied' | 'applied', name? }
//         → 그 무리로 타깃 그룹을 만든다(이미 있으면 갱신) → 새 집행에 바로 쓸 수 있다
import { Env, json, ensureSchema, getSessionUser, resolveDB, asText, sameOriginOk } from '../../../_utils'
import { ensureCrmSchema, ownsCampaign } from '../../_schema'
import { ensureLandingSchema } from '../../../landing/_lschema'

const digits = (v: any) => String(v ?? '').replace(/[^0-9]/g, '')
const uid = (p: string) => p + crypto.randomUUID().slice(0, 16)

export type SegmentKey = 'applied' | 'not_applied'
export const SEGMENT_LABEL: Record<SegmentKey, string> = { applied: '신청자', not_applied: '미신청자' }

async function ensureGroupSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS contact_groups (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS contact_group_members (id TEXT PRIMARY KEY, group_id TEXT NOT NULL, name TEXT, phone TEXT NOT NULL, extra TEXT, created_at TEXT NOT NULL)`),
  ]).catch(() => {})
}

/** 이 집행이 만든 신청자의 전화번호 집합 (일반 랜딩 + 퍼널 랜딩 둘 다) */
async function leadPhones(db: D1Database, c: any): Promise<Map<string, string>> {
  const out = new Map<string, string>()   // 번호 → 신청일시
  const slug = asText(c.landing_slug, 120)
  if (!slug) return out
  // 집행일 00:00(KST) 이후 신청만 — 그 전 신청은 이 집행의 성과가 아니다
  const since = c.run_date ? new Date(`${c.run_date}T00:00:00+09:00`).toISOString() : ''

  const push = (rows: any[]) => {
    for (const r of rows) {
      const p = digits(r.phone)
      if (p.length >= 10 && !out.has(p)) out.set(p, String(r.created_at || ''))
    }
  }
  push(((await db.prepare(
    `SELECT fs.phone, fs.created_at FROM form_submissions fs
       JOIN landing_pages lp ON lp.id = fs.landing_page_id
      WHERE lp.slug = ?${since ? ' AND fs.created_at >= ?' : ''} LIMIT 20000`,
  ).bind(...(since ? [slug, since] : [slug])).all().catch(() => ({ results: [] as any[] }))).results as any[]) || [])
  push(((await db.prepare(
    `SELECT fa.phone, fa.created_at FROM funnel_applicants fa
       JOIN funnel_landing_pages flp ON flp.id = fa.landing_page_id
      WHERE flp.slug = ?${since ? ' AND fa.created_at >= ?' : ''} LIMIT 20000`,
  ).bind(...(since ? [slug, since] : [slug])).all().catch(() => ({ results: [] as any[] }))).results as any[]) || [])
  return out
}

/** 발송 대상을 신청/미신청으로 가른다 */
async function split(db: D1Database, c: any) {
  const sends = ((await db.prepare(
    'SELECT name, phone, ok FROM crm_execution_sends WHERE campaign_id = ? ORDER BY rowid ASC LIMIT 20000',
  ).bind(c.id).all().catch(() => ({ results: [] as any[] }))).results as any[]) || []

  const leads = await leadPhones(db, c)
  const applied: any[] = []
  const notApplied: any[] = []
  const failed: any[] = []
  const seen = new Set<string>()

  for (const s of sends) {
    const phone = digits(s.phone)
    if (phone.length < 10 || seen.has(phone)) continue
    seen.add(phone)
    const row = { name: String(s.name || ''), phone }
    // 발송이 실패한 사람은 애초에 문자를 못 받았다 — 미신청자로 묶으면
    //  "안 왔는데 왜 또 오냐" 가 아니라 "처음부터 못 받은 사람" 이므로 따로 센다.
    if (!Number(s.ok)) { failed.push(row); continue }
    if (leads.has(phone)) applied.push({ ...row, appliedAt: leads.get(phone) || '' })
    else notApplied.push(row)
  }
  return { applied, notApplied, failed, leadTotal: leads.size }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db); await ensureLandingSchema(db).catch(() => {})
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const id = asText((params as any).id, 64)
  if (!(await ownsCampaign(db, me, id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)

  const c: any = await db.prepare('SELECT * FROM crm_executions WHERE id = ?').bind(id).first().catch(() => null)
  if (!c) return json({ ok: false, error: '집행을 찾을 수 없습니다.' }, 404)

  const s = await split(db, c)
  // 이 집행에서 이미 만들어 둔 그룹이 있으면 알려준다(다시 만들지 않게)
  await ensureGroupSchema(db)
  const madeRows = ((await db.prepare(
    `SELECT g.id, g.name, (SELECT COUNT(*) FROM contact_group_members m WHERE m.group_id = g.id) AS cnt
       FROM contact_groups g WHERE g.user_id = ? AND g.name LIKE ? ORDER BY g.created_at DESC LIMIT 10`,
  ).bind(c.user_id, `%[${id}]%`).all().catch(() => ({ results: [] as any[] }))).results as any[]) || []

  return json({
    ok: true,
    campaign: { id: c.id, name: c.name, run_date: c.run_date, landing_slug: c.landing_slug, status: c.status, channel: c.channel },
    counts: {
      sent: s.applied.length + s.notApplied.length,
      applied: s.applied.length,
      notApplied: s.notApplied.length,
      failed: s.failed.length,
      /** 랜딩 전체 신청자 — 문자를 안 받고 들어온 사람도 있다 */
      leadTotal: s.leadTotal,
      applyRate: s.applied.length + s.notApplied.length > 0
        ? Math.round((s.applied.length / (s.applied.length + s.notApplied.length)) * 1000) / 10
        : 0,
    },
    applied: s.applied.slice(0, 500),
    notApplied: s.notApplied.slice(0, 500),
    failed: s.failed.slice(0, 200),
    groups: madeRows.map((g) => ({ id: String(g.id), name: String(g.name), count: Number(g.cnt || 0) })),
    labels: SEGMENT_LABEL,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db); await ensureLandingSchema(db).catch(() => {})
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  const id = asText((params as any).id, 64)
  if (!(await ownsCampaign(db, me, id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)

  const c: any = await db.prepare('SELECT * FROM crm_executions WHERE id = ?').bind(id).first().catch(() => null)
  if (!c) return json({ ok: false, error: '집행을 찾을 수 없습니다.' }, 404)
  // 관리자가 남의 집행을 보는 경우, 그룹은 그 집행 주인의 것으로 만든다
  const ownerId = String(c.user_id)

  const b: any = (await request.json().catch(() => null)) ?? {}
  const seg: SegmentKey = asText(b.segment) === 'applied' ? 'applied' : 'not_applied'

  const s = await split(db, c)
  const rows = seg === 'applied' ? s.applied : s.notApplied
  if (!rows.length) {
    return json({ ok: false, error: `${SEGMENT_LABEL[seg]}가 없습니다.`, count: 0 }, 400)
  }

  await ensureGroupSchema(db)
  const now = new Date().toISOString()
  // 이름에 집행 id 를 박아 두면 같은 집행에서 다시 만들 때 덮어쓸 수 있다
  const base = asText(b.name, 40).trim() || `${asText(c.name, 24)} · ${SEGMENT_LABEL[seg]}`
  const tag = `[${id}:${seg}]`
  const name = `${base} ${tag}`.slice(0, 60)

  let groupId = ''
  const exist: any = await db.prepare('SELECT id FROM contact_groups WHERE user_id = ? AND name LIKE ? LIMIT 1')
    .bind(ownerId, `%${tag}%`).first().catch(() => null)
  if (exist?.id) {
    groupId = String(exist.id)
    // 다시 만들면 최신 상태로 갈아끼운다(그 사이 신청한 사람이 빠지도록)
    await db.prepare('DELETE FROM contact_group_members WHERE group_id = ?').bind(groupId).run().catch(() => {})
    await db.prepare('UPDATE contact_groups SET name = ? WHERE id = ?').bind(name, groupId).run().catch(() => {})
  } else {
    groupId = uid('grp_')
    await db.prepare('INSERT INTO contact_groups (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
      .bind(groupId, ownerId, name, now).run()
  }

  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50)
    await db.batch(chunk.map((r: any) =>
      db.prepare('INSERT INTO contact_group_members (id, group_id, name, phone, extra, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(uid('cm_'), groupId, String(r.name || ''), String(r.phone), null, now),
    )).catch(() => {})
  }

  const cnt: any = await db.prepare('SELECT COUNT(*) AS n FROM contact_group_members WHERE group_id = ?').bind(groupId).first().catch(() => null)
  return json({
    ok: true,
    groupId,
    name,
    segment: seg,
    segmentLabel: SEGMENT_LABEL[seg],
    count: Number(cnt?.n || 0),
    /** 새 집행 이름 제안 — 화면이 그대로 채워 넣는다 */
    suggestName: `${asText(c.name, 30)} · ${SEGMENT_LABEL[seg]} 재발송`.slice(0, 60),
  })
}
