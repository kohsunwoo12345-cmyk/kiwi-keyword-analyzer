import { Env, json, resolveDB, ensureSchema, getSessionUser, addNotification, ADMIN_EMAIL } from './_utils'

// 팀 요금제 활성 여부(만료 이전 or 관리자)
function teamPlanActive(u: any): boolean {
  if (!u) return false
  if (u.email === ADMIN_EMAIL || u.role === 'admin') return true
  return Number(u.team_plan) === 1 && !!u.team_until && u.team_until > new Date().toISOString()
}

async function ensureTeamTables(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_members (team_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT DEFAULT 'member', joined_at TEXT NOT NULL, PRIMARY KEY (team_id, user_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_invites (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, from_user_id TEXT NOT NULL, to_user_id TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_messages (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT, text TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tm_team ON team_messages(team_id, created_at)`),
    // 노드 공유: 발신자→각 수신자별 1행. received=1 이면 수신자 워크플로에 저장 완료.
    db.prepare(`CREATE TABLE IF NOT EXISTS team_shares (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, from_user_id TEXT NOT NULL, from_name TEXT, to_user_id TEXT NOT NULL, name TEXT, graph TEXT NOT NULL, node_count INTEGER DEFAULT 0, received INTEGER DEFAULT 0, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_ts_to ON team_shares(to_user_id, received)`),
  ])
}
const uid = (p: string) => p + crypto.randomUUID().slice(0, 16)
async function isMember(db: D1Database, teamId: string, userId: string) {
  const r = await db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').bind(teamId, userId).first()
  return !!r
}

// GET /api/team              → 내 팀·멤버·받은 초대
// GET /api/team?messages=ID&after=ISO → 팀 채팅 메시지
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureTeamTables(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const url = new URL(request.url)
  const msgTeam = url.searchParams.get('messages')
  if (msgTeam) {
    if (!(await isMember(db, msgTeam, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const after = url.searchParams.get('after') || ''
    const rows = (await db.prepare(
      'SELECT id, user_id, name, text, created_at FROM team_messages WHERE team_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 200',
    ).bind(msgTeam, after).all()).results || []
    return json({ ok: true, messages: rows, meId: me.id })
  }

  const teamRows = (await db.prepare(
    `SELECT t.id, t.name, t.owner_id, m.role FROM team_members m JOIN teams t ON t.id = m.team_id WHERE m.user_id = ? ORDER BY t.created_at DESC`,
  ).bind(me.id).all()).results || []
  const teams = []
  for (const t of teamRows as any[]) {
    const members = (await db.prepare(
      `SELECT u.id, u.name, u.email, m.role FROM team_members m JOIN users u ON u.id = m.user_id WHERE m.team_id = ?`,
    ).bind(t.id).all()).results || []
    teams.push({ id: t.id, name: t.name, ownerId: t.owner_id, role: t.role, members })
  }
  const invites = (await db.prepare(
    `SELECT i.id, i.team_id AS teamId, t.name AS teamName, u.name AS fromName FROM team_invites i JOIN teams t ON t.id = i.team_id JOIN users u ON u.id = i.from_user_id WHERE i.to_user_id = ? AND i.status = 'pending' ORDER BY i.created_at DESC`,
  ).bind(me.id).all()).results || []
  // 내게 온 미수신 노드 공유
  const shareRows = (await db.prepare(
    `SELECT id, from_name, name, graph, node_count, created_at FROM team_shares WHERE to_user_id = ? AND received = 0 ORDER BY created_at ASC LIMIT 20`,
  ).bind(me.id).all()).results || []
  const shares = (shareRows as any[]).map((s) => {
    let graph: any = null
    try { graph = JSON.parse(s.graph) } catch { graph = null }
    return { id: s.id, fromName: s.from_name || '', name: s.name || '', nodeCount: s.node_count || 0, graph, created_at: s.created_at }
  }).filter((s) => s.graph)
  return json({ ok: true, teams, invites, shares, meId: me.id, meName: me.name })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureTeamTables(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')
  const now = new Date().toISOString()

  if (action === 'create') {
    if (!teamPlanActive(me)) return json({ ok: false, error: '팀 요금제 결제가 필요합니다.', needTeamPlan: true }, 402)
    const name = String(b.name || '').trim().slice(0, 40)
    if (!name) return json({ ok: false, error: '팀 이름을 입력하세요.' }, 400)
    const id = uid('tm_')
    await db.prepare('INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)').bind(id, name, me.id, now).run()
    await db.prepare('INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').bind(id, me.id, 'owner', now).run()
    return json({ ok: true, teamId: id })
  }

  if (action === 'invite') {
    const teamId = String(b.teamId || '')
    const ident = String(b.ident || '').trim()
    if (!teamId || !ident) return json({ ok: false, error: '팀과 아이디를 입력하세요.' }, 400)
    if (!(await isMember(db, teamId, me.id))) return json({ ok: false, error: '팀 멤버만 초대할 수 있습니다.' }, 403)
    // 좌석 라이선스는 팀 오너 기준: 오너의 팀 요금제가 활성이어야 하고 좌석 여유가 있어야 함
    const owner: any = await db.prepare('SELECT u.* FROM teams t JOIN users u ON u.id = t.owner_id WHERE t.id = ?').bind(teamId).first()
    if (!teamPlanActive(owner)) return json({ ok: false, error: '팀 오너의 팀 요금제가 만료되었거나 없습니다.', needTeamPlan: true }, 402)
    const seatLimit = owner.email === ADMIN_EMAIL || owner.role === 'admin' ? 99 : Number(owner.team_seats) || 0
    const memCount = Number((await db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').bind(teamId).first() as any)?.c) || 0
    const pendCount = Number((await db.prepare("SELECT COUNT(*) AS c FROM team_invites WHERE team_id = ? AND status='pending'").bind(teamId).first() as any)?.c) || 0
    if (memCount + pendCount >= seatLimit) return json({ ok: false, error: `좌석이 부족합니다 (${seatLimit}좌석). 팀 요금제에서 좌석을 추가하세요.`, seatFull: true }, 409)
    // 아이디(이메일) 또는 추천코드로 사용자 조회
    const target: any = await db.prepare('SELECT id, name FROM users WHERE email = ? OR referral_code = ?').bind(ident.toLowerCase(), ident.toUpperCase()).first()
    if (!target) return json({ ok: false, error: '해당 아이디의 사용자를 찾을 수 없습니다.', notFound: true }, 404)
    if (target.id === me.id) return json({ ok: false, error: '본인은 초대할 수 없습니다.' }, 400)
    if (await isMember(db, teamId, target.id)) return json({ ok: false, error: '이미 팀 멤버입니다.' }, 409)
    const dup = await db.prepare("SELECT id FROM team_invites WHERE team_id = ? AND to_user_id = ? AND status = 'pending'").bind(teamId, target.id).first()
    if (dup) return json({ ok: false, error: '이미 초대를 보냈습니다.' }, 409)
    const team: any = await db.prepare('SELECT name FROM teams WHERE id = ?').bind(teamId).first()
    await db.prepare('INSERT INTO team_invites (id, team_id, from_user_id, to_user_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(uid('ti_'), teamId, me.id, target.id, 'pending', now).run()
    await addNotification(db, target.id, '팀 초대가 도착했어요 👥', `${me.name}님이 "${team?.name || '팀'}" 팀에 초대했습니다. 스튜디오 팀워크에서 수락하세요.`).catch(() => {})
    return json({ ok: true, invitedName: target.name })
  }

  if (action === 'respond') {
    const inviteId = String(b.inviteId || '')
    const accept = b.accept === true || b.accept === 1 || b.accept === '1'
    const inv: any = await db.prepare("SELECT * FROM team_invites WHERE id = ? AND to_user_id = ? AND status = 'pending'").bind(inviteId, me.id).first()
    if (!inv) return json({ ok: false, error: '초대를 찾을 수 없습니다.' }, 404)
    await db.prepare('UPDATE team_invites SET status = ? WHERE id = ?').bind(accept ? 'accepted' : 'declined', inviteId).run()
    if (accept) {
      await db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').bind(inv.team_id, me.id, 'member', now).run()
    }
    return json({ ok: true })
  }

  if (action === 'share') {
    const teamId = String(b.teamId || '')
    if (!teamId) return json({ ok: false, error: '팀을 선택하세요.' }, 400)
    if (!(await isMember(db, teamId, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const graph = b.graph
    if (!graph || !Array.isArray(graph.nodes) || !graph.nodes.length) return json({ ok: false, error: '공유할 노드가 없습니다.' }, 400)
    const graphStr = JSON.stringify(graph)
    if (graphStr.length > 900000) return json({ ok: false, error: '워크플로가 너무 큽니다. 생성 결과가 큰 노드는 줄여서 공유하세요.' }, 413)
    const name = String(b.name || '공유 워크플로').slice(0, 60)
    const nodeCount = graph.nodes.length
    // 팀의 다른 멤버 전원에게 전달
    const members = (await db.prepare('SELECT user_id FROM team_members WHERE team_id = ? AND user_id != ?').bind(teamId, me.id).all()).results || []
    if (!members.length) return json({ ok: false, error: '공유할 팀원이 없습니다. 먼저 팀원을 초대하세요.' }, 400)
    for (const m of members as any[]) {
      await db.prepare('INSERT INTO team_shares (id, team_id, from_user_id, from_name, to_user_id, name, graph, node_count, received, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)')
        .bind(uid('sh_'), teamId, me.id, me.name, m.user_id, name, graphStr, nodeCount, now).run()
      await addNotification(db, m.user_id, '워크플로가 공유되었어요 🔗', `${me.name}님이 "${name}"(노드 ${nodeCount}개)를 공유했습니다. 스튜디오 팀워크에서 내 워크플로로 저장하세요.`).catch(() => {})
    }
    return json({ ok: true, sent: members.length })
  }

  if (action === 'share_ack') {
    const shareId = String(b.shareId || '')
    if (!shareId) return json({ ok: false, error: 'shareId 필요' }, 400)
    await db.prepare('UPDATE team_shares SET received = 1 WHERE id = ? AND to_user_id = ?').bind(shareId, me.id).run()
    return json({ ok: true })
  }

  if (action === 'send') {
    const teamId = String(b.teamId || '')
    const text = String(b.text || '').trim().slice(0, 2000)
    if (!teamId || !text) return json({ ok: false, error: '메시지를 입력하세요.' }, 400)
    if (!(await isMember(db, teamId, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const id = uid('msg_')
    await db.prepare('INSERT INTO team_messages (id, team_id, user_id, name, text, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, teamId, me.id, me.name, text, now).run()
    return json({ ok: true, id, created_at: now })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
