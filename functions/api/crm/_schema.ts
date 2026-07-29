// CRM 마케팅 집행 스키마 (_ 프리픽스 = 라우팅 제외, import 전용)
//
// 집행(campaign) 하나 = "언제(집행일) · 어디로(랜딩페이지) · 누구에게(타깃 그룹) ·
//                        얼마 써서(광고비) · 무엇으로(문자/알림톡) 알렸는가" 한 묶음.
// 결과 페이지는 이 한 줄을 기준으로 발송 결과 · 랜딩 조회수 · 신청자 · 집행 금액을 모아 보여준다.

export async function ensureCrmSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS crm_executions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    run_date TEXT NOT NULL,           -- 집행일 (YYYY-MM-DD, KST 기준) — 캘린더에 놓이는 날
    landing_slug TEXT,                -- 우리 랜딩페이지 slug (결과 집계의 열쇠)
    landing_url TEXT,                 -- 외부 랜딩이면 전체 URL
    group_id TEXT,                    -- 타깃 그룹 (contact_groups.id)
    ad_budget INTEGER DEFAULT 0,      -- 광고 집행 금액(원) — 회원이 직접 입력
    channel TEXT DEFAULT 'sms',       -- sms | alimtalk
    template_code TEXT,               -- 알림톡 템플릿 코드
    sender_key TEXT,                  -- 알림톡 발신프로필
    sender_phone TEXT,                -- 문자 발신번호
    message TEXT,                     -- 발송 문구
    scheduled_at TEXT,                -- 예약 발송 시각(UTC ISO). 없으면 수동 발송
    status TEXT DEFAULT 'draft',      -- draft | scheduled | sending | sent | failed | canceled
    recipients INTEGER DEFAULT 0,     -- 발송 대상 수(발송 시점 확정)
    sent INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    msg_kind TEXT,                    -- 실제 청구 기준 (sms/lms/alimtalk)
    unit_points INTEGER DEFAULT 0,    -- 건당 청구 포인트(발송 시점 단가 고정)
    points_used INTEGER DEFAULT 0,    -- 실제 나간 포인트(환불 반영 후)
    sent_at TEXT,
    error TEXT,
    memo TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_crm_user_date ON crm_executions(user_id, run_date)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_crm_sched ON crm_executions(status, scheduled_at)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_crm_slug ON crm_executions(landing_slug)`).run().catch(() => {})

  // 수신자 단위 발송 결과 — 누가 받았고 누가 실패했는지 결과 화면에서 그대로 보여준다
  await db.prepare(`CREATE TABLE IF NOT EXISTS crm_execution_sends (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    ok INTEGER DEFAULT 0,
    reason TEXT,
    created_at TEXT NOT NULL
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_crms_camp ON crm_execution_sends(campaign_id)`).run().catch(() => {})

  // 나중에 추가된 컬럼 보강 (CREATE TABLE IF NOT EXISTS 는 이미 있는 표에 영향이 없다)
  for (const col of [
    'landing_url TEXT', 'template_code TEXT', 'sender_key TEXT', 'sender_phone TEXT',
    'msg_kind TEXT', 'unit_points INTEGER DEFAULT 0', 'points_used INTEGER DEFAULT 0',
    'sent_at TEXT', 'error TEXT', 'memo TEXT', 'updated_at TEXT',
  ]) {
    await db.prepare(`ALTER TABLE crm_executions ADD COLUMN ${col}`).run().catch(() => {})
  }
}

/** 이 집행이 내 것인가 (관리자는 전부 허용) */
export async function ownsCampaign(db: D1Database, me: any, id: string): Promise<boolean> {
  if (!me || !id) return false
  if (me.role === 'admin' || me.role === 'superadmin') return true
  const r = await db.prepare('SELECT 1 AS ok FROM crm_executions WHERE id = ? AND user_id = ?')
    .bind(id, me.id).first().catch(() => null)
  return !!r
}

export const CHANNELS = ['sms', 'alimtalk'] as const
export type Channel = (typeof CHANNELS)[number]

export const STATUS_LABEL: Record<string, string> = {
  draft: '작성중',
  scheduled: '발송 예약',
  sending: '발송중',
  sent: '발송 완료',
  failed: '발송 실패',
  canceled: '취소',
}
