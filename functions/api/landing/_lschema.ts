// SUPERPLACE 랜딩 시스템 이식 — 스키마.  user_id 는 우리 users.id(TEXT) 사용.
import type { D1Database } from '@cloudflare/workers-types'

export async function ensureLandingSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS landing_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    academy_id TEXT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    template_type TEXT,
    content_json TEXT,
    content TEXT,
    html_content TEXT,
    status TEXT DEFAULT 'published',
    view_count INTEGER DEFAULT 0,
    qr_code_url TEXT,
    og_title TEXT,
    og_description TEXT,
    thumbnail_url TEXT,
    folder_id INTEGER,
    form_id INTEGER,
    form_fields TEXT,
    header_pixel TEXT,
    body_pixel TEXT,
    conversion_pixel TEXT,
    header_script TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lp_user ON landing_pages(user_id)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lp_slug ON landing_pages(slug)`).run().catch(() => {})
  // 누락 컬럼 보강(구버전 대응)
  //  ⚠ 위 CREATE TABLE 은 테이블이 "없을 때만" 만든다. 이미 예전 형태로 만들어져 있는
  //     배포본에는 아무 영향이 없으므로, 코드가 읽고 쓰는 컬럼은 여기에 전부 있어야 한다.
  //     예전에는 html_content·content·status·og_* 가 빠져 있었다. 그 결과 구버전 테이블에서는
  //     랜딩 저장/편집(/api/landing/:slug/edit, /api/landing/create)이 통째로 500 이 났다 —
  //     빌더에서 "저장"을 눌러도 아무 일도 일어나지 않는 상태가 된다.
  for (const col of [
    'subtitle TEXT', 'thumbnail_url TEXT', 'form_fields TEXT', 'header_script TEXT',
    'header_pixel TEXT', 'body_pixel TEXT', 'conversion_pixel TEXT', 'folder_id INTEGER', 'form_id INTEGER',
    'academy_id TEXT', 'template_type TEXT', 'content_json TEXT', 'content TEXT', 'html_content TEXT',
    "status TEXT DEFAULT 'published'", 'view_count INTEGER DEFAULT 0', 'qr_code_url TEXT',
    'og_title TEXT', 'og_description TEXT',
  ]) {
    await db.prepare(`ALTER TABLE landing_pages ADD COLUMN ${col}`).run().catch(() => {})
  }
  await db.prepare(`CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    landing_page_id INTEGER,
    landing_slug TEXT,
    landing_title TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    additional_data TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_fs_lp ON form_submissions(landing_page_id)`).run().catch(() => {})
  await db.prepare(`CREATE TABLE IF NOT EXISTS landing_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(() => {})
  await db.prepare(`ALTER TABLE landing_folders ADD COLUMN updated_at TEXT`).run().catch(() => {})
  // 유입 경로 공유 링크
  await db.prepare(`CREATE TABLE IF NOT EXISTS landing_traffic_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL,
    title TEXT, subtitle TEXT, thumbnail_url TEXT, og_title TEXT, og_description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(() => {})
  await db.prepare(`CREATE TABLE IF NOT EXISTS landing_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_type TEXT UNIQUE,
    name TEXT,
    html_template TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(() => {})
  await db.prepare(`CREATE TABLE IF NOT EXISTS landing_page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    landing_page_id INTEGER,
    landing_slug TEXT,
    user_agent TEXT,
    referrer TEXT,
    utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
    ip_address TEXT, country TEXT, region TEXT, city TEXT, latitude TEXT, longitude TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(() => {})
  for (const col of ['landing_slug TEXT', 'utm_source TEXT', 'utm_medium TEXT', 'utm_campaign TEXT', 'utm_content TEXT', 'utm_term TEXT', 'ip_address TEXT', 'country TEXT', 'region TEXT', 'city TEXT', 'latitude TEXT', 'longitude TEXT']) {
    await db.prepare(`ALTER TABLE landing_page_views ADD COLUMN ${col}`).run().catch(() => {})
  }
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lpv_slug ON landing_page_views(landing_slug, created_at)`).run().catch(() => {})
}

export function randSlug(): string {
  return Math.random().toString(36).substring(2, 10)
}

/**
 * landing_pages 는 두 곳에서 만들어진다.
 *  - _utils.ensureSchema      : id TEXT PRIMARY KEY,          created_at TEXT NOT NULL (기본값 없음)
 *  - 이 파일 ensureLandingSchema: id INTEGER PK AUTOINCREMENT, created_at 기본값 있음
 * CREATE TABLE IF NOT EXISTS 라 "먼저 만든 쪽" 이 이긴다. ensureSchema 는 로그인·/api/me 등
 * 거의 모든 요청에서 도니 실제 배포본은 TEXT id 쪽이다. 그런데 create.ts 는 INTEGER 쪽을
 * 가정해 id·created_at 을 넣지 않았고, 그래서 랜딩 "새로 만들기" 가 통째로 실패했다.
 * 어느 모양이든 동작하도록 실제 컬럼 정의를 읽어서 판단한다.
 */
export async function landingIdShape(db: D1Database): Promise<{ textId: boolean; needsCreatedAt: boolean }> {
  try {
    const { results } = await db.prepare(`PRAGMA table_info(landing_pages)`).all()
    const cols = (results as any[]) || []
    const id = cols.find((c) => String(c.name) === 'id')
    const created = cols.find((c) => String(c.name) === 'created_at')
    // INTEGER PRIMARY KEY 만 rowid 별칭(자동 채번)이다. 그 외에는 우리가 값을 만들어 넣어야 한다.
    const textId = !(id && String(id.type || '').toUpperCase() === 'INTEGER' && Number(id.pk) === 1)
    const needsCreatedAt = !!created && Number(created.notnull) === 1 && created.dflt_value == null
    return { textId, needsCreatedAt }
  } catch {
    return { textId: true, needsCreatedAt: true }
  }
}

export function newLandingId(): string {
  return 'lp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

/** HTML 폼에서 필드명 추출 (name 속성) */
export function extractFormFields(html: string): string | null {
  try {
    const names = new Set<string>()
    const re = /<(?:input|select|textarea)[^>]*\bname\s*=\s*["']([^"']+)["']/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(String(html || '')))) names.add(m[1])
    return names.size ? JSON.stringify([...names]) : null
  } catch { return null }
}
