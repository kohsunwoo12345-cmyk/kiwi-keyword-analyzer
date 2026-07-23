import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

// 관리자 — 회원 채팅 기록 조회 (단체 팀 채팅 + 개인 DM)
//  GET /api/admin/chats                       → 대화 목록(팀·개인) + 마지막 메시지·건수
//  GET /api/admin/chats?type=team&id=<teamId> → 팀 채팅 전체 메시지(사진/영상 포함)
//  GET /api/admin/chats?type=dm&id=<convId>   → 개인 채팅 전체 메시지(사진/영상 포함)

const mediaUrl = (key: any) => (key ? '/api/media/' + key : '')

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const id = (url.searchParams.get('id') || '').trim()

  // ── 팀(단체) 채팅 상세 ──
  if (type === 'team' && id) {
    const team: any = await db.prepare('SELECT id, name, owner_id, created_at FROM teams WHERE id = ?').bind(id).first().catch(() => null)
    const members = (await db.prepare(
      `SELECT u.id, u.name, u.email, m.role FROM team_members m JOIN users u ON u.id = m.user_id WHERE m.team_id = ? ORDER BY m.joined_at ASC`,
    ).bind(id).all().catch(() => ({ results: [] }))).results as any[] || []
    const rows = (await db.prepare(
      `SELECT id, user_id, name, text, kind, media_key, media_name, created_at
       FROM team_messages WHERE team_id = ? ORDER BY created_at ASC LIMIT 2000`,
    ).bind(id).all().catch(() => ({ results: [] }))).results as any[] || []
    return json({
      ok: true,
      conversation: { type: 'team', id, name: team?.name || '(삭제된 팀)', createdAt: team?.created_at || '', members },
      messages: rows.map((m) => ({
        id: m.id, userId: m.user_id, name: m.name || '(탈퇴)', text: m.text || '',
        kind: m.kind || 'text', mediaUrl: mediaUrl(m.media_key), mediaName: m.media_name || '', createdAt: m.created_at,
      })),
    })
  }

  // ── 개인(DM) 채팅 상세 ──
  if (type === 'dm' && id) {
    // 참여자 = 메시지의 from/to 합집합 (conv_id 파싱에 의존하지 않아 안전)
    const parts = (await db.prepare(
      `SELECT u.id, u.name, u.email FROM users u
       WHERE u.id IN (SELECT from_id FROM dm_messages WHERE conv_id = ? UNION SELECT to_id FROM dm_messages WHERE conv_id = ?)`,
    ).bind(id, id).all().catch(() => ({ results: [] }))).results as any[] || []
    const rows = (await db.prepare(
      `SELECT id, from_id, to_id, text, kind, media_key, media_name, created_at
       FROM dm_messages WHERE conv_id = ? ORDER BY created_at ASC LIMIT 2000`,
    ).bind(id).all().catch(() => ({ results: [] }))).results as any[] || []
    const nameOf: Record<string, string> = {}
    for (const p of parts) nameOf[p.id] = p.name || '(탈퇴)'
    return json({
      ok: true,
      conversation: { type: 'dm', id, name: parts.map((p) => p.name || '(탈퇴)').join(' ↔ '), members: parts },
      messages: rows.map((m) => ({
        id: m.id, userId: m.from_id, name: nameOf[m.from_id] || '(탈퇴)', text: m.text || '',
        kind: m.kind || 'text', mediaUrl: mediaUrl(m.media_key), mediaName: m.media_name || '', createdAt: m.created_at,
      })),
    })
  }

  // ── 목록 ──
  // 팀(단체) 채팅
  const teams = (await db.prepare(
    `SELECT t.id, t.name, t.owner_id, t.created_at,
            (SELECT COUNT(*) FROM team_members mm WHERE mm.team_id = t.id) AS member_count,
            (SELECT COUNT(*) FROM team_messages gm WHERE gm.team_id = t.id) AS msg_count,
            (SELECT text FROM team_messages gm WHERE gm.team_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_text,
            (SELECT kind FROM team_messages gm WHERE gm.team_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_kind,
            (SELECT created_at FROM team_messages gm WHERE gm.team_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_at
     FROM teams t ORDER BY COALESCE((SELECT created_at FROM team_messages gm WHERE gm.team_id = t.id ORDER BY created_at DESC LIMIT 1), t.created_at) DESC LIMIT 300`,
  ).all().catch(() => ({ results: [] }))).results as any[] || []

  // 개인(DM) 채팅 — conv_id 별 집계
  const dmConvs = (await db.prepare(
    `SELECT conv_id,
            COUNT(*) AS msg_count,
            MAX(created_at) AS last_at
     FROM dm_messages GROUP BY conv_id ORDER BY last_at DESC LIMIT 300`,
  ).all().catch(() => ({ results: [] }))).results as any[] || []

  const dms: any[] = []
  for (const c of dmConvs) {
    const last: any = await db.prepare(
      'SELECT text, kind, from_id FROM dm_messages WHERE conv_id = ? ORDER BY created_at DESC LIMIT 1',
    ).bind(c.conv_id).first().catch(() => null)
    const parts = (await db.prepare(
      `SELECT u.id, u.name FROM users u
       WHERE u.id IN (SELECT from_id FROM dm_messages WHERE conv_id = ? UNION SELECT to_id FROM dm_messages WHERE conv_id = ?)`,
    ).bind(c.conv_id, c.conv_id).all().catch(() => ({ results: [] }))).results as any[] || []
    dms.push({
      id: c.conv_id,
      participants: parts.map((p) => ({ id: p.id, name: p.name || '(탈퇴)' })),
      name: parts.map((p) => p.name || '(탈퇴)').join(' ↔ ') || '(알 수 없음)',
      msgCount: Number(c.msg_count) || 0,
      lastText: last?.text || (last?.kind === 'image' ? '사진' : last?.kind === 'video' ? '동영상' : ''),
      lastAt: c.last_at,
    })
  }

  return json({
    ok: true,
    teams: teams.map((t) => ({
      id: t.id, name: t.name || '(삭제된 팀)', memberCount: Number(t.member_count) || 0,
      msgCount: Number(t.msg_count) || 0,
      lastText: t.last_text || (t.last_kind === 'image' ? '사진' : t.last_kind === 'video' ? '동영상' : ''),
      lastAt: t.last_at || '',
    })),
    dms,
  })
}
