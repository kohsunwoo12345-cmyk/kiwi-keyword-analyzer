import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/visit-stats?days=14 → 접속 통계 분석
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') || 14)))
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const dayAgo = new Date(Date.now() - 86400000).toISOString()

  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all()).results || []
  const one = async (sql: string, ...b: any[]) => { const r: any = await db.prepare(sql).bind(...b).first(); return r || {} }

  const [totalPv, pv24, uv, uv24, byDay, byPath, byCountry, byDevice, byHour, byRef, recent] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM visits'),
    one('SELECT COUNT(*) AS n FROM visits WHERE created_at > ?', dayAgo),
    one('SELECT COUNT(DISTINCT CASE WHEN visitor != "" THEN visitor ELSE ip END) AS n FROM visits'),
    one('SELECT COUNT(DISTINCT CASE WHEN visitor != "" THEN visitor ELSE ip END) AS n FROM visits WHERE created_at > ?', dayAgo),
    rows("SELECT substr(created_at,1,10) AS d, COUNT(*) AS pv, COUNT(DISTINCT CASE WHEN visitor != '' THEN visitor ELSE ip END) AS uv FROM visits WHERE created_at > ? GROUP BY d ORDER BY d", since),
    rows('SELECT path, COUNT(*) AS n FROM visits WHERE created_at > ? GROUP BY path ORDER BY n DESC LIMIT 15', since),
    rows("SELECT CASE WHEN country != '' THEN country ELSE '미상' END AS country, COUNT(*) AS n FROM visits WHERE created_at > ? GROUP BY country ORDER BY n DESC LIMIT 12", since),
    rows("SELECT CASE WHEN device != '' THEN device ELSE 'Other' END AS device, COUNT(*) AS n FROM visits WHERE created_at > ? GROUP BY device ORDER BY n DESC", since),
    rows("SELECT substr(created_at,12,2) AS h, COUNT(*) AS n FROM visits WHERE created_at > ? GROUP BY h ORDER BY h", since),
    rows("SELECT CASE WHEN ref != '' THEN ref ELSE '직접 유입' END AS ref, COUNT(*) AS n FROM visits WHERE created_at > ? GROUP BY ref ORDER BY n DESC LIMIT 10", since),
    rows('SELECT path, ip, country, device, ref, created_at FROM visits ORDER BY created_at DESC LIMIT 60'),
  ])

  return json({
    ok: true,
    days,
    stats: { totalPv: totalPv.n || 0, pv24: pv24.n || 0, uv: uv.n || 0, uv24: uv24.n || 0 },
    byDay, byPath, byCountry, byDevice, byHour, byRef, recent,
  })
}
