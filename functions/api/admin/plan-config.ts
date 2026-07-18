import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, setSetting, logAudit, clientIp } from '../_utils'
import { getPlanConfig, mergePlanConfig } from '../_plans'

// GET  /api/admin/plan-config           → 현재 요금제 설정
// POST /api/admin/plan-config {action:'save', config} → 저장
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const config = await getPlanConfig(db)
  return json({ ok: true, config })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const b: any = await request.json().catch(() => ({}))
  if (String(b.action || '') !== 'save') return json({ ok: false, error: '알 수 없는 작업' }, 400)
  const merged = mergePlanConfig(b.config)
  await setSetting(db, 'plan_config', JSON.stringify(merged))
  const admin = (guard as any).me?.email || 'admin'
  await logAudit(db, admin, 'plan_config_save', '요금제', '수정', 'high', clientIp(request)).catch(() => {})
  return json({ ok: true, config: merged })
}
