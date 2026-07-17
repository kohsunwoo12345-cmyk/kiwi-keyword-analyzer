import { Env, json, ensureSchema, getSessionUser, resolveDB, planPriceKrw } from '../_utils'

// GET /api/account/payments → 본인 결제 내역 (크레딧 충전 + 요금제 결제)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const credits = (await db
    .prepare("SELECT amount, price, memo, created_at, decided_at FROM credit_requests WHERE user_id = ? AND status = 'approved' ORDER BY COALESCE(decided_at, created_at) DESC LIMIT 100")
    .bind(me.id)
    .all()).results || []
  const plans = (await db
    .prepare("SELECT track, from_plan, to_plan, created_at, decided_at FROM plan_requests WHERE user_id = ? AND status = 'approved' ORDER BY COALESCE(decided_at, created_at) DESC LIMIT 100")
    .bind(me.id)
    .all()).results || []

  const items: any[] = []
  for (const c of credits as any[]) {
    items.push({
      type: 'credit',
      title: `크레딧 충전 ${(Number(c.amount) || 0).toLocaleString('ko-KR')}개`,
      amountKrw: Number(c.price) || 0,
      credits: Number(c.amount) || 0,
      memo: c.memo || '',
      at: c.decided_at || c.created_at,
    })
  }
  for (const p of plans as any[]) {
    const track = p.track === 'video' ? 'video' : 'marketer'
    items.push({
      type: 'plan',
      title: `${track === 'video' ? 'AI영상' : '마케터'} ${p.to_plan} 플랜 결제`,
      amountKrw: planPriceKrw(track, p.to_plan),
      credits: 0,
      memo: p.from_plan && p.from_plan !== '없음' ? `${p.from_plan} → ${p.to_plan}` : '',
      at: p.decided_at || p.created_at,
    })
  }
  items.sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1))
  const totalKrw = items.reduce((s, i) => s + (Number(i.amountKrw) || 0), 0)
  return json({ ok: true, items: items.slice(0, 120), totalKrw, count: items.length })
}
