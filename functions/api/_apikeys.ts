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
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_calls_status ON api_calls(user_id, status)`).run().catch(() => {})
  // 남용 방지용 레이트리밋 히트 로그 (요청 1건당 1행, 슬라이딩 윈도우 집계)
  await db.prepare(`CREATE TABLE IF NOT EXISTS api_rate (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    kind TEXT,
    ts TEXT NOT NULL
  )`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_rate_user ON api_rate(user_id, kind, ts)`).run().catch(() => {})
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_rate_ts ON api_rate(ts)`).run().catch(() => {})
}

/** 남용 방지 한도 — 생성(POST) / 상태조회(GET) / 동시 진행 */
export const API_RATE = { postMin: 20, postHour: 300, postDay: 2000, getMin: 120, getHour: 3000, concurrent: 3 }

/** 슬라이딩 윈도우 레이트리밋. 요청마다 히트를 기록하고 초과 시 { ok:false } 반환.
 *  관리자는 면제. kind: 'post'(생성) | 'get'(상태조회) */
export async function enforceRateLimit(
  db: D1Database, userId: string, kind: 'post' | 'get', isAdmin?: boolean,
): Promise<{ ok: boolean; retryAfter?: number; reason?: string }> {
  if (isAdmin) return { ok: true }
  const now = Date.now()
  const iso = (ms: number) => new Date(now - ms).toISOString()
  try {
    await db.prepare(`INSERT INTO api_rate (id, user_id, kind, ts) VALUES (?, ?, ?, ?)`)
      .bind('rl_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18), userId, kind, new Date(now).toISOString()).run()
  } catch { /* 기록 실패해도 계속 (락아웃 방지) */ }
  // 오래된 히트 정리 (가끔)
  try { if (Math.random() < 0.04) await db.prepare(`DELETE FROM api_rate WHERE ts < ?`).bind(iso(25 * 3600000)).run() } catch {}
  const cnt = async (ms: number, k: string): Promise<number> => {
    try { const r: any = await db.prepare(`SELECT COUNT(*) AS n FROM api_rate WHERE user_id=? AND kind=? AND ts>?`).bind(userId, k, iso(ms)).first(); return Number(r?.n || 0) } catch { return 0 }
  }
  if (kind === 'post') {
    if (await cnt(60000, 'post') > API_RATE.postMin) return { ok: false, retryAfter: 60, reason: `분당 생성 요청 한도(${API_RATE.postMin})를 초과했습니다. 잠시 후 다시 시도하세요.` }
    if (await cnt(3600000, 'post') > API_RATE.postHour) return { ok: false, retryAfter: 600, reason: `시간당 생성 요청 한도(${API_RATE.postHour})를 초과했습니다.` }
    if (await cnt(86400000, 'post') > API_RATE.postDay) return { ok: false, retryAfter: 3600, reason: `일일 생성 요청 한도(${API_RATE.postDay})를 초과했습니다.` }
    // 동시 진행 중(pending) 생성 제한
    try {
      const p: any = await db.prepare(`SELECT COUNT(*) AS n FROM api_calls WHERE user_id=? AND status='pending' AND created_at>?`).bind(userId, iso(300000)).first()
      if (Number(p?.n || 0) >= API_RATE.concurrent) return { ok: false, retryAfter: 15, reason: `동시에 진행 중인 생성이 너무 많습니다(최대 ${API_RATE.concurrent}). 완료 후 다시 시도하세요.` }
    } catch {}
  } else {
    if (await cnt(60000, 'get') > API_RATE.getMin) return { ok: false, retryAfter: 30, reason: `분당 상태 조회 한도를 초과했습니다.` }
    if (await cnt(3600000, 'get') > API_RATE.getHour) return { ok: false, retryAfter: 600, reason: `시간당 상태 조회 한도를 초과했습니다.` }
  }
  return { ok: true }
}

/** 생성 시작 시 pending 호출 기록 (동시성 카운트·감사 로그). 반환: callId */
export async function beginApiCall(
  db: D1Database, o: { keyId?: string; userId?: string; endpoint?: string; provider?: string; model?: string; kind?: string },
): Promise<string> {
  const id = 'ac_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18)
  try {
    await db.prepare(`INSERT INTO api_calls (id, key_id, user_id, endpoint, provider, model, kind, credits, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)`)
      .bind(id, o.keyId || '', o.userId || '', o.endpoint || '', o.provider || '', o.model || '', o.kind || '', new Date().toISOString()).run()
  } catch { /* ignore */ }
  return id
}

/** 생성 종료 시 pending 호출을 확정 (ok/failed + 차감 크레딧) */
export async function finishApiCall(
  db: D1Database, id: string, o: { status?: string; credits?: number; error?: string },
) {
  if (!id) return
  try {
    await db.prepare(`UPDATE api_calls SET status=?, credits=?, error=? WHERE id=?`)
      .bind(o.status || 'ok', Number(o.credits || 0), String(o.error || '').slice(0, 300), id).run()
  } catch { /* ignore */ }
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

/** 회원이 노드형 AI 영상 플랜(=영상 도구) 보유자인지 — API 접근 자격.
 *  users 원본 행(snake_case)과 매핑된 객체(camelCase) 모두 지원. */
export function hasVideoApiAccess(user: any): boolean {
  if (!user) return false
  if (user.role === 'admin' || user.isAdmin) return true
  const now = new Date().toISOString()
  // 원본 행: video_plan / video_plan_until, 매핑 객체: videoPlan / videoPlanUntil
  const vplan = user.video_plan != null ? user.video_plan : user.videoPlan
  const vuntil = user.video_plan_until != null ? user.video_plan_until : user.videoPlanUntil
  if (vplan && vplan !== '없음' && (!vuntil || String(vuntil) > now)) return true
  // 매핑 객체가 hasPlan 을 직접 제공하고 video 제품을 쓰는 경우도 허용
  const products = String(user.products || '')
  if ((user.hasPlan === 1 || user.hasPlan === true) && (products === 'both' || products === 'video')) return true
  return false
}
