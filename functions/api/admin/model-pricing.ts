import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, setSetting, getSetting, logAudit, clientIp } from '../_utils'
import { MODEL_COST, PROV_LABEL, computeCharge, getUsdKrw, getModelMarkups, CREDIT_KRW, REF_SURCHARGE_DEFAULT, CN_SURCHARGE_DEFAULT } from '../studio/_pricing'

const clampPct = (v: any) => Math.max(0, Math.min(100, Math.round((Number(v) || 0) * 1000) / 1000))

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

  // 회원별 원가율 목록 — 모든 사용자의 배수를 한눈에
  if (url.searchParams.get('list') === 'users') {
    const q = String(url.searchParams.get('q') || '').trim()
    const like = '%' + q + '%'
    const rows = (q
      ? await db.prepare("SELECT id,name,email,plan,credits,credit_markup,ref_surcharge,credit_price,academy,created_at FROM users WHERE role != 'admin' AND (name LIKE ? OR email LIKE ?) ORDER BY created_at DESC LIMIT 1000").bind(like, like).all()
      : await db.prepare("SELECT id,name,email,plan,credits,credit_markup,ref_surcharge,credit_price,academy,created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC LIMIT 1000").all()
    ).results || []
    const ovMap: Record<string, number> = {}
    try {
      const ov = (await db.prepare('SELECT user_id, COUNT(*) c FROM user_model_markups WHERE multiplier > 0 GROUP BY user_id').all()).results || []
      for (const r of ov as any[]) ovMap[r.user_id] = Number(r.c) || 0
    } catch { /* table 없음 */ }
    const gsur = await getSetting(db, 'ref_surcharge_pct')
    const refDefault = gsur != null && gsur !== '' && Number(gsur) >= 0 ? Number(gsur) : REF_SURCHARGE_DEFAULT
    const gcn = await getSetting(db, 'controlnet_surcharge_pct')
    const cnSurchargeDefault = gcn != null && gcn !== '' && Number(gcn) >= 0 ? Number(gcn) : CN_SURCHARGE_DEFAULT
    const gcp = await getSetting(db, 'credit_price_krw')
    const creditPriceDefault = gcp != null && gcp !== '' && Number(gcp) > 0 ? Number(gcp) : 65 // 기본 65원/크레딧
    // 학원(그룹)별 크레딧 단가 맵
    let academyPrices: Record<string, number> = {}
    try { const raw = await getSetting(db, 'academy_credit_prices'); if (raw) academyPrices = JSON.parse(raw) } catch { academyPrices = {} }
    // 학원 목록(회원이 배정된 학원 + 단가만 설정된 학원) + 소속 회원 수
    const acCount: Record<string, number> = {}
    for (const u of rows as any[]) { const a = String(u.academy || '').trim(); if (a) acCount[a] = (acCount[a] || 0) + 1 }
    const academyNames = Array.from(new Set([...Object.keys(acCount), ...Object.keys(academyPrices)])).filter(Boolean).sort()
    const academies = academyNames.map((name) => ({ name, members: acCount[name] || 0, price: Number(academyPrices[name]) > 0 ? Number(academyPrices[name]) : null }))
    const pgm = await getSetting(db, 'promptgen_markup')
    const promptgenMarkup = pgm != null && pgm !== '' && isFinite(Number(pgm)) ? Math.max(1, Number(pgm)) : 2.5
    const pgRate = await getUsdKrw(db)
    const PROMPT_BASE_USD = 0.005
    const promptgenCredits = Math.round((PROMPT_BASE_USD * pgRate / CREDIT_KRW) * promptgenMarkup * 100) / 100
    return json({
      ok: true,
      users: (rows as any[]).map((u) => ({
        id: u.id, name: u.name || '', email: u.email || '', plan: u.plan || '없음',
        credits: Math.round((Number(u.credits) || 0) * 100) / 100,
        overall: Number(u.credit_markup) || 0, // 0 = 기본 배수 사용
        overrides: ovMap[u.id] || 0,           // 모델별 개별 지정 개수
        refSurcharge: u.ref_surcharge == null ? null : Number(u.ref_surcharge), // null = 전역 기본값 사용
        creditPrice: u.credit_price == null ? null : Number(u.credit_price), // null = 전역/기본 단가 사용
        academy: String(u.academy || ''), // 소속 학원(그룹)
      })),
      defaultMarkup: { video: 3.0, image: 2.5 },
      refSurchargeDefault: refDefault,
      cnSurchargeDefault,
      creditPriceDefault,
      academyPrices,
      academies,
      promptgenMarkup,
      promptgenCredits,
    })
  }

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
  // 회원 "전체 배수"(users.credit_markup) — 모델별 개별 지정이 없을 때 이 값이 적용됨
  if (action === 'set_user_overall') {
    const uid = String(b.userId || '')
    if (!uid) return json({ ok: false, error: 'userId 필요' }, 400)
    const mk = clampMk(b.markup)
    await db.prepare('UPDATE users SET credit_markup = ? WHERE id = ?').bind(mk, uid).run()
    await logAudit(db, admin, 'user_markup_overall', uid, '×' + mk, 'info', ip)
    return json({ ok: true, markup: mk })
  }
  if (action === 'reset_user_overall') {
    const uid = String(b.userId || '')
    if (!uid) return json({ ok: false, error: 'userId 필요' }, 400)
    await db.prepare('UPDATE users SET credit_markup = 0 WHERE id = ?').bind(uid).run()
    await logAudit(db, admin, 'user_markup_overall_reset', uid, '기본', 'info', ip)
    return json({ ok: true })
  }
  // 레퍼런스 이미지 추가당 가산율(%) — 회원별 / 전역
  if (action === 'set_user_refsur') {
    const uid = String(b.userId || '')
    if (!uid) return json({ ok: false, error: 'userId 필요' }, 400)
    const pct = clampPct(b.pct)
    await db.prepare('UPDATE users SET ref_surcharge = ? WHERE id = ?').bind(pct, uid).run()
    await logAudit(db, admin, 'user_ref_surcharge', uid, pct + '%/장', 'info', ip)
    return json({ ok: true, pct })
  }
  if (action === 'reset_user_refsur') {
    const uid = String(b.userId || '')
    if (!uid) return json({ ok: false, error: 'userId 필요' }, 400)
    await db.prepare('UPDATE users SET ref_surcharge = NULL WHERE id = ?').bind(uid).run()
    await logAudit(db, admin, 'user_ref_surcharge_reset', uid, '기본', 'info', ip)
    return json({ ok: true })
  }
  if (action === 'set_global_refsur') {
    const pct = clampPct(b.pct)
    await setSetting(db, 'ref_surcharge_pct', String(pct))
    await logAudit(db, admin, 'global_ref_surcharge', '전역', pct + '%/장', 'high', ip)
    return json({ ok: true, pct })
  }
  // ControlNet 조절 사용 시 가산율(%) — 전역
  if (action === 'set_global_cnsur') {
    const pct = clampPct(b.pct)
    await setSetting(db, 'controlnet_surcharge_pct', String(pct))
    await logAudit(db, admin, 'global_cn_surcharge', '전역', pct + '%', 'high', ip)
    return json({ ok: true, pct })
  }
  // 프롬프트 작성(GPT·Gemini) 배수(원가율) — 전역, 원가 이하(1 미만) 불가
  if (action === 'set_promptgen') {
    const mk = clampMk(b.markup)
    await setSetting(db, 'promptgen_markup', String(mk))
    await logAudit(db, admin, 'promptgen_markup', '전역', '×' + mk, 'info', ip)
    return json({ ok: true, markup: mk })
  }
  // 크레딧 구매 단가(원/크레딧) — 회원별 / 전역
  if (action === 'set_user_creditprice') {
    const uid = String(b.userId || '')
    if (!uid) return json({ ok: false, error: 'userId 필요' }, 400)
    const price = Math.max(1, Math.min(100000, Math.round(Number(b.price) || 0)))
    if (!price) return json({ ok: false, error: '단가는 1원 이상이어야 합니다.' }, 400)
    await db.prepare('UPDATE users SET credit_price = ? WHERE id = ?').bind(price, uid).run()
    await logAudit(db, admin, 'user_credit_price', uid, price + '원/크레딧', 'info', ip)
    return json({ ok: true, price })
  }
  if (action === 'reset_user_creditprice') {
    const uid = String(b.userId || '')
    if (!uid) return json({ ok: false, error: 'userId 필요' }, 400)
    await db.prepare('UPDATE users SET credit_price = NULL WHERE id = ?').bind(uid).run()
    await logAudit(db, admin, 'user_credit_price_reset', uid, '기본', 'info', ip)
    return json({ ok: true })
  }
  if (action === 'set_global_creditprice') {
    const price = Math.max(1, Math.min(100000, Math.round(Number(b.price) || 0)))
    if (!price) return json({ ok: false, error: '단가는 1원 이상이어야 합니다.' }, 400)
    await setSetting(db, 'credit_price_krw', String(price))
    await logAudit(db, admin, 'global_credit_price', '전역', price + '원/크레딧', 'high', ip)
    return json({ ok: true, price })
  }
  // 회원의 소속 학원(그룹) 지정/해제
  if (action === 'set_user_academy') {
    const uid = String(b.userId || ''); if (!uid) return json({ ok: false, error: 'userId 필요' }, 400)
    const academy = String(b.academy || '').trim().slice(0, 60)
    await db.prepare('UPDATE users SET academy = ? WHERE id = ?').bind(academy || null, uid).run()
    await logAudit(db, admin, 'user_academy', uid, academy || '(해제)', 'info', ip)
    return json({ ok: true, academy })
  }
  // 학원(그룹)별 크레딧 단가(원/크레딧) 설정
  if (action === 'set_academy_creditprice') {
    const academy = String(b.academy || '').trim().slice(0, 60)
    if (!academy) return json({ ok: false, error: '학원명을 입력하세요.' }, 400)
    const price = Math.max(1, Math.min(100000, Math.round(Number(b.price) || 0)))
    if (!price) return json({ ok: false, error: '단가는 1원 이상이어야 합니다.' }, 400)
    let map: Record<string, number> = {}
    try { const raw = await getSetting(db, 'academy_credit_prices'); if (raw) map = JSON.parse(raw) } catch { map = {} }
    map[academy] = price
    await setSetting(db, 'academy_credit_prices', JSON.stringify(map))
    await logAudit(db, admin, 'academy_credit_price', academy, price + '원/크레딧', 'high', ip)
    return json({ ok: true, academy, price })
  }
  // 학원(그룹)별 크레딧 단가 삭제(해당 학원 회원은 전역 단가 사용)
  if (action === 'del_academy_creditprice') {
    const academy = String(b.academy || '').trim().slice(0, 60)
    let map: Record<string, number> = {}
    try { const raw = await getSetting(db, 'academy_credit_prices'); if (raw) map = JSON.parse(raw) } catch { map = {} }
    delete map[academy]
    await setSetting(db, 'academy_credit_prices', JSON.stringify(map))
    await logAudit(db, admin, 'academy_credit_price_del', academy, '삭제', 'info', ip)
    return json({ ok: true })
  }
  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
