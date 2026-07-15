import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity } from '../../_utils'
import { aligoProfileAdd } from '../../_aligo'

// POST /api/kakao/profile/add { plusid, phone, authnum, categorycode? }
//   → 인증번호로 발신프로필 등록 → senderkey 발급 → DB(kakao_channels) 저장
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const plusid = String(b.plusid || '').trim().replace(/^@/, '')
  const phone = String(b.phone || b.phonenumber || '').replace(/[^0-9]/g, '')
  const r = await aligoProfileAdd(env, { plusid, phonenumber: phone, authnum: String(b.authnum || ''), categorycode: b.categorycode ? String(b.categorycode) : undefined })
  if (!r.ok || !r.senderKey) return json({ ok: false, error: r.error || '채널 등록 실패' }, 400)

  // 발신프로필(senderkey)을 채널로 저장 → 발송/템플릿에서 사용
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS kakao_channels (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, channel_id TEXT NOT NULL, channel_name TEXT, search_id TEXT, phone_number TEXT, category_code TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    ).run()
    const exists: any = await db.prepare('SELECT id FROM kakao_channels WHERE user_id = ? AND channel_id = ?').bind(me.id, r.senderKey).first().catch(() => null)
    if (!exists) {
      await db.prepare(
        `INSERT INTO kakao_channels (user_id, channel_id, channel_name, search_id, phone_number, category_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(me.id, r.senderKey, '@' + plusid, '@' + plusid, phone, String(b.categorycode || ''), new Date().toISOString()).run()
    }
  } catch { /* 저장 실패해도 senderkey 는 반환 */ }

  await logActivity(db, me.id, 'kakao', `카카오 채널 등록: @${plusid}`).catch(() => {})
  return json({ ok: true, senderKey: r.senderKey, note: '채널이 등록되었습니다. 이제 템플릿을 만들어 승인 요청할 수 있어요.' })
}
