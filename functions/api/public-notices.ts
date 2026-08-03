import { Env, json, ensureSchema, resolveDB, sameOriginOk } from './_utils'
import { ensureVisitorNoticeSchema, classifyVisitor, recordVisitorEvent, getActiveVisitorCampaigns, recordSnooze } from './_notices'

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
      /* 서버 시각과 집행 종료 시각을 함께 준다.
         이게 없으면 화면은 다음 폴링(45초)이 와야 집행이 끝난 걸 알아서, 끝난 광고가 최대 45초 더 떠 있었다.
         종료 시각을 알면 그 순간에 정확히 내릴 수 있다. now 를 같이 주는 이유는 방문자 PC 시계가
         틀어져 있을 수 있어서다 — 그 차이를 보정하지 않으면 광고가 일찍 사라지거나 늦게까지 남는다. */
      now: new Date().toISOString(),
      notices: camps.map((c) => ({
        id: c.id, title: c.title, body: c.body,
        imageUrl: c.image_url || '', videoUrl: c.video_url || '',
        ctaLabel: c.cta_label || '', ctaUrl: c.cta_url || '',
        // 강력 알림이면 화면 정중앙에 가림막과 함께 띄운다(그 외는 하단 토스트)
        strong: !!Number(c.strong || 0),
        snoozeDays: Math.max(1, Math.min(30, Number(c.snooze_days) || 3)),
        endAt: c.end_at || '',           // 집행 종료 시각(있으면) — 화면이 그 순간에 정확히 내린다
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
    const b: any = await (request.json().catch(() => null)) ?? {}
    const campaignId = String(b.campaignId || '').trim()
    const visitor = String(b.visitor || '').slice(0, 64)
    const path = String(b.path || '/').slice(0, 200)
    if (!campaignId) return json({ ok: false, error: 'campaignId 필요' }, 400)
    /* 방문자 id 가 없으면 아무것도 남기지 않는다.
       노출(GET)은 이미 빈 id 를 건너뛰므로, 여기서만 받아 주면 집계가 어긋난다 —
       서로 다른 사람의 전환이 (campaign_id, '', kind) 한 줄로 뭉쳐 1건으로 세지고,
       노출 0 인데 전환이 있는 화면이 나온다. 스누즈도 저장 키가 방문자라 남지 않는데
       ok 라고 답해서 "보지 않기가 안 먹는다" 는 걸 아무도 몰랐다.
       (화면 쪽은 저장소가 막혀도 쿠키·메모리로 id 를 만들어 여기까지 온다) */
    if (!visitor) return json({ ok: false, error: '방문자 식별 불가' }, 200)
    // "N일 보지 않기" 스누즈
    if (b.kind === 'snooze') {
      const days = Math.max(1, Math.min(30, Number(b.days) || 3))
      await recordSnooze(db, campaignId, visitor, days)
      return json({ ok: true, snoozedDays: days })
    }
    const kind = b.kind === 'convert' ? 'convert' : 'read'
    const info = await classifyVisitor(db, request)
    await recordVisitorEvent(db, { campaignId, visitor, info, kind, path })
    return json({ ok: true })
  } catch {
    return json({ ok: false }, 200)
  }
}
