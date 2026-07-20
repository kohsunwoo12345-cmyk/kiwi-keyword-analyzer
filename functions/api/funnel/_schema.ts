// 퍼널(랜딩페이지 제작) 전용 스키마 자동 부트스트랩 (_ 프리픽스 = 라우팅 제외, import 전용)
// SUPERPLACE 원본 핸들러가 사용하는 funnel_* 테이블을 CF Pages 환경에서 자동 생성한다.

export async function ensureFunnelSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS funnel_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      funnel_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      created_at TEXT,
      updated_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS funnel_landing_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      title TEXT,
      slug TEXT,
      description TEXT,
      form_fields_json TEXT,
      html_content TEXT,
      css_content TEXT,
      status TEXT DEFAULT 'active',
      og_title TEXT,
      og_description TEXT,
      thumbnail_url TEXT,
      page_header_scripts TEXT,
      created_at TEXT,
      updated_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS funnel_applicants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landing_page_id INTEGER,
      data_json TEXT,
      created_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS funnel_ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landing_page_id INTEGER,
      name TEXT,
      traffic_split_a INTEGER,
      traffic_split_b INTEGER,
      variant_type TEXT,
      variant_html TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS funnel_auto_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      group_id INTEGER,
      landing_page_id INTEGER,
      type TEXT,
      subject TEXT,
      content TEXT,
      timing TEXT,
      trigger TEXT,
      status TEXT DEFAULT 'active',
      sender_number TEXT,
      created_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS funnel_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      group_id INTEGER,
      steps_json TEXT,
      created_at TEXT,
      updated_at TEXT
    )`),
  ])
  // 신규 컬럼 보강: 알림톡 템플릿 코드(자동응답), CRM 캠페인 로그 테이블
  try {
    const info = await db.prepare(`PRAGMA table_info(funnel_auto_responses)`).all()
    const cols = new Set((info.results || []).map((r: any) => r.name))
    if (!cols.has('tpl_code')) await db.prepare(`ALTER TABLE funnel_auto_responses ADD COLUMN tpl_code TEXT`).run().catch(() => {})
  } catch { /* ignore */ }
  await db.prepare(`CREATE TABLE IF NOT EXISTS crm_campaigns (
    id TEXT PRIMARY KEY,
    admin_id TEXT,
    segment TEXT,
    plan TEXT,
    channel TEXT,
    content TEXT,
    sender TEXT,
    schedule_at TEXT,
    total INTEGER DEFAULT 0,
    sent INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0,
    status TEXT,
    created_at TEXT NOT NULL
  )`).run().catch(() => {})
}
