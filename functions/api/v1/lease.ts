// POST /api/v1/lease  — 우리 모델을 빌려간다. 크레딧이 실제로 차감된다.
//   요청: { model: "sr-x4-fast", days?: 1~30 }
//   응답: { lease, expires_at, files:[{name,url}], sdk, credits_charged, credits_remaining }
// GET  /api/v1/lease  — 내가 가진 리스 목록(남은 기간·사용 횟수).
//
// 차감 방식은 /api/v1/generate 와 똑같이 맞춘다 — 같은 돈이 다른 규칙으로 빠지면 안 된다.
// 상대 차감(빼기)으로 하고, 기록용 잔액은 차감 뒤에 다시 읽는다: 절대값을 덮어쓰면
// 동시에 진행 중인 다른 차감이 지워진다(둘 다 100을 읽고 각각 30을 빼면 70이 된다).
import { resolveDB, ensureSchema, json } from '../_utils'
import { getUserByApiKey, hasVideoApiAccess, ensureApiKeysSchema, enforceRateLimit } from '../_apikeys'
import { computeCharge, getUsdKrw, resolveMarkup, resolveCostOverride, ensureAiUsage, LEASE_SR, CREDIT_KRW } from '../studio/_pricing'
import { LENDABLE, ensureLeaseSchema, leaseSecret, signLease } from './_lease'

function err(msg: string, status: number) { return json({ ok: false, error: msg }, status) }

async function auth(request: Request, env: any) {
  const db = resolveDB(env)
  if (!db) return { err: err('DB 바인딩 없음', 500) }
  await ensureSchema(db); await ensureApiKeysSchema(db); await ensureLeaseSchema(db)
  const ak = await getUserByApiKey(db, request.headers.get('Authorization'))
  if (!ak) return { err: err('유효한 API 키가 필요합니다. Authorization: Bearer bg_live_...', 401) }
  if (!hasVideoApiAccess(ak.user)) return { err: err('API는 노드형 AI 영상 플랜에서만 사용할 수 있습니다.', 403) }
  return { db, me: ak.user, keyId: ak.keyId }
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const a: any = await auth(request as Request, env)
  if (a.err) return a.err
  const { db, me, keyId } = a
  const isAdmin = me.role === 'admin'

  const rl = await enforceRateLimit(db, me.id, 'post', isAdmin)
  if (!rl.ok) return json({ ok: false, error: rl.reason || '요청이 너무 많습니다.', retryAfter: rl.retryAfter || 60, rateLimited: true }, 429)

  const body: any = (await (request as Request).json().catch(() => null)) || {}
  const modelId = String(body.model || '')
  const m = LENDABLE[modelId]
  if (!m) return err('모르는 모델입니다. GET /api/v1/models 로 목록을 확인하세요.', 400)
  //  기간은 우리가 정한 범위 안으로 —  호출자가 보낸 값을 그대로 믿으면 100년짜리 리스가 나온다
  const days = Math.max(1, Math.min(30, Math.round(Number(body.days) || 7)))

  // 값 계산 → 잔액 확인 → 차감 → 발급 (순서를 지켜야 공짜 발급이 안 생긴다)
  const rate = await getUsdKrw(db)
  const markup = await resolveMarkup(db, me.id, LEASE_SR, Number(me.credit_markup) || 0)
  const c = computeCharge({ model: LEASE_SR, units: 1, kind: 'image' }, rate, markup, CREDIT_KRW, await resolveCostOverride(db, LEASE_SR))
  const balance = Number(me.credits) || 0
  if (!isAdmin && balance < c.credits) {
    return json({ ok: false, error: '크레딧이 부족합니다.', need: c.credits, have: balance, needPlan: true }, 402)
  }

  const charged = isAdmin ? 0 : Math.round(Math.min(balance, c.credits) * 100) / 100
  let after = balance
  if (charged > 0) {
    await db.prepare('UPDATE users SET credits = ROUND(COALESCE(credits,0) - ?, 2) WHERE id = ?').bind(charged, me.id).run()
    const fresh: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first().catch(() => null)
    after = Math.round((Number(fresh?.credits) || 0) * 100) / 100
    try {
      await db.prepare('INSERT INTO transactions (id,user_id,kind,amount,balance_after,memo,created_at) VALUES (?,?,\'credit\',?,?,?,?)')
        .bind('t_' + crypto.randomUUID().slice(0, 16), me.id, -charged, after, '모델 대여 · ' + m.title, new Date().toISOString()).run()
    } catch { /* 거래 기록 실패는 차감을 되돌릴 만한 일이 아니다 */ }
    try {
      await ensureAiUsage(db)
      await db.prepare(
        'INSERT INTO ai_usage (id,user_id,email,name,provider,model,kind,units,usd,cost_krw,credits,revenue_krw,markup,usd_krw,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ).bind('au' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), me.id, me.email || '', me.name || '',
        'lease', LEASE_SR, 'image', 1, c.usd, c.costKrwExact, charged, charged * CREDIT_KRW, c.markup, c.usdKrw, new Date().toISOString()).run()
    } catch { /* 집계 실패도 마찬가지 */ }
  }

  const leaseId = 'lz_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  const now = Date.now()
  const expMs = now + days * 86400_000
  await db.prepare(
    'INSERT INTO model_leases (id,user_id,key_id,model,credits,calls,issued_at,expires_at) VALUES (?,?,?,?,?,0,?,?)',
  ).bind(leaseId, me.id, keyId || '', modelId, charged, new Date(now).toISOString(), new Date(expMs).toISOString()).run()

  const secret = await leaseSecret(db, env)
  const token = await signLease(secret, { l: leaseId, u: me.id, m: modelId, e: Math.floor(expMs / 1000) })
  const origin = new URL((request as Request).url).origin

  return json({
    ok: true,
    lease: token,
    lease_id: leaseId,
    model: modelId,
    expires_at: new Date(expMs).toISOString(),
    files: m.files.map((f) => ({ name: f.name, url: `${origin}/api/v1/model-file/${f.name}?lease=${encodeURIComponent(token)}` })),
    sdk: `${origin}/sdk/bygency-sr.js`,
    license: m.license,
    credits_charged: charged,
    credits_remaining: after,
    note: '추론은 빌려가신 쪽 기기에서 돕니다. 기간이 지나면 파일 주소가 막힙니다.',
  })
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const a: any = await auth(request as Request, env)
  if (a.err) return a.err
  const { db, me } = a
  const rl = await enforceRateLimit(db, me.id, 'get', me.role === 'admin')
  if (!rl.ok) return json({ ok: false, error: rl.reason || '요청이 너무 많습니다.', rateLimited: true }, 429)
  const rows: any = await db.prepare(
    'SELECT id,model,credits,calls,issued_at,expires_at,revoked_at FROM model_leases WHERE user_id = ? ORDER BY issued_at DESC LIMIT 50',
  ).bind(me.id).all().catch(() => ({ results: [] }))
  const list = (rows.results || []).map((r: any) => ({
    lease_id: r.id, model: r.model, credits: r.credits, downloads: r.calls,
    issued_at: r.issued_at, expires_at: r.expires_at,
    active: !r.revoked_at && new Date(r.expires_at).getTime() > Date.now(),
  }))
  return json({ ok: true, leases: list })
}
