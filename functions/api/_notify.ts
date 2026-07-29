// 알림 발송 기록 · 신청자/이벤트 자동 알림 (_ 프리픽스 = 라우팅 제외, import 전용)
//
// 왜 하나로 모으는가:
//  문자·알림톡·이메일이 각자 자기 테이블에만 기록해서, "이 회원에게 언제 무엇이 나갔는지"를
//  한 화면에서 볼 수 없었다. 특히 자동응답은 어디에도 남지 않아 "문자가 안 왔다" 는 문의가
//  오면 확인할 방법이 없었다. 나가는 모든 알림을 여기에 한 줄씩 남긴다.

export type NotifyKind = 'sms' | 'lms' | 'mms' | 'alimtalk' | 'email' | 'app'
/** 무엇이 이 발송을 일으켰나 — 화면의 "자동 발송 / 수동 발송 / 캠페인" 구분 */
export type NotifyTrigger = 'auto' | 'manual' | 'campaign' | 'system'

export const TRIGGER_LABEL: Record<NotifyTrigger, string> = {
  auto: '자동 발송',
  manual: '수동 발송',
  campaign: '캠페인',
  system: '시스템',
}
export const NOTIFY_KIND_LABEL: Record<string, string> = {
  sms: '문자(SMS)', lms: '문자(LMS)', mms: '문자(MMS)', alimtalk: '카카오 알림톡', email: '이메일', app: '앱 알림',
}

export async function ensureNotifySchema(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS notify_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,            -- 이 발송의 주인(회원). 시스템 발송이면 빈 값
        trigger TEXT,            -- auto | manual | campaign | system
        event TEXT,              -- lead(신청자) | campaign_sent | sender_approved ...
        kind TEXT,               -- sms | lms | mms | alimtalk | email | app
        recipient TEXT,          -- 수신 번호/이메일
        recipient_name TEXT,
        subject TEXT,
        content TEXT,
        ok INTEGER DEFAULT 0,
        reason TEXT,
        points INTEGER DEFAULT 0,
        landing_slug TEXT,
        landing_title TEXT,
        ref_id TEXT,             -- 신청 id · 집행 id · 규칙 id
        created_at TEXT NOT NULL
      )`,
    )
    .run()
    .catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_notify_log_time ON notify_log(created_at)').run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_notify_log_user ON notify_log(user_id, created_at)').run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_notify_log_trigger ON notify_log(trigger, created_at)').run().catch(() => {})
}

export interface NotifyRecord {
  userId?: string | number | null
  trigger: NotifyTrigger
  event?: string
  kind: NotifyKind | string
  recipient?: string
  recipientName?: string
  subject?: string
  content?: string
  ok?: boolean
  reason?: string
  points?: number
  landingSlug?: string
  landingTitle?: string
  refId?: string | number
}

const s = (v: any, max = 500) => {
  if (v === null || v === undefined) return ''
  const t = typeof v
  if (t === 'string') return v.slice(0, max)
  if (t === 'number' || t === 'boolean') return String(v).slice(0, max)
  return ''
}

/** 알림 한 건 기록. 기록 실패가 발송을 막지 않는다. */
export async function logNotify(db: D1Database, r: NotifyRecord): Promise<void> {
  try {
    await ensureNotifySchema(db)
    await db
      .prepare(
        `INSERT INTO notify_log (id, user_id, trigger, event, kind, recipient, recipient_name, subject, content,
           ok, reason, points, landing_slug, landing_title, ref_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        'nl_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18),
        s(r.userId, 64), s(r.trigger, 16) || 'system', s(r.event, 40), s(r.kind, 16),
        s(r.recipient, 120), s(r.recipientName, 60), s(r.subject, 200), s(r.content, 2000),
        r.ok ? 1 : 0, s(r.reason, 300), Math.max(0, Math.floor(Number(r.points) || 0)),
        s(r.landingSlug, 120), s(r.landingTitle, 200), s(r.refId, 64), new Date().toISOString(),
      )
      .run()
  } catch { /* 기록 실패는 무시 */ }
}

/** 여러 건 한 번에 (수신자 목록 발송) */
export async function logNotifyMany(db: D1Database, rows: NotifyRecord[]): Promise<void> {
  if (!rows?.length) return
  try {
    await ensureNotifySchema(db)
    const now = new Date().toISOString()
    for (let i = 0; i < rows.length; i += 40) {
      const chunk = rows.slice(i, i + 40)
      await db
        .batch(
          chunk.map((r) =>
            db
              .prepare(
                `INSERT INTO notify_log (id, user_id, trigger, event, kind, recipient, recipient_name, subject, content,
                   ok, reason, points, landing_slug, landing_title, ref_id, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              )
              .bind(
                'nl_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18),
                s(r.userId, 64), s(r.trigger, 16) || 'system', s(r.event, 40), s(r.kind, 16),
                s(r.recipient, 120), s(r.recipientName, 60), s(r.subject, 200), s(r.content, 2000),
                r.ok ? 1 : 0, s(r.reason, 300), Math.max(0, Math.floor(Number(r.points) || 0)),
                s(r.landingSlug, 120), s(r.landingTitle, 200), s(r.refId, 64), now,
              ),
          ),
        )
        .catch(() => {})
    }
  } catch { /* 무시 */ }
}
