import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, setSetting, logAudit, clientIp } from '../_utils'
import { MODEL_COST, PROV_LABEL, computeCharge, getUsdKrw, getModelMarkups, CREDIT_KRW } from '../studio/_pricing'

const clampMk = (v: any) => Math.max(1, Math.min(100, Math.round((Number(v) || 1) * 100) / 100))
const unitsFor = (kind: string) => (kind === 'video' ? 8 : 1)

// GET /api/admin/model-pricing[?userId=]  → 모델별 원가/배수/적용 크레딧
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const userId = String(url.searchParams.get('userId') || '')
  const rate = await getUsdKrw(db)
  const gm = await getModelMarkups(db)

  const userMk: Record<string, number> = {}
  let userName = '', userOverall = 0
  if (userId) {
    const rows = (await db.prepare('SELECT model, multiplier FROM user_model_markups WHERE user_id = ?').bind(userId).all()).results || []
    for (const r of rows as any[]) userMk[r.model] = Number(r.multiplier) || 0
    const u: any = await db.prepare('SELECT name, credit_markup FROM users WHERE id = ?').bind(userId).first()
    if (u) { userName = u.name || ''; userOverall = Number(u.credit_markup) || 0 }
  }

  const models = Object.keys(MODEL_COST).map((model) => {
    const m = (MODEL_COST as any)[model]
    const kind = m.u === 'img' ? 'image' : 'video'
    const base = computeCharge({ model, units: unitsFor(kind), kind, res: '1080p' } as any, rate, 1)
    const dflt = computeCharge({ model, units: unitsFor(kind), kind, res: '1080p' } as any, rate, undefined)
    const globalMk = Number(gm[model]) > 0 ? Number(gm[model]) : 0
    const uMk = userId ? (Number(userMk[model]) > 0 ? Number(userMk[model]) : 0) : 0
    // 우선순위: 회원×모델 > 회원 전체 > 전역 모델 > 기본
    const eff = uMk > 0 ? uMk : (userId && userOverall > 0 ? userOverall : (globalMk > 0 ? globalMk : dflt.markup))
    const effC = computeCharge({ model, units: unitsFor(kind), kind, res: '1080p' } as any, rate, eff)
    return {
      model,
      provider: PROV_LABEL[m.prov] || m.prov,
      kind,
      baseCredits: base.credits,
      defaultMarkup: dflt.markup,
      globalMarkup: globalMk,
      userMarkup: uMk,
      effectiveMarkup: eff,
      effectiveCredits: effC.credits,
    }
  })

  return json({ ok: true, usdKrw: rate, creditKrw: CREDIT_KRW, userId, userName, userOverall, models })
}

// POST /api/admin/model-pricing — 배수 설정 (전역/회원, 개별/일괄)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const admin = { id: guard.me.id, email: guard.me.email }
  const ip = clientIp(request)

  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')

  if (action === 'set_global') {
    const gm = await getModelMarkups(db)
    gm[String(b.model)] = clampMk(b.markup)
    await setSetting(db, 'model_markups', JSON.stringify(gm))
    await logAudit(db, admin, 'model_markup_global', String(b.model), '×' + clampMk(b.markup), 'info', ip)
    return json({ ok: true })
  }
  if (action === 'reset_global') {
    const gm = await getModelMarkups(db); delete gm[String(b.model)]
    await setSetting(db, 'model_markups', JSON.stringify(gm))
    return json({ ok: true })
  }
  if (action === 'set_global_all') {
    const mk = clampMk(b.markup); const gm: Record<string, number> = {}
    for (const k of Object.keys(MODEL_COST)) gm[k] = mk
    await setSetting(db, 'model_markups', JSON.stringify(gm))
    await logAudit(db, admin, 'model_markup_global_all', '전체', '×' + mk, 'high', ip)
    return json({ ok: true })
  }
  if (action === 'reset_global_all') {
    await setSetting(db, 'model_markups', '{}')
    return json({ ok: true })
  }
  if (action === 'set_user') {
    const uid = String(b.userId || ''); if (!uid) return json({ ok: false, error: '회원을 선택하세요.' }, 400)
    await db.prepare('INSERT OR REPLACE INTO user_model_markups (user_id, model, multiplier) VALUES (?, ?, ?)').bind(uid, String(b.model), clampMk(b.markup)).run()
    return json({ ok: true })
  }
  if (action === 'set_user_all') {
    const uid = String(b.userId || ''); if (!uid) return json({ ok: false, error: '회원을 선택하세요.' }, 400)
    const mk = clampMk(b.markup)
    for (const k of Object.keys(MODEL_COST)) await db.prepare('INSERT OR REPLACE INTO user_model_markups (user_id, model, multiplier) VALUES (?, ?, ?)').bind(uid, k, mk).run()
    await logAudit(db, admin, 'model_markup_user_all', uid, '×' + mk, 'info', ip)
    return json({ ok: true })
  }
  if (action === 'reset_user') {
    const uid = String(b.userId || '')
    if (b.model) await db.prepare('DELETE FROM user_model_markups WHERE user_id = ? AND model = ?').bind(uid, String(b.model)).run()
    else await db.prepare('DELETE FROM user_model_markups WHERE user_id = ?').bind(uid).run()
    return json({ ok: true })
  }
  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
