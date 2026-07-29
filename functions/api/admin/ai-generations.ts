import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureAiUsage, getUsdKrw } from '../studio/_pricing'

// GET /api/admin/ai-generations?limit=&offset=&kind=&q=&days=
//  → 관리자: 각 사용자의 AI 이미지/영상 생성 1건씩(프롬프트·레퍼런스·결과·비용·환율) 목록
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAiUsage(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 60)))
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
  const kind = String(url.searchParams.get('kind') || '') // '', image, video
  const q = String(url.searchParams.get('q') || '').trim()
  const days = Math.min(3650, Math.max(1, Number(url.searchParams.get('days') || 365)))
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const where: string[] = ['created_at > ?']
  const binds: any[] = [since]
  if (kind === 'image' || kind === 'video') { where.push('kind = ?'); binds.push(kind) }
  if (q) { where.push('(email LIKE ? OR name LIKE ? OR model LIKE ? OR prompt LIKE ?)'); const like = `%${q}%`; binds.push(like, like, like, like) }
  const whereSql = where.join(' AND ')

  const totalRow: any = await db.prepare(`SELECT COUNT(*) AS c FROM ai_usage WHERE ${whereSql}`).bind(...binds).first().catch(() => ({ c: 0 }))
  const rows =
    (await db
      .prepare(
        `SELECT id, created_at, user_id, name, email, provider, model, kind, units,
                credits, cost_krw, usd, usd_krw, markup, revenue_krw, prompt, refs, result_url, result_kind
         FROM ai_usage WHERE ${whereSql}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...binds, limit, offset)
      .all()).results || []

  const todayRate = await getUsdKrw(db)

  const items = rows.map((r: any) => {
    let refs: string[] = []
    try { refs = r.refs ? JSON.parse(r.refs) : [] } catch { refs = [] }
    if (!Array.isArray(refs)) refs = []
    return {
      id: r.id,
      createdAt: r.created_at,
      userId: r.user_id || '',
      name: r.name || '',
      email: r.email || '',
      provider: r.provider || '',
      model: r.model || '',
      kind: r.kind || '',
      units: Number(r.units) || 0,
      credits: Number(r.credits) || 0,
      costKrw: Number(r.cost_krw) || 0,
      usd: Number(r.usd) || 0,
      usdKrw: Number(r.usd_krw) || 0,
      markup: Number(r.markup) || 0,
      //  실제로 회원 지갑에서 빠진 금액(원). 크레딧 × 그 회원의 1크레딧 단가 — 차감 시점에 확정돼 있다.
      revenueKrw: Number(r.revenue_krw) || 0,
      profitKrw: (Number(r.revenue_krw) || 0) - (Number(r.cost_krw) || 0),
      /* 금액이 안 붙은 줄 = 보관 전용 기록이다.
         차감은 생성이 성공한 자리에서 이미 끝났고 그 금액은 다른 줄에 있다.
         이걸 "0원" 으로 보여 주면 공짜로 생성된 것처럼 읽히므로 화면에서 구분한다. */
      archiveOnly: !(Number(r.credits) || Number(r.cost_krw) || Number(r.usd)),
      prompt: r.prompt || '',
      refs,
      resultUrl: r.result_url || '',
      resultKind: r.result_kind || r.kind || '',
    }
  })

  return json({ ok: true, todayRate, total: Number(totalRow?.c) || 0, limit, offset, items })
}
