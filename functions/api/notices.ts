import { Env, json, ensureSchema, resolveDB, getSessionUser, sameOriginOk } from './_utils'
import { ensureVisitorNoticeSchema } from './_notices'

// 사용자 팝업 알림
//  GET  /api/notices               → 로그인 회원의 "안읽은" 팝업 알림 목록(하단→상단 슬라이드로 표시)
//  GET  /api/notices?history=1     → 회원이 받은 모든 알림 내역(읽음/안읽음 포함)
//  POST /api/notices { campaignId } → X 버튼으로 닫음 = 읽음 처리(read_at 기록)

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: true, notices: [] })
  await ensureSchema(db)
  await ensureVisitorNoticeSchema(db)   // video_url 컬럼 보장
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: true, notices: [] })

  const url = new URL(request.url)
  // 받은 모든 알림 내역 (읽음/안읽음 포함)
  if (url.searchParams.get('history')) {
    const rows = (await db.prepare(
      `SELECT c.id, c.title, c.body, c.image_url, c.video_url, c.cta_label, c.cta_url, c.created_at,
              r.read_at, r.created_at AS received_at
       FROM notice_receipts r JOIN notice_campaigns c ON c.id = r.campaign_id
       WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 300`,
    ).bind(me.id).all()).results || []
    return json({
      ok: true,
      history: (rows as any[]).map((c) => ({
        id: c.id, title: c.title, body: c.body,
        imageUrl: c.image_url || '', videoUrl: c.video_url || '', ctaLabel: c.cta_label || '', ctaUrl: c.cta_url || '',
        receivedAt: c.received_at || c.created_at, readAt: c.read_at || null, read: !!c.read_at,
      })),
    })
  }

  const rows = (await db.prepare(
    `SELECT c.id, c.title, c.body, c.image_url, c.video_url, c.cta_label, c.cta_url, c.created_at
     FROM notice_receipts r JOIN notice_campaigns c ON c.id = r.campaign_id
     WHERE r.user_id = ? AND r.read_at IS NULL
     ORDER BY c.created_at ASC LIMIT 20`,
  ).bind(me.id).all()).results || []

  return json({
    ok: true,
    notices: (rows as any[]).map((c) => ({
      id: c.id, title: c.title, body: c.body,
      imageUrl: c.image_url || '', videoUrl: c.video_url || '', ctaLabel: c.cta_label || '', ctaUrl: c.cta_url || '',
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
