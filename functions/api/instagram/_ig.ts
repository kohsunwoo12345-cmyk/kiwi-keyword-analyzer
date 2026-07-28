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

  // ── 회원 구분 컬럼 보강 ────────────────────────────────────────────────────
  //  이식 당시 이 기능에는 회원 개념이 없어서 규칙·발송내역·웹훅내역이 전부 한 덩어리였다.
  //  (instagram_dm_rules 에는 user_id 컬럼이 있는데 아무도 쓰지 않았다)
  //  그래서 로그인만 하면 남의 DM 규칙과 발송 내역이 보였고, 웹훅이 들어오면
  //  "그 계정 주인의 규칙" 이 아니라 이 사이트의 모든 규칙이 한꺼번에 돌았다.
  for (const [tbl, col] of [
    ['instagram_dm_rules', 'user_id TEXT'],
    ['instagram_dm_logs', 'user_id TEXT'],
    ['instagram_webhook_logs', 'user_id TEXT'],
  ]) {
    await db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col}`).run().catch(() => {})
  }
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_ig_rules_user ON instagram_dm_rules(user_id)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_ig_logs_user ON instagram_dm_logs(user_id)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_ig_wh_user ON instagram_webhook_logs(user_id)`).run().catch(() => {})

  // ── 예전 데이터 귀속 ───────────────────────────────────────────────────────
  //  주인이 비어 있는 기존 행을 그냥 두면 아무에게도 안 보이고 웹훅도 무시하게 되어
  //  잘 돌던 설정이 조용히 멈춘다. 연결된 인스타 계정이 "딱 하나" 일 때만 그 회원 것으로 넘긴다.
  //  둘 이상이면 누구 것인지 알 수 없으므로 손대지 않는다(잘못 넘기면 남의 규칙이 된다).
  try {
    const owners: any = await db.prepare(
      `SELECT DISTINCT user_id FROM instagram_account_settings WHERE is_connected = 1 AND user_id IS NOT NULL AND user_id != ''`,
    ).all()
    const list = (owners?.results || []) as any[]
    if (list.length === 1) {
      const uid = String(list[0].user_id)
      for (const tbl of ['instagram_dm_rules', 'instagram_dm_logs', 'instagram_webhook_logs']) {
        await db.prepare(`UPDATE ${tbl} SET user_id = ? WHERE user_id IS NULL OR user_id = ''`).bind(uid).run().catch(() => {})
      }
    }
  } catch { /* ignore */ }
}

/** 인스타 비즈니스 계정 ID(웹훅 entry.id) → 우리 회원 id. 연결된 계정이 없으면 null. */
export async function igOwnerByBusinessId(db: D1Database, igBusinessId: string): Promise<string | null> {
  if (!igBusinessId) return null
  try {
    const row: any = await db.prepare(
      `SELECT user_id FROM instagram_account_settings WHERE ig_business_id = ? AND is_connected = 1 LIMIT 1`,
    ).bind(igBusinessId).first()
    return row?.user_id ? String(row.user_id) : null
  } catch { return null }
}

/** 관리자인가 (다른 회원 것까지 볼 수 있는 유일한 예외) */
export function isIgAdmin(me: any): boolean {
  return !!me && (me.role === 'admin' || me.role === 'superadmin')
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
