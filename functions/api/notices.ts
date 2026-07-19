import { Env, json, ensureSchema, resolveDB, getSessionUser, sameOriginOk } from './_utils'

// 사용자 팝업 알림
//  GET  /api/notices              → 로그인 회원의 "안읽은" 팝업 알림 목록(하단→상단 슬라이드로 표시)
//  POST /api/notices { campaignId } → X 버튼으로 닫음 = 읽음 처리(read_at 기록)

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: true, notices: [] })
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: true, notices: [] })

  const rows = (await db.prepare(
    `SELECT c.id, c.title, c.body, c.image_url, c.cta_label, c.cta_url, c.created_at
     FROM notice_receipts r JOIN notice_campaigns c ON c.id = r.campaign_id
     WHERE r.user_id = ? AND r.read_at IS NULL
     ORDER BY c.created_at ASC LIMIT 20`,
  ).bind(me.id).all()).results || []

  return json({
    ok: true,
    notices: (rows as any[]).map((c) => ({
      id: c.id, title: c.title, body: c.body,
      imageUrl: c.image_url || '', ctaLabel: c.cta_label || '', ctaUrl: c.cta_url || '',
      createdAt: c.created_at,
    })),
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)

  const b: any = await request.json().catch(() => ({}))
  const campaignId = String(b.campaignId || '').trim()
  if (!campaignId) return json({ ok: false, error: 'campaignId 필요' }, 400)

  // 본인 영수증만, 아직 안읽은 것만 갱신 (멱등)
  await db.prepare('UPDATE notice_receipts SET read_at = ? WHERE campaign_id = ? AND user_id = ? AND read_at IS NULL')
    .bind(new Date().toISOString(), campaignId, me.id).run()
  return json({ ok: true })
}
