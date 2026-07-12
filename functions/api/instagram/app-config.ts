import { Env, resolveDB } from '../_utils'
import { ensureIgSchema, getIgAppConfig } from './_ig'

const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// GET /api/instagram/app-config → 앱 ID/시크릿 존재 여부 조회
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 200)
    await ensureIgSchema(db)
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
    const { appId, appSecret } = (await request.json()) as any
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
