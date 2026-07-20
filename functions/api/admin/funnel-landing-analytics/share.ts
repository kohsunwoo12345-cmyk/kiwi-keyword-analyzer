import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../../_utils'
import { spFlaToken } from '../_fla'

// 분석 리포트 공유 링크 생성 (관리자)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return json({ success: false, error: '관리자 권한이 필요합니다.' }, 403)
  try {
    const body: any = await request.json().catch(() => ({}))
    const report = body.report || {}
    const token = spFlaToken()
    await db.prepare('CREATE TABLE IF NOT EXISTS admin_shared_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT UNIQUE, type TEXT, payload_json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, expires_at TEXT)').run().catch(() => {})
    await db.prepare("INSERT INTO admin_shared_reports (token, type, payload_json, created_at, expires_at) VALUES (?, ?, ?, datetime('now'), datetime('now', '+30 days'))")
      .bind(token, 'funnel_landing_analytics', JSON.stringify(report).slice(0, 950000)).run()
    const origin = new URL(request.url).origin
    return json({ success: true, token, url: origin + '/shared/funnel-landing-report/' + token })
  } catch (e: any) {
    return json({ success: false, error: '공유 링크를 만들지 못했습니다.' }, 500)
  }
}
