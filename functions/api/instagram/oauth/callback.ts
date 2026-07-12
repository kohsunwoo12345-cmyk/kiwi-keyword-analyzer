import { Env, resolveDB } from '../../_utils'
import { ensureIgSchema, getIgAppConfig } from '../_ig'

// GET /api/instagram/oauth/callback?code=xxx&state=xxx → 토큰 교환 → 계정 저장
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  const params = new URL(request.url).searchParams
  const code = params.get('code')
  const stateRaw = params.get('state') || ''
  const error = params.get('error')

  const closePopup = (status: 'success' | 'error' | 'cancel', data: Record<string, any> = {}) => {
    const payload = JSON.stringify({ type: 'ig_oauth', status, ...data })
    const icon = status === 'success' ? '✅' : status === 'cancel' ? '↩️' : '❌'
    const title = status === 'success' ? '연결 완료!' : status === 'cancel' ? '취소됨' : '연결 실패'
    const msg =
      status === 'success'
        ? data.username
          ? '@' + data.username + ' 계정이 연결되었습니다.'
          : '계정이 연결되었습니다.'
        : data.error || '오류가 발생했습니다.'
    return new Response(
      `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Instagram 연결</title>
  <style>
    body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;
         height:100vh;margin:0;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);}
    .box{background:#fff;border-radius:20px;padding:40px;text-align:center;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,.2);}
    .icon{font-size:56px;margin-bottom:16px;}
    h2{margin:0 0 8px;color:#1e293b;font-size:20px;}
    p{margin:0;color:#64748b;font-size:14px;line-height:1.6;}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${msg}</p>
  </div>
  <script>
    var payload = ${payload};
    if (window.opener) {
      window.opener.postMessage(payload, '*');
      setTimeout(function(){ window.close(); }, 1500);
    } else {
      setTimeout(function(){ window.close(); }, 2500);
    }
  </script>
</body>
</html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  if (error) return closePopup('cancel', { error: '로그인을 취소했습니다.' })
  if (!code) return closePopup('error', { error: '인증 코드가 없습니다.' })
  if (!db) return closePopup('error', { error: 'DB 바인딩 없음' })
  await ensureIgSchema(db)

  const cfg = await getIgAppConfig(env, db)
  const appId = cfg.appId
  const appSecret = cfg.appSecret

  let userId = '0'
  try {
    const b64 = stateRaw
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(stateRaw.length + ((4 - (stateRaw.length % 4)) % 4), '=')
    const obj = JSON.parse(atob(b64))
    userId = String(obj.userId || '0')
  } catch (_) {}

  try {
    const redirectUri = new URL(request.url).origin + '/'

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }).toString(),
    })
    const tokenData = (await tokenRes.json()) as any

    const tokenEntry = tokenData.data && tokenData.data[0] ? tokenData.data[0] : tokenData
    if (!tokenEntry.access_token) {
      return closePopup('error', {
        error: '토큰 발급 실패: ' + (tokenData.error_message || tokenData.error_description || JSON.stringify(tokenData)),
      })
    }

    const shortToken = tokenEntry.access_token
    const igUserId = String(tokenEntry.user_id || '')

    let longToken = shortToken
    let tokenExpiry = ''
    try {
      const longRes = await fetch(
        'https://graph.instagram.com/access_token' +
          '?grant_type=ig_exchange_token' +
          '&client_secret=' + appSecret +
          '&access_token=' + shortToken,
      )
      const longData = (await longRes.json()) as any
      if (longData.access_token) {
        longToken = longData.access_token
        const expSec = longData.expires_in || 5184000
        tokenExpiry = new Date(Date.now() + expSec * 1000).toISOString()
      }
    } catch (_) {}

    const fieldsStr = 'user_id,username,name,profile_picture_url,followers_count,media_count,biography,website,account_type'
    const meRes = await fetch(
      'https://graph.instagram.com/v25.0/me?fields=' + fieldsStr + '&access_token=' + longToken,
    )
    const meData = (await meRes.json()) as any

    const igBusinessId = meData.user_id || igUserId || ''
    const igUsername = meData.username || ''
    const igProfilePic = meData.profile_picture_url || ''
    const followerCount = Number(meData.followers_count) || 0

    const existing = await db.prepare(`SELECT id FROM instagram_account_settings WHERE user_id = ?`).bind(userId).first()

    if (existing) {
      await db
        .prepare(`
          UPDATE instagram_account_settings
          SET ig_business_id=?, ig_username=?, access_token=?,
              ig_profile_pic=?, follower_count=?,
              token_expires_at=?, is_connected=1, updated_at=datetime('now')
          WHERE user_id=?
        `)
        .bind(igBusinessId, igUsername, longToken, igProfilePic, followerCount, tokenExpiry || null, userId)
        .run()
    } else {
      await db
        .prepare(`
          INSERT INTO instagram_account_settings
            (user_id,ig_business_id,ig_username,access_token,ig_profile_pic,follower_count,token_expires_at,is_connected,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,1,datetime('now'),datetime('now'))
        `)
        .bind(userId, igBusinessId, igUsername, longToken, igProfilePic, followerCount, tokenExpiry || null)
        .run()
    }

    return closePopup('success', {
      username: igUsername,
      businessId: igBusinessId,
      profilePic: igProfilePic,
      followers: followerCount,
    })
  } catch (e: any) {
    return closePopup('error', { error: '서버 오류가 발생했습니다.' })
  }
}
