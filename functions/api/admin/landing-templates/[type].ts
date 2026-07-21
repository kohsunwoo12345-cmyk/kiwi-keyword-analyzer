// SUPERPLACE 이식: /api/admin/landing-templates/:type — 단일 템플릿 조회/저장/삭제
import { Env, resolveDB, ensureSchema, requireAdminUser } from '../../_utils'
import { ensureLandingSchema } from '../../landing/_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const type = String((params as any).type || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const row: any = await db.prepare(`SELECT template_type, name, html_template, is_active FROM landing_templates WHERE template_type = ?`).bind(type).first().catch(() => null)
  if (!row) return j({ success: false, error: '템플릿 없음' }, 404)
  return j({ success: true, template: row, html_template: row.html_template })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const type = String((params as any).type || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const b: any = await request.json().catch(() => ({}))
  const html = String(b.html_template || b.html || '')
  const name = String(b.name || type)
  await db.prepare(
    `INSERT INTO landing_templates (template_type, name, html_template, is_active, updated_at)
     VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(template_type) DO UPDATE SET name=excluded.name, html_template=excluded.html_template, is_active=1, updated_at=CURRENT_TIMESTAMP`,
  ).bind(type, name, html).run()
  return j({ success: true, message: '템플릿이 저장되었습니다.' })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const type = String((params as any).type || '')
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  await db.prepare(`DELETE FROM landing_templates WHERE template_type = ?`).bind(type).run()
  return j({ success: true, message: '삭제되었습니다.' })
}
