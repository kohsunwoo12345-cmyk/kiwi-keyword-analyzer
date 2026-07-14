import { Env, json, ensureSchema, getSessionUser, resolveDB, addNotification } from '../_utils'

// POST /api/chat/send { text, conv_id?, name?, email? } → 고객센터 채팅 메시지 전송
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)

  const b: any = await request.json().catch(() => ({}))
  const text = String(b.text || '').trim().slice(0, 2000)
  if (!text) return json({ ok: false, error: '메시지를 입력하세요.' }, 400)

  // 대화 식별: 로그인=user_id, 게스트=클라이언트가 준 conv_id(없으면 새로 발급)
  let convId = String(b.conv_id || '').slice(0, 60)
  if (me) convId = me.id
  if (!convId) convId = 'g_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)

  const name = me?.name || String(b.name || '').trim().slice(0, 40) || '게스트'
  const email = me?.email || String(b.email || '').trim().slice(0, 120)

  const id = 'sc_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)
  await db
    .prepare(
      `INSERT INTO support_chats (id, conv_id, user_id, name, email, sender, text, read_admin, read_user, created_at)
       VALUES (?, ?, ?, ?, ?, 'user', ?, 0, 1, ?)`,
    )
    .bind(id, convId, me?.id || '', name, email, text, new Date().toISOString())
    .run()

  return json({ ok: true, conv_id: convId, id })
}
