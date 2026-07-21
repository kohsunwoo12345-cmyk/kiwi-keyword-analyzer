// 방문자(비회원 포함) 팝업 알림 시스템 — "접속 전체" 발송용.
//  · notice_campaigns.target='visitors' → 홈페이지·랜딩 접속자 모두에게 하단→상단 슬라이드 팝업.
//  · 익명 방문자는 visitor 쿠키(localStorage)로 식별, X 누르면 읽음. 노출/읽음/전환 이벤트 집계.
//  · 접속 IP 가 우리 회원이 쓰던 IP 면 회원/비회원 여부 표시.
import { clientIp, getSessionUser } from './_utils'

export async function ensureVisitorNoticeSchema(db: D1Database) {
  // notice_campaigns 에 컬럼 보강 (없으면 추가): 랜딩 경로 스코프 · 동영상 · 노출 기간
  await db.prepare(`ALTER TABLE notice_campaigns ADD COLUMN scope_path TEXT`).run().catch(() => {})
  await db.prepare(`ALTER TABLE notice_campaigns ADD COLUMN video_url TEXT`).run().catch(() => {})
  await db.prepare(`ALTER TABLE notice_campaigns ADD COLUMN start_at TEXT`).run().catch(() => {})
  await db.prepare(`ALTER TABLE notice_campaigns ADD COLUMN end_at TEXT`).run().catch(() => {})
  await db.prepare(`CREATE TABLE IF NOT EXISTS notice_visitor_events (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    visitor TEXT,
    ip TEXT,
    user_id TEXT,
    is_member INTEGER DEFAULT 0,
    member_email TEXT,
    kind TEXT,
    path TEXT,
    created_at TEXT NOT NULL
  )`).run().catch(() => {})
  await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_nve_uniq ON notice_visitor_events(campaign_id, visitor, kind)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_nve_camp ON notice_visitor_events(campaign_id, kind)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_nve_ip ON notice_visitor_events(ip)`).run().catch(() => {})
  // "N일 동안 보지 않기" 스누즈 (방문자·캠페인당 1건, until 까지 숨김)
  await db.prepare(`CREATE TABLE IF NOT EXISTS notice_snoozes (
    campaign_id TEXT NOT NULL,
    visitor TEXT NOT NULL,
    until TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, visitor)
  )`).run().catch(() => {})
}

/** "N일 동안 보지 않기" — 스누즈 upsert (기존 있으면 갱신) */
export async function recordSnooze(db: D1Database, campaignId: string, visitor: string, days = 3) {
  if (!campaignId || !visitor) return
  const until = new Date(Date.now() + Math.max(1, Math.min(30, days)) * 86400000).toISOString()
  try {
    await db.prepare(
      `INSERT INTO notice_snoozes (campaign_id, visitor, until, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(campaign_id, visitor) DO UPDATE SET until = excluded.until`,
    ).bind(campaignId, visitor, until, new Date().toISOString()).run()
  } catch { /* ignore */ }
}

export interface VisitorInfo { userId: string; isMember: 0 | 1 | 2; memberEmail: string; ip: string }

/** 방문자 회원 여부 판정 — 로그인=1, 회원 IP 일치=2, 비회원=0 */
export async function classifyVisitor(db: D1Database, request: Request): Promise<VisitorInfo> {
  const ip = clientIp(request) || ''
  let me: any = null
  try { me = await getSessionUser(request, db) } catch { /* ignore */ }
  if (me && me.id) return { userId: me.id, isMember: 1, memberEmail: me.email || '', ip }
  // 로그인 안 했지만, 이 IP 로 과거에 회원이 접속한 적 있으면 "회원 IP(추정)"
  if (ip) {
    try {
      const row: any = await db.prepare(
        `SELECT v.user_id, u.email FROM visits v LEFT JOIN users u ON u.id = v.user_id
         WHERE v.ip = ? AND v.user_id IS NOT NULL AND v.user_id != '' ORDER BY v.created_at DESC LIMIT 1`,
      ).bind(ip).first()
      if (row && row.user_id) return { userId: '', isMember: 2, memberEmail: row.email || '', ip }
    } catch { /* ignore */ }
  }
  return { userId: '', isMember: 0, memberEmail: '', ip }
}

/** 방문자 이벤트 기록 (view|read|convert) — 방문자·종류당 1건(멱등) */
export async function recordVisitorEvent(
  db: D1Database,
  o: { campaignId: string; visitor: string; info: VisitorInfo; kind: 'view' | 'read' | 'convert'; path?: string },
) {
  try {
    await db.prepare(
      `INSERT OR IGNORE INTO notice_visitor_events (id, campaign_id, visitor, ip, user_id, is_member, member_email, kind, path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      'nve_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18),
      o.campaignId, o.visitor || '', o.info.ip || '', o.info.userId || '', o.info.isMember || 0,
      o.info.memberEmail || '', o.kind, String(o.path || '').slice(0, 200), new Date().toISOString(),
    ).run()
  } catch { /* ignore */ }
}

/** 이 방문자에게 보여줄 활성 방문자 캠페인.
 *  · 노출 기간(start_at~end_at) 안이면 계속 노출. 기간 미설정이면 생성 후 30일.
 *  · "N일 보지 않기" 스누즈 중이면 숨김(만료 후 기간 유지 중이면 재노출).
 *  · 기간이 설정된 캠페인은 X(읽음)으로 영구 숨기지 않음(기간 내 계속 노출). 기간 미설정은 읽으면 숨김. */
export async function getActiveVisitorCampaigns(
  db: D1Database, path: string, visitor: string, days = 30,
): Promise<any[]> {
  const now = new Date().toISOString()
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const rows = (await db.prepare(
    `SELECT id, title, body, image_url, video_url, cta_label, cta_url, scope_path, start_at, end_at, created_at
     FROM notice_campaigns
     WHERE target = 'visitors'
     ORDER BY created_at DESC LIMIT 60`,
  ).all()).results as any[] || []
  const p = String(path || '/')
  const matchPath = (sc: any) => {
    const s = String(sc || '').trim()
    if (!s) return true
    return p === s || p.startsWith(s)
  }
  const isActive = (c: any) => {
    const start = String(c.start_at || '')
    const end = String(c.end_at || '')
    if (start && now < start) return false
    if (end) return now <= end                 // 종료일 있으면 그때까지 활성
    return String(c.created_at || '') > since   // 종료일 없으면 생성 후 30일
  }
  // 스누즈 중(until > now)인 캠페인 제외
  let snoozeSet = new Set<string>()
  let readSet = new Set<string>()
  if (visitor) {
    try {
      const sn = (await db.prepare(`SELECT campaign_id FROM notice_snoozes WHERE visitor = ? AND until > ?`).bind(visitor, now).all()).results as any[] || []
      snoozeSet = new Set(sn.map((r) => r.campaign_id))
    } catch { /* ignore */ }
    try {
      const rd = (await db.prepare(`SELECT campaign_id FROM notice_visitor_events WHERE visitor = ? AND kind = 'read'`).bind(visitor).all()).results as any[] || []
      readSet = new Set(rd.map((r) => r.campaign_id))
    } catch { /* ignore */ }
  }
  return rows.filter((c) => {
    if (!matchPath(c.scope_path) || !isActive(c)) return false
    if (snoozeSet.has(c.id)) return false
    // 기간(종료일)이 설정된 캠페인은 읽어도 계속 노출, 기간 미설정은 읽으면 숨김
    if (!c.end_at && readSet.has(c.id)) return false
    return true
  })
}

/** 캠페인의 방문자 통계 (노출/읽음/전환 · 회원/비회원) */
export async function getVisitorStats(db: D1Database, campaignId: string) {
  const agg = (await db.prepare(
    `SELECT kind,
            COUNT(*) AS total,
            SUM(CASE WHEN is_member IN (1,2) THEN 1 ELSE 0 END) AS members,
            SUM(CASE WHEN is_member = 0 THEN 1 ELSE 0 END) AS guests
     FROM notice_visitor_events WHERE campaign_id = ? GROUP BY kind`,
  ).bind(campaignId).all()).results as any[] || []
  const byKind: Record<string, { total: number; members: number; guests: number }> = {}
  for (const a of agg) byKind[a.kind] = { total: Number(a.total) || 0, members: Number(a.members) || 0, guests: Number(a.guests) || 0 }
  const z = { total: 0, members: 0, guests: 0 }
  let snoozes = 0
  try {
    const s: any = await db.prepare(`SELECT COUNT(*) AS n FROM notice_snoozes WHERE campaign_id = ?`).bind(campaignId).first()
    snoozes = Number(s?.n || 0)
  } catch { /* ignore */ }
  return {
    views: byKind.view || z,
    reads: byKind.read || z,
    conversions: byKind.convert || z,
    snoozes,
  }
}
