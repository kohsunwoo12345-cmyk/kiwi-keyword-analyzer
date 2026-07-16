import { Env, json, ensureSchema, resolveDB, requireAdminUser, addNotification } from '../_utils'

// GET  /api/admin/support            → 대화 목록 + 미읽음 수
// GET  /api/admin/support?conv_id=.. → 특정 대화 전체 메시지 (관리자 읽음 처리)
// GET  /api/admin/support?count=1    → 미읽음 수만 (사이드바 뱃지용, 가벼움)
// POST /api/admin/support {conv_id, text} → 관리자 답장
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all()).results || []
  const one = async (sql: string, ...b: any[]) => {
    const r: any = await db.prepare(sql).bind(...b).first()
    return r || {}
  }

  const unreadRow = await one("SELECT COUNT(*) AS n FROM support_chats WHERE sender = 'user' AND read_admin = 0")
  const unread = Number(unreadRow.n) || 0

  if (url.searchParams.get('count')) return json({ ok: true, unread })

  const convId = String(url.searchParams.get('conv_id') || '').slice(0, 60)
  if (convId) {
    const messages = await rows('SELECT id, sender, text, read_user, read_admin, created_at FROM support_chats WHERE conv_id = ? ORDER BY created_at ASC LIMIT 500', convId)
    await db.prepare("UPDATE support_chats SET read_admin = 1 WHERE conv_id = ? AND sender = 'user' AND read_admin = 0").bind(convId).run().catch(() => {})
    const head = await one('SELECT name, email, user_id FROM support_chats WHERE conv_id = ? ORDER BY created_at ASC LIMIT 1', convId)
    return json({
      ok: true,
      unread,
      conv: { conv_id: convId, name: head.name || '게스트', email: head.email || '', user_id: head.user_id || '' },
      messages: messages.map((m: any) => ({ id: m.id, sender: m.sender, text: m.text, at: m.created_at, readUser: Number(m.read_user) || 0, readAdmin: Number(m.read_admin) || 0 })),
    })
  }

  // 대화 목록 (마지막 메시지 + 대화별 미읽음 + 고객이 답장을 읽었는지)
  const convs = await rows(
    `SELECT conv_id,
            MAX(name) AS name, MAX(email) AS email, MAX(user_id) AS user_id,
            COUNT(*) AS total,
            SUM(CASE WHEN sender='user' AND read_admin=0 THEN 1 ELSE 0 END) AS unread,
            SUM(CASE WHEN sender IN ('admin','bot') AND read_user=0 THEN 1 ELSE 0 END) AS user_unread,
            MAX(created_at) AS last_at
     FROM support_chats GROUP BY conv_id ORDER BY last_at DESC LIMIT 200`,
  )
  // 각 대화의 마지막 메시지 텍스트
  const list = [] as any[]
  for (const c of convs as any[]) {
    const last = await one('SELECT sender, text FROM support_chats WHERE conv_id = ? ORDER BY created_at DESC LIMIT 1', c.conv_id)
    list.push({
      conv_id: c.conv_id,
      name: c.name || '게스트',
      email: c.email || '',
      user_id: c.user_id || '',
      total: Number(c.total) || 0,
      unread: Number(c.unread) || 0,
      userUnread: Number(c.user_unread) || 0,
      last_at: c.last_at,
      last_sender: last.sender || '',
      last_text: last.text || '',
    })
  }
  return json({ ok: true, unread, conversations: list })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const b: any = await request.json().catch(() => ({}))
  const convId = String(b.conv_id || '').slice(0, 60)
  const text = String(b.text || '').trim().slice(0, 2000)
  if (!convId || !text) return json({ ok: false, error: '대화와 내용을 입력하세요.' }, 400)

  const id = 'sc_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)
  await db
    .prepare(
      `INSERT INTO support_chats (id, conv_id, user_id, name, email, sender, text, read_admin, read_user, created_at)
       VALUES (?, ?, '', '관리자', '', 'admin', ?, 1, 0, ?)`,
    )
    .bind(id, convId, text, new Date().toISOString())
    .run()

  // 로그인 회원 대화면 알림
  if (convId.startsWith('u_')) {
    await addNotification(db, convId, '고객센터 답변이 도착했어요', text.slice(0, 80)).catch(() => {})
  }
  return json({ ok: true, id })
}
