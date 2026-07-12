import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, publicUser } from '../_utils'

// POST /api/account/credit-use { amount, feature, memo? } → 기능 사용 시 크레딧 차감
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const amount = Math.floor(Number(body.amount || 0))
  const feature = String(body.feature || '기능 사용')
  if (!amount || amount <= 0) return json({ ok: false, error: '차감할 크레딧 수량이 올바르지 않습니다.' }, 400)

  const r = await spendCredits(db, me.id, amount, feature, String(body.memo || ''))
  if (!r.ok) return json({ ok: false, error: r.error, balance: (r as any).balance }, 402)

  const fresh: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()
  return json({ ok: true, balanceAfter: r.balanceAfter, user: publicUser(fresh) })
}
