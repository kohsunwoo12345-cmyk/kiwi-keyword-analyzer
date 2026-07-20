import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, sameOriginOk, logAudit, clientIp } from '../_utils'
import { normalizeCode } from '../_coupons'

// GET  /api/admin/coupons          → 쿠폰 목록 + 통계
// POST /api/admin/coupons { action: 'create'|'toggle'|'delete', ... }
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const coupons = (await db.prepare('SELECT * FROM coupons ORDER BY created_at DESC LIMIT 500').all().catch(() => ({ results: [] }))).results || []
  const redeemed = (await db.prepare(
    `SELECT r.code, r.user_id, r.original_krw, r.discount_krw, r.final_krw, r.track, r.plan, r.months, r.created_at, u.name, u.email
     FROM coupon_redemptions r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC LIMIT 300`).all().catch(() => ({ results: [] }))).results || []
  const agg: any = (await db.prepare('SELECT COUNT(*) AS uses, COALESCE(SUM(discount_krw),0) AS discount FROM coupon_redemptions').first().catch(() => ({}))) || {}
  const active = (coupons as any[]).filter((c) => Number(c.active)).length
  return json({ ok: true, coupons, redemptions: redeemed, stats: { total: coupons.length, active, totalUses: Number(agg.uses) || 0, totalDiscount: Number(agg.discount) || 0 } })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || 'create')
  const now = new Date().toISOString()

  if (action === 'create') {
    const code = normalizeCode(b.code)
    if (!code || code.length < 3) return json({ ok: false, error: '쿠폰 코드는 3자 이상이어야 합니다.' }, 400)
    if (!/^[A-Z0-9_-]+$/.test(code)) return json({ ok: false, error: '코드는 영문 대문자·숫자·-·_ 만 사용할 수 있습니다.' }, 400)
    const dup = await db.prepare('SELECT id FROM coupons WHERE code = ?').bind(code).first().catch(() => null)
    if (dup) return json({ ok: false, error: '이미 존재하는 쿠폰 코드입니다.' }, 409)

    const discountType = b.discountType === 'fixed' ? 'fixed' : 'percent'
    let discountValue = Math.round(Number(b.discountValue) || 0)
    if (discountType === 'percent') discountValue = Math.max(1, Math.min(100, discountValue))
    else discountValue = Math.max(100, discountValue)
    if (!discountValue) return json({ ok: false, error: '할인 값을 입력하세요.' }, 400)

    const scopeTrack = ['marketer', 'video'].includes(b.scopeTrack) ? b.scopeTrack : ''
    const scopePlan = ['Plus', 'Pro', 'Max'].includes(b.scopePlan) ? b.scopePlan : ''
    const minMonths = Math.max(1, Math.min(12, Math.round(Number(b.minMonths) || 1)))
    const maxUses = Math.max(0, Math.round(Number(b.maxUses) || 0))
    const perUserLimit = Math.max(0, Math.round(Number(b.perUserLimit) ?? 1))
    const startsAt = String(b.startsAt || '').trim() ? new Date(String(b.startsAt).replace(' ', 'T')).toISOString() : ''
    const expiresAt = String(b.expiresAt || '').trim() ? new Date(String(b.expiresAt).replace(' ', 'T')).toISOString() : ''

    await db.prepare(
      `INSERT INTO coupons (id, code, description, discount_type, discount_value, scope_track, scope_plan, min_months, max_uses, used_count, per_user_limit, starts_at, expires_at, active, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, ?, ?)`,
    ).bind('cp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), code, String(b.description || '').slice(0, 120), discountType, discountValue,
      scopeTrack, scopePlan, minMonths, maxUses, perUserLimit, startsAt || null, expiresAt || null, guard.me.email, now).run()
    await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'coupon_create', code, `${discountType} ${discountValue}`, 'info', clientIp(request))
    return json({ ok: true, code })
  }

  if (action === 'toggle') {
    const id = String(b.id || '')
    const cur: any = await db.prepare('SELECT active FROM coupons WHERE id = ?').bind(id).first().catch(() => null)
    if (!cur) return json({ ok: false, error: '쿠폰을 찾을 수 없습니다.' }, 404)
    const next = Number(cur.active) ? 0 : 1
    await db.prepare('UPDATE coupons SET active = ? WHERE id = ?').bind(next, id).run()
    return json({ ok: true, active: next })
  }

  if (action === 'delete') {
    const id = String(b.id || '')
    await db.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run()
    await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'coupon_delete', id, '', 'warn', clientIp(request))
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
