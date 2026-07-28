import { Env, json, ensureSchema, resolveDB, clientIp, geoFrom, rateLimitOk } from '../_utils'

// POST /api/leads/collect { name, phone, email?, source? } → 랜딩 DB 수집 데모 (공개)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)

  // 공개 수집 경로 — 스크립트로 리드 테이블을 채워 넣지 못하게 막는다
  if (!(await rateLimitOk(db, `lead:${clientIp(request)}`, 20, 10)))
    return json({ ok: false, error: '잠시 후 다시 시도해 주세요.' }, 429)

  const body: any = await request.json().catch(() => ({}))
  // 로그인 없이 부를 수 있는 경로라 길이 제한이 특히 중요하다(제한이 없어 20만 자가 들어갔다)
  const name = String(body.name || '').trim().slice(0, 60)
  const phone = String(body.phone || '').replace(/[^0-9]/g, '').slice(0, 20)
  const email = String(body.email || '').trim().slice(0, 120)
  if (!name) return json({ ok: false, error: '이름을 입력하세요.' }, 400)
  if (phone.length < 9 && !email) return json({ ok: false, error: '연락처(전화번호 또는 이메일)를 입력하세요.' }, 400)

  const geo = geoFrom(request)
  // 랜딩페이지 연동 (slug 있으면 해당 페이지 리드로 집계)
  let landingId = ''
  const slug = String(body.landing_slug || '')
  if (slug) {
    const lp: any = await db.prepare('SELECT id FROM landing_pages WHERE slug = ?').bind(slug).first()
    if (lp) {
      landingId = lp.id
      await db.prepare('UPDATE landing_pages SET leads = leads + 1 WHERE id = ?').bind(lp.id).run().catch(() => {})
    }
  }
  await db
    .prepare(`INSERT INTO public_leads (id, name, phone, email, source, ip, country, landing_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind('ld_' + crypto.randomUUID().slice(0, 14), name, phone, email, String(body.source || 'landing-demo').slice(0, 60), clientIp(request), geo.country, landingId, new Date().toISOString())
    .run()

  const cnt: any = await db.prepare('SELECT COUNT(*) AS n FROM public_leads').first()
  return json({ ok: true, total: cnt?.n || 0 })
}
