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
/* ── 표 만들기를 요청 경로에서 걷어낸다 ──────────────────────────────────
   CREATE TABLE / CREATE INDEX / ALTER 은 한 번만 하면 되는 일인데, 지금까지는
   요청마다(정확히는 새 isolate 의 첫 요청마다) 스무 개 넘게 다시 돌았다.
   Cloudflare 는 D1 질의 하나를 서브리퀘스트 하나로 세고 요청당 한도가 있다.
   실측: 새 isolate 첫 요청 40회 · 같은 isolate 두 번째 11회 · 관리자 6회.
   isolate 는 자주 새로 생기므로, 회원 요청 중 일부만 유독 무거워진다.

   ⚠ 이 40회가 회원 502 의 원인이라고 한동안 적어 두었는데, 그건 확인된 사실이 아니다.
     당시 무료 요금제로 알고(요청당 한도 50) 계산한 것인데 실제 계정은 Workers 유료였다
     — 유료는 한도가 1000 이라 40 은 근처에도 못 간다. 502 의 원인은 따로 있다.
     여기 있는 값은 "왕복을 줄여 더 빠르고 싸게 만든다" 는 근거일 뿐이다.

   표를 다 만들었다는 표시를 settings 에 남기고, 그 다음부터는 질의 한 번으로 건너뛴다.
   ⚠ 표시만 믿으면 안 된다. 표시는 있는데 표가 없는 상태가 실제로 생긴다 —
     · 표 만들기가 한 번 실패했는데(그 안에 catch 가 있다) 표시는 남은 경우
     · 표를 손으로 지운 경우
     그러면 그 자리는 영영 500 이 되고, 왜 그런지 알아내기가 아주 어렵다.
     그래서 표시를 읽는 그 한 번의 질의에 "지금 있는 표 목록" 을 같이 실어 온다.
     표시가 있어도 표가 하나라도 비면 다시 만든다 — 스스로 낫는다. 왕복은 그대로 한 번이다.
   ⚠ 열(column)이 늘어난 것까지는 못 본다. 나중에 열을 더하는 등 스키마를 바꾸면
     표시의 판(v)을 올려야 기존 배포에서도 다시 돈다. 판을 안 올리면 새 열이 영영 안 생긴다. */
const __ensured = new Map<string, Promise<void>>()
//  표시를 하나씩 물어보면 그것만으로 왕복이 여섯 번이다 — 한 번에 다 읽어 온다.
type Marks = { keys: Set<string>; tables: Set<string> }
let __marks: Promise<Marks> | null = null
function loadMarks(db: D1Database): Promise<Marks> {
  if (__marks) return __marks
  __marks = (async () => {
    const keys = new Set<string>(), tables = new Set<string>()
    try {
      //  표시와 표 목록을 한 질의로 — 앞은 'k:열쇠', 뒤는 't:표이름' 으로 구분한다.
      const r: any = await db.prepare(
        "SELECT 'k:' || key AS m FROM settings WHERE key LIKE 'schema\\_%' ESCAPE '\\' AND value = '1'" +
        " UNION ALL SELECT 't:' || name AS m FROM sqlite_master WHERE type = 'table'",
      ).all()
      for (const x of ((r && r.results) || []) as any[]) {
        const m = String(x.m || '')
        if (m.startsWith('k:')) keys.add(m.slice(2))
        else if (m.startsWith('t:')) tables.add(m.slice(2))
      }
    } catch { /* 못 읽으면 표시가 없는 셈 치고 전부 만든다 — 고치기 전과 같은 동작 */ }
    return { keys, tables }
  })()
  return __marks
}
export async function ensureOnce(
  db: D1Database,
  key: string,
  run: () => Promise<void>,
  tables: string[] = [],
): Promise<void> {
  const hit = __ensured.get(key)
  if (hit) return hit
  const job = (async () => {
    const marks = await loadMarks(db)
    //  표시가 있고, 그 표시가 책임지는 표가 실제로 다 있을 때만 건너뛴다
    if (marks.keys.has(key) && tables.every((t) => marks.tables.has(t))) return
    await run()
    for (const t of tables) marks.tables.add(t)
    const mark = () => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, '1').run()
    try {
      await mark()
      marks.keys.add(key)
    } catch {
      //  표시를 둘 곳(settings)이 아직 없을 수 있다 — 처음 배포된 빈 DB 에서 /api/generate 가
      //  첫 요청인 경우다. 그때만 한 번 만들고 다시 남긴다(성공하는 길에는 이 왕복이 없다).
      //  여기서 또 실패해도 동작에는 지장 없다 — 표시가 없으니 다음 isolate 에서 또 만들 뿐이다.
      try {
        await db.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)').run()
        await mark()
        marks.keys.add(key)
      } catch { }
    }
  })().catch((e) => { __ensured.delete(key); __marks = null; throw e })
  /* ⚠ 이 약속(promise)은 실패를 다시 던지고, 그대로 전역 표에 담긴다.
     지금은 부르는 쪽이 모두 await 하므로 그 실패를 누군가 받는다. 그런데 나중에 누가
     await 를 빠뜨리면, 아무도 받지 않는 실패가 되어 워커에서는 함수 자체가 죽는다
     (그 신호가 정확히 우리가 오래 헤맨 raw 502 다 — fetchT 주석 참고).
     담아 두는 쪽에는 빈 받이를 하나 달아 둔다. 부르는 쪽이 받는 것과는 별개다. */
  job.catch(() => {})
  __ensured.set(key, job)
  return job
}

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
    // 공개 엔드포인트 남용 방지용 히트 기록 (rateLimitOk 참고)
    db.prepare(`CREATE TABLE IF NOT EXISTS rate_hits (k TEXT NOT NULL, at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_rate_hits ON rate_hits(k, at)`),
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
    // 팀 요금제(좌석당) 주문
    db.prepare(`CREATE TABLE IF NOT EXISTS team_orders (
      order_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      seats INTEGER NOT NULL,
      months INTEGER NOT NULL DEFAULT 1,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',  -- pending | paid | failed
      payment_key TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_team_order_user ON team_orders(user_id, created_at)`),
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
    // 보안: IP↔회원 영구 매핑 (세션이 삭제돼도 IP가 어느 회원인지 추적)
    db.prepare(`CREATE TABLE IF NOT EXISTS ip_identities (
      ip TEXT NOT NULL,
      user_id TEXT NOT NULL,
      email TEXT,
      name TEXT,
      role TEXT,
      first_seen TEXT,
      last_seen TEXT,
      PRIMARY KEY (ip, user_id)
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_ipident_ip ON ip_identities(ip, last_seen)`),
    // 인증: 비밀번호 재설정 코드(이메일 인증)
    db.prepare(`CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      last_sent_at TEXT,
      created_at TEXT NOT NULL
    )`),
    // 마케팅: 쿠폰/할인코드
    db.prepare(`CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      discount_type TEXT DEFAULT 'percent',   -- percent | fixed
      discount_value INTEGER DEFAULT 0,        -- percent(1~100) 또는 정액(원)
      scope_track TEXT DEFAULT '',             -- '' 전체 | marketer | video
      scope_plan TEXT DEFAULT '',              -- '' 전체 | Plus | Pro | Max
      min_months INTEGER DEFAULT 1,
      max_uses INTEGER DEFAULT 0,              -- 0 = 무제한
      used_count INTEGER DEFAULT 0,
      per_user_limit INTEGER DEFAULT 1,        -- 0 = 무제한
      starts_at TEXT,
      expires_at TEXT,
      active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_coupon_code ON coupons(code)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id TEXT PRIMARY KEY,
      coupon_id TEXT,
      code TEXT,
      user_id TEXT,
      plan_request_id TEXT,
      track TEXT,
      plan TEXT,
      months INTEGER,
      original_krw INTEGER,
      discount_krw INTEGER,
      final_krw INTEGER,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_coupon_redeem ON coupon_redemptions(coupon_id, user_id)`),
    // 이메일(Resend) 발송 이력 — 관리자 대시보드에서 수신/발신/내용/시각 확인
    db.prepare(`CREATE TABLE IF NOT EXISTS email_log (
      id TEXT PRIMARY KEY,
      to_email TEXT,
      from_email TEXT,
      subject TEXT,
      kind TEXT,               -- reset | welcome | general ...
      status TEXT,             -- sent | failed
      resend_id TEXT,
      error TEXT,
      body TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL  -- ISO(UTC). 표시 시 KST 변환
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_log_ts ON email_log(created_at)`),
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
    // 팝업 알림 캠페인(관리자가 발송) — 사진/CTA버튼 포함, X 닫아야 읽음
    db.prepare(`CREATE TABLE IF NOT EXISTS notice_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT,
      body TEXT,
      image_url TEXT,
      cta_label TEXT,
      cta_url TEXT,
      target TEXT DEFAULT 'all',
      audience INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL
    )`),
    // 캠페인 × 회원별 수신/읽음 영수증 (read_at NULL = 안읽음)
    db.prepare(`CREATE TABLE IF NOT EXISTS notice_receipts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_notice_rcpt_user ON notice_receipts(user_id, read_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_notice_rcpt_camp ON notice_receipts(campaign_id)`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_notice_rcpt_uniq ON notice_receipts(campaign_id, user_id)`),
    // 노드 스튜디오 상세 활동 기록 (누가·언제·어떤 노드에서 무엇을·크레딧 얼마) — 관리자 감사용
    db.prepare(`CREATE TABLE IF NOT EXISTS studio_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT,
      node_type TEXT,
      detail TEXT,
      credits REAL DEFAULT 0,
      model TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_studio_act_user ON studio_activity(user_id, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_studio_act_time ON studio_activity(created_at)`),
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
    credit_price: 'credit_price REAL', // 회원별 크레딧 구매 단가(원/크레딧). NULL = 전역/기본값 사용
    academy: 'academy TEXT', // 소속 학원(그룹). 크레딧 단가를 학원 단위로 지정할 때 사용
    branch_id: 'branch_id TEXT', // 추천인이 소속된 지사(정산 대상)
    mcp_token: 'mcp_token TEXT', // 회원별 개인 MCP 연결 토큰(본인 계정으로 크레딧 차감)
    ref_surcharge: 'ref_surcharge REAL', // 레퍼런스 이미지 1장 추가당 크레딧 가산율(%). NULL=전역 기본값
    account_type: 'account_type TEXT', // team | individual (가입 시 선택)
    products: 'products TEXT',          // video | marketing | both (사용할 제품 선택)
    team_plan: 'team_plan INTEGER DEFAULT 0', // 팀 워크플로우 요금제 보유(1=오너/구매자)
    team_seats: 'team_seats INTEGER DEFAULT 0', // 구매한 좌석 수(오너 본인 포함)
    team_until: "team_until TEXT DEFAULT ''",   // 팀 요금제 만료일(ISO). 이 날짜 이후 비활성
    plan_until: 'plan_until TEXT',              // 마케터 플랜 만료일(ISO). NULL/빈값 = 무기한
    video_plan_until: 'video_plan_until TEXT',  // AI 영상 플랜 만료일(ISO). NULL/빈값 = 무기한
    credit_until: 'credit_until TEXT',          // 크레딧 사용기한(ISO, 안내용)
    point_until: 'point_until TEXT',            // 포인트 사용기한(ISO, 안내용)
  })
  await addMissingColumns(db, 'plan_requests', {
    track: "track TEXT DEFAULT 'marketer'",
    months: 'months INTEGER DEFAULT 0', // 신청 이용 기간(개월, 0=무기한). 승인 시 plan_until 계산에 사용
    amount: 'amount INTEGER DEFAULT 0', // 신청 시점에 확정된 실결제액(원). 매출 집계의 기준(할인·개월 반영)
    coupon_code: 'coupon_code TEXT',    // 적용된 쿠폰 코드(있으면)
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
  // 일회성 마이그레이션: 가입 축하 1000포인트 전액 회수 (관리자 제외 전 회원 포인트 0).
  //  이후 포인트 지급은 중단됨. settings 플래그로 최초 1회만 실행.
  try {
    const flag: any = await db.prepare("SELECT value FROM settings WHERE key = 'points_recovered_v1'").first().catch(() => null)
    if (!flag) {
      await db.prepare("UPDATE users SET points = 0 WHERE (role IS NULL OR role != 'admin') AND points != 0").run().catch(() => {})
      await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('points_recovered_v1', ?)").bind(new Date().toISOString()).run().catch(() => {})
    }
  } catch { /* 마이그레이션 실패는 스키마 초기화를 막지 않음 */ }
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
  // ⚠ 잔액을 읽어 계산한 절대값으로 덮어쓰면 안 된다.
  //   지급이 처리되는 사이에 생성·발송으로 차감이 일어나면 그 차감이 통째로 지워진다(lost update).
  //   상대 증감으로 바꾸고, 기록용 잔액은 반영된 뒤 다시 읽는다.
  //   크레딧은 소수 2자리까지 지원(0.05 등), 포인트는 정수 — ROUND 2 는 정수에 영향이 없다.
  await db.prepare(`UPDATE users SET ${col} = ROUND(COALESCE(${col}, 0) + ?, 2) WHERE id = ?`).bind(Number(amount), userId).run()
  const fresh: any = await db.prepare(`SELECT ${col} AS bal FROM users WHERE id = ?`).bind(userId).first().catch(() => null)
  const balanceAfter = Math.round((Number(fresh?.bal) || 0) * 100) / 100
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
  // 원자적 조건부 차감 — 동시 요청으로 인한 이중 차감/음수 잔액(TOCTOU) 방지.
  //  잔액이 충분할 때만 감소하고, 실제 바뀐 행 수(changes)로 성공 여부 판정.
  const upd: any = await db
    .prepare('UPDATE users SET credits = ROUND(credits - ?, 2) WHERE id = ? AND credits >= ?')
    .bind(amt, userId, amt)
    .run()
  if (!upd || !upd.meta || upd.meta.changes !== 1) {
    const cur: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(userId).first()
    if (!cur) return { ok: false as const, error: '사용자를 찾을 수 없습니다.' }
    return { ok: false as const, error: '크레딧이 부족합니다.', balance: Number(cur.credits) || 0, need: amt }
  }
  const after2: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(userId).first()
  const balanceAfter = Math.round((Number(after2?.credits) || 0) * 100) / 100
  await db
    .prepare(`INSERT INTO transactions (id, user_id, kind, amount, balance_after, memo, created_at) VALUES (?, ?, 'credit', ?, ?, ?, ?)`)
    .bind('t_' + crypto.randomUUID().slice(0, 16), userId, -amt, balanceAfter, memo || feature, new Date().toISOString())
    .run()
  await logActivity(db, userId, 'credit', `-${amt} 크레딧 · ${feature}`)
  return { ok: true as const, balanceAfter }
}

/**
 * 포인트 차감 (잔액 부족 시 실패). 문자·알림톡 발송 비용은 전부 이 경로를 쓴다.
 *
 * 크레딧(AI 생성)과 포인트(발송)는 완전히 별개의 지갑이다.
 * spendCredits 와 같은 원자적 조건부 차감 — 동시 요청에도 이중 차감·음수 잔액이 나지 않는다.
 */
export async function spendPoints(db: D1Database, userId: string, amount: number, feature: string, memo = '') {
  const amt = Math.max(0, Math.floor(Number(amount) || 0)) // 포인트는 정수
  if (amt <= 0) return { ok: false as const, error: '차감할 포인트 수량이 올바르지 않습니다.' }
  const upd: any = await db
    .prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?')
    .bind(amt, userId, amt)
    .run()
  if (!upd || !upd.meta || upd.meta.changes !== 1) {
    const cur: any = await db.prepare('SELECT points FROM users WHERE id = ?').bind(userId).first()
    if (!cur) return { ok: false as const, error: '사용자를 찾을 수 없습니다.' }
    const bal = Number(cur.points) || 0
    return {
      ok: false as const,
      error: `포인트가 부족합니다. 필요 ${amt.toLocaleString()}P · 보유 ${bal.toLocaleString()}P`,
      balance: bal,
      need: amt,
    }
  }
  const after: any = await db.prepare('SELECT points FROM users WHERE id = ?').bind(userId).first()
  const balanceAfter = Number(after?.points) || 0
  await db
    .prepare(`INSERT INTO transactions (id, user_id, kind, amount, balance_after, memo, created_at) VALUES (?, ?, 'point', ?, ?, ?, ?)`)
    .bind('t_' + crypto.randomUUID().slice(0, 16), userId, -amt, balanceAfter, memo || feature, new Date().toISOString())
    .run()
  await logActivity(db, userId, 'point', `-${amt.toLocaleString()}P · ${feature}`)
  return { ok: true as const, balanceAfter, spent: amt }
}

/** 포인트 환불 — 나가지 않은 발송분을 돌려준다(상대 증감이라 동시 차감과 겹쳐도 안전) */
export async function refundPoints(db: D1Database, userId: string, amount: number, memo: string) {
  const amt = Math.max(0, Math.floor(Number(amount) || 0))
  if (amt <= 0) return
  await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(amt, userId).run().catch(() => {})
  await db
    .prepare(
      `INSERT INTO transactions (id, user_id, kind, amount, balance_after, memo, created_at)
       SELECT ?, ?, 'point', ?, points, ?, ? FROM users WHERE id = ?`,
    )
    .bind('t_' + crypto.randomUUID().slice(0, 16), userId, amt, memo, new Date().toISOString(), userId)
    .run()
    .catch(() => {})
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
/**
 * 회원 탈퇴·삭제 시 그 회원의 데이터를 지운다 (users 행 자체는 호출부에서 지운다).
 *
 * ⚠ 한 곳에 모은 이유: 예전에는 본인 탈퇴(account/delete)와 관리자 삭제(admin/users)가
 *   각자 지울 테이블 목록을 들고 있었고, 한쪽에만 추가되는 일이 반복됐다.
 *   그 결과 탈퇴한 뒤에도 연락처 그룹(다른 사람의 전화번호!), 신청자 명단, 문자·메일 발송
 *   이력, 퍼널·랜딩페이지가 그대로 남아 있었다. 목록은 이제 여기서만 관리한다.
 *
 * 결제 원장(payments)은 일부러 남긴다 — 매출·정산·세금계산서의 단일 소스라
 *   지우면 과거 매출이 통째로 사라진다(회원 식별 정보는 users 삭제로 끊긴다).
 */
export async function purgeUserData(db: D1Database, uid: string, env?: any): Promise<void> {
  const del = async (sql: string, ...b: any[]) => {
    try { await db.prepare(sql).bind(...b).run() } catch { /* 없는 테이블/컬럼은 무시 */ }
  }
  // 계정·활동
  await del('DELETE FROM sessions WHERE user_id = ?', uid)
  await del('DELETE FROM transactions WHERE user_id = ?', uid)
  await del('DELETE FROM notifications WHERE user_id = ?', uid)
  await del('DELETE FROM activity_log WHERE user_id = ?', uid)
  await del('DELETE FROM ai_usage WHERE user_id = ?', uid)
  /*  생성 실패 기록 — 이메일·이름과 그 회원이 쓴 프롬프트가 그대로 들어 있다.
      실패 기록이라고 개인정보가 아닌 게 아니다. 탈퇴하면 같이 지운다. */
  await del('DELETE FROM gen_failures WHERE user_id = ?', uid)
  // 신청·주문
  await del('DELETE FROM plan_requests WHERE user_id = ?', uid)
  await del('DELETE FROM point_requests WHERE user_id = ?', uid)
  await del('DELETE FROM credit_requests WHERE user_id = ?', uid)
  await del('DELETE FROM credit_orders WHERE user_id = ?', uid)
  await del('DELETE FROM team_orders WHERE user_id = ?', uid)
  await del('DELETE FROM coupon_redemptions WHERE user_id = ?', uid)
  // 발송 관련(연락처는 남의 개인정보다 — 반드시 함께 지운다)
  //  발신번호 승인 서류는 신분증·사업자등록증이다 — 행뿐 아니라 실제 파일까지 지운다.
  const docPrefix = `sender-docs/${uid}/`
  await del('DELETE FROM media_blobs WHERE key LIKE ?', docPrefix + '%')
  try {
    const bucket: any = env ? resolveBucket(env) : null
    if (bucket) {
      let cursor: string | undefined
      for (let round = 0; round < 20; round++) {
        const listed: any = await bucket.list({ prefix: docPrefix, limit: 500, cursor })
        const keys = (listed?.objects || []).map((o: any) => o.key)
        if (keys.length) await bucket.delete(keys)
        if (!listed?.truncated) break
        cursor = listed.cursor
      }
    }
  } catch { /* 버킷 미설정이면 넘어간다 */ }
  await del('DELETE FROM sender_documents WHERE user_id = ?', uid)
  await del('DELETE FROM msg_rate_overrides WHERE user_id = ?', uid)
  await del('DELETE FROM sender_numbers WHERE user_id = ?', uid)
  await del('DELETE FROM contact_group_members WHERE group_id IN (SELECT id FROM contact_groups WHERE user_id = ?)', uid)
  await del('DELETE FROM contact_groups WHERE user_id = ?', uid)
  await del('DELETE FROM sms_templates WHERE user_id = ?', uid)
  await del('DELETE FROM sms_logs WHERE user_id = ?', uid)
  await del('DELETE FROM email_log WHERE user_id = ?', uid)
  await del('DELETE FROM kakao_templates WHERE user_id = ?', uid)
  await del('DELETE FROM kakao_channels WHERE user_id = ?', uid)
  await del('DELETE FROM kakao_alimtalk_logs WHERE user_id = ?', uid)
  // CRM 집행 — 수신자 한 명 한 명의 이름·전화번호가 crm_execution_sends 에 그대로 들어 있다.
  //  실제로 탈퇴 뒤에도 집행 2건·수신자 17명이 남아 있었다(그 회원 고객들의 개인정보다).
  //  user_id 로만 지우면 옛 행에 user_id 가 비어 있을 때 새어 나가므로 집행 id 로도 훑는다.
  await del('DELETE FROM crm_execution_sends WHERE campaign_id IN (SELECT id FROM crm_executions WHERE user_id = ?)', uid)
  await del('DELETE FROM crm_execution_sends WHERE user_id = ?', uid)
  /*  옛 이름의 발송 표. 지금 코드는 이 표를 안 만들지만, 예전 스키마로 시작한 DB 에는
      그대로 남아 있고 그 안에는 그 회원 고객들의 이름·전화번호가 들어 있다.
      코드에서 안 쓴다고 개인정보가 사라지는 게 아니다 — 탈퇴하면 같이 지운다. */
  await del('DELETE FROM crm_campaign_sends WHERE user_id = ?', uid)
  await del('DELETE FROM crm_executions WHERE user_id = ?', uid)
  // 알림 발송 내역 — 받는 사람 이름·전화번호·문구가 남는다
  await del('DELETE FROM notify_log WHERE user_id = ?', uid)
  // 신청자 알림 설정
  await del('DELETE FROM settings WHERE key = ?', `lead_alert:${uid}`)
  // 스튜디오
  await del('DELETE FROM studio_schedules WHERE user_id = ?', uid)
  await del('DELETE FROM studio_brandkit WHERE user_id = ?', uid)
  await del('DELETE FROM api_calls WHERE user_id = ?', uid)
  await del('DELETE FROM api_keys WHERE user_id = ?', uid)
  /*  모델 대여 — 그 회원이 어떤 모델을 언제 빌려 갔는지가 남는다.
      표를 새로 만들면서 이 목록에 넣는 걸 빠뜨렸다(검사가 잡았다).
      ⚠ 매출 원장(payments·refunds·세금계산서·gen_charges·subscriptions)은 일부러 남긴다 —
        회원과의 연결은 users 를 지우면서 끊긴다. 대여 기록은 원장이 아니라 이용 기록이라 지운다. */
  await del('DELETE FROM model_leases WHERE user_id = ?', uid)
  await del('DELETE FROM video_gallery WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)', uid)
  // 퍼널 — 신청자(이름·전화·이메일)까지 아래에서 위로 지운다
  await del(`DELETE FROM funnel_applicants WHERE landing_page_id IN (
               SELECT p.id FROM funnel_landing_pages p JOIN funnel_groups g ON g.id = p.group_id WHERE g.user_id = ?)`, uid)
  await del('DELETE FROM funnel_landing_pages WHERE group_id IN (SELECT id FROM funnel_groups WHERE user_id = ?)', uid)
  await del('DELETE FROM funnel_auto_responses WHERE user_id = ?', uid)
  await del('DELETE FROM funnel_flows WHERE user_id = ?', uid)
  await del('DELETE FROM funnel_group_connections WHERE funnel_id IN (SELECT id FROM funnels WHERE user_id = ?)', uid)
  await del('DELETE FROM funnel_groups WHERE user_id = ?', uid)
  await del('DELETE FROM funnels WHERE user_id = ?', uid)
  // 랜딩(비퍼널)
  //  ⚠ 순서 주의 — 방문 기록과 공유 링크는 slug 로만 이어져 있어서 landing_pages 를 먼저 지우면
  //    누구 것인지 알 길이 없어 영영 남는다. 실제로 탈퇴·강제 삭제 후에도
  //    landing_page_views 에 방문자 IP·UA 가 그대로 남아 있었고(그 회원의 고객 개인정보다),
  //    /report/{token} 공유 리포트도 계속 열렸다.
  await del('DELETE FROM landing_page_views WHERE landing_slug IN (SELECT slug FROM landing_pages WHERE user_id = ?)', uid)
  await del('DELETE FROM landing_traffic_shares WHERE slug IN (SELECT slug FROM landing_pages WHERE user_id = ?)', uid)
  await del('DELETE FROM form_submissions WHERE landing_page_id IN (SELECT id FROM landing_pages WHERE user_id = ?)', uid)
  await del('DELETE FROM landing_pages WHERE user_id = ?', uid)
  await del('DELETE FROM landing_folders WHERE user_id = ?', uid)
  // 빌더로 올린 이미지 — D1 폴백 저장분과 R2 객체 모두
  const mediaPrefix = `landing-images/${uid}/`
  await del("DELETE FROM media_blobs WHERE key LIKE ?", mediaPrefix + '%')
  try {
    const bucket: any = env ? resolveBucket(env) : null
    if (bucket) {
      let cursor: string | undefined
      for (let round = 0; round < 20; round++) {
        const listed: any = await bucket.list({ prefix: mediaPrefix, limit: 500, cursor })
        const keys = (listed?.objects || []).map((o: any) => o.key)
        if (keys.length) await bucket.delete(keys)
        if (!listed?.truncated) break
        cursor = listed.cursor
      }
    }
  } catch { /* 버킷 미설정이면 넘어간다 */ }
  // 순위 추적
  await del('DELETE FROM naver_place_tracking WHERE user_id = ?', uid)
  //  순위 이력 — 그 회원이 어느 업체·어떤 키워드를 쫓고 있었는지가 그대로 남는다
  await del('DELETE FROM naver_place_ranks WHERE user_id = ?', uid)
  await del('DELETE FROM blog_rank_track_history WHERE track_id IN (SELECT id FROM blog_rank_tracks WHERE user_id = ?)', uid)
  await del('DELETE FROM blog_rank_tracks WHERE user_id = ?', uid)
  // 인스타그램 DM 자동화 (회원별로 나뉘어 있다 — 규칙·발송내역·웹훅내역·연결 토큰)
  await del('DELETE FROM instagram_dm_logs WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)', uid)
  await del('DELETE FROM instagram_dm_rules WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)', uid)
  await del('DELETE FROM instagram_webhook_logs WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)', uid)
  await del('DELETE FROM instagram_account_settings WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)', uid)
  // 소통
  // 상담 대화 — 회원은 conv_id 가 곧 user_id 지만, 예전에는 회원도 클라이언트가 준 conv_id 를
  //  그대로 썼다(위 chat/send 주석 참고). 그 시절 행은 user_id 로만 이어져 있어 이름·이메일이 남는다.
  await del('DELETE FROM support_chats WHERE conv_id = ? OR user_id = ?', uid, uid)
  await del('DELETE FROM dm_messages WHERE from_id = ? OR to_id = ?', uid, uid)
  await del('DELETE FROM friend_aliases WHERE owner_id = ? OR friend_id = ?', uid, uid)
  await del('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', uid, uid)
  await del('DELETE FROM team_members WHERE user_id = ?', uid)
  await del('DELETE FROM team_invites WHERE from_user_id = ? OR to_user_id = ?', uid, uid)
  await del('DELETE FROM team_messages WHERE user_id = ?', uid)
  // 로그인 수단 — 남겨 두면 탈퇴 뒤에도 발급된 토큰으로 API 가 열린다
  await del('DELETE FROM oauth_tokens WHERE user_id = ?', uid)
  await del('DELETE FROM oauth_codes WHERE user_id = ?', uid)
  // 기기·푸시 — 엔드포인트·IP·UA 가 개인정보다
  //  ⚠ 아래 표들은 user_id 를 INTEGER 로 선언해 두고 실제로는 'u_xxx' 문자열을 넣는다.
  //    그냥 = 로 비교하면 형 친화도(affinity) 때문에 안 지워질 수 있어 CAST 로 맞춘다.
  const delU = (t: string) => del(`DELETE FROM ${t} WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)`, uid)
  await delU('push_subscriptions')
  await delU('app_push_tokens')
  await del('DELETE FROM app_installs WHERE user_id = ?', uid)
  await del('DELETE FROM visits WHERE user_id = ?', uid)
  await del('DELETE FROM ip_identities WHERE user_id = ?', uid)
  await del('DELETE FROM api_rate WHERE user_id = ?', uid)
  await delU('user_events')
  await delU('user_marketing_meta')
  // 회원별 단가 조정 (msg_rate_overrides 와 같은 성격)
  await del('DELETE FROM user_model_markups WHERE user_id = ?', uid)
  // 발송·수신 기록
  await del('DELETE FROM alimtalk_logs WHERE user_id = ?', uid)
  await delU('campaign_logs')
  await delU('campaign_events')
  await del('DELETE FROM notice_receipts WHERE user_id = ?', uid)
  await del('DELETE FROM notice_visitor_events WHERE user_id = ?', uid)
  // 스튜디오 — schedules·brandkit 만 지우고 나머지 작업물이 남아 있었다
  await del('DELETE FROM studio_activity WHERE user_id = ?', uid)
  await del('DELETE FROM studio_characters WHERE user_id = ?', uid)
  await del('DELETE FROM studio_saved_flows WHERE user_id = ?', uid)
  await del('DELETE FROM studio_workflows WHERE user_id = ?', uid)
  await delU('canvas_user_state')
  // 순위·실험 (blog_rank_tracks 와 같은 성격)
  await delU('blogs')
  await delU('rank_monitoring')
  await delU('ab_test_results')
  // 광고 관리 화면
  await del('DELETE FROM ad_campaigns WHERE owner_id = ?', uid)
  await del('DELETE FROM ad_calendars WHERE owner_id = ?', uid)
  // 정기결제 — 지우지 않고 해지한다. 남겨 두면 탈퇴 뒤에도 빌링키로 계속 청구된다.
  await del("UPDATE subscriptions SET status = 'cancelled', pg_billing_key = NULL, cancelled_at = ? WHERE user_id = ? AND status != 'cancelled'",
    new Date().toISOString(), uid)
  // 추천 관계
  await del("UPDATE users SET referred_by = '' WHERE referred_by = ?", uid)
  await del('DELETE FROM referral_rewards WHERE referrer_id = ? OR friend_id = ?', uid, uid)
}

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
// CSRF 방어(심층): SameSite=Lax 쿠키에 더해, 브라우저가 보내는 Origin/Referer 가
// 요청 호스트와 일치하는지 확인. Origin/Referer 가 아예 없으면(비브라우저·MCP 서버호출) 통과.
// 교차 출처 브라우저 요청(위조 폼)만 차단한다.
export function sameOriginOk(request: Request): boolean {
  const host = request.headers.get('Host') || new URL(request.url).host
  const origin = request.headers.get('Origin')
  const referer = request.headers.get('Referer')
  const src = origin || referer
  if (!src) return true // 헤더 없음 → 브라우저 CSRF 아님(서버-서버/네이티브). 통과.
  try {
    const u = new URL(src)
    if (u.host === host) return true
    // 동일 상위도메인 허용 (예: bygency.co ↔ www.nextbygency.com 운영 도메인)
    const base = (h: string) => h.split(':')[0].split('.').slice(-2).join('.')
    return base(u.host) === base(host)
  } catch {
    return false
  }
}
/**
 * 요청 본문의 값을 "절대 예외를 던지지 않고" 문자열로 바꾼다.
 *
 * ⚠ String(v) 는 던질 수 있다. {"name":{"toString":1}} 처럼 toString 이 함수가 아닌 객체를 주면
 *   TypeError: Cannot convert object to primitive value 가 나고, try/catch 가 없는 핸들러는
 *   통째로 500 + 클라우드플레어 HTML 오류 페이지를 뱉는다(JSON 을 기대하는 클라이언트는 그대로 깨진다).
 *   실제로 /api/signup · /api/leads/collect 같은 공개 경로가 이 한 줄짜리 본문에 죽었다.
 *   문자열/숫자/불리언만 값으로 보고, 객체·배열은 "값 없음" 으로 취급한다.
 */
export function asText(v: any, max = 0): string {
  let out = ''
  try {
    if (v == null) out = ''
    else if (typeof v === 'string') out = v
    else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') out = String(v)
    else out = '' // 객체·배열·심볼·함수
  } catch { out = '' }
  return max > 0 ? out.slice(0, max) : out
}

/**
 * 국내 전화번호를 한 가지 모양(01012345678)으로 맞춘다.
 *
 *  랜딩 신청 폼에 "+82 10-1234-5678" 처럼 국제 표기로 적는 사람이 있다.
 *  숫자만 남기면 821012345678 이 되어 01012345678 과 다른 번호가 되어 버린다.
 *  실제로 이 때문에 이미 신청한 사람이 "미신청자" 로 분류돼 후속 문자를 또 받았고,
 *  그 건수만큼 포인트도 나갔다. 알리고도 82… 형식은 받지 않는다.
 *  국내 번호는 0 으로 시작하므로 82 로 시작하는 숫자열은 국제 표기로 봐도 안전하다.
 */
export function normPhoneKR(v: any): string {
  let d = asText(v).replace(/[^0-9]/g, '')
  if (!d) return ''
  if (d.startsWith('0082')) d = '0' + d.slice(4)          // 0082-10-…
  else if (d.startsWith('82') && d.length >= 11) d = '0' + d.slice(2)  // +82-10-…
  return d
}

/** D1 바인딩에 넣어도 안전한 스칼라만 남긴다(객체/배열/undefined 를 바인딩하면 D1 이 던진다). */
export function asBindable(v: any): string | number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  return null
}

/** id 목록 정규화 — 스칼라만, 중복 제거, 최대 개수 제한 */
export function asIdList(v: any, max = 500): (string | number)[] {
  if (!Array.isArray(v)) return []
  const out: (string | number)[] = []
  const seen = new Set<string>()
  for (const it of v) {
    const b = asBindable(it)
    if (b == null || b === '') continue
    const k = String(b)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(b as string | number)
    if (out.length >= max) break
  }
  return out
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'unknown'
  )
}

/**
 * 공개(로그인 없는) 엔드포인트 남용 방지 — key 기준으로 windowMin 분 안에 limit 회까지만 허용.
 *  통과하면 true 를 돌려주고 히트를 1건 기록한다. 넘으면 false.
 *
 *  ⚠ 왜 필요한가: 퍼널/랜딩 폼 제출은 로그인 없이 아무나 부를 수 있는데,
 *     한 번 부를 때마다 자동응답 문자·알림톡이 나간다(건당 유료).
 *     막는 장치가 없으면 스크립트 한 번에 문자 요금이 그대로 빠져나가고
 *     신청자 목록도 쓰레기 데이터로 뒤덮인다.
 *  DB 오류 시에는 통과시킨다 — 남용 방지 장치가 정상 이용을 막는 쪽이 더 나쁘다.
 */
export async function rateLimitOk(db: D1Database, key: string, limit: number, windowMin: number): Promise<boolean> {
  if (!key) return true
  const now = Date.now()
  const since = new Date(now - windowMin * 60_000).toISOString()
  try {
    const r: any = await db.prepare('SELECT COUNT(*) AS c FROM rate_hits WHERE k = ? AND at > ?').bind(key, since).first()
    if (Number(r?.c || 0) >= limit) return false
    await db.prepare('INSERT INTO rate_hits (k, at) VALUES (?, ?)').bind(key, new Date(now).toISOString()).run()
    // 가끔씩만 오래된 기록을 지운다(매 요청 DELETE 는 낭비) — 하루 지난 건 의미 없다
    if (Math.random() < 0.02) {
      await db.prepare('DELETE FROM rate_hits WHERE at < ?').bind(new Date(now - 86400_000).toISOString()).run().catch(() => {})
    }
    return true
  } catch {
    // 테이블이 아직 없을 수 있다(ensureSchema 를 거치지 않는 경로) → 만들어 두고 이번 요청은 통과시킨다.
    //  이게 없으면 그런 경로에서는 제한이 영영 걸리지 않는다(조용히 무제한).
    await db.prepare(`CREATE TABLE IF NOT EXISTS rate_hits (k TEXT NOT NULL, at TEXT NOT NULL)`).run().catch(() => {})
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_rate_hits ON rate_hits(k, at)`).run().catch(() => {})
    return true
  }
}

/** 방금 쓴 제한 한 칸을 돌려준다.
 *  공개 폼은 "제한 확인 → 저장" 순서라, 저장이 실패하면 제한만 축나고 방문자는
 *  곧바로 다시 넣을 수 없다 — 중복이 아닌데 "이미 신청이 접수되었습니다" 로 막혀
 *  그대로 놓치는 손님이 된다. 그래서 실패한 요청이 쓴 칸은 되돌린다. */
export async function releaseRateLimit(db: D1Database, key: string): Promise<void> {
  if (!key) return
  await db.prepare('DELETE FROM rate_hits WHERE rowid = (SELECT MAX(rowid) FROM rate_hits WHERE k = ?)')
    .bind(key).run().catch(() => {})
}

export async function isBlocked(db: D1Database, ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  const row = await db.prepare('SELECT ip FROM blocked_ips WHERE ip = ?').bind(ip).first()
  return !!row
}

/** 최근 N분 내 해당 IP의 의심(warn/high) 보안 이벤트 수 — 스캐닝/스크래핑 자동차단 판정용 */
export async function countRecentSuspicious(db: D1Database, ip: string, minutes = 10): Promise<number> {
  if (!ip || ip === 'unknown') return 0
  const since = new Date(Date.now() - minutes * 60_000).toISOString()
  try {
    const r: any = await db
      .prepare("SELECT COUNT(*) AS n FROM security_log WHERE ip = ? AND ts >= ? AND severity IN ('warn','high')")
      .bind(ip, since)
      .first()
    return Number(r?.n) || 0
  } catch { return 0 }
}

/** IP 자동 차단(중복 안전). 화이트리스트 IP는 제외. */
export async function autoBlockIp(db: D1Database, ip: string, reason: string, geo?: { country?: string; city?: string }): Promise<boolean> {
  if (!ip || ip === 'unknown') return false
  try {
    const wl = await db.prepare('SELECT ip FROM ip_whitelist WHERE ip = ?').bind(ip).first()
    if (wl) return false
    await db
      .prepare('INSERT OR REPLACE INTO blocked_ips (ip, reason, source, created_at, country, city) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(ip, reason.slice(0, 200), 'auto', new Date().toISOString(), geo?.country || '', geo?.city || '')
      .run()
    return true
  } catch { return false }
}

export async function logSecurity(
  //  DB 바인딩이 없는 환경(로컬·미설정)에서도 불린다 — 없으면 조용히 넘어간다.
  //  예전에는 D1Database 로만 받아 두고 null 을 넘기고 있었다(런타임은 안쪽 try 로 버텼지만 타입이 거짓말이었다).
  db: D1Database | null | undefined,
  o: { ip: string; method?: string; path?: string; status?: number; severity?: string; detail?: string; country?: string; city?: string; ua?: string },
) {
  if (!db) return
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
export function geoFrom(request: Request): { country: string; city: string; region: string; isp: string; asn: string; lat: string; lon: string; timezone: string; postal: string } {
  const cf: any = (request as any).cf || {}
  return {
    country: cf.country || request.headers.get('CF-IPCountry') || '',
    city: cf.city || '',
    region: cf.region || cf.regionCode || '', // 시/도 (예: Seoul)
    isp: cf.asOrganization || '',
    asn: cf.asn ? String(cf.asn) : '',
    lat: cf.latitude ? String(cf.latitude) : '',
    lon: cf.longitude ? String(cf.longitude) : '',
    timezone: cf.timezone || '',
    postal: cf.postalCode || '',
  }
}

/** AI/LLM 크롤러·에이전트 User-Agent 판별.
 *  Gemini·Claude·GPT 등 AI가 접속하면 국가와 무관하게 한국어로 노출하기 위한 용도.
 *  (검색 SEO 봇은 제외 — 순수 AI 학습/응답용 크롤러와 어시스턴트만 매칭) */
const AI_UA_RE = new RegExp(
  [
    'gptbot', 'oai-searchbot', 'chatgpt', 'chatgpt-user', 'openai',           // OpenAI / ChatGPT
    'claudebot', 'claude-web', 'claude-user', 'claude-searchbot', 'anthropic', // Anthropic / Claude
    'google-extended', 'googleother', 'gemini', 'bard', 'google-cloudvertexai', // Google Gemini / Bard
    'perplexity', 'youbot', 'phindbot',                                        // Perplexity / You / Phind
    'ccbot', 'cohere-ai', 'cohere', 'diffbot', 'bytespider',                   // CommonCrawl / Cohere / ByteDance(Doubao)
    'meta-externalagent', 'meta-externalfetcher', 'facebookbot',              // Meta AI
    'amazonbot', 'applebot-extended', 'petalbot',                              // Amazon / Apple AI / Huawei
    'ai2bot', 'timpibot', 'omgili', 'imagesift', 'webzio-extended',           // 기타 AI 학습 크롤러
    'mistralai', 'deepseek', 'kagibot', 'duckassistbot', 'novaact',           // Mistral / DeepSeek / Kagi / DuckDuckGo / Amazon Nova
  ].join('|'),
  'i',
)
export function isAIBot(ua: string | null | undefined): boolean {
  if (!ua) return false
  return AI_UA_RE.test(ua)
}

/** IP 목록 → 각 IP에 매핑된 회원(영구 매핑 테이블). 위협/조회 화면에서 회원/비회원 식별에 사용. */
export async function getIpMembers(db: D1Database, ips: string[]): Promise<Record<string, { user_id: string; email: string; name: string; role: string; last_seen: string }[]>> {
  const uniq = [...new Set(ips.filter((x) => x && x !== 'unknown'))]
  const out: Record<string, any[]> = {}
  if (!uniq.length) return out
  try {
    // 파라미터 바인딩(IN 절)으로 안전하게 조회
    const CHUNK = 80
    for (let i = 0; i < uniq.length; i += CHUNK) {
      const part = uniq.slice(i, i + CHUNK)
      const ph = part.map(() => '?').join(',')
      const rows = (await db
        .prepare(`SELECT ip, user_id, email, name, role, last_seen FROM ip_identities WHERE ip IN (${ph}) ORDER BY last_seen DESC`)
        .bind(...part)
        .all()).results || []
      for (const r of rows as any[]) {
        ;(out[r.ip] = out[r.ip] || []).push({ user_id: r.user_id, email: r.email, name: r.name, role: r.role, last_seen: r.last_seen })
      }
    }
  } catch { /* 테이블 미생성 등 무시 */ }
  return out
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

/* ── 관리자 콘솔 접근 잠금 (허용 IP/기기만 관리자 접근) ── */
export const ADMIN_DEVICE_COOKIE = 'bygency_admdev'
// 허용목록 테이블 보장 (kind='ip'|'device', value=IP 또는 기기토큰)
export async function ensureAdminAclTable(db: D1Database) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS admin_acl (
       id TEXT PRIMARY KEY,
       kind TEXT NOT NULL,
       value TEXT NOT NULL,
       label TEXT,
       created_at TEXT NOT NULL
     )`,
  ).run().catch(() => {})
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_acl_kv ON admin_acl(kind, value)').run().catch(() => {})
}
// 관리자 접근 잠금 활성화 여부 (기본 off)
export async function isAdminLockEnabled(db: D1Database): Promise<boolean> {
  return (await getSetting(db, 'admin_lock_enabled')) === 'on'
}
// 현재 IP 또는 기기 토큰이 허용목록에 있는지
export async function isAdminAccessAllowed(db: D1Database, ip: string, deviceToken: string): Promise<boolean> {
  try {
    if (ip && ip !== 'unknown') {
      const r = await db.prepare("SELECT 1 FROM admin_acl WHERE kind='ip' AND value = ?").bind(ip).first()
      if (r) return true
    }
    if (deviceToken && deviceToken.length >= 16) {
      const r = await db.prepare("SELECT 1 FROM admin_acl WHERE kind='device' AND value = ?").bind(deviceToken).first()
      if (r) return true
    }
  } catch { /* 테이블 없음 = 허용목록 비어있음 */ }
  return false
}
export function newAdminDeviceToken(): string {
  return 'adv_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)
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
/** 관리자 가드 결과. 두 갈래를 명시해 둔다 —
 *  추론에 맡기면 error 가 양쪽 모두에서 선택 속성이 되어, 호출부의 `return guard.error` 가
 *  Response | undefined 로 넓어진다(핸들러가 undefined 를 반환할 수 있는 것처럼 보인다). */
type AdminGuard = { error: Response; me?: undefined } | { error?: undefined; me: any }

export async function requireAdminUser(request: Request, db: D1Database): Promise<AdminGuard> {
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
  // password_hash 가 비어 있는 행(가져오기·관리자 생성 등)으로 로그인하면 split 에서 던져 500 이 났다.
  // 호출부 넷 모두 false 를 "일치하지 않음" 으로 다루므로, 없는 해시는 불일치로 본다.
  if (typeof stored !== 'string' || !stored) return true
  const [salt] = stored.split(':')
  if (!salt) return false
  const check = await hashPassword(password, salt)
  return timingSafeEqual(check, stored)
}

/**
 * 로그인 후 돌아갈 "우리 사이트 안의" 경로인지 확인. 아니면 빈 문자열.
 *
 * ⚠ startsWith('/') && !startsWith('//') 만으로는 부족하다.
 *   브라우저 URL 파서는 역슬래시와 탭/개행을 슬래시로 바꾸거나 지워 버려서
 *     /\evil.com  →  https://evil.com
 *     /<TAB>/evil.com → https://evil.com
 *   처럼 외부 사이트로 튕겨 나간다(오픈 리다이렉트). 로그인 직후 낯선 사이트로
 *   보내지면 그대로 피싱에 쓰인다. 그래서 최종적으로 만들어지는 주소의 출처까지 확인한다.
 */
export function safeNextPath(raw: any, base: string): string {
  const s = String(raw || '')
  if (!s.startsWith('/') || s.startsWith('//')) return ''
  if (/[\\\u0000-\u001f\u007f]/.test(s)) return ''
  try {
    const u = new URL(s, base)
    if (u.origin !== new URL(base).origin) return ''
    return (u.pathname + u.search + u.hash).slice(0, 300)
  } catch { return '' }
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
    creditPrice: u.credit_price == null ? null : Number(u.credit_price), // 회원별 크레딧 구매 단가(원). null=전역/기본

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
    // 유료 플랜 보유 여부(승인된 플랜, 만료일 이전). 없으면 마케팅·영상 모두 사용 불가
    hasPlan: isAdmin
      || ((u.plan && u.plan !== '없음') && (!u.plan_until || u.plan_until > new Date().toISOString()))
      || ((u.video_plan && u.video_plan !== '없음') && (!u.video_plan_until || u.video_plan_until > new Date().toISOString()))
      ? 1 : 0,
    planUntil: u.plan_until || '',
    videoPlanUntil: u.video_plan_until || '',
    creditUntil: u.credit_until || '',
    pointUntil: u.point_until || '',
    // 팀 요금제(좌석당) — 만료일 이전이면 활성. 관리자는 항상 활성.
    teamPlan: isAdmin || (Number(u.team_plan) === 1 && u.team_until && u.team_until > new Date().toISOString()) ? 1 : 0,
    teamSeats: isAdmin ? 99 : Number(u.team_seats) || 0,
    teamUntil: u.team_until || '',
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
      // ⚠ status 검사가 빠져 있었다. 관리자가 계정을 정지시켜도 이미 로그인해 둔 세션은
      //   그대로 살아 있어서, 그 회원은 계속 크레딧을 쓰고 문자를 보낼 수 있었다
      //   (로그인 화면에서만 막혔다). 세션을 쓸 때마다 상태를 확인한다.
      //   status 가 비어 있는 과거 데이터는 정상으로 본다 — IS NULL 을 빼면 SQL 3값 논리 때문에
      //   그런 회원이 전부 로그아웃된다.
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?
         AND (u.status IS NULL OR u.status != 'suspended')`,
    )
    .bind(token, new Date().toISOString())
    .first()
  return row || null
}

/** MCP 개인 토큰으로 사용자 조회 (본인 계정 기준 크레딧 차감용). 없으면 null. */
export async function getUserByMcpToken(db: D1Database, token: string | null) {
  if (!token || token.length < 12) return null
  // 정지된 계정은 MCP 토큰으로도 들어올 수 없어야 한다(쿠키 세션과 같은 기준)
  const row = await db.prepare(
    "SELECT * FROM users WHERE mcp_token = ? AND (status IS NULL OR status != 'suspended') LIMIT 1",
  ).bind(token).first()
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

/** 관리자 계정 최소 보유 크레딧 — 내부 운영·테스트용(사실상 무제한) */
export const ADMIN_CREDIT_FLOOR = 10_000_000_000

/**
 * 관리자 계정의 크레딧을 항상 ADMIN_CREDIT_FLOOR 이상으로 유지한다.
 * 관리자 판정 기준은 requireAdminUser 와 동일(ADMIN_EMAIL 또는 role='admin').
 *
 * transactions 에는 기록하지 않는다 — 100억짜리 지급 내역이 들어가면
 * 크레딧 지급 리포트(credit-grants)·정산·매출 집계가 통째로 왜곡되기 때문.
 * 잔액이 이미 충분하면 아무 행도 바뀌지 않는다(멱등).
 */
export async function ensureAdminCredits(db: D1Database) {
  try {
    await db
      .prepare(
        `UPDATE users SET credits = ?
         WHERE (email = ? OR role = 'admin') AND (credits IS NULL OR credits < ?)`,
      )
      .bind(ADMIN_CREDIT_FLOOR, ADMIN_EMAIL, ADMIN_CREDIT_FLOOR)
      .run()
  } catch {
    /* 크레딧 보정 실패가 관리자 기능 자체를 막지 않도록 무시 */
  }
}

/** 관리자 계정이 없고 ADMIN_PASSWORD 환경변수가 설정된 경우에만 생성 (하드코딩 비밀번호 없음) */
export async function seedAdmin(db: D1Database, env: Env) {
  const pw = adminPassword(env)
  if (pw) {
    const row = await db.prepare('SELECT id FROM users WHERE email = ?').bind(ADMIN_EMAIL).first()
    if (!row) {
      const now = new Date().toISOString()
      const ph = await hashPassword(pw)
      await db
        .prepare(
          `INSERT OR IGNORE INTO users (id, name, email, password_hash, company, plan, role, status, created_at, last_active)
           VALUES ('admin_root', '관리자', ?, ?, '(주)넥스트 바이전시', 'Business', 'admin', 'active', ?, ?)`,
        )
        .bind(ADMIN_EMAIL, ph, now, now)
        .run()
    }
  }
  // 계정 생성 여부·ADMIN_PASSWORD 설정 여부와 무관하게 관리자 크레딧은 항상 채워둔다
  await ensureAdminCredits(db)
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
  // IP↔회원 영구 매핑 갱신 — 세션이 만료·삭제돼도 어느 회원이 그 IP를 썼는지 추적 가능
  const ip = meta?.ip || ''
  if (ip && ip !== 'unknown') {
    await db
      .prepare(`INSERT INTO ip_identities (ip, user_id, email, name, role, first_seen, last_seen)
                SELECT ?, id, email, name, role, ?, ? FROM users WHERE id = ?
                ON CONFLICT(ip, user_id) DO UPDATE SET last_seen = excluded.last_seen, email = excluded.email, name = excluded.name, role = excluded.role`)
      .bind(ip, nowIso, nowIso, userId)
      .run()
      .catch(() => {})
  }
  return token
}
