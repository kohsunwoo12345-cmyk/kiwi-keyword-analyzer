import { Env, json, ensureSchema, resolveDB, clientIp, geoFrom, getSessionUser, rateLimitOk, asText } from './_utils'

// 오래된 방문 기록 정리 — 최근 KEEP 건만 남긴다.
//  ⚠ 예전에는 방문 1건마다
//      DELETE FROM visits WHERE id NOT IN (SELECT id FROM visits ORDER BY created_at DESC LIMIT 200000)
//    를 돌렸다. 이 형태는 매 방문마다 최대 20만 행을 훑는 반결합(anti-join)이라,
//    표가 커질수록 모든 페이지 방문이 그만큼 느려지고 D1 읽기 행수도 그만큼 청구된다.
//    실측: 191행일 때 34ms → 6만행일 때 150ms (같은 요청, 4배 이상).
//    이제 (1) 가끔만 돌리고 (2) created_at 색인을 타는 형태로 바꾸고
//    (3) 응답을 붙잡지 않도록 waitUntil 로 넘긴다.
const KEEP = 200000
async function prune(db: D1Database) {
  await db.prepare(
    `DELETE FROM visits WHERE created_at < (SELECT created_at FROM visits ORDER BY created_at DESC LIMIT 1 OFFSET ?)`,
  ).bind(KEEP).run().catch(() => {})
}

function deviceOf(ua: string): string {
  if (/(iphone|ipad|ipod|android|mobile)/i.test(ua)) return 'Mobile'
  if (/(macintosh|windows|linux)/i.test(ua)) return 'Desktop'
  return 'Other'
}

// POST /api/visit { path, ref?, visitor? } → 방문 기록 (공개, 비콘)
export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false }, 200)
  try {
    await ensureSchema(db)
    // 로그인 없이 부를 수 있는 기록 경로 — 한 IP 가 통계를 무한정 부풀리지 못하게 막는다
    if (!(await rateLimitOk(db, `visit:${clientIp(request) || 'unknown'}`, 300, 10))) return json({ ok: true })
    const b: any = await (request.json().catch(() => null)) ?? {}
    const path = asText(b.path, 200) || '/'
    const ref = asText(b.ref, 300)
    const visitor = asText(b.visitor, 64)
    const ua = request.headers.get('User-Agent') || ''
    const geo = geoFrom(request)
    const me: any = await getSessionUser(request, db).catch(() => null)
    await db
      .prepare(`INSERT INTO visits (id, path, ref, ip, country, city, region, ua, device, visitor, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind('v_' + crypto.randomUUID().slice(0, 16), path, ref, clientIp(request), geo.country, geo.city, geo.region, ua.slice(0, 200), deviceOf(ua), visitor, me?.id || '', new Date().toISOString())
      .run()
    // 상한 유지 — 매 방문이 아니라 가끔만, 응답을 붙잡지 않고
    if (Math.random() < 0.01) {
      const p = prune(db)
      if (typeof waitUntil === 'function') waitUntil(p); else await p.catch(() => {})
    }
  } catch {
    /* ignore */
  }
  return json({ ok: true })
}
