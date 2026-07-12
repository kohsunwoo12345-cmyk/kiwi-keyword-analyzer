import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity } from '../_utils'

// POST /api/account/point-request { amount, memo? } → 포인트 지급 신청(승인 대기)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const amount = Math.floor(Number(body.amount || 0))
  if (!amount || amount <= 0) return json({ ok: false, error: '올바른 포인트 수량을 입력하세요.' }, 400)
  if (amount > 10_000_000) return json({ ok: false, error: '신청 가능한 최대 수량을 초과했습니다.' }, 400)

  const dup = await db
    .prepare("SELECT id FROM point_requests WHERE user_id = ? AND status = 'pending'")
    .bind(me.id)
    .first()
  if (dup) return json({ ok: false, error: '이미 승인 대기 중인 신청이 있습니다.' }, 409)

  const now = new Date().toISOString()
  await db
    .prepare(`INSERT INTO point_requests (id, user_id, amount, memo, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`)
    .bind('ptr_' + crypto.randomUUID().slice(0, 14), me.id, amount, String(body.memo || ''), now)
    .run()
  await logActivity(db, me.id, 'point', `포인트 지급 신청: ${amount.toLocaleString()}P`)
  return json({ ok: true })
}

// GET → 본인 포인트 신청 내역
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const requests = (await db.prepare('SELECT amount, memo, status, created_at, decided_at FROM point_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(me.id).all()).results || []
  return json({ ok: true, requests })
}
