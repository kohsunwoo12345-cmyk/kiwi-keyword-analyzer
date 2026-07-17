// Cloudflare Pages Functions 공용 유틸 (_ 프리픽스 = 라우팅 제외, import 전용)

export const ADMIN_EMAIL = 'kohsunwoo12345@gmail.com'
export const SESSION_COOKIE = 'bg_session'
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30 // 30일

export interface Env {
  DB: D1Database
  BUCKET?: R2Bucket
  ADMIN_PASSWORD?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REDIRECT_URI?: string
  // 알리고(Aligo) 문자·알림톡
  ALIGO_API_KEY?: string
  ALIGO_ID_KEY?: string
  ALIGO_USER_ID?: string
  ALIGO_SENDER?: string
  ALIGO_SENDER_KEY?: string
  ALIGO_TEMPLATE_CODE?: string
  ALIGO_PROXY_URL?: string
  ALIGO_PROXY_TOKEN?: string
}

/** 관리자 마스터 비밀번호 (환경변수 ADMIN_PASSWORD, 없으면 빈 값 → 특수 로그인 비활성). 코드에 하드코딩하지 않음. */
export function adminPassword(env: Env): string {
  return (env && env.ADMIN_PASSWORD) || ''
}

// Pages가 자동 주입하거나 D1이 아닌 바인딩 (오탐 방지용 제외 목록)
const EXCLUDE = new Set(['ASSETS', 'ADMIN_PASSWORD'])

// D1Database는 prepare/batch/exec/dump 를 갖고, Fetcher(ASSETS/service)처럼 fetch/connect 는 없다.
function isLikelyD1(v: any): boolean {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.prepare === 'function' &&
    typeof v.batch === 'function' &&
    typeof v.dump === 'function' &&
    typeof (v as any).fetch !== 'function' &&
    typeof (v as any).connect !== 'function'
  )
}

// R2Bucket은 get/put/list/head/delete 를 갖고, fetch/prepare 는 없다.
function isLikelyR2(v: any): boolean {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.get === 'function' &&
    typeof v.put === 'function' &&
    typeof v.list === 'function' &&
    typeof v.head === 'function' &&
    typeof (v as any).prepare !== 'function' &&
    typeof (v as any).fetch !== 'function'
  )
}

/** 바인딩 변수명이 무엇이든 D1 데이터베이스를 자동 탐지 (ASSETS 등 오탐 제외) */
export function resolveDB(env: any): D1Database | null {
  if (!env) return null
  const preferred = ['DB', 'D1', 'd1', 'DATABASE', 'db', 'BYGENCY_DB', 'bygency_db', 'DB1', 'database', 'MAIN_DB']
  for (const n of preferred) {
    if (!EXCLUDE.has(n) && isLikelyD1(env[n])) return env[n]
  }
  for (const k of Object.keys(env)) {
    if (EXCLUDE.has(k)) continue
    if (isLikelyD1((env as any)[k])) return (env as any)[k]
  }
  return null
}

/** 바인딩 변수명이 무엇이든 R2 버킷을 자동 탐지 (ASSETS 등 오탐 제외) */
export function resolveBucket(env: any): R2Bucket | null {
  if (!env) return null
  const preferred = ['BUCKET', 'R2', 'r2', 'R2_BUCKET', 'bucket', 'STORAGE']
  for (const n of preferred) {
    if (!EXCLUDE.has(n) && isLikelyR2(env[n])) return env[n]
  }
  for (const k of Object.keys(env)) {
    if (EXCLUDE.has(k)) continue
    if (isLikelyR2((env as any)[k])) return (env as any)[k]
  }
  return null
}

/** 진단용: env에 존재하는 바인딩 키 목록 */
export function bindingKeys(env: any): string[] {
  if (!env) return []
  return Object.keys(env).filter((k) => {
    const v = (env as any)[k]
    return v && typeof v === 'object'
  })
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

/** 스키마 자동 부트스트랩 (users/sessions/transactions/activity_log/notifications) */
export async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      plan TEXT DEFAULT '없음',
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      points INTEGER DEFAULT 0,
      credits INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_active TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`),
    // 거래(포인트·크레딧·구매) 내역
    db.prepare(`CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,        -- point | credit | purchase
      amount INTEGER NOT NULL,   -- 양수=지급/충전, 음수=차감
      balance_after INTEGER,
      memo TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at)`),
    // 활동 로그
    db.prepare(`CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,        -- login | password | plan | point | credit | notify | signup | page
      detail TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_act_user ON activity_log(user_id, created_at)`),
    // 알림 (사용자 대시보드)
    db.prepare(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      body TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_noti_user ON notifications(user_id, created_at)`),
    // 보안: 차단 IP
    db.prepare(`CREATE TABLE IF NOT EXISTS blocked_ips (
      ip TEXT PRIMARY KEY,
      reason TEXT,
      source TEXT,               -- manual | auto
      created_at TEXT NOT NULL
    )`),
    // 보안: 접근/위협 로그
    db.prepare(`CREATE TABLE IF NOT EXISTS security_log (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      ip TEXT,
      method TEXT,
      path TEXT,
      status INTEGER,
      severity TEXT,             -- info | warn | high
      detail TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_seclog_ts ON security_log(ts)`),
    // 승인: 플랜 변경 요청
    db.prepare(`CREATE TABLE IF NOT EXISTS plan_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      from_plan TEXT,
      to_plan TEXT NOT NULL,
      status TEXT DEFAULT 'pending',  -- pending | approved | rejected
      memo TEXT,
      created_at TEXT NOT NULL,
      decided_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_planreq_status ON plan_requests(status, created_at)`),
    // 승인: 발신번호 등록 요청
    db.prepare(`CREATE TABLE IF NOT EXISTS sender_numbers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      label TEXT,
      status TEXT DEFAULT 'pending',  -- pending | approved | rejected
      created_at TEXT NOT NULL,
      decided_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sender_status ON sender_numbers(status, created_at)`),
    // 승인: 포인트 지급 요청
    db.prepare(`CREATE TABLE IF NOT EXISTS point_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      memo TEXT,
      status TEXT DEFAULT 'pending',  -- pending | approved | rejected
      created_at TEXT NOT NULL,
      decided_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_pointreq_status ON point_requests(status, created_at)`),
    // 승인: 크레딧 충전 요청
    db.prepare(`CREATE TABLE IF NOT EXISTS credit_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      price INTEGER DEFAULT 0,
      memo TEXT,
      status TEXT DEFAULT 'pending',  -- pending | approved | rejected
      created_at TEXT NOT NULL,
      decided_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_creditreq_status ON credit_requests(status, created_at)`),
    // 결제: Toss 크레딧 자동충전 주문
    db.prepare(`CREATE TABLE IF NOT EXISTS credit_orders (
      order_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credits INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',  -- pending | paid | failed
      payment_key TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_order_user ON credit_orders(user_id, created_at)`),
    // 보안: 허용 IP 화이트리스트
    db.prepare(`CREATE TABLE IF NOT EXISTS ip_whitelist (
      ip TEXT PRIMARY KEY,
      label TEXT,
      created_at TEXT NOT NULL
    )`),
    // 보안: 전역 설정 (key/value) — whitelist_mode 등
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`),
    // 보안: 로그인 실패 (브루트포스 감지)
    db.prepare(`CREATE TABLE IF NOT EXISTS login_failures (
      id TEXT PRIMARY KEY,
      email TEXT,
      ip TEXT,
      ua TEXT,
      country TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_loginfail ON login_failures(ip, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_loginfail_email ON login_failures(email, created_at)`),
    // 보안: 관리자 감사 로그 (Audit Trail)
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      admin_email TEXT,
      action TEXT,
      target TEXT,
      detail TEXT,
      severity TEXT DEFAULT 'info',
      ip TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(created_at)`),
    // 보안: 데이터 내보내기 감사 (Export Audit)
    db.prepare(`CREATE TABLE IF NOT EXISTS export_audit (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      admin_email TEXT,
      filename TEXT,
      kind TEXT,
      rows INTEGER,
      bytes INTEGER,
      ip TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_export_ts ON export_audit(created_at)`),
    // 보안: 콘텐츠 신고
    db.prepare(`CREATE TABLE IF NOT EXISTS content_reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT,
      reporter_email TEXT,
      target_type TEXT,
      target_id TEXT,
      target_desc TEXT,
      reason TEXT,
      status TEXT DEFAULT 'open',   -- open | hidden | ignored | restored
      created_at TEXT NOT NULL,
      decided_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_report_status ON content_reports(status, created_at)`),
    // 보안: 앱(PWA) 설치 & 푸시 구독
    db.prepare(`CREATE TABLE IF NOT EXISTS app_installs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      endpoint TEXT,
      platform TEXT,
      allowed INTEGER DEFAULT 0,    -- 푸시 허용 여부
      ip TEXT,
      country TEXT,
      city TEXT,
      ua TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_install_ts ON app_installs(created_at)`),
    // 공개: 문의하기 메시지
    db.prepare(`CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      message TEXT,
      ip TEXT,
      status TEXT DEFAULT 'new',   -- new | read | done
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_contact_ts ON contact_messages(created_at)`),
    // 공개: 랜딩 DB 수집 리드 (기능 데모)
    db.prepare(`CREATE TABLE IF NOT EXISTS public_leads (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      source TEXT,
      ip TEXT,
      country TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_lead_ts ON public_leads(created_at)`),
    // 접속 통계: 방문 로그
    db.prepare(`CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      path TEXT,
      ref TEXT,
      ip TEXT,
      country TEXT,
      city TEXT,
      ua TEXT,
      device TEXT,
      visitor TEXT,          -- 익명 방문자 식별(쿠키/로컬 기반)
      user_id TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_visit_ts ON visits(created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_visit_path ON visits(path)`),
    // 랜딩페이지 제작: 사용자가 만든 랜딩(퍼널) 페이지
    db.prepare(`CREATE TABLE IF NOT EXISTS landing_pages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      title TEXT,
      headline TEXT,
      subtext TEXT,
      cta TEXT,
      theme TEXT,
      fields TEXT,            -- JSON: 수집 필드 목록
      published INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      leads INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_landing_user ON landing_pages(user_id, created_at)`),
    // 고객센터 채팅
    db.prepare(`CREATE TABLE IF NOT EXISTS support_chats (
      id TEXT PRIMARY KEY,
      conv_id TEXT NOT NULL,       -- 대화 식별(로그인=user_id, 게스트=guest uuid)
      user_id TEXT DEFAULT '',
      name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      sender TEXT NOT NULL,        -- 'user' | 'admin'
      text TEXT NOT NULL,
      read_admin INTEGER DEFAULT 0,-- 관리자가 읽었는지(사용자 메시지 기준)
      read_user INTEGER DEFAULT 0, -- 사용자가 읽었는지(관리자 답장 기준)
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_support_conv ON support_chats(conv_id, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_support_time ON support_chats(created_at)`),
    // 친구 관계 (추천/친구추가)
    db.prepare(`CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,       -- 소유자
      friend_id TEXT NOT NULL,     -- 친구
      via TEXT DEFAULT 'code',     -- 'code'(추천인) | 'add'(직접 추가)
      created_at TEXT NOT NULL,
      UNIQUE(user_id, friend_id)
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_friend_user ON friendships(user_id)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS referral_rewards (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,      -- 추천인(보상 수령)
      friend_id TEXT NOT NULL UNIQUE, -- 피추천인(가입한 친구) — 1인 1회만
      track TEXT,                     -- marketer | video
      plan TEXT,                      -- Plus | Pro | Max
      price_krw INTEGER,              -- 결제 요금제 가격
      reward_credits REAL,            -- 지급된 크레딧(결제액의 1% 가치)
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_reward_referrer ON referral_rewards(referrer_id)`),
    // 지사(파트너) — 추천인을 지사에 배정하고, 지사별 순수익 지급률로 정산
    db.prepare(`CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT,               -- 지사 대표 계정(이 계정의 추천코드로 들어온 결제가 수익원)
      percent REAL DEFAULT 0,      -- 순수익 대비 지사 지급률(%)
      cost_rate REAL DEFAULT 0,    -- 원가/비용율(%) — 순수익 = 결제액 × (1 - cost_rate/100) - 추천리워드
      memo TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    // 지사 정산 지급 기록(정산 완료 내역)
    db.prepare(`CREATE TABLE IF NOT EXISTS branch_settlements (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      amount_krw INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_bset_branch ON branch_settlements(branch_id)`),
    // 회원별·모델별 AI 과금 배수 override (없으면 전역 model_markups → 기본값)
    db.prepare(`CREATE TABLE IF NOT EXISTS user_model_markups (
      user_id TEXT NOT NULL,
      model TEXT NOT NULL,
      multiplier REAL NOT NULL,
      PRIMARY KEY (user_id, model)
    )`),
    // 관리자 로그인 허용 기기/IP (보안 잠금 ON 시 등록된 IP 또는 기기에서만 관리자 로그인 허용)
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_devices (
      id TEXT PRIMARY KEY,
      label TEXT DEFAULT '',
      device TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`),
  ])
  // 기존 테이블에 신규 컬럼 보강 (누락된 것만 추가)
  await addMissingColumns(db, 'users', {
    phone: 'phone TEXT',
    points: 'points INTEGER DEFAULT 0',
    credits: 'credits INTEGER DEFAULT 0',
    video_plan: "video_plan TEXT DEFAULT '없음'",
    referral_code: 'referral_code TEXT',
    referred_by: 'referred_by TEXT',
    marketing_consent: 'marketing_consent INTEGER DEFAULT 0',
    ai_consent: 'ai_consent INTEGER DEFAULT 0',
    tos_consent: 'tos_consent INTEGER DEFAULT 0',       // 서비스 이용약관 동의(필수)
    privacy_consent: 'privacy_consent INTEGER DEFAULT 0', // 개인정보처리방침 동의(필수)
    consent_at: 'consent_at TEXT',
    password_set: 'password_set INTEGER DEFAULT 0',     // 비밀번호 직접 설정 여부(간편로그인 구분용)
    country: 'country TEXT',
    postal_code: 'postal_code TEXT',
    address1: 'address1 TEXT',
    address2: 'address2 TEXT',
    address_at: 'address_at TEXT',
    provider: "provider TEXT DEFAULT 'email'",
    credit_markup: 'credit_markup REAL', // 회원별 AI 과금 배수(원가=1). NULL/0 = 모델 기본(2.5/3.0)
    branch_id: 'branch_id TEXT', // 추천인이 소속된 지사(정산 대상)
    mcp_token: 'mcp_token TEXT', // 회원별 개인 MCP 연결 토큰(본인 계정으로 크레딧 차감)
    ref_surcharge: 'ref_surcharge REAL', // 레퍼런스 이미지 1장 추가당 크레딧 가산율(%). NULL=전역 기본값
    account_type: 'account_type TEXT', // team | individual (가입 시 선택)
    products: 'products TEXT',          // video | marketing | both (사용할 제품 선택)
  })
  await addMissingColumns(db, 'plan_requests', {
    track: "track TEXT DEFAULT 'marketer'",
  })
  await addMissingColumns(db, 'branches', {
    owner_id: 'owner_id TEXT', // 지사 대표 계정
  })
  await addMissingColumns(db, 'sessions', {
    ip: 'ip TEXT',
    ua: 'ua TEXT',
    country: 'country TEXT',
  })
  await addMissingColumns(db, 'blocked_ips', {
    country: 'country TEXT',
    city: 'city TEXT',
  })
  await addMissingColumns(db, 'security_log', {
    country: 'country TEXT',
    city: 'city TEXT',
    ua: 'ua TEXT',
  })
  await addMissingColumns(db, 'public_leads', {
    landing_id: 'landing_id TEXT',
  })
  await addMissingColumns(db, 'visits', {
    region: 'region TEXT', // 시/도 (더 정확한 위치)
  })
}

async function addMissingColumns(db: D1Database, table: string, need: Record<string, string>) {
  try {
    const info = await db.prepare(`PRAGMA table_info(${table})`).all()
    const cols = new Set((info.results || []).map((r: any) => r.name))
    for (const [name, ddl] of Object.entries(need)) {
      if (!cols.has(name)) {
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${ddl}`).run().catch(() => {})
      }
    }
  } catch {
    /* ignore */
  }
}

/** 활동 로그 기록 */
export async function logActivity(db: D1Database, userId: string, type: string, detail = '') {
  try {
    await db
      .prepare(`INSERT INTO activity_log (id, user_id, type, detail, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind('a_' + crypto.randomUUID().slice(0, 16), userId, type, detail, new Date().toISOString())
      .run()
  } catch {
    /* ignore */
  }
}

/** 포인트/크레딧 지급·차감 + 거래내역 + 로그 (kind: point|credit|purchase) */
export async function applyBalance(
  db: D1Database,
  userId: string,
  kind: 'point' | 'credit' | 'purchase',
  amount: number,
  memo = '',
) {
  const col = kind === 'credit' ? 'credits' : 'points' // purchase 는 포인트 사용으로 기록
  const row: any = await db.prepare(`SELECT ${col} AS bal FROM users WHERE id = ?`).bind(userId).first()
  if (!row) return { ok: false, error: '사용자를 찾을 수 없습니다.' }
  // 크레딧은 소수 2자리까지 지원 (0.05 등), 포인트는 정수
  const balanceAfter = Math.round(((Number(row.bal) || 0) + Number(amount)) * 100) / 100
  await db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).bind(balanceAfter, userId).run()
  await db
    .prepare(`INSERT INTO transactions (id, user_id, kind, amount, balance_after, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind('t_' + crypto.randomUUID().slice(0, 16), userId, kind, amount, balanceAfter, memo, new Date().toISOString())
    .run()
  await logActivity(db, userId, kind, `${amount > 0 ? '+' : ''}${amount} ${kind}${memo ? ' · ' + memo : ''}`)
  return { ok: true, balanceAfter }
}

/** 크레딧 차감 (잔액 부족 시 실패). 성공 시 거래내역·활동로그 기록 */
export async function spendCredits(db: D1Database, userId: string, amount: number, feature: string, memo = '') {
  // 소수 크레딧 지원 (2자리). 예: 0.05 크레딧 차감
  const amt = Math.round(Math.abs(Number(amount) || 0) * 100) / 100
  if (amt <= 0) return { ok: false as const, error: '차감할 크레딧 수량이 올바르지 않습니다.' }
  const row: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(userId).first()
  if (!row) return { ok: false as const, error: '사용자를 찾을 수 없습니다.' }
  const balance = Number(row.credits) || 0
  if (balance < amt) return { ok: false as const, error: '크레딧이 부족합니다.', balance, need: amt }
  const balanceAfter = Math.round((balance - amt) * 100) / 100
  await db.prepare('UPDATE users SET credits = ? WHERE id = ?').bind(balanceAfter, userId).run()
  await db
    .prepare(`INSERT INTO transactions (id, user_id, kind, amount, balance_after, memo, created_at) VALUES (?, ?, 'credit', ?, ?, ?, ?)`)
    .bind('t_' + crypto.randomUUID().slice(0, 16), userId, -amt, balanceAfter, memo || feature, new Date().toISOString())
    .run()
  await logActivity(db, userId, 'credit', `-${amt} 크레딧 · ${feature}`)
  return { ok: true as const, balanceAfter }
}

/** 알림 생성 */
export async function addNotification(db: D1Database, userId: string, title: string, body: string) {
  await db
    .prepare(`INSERT INTO notifications (id, user_id, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)`)
    .bind('n_' + crypto.randomUUID().slice(0, 16), userId, title, body, new Date().toISOString())
    .run()
}

/* ───────── 추천 리워드 ───────── */
// 크레딧 1개 = 50원 (studio/_pricing.ts CREDIT_KRW 와 동일)
export const CREDIT_KRW = 50
// 요금제 가격(월, 원) — 마케터/영상 트랙
export const PLAN_PRICE_KRW: Record<string, Record<string, number>> = {
  marketer: { Plus: 29000, Pro: 89000, Max: 249000 },
  video: { Plus: 49000, Pro: 149000, Max: 390000 },
}
export function planPriceKrw(track: string, plan: string): number {
  return PLAN_PRICE_KRW[track === 'video' ? 'video' : 'marketer']?.[plan] || 0
}

/**
 * 피추천인(친구)이 유료 요금제에 처음 가입했을 때 추천인에게 결제액의 1%를 크레딧으로 지급.
 * referral_rewards 테이블의 friend_id UNIQUE 로 1인 1회만 지급.
 */
export async function rewardReferralFirstPaid(db: D1Database, friendId: string, track: string, plan: string): Promise<void> {
  try {
    if (!plan || plan === '없음') return
    const friend: any = await db.prepare('SELECT id, name, referred_by FROM users WHERE id = ?').bind(friendId).first()
    if (!friend || !friend.referred_by) return
    // 이미 이 친구에 대해 지급된 적이 있으면 종료(첫 가입 1회만)
    const existing = await db.prepare('SELECT id FROM referral_rewards WHERE friend_id = ?').bind(friendId).first()
    if (existing) return
    const price = planPriceKrw(track, plan)
    if (!price) return
    const rewardCredits = Math.round((price * 0.01 / CREDIT_KRW) * 100) / 100 // 결제액의 1% 가치를 크레딧으로
    if (rewardCredits <= 0) return
    // 지급 기록 선점(경합 시 중복 방지) — UNIQUE 위반이면 이미 지급된 것
    const insert = await db
      .prepare(`INSERT OR IGNORE INTO referral_rewards (id, referrer_id, friend_id, track, plan, price_krw, reward_credits, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind('rr_' + crypto.randomUUID().slice(0, 14), friend.referred_by, friendId, track === 'video' ? 'video' : 'marketer', plan, price, rewardCredits, new Date().toISOString())
      .run()
    if (!insert.meta || insert.meta.changes === 0) return // 이미 존재 → 중복 지급 방지
    const trackLabel = track === 'video' ? 'AI 영상' : '마케터'
    await applyBalance(db, friend.referred_by, 'credit', rewardCredits, `추천 리워드 · ${friend.name || '친구'}님 ${trackLabel} ${plan} 가입 (결제액의 1%)`)
    await addNotification(
      db,
      friend.referred_by,
      '추천 리워드 크레딧 지급 🎉',
      `추천하신 ${friend.name || '친구'}님이 ${trackLabel} ${plan} 요금제에 가입하여 결제액의 1%인 ${rewardCredits} 크레딧을 지급했어요. 감사합니다!`,
    ).catch(() => {})
    await logActivity(db, friend.referred_by, 'referral', `추천 리워드 +${rewardCredits} 크레딧 (${friend.name || '친구'} ${plan})`).catch(() => {})
  } catch {
    /* 리워드 실패는 본 흐름을 막지 않음 */
  }
}

/* ───────── 보안 ───────── */
export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'unknown'
  )
}

export async function isBlocked(db: D1Database, ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  const row = await db.prepare('SELECT ip FROM blocked_ips WHERE ip = ?').bind(ip).first()
  return !!row
}

export async function logSecurity(
  db: D1Database,
  o: { ip: string; method?: string; path?: string; status?: number; severity?: string; detail?: string; country?: string; city?: string; ua?: string },
) {
  try {
    await db
      .prepare(`INSERT INTO security_log (id, ts, ip, method, path, status, severity, detail, country, city, ua) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        's_' + crypto.randomUUID().slice(0, 16),
        new Date().toISOString(),
        o.ip || 'unknown',
        o.method || '',
        o.path || '',
        o.status || 0,
        o.severity || 'info',
        o.detail || '',
        o.country || '',
        o.city || '',
        o.ua || '',
      )
      .run()
    // 로그 상한 유지 (최근 2000건)
    await db
      .prepare(`DELETE FROM security_log WHERE id NOT IN (SELECT id FROM security_log ORDER BY ts DESC LIMIT 2000)`)
      .run()
      .catch(() => {})
  } catch {
    /* ignore */
  }
}

/** Cloudflare 지오 정보 (country/city/isp/asn) 추출 */
export function geoFrom(request: Request): { country: string; city: string; region: string; isp: string; asn: string } {
  const cf: any = (request as any).cf || {}
  return {
    country: cf.country || request.headers.get('CF-IPCountry') || '',
    city: cf.city || '',
    region: cf.region || cf.regionCode || '', // 시/도 (예: Seoul)
    isp: cf.asOrganization || '',
    asn: cf.asn ? String(cf.asn) : '',
  }
}

/** User-Agent → 안정적인 기기 서명(OS · 브라우저). 관리자 로그인 기기 제한 매칭용. */
export function deviceSig(ua: string): string {
  const s = String(ua || '')
  let os = '기타'
  if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS'
  else if (/Android/i.test(s)) os = 'Android'
  else if (/Windows/i.test(s)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(s)) os = 'Mac'
  else if (/Linux/i.test(s)) os = 'Linux'
  let br = '기타'
  if (/Edg\//i.test(s)) br = 'Edge'
  else if (/OPR\/|Opera/i.test(s)) br = 'Opera'
  else if (/SamsungBrowser/i.test(s)) br = 'Samsung'
  else if (/Whale/i.test(s)) br = 'Whale'
  else if (/Chrome\//i.test(s)) br = 'Chrome'
  else if (/Firefox\//i.test(s)) br = 'Firefox'
  else if (/Safari/i.test(s)) br = 'Safari'
  return `${os} · ${br}`
}

/* ── 전역 설정 (key/value) ── */
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  try {
    const row: any = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first()
    return row ? row.value : null
  } catch {
    return null
  }
}
export async function setSetting(db: D1Database, key: string, value: string) {
  await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, value).run()
}

/* ── IP 화이트리스트 ── */
export async function isWhitelistMode(db: D1Database): Promise<boolean> {
  return (await getSetting(db, 'whitelist_mode')) === 'on'
}
export async function isWhitelisted(db: D1Database, ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  const row = await db.prepare('SELECT ip FROM ip_whitelist WHERE ip = ?').bind(ip).first()
  return !!row
}

/* ── 로그인 실패 (브루트포스) ── */
export async function recordLoginFailure(db: D1Database, email: string, ip: string, ua: string, country = '') {
  try {
    await db
      .prepare('INSERT INTO login_failures (id, email, ip, ua, country, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('lf_' + crypto.randomUUID().slice(0, 16), email, ip, ua, country, new Date().toISOString())
      .run()
    await db
      .prepare('DELETE FROM login_failures WHERE id NOT IN (SELECT id FROM login_failures ORDER BY created_at DESC LIMIT 3000)')
      .run()
      .catch(() => {})
  } catch {
    /* ignore */
  }
}
/** 최근 windowMin 분 내 해당 IP의 로그인 실패 횟수 */
export async function countRecentLoginFailures(db: D1Database, ip: string, windowMin = 15): Promise<number> {
  try {
    const since = new Date(Date.now() - windowMin * 60000).toISOString()
    const row: any = await db.prepare('SELECT COUNT(*) AS n FROM login_failures WHERE ip = ? AND created_at > ?').bind(ip, since).first()
    return row?.n || 0
  } catch {
    return 0
  }
}

/* ── 관리자 감사 로그 ── */
export async function logAudit(
  db: D1Database,
  admin: { id?: string; email?: string },
  action: string,
  target = '',
  detail = '',
  severity = 'info',
  ip = '',
) {
  try {
    await db
      .prepare('INSERT INTO audit_log (id, admin_id, admin_email, action, target, detail, severity, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('au_' + crypto.randomUUID().slice(0, 16), admin.id || '', admin.email || '', action, target, detail, severity, ip, new Date().toISOString())
      .run()
    await db.prepare('DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY created_at DESC LIMIT 3000)').run().catch(() => {})
  } catch {
    /* ignore */
  }
}

/* ── 데이터 내보내기 감사 ── */
export async function logExport(
  db: D1Database,
  admin: { id?: string; email?: string },
  o: { filename: string; kind: string; rows: number; bytes: number; ip?: string },
) {
  try {
    await db
      .prepare('INSERT INTO export_audit (id, admin_id, admin_email, filename, kind, rows, bytes, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('ex_' + crypto.randomUUID().slice(0, 16), admin.id || '', admin.email || '', o.filename, o.kind, o.rows || 0, o.bytes || 0, o.ip || '', new Date().toISOString())
      .run()
  } catch {
    /* ignore */
  }
}

/** 관리자 세션 가드 (공용) */
export async function requireAdminUser(request: Request, db: D1Database) {
  const me: any = await getSessionUser(request, db)
  if (!me) return { error: json({ ok: false, error: '로그인이 필요합니다.' }, 401) }
  if (me.email !== ADMIN_EMAIL && me.role !== 'admin')
    return { error: json({ ok: false, error: '관리자 권한이 필요합니다.' }, 403) }
  return { me }
}

const enc = new TextEncoder()

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || crypto.randomUUID().replace(/-/g, '')
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(s), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)))
  return `${s}:${hash}`
}

// 타이밍 공격 방지용 상수 시간 문자열 비교
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(':')
  if (!salt) return false
  const check = await hashPassword(password, salt)
  return timingSafeEqual(check, stored)
}

export function parseCookies(request: Request): Record<string, string> {
  const out: Record<string, string> = {}
  const raw = request.headers.get('Cookie') || ''
  raw.split(';').forEach((p) => {
    const i = p.indexOf('=')
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim())
  })
  return out
}

export function sessionCookie(token: string, maxAge = SESSION_TTL_SEC): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${maxAge}`
}

export function clearCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0`
}

export interface UserRow {
  id: string
  name: string
  email: string
  company: string | null
  plan: string
  role: string
  status: string
  created_at: string
  last_active: string | null
}

export function publicUser(u: any) {
  if (!u) return null
  const isAdmin = u.email === ADMIN_EMAIL || u.role === 'admin'
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company || '',
    phone: u.phone || '',
    plan: isAdmin ? (u.plan && u.plan !== '없음' ? u.plan : 'Max') : (u.plan || '없음'),
    videoPlan: isAdmin ? (u.video_plan && u.video_plan !== '없음' ? u.video_plan : 'Max') : (u.video_plan || '없음'),
    role: isAdmin ? 'admin' : 'user',
    status: u.status || 'active',
    points: u.points || 0,
    credits: Math.round((Number(u.credits) || 0) * 100) / 100,
    creditMarkup: Number(u.credit_markup) || 0, // 0 = 모델 기본 배수 사용
    referralCode: u.referral_code || '',
    referredBy: u.referred_by || '',
    provider: u.provider || 'email',
    passwordSet: Number(u.password_set) ? 1 : 0,
    // 동의 내역 (가입 시 수집)
    tosConsent: Number(u.tos_consent) ? 1 : 0,
    privacyConsent: Number(u.privacy_consent) ? 1 : 0,
    marketingConsent: Number(u.marketing_consent) ? 1 : 0,
    aiConsent: Number(u.ai_consent) ? 1 : 0,
    consentAt: u.consent_at || '',
    country: u.country || '',
    postalCode: u.postal_code || '',
    address1: u.address1 || '',
    address2: u.address2 || '',
    // 관리자는 면제. 그 외에는 국가·회사이름·전화번호·기본주소가 모두 있어야 완료 (우편번호는 선택)
    addressComplete: isAdmin || !!(u.country && u.company && u.phone && u.address1),
    // 온보딩 선택 (팀/개인 · 사용할 제품)
    accountType: u.account_type || '',              // team | individual
    products: u.products || (isAdmin ? 'both' : ''), // video | marketing | both
    // 유료 플랜 보유 여부(승인된 플랜). 없으면 마케팅·영상 모두 사용 불가
    hasPlan: isAdmin || (u.plan && u.plan !== '없음') || (u.video_plan && u.video_plan !== '없음') ? 1 : 0,
    createdAt: u.created_at,
    lastActive: u.last_active,
  }
}

/** 추천인 코드 생성 (BG + 6자, 혼동 문자 제외) */
export function genRefCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  const arr = crypto.getRandomValues(new Uint8Array(6))
  for (let i = 0; i < 6; i++) s += alphabet[arr[i] % alphabet.length]
  return 'BG' + s
}

/** 사용자에게 추천인 코드가 없으면 생성해 저장하고 코드를 반환 */
export async function ensureReferralCode(db: D1Database, userId: string): Promise<string> {
  const row: any = await db.prepare('SELECT referral_code FROM users WHERE id = ?').bind(userId).first()
  if (row?.referral_code) return row.referral_code
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genRefCode()
    const clash = await db.prepare('SELECT id FROM users WHERE referral_code = ?').bind(code).first()
    if (!clash) {
      await db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').bind(code, userId).run()
      return code
    }
  }
  return ''
}

/** 세션 쿠키로 현재 사용자 조회 */
export async function getSessionUser(request: Request, db: D1Database) {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (!token) return null
  const row = await db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .bind(token, new Date().toISOString())
    .first()
  return row || null
}

/** MCP 개인 토큰으로 사용자 조회 (본인 계정 기준 크레딧 차감용). 없으면 null. */
export async function getUserByMcpToken(db: D1Database, token: string | null) {
  if (!token || token.length < 12) return null
  const row = await db.prepare('SELECT * FROM users WHERE mcp_token = ? LIMIT 1').bind(token).first()
  return row || null
}

/** 회원의 MCP 토큰을 반환(없으면 새로 발급). regenerate=true면 무조건 재발급. */
export async function ensureMcpToken(db: D1Database, userId: string, regenerate = false): Promise<string> {
  if (!regenerate) {
    const cur: any = await db.prepare('SELECT mcp_token FROM users WHERE id = ?').bind(userId).first()
    if (cur && cur.mcp_token) return cur.mcp_token as string
  }
  const tok = 'bgm_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  await db.prepare('UPDATE users SET mcp_token = ? WHERE id = ?').bind(tok, userId).run()
  return tok
}

/** 관리자 계정이 없고 ADMIN_PASSWORD 환경변수가 설정된 경우에만 생성 (하드코딩 비밀번호 없음) */
export async function seedAdmin(db: D1Database, env: Env) {
  const pw = adminPassword(env)
  if (!pw) return
  const row = await db.prepare('SELECT id FROM users WHERE email = ?').bind(ADMIN_EMAIL).first()
  if (row) return
  const now = new Date().toISOString()
  const ph = await hashPassword(pw)
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, name, email, password_hash, company, plan, role, status, created_at, last_active)
       VALUES ('admin_root', '관리자', ?, ?, '(주)Next Vision Company', 'Business', 'admin', 'active', ?, ?)`,
    )
    .bind(ADMIN_EMAIL, ph, now, now)
    .run()
}

export async function createSession(
  db: D1Database,
  userId: string,
  meta?: { ip?: string; ua?: string; country?: string },
): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  const nowIso = new Date().toISOString()
  const exp = new Date(Date.now() + SESSION_TTL_SEC * 1000).toISOString()
  await db
    .prepare(`INSERT INTO sessions (token, user_id, created_at, expires_at, ip, ua, country) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(token, userId, nowIso, exp, meta?.ip || '', meta?.ua || '', meta?.country || '')
    .run()
  return token
}
