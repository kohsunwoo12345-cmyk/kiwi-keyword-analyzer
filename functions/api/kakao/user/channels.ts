import { json, getSessionUser, resolveDB } from '../../_utils'

// GET /api/kakao/user/channels → 사용자의 카카오 알림톡 발신 채널(발신프로필) 목록
// 알리고(Aligo) 기준. DB(kakao_channels) 우선, 없으면 환경변수 발신프로필(ALIGO_SENDER_KEY)로 기본 채널 제공.
export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return json({ ok: false, channels: [], error: 'DB 바인딩 없음' }, 500)
    const me: any = await getSessionUser(request, db)
    if (!me) return json({ ok: false, channels: [], error: '로그인 필요' }, 401)
    const userId = String(me.id)

    // 테이블 생성 (없으면)
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS kakao_channels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          channel_id TEXT NOT NULL,
          channel_name TEXT,
          search_id TEXT,
          phone_number TEXT,
          category_code TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
      )
      .run()
    try {
      await db.prepare(`ALTER TABLE kakao_channels ADD COLUMN user_id TEXT`).run()
    } catch (_) {}

    // 본인 user_id 기준 채널 조회
    let rows = await db
      .prepare(
        `SELECT channel_id, channel_name, search_id, phone_number, category_code, created_at
         FROM kakao_channels WHERE user_id = ? ORDER BY created_at DESC`,
      )
      .bind(userId)
      .all()

    // 같은 학원(academy_id) admin 채널도 조회 (본인 채널 없을 때)
    if (!(rows.results || []).length) {
      try {
        const meRow: any = await db.prepare('SELECT academy_id, parent_user_id FROM users WHERE id = ?').bind(userId).first()
        const academyId = meRow?.academy_id || meRow?.parent_user_id
        if (academyId) {
          const adminRows = await db
            .prepare(
              `SELECT kc.channel_id, kc.channel_name, kc.search_id, kc.phone_number, kc.category_code, kc.created_at
               FROM kakao_channels kc
               INNER JOIN users u ON u.id = CAST(kc.user_id AS INTEGER)
               WHERE (u.academy_id = ? OR u.id = ?) AND u.id != ?
               ORDER BY kc.created_at DESC`,
            )
            .bind(academyId, academyId, userId)
            .all()
          if ((adminRows.results || []).length) rows = adminRows
        }
      } catch (_) {}
    }

    let channels = (rows.results || []).map((r: any) => ({
      channelId: r.channel_id || '',
      channelName: r.channel_name || r.search_id || r.channel_id || '',
      searchId: r.search_id || '',
      phoneNumber: r.phone_number || '',
      categoryCode: r.category_code || '',
      createdAt: r.created_at || '',
    }))

    // DB 채널이 없으면 환경변수 발신프로필(ALIGO_SENDER_KEY)로 기본 채널 제공 → 도구 즉시 사용 가능
    if (channels.length === 0) {
      const senderKey = String((env as any)?.ALIGO_SENDER_KEY || '').trim()
      const sender = String((env as any)?.ALIGO_SENDER || '').replace(/[^0-9]/g, '')
      if (senderKey) {
        channels = [{
          channelId: senderKey,
          channelName: 'BYGENCY 알림톡',
          searchId: '',
          phoneNumber: sender,
          categoryCode: '',
          createdAt: '',
        }]
      }
    }

    return json({ ok: true, channels })
  } catch (e: any) {
    return json({ ok: false, channels: [], error: '서버 오류가 발생했습니다.' })
  }
}
