// 모델 대여(lease) 공용 — _ 프리픽스 = 라우팅 제외, import 전용.
//
// 우리 초해상 모델은 서버에서 돌지 않는다. 브라우저(WASM)나 빌려간 쪽 기기에서 돈다 —
// Cloudflare Workers 로는 불가능하다(실측: 가벼운 모델도 1920×1080 한 장에 타일 45장 ×
// 1.44초 = 65초, 기본 모델은 24분. Workers CPU 한도를 한참 넘는다).
// 그래서 "이미지를 보내면 결과를 준다" 가 아니라 "모델 파일을 빌려준다" 로 만든다.
//
// 빌려주는 방식:
//   ① POST /api/v1/lease 로 대여를 신청하면 크레딧을 차감하고 서명된 리스 토큰을 준다
//   ② 그 토큰으로만 /api/v1/model-file/... 에서 가중치를 받을 수 있다
//   ③ 토큰은 기간이 지나면 만료되고, 관리자가 취소하면 즉시 막힌다
//
// 토큰을 왜 서명하나: 파일 주소만으로 받아갈 수 있으면 대여가 의미가 없다. 주소가 한 번
// 새면 누구나 영원히 받아간다. 서명·만료·취소가 있어야 "빌려준 것" 이 된다.

const ENC = new TextEncoder()

/** base64url (표준 base64 의 +/= 는 URL 에서 깨진다) */
function b64u(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function unb64u(s: string): Uint8Array {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/* 서명 열쇠 — 환경변수가 있으면 그걸 쓰고, 없으면 D1 에 한 번 만들어 두고 계속 쓴다.
   환경변수를 필수로 하면 설정을 안 한 배포에서 기능이 통째로 죽는다. 반대로 매번
   새로 만들면 이미 발급한 토큰이 전부 무효가 된다 — 그래서 저장해 두고 재사용한다. */
const __secretCache = new WeakMap<object, Promise<string>>()
export async function leaseSecret(db: D1Database, env: any): Promise<string> {
  const fromEnv = String(env?.LEASE_SECRET || env?.lease_secret || '').trim()
  if (fromEnv) return fromEnv
  const key = db as unknown as object
  const hit = __secretCache.get(key)
  if (hit) return hit
  const run = (async () => {
    await db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run().catch(() => {})
    const row: any = await db.prepare("SELECT value FROM settings WHERE key = 'lease_secret'").first().catch(() => null)
    if (row?.value) return String(row.value)
    const made = b64u(crypto.getRandomValues(new Uint8Array(32)))
    await db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('lease_secret',?)").bind(made).run().catch(() => {})
    //  경쟁 상태: 두 요청이 동시에 만들면 나중 것이 이긴다 → 저장된 값을 다시 읽어 그걸 쓴다
    const back: any = await db.prepare("SELECT value FROM settings WHERE key = 'lease_secret'").first().catch(() => null)
    return String(back?.value || made)
  })().catch((e) => { __secretCache.delete(key); throw e })
  __secretCache.set(key, run)
  return run
}

async function hmac(secret: string, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', ENC.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, ENC.encode(msg)))
}

export interface LeasePayload { l: string; u: string; m: string; e: number }

export async function signLease(secret: string, p: LeasePayload): Promise<string> {
  const body = b64u(ENC.encode(JSON.stringify(p)))
  const sig = b64u(await hmac(secret, body))
  return body + '.' + sig
}

/** 서명·만료만 본다(취소 여부는 DB 에서 따로 확인). 실패하면 null. */
export async function verifyLease(secret: string, token: string): Promise<LeasePayload | null> {
  const t = String(token || '').trim()
  const dot = t.indexOf('.')
  if (dot <= 0) return null
  const body = t.slice(0, dot), sig = t.slice(dot + 1)
  let expect: Uint8Array
  try { expect = await hmac(secret, body) } catch { return null }
  const got = (() => { try { return unb64u(sig) } catch { return null } })()
  if (!got || got.length !== expect.length) return null
  /* 같은지 볼 때 한 바이트라도 빨리 끝내면 안 된다 — 어디까지 맞았는지가 시간으로 새어
     서명을 한 글자씩 맞춰 나갈 수 있다(타이밍 공격). 전부 훑고 마지막에 판단한다. */
  let diff = 0
  for (let i = 0; i < expect.length; i++) diff |= expect[i] ^ got[i]
  if (diff !== 0) return null
  let p: LeasePayload
  try { p = JSON.parse(new TextDecoder().decode(unb64u(body))) } catch { return null }
  if (!p || !p.l || !p.u || !p.m || !p.e) return null
  if (Date.now() / 1000 > p.e) return null
  return p
}

/* ── 빌려주는 모델 목록 ──
   파일은 우리 저장소(public/models-sr)에 있는 것만 준다. 외부에서 받아 오는 모델은
   라이선스가 우리 것이 아니라 빌려줄 권리가 없다 — 그래서 목록을 코드에 고정한다. */
export interface LendableFile { name: string; path: string; bytes?: number }
export interface Lendable {
  id: string
  title: string
  kind: 'upscale'
  scale: number
  license: string
  source: string
  files: LendableFile[]
  note: string
}
export const LENDABLE: Record<string, Lendable> = {
  'sr-x4-fast': {
    id: 'sr-x4-fast',
    title: '초해상 ×4 (가벼운 모델)',
    kind: 'upscale',
    scale: 4,
    license: 'MIT (© 2022 Kevin Scott, UpscalerJS esrgan-medium)',
    source: 'https://github.com/thekevinscott/upscaler',
    files: [{ name: 'rdn-medium-x4.onnx', path: 'public/models-sr/rdn-medium-x4.onnx' }],
    note:
      'RDN ×4, 파라미터 704,611. onnxruntime-web(WASM)으로 CPU 에서 돈다. ' +
      '같은 조건에서 잰 값: 타일 128 기준 1.44초 (Real-ESRGAN x4plus 는 32.50초 — 22.6배 빠르다). ' +
      '입출력은 NCHW float32 0~1 이고 ×255/÷255 와 Clip(0,1) 은 그래프 안에 들어 있다.',
  },
}

/** 리스 표 보장 (한 isolate 에서 한 번만 — D1 질의는 서브리퀘스트 한도를 갉아먹는다) */
const __leaseReady = new WeakMap<object, Promise<void>>()
export async function ensureLeaseSchema(db: D1Database): Promise<void> {
  const key = db as unknown as object
  const done = __leaseReady.get(key)
  if (done) return done
  const run = (async () => {
    await db.prepare(`CREATE TABLE IF NOT EXISTS model_leases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_id TEXT DEFAULT '',
      model TEXT NOT NULL,
      credits REAL DEFAULT 0,
      calls INTEGER DEFAULT 0,
      issued_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    )`).run().catch(() => {})
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_leases_user ON model_leases(user_id)`).run().catch(() => {})
  })().catch((e) => { __leaseReady.delete(key); throw e })
  __leaseReady.set(key, run)
  return run
}

/** 토큰 → 살아 있는 리스 행. 서명·만료·취소를 모두 통과해야 돌려준다. */
export async function resolveLease(db: D1Database, env: any, token: string): Promise<{ row: any; p: LeasePayload } | null> {
  const secret = await leaseSecret(db, env)
  const p = await verifyLease(secret, token)
  if (!p) return null
  await ensureLeaseSchema(db)
  const row: any = await db.prepare('SELECT * FROM model_leases WHERE id = ?').bind(p.l).first().catch(() => null)
  if (!row || row.revoked_at) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null
  return { row, p }
}
