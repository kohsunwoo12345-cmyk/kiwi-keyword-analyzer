import { Env, json, ensureSchema, resolveDB, requireAdminUser, logAudit, clientIp, sameOriginOk } from '../_utils'
import { ensureVisitorNoticeSchema, getVisitorStats } from '../_notices'

// 팝업 알림 캠페인 — 관리자 발송/조회
//  POST /api/admin/notices  { title, body, imageUrl?, ctaLabel?, ctaUrl?, target, userId?, userIds?, plan? }
//    → 캠페인 1건 생성 + 대상 회원마다 수신 영수증(notice_receipts) 생성
//  GET  /api/admin/notices              → 발송한 캠페인 목록 + 읽음/안읽음 집계
//  GET  /api/admin/notices?id=<캠페인>   → 해당 캠페인의 회원별 읽음/안읽음 상세

const uid = (p: string) => p + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  const admin = { id: guard.me.id, email: guard.me.email }

  await ensureVisitorNoticeSchema(db)   // notice_campaigns 신규 컬럼(video_url/기간) 보장
  const b: any = await request.json().catch(() => ({}))
  const title = String(b.title || '').trim()
  const body = String(b.body || '').trim()
  const imageUrl = String(b.imageUrl || '').trim().slice(0, 1000)
  const videoUrl = String(b.videoUrl || '').trim().slice(0, 1000)
  const ctaLabel = String(b.ctaLabel || '').trim().slice(0, 40)
  const ctaUrl = String(b.ctaUrl || '').trim().slice(0, 1000)
  const target = String(b.target || 'all')
  if (!title || !body) return json({ ok: false, error: '제목과 내용을 입력하세요.' }, 400)
  // CTA URL 안전성 — 같은 사이트 경로(/...) 또는 http/https 만 허용
  if (ctaUrl && !/^(https?:\/\/|\/)/i.test(ctaUrl)) return json({ ok: false, error: 'CTA URL 은 http(s) 또는 / 로 시작해야 합니다.' }, 400)
  if (imageUrl && !/^(https?:\/\/|\/)/i.test(imageUrl)) return json({ ok: false, error: '이미지 URL 형식이 올바르지 않습니다.' }, 400)
  if (videoUrl && !/^(https?:\/\/|\/)/i.test(videoUrl)) return json({ ok: false, error: '동영상 URL 형식이 올바르지 않습니다.' }, 400)

  // 접속 전체(비회원 포함) — 개별 회원 영수증 없이 캠페인만 생성. 홈페이지/랜딩 방문자에게 팝업.
  if (target === 'visitors') {
    const scopePath = String(b.scopePath || '').trim().slice(0, 200)
    if (scopePath && !/^\//.test(scopePath)) return json({ ok: false, error: '랜딩 경로는 / 로 시작해야 합니다.' }, 400)
    // 노출 기간 (선택): startAt/endAt(ISO) 우선, 없으면 days 로 종료일 계산
    const startAt = String(b.startAt || '').trim() || null
    let endAt = String(b.endAt || '').trim() || null
    if (!endAt && Number(b.days) > 0) endAt = new Date(Date.now() + Math.min(365, Number(b.days)) * 86400000).toISOString()
    const now2 = new Date().toISOString()
    const campId2 = uid('nc_')
    await db.prepare(
      `INSERT INTO notice_campaigns (id, title, body, image_url, video_url, cta_label, cta_url, target, audience, scope_path, start_at, end_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'visitors', 0, ?, ?, ?, ?, ?)`,
    ).bind(campId2, title, body, imageUrl || null, videoUrl || null, ctaLabel || null, ctaUrl || null, scopePath || null, startAt, endAt, admin.email, now2).run()
    await logAudit(db, admin, 'notice_send', `visitors${scopePath ? ':' + scopePath : ''}${endAt ? ' ~' + endAt.slice(0, 10) : ''}`, title, 'info', clientIp(request))
    return json({ ok: true, campaignId: campId2, audience: 0, target: 'visitors' })
  }

  // 대상 회원 선정
  let recipients: any[] = []
  if (target === 'user') {
    const u: any = await db.prepare('SELECT id FROM users WHERE id = ?').bind(String(b.userId || '')).first()
    if (u) recipients = [u]
  } else if (target === 'multi') {
    const ids: string[] = Array.isArray(b.userIds) ? b.userIds.map(String).slice(0, 5000) : []
    if (ids.length) {
      const q = ids.map(() => '?').join(',')
      recipients = (await db.prepare(`SELECT id FROM users WHERE id IN (${q})`).bind(...ids).all()).results || []
    }
  } else if (target === 'plan') {
    recipients = (await db.prepare('SELECT id FROM users WHERE plan = ?').bind(String(b.plan || '')).all()).results || []
  } else {
    recipients = (await db.prepare("SELECT id FROM users WHERE status != 'deleted'").all()).results || []
  }
  if (recipients.length === 0) return json({ ok: false, error: '대상 회원이 없습니다.' }, 400)
  if (recipients.length > 5000) return json({ ok: false, error: '한 번에 최대 5,000명까지 발송할 수 있습니다.' }, 400)

  const now = new Date().toISOString()
  const campId = uid('nc_')
  await db.prepare(
    `INSERT INTO notice_campaigns (id, title, body, image_url, video_url, cta_label, cta_url, target, audience, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(campId, title, body, imageUrl || null, videoUrl || null, ctaLabel || null, ctaUrl || null, target, recipients.length, admin.email, now).run()

  // 수신 영수증 배치 삽입 (D1 batch, 100개씩)
  const stmt = db.prepare('INSERT OR IGNORE INTO notice_receipts (id, campaign_id, user_id, read_at, created_at) VALUES (?, ?, ?, NULL, ?)')
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    await db.batch(chunk.map((r: any) => stmt.bind(uid('nr_'), campId, r.id, now))).catch(() => {})
  }

  await logAudit(db, admin, 'notice_send', `${target}:${recipients.length}명`, title, 'info', clientIp(request))
  return json({ ok: true, campaignId: campId, audience: recipients.length })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (id) {
    const camp: any = await db.prepare('SELECT * FROM notice_campaigns WHERE id = ?').bind(id).first()
    if (!camp) return json({ ok: false, error: '캠페인을 찾을 수 없습니다.' }, 404)
    // 접속 전체(방문자) 캠페인 → 방문자 이벤트 기반 통계 + 최근 접속 IP·회원여부
    if (camp.target === 'visitors') {
      await ensureVisitorNoticeSchema(db)
      const stats = await getVisitorStats(db, id)
      const ev = (await db.prepare(
        `SELECT ip, is_member, member_email, kind, path, MAX(created_at) AS created_at
         FROM notice_visitor_events WHERE campaign_id = ?
         GROUP BY ip, is_member, member_email, kind, path
         ORDER BY created_at DESC LIMIT 300`,
      ).bind(id).all()).results as any[] || []
      return json({
        ok: true,
        campaign: {
          id: camp.id, title: camp.title, body: camp.body, imageUrl: camp.image_url, videoUrl: camp.video_url || '',
          ctaLabel: camp.cta_label, ctaUrl: camp.cta_url, target: camp.target, scopePath: camp.scope_path || '',
          startAt: camp.start_at || '', endAt: camp.end_at || '',
          audience: camp.audience, createdBy: camp.created_by, createdAt: camp.created_at,
        },
        visitorStats: stats,
        visitorEvents: ev.map((e) => ({
          ip: e.ip || '', isMember: Number(e.is_member) || 0, memberEmail: e.member_email || '',
          kind: e.kind, path: e.path || '', createdAt: e.created_at,
        })),
      })
    }
    const rows = (await db.prepare(
      `SELECT r.user_id, r.read_at, u.name, u.email, u.plan
       FROM notice_receipts r LEFT JOIN users u ON u.id = r.user_id
       WHERE r.campaign_id = ? ORDER BY (r.read_at IS NULL) DESC, r.read_at DESC`,
    ).bind(id).all()).results || []
    const readCount = rows.filter((r: any) => r.read_at).length
    return json({
      ok: true,
      campaign: {
        id: camp.id, title: camp.title, body: camp.body, imageUrl: camp.image_url, videoUrl: camp.video_url || '',
        ctaLabel: camp.cta_label, ctaUrl: camp.cta_url, target: camp.target,
        audience: camp.audience, createdBy: camp.created_by, createdAt: camp.created_at,
      },
      readCount, unreadCount: rows.length - readCount,
      recipients: rows.map((r: any) => ({ userId: r.user_id, name: r.name || '(탈퇴)', email: r.email || '', plan: r.plan || '', read: !!r.read_at, readAt: r.read_at })),
    })
  }

  // 목록 + 집계
  await ensureVisitorNoticeSchema(db)
  const camps = (await db.prepare('SELECT * FROM notice_campaigns ORDER BY created_at DESC LIMIT 200').all()).results || []
  const agg = (await db.prepare(
    `SELECT campaign_id,
            COUNT(*) AS total,
            SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) AS reads
     FROM notice_receipts GROUP BY campaign_id`,
  ).all()).results || []
  const aggMap: Record<string, { total: number; reads: number }> = {}
  for (const a of agg as any[]) aggMap[a.campaign_id] = { total: Number(a.total) || 0, reads: Number(a.reads) || 0 }
  // 방문자 캠페인 집계 (노출/읽음/전환)
  const vagg = (await db.prepare(
    `SELECT campaign_id, kind, COUNT(*) AS n FROM notice_visitor_events GROUP BY campaign_id, kind`,
  ).all().catch(() => ({ results: [] }))).results || []
  const vMap: Record<string, { views: number; reads: number; convert: number }> = {}
  for (const a of vagg as any[]) {
    if (!vMap[a.campaign_id]) vMap[a.campaign_id] = { views: 0, reads: 0, convert: 0 }
    if (a.kind === 'view') vMap[a.campaign_id].views = Number(a.n) || 0
    else if (a.kind === 'read') vMap[a.campaign_id].reads = Number(a.n) || 0
    else if (a.kind === 'convert') vMap[a.campaign_id].convert = Number(a.n) || 0
  }

  return json({
    ok: true,
    campaigns: (camps as any[]).map((c) => {
      if (c.target === 'visitors') {
        const v = vMap[c.id] || { views: 0, reads: 0, convert: 0 }
        return {
          id: c.id, title: c.title, body: c.body, imageUrl: c.image_url, videoUrl: c.video_url || '',
          ctaLabel: c.cta_label, ctaUrl: c.cta_url, target: c.target, scopePath: c.scope_path || '',
          startAt: c.start_at || '', endAt: c.end_at || '',
          audience: c.audience, createdBy: c.created_by, createdAt: c.created_at,
          total: v.views, readCount: v.reads, unreadCount: Math.max(0, v.views - v.reads),
          views: v.views, conversions: v.convert,
        }
      }
      const a = aggMap[c.id] || { total: c.audience || 0, reads: 0 }
      return {
        id: c.id, title: c.title, body: c.body, imageUrl: c.image_url, videoUrl: c.video_url || '',
        ctaLabel: c.cta_label, ctaUrl: c.cta_url, target: c.target,
        audience: c.audience, createdBy: c.created_by, createdAt: c.created_at,
        total: a.total, readCount: a.reads, unreadCount: a.total - a.reads,
      }
    }),
  })
}
