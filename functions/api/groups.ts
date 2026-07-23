// 타깃 그룹(연락처 그룹) — 엑셀 DB 업로드로 만든 수신자 그룹을 저장·재사용.
//  캘린더 일정, 문자/알림톡 발송에서 동일한 그룹을 선택해 사용한다.
import { Env, json, resolveDB, ensureSchema, getSessionUser } from './_utils'

async function ensureGroupTables(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS contact_groups (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cg_user ON contact_groups(user_id, created_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS contact_group_members (id TEXT PRIMARY KEY, group_id TEXT NOT NULL, name TEXT, phone TEXT NOT NULL, extra TEXT, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cgm_group ON contact_group_members(group_id)`),
  ])
}
const uid = (p: string) => p + crypto.randomUUID().slice(0, 16)
const normPhone = (v: any) => String(v || '').replace(/[^0-9]/g, '')

async function ownsGroup(db: D1Database, groupId: string, userId: string) {
  const r = await db.prepare('SELECT id FROM contact_groups WHERE id = ? AND user_id = ?').bind(groupId, userId).first()
  return !!r
}

// GET /api/groups            → 내 그룹 목록(+인원수)
// GET /api/groups?members=ID → 그룹 멤버(수신자) 목록
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureGroupTables(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const url = new URL(request.url)
  const mg = url.searchParams.get('members')
  if (mg) {
    if (!(await ownsGroup(db, mg, me.id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)
    const rows = (await db.prepare('SELECT id, name, phone, extra, created_at FROM contact_group_members WHERE group_id = ? ORDER BY created_at ASC LIMIT 5000').bind(mg).all()).results || []
    const members = (rows as any[]).map((r) => { let extra: any = {}; try { extra = JSON.parse(r.extra || '{}') } catch {} return { id: r.id, name: r.name || '', phone: r.phone, extra, created_at: r.created_at } })
    return json({ ok: true, members })
  }

  const rows = (await db.prepare(
    `SELECT g.id, g.name, g.created_at, (SELECT COUNT(*) FROM contact_group_members m WHERE m.group_id = g.id) AS count
       FROM contact_groups g WHERE g.user_id = ? ORDER BY g.created_at DESC`,
  ).bind(me.id).all()).results || []
  return json({ ok: true, groups: rows })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureGroupTables(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')
  const now = new Date().toISOString()

  if (action === 'create') {
    const name = String(b.name || '').trim().slice(0, 60)
    if (!name) return json({ ok: false, error: '그룹 이름을 입력하세요.' }, 400)
    const id = uid('grp_')
    await db.prepare('INSERT INTO contact_groups (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').bind(id, me.id, name, now).run()
    return json({ ok: true, id, name })
  }

  if (action === 'rename') {
    const groupId = String(b.groupId || '')
    const name = String(b.name || '').trim().slice(0, 60)
    if (!groupId || !name) return json({ ok: false, error: '그룹과 이름이 필요합니다.' }, 400)
    if (!(await ownsGroup(db, groupId, me.id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)
    await db.prepare('UPDATE contact_groups SET name = ? WHERE id = ?').bind(name, groupId).run()
    return json({ ok: true })
  }

  if (action === 'del') {
    const groupId = String(b.groupId || '')
    if (!(await ownsGroup(db, groupId, me.id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)
    await db.prepare('DELETE FROM contact_group_members WHERE group_id = ?').bind(groupId).run().catch(() => {})
    await db.prepare('DELETE FROM contact_groups WHERE id = ?').bind(groupId).run()
    return json({ ok: true })
  }

  // 엑셀 DB 업로드 → 그룹에 수신자 대량 추가. groupId 없으면 name 으로 새 그룹 생성.
  if (action === 'import') {
    let groupId = String(b.groupId || '')
    const rows = Array.isArray(b.rows) ? b.rows : []
    if (!rows.length) return json({ ok: false, error: '추가할 연락처가 없습니다.' }, 400)
    if (rows.length > 10000) return json({ ok: false, error: '한 번에 최대 10,000명까지 가져올 수 있습니다.' }, 400)
    if (!groupId) {
      const name = String(b.name || '').trim().slice(0, 60)
      if (!name) return json({ ok: false, error: '그룹 이름을 입력하세요.' }, 400)
      groupId = uid('grp_')
      await db.prepare('INSERT INTO contact_groups (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').bind(groupId, me.id, name, now).run()
    } else if (!(await ownsGroup(db, groupId, me.id))) {
      return json({ ok: false, error: '권한이 없습니다.' }, 403)
    }
    // 기존 번호(중복 방지)
    const existing = new Set<string>()
    for (const r of ((await db.prepare('SELECT phone FROM contact_group_members WHERE group_id = ?').bind(groupId).all()).results || []) as any[]) existing.add(String(r.phone))
    let added = 0
    const stmts: D1PreparedStatement[] = []
    for (const row of rows) {
      const phone = normPhone(row.phone)
      if (phone.length < 10 || existing.has(phone)) continue
      existing.add(phone)
      const name = String(row.name || '').slice(0, 60)
      let extra = ''
      try { extra = row.extra && typeof row.extra === 'object' ? JSON.stringify(row.extra).slice(0, 2000) : '' } catch { extra = '' }
      stmts.push(db.prepare('INSERT INTO contact_group_members (id, group_id, name, phone, extra, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(uid('cm_'), groupId, name, phone, extra || null, now))
      added++
      if (stmts.length >= 50) { await db.batch(stmts.splice(0)) }
    }
    if (stmts.length) await db.batch(stmts)
    return json({ ok: true, groupId, added })
  }

  if (action === 'member_del') {
    const memberId = String(b.memberId || '')
    const groupId = String(b.groupId || '')
    if (!groupId || !(await ownsGroup(db, groupId, me.id))) return json({ ok: false, error: '권한이 없습니다.' }, 403)
    await db.prepare('DELETE FROM contact_group_members WHERE id = ? AND group_id = ?').bind(memberId, groupId).run()
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
