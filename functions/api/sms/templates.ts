import { Env, json, getSessionUser, resolveDB } from '../_utils'

// 문자 템플릿 저장소 (title/message/receivers 기반). 페이지 계약에 맞춘 테이블.
async function ensureTemplateTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS sms_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT,
        message TEXT,
        receivers TEXT,
        created_at TEXT NOT NULL
      )`,
    )
    .run()
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_sms_tpl_user ON sms_templates(user_id, created_at)`)
    .run()
    .catch(() => {})
}

// GET /api/sms/templates → { success, templates:[{id,title,message,receivers}] }
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)
  try {
    await ensureTemplateTable(db)
    const rows = await db
      .prepare(`SELECT id, title, message, receivers FROM sms_templates WHERE user_id = ? ORDER BY created_at DESC`)
      .bind(me.id)
      .all()
    return json({ success: true, templates: rows.results || [] })
  } catch (err) {
    console.error('Get templates error:', err)
    return json({ success: false, error: '템플릿 조회 실패' }, 500)
  }
}

// POST /api/sms/templates { title, message, receivers } → 저장
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)
  try {
    await ensureTemplateTable(db)
    const body: any = await request.json().catch(() => ({}))
    const title = String(body.title || '').trim()
    const message = String(body.message || '').trim()
    const receivers = typeof body.receivers === 'string' ? body.receivers : JSON.stringify(body.receivers || [])
    if (!title || !message) return json({ success: false, error: '제목과 메시지를 입력하세요.' }, 400)
    const r = await db
      .prepare(`INSERT INTO sms_templates (user_id, title, message, receivers, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(me.id, title, message, receivers, new Date().toISOString())
      .run()
    return json({ success: true, id: r.meta?.last_row_id })
  } catch (err) {
    console.error('Add template error:', err)
    return json({ success: false, error: '템플릿 추가 실패' }, 500)
  }
}
