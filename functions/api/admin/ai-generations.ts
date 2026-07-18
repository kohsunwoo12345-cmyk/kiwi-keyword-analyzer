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
        `SELECT id, created_at, user_id, name, email, provider, model, kind,
                credits, cost_krw, usd, usd_krw, markup, prompt, refs, result_url, result_kind
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
      credits: Number(r.credits) || 0,
      costKrw: Number(r.cost_krw) || 0,
      usd: Number(r.usd) || 0,
      usdKrw: Number(r.usd_krw) || 0,
      markup: Number(r.markup) || 0,
      prompt: r.prompt || '',
      refs,
      resultUrl: r.result_url || '',
      resultKind: r.result_kind || r.kind || '',
    }
  })

  return json({ ok: true, todayRate, total: Number(totalRow?.c) || 0, limit, offset, items })
}
