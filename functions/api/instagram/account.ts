import { Env, getSessionUser, resolveDB } from '../_utils'
import { ensureIgSchema, getIgAppConfig } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/account → 계정 설정 조회 (세션 기반)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const userId = String(me.id)

    const cfg = await getIgAppConfig(env, db)
    const appId = cfg.appId
    const appSecret = cfg.appSecret
    const hasEnvConfig = !!(appId && appSecret)

    const account = await db
      .prepare(
        `SELECT id, user_id, ig_business_id, ig_username, is_connected, token_expires_at, created_at, updated_at
         FROM instagram_account_settings WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      )
      .bind(userId)
      .first()

    return j({
      success: true,
      account: account || null,
      envConfig: {
        hasAppId: !!appId,
        hasAppSecret: !!appSecret,
        hasEnvConfig,
        appIdPreview: appId ? appId.substring(0, 6) + '***' : null,
      },
    })
  } catch (e: any) {
    return j({ success: false, account: null, error: '서버 오류가 발생했습니다.' }, 200)
  }
}

// POST /api/instagram/account → 계정 설정 저장 { userId, igBusinessId, igUsername, accessToken }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    const body = (await request.json()) as any
    const { userId, igBusinessId, igUsername, accessToken } = body

    if (!userId || !igBusinessId) {
      return j({ success: false, error: '유저 ID와 Instagram 비즈니스 ID는 필수입니다' }, 400)
    }

    let isConnected = 0
    if (accessToken) {
      try {
        const verifyRes = await fetch(
          `https://graph.instagram.com/v25.0/${igBusinessId}?fields=id,username,name&access_token=${accessToken}`,
        )
        const verifyData = (await verifyRes.json()) as any
        if (verifyData.id) isConnected = 1
      } catch (_) {}
    }

    const existing = await db.prepare(`SELECT id FROM instagram_account_settings WHERE user_id = ?`).bind(userId).first()

    if (existing) {
      await db
        .prepare(
          `UPDATE instagram_account_settings
           SET ig_business_id = ?, ig_username = ?, access_token = ?, is_connected = ?, updated_at = datetime('now')
           WHERE user_id = ?`,
        )
        .bind(igBusinessId, igUsername || null, accessToken || null, isConnected, userId)
        .run()
    } else {
      await db
        .prepare(
          `INSERT INTO instagram_account_settings (user_id, ig_business_id, ig_username, access_token, is_connected, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        )
        .bind(userId, igBusinessId, igUsername || null, accessToken || null, isConnected)
        .run()
    }

    return j({
      success: true,
      isConnected: isConnected === 1,
      message: isConnected === 1 ? '✅ Instagram 계정이 연결되었습니다' : '저장됨 (토큰 미검증)',
    })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 200)
  }
}

// DELETE /api/instagram/account → 연결 해제 (세션 기반)
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const userId = String(me.id)
    await db
      .prepare(`UPDATE instagram_account_settings SET is_connected = 0, access_token = NULL WHERE user_id = ?`)
      .bind(userId)
      .run()
    return j({ success: true, message: '연결이 해제되었습니다' })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' }, 200)
  }
}
