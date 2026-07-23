import { Env, json, resolveDB, ensureSchema, getSessionUser, addNotification, ADMIN_EMAIL } from './_utils'
import { signTcalShare } from './_tcal'

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
    // 마케팅 집행 캘린더: visibility = team(전체)·private(본인만)·user(특정 사용자에게 공유)
    db.prepare(`CREATE TABLE IF NOT EXISTS team_cal_events (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, owner_id TEXT NOT NULL, owner_name TEXT, d TEXT NOT NULL, title TEXT NOT NULL, color TEXT DEFAULT 'sky', memo TEXT, visibility TEXT DEFAULT 'team', target_user_id TEXT, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tce_team ON team_cal_events(team_id, d)`),
    // 여러 개의 캘린더(보드) — 워크플로 상단 탭처럼 팀당 여러 캘린더 생성
    db.prepare(`CREATE TABLE IF NOT EXISTS team_cal_boards (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, name TEXT NOT NULL, owner_id TEXT, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tcb_team ON team_cal_boards(team_id, created_at)`),
  ])
  // team_messages 미디어 첨부 컬럼(사진·영상) — 기존 테이블에 없으면 추가
  for (const col of ['kind TEXT', 'media_key TEXT', 'media_name TEXT']) {
    await db.prepare(`ALTER TABLE team_messages ADD COLUMN ${col}`).run().catch(() => {})
  }
  // team_cal_events 에 board_id 컬럼(캘린더 소속) — 없으면 추가
  await db.prepare(`ALTER TABLE team_cal_events ADD COLUMN board_id TEXT`).run().catch(() => {})
}

// 팀의 캘린더(보드) 목록 — 없으면 기본 캘린더 자동 생성 + 기존 미분류 일정 이관
async function ensureBoards(db: D1Database, teamId: string, now: string) {
  let rows = (await db.prepare('SELECT id, name, owner_id, created_at FROM team_cal_boards WHERE team_id = ? ORDER BY created_at ASC').bind(teamId).all()).results || []
  if (!rows.length) {
    const id = 'cb_' + crypto.randomUUID().slice(0, 16)
    await db.prepare('INSERT INTO team_cal_boards (id, team_id, name, owner_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, teamId, '기본 캘린더', '', now).run()
    // 기존 board_id 없는 일정을 기본 캘린더로 이관
    await db.prepare('UPDATE team_cal_events SET board_id = ? WHERE team_id = ? AND (board_id IS NULL OR board_id = ?)').bind(id, teamId, '').run().catch(() => {})
    rows = (await db.prepare('SELECT id, name, owner_id, created_at FROM team_cal_boards WHERE team_id = ? ORDER BY created_at ASC').bind(teamId).all()).results || []
  }
  return rows as any[]
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
      'SELECT id, user_id, name, text, kind, media_key, media_name, created_at FROM team_messages WHERE team_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 200',
    ).bind(msgTeam, after).all()).results || []
    return json({ ok: true, messages: rows, meId: me.id })
  }

  // 팀 캘린더(보드) 목록 — 워크플로 탭처럼 여러 캘린더
  const boardsTeam = url.searchParams.get('boards')
  if (boardsTeam) {
    if (!(await isMember(db, boardsTeam, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const boards = await ensureBoards(db, boardsTeam, new Date().toISOString())
    return json({ ok: true, boards, meId: me.id })
  }

  // 집행 캘린더 조회: 내게 보이는 이벤트만(팀 공유 + 내가 만든 것 + 내게 개별 공유된 것)
  const calTeam = url.searchParams.get('calendar')
  if (calTeam) {
    if (!(await isMember(db, calTeam, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const month = String(url.searchParams.get('month') || '') // 'YYYY-MM' 접두 필터(선택)
    const boardId = String(url.searchParams.get('board') || '')
    const like = month ? month + '%' : '%'
    const boardClause = boardId ? ' AND board_id = ?' : ''
    const binds: any[] = [calTeam, like, me.id, me.id]
    if (boardId) binds.push(boardId)
    const rows = (await db.prepare(
      `SELECT id, owner_id, owner_name, d, title, color, memo, visibility, target_user_id, board_id, created_at
         FROM team_cal_events
        WHERE team_id = ? AND d LIKE ?
          AND (visibility = 'team' OR owner_id = ? OR (visibility = 'user' AND target_user_id = ?))${boardClause}
        ORDER BY d ASC, created_at ASC LIMIT 500`,
    ).bind(...binds).all()).results || []
    return json({ ok: true, events: rows, meId: me.id })
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
    const kind = ['image', 'video'].includes(String(b.kind)) ? String(b.kind) : 'text'
    const mediaKey = String(b.mediaKey || '').slice(0, 200)
    const mediaName = String(b.mediaName || '').slice(0, 120)
    if (!(await isMember(db, teamId, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    // 미디어 메시지는 텍스트가 없어도 되지만, 유효한 media_key 가 필요
    if (kind === 'text' && !text) return json({ ok: false, error: '메시지를 입력하세요.' }, 400)
    if (kind !== 'text' && !mediaKey) return json({ ok: false, error: '첨부 파일이 없습니다.' }, 400)
    const id = uid('msg_')
    await db.prepare('INSERT INTO team_messages (id, team_id, user_id, name, text, kind, media_key, media_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, teamId, me.id, me.name, text, kind, kind === 'text' ? null : mediaKey, kind === 'text' ? null : mediaName, now).run()
    return json({ ok: true, id, created_at: now, kind, media_key: kind === 'text' ? null : mediaKey })
  }

  if (action === 'cal_add') {
    const teamId = String(b.teamId || '')
    if (!(await isMember(db, teamId, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const title = String(b.title || '').trim().slice(0, 120)
    const d = String(b.d || '').trim().slice(0, 10) // YYYY-MM-DD
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return json({ ok: false, error: '일정 제목과 날짜를 입력하세요.' }, 400)
    const color = ['violet', 'sky', 'emerald', 'amber', 'rose'].includes(String(b.color)) ? String(b.color) : 'sky'
    const memo = String(b.memo || '').slice(0, 500)
    let visibility = ['team', 'private', 'user'].includes(String(b.visibility)) ? String(b.visibility) : 'team'
    let target = String(b.targetUserId || '').trim()
    if (visibility === 'user') {
      if (!target) return json({ ok: false, error: '공유할 팀원을 선택하세요.' }, 400)
      if (!(await isMember(db, teamId, target))) return json({ ok: false, error: '해당 팀원이 이 팀에 없습니다.' }, 400)
    } else {
      target = ''
    }
    // 소속 캘린더(보드) — 미지정 시 기본 캘린더로
    let boardId = String(b.boardId || '').trim()
    const boards = await ensureBoards(db, teamId, now)
    if (!boardId || !boards.some((x: any) => x.id === boardId)) boardId = boards[0].id
    const id = uid('ce_')
    await db.prepare('INSERT INTO team_cal_events (id, team_id, owner_id, owner_name, d, title, color, memo, visibility, target_user_id, board_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, teamId, me.id, me.name, d, title, color, memo, visibility, target || null, boardId, now).run()
    // 개별 공유는 대상자에게 알림
    if (visibility === 'user' && target) {
      await addNotification(db, target, '집행 일정이 공유되었어요 📅', `${me.name}님이 "${title}"(${d}) 일정을 공유했습니다.`).catch(() => {})
    }
    return json({ ok: true, id })
  }

  if (action === 'cal_del') {
    const eventId = String(b.eventId || '')
    if (!eventId) return json({ ok: false, error: 'eventId 필요' }, 400)
    // 본인이 만든 일정만 삭제
    const r = await db.prepare('DELETE FROM team_cal_events WHERE id = ? AND owner_id = ?').bind(eventId, me.id).run()
    if (!(r.meta && r.meta.changes)) return json({ ok: false, error: '본인이 등록한 일정만 삭제할 수 있습니다.' }, 403)
    return json({ ok: true })
  }

  if (action === 'board_add') {
    const teamId = String(b.teamId || '')
    if (!(await isMember(db, teamId, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const name = String(b.name || '').trim().slice(0, 40)
    if (!name) return json({ ok: false, error: '캘린더 이름을 입력하세요.' }, 400)
    await ensureBoards(db, teamId, now) // 기본 캘린더 보장
    const cnt = Number((await db.prepare('SELECT COUNT(*) AS c FROM team_cal_boards WHERE team_id = ?').bind(teamId).first() as any)?.c) || 0
    if (cnt >= 20) return json({ ok: false, error: '캘린더는 팀당 최대 20개까지 만들 수 있습니다.' }, 409)
    const id = 'cb_' + crypto.randomUUID().slice(0, 16)
    await db.prepare('INSERT INTO team_cal_boards (id, team_id, name, owner_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, teamId, name, me.id, now).run()
    return json({ ok: true, id, name })
  }

  if (action === 'board_del') {
    const boardId = String(b.boardId || '')
    if (!boardId) return json({ ok: false, error: 'boardId 필요' }, 400)
    const board: any = await db.prepare('SELECT team_id FROM team_cal_boards WHERE id = ?').bind(boardId).first()
    if (!board) return json({ ok: false, error: '캘린더를 찾을 수 없습니다.' }, 404)
    if (!(await isMember(db, board.team_id, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const cnt = Number((await db.prepare('SELECT COUNT(*) AS c FROM team_cal_boards WHERE team_id = ?').bind(board.team_id).first() as any)?.c) || 0
    if (cnt <= 1) return json({ ok: false, error: '마지막 캘린더는 삭제할 수 없습니다.' }, 400)
    await db.prepare('DELETE FROM team_cal_events WHERE board_id = ?').bind(boardId).run().catch(() => {})
    await db.prepare('DELETE FROM team_cal_boards WHERE id = ?').bind(boardId).run()
    return json({ ok: true })
  }

  if (action === 'cal_share') {
    const boardId = String(b.boardId || '')
    if (!boardId) return json({ ok: false, error: 'boardId 필요' }, 400)
    const board: any = await db.prepare('SELECT team_id, name FROM team_cal_boards WHERE id = ?').bind(boardId).first()
    if (!board) return json({ ok: false, error: '캘린더를 찾을 수 없습니다.' }, 404)
    if (!(await isMember(db, board.team_id, me.id))) return json({ ok: false, error: '팀 멤버가 아닙니다.' }, 403)
    const token = await signTcalShare(env, boardId)
    const origin = new URL(request.url).origin
    return json({ ok: true, token, url: `${origin}/tcal/${token}`, name: board.name })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
