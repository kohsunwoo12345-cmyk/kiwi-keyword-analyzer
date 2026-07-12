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
}
