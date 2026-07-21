import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/credit-grants?days=90&type=all|auto|manual
//  크레딧 "지급" 내역(양수 크레딧 트랜잭션)만. 자동(플랜/추천/이벤트) vs 수동(관리자/충전) 분류.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const days = Math.min(3650, Math.max(1, Number(url.searchParams.get('days') || 90)))
  const type = String(url.searchParams.get('type') || 'all') // all | auto | manual
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const rows: any[] = ((await db.prepare(
    `SELECT t.id, t.user_id, t.amount, t.balance_after, t.memo, t.created_at,
            u.name AS user_name, u.email AS user_email
     FROM transactions t LEFT JOIN users u ON u.id = t.user_id
     WHERE t.kind = 'credit' AND t.amount > 0 AND t.created_at > ?
     ORDER BY t.created_at DESC LIMIT 2000`,
  ).bind(since).all()).results as any[]) || []

  // 메모 기반 분류
  const classify = (memo: string): { auto: boolean; category: string } => {
    const m = String(memo || '')
    if (/플랜 지급 크레딧|플랜 크레딧|플랜/.test(m)) return { auto: true, category: '플랜 지급' }
    if (/추천 리워드|추천인|리워드/.test(m)) return { auto: true, category: '추천 리워드' }
    if (/이벤트|가입 축하|가입 크레딧|웰컴|welcome/i.test(m)) return { auto: true, category: '이벤트·가입' }
    if (/충전 승인|충전/.test(m)) return { auto: false, category: '크레딧 충전' }
    if (/관리자/.test(m)) return { auto: false, category: '관리자 지급' }
    return { auto: false, category: '기타 지급' }
  }

  const all = rows.map((r) => {
    const c = classify(r.memo)
    return {
      id: r.id,
      userId: r.user_id,
      userName: r.user_name || '',
      userEmail: r.user_email || '',
      amount: Number(r.amount) || 0,
      balanceAfter: r.balance_after == null ? null : Number(r.balance_after),
      memo: r.memo || '',
      createdAt: r.created_at,
      auto: c.auto,
      category: c.category,
    }
  })

  const filtered = type === 'auto' ? all.filter((r) => r.auto) : type === 'manual' ? all.filter((r) => !r.auto) : all

  const sum = (arr: typeof all) => arr.reduce((s, r) => s + r.amount, 0)
  const autoRows = all.filter((r) => r.auto)
  const manualRows = all.filter((r) => !r.auto)

  // 카테고리별 집계
  const byCatMap: Record<string, { category: string; auto: boolean; count: number; credits: number }> = {}
  for (const r of all) {
    const k = r.category
    if (!byCatMap[k]) byCatMap[k] = { category: r.category, auto: r.auto, count: 0, credits: 0 }
    byCatMap[k].count++
    byCatMap[k].credits += r.amount
  }
  const byCategory = Object.values(byCatMap).sort((a, b) => b.credits - a.credits)

  return json({
    ok: true,
    days,
    type,
    totals: {
      count: all.length,
      total: sum(all),
      autoCount: autoRows.length,
      autoTotal: sum(autoRows),
      manualCount: manualRows.length,
      manualTotal: sum(manualRows),
    },
    byCategory,
    rows: filtered,
  })
}
