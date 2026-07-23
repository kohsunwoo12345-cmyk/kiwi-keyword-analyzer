import { Env, json, resolveDB, ensureSchema, getSessionUser, addNotification, sameOriginOk } from './_utils'

// 개인(1:1) 채팅 — 카카오톡식 친구 채팅.
//  · 친구(friendships)끼리만 대화 가능.
//  · 단체 채팅(팀)은 /api/team 을 그대로 사용하고, 여기서는 목록에 팀도 함께 실어 준다.
//
//  GET  /api/social                         → 내 프로필 + 친구목록 + 팀(단체) + 최근 DM 스레드(안읽음 수 포함)
//  GET  /api/social?dm=<friendId>&after=ISO → 특정 친구와의 메시지 (seen=1 이면 읽음 처리)
//  POST /api/social { action:'dm_send', toId, text }  → 메시지 전송
//  POST /api/social { action:'dm_seen', friendId }    → 상대가 보낸 메시지 읽음 처리

const uid = (p: string) => p + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

// 두 사용자 id 로 고정 대화 id (정렬 → 순서 무관 동일)
function convId(a: string, b: string): string {
  return 'dm_' + [a, b].sort().join('__')
}

async function ensureSocialTables(db: D1Database) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS dm_messages (
       id TEXT PRIMARY KEY,
       conv_id TEXT NOT NULL,
       from_id TEXT NOT NULL,
       to_id TEXT NOT NULL,
       text TEXT NOT NULL,
       read_to INTEGER DEFAULT 0,
       created_at TEXT NOT NULL
     )`,
  ).run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_dm_conv ON dm_messages(conv_id, created_at)').run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_dm_to ON dm_messages(to_id, read_to)').run().catch(() => {})
  // 친구 별명(내가 보는 이름만 바꿈) — owner 가 friend 를 부르는 별명
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS friend_aliases (
       owner_id TEXT NOT NULL,
       friend_id TEXT NOT NULL,
       nickname TEXT,
       updated_at TEXT,
       PRIMARY KEY (owner_id, friend_id)
     )`,
  ).run().catch(() => {})
  // 채팅 프로필 컬럼(프로필 사진·상태 메시지) — 없으면 추가
  await db.prepare('ALTER TABLE users ADD COLUMN chat_avatar TEXT').run().catch(() => {})
  await db.prepare('ALTER TABLE users ADD COLUMN chat_status TEXT').run().catch(() => {})
}

async function areFriends(db: D1Database, a: string, b: string): Promise<boolean> {
  const r = await db.prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?').bind(a, b).first().catch(() => null)
  return !!r
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSocialTables(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const url = new URL(request.url)

  // 특정 친구와의 대화
  const dm = url.searchParams.get('dm')
  if (dm) {
    if (!(await areFriends(db, me.id, dm))) return json({ ok: false, error: '친구만 대화할 수 있습니다.' }, 403)
    const cid = convId(me.id, dm)
    const after = url.searchParams.get('after') || ''
    // 대화창을 연 상태면 상대가 보낸 안읽은 메시지 읽음 처리
    if (url.searchParams.get('seen') === '1') {
      await db.prepare('UPDATE dm_messages SET read_to = 1 WHERE conv_id = ? AND to_id = ? AND read_to = 0').bind(cid, me.id).run().catch(() => {})
    }
    const rows = (await db.prepare(
      'SELECT id, from_id, to_id, text, read_to, created_at FROM dm_messages WHERE conv_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 300',
    ).bind(cid, after).all()).results || []
    // 상대 프로필(사진·상태·별명) — 대화 헤더/프로필 카드용
    const fr: any = await db.prepare('SELECT id, name, email, chat_avatar, chat_status FROM users WHERE id = ?').bind(dm).first().catch(() => null)
    const al: any = await db.prepare('SELECT nickname FROM friend_aliases WHERE owner_id = ? AND friend_id = ?').bind(me.id, dm).first().catch(() => null)
    const partner = fr ? { id: fr.id, name: fr.name, email: fr.email || '', avatar: fr.chat_avatar || '', status: fr.chat_status || '', alias: (al?.nickname || '') } : null
    return json({ ok: true, messages: rows, meId: me.id, partner })
  }

  // 내 별명 매핑 (friend_id → nickname)
  const aliasRows = (await db.prepare('SELECT friend_id, nickname FROM friend_aliases WHERE owner_id = ?').bind(me.id).all().catch(() => ({ results: [] }))).results as any[] || []
  const aliasMap: Record<string, string> = {}
  for (const a of aliasRows) if (a.nickname) aliasMap[a.friend_id] = a.nickname

  // 친구 목록 (프로필 사진·상태 포함)
  const friends = (await db.prepare(
    `SELECT u.id, u.name, u.email, u.chat_avatar, u.chat_status FROM friendships f JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = ? ORDER BY u.name COLLATE NOCASE ASC LIMIT 500`,
  ).bind(me.id).all()).results as any[] || []

  // 내가 속한 팀(단체 채팅)
  const teams = (await db.prepare(
    `SELECT t.id, t.name, (SELECT COUNT(*) FROM team_members mm WHERE mm.team_id = t.id) AS memberCount
     FROM team_members m JOIN teams t ON t.id = m.team_id WHERE m.user_id = ? ORDER BY t.created_at DESC LIMIT 100`,
  ).bind(me.id).all().catch(() => ({ results: [] }))).results as any[] || []

  // 최근 DM 스레드 — 친구별 마지막 메시지 + 안읽음 수
  const threads: any[] = []
  for (const fr of friends) {
    const cid = convId(me.id, fr.id)
    const last: any = await db.prepare(
      'SELECT text, from_id, created_at FROM dm_messages WHERE conv_id = ? ORDER BY created_at DESC LIMIT 1',
    ).bind(cid).first().catch(() => null)
    if (!last) continue
    const unreadRow: any = await db.prepare(
      'SELECT COUNT(*) AS c FROM dm_messages WHERE conv_id = ? AND to_id = ? AND read_to = 0',
    ).bind(cid, me.id).first().catch(() => ({ c: 0 }))
    threads.push({
      friendId: fr.id, name: aliasMap[fr.id] || fr.name, realName: fr.name, alias: aliasMap[fr.id] || '',
      email: fr.email, avatar: fr.chat_avatar || '',
      lastText: last.text, lastFromMe: last.from_id === me.id, lastAt: last.created_at,
      unread: Number(unreadRow?.c) || 0,
    })
  }
  threads.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
  const totalUnread = threads.reduce((s, t) => s + t.unread, 0)

  return json({
    ok: true,
    meId: me.id, meName: me.name, meEmail: me.email || '', myCode: me.referral_code || '',
    myAvatar: me.chat_avatar || '', myStatus: me.chat_status || '',
    friends: friends.map((f) => ({
      id: f.id, name: aliasMap[f.id] || f.name, realName: f.name, alias: aliasMap[f.id] || '',
      email: f.email, avatar: f.chat_avatar || '', status: f.chat_status || '',
    })),
    teams: teams.map((t) => ({ id: t.id, name: t.name, memberCount: Number(t.memberCount) || 1 })),
    threads,
    totalUnread,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureSocialTables(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')
  const now = new Date().toISOString()

  if (action === 'dm_send') {
    const toId = String(b.toId || '').trim()
    const text = String(b.text || '').trim().slice(0, 2000)
    if (!toId || !text) return json({ ok: false, error: '보낼 내용을 입력하세요.' }, 400)
    if (toId === me.id) return json({ ok: false, error: '본인에게는 보낼 수 없습니다.' }, 400)
    if (!(await areFriends(db, me.id, toId))) return json({ ok: false, error: '친구만 대화할 수 있습니다.' }, 403)
    const cid = convId(me.id, toId)
    const id = uid('dm_')
    await db.prepare(
      'INSERT INTO dm_messages (id, conv_id, from_id, to_id, text, read_to, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    ).bind(id, cid, me.id, toId, text, now).run()
    // 상대에게 알림(과도 방지: 실패해도 무시)
    await addNotification(db, toId, `${me.name}님의 메시지 💬`, text.slice(0, 60)).catch(() => {})
    return json({ ok: true, id, created_at: now })
  }

  if (action === 'dm_seen') {
    const friendId = String(b.friendId || '').trim()
    if (!friendId) return json({ ok: false, error: 'friendId 필요' }, 400)
    const cid = convId(me.id, friendId)
    await db.prepare('UPDATE dm_messages SET read_to = 1 WHERE conv_id = ? AND to_id = ? AND read_to = 0').bind(cid, me.id).run().catch(() => {})
    return json({ ok: true })
  }

  // 내 채팅 프로필 설정 — 프로필 사진 + 상태 메시지
  if (action === 'set_profile') {
    const avatar = String(b.avatarUrl ?? '').trim().slice(0, 1000)
    const status = String(b.status ?? '').trim().slice(0, 120)
    if (avatar && !/^(https?:\/\/|\/)/i.test(avatar)) return json({ ok: false, error: '프로필 사진 주소 형식이 올바르지 않습니다.' }, 400)
    await db.prepare('UPDATE users SET chat_avatar = ?, chat_status = ? WHERE id = ?').bind(avatar || null, status || null, me.id).run()
    return json({ ok: true, avatar, status })
  }

  // 친구 별명 설정 — 내가 보는 이름만 변경(빈 값이면 해제)
  if (action === 'set_alias') {
    const friendId = String(b.friendId || '').trim()
    const nickname = String(b.nickname ?? '').trim().slice(0, 40)
    if (!friendId) return json({ ok: false, error: 'friendId 필요' }, 400)
    if (!(await areFriends(db, me.id, friendId))) return json({ ok: false, error: '친구만 별명을 설정할 수 있습니다.' }, 403)
    if (!nickname) {
      await db.prepare('DELETE FROM friend_aliases WHERE owner_id = ? AND friend_id = ?').bind(me.id, friendId).run().catch(() => {})
      return json({ ok: true, nickname: '' })
    }
    await db.prepare(
      `INSERT INTO friend_aliases (owner_id, friend_id, nickname, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(owner_id, friend_id) DO UPDATE SET nickname = excluded.nickname, updated_at = excluded.updated_at`,
    ).bind(me.id, friendId, nickname, now).run()
    return json({ ok: true, nickname })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
