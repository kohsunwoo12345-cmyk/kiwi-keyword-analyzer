import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'

// GET /api/chat/thread?conv_id=... → 내 대화 메시지 목록 (사용자 폴링). 관리자 답장은 읽음 처리.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)

  const url = new URL(request.url)
  let convId = String(url.searchParams.get('conv_id') || '').slice(0, 60)
  if (me) convId = me.id
  if (!convId) return json({ ok: true, conv_id: '', messages: [] })

  const rows = (await db
    .prepare('SELECT sender, text, created_at FROM support_chats WHERE conv_id = ? ORDER BY created_at ASC LIMIT 200')
    .bind(convId)
    .all()).results || []

  // 관리자 답장을 사용자가 읽음 처리 — 채팅창을 실제로 연 상태(seen=1)에서만 (정확한 읽음 표시)
  if (url.searchParams.get('seen') === '1') {
    await db.prepare("UPDATE support_chats SET read_user = 1 WHERE conv_id = ? AND sender IN ('admin','bot') AND read_user = 0").bind(convId).run().catch(() => {})
  }

  return json({
    ok: true,
    conv_id: convId,
    messages: rows.map((r: any) => ({ sender: r.sender, text: r.text, at: r.created_at })),
  })
}
