import { json, getSessionUser, resolveDB } from '../../_utils'
import { makeSolapiAuthHeader } from '../../_solapi'

// GET /api/kakao/user/channels → 사용자의 카카오 알림톡 발신 채널 목록
// SUPERPLACE Hono 라우트 이식. 세션 사용자 기준(getSessionUser)으로만 조회.
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

    // channel_id가 32자 미만이면 Solapi에서 실제 channelId 보정
    const hasInvalidId = channels.some((ch: any) => (ch.channelId || '').length !== 32)
    if (hasInvalidId) {
      try {
        const apiKey = String((env as any)?.SOLAPI_API_KEY || '').trim()
        const apiSecret = String((env as any)?.SOLAPI_API_SECRET || '').trim()
        if (apiKey && apiSecret) {
          const auth = await makeSolapiAuthHeader(apiKey, apiSecret)
          const res = await fetch('https://api.solapi.com/kakao/v2/channels', { headers: { Authorization: auth } })
          if (res.ok) {
            const data: any = await res.json()
            const solapiList: any[] = Array.isArray(data)
              ? data
              : Array.isArray(data?.channelList)
                ? data.channelList
                : Array.isArray(data?.data)
                  ? data.data
                  : Array.isArray(data?.channels)
                    ? data.channels
                    : []
            channels = channels.map((ch: any) => {
              if ((ch.channelId || '').length === 32) return ch
              const rawSearch = (ch.searchId || ch.channelId || '').replace(/^@/, '')
              const found = solapiList.find(
                (s: any) =>
                  String(s.searchId || '').replace(/^@/, '') === rawSearch ||
                  s.channelId === ch.channelId ||
                  s.pfId === ch.channelId,
              )
              if (found?.channelId) {
                db.prepare(`UPDATE kakao_channels SET channel_id=? WHERE user_id=? AND search_id=?`)
                  .bind(found.channelId, userId, ch.searchId || '')
                  .run()
                  .catch(() => {})
                return { ...ch, channelId: found.channelId, channelName: found.channelName || ch.channelName }
              }
              return ch
            })
          }
        }
      } catch (_) {}
    }

    return json({ ok: true, channels })
  } catch (e: any) {
    return json({ ok: false, channels: [], error: '서버 오류가 발생했습니다.' })
  }
}
