// GET /api/admin/team-comms — 관리자: 모든 팀 연락 내역(채팅+영상노드 공유) 조회·검색
//  · q: 검색어(발신자명·내용·팀명), teamId: 특정 팀, type: all|message|share
//  · 사진/영상은 media_key 를 그대로 반환 → 관리자 화면에서 /api/media/<key> 로 원본 표시
import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

async function ensureTeamTables(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_messages (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT, text TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_shares (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, from_user_id TEXT NOT NULL, from_name TEXT, to_user_id TEXT NOT NULL, name TEXT, graph TEXT NOT NULL, node_count INTEGER DEFAULT 0, received INTEGER DEFAULT 0, created_at TEXT NOT NULL)`),
  ]).catch(() => {})
  for (const col of ['kind TEXT', 'media_key TEXT', 'media_name TEXT']) {
    await db.prepare(`ALTER TABLE team_messages ADD COLUMN ${col}`).run().catch(() => {})
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureTeamTables(db)
  const guard = await requireAdminUser(request, db)
  if ('error' in guard) return guard.error

  const url = new URL(request.url)
  const q = String(url.searchParams.get('q') || '').trim().toLowerCase()
  const teamId = String(url.searchParams.get('teamId') || '').trim()
  const type = String(url.searchParams.get('type') || 'all')
  const limit = Math.min(300, Math.max(20, Number(url.searchParams.get('limit')) || 150))
  const like = '%' + q + '%'

  // 팀 목록(필터 드롭다운 + 이름 매핑)
  const teamRows = (await db.prepare('SELECT id, name FROM teams ORDER BY created_at DESC').all()).results || []
  const teamName: Record<string, string> = {}
  for (const t of teamRows as any[]) teamName[t.id] = t.name

  const items: any[] = []

  if (type === 'all' || type === 'message') {
    const rows = (await db.prepare(
      `SELECT m.id, m.team_id, m.user_id, m.name, m.text, m.kind, m.media_key, m.media_name, m.created_at, t.name AS team_name, u.email AS email
         FROM team_messages m
         LEFT JOIN teams t ON t.id = m.team_id
         LEFT JOIN users u ON u.id = m.user_id
        WHERE (? = '' OR m.team_id = ?)
          AND (? = '' OR LOWER(m.name) LIKE ? OR LOWER(m.text) LIKE ? OR LOWER(t.name) LIKE ? OR LOWER(u.email) LIKE ?)
        ORDER BY m.created_at DESC LIMIT ?`,
    ).bind(teamId, teamId, q, like, like, like, like, limit).all()).results || []
    for (const r of rows as any[]) {
      const kind = r.kind || 'text'
      items.push({
        type: 'message', id: r.id, teamId: r.team_id, teamName: r.team_name || teamName[r.team_id] || '(삭제된 팀)',
        userId: r.user_id, userName: r.name || '(알수없음)', email: r.email || '',
        kind, text: r.text || '', mediaKey: r.media_key || '', mediaName: r.media_name || '',
        mediaUrl: r.media_key ? `/api/media/${r.media_key}` : '', created_at: r.created_at,
      })
    }
  }

  if (type === 'all' || type === 'share') {
    const rows = (await db.prepare(
      `SELECT s.id, s.team_id, s.from_user_id, s.from_name, s.to_user_id, s.name, s.node_count, s.received, s.created_at,
              t.name AS team_name, uf.email AS from_email, ut.name AS to_name
         FROM team_shares s
         LEFT JOIN teams t ON t.id = s.team_id
         LEFT JOIN users uf ON uf.id = s.from_user_id
         LEFT JOIN users ut ON ut.id = s.to_user_id
        WHERE (? = '' OR s.team_id = ?)
          AND (? = '' OR LOWER(s.from_name) LIKE ? OR LOWER(s.name) LIKE ? OR LOWER(t.name) LIKE ? OR LOWER(ut.name) LIKE ?)
        ORDER BY s.created_at DESC LIMIT ?`,
    ).bind(teamId, teamId, q, like, like, like, like, limit).all()).results || []
    for (const r of rows as any[]) {
      items.push({
        type: 'share', id: r.id, teamId: r.team_id, teamName: r.team_name || teamName[r.team_id] || '(삭제된 팀)',
        userId: r.from_user_id, userName: r.from_name || '(알수없음)', email: r.from_email || '',
        kind: 'workflow', text: `영상 노드 워크플로 "${r.name || '무제'}" (노드 ${r.node_count || 0}개) → ${r.to_name || '팀원'} 에게 공유${r.received ? ' · 수신됨' : ''}`,
        toName: r.to_name || '', nodeCount: r.node_count || 0, received: r.received || 0,
        mediaKey: '', mediaUrl: '', created_at: r.created_at,
      })
    }
  }

  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const trimmed = items.slice(0, limit)

  // 통계
  const stats = {
    totalMessages: Number((await db.prepare('SELECT COUNT(*) AS c FROM team_messages').first() as any)?.c) || 0,
    totalShares: Number((await db.prepare('SELECT COUNT(*) AS c FROM team_shares').first() as any)?.c) || 0,
    totalTeams: (teamRows as any[]).length,
  }

  return json({ ok: true, items: trimmed, teams: teamRows, stats })
}
