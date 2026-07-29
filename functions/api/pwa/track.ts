import { Env, json, ensureSchema, getSessionUser, resolveDB, clientIp, geoFrom, rateLimitOk } from '../_utils'

// POST /api/pwa/track { endpoint?, platform?, allowed } → PWA 설치 & 푸시 허용 현황 기록
//
// ⚠ 예전에는 인증도 한도도 없이 body.endpoint 를 그대로 열쇠로 써서 UPDATE 했다.
//   그 결과 남의 endpoint 를 알면(또는 흘러나오면) 그 사람 행을 통째로 덮어쓸 수 있었다.
//   재현: 피해자가 설치·푸시 허용(allowed=1, ip=127.0.0.1) → 비로그인 침입자가 같은 endpoint 로
//        {"allowed":false} 전송 → allowed 0, ip 198.51.100.7 로 바뀜.
//   이 표는 (1) 관리자 푸시 발송 대상(allowed=1) 과 (2) 관리자 보안 화면의 IP→지역 조회에 쓰인다.
//   즉 남의 알림을 조용히 끊고, 관리자 화면에 아무 IP·지역이나 심을 수 있었다.
//   또 endpoint 없이 부르면 매번 새 행이 들어가 무제한으로 쌓였다.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)

  const ip = clientIp(request)
  if (!(await rateLimitOk(db, `pwatrack:${ip || 'unknown'}`, 20, 10)))
    return json({ ok: false, error: '요청이 너무 잦습니다.' }, 429)

  const me: any = await getSessionUser(request, db).catch(() => null)
  const body: any = await request.json().catch(() => ({}))
  const geo = geoFrom(request)
  const ua = (request.headers.get('User-Agent') || '').slice(0, 300)
  const endpoint = String(body.endpoint || '').slice(0, 500)
  const platform = String(body.platform || (/(iphone|ipad|ipod)/i.test(ua) ? 'iOS' : /android/i.test(ua) ? 'Android' : /macintosh/i.test(ua) ? 'macOS' : /windows/i.test(ua) ? 'Windows' : 'Web')).slice(0, 40)
  const allowed = body.allowed ? 1 : 0
  const meId = String(me?.id || '')

  // 동일 endpoint 는 갱신, 없으면 신규 기록
  if (endpoint) {
    const dup: any = await db.prepare('SELECT id, user_id FROM app_installs WHERE endpoint = ?').bind(endpoint).first()
    if (dup) {
      const owner = String(dup.user_id || '')
      // 주인이 있는 기록은 그 사람만 바꾼다.
      if (owner && owner !== meId) return json({ ok: false, error: '권한이 없습니다.' }, 403)
      // 주인이 비어 있던 기록(로그인 전 설치)은 지금 로그인한 사람 것으로 확정한다.
      await db.prepare('UPDATE app_installs SET user_id = ?, user_email = ?, allowed = ?, ip = ?, country = ?, city = ?, ua = ? WHERE id = ?')
        .bind(owner || meId, owner ? (me?.email || '') : (me?.email || ''), allowed, ip, geo.country, geo.city, ua, dup.id).run()
      return json({ ok: true, updated: true })
    }
  }
  // endpoint 없이 오는 보고(현재 프런트가 그렇다)는 매번 새 행이 됐다 — 무제한으로 쌓인다.
  //  같은 사람/같은 기기의 재보고는 갱신으로 처리한다.
  if (!endpoint) {
    const prev: any = meId
      ? await db.prepare("SELECT id FROM app_installs WHERE user_id = ? AND endpoint = '' AND platform = ? ORDER BY created_at DESC LIMIT 1")
          .bind(meId, platform).first().catch(() => null)
      : await db.prepare("SELECT id FROM app_installs WHERE user_id = '' AND endpoint = '' AND ip = ? AND ua = ? AND platform = ? ORDER BY created_at DESC LIMIT 1")
          .bind(ip, ua, platform).first().catch(() => null)
    if (prev) {
      await db.prepare('UPDATE app_installs SET allowed = ?, ip = ?, country = ?, city = ?, ua = ? WHERE id = ?')
        .bind(allowed, ip, geo.country, geo.city, ua, prev.id).run()
      return json({ ok: true, updated: true })
    }
  }
  await db
    .prepare('INSERT INTO app_installs (id, user_id, user_email, endpoint, platform, allowed, ip, country, city, ua, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind('ins_' + crypto.randomUUID().slice(0, 14), meId, me?.email || '', endpoint, platform, allowed, ip, geo.country, geo.city, ua, new Date().toISOString())
    .run()
  return json({ ok: true })
}
