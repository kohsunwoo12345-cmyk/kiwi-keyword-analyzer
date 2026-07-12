import { Env, json, ensureSchema, getSessionUser, resolveDB, clientIp, geoFrom } from '../_utils'

// POST /api/pwa/track { endpoint?, platform?, allowed } → PWA 설치 & 푸시 허용 현황 기록
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)

  const me: any = await getSessionUser(request, db).catch(() => null)
  const body: any = await request.json().catch(() => ({}))
  const ip = clientIp(request)
  const geo = geoFrom(request)
  const ua = request.headers.get('User-Agent') || ''
  const endpoint = String(body.endpoint || '')
  const platform = String(body.platform || (/(iphone|ipad|ipod)/i.test(ua) ? 'iOS' : /android/i.test(ua) ? 'Android' : /macintosh/i.test(ua) ? 'macOS' : /windows/i.test(ua) ? 'Windows' : 'Web'))
  const allowed = body.allowed ? 1 : 0

  // 동일 endpoint 는 갱신, 없으면 신규 기록
  if (endpoint) {
    const dup: any = await db.prepare('SELECT id FROM app_installs WHERE endpoint = ?').bind(endpoint).first()
    if (dup) {
      await db.prepare('UPDATE app_installs SET allowed = ?, ip = ?, country = ?, city = ?, ua = ? WHERE id = ?')
        .bind(allowed, ip, geo.country, geo.city, ua, dup.id).run()
      return json({ ok: true, updated: true })
    }
  }
  await db
    .prepare('INSERT INTO app_installs (id, user_id, user_email, endpoint, platform, allowed, ip, country, city, ua, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind('ins_' + crypto.randomUUID().slice(0, 14), me?.id || '', me?.email || '', endpoint, platform, allowed, ip, geo.country, geo.city, ua, new Date().toISOString())
    .run()
  return json({ ok: true })
}
