import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity } from '../_utils'

const PLANS = ['Starter', 'Pro', 'Business']

// POST /api/account/plan-request { to_plan, memo? } → 플랜 업그레이드 신청(승인 대기)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const to = String(body.to_plan || '')
  if (!PLANS.includes(to)) return json({ ok: false, error: '유효한 플랜을 선택하세요.' }, 400)
  if (to === me.plan) return json({ ok: false, error: '이미 사용 중인 플랜입니다.' }, 400)

  const dup = await db
    .prepare("SELECT id FROM plan_requests WHERE user_id = ? AND status = 'pending'")
    .bind(me.id)
    .first()
  if (dup) return json({ ok: false, error: '이미 승인 대기 중인 신청이 있습니다.' }, 409)

  const now = new Date().toISOString()
  await db
    .prepare(`INSERT INTO plan_requests (id, user_id, from_plan, to_plan, status, memo, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)`)
    .bind('pr_' + crypto.randomUUID().slice(0, 14), me.id, me.plan, to, String(body.memo || ''), now)
    .run()
  await logActivity(db, me.id, 'plan', `플랜 업그레이드 신청: ${me.plan} → ${to}`)
  return json({ ok: true })
}

// GET → 본인 플랜 신청 내역
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const requests = (await db.prepare('SELECT from_plan, to_plan, status, created_at, decided_at FROM plan_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(me.id).all()).results || []
  return json({ ok: true, requests })
}
