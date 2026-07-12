// Instagram 공용 헬퍼 (_ 프리픽스 = 라우팅 제외, import 전용)
// SUPERPLACE index.tsx 의 /api/instagram/* 엔드포인트를 Cloudflare Pages Functions 로 이식

/** Instagram DM 자동화 / 계정 / 앱 설정 테이블 자동 부트스트랩 */
export async function ensureIgSchema(db: D1Database) {
  try {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS instagram_dm_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        keywords TEXT NOT NULL,
        message TEXT NOT NULL,
        post_url TEXT,
        cooldown_days INTEGER DEFAULT 1,
        active INTEGER DEFAULT 1,
        sent_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS instagram_dm_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id INTEGER,
        recipient_id TEXT,
        recipient_username TEXT,
        trigger_keyword TEXT,
        trigger_comment_id TEXT,
        trigger_post_id TEXT,
        message TEXT,
        status TEXT DEFAULT 'sent',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS instagram_webhook_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT,
        payload TEXT,
        processed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS instagram_account_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        ig_business_id TEXT,
        ig_username TEXT,
        access_token TEXT,
        ig_profile_pic TEXT,
        follower_count INTEGER DEFAULT 0,
        token_expires_at DATETIME,
        is_connected INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS instagram_app_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        app_id TEXT NOT NULL,
        app_secret TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )`),
    ])
  } catch (_) {
    /* ignore */
  }
}

/** 앱 설정 조회 (DB 우선, 없으면 환경변수) */
export async function getIgAppConfig(env: any, db: D1Database): Promise<{ appId: string; appSecret: string; source: string }> {
  try {
    const row: any = await db.prepare(`SELECT app_id, app_secret FROM instagram_app_config WHERE id = 1 LIMIT 1`).first()
    if (row?.app_id) {
      return { appId: row.app_id, appSecret: row.app_secret || '', source: 'db' }
    }
  } catch (_) {}
  const appId = (env as any)?.Instargram_ID || ''
  const appSecret = (env as any)?.Instargram_APP_SECRET || ''
  return { appId, appSecret, source: 'env' }
}

/** DB에서 유저의 access_token + ig_business_id 조회 */
export async function getIgCredentials(
  db: D1Database,
  userId: string,
): Promise<{ token: string; igId: string; username: string } | null> {
  try {
    const row = (await db
      .prepare(`SELECT access_token, ig_business_id, ig_username FROM instagram_account_settings WHERE user_id = ? AND is_connected = 1 LIMIT 1`)
      .bind(userId)
      .first()) as any
    if (!row || !row.access_token || !row.ig_business_id) return null
    return { token: row.access_token, igId: row.ig_business_id, username: row.ig_username || '' }
  } catch {
    return null
  }
}
