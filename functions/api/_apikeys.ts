// 회원 API 키 시스템 (_ 프리픽스 = 라우팅 제외, import 전용)
//  - 노드형 AI 영상 플랜 보유자가 직접 API 로 이미지·영상 모델을 호출.
//  - 키 1개로 모든 모델 호출 가능. 크레딧은 UI 사용과 동일하게 차감.
//  - 키는 생성 시 1회만 평문 노출, 이후 해시(SHA-256)만 보관 → 재표시 불가.
//  - 회원당 최대 20개.

export const API_KEY_MAX = 20
export const API_KEY_PREFIX = 'bg_live_'

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 새 API 키 평문 생성 — bg_live_ + 48 hex */
export function generateApiKeyPlain(): string {
  const a = crypto.randomUUID().replace(/-/g, '')
  const b = crypto.randomUUID().replace(/-/g, '')
  return API_KEY_PREFIX + (a + b).slice(0, 48)
}

/** 평문 키 → 저장용 해시 */
export function hashApiKey(plain: string): Promise<string> {
  return sha256Hex(String(plain || '').trim())
}

/** 표시용 마스킹 (앞 12자 + …) — 예: bg_live_ab12… */
export function maskApiKey(plain: string): string {
  const s = String(plain || '')
  return s.slice(0, 12) + '…' + s.slice(-4)
}

export async function ensureApiKeysSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT,
    key_hash TEXT NOT NULL,
    key_masked TEXT,
    status TEXT DEFAULT 'active',
    call_count INTEGER DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT NOT NULL,
    revoked_at TEXT
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)`).run().catch(() => {})
  // 호출 기록 (관리자 대시보드에서 사용량·크레딧 확인용)
  await db.prepare(`CREATE TABLE IF NOT EXISTS api_calls (
    id TEXT PRIMARY KEY,
    key_id TEXT,
    user_id TEXT,
    endpoint TEXT,
    provider TEXT,
    model TEXT,
    kind TEXT,
    credits REAL DEFAULT 0,
    status TEXT,
    error TEXT,
    created_at TEXT NOT NULL
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_calls_user ON api_calls(user_id)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_calls_created ON api_calls(created_at)`).run().catch(() => {})
}

/** Authorization: Bearer bg_live_... 로 회원 조회. 유효하면 사용 시각/카운트 갱신.
 *  반환: { user, keyId } | null */
export async function getUserByApiKey(db: D1Database, authHeader: string | null): Promise<{ user: any; keyId: string } | null> {
  const raw = String(authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!raw || !raw.startsWith(API_KEY_PREFIX)) return null
  try {
    const h = await hashApiKey(raw)
    const key: any = await db.prepare(`SELECT id, user_id, status FROM api_keys WHERE key_hash = ? LIMIT 1`).bind(h).first()
    if (!key || key.status !== 'active') return null
    const user: any = await db.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).bind(key.user_id).first()
    if (!user) return null
    // 사용 기록 갱신 (best-effort)
    await db.prepare(`UPDATE api_keys SET last_used_at = ?, call_count = COALESCE(call_count,0) + 1 WHERE id = ?`)
      .bind(new Date().toISOString(), key.id).run().catch(() => {})
    return { user, keyId: key.id }
  } catch {
    return null
  }
}

/** API 호출 1건 기록 */
export async function logApiCall(
  db: D1Database,
  o: { keyId?: string; userId?: string; endpoint?: string; provider?: string; model?: string; kind?: string; credits?: number; status?: string; error?: string },
) {
  try {
    await ensureApiKeysSchema(db)
    await db.prepare(`INSERT INTO api_calls (id, key_id, user_id, endpoint, provider, model, kind, credits, status, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind('ac_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18),
        o.keyId || '', o.userId || '', o.endpoint || '', o.provider || '', o.model || '', o.kind || '',
        Number(o.credits || 0), o.status || 'ok', String(o.error || '').slice(0, 300), new Date().toISOString())
      .run()
  } catch { /* ignore */ }
}

/** 회원이 노드형 AI 영상 플랜(=영상 도구) 보유자인지 — API 접근 자격 */
export function hasVideoApiAccess(user: any): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  const products = String(user.products || '')
  const hasPlan = user.hasPlan === 1 || user.hasPlan === '1' || (user.plan && user.plan !== '없음')
  return hasPlan && (products === 'both' || products === 'video' || !products)
}
