// 퍼널(랜딩페이지 제작) 전용 스키마 자동 부트스트랩 (_ 프리픽스 = 라우팅 제외, import 전용)
// SUPERPLACE 원본 핸들러가 사용하는 funnel_* 테이블을 CF Pages 환경에서 자동 생성한다.

// 테이블에 없는 컬럼만 ALTER 로 추가 (idempotent). PRAGMA 로 현재 컬럼을 조회 후 부족한 것만 실행.
async function addFunnelCols(db: D1Database, table: string, defs: Record<string, string>) {
  try {
    const info = await db.prepare(`PRAGMA table_info(${table})`).all()
    const cols = new Set(((info.results as any[]) || []).map((r: any) => r.name))
    for (const [name, sql] of Object.entries(defs)) {
      if (!cols.has(name)) await db.prepare(sql).run().catch(() => {})
    }
  } catch { /* ignore */ }
}

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
  // 신규 컬럼 보강: 알림톡 템플릿 코드(자동응답), 랜딩페이지 조회수, CRM 캠페인 로그 테이블
  try {
    const info = await db.prepare(`PRAGMA table_info(funnel_auto_responses)`).all()
    const cols = new Set((info.results || []).map((r: any) => r.name))
    if (!cols.has('tpl_code')) await db.prepare(`ALTER TABLE funnel_auto_responses ADD COLUMN tpl_code TEXT`).run().catch(() => {})
  } catch { /* ignore */ }
  try {
    const info = await db.prepare(`PRAGMA table_info(funnel_landing_pages)`).all()
    const cols = new Set((info.results || []).map((r: any) => r.name))
    if (!cols.has('views')) await db.prepare(`ALTER TABLE funnel_landing_pages ADD COLUMN views INTEGER DEFAULT 0`).run().catch(() => {})
  } catch { /* ignore */ }
  // SUPERPLACE 퍼널 계층: funnels(부모) — 랜딩 분석/빌더가 funnels→groups→pages 구조를 사용
  await db.prepare(`CREATE TABLE IF NOT EXISTS funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    description TEXT,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'active',
    nodes_json TEXT,
    edges_json TEXT,
    db_dedup_mode TEXT DEFAULT 'none',
    header_scripts TEXT,
    created_at TEXT,
    updated_at TEXT
  )`).run().catch(() => {})
  // 퍼널 빌더 캔버스/설정 컬럼 보강 (구버전 funnels 테이블 대응)
  await addFunnelCols(db, 'funnels', {
    category: `ALTER TABLE funnels ADD COLUMN category TEXT DEFAULT 'general'`,
    nodes_json: `ALTER TABLE funnels ADD COLUMN nodes_json TEXT`,
    edges_json: `ALTER TABLE funnels ADD COLUMN edges_json TEXT`,
    db_dedup_mode: `ALTER TABLE funnels ADD COLUMN db_dedup_mode TEXT DEFAULT 'none'`,
    header_scripts: `ALTER TABLE funnels ADD COLUMN header_scripts TEXT`,
  })
  // 그룹: 빌더 캔버스 좌표/유형/정렬 컬럼 보강
  await addFunnelCols(db, 'funnel_groups', {
    group_type: `ALTER TABLE funnel_groups ADD COLUMN group_type TEXT DEFAULT 'entry'`,
    sort_order: `ALTER TABLE funnel_groups ADD COLUMN sort_order INTEGER DEFAULT 0`,
    pos_x: `ALTER TABLE funnel_groups ADD COLUMN pos_x INTEGER DEFAULT 0`,
    pos_y: `ALTER TABLE funnel_groups ADD COLUMN pos_y INTEGER DEFAULT 0`,
  })
  // 신청자: SUPERPLACE 빌더가 읽는 정규 컬럼(name/phone/email/additional_data) 보강 (기존 data_json 병행)
  await addFunnelCols(db, 'funnel_applicants', {
    name: `ALTER TABLE funnel_applicants ADD COLUMN name TEXT`,
    phone: `ALTER TABLE funnel_applicants ADD COLUMN phone TEXT`,
    email: `ALTER TABLE funnel_applicants ADD COLUMN email TEXT`,
    additional_data: `ALTER TABLE funnel_applicants ADD COLUMN additional_data TEXT`,
    ip_address: `ALTER TABLE funnel_applicants ADD COLUMN ip_address TEXT`,
    user_agent: `ALTER TABLE funnel_applicants ADD COLUMN user_agent TEXT`,
  })
  // 일반 랜딩(비퍼널) 폼 제출 저장소 (SUPERPLACE form_submissions 호환)
  await db.prepare(`CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER DEFAULT 0,
    landing_page_id INTEGER,
    name TEXT,
    phone TEXT,
    email TEXT,
    additional_data TEXT,
    landing_slug TEXT,
    landing_title TEXT,
    form_fields TEXT,
    created_at TEXT
  )`).run().catch(() => {})
  // 그룹 연결(퍼널 빌더 캔버스의 그룹→그룹 연결선)
  await db.prepare(`CREATE TABLE IF NOT EXISTS funnel_group_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funnel_id INTEGER,
    from_group_id INTEGER,
    to_group_id INTEGER,
    condition_type TEXT DEFAULT 'always',
    label TEXT,
    created_at TEXT
  )`).run().catch(() => {})
  // 그룹에 funnel_id 가 없으면(구버전) 그룹당 funnel 을 만들어 연결 — 분석이 페이지를 인식하도록
  try {
    const orphans = (await db.prepare(`SELECT id, user_id, name FROM funnel_groups WHERE funnel_id IS NULL OR funnel_id = 0`).all()).results || []
    for (const g of orphans as any[]) {
      const r: any = await db.prepare(`INSERT INTO funnels (user_id, name, created_at) VALUES (?, ?, ?)`).bind(g.user_id || '', g.name || '퍼널', new Date().toISOString()).run()
      const fid = r?.meta?.last_row_id
      if (fid) await db.prepare(`UPDATE funnel_groups SET funnel_id = ? WHERE id = ?`).bind(fid, g.id).run()
    }
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
