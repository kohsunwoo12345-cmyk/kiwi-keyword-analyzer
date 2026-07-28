import { Env, resolveDB, getSessionUser, requireAdminUser } from '../_utils'
import { ensureIgSchema, getIgAppConfig } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/app-config → 앱 ID/시크릿 존재 여부 조회
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    // 앱 ID 앞자리와 설정 여부까지 아무에게나 알려 줄 이유가 없다
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.' }, 401)
    const cfg = await getIgAppConfig(env, db)
    return j({
      success: true,
      hasAppId: !!cfg.appId,
      hasAppSecret: !!cfg.appSecret,
      appIdPreview: cfg.appId ? cfg.appId.substring(0, 6) + '***' : null,
      source: cfg.source,
    })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' })
  }
}

// POST /api/instagram/app-config { appId, appSecret } → 앱 설정 저장 + 검증
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
    // ⚠ 인증이 아예 없었다. 이 설정은 회원별이 아니라 서비스 전체가 쓰는 메타 앱 자격증명(id=1 한 줄)이라,
    //   아무나 덮어쓰면 전 회원의 인스타 연동이 끊기고, 공격자 앱으로 바꿔치기하면
    //   이후 로그인 흐름이 그쪽으로 넘어간다. 관리자만 바꿀 수 있어야 한다.
    const guard = await requireAdminUser(request, db)
    if (guard.error) return guard.error
    const { appId, appSecret } = (((await request.json().catch(() => null)) as any) || {})
    if (!appId) return j({ success: false, error: '앱 ID는 필수입니다' }, 400)

    await db
      .prepare(`
        CREATE TABLE IF NOT EXISTS instagram_app_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          app_id TEXT NOT NULL,
          app_secret TEXT,
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `)
      .run()

    await db
      .prepare(`
        INSERT INTO instagram_app_config (id, app_id, app_secret, updated_at)
        VALUES (1, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET app_id=excluded.app_id, app_secret=excluded.app_secret, updated_at=excluded.updated_at
      `)
      .bind(appId.trim(), appSecret?.trim() || '')
      .run()

    let valid = false
    let validationMsg = ''
    try {
      const testRes = await fetch(
        `https://graph.facebook.com/v25.0/oauth/access_token` +
          `?client_id=${appId.trim()}` +
          `&client_secret=${appSecret?.trim()}` +
          `&grant_type=client_credentials`,
      )
      const testData = (await testRes.json()) as any
      if (testData.access_token) {
        valid = true
        validationMsg = '✅ 앱 ID/시크릿 유효 — Instagram 로그인 버튼을 눌러 계정을 연결하세요'
      } else if (testData.error) {
        const ec = testData.error.code
        if (ec === 101) {
          validationMsg = '❌ 앱 ID가 존재하지 않습니다. Meta 개발자 콘솔에서 앱 ID를 다시 확인하세요.'
        } else if (ec === 190) {
          validationMsg = '❌ 앱 시크릿이 올바르지 않습니다. 앱 설정 → 기본 설정에서 확인하세요.'
        } else {
          validationMsg = '⚠️ 검증 결과: ' + (testData.error.message || JSON.stringify(testData.error))
        }
      } else {
        valid = true
        validationMsg = '저장 완료 (검증 결과: ' + JSON.stringify(testData).substring(0, 80) + ')'
      }
    } catch (ve: any) {
      validationMsg = '저장 완료 (네트워크 검증 실패: ' + ve.message + ')'
      valid = true
    }

    return j({ success: true, valid, validationMsg })
  } catch (e: any) {
    return j({ success: false, error: '서버 오류가 발생했습니다.' })
  }
}
