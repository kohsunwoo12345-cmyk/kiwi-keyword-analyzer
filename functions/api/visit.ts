import { Env, json, ensureSchema, resolveDB, clientIp, geoFrom, getSessionUser } from './_utils'

function deviceOf(ua: string): string {
  if (/(iphone|ipad|ipod|android|mobile)/i.test(ua)) return 'Mobile'
  if (/(macintosh|windows|linux)/i.test(ua)) return 'Desktop'
  return 'Other'
}

// POST /api/visit { path, ref?, visitor? } → 방문 기록 (공개, 비콘)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false }, 200)
  try {
    await ensureSchema(db)
    const b: any = await request.json().catch(() => ({}))
    const path = String(b.path || '/').slice(0, 200)
    const ref = String(b.ref || '').slice(0, 300)
    const visitor = String(b.visitor || '').slice(0, 64)
    const ua = request.headers.get('User-Agent') || ''
    const geo = geoFrom(request)
    const me: any = await getSessionUser(request, db).catch(() => null)
    await db
      .prepare(`INSERT INTO visits (id, path, ref, ip, country, city, ua, device, visitor, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind('v_' + crypto.randomUUID().slice(0, 16), path, ref, clientIp(request), geo.country, geo.city, ua.slice(0, 200), deviceOf(ua), visitor, me?.id || '', new Date().toISOString())
      .run()
    // 상한 유지 (최근 200000건) — 접속 IP를 넉넉히 보존
    await db.prepare('DELETE FROM visits WHERE id NOT IN (SELECT id FROM visits ORDER BY created_at DESC LIMIT 200000)').run().catch(() => {})
  } catch {
    /* ignore */
  }
  return json({ ok: true })
}
