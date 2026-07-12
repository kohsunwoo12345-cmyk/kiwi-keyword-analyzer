// Cloudflare Pages Functions 공용 유틸 (_ 프리픽스 = 라우팅 제외, import 전용)

export const ADMIN_EMAIL = 'kohsunwoo12345@gmail.com'
export const DEFAULT_ADMIN_PASSWORD = 'Bygency!2026'
export const SESSION_COOKIE = 'bg_session'
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30 // 30일

export interface Env {
  DB: D1Database
  BUCKET?: R2Bucket
  ADMIN_PASSWORD?: string
}

/** 관리자 비밀번호 (환경변수 ADMIN_PASSWORD 우선, 없으면 기본값) */
export function adminPassword(env: Env): string {
  return (env && env.ADMIN_PASSWORD) || DEFAULT_ADMIN_PASSWORD
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

/** users/sessions 테이블이 없으면 생성 (최초 요청 시 자동 부트스트랩) */
export async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      company TEXT,
      plan TEXT DEFAULT 'Starter',
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
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
  ])
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

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(':')
  if (!salt) return false
  const check = await hashPassword(password, salt)
  return check === stored
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
    plan: u.plan || 'Starter',
    role: isAdmin ? 'admin' : 'user',
    status: u.status || 'active',
    createdAt: u.created_at,
    lastActive: u.last_active,
  }
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

/** 관리자 계정이 없으면 확정 비밀번호로 미리 생성 */
export async function seedAdmin(db: D1Database, env: Env) {
  const row = await db.prepare('SELECT id FROM users WHERE email = ?').bind(ADMIN_EMAIL).first()
  if (row) return
  const now = new Date().toISOString()
  const ph = await hashPassword(adminPassword(env))
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, name, email, password_hash, company, plan, role, status, created_at, last_active)
       VALUES ('admin_root', '관리자', ?, ?, '(주)Next Vision Company', 'Business', 'admin', 'active', ?, ?)`,
    )
    .bind(ADMIN_EMAIL, ph, now, now)
    .run()
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  const nowIso = new Date().toISOString()
  const exp = new Date(Date.now() + SESSION_TTL_SEC * 1000).toISOString()
  await db
    .prepare(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(token, userId, nowIso, exp)
    .run()
  return token
}
