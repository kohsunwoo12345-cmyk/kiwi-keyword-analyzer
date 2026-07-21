// SUPERPLACE 이식: GET /api/admin/landing-templates — 저장된 랜딩 템플릿 목록
import { Env, resolveDB, ensureSchema } from '../_utils'
import { ensureLandingSchema } from '../landing/_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = resolveDB(env)
  if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const rows = ((await db.prepare(`SELECT template_type, name, is_active, updated_at FROM landing_templates WHERE is_active = 1 ORDER BY updated_at DESC`).all()).results as any[]) || []
  return j({ success: true, ok: true, templates: rows.map((r) => ({ template_type: r.template_type, name: r.name || r.template_type, hasCustom: true, updated_at: r.updated_at })) })
}
