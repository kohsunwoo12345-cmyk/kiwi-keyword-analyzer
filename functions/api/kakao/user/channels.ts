import { json, getSessionUser, resolveDB, sameOriginOk } from '../../_utils'
import { ownsKakaoChannel, notMyChannel } from '../_own'

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
    const rows = await db
      .prepare(
        `SELECT channel_id, channel_name, search_id, phone_number, category_code, created_at
         FROM kakao_channels WHERE user_id = ? ORDER BY created_at DESC`,
      )
      .bind(userId)
      .all()

    /* 여기 있던 "같은 학원의 admin 채널도 보여 준다" 대체 경로를 지웠다.
       users.academy_id · users.parent_user_id 는 이 제품에 없는 칸이라 첫 질의가 곧바로 던지고
       catch 가 삼켰다 — 채널이 없는 회원마다 실패 질의만 한 번씩 더 나갔을 뿐,
       한 번도 채널을 더 보여 준 적이 없다. 이 제품엔 학원 소속이라는 개념이 없다. */

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

// DELETE /api/kakao/user/channels?channelId=... → 내가 등록한 채널 연결 해제
//  (알리고 계정의 발신프로필 자체를 지우는 게 아니라, 이 서비스의 연결만 끊는다)
export const onRequestDelete: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  const url = new URL(request.url)
  const channelId = String(url.searchParams.get('channelId') || '').trim()
  if (!channelId) return json({ ok: false, error: 'channelId 필요' }, 400)
  // 남의 채널을 끊어버릴 수 없게 소유 확인 후 삭제한다.
  if (!(await ownsKakaoChannel(db, String(me.id), channelId))) return notMyChannel()
  await db.prepare('DELETE FROM kakao_channels WHERE user_id = ? AND channel_id = ?').bind(String(me.id), channelId).run()
  return json({ ok: true })
}
