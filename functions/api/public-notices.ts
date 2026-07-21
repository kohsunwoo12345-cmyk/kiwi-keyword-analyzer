import { Env, json, ensureSchema, resolveDB, sameOriginOk } from './_utils'
import { ensureVisitorNoticeSchema, classifyVisitor, recordVisitorEvent, getActiveVisitorCampaigns } from './_notices'

// 공개 방문자 팝업 알림 (비회원 포함)
//  GET  /api/public-notices?path=/&visitor=<id>  → 이 방문자에게 보여줄 활성 캠페인 + 노출(view) 기록
//  POST /api/public-notices { campaignId, visitor, kind:'read'|'convert', path } → X(읽음)/CTA(전환) 기록

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: true, notices: [] })
  try {
    await ensureSchema(db)
    await ensureVisitorNoticeSchema(db)
    const url = new URL(request.url)
    const path = String(url.searchParams.get('path') || '/').slice(0, 200)
    const visitor = String(url.searchParams.get('visitor') || '').slice(0, 64)
    const camps = await getActiveVisitorCampaigns(db, path, visitor)
    if (camps.length) {
      const info = await classifyVisitor(db, request)
      // 노출(view) 기록 (방문자·캠페인당 1건)
      for (const c of camps) {
        if (visitor) await recordVisitorEvent(db, { campaignId: c.id, visitor, info, kind: 'view', path })
      }
    }
    return json({
      ok: true,
      notices: camps.map((c) => ({
        id: c.id, title: c.title, body: c.body,
        imageUrl: c.image_url || '', ctaLabel: c.cta_label || '', ctaUrl: c.cta_url || '',
        createdAt: c.created_at,
      })),
    })
  } catch {
    return json({ ok: true, notices: [] })
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false }, 200)
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  try {
    await ensureSchema(db)
    await ensureVisitorNoticeSchema(db)
    const b: any = await request.json().catch(() => ({}))
    const campaignId = String(b.campaignId || '').trim()
    const visitor = String(b.visitor || '').slice(0, 64)
    const path = String(b.path || '/').slice(0, 200)
    const kind = b.kind === 'convert' ? 'convert' : 'read'
    if (!campaignId) return json({ ok: false, error: 'campaignId 필요' }, 400)
    const info = await classifyVisitor(db, request)
    await recordVisitorEvent(db, { campaignId, visitor, info, kind, path })
    return json({ ok: true })
  } catch {
    return json({ ok: false }, 200)
  }
}
