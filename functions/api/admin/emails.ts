import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/emails — Resend 로 발송된 이메일 전체 이력(수신/발신/제목/내용/상태/시각)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const rows = (await db
    .prepare(`SELECT id, to_email, from_email, subject, kind, status, resend_id, error, body, user_id, created_at
              FROM email_log ORDER BY created_at DESC LIMIT 500`)
    .all()).results || []

  const count = async (sql: string, ...b: any[]) => {
    const r: any = await db.prepare(sql).bind(...b).first()
    return r?.n || 0
  }
  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const [total, sent, failed, today] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM email_log'),
    count("SELECT COUNT(*) AS n FROM email_log WHERE status = 'sent'"),
    count("SELECT COUNT(*) AS n FROM email_log WHERE status = 'failed'"),
    count('SELECT COUNT(*) AS n FROM email_log WHERE created_at > ?', dayAgo),
  ])

  return json({ ok: true, emails: rows, stats: { total, sent, failed, today } })
}
