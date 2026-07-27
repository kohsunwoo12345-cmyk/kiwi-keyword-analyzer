// 제공사 실제 사용액 조회 — 잔액 스냅샷의 감소분으로 '실제로 빠져나간 금액' 을 계산한다.
//  추정(단가표)이 아니라 제공사 잔액의 실제 변화라서, 우리 기록이 맞는지 대조할 수 있다.
//
//  GET /api/admin/spend-track          → 일자별 실제 사용액 + 우리 추정 + 오차율
//  GET /api/admin/spend-track?snap=1   → 지금 잔액을 즉시 기록(평소엔 생성 때마다 자동 기록됨)
import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { TRACKABLE, RAWS, pickKey, ensureBalanceTable, snapshotBalances, dailyBalances, dailyUsage } from './_spend'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureBalanceTable(db)
  const guard = await requireAdminUser(request, db)
  if ('error' in guard) return guard.error

  const url = new URL(request.url)
  const days = Math.min(180, Math.max(2, Number(url.searchParams.get('days') || 14)))
  let snapResult: any = null
  if (url.searchParams.get('snap') === '1') snapResult = await snapshotBalances(db, env)

  const since = new Date(Date.now() - days * 86400000).toISOString()
  const providers: any[] = []

  for (const p of TRACKABLE) {
    const rows: any[] = ((await db.prepare(
      'SELECT balance, unit, created_at FROM provider_balance_snapshots WHERE provider = ? AND created_at > ? ORDER BY created_at ASC',
    ).bind(p.id, since).all().catch(() => ({ results: [] }))) as any).results || []

    // 일자별 잔액 → 일자별 실제 사용량(전날 대비 감소분). 계산 규칙은 _spend.ts 의 순수 함수.
    const daysArr = dailyBalances(rows as any)
    const daily: any[] = []
    for (const row of dailyUsage(daysArr, p.usdPerUnit)) {
      const est: any = await db.prepare(
        `SELECT COALESCE(SUM(usd),0) AS usd FROM ai_usage
         WHERE provider IN (${(RAWS[p.id] || []).map(() => '?').join(',') || "''"}) AND date(created_at) = ?`,
      ).bind(...(RAWS[p.id] || []), row.date).first().catch(() => ({ usd: 0 }))
      daily.push({ ...row, estUsd: Math.round((Number(est?.usd) || 0) * 10000) / 10000 })
    }
    // 기간 합계(충전한 날 제외)
    const real = daily.filter((d) => d.usedUsd != null).reduce((s, d) => s + d.usedUsd, 0)
    const est = daily.filter((d) => d.usedUsd != null).reduce((s, d) => s + d.estUsd, 0)
    providers.push({
      id: p.id, name: p.name, unit: p.unit, usdPerUnit: p.usdPerUnit || null,
      hasKey: !!pickKey(env, p.keys),
      snapshots: rows.length,
      latest: daysArr.length ? { date: daysArr[daysArr.length - 1][0], balance: daysArr[daysArr.length - 1][1] } : null,
      daily,
      totalRealUsd: Math.round(real * 10000) / 10000,
      totalEstUsd: Math.round(est * 10000) / 10000,
      gapPct: est > 0 ? Math.round(((real - est) / est) * 1000) / 10 : null,
    })
  }

  return json({
    ok: true, days, snap: snapResult, providers,
    note: '잔액을 알려주지 않는 제공사(씨댄스·Kling·Hailuo·Veo·GPT Image·Flux·fal)는 자동 추적이 불가능합니다.',
  })
}
