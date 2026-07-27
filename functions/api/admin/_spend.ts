// 제공사 잔액 스냅샷 — '실제로 빠져나간 금액' 의 근거 데이터.
//  라우트가 아닌 공용 모듈(언더스코어). 생성 기록(record) 과 조회 화면(spend-track) 이 함께 쓴다.
import { Env } from '../_utils'

export type Snap = { provider: string; balance: number; unit: string; at: string }

// 잔액을 실제로 조회할 수 있는 제공사 (api-balance.ts 의 probe 와 같은 엔드포인트)
export const TRACKABLE: { id: string; name: string; keys: string[]; unit: string; usdPerUnit?: number }[] = [
  { id: 'runway', name: 'Runway', keys: ['Runway_API_KEY', 'RUNWAY_API_KEY', 'runway_api_key'], unit: '크레딧', usdPerUnit: 0.01 },
  { id: 'luma', name: 'Luma', keys: ['Luma_API_KEY', 'LUMA_API_KEY', 'luma_api_key'], unit: 'USD', usdPerUnit: 1 },
  { id: 'elevenlabs', name: 'ElevenLabs', keys: ['ElevenLabs_API_KEY', 'ELEVENLABS_API_KEY', 'elevenlabs_api_key'], unit: '문자' },
]
// 우리 기록(ai_usage.provider)에서 각 제공사로 묶이는 값
export const RAWS: Record<string, string[]> = {
  runway: ['runway', 'runway_aleph', 'v2v_auto'],
  luma: ['luma'],
  elevenlabs: ['narrate'],
}

export function pickKey(env: any, names: string[]): string {
  for (const n of names) { const v = env[n]; if (v && String(v).trim()) return String(v).trim() }
  return ''
}
async function tfetch(url: string, init: RequestInit, ms = 8000): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try { return await fetch(url, { ...init, signal: ac.signal }) } finally { clearTimeout(t) }
}

/** 제공사 현재 잔액 — 못 읽으면 null */
async function readBalance(id: string, key: string): Promise<number | null> {
  try {
    if (id === 'runway') {
      const r = await tfetch('https://api.dev.runwayml.com/v1/organization', { headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' } })
      if (!r.ok) return null
      const j: any = await r.json()
      const c = Number(j?.creditBalance ?? j?.credit_balance ?? j?.credits)
      return isFinite(c) ? c : null
    }
    if (id === 'luma') {
      const r = await tfetch('https://api.lumalabs.ai/dream-machine/v1/credits', { headers: { Authorization: `Bearer ${key}`, accept: 'application/json' } })
      if (!r.ok) return null
      const j: any = await r.json()
      const cents = Number(j?.credit_balance ?? j?.available_credit ?? j?.balance)
      return isFinite(cents) ? Math.round(cents) / 100 : null
    }
    if (id === 'elevenlabs') {
      const r = await tfetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } })
      if (!r.ok) return null
      const j: any = await r.json()
      const used = Number(j?.character_count) || 0, limit = Number(j?.character_limit) || 0
      return Math.max(0, limit - used)
    }
  } catch { /* 네트워크·인증 실패 → null */ }
  return null
}

export async function ensureBalanceTable(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS provider_balance_snapshots (
    id TEXT PRIMARY KEY, provider TEXT NOT NULL, balance REAL NOT NULL,
    unit TEXT DEFAULT '', created_at TEXT NOT NULL
  )`).run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_pbs_prov_time ON provider_balance_snapshots(provider, created_at)').run().catch(() => {})
}

/** 잔액 스냅샷 기록 — 30분 안에 이미 찍었으면 건너뛴다(중복 호출 안전) */
export async function snapshotBalances(db: D1Database, env: any): Promise<{ taken: Snap[]; skipped: string[] }> {
  const taken: Snap[] = [], skipped: string[] = []
  const now = Date.now()
  for (const p of TRACKABLE) {
    const key = pickKey(env, p.keys)
    if (!key) { skipped.push(p.id + ':키없음'); continue }
    const last: any = await db.prepare('SELECT created_at FROM provider_balance_snapshots WHERE provider = ? ORDER BY created_at DESC LIMIT 1')
      .bind(p.id).first().catch(() => null)
    if (last && now - Date.parse(last.created_at) < 30 * 60 * 1000) { skipped.push(p.id + ':최근기록있음'); continue }
    const bal = await readBalance(p.id, key)
    if (bal == null) { skipped.push(p.id + ':조회실패'); continue }
    const at = new Date().toISOString()
    await db.prepare('INSERT INTO provider_balance_snapshots (id,provider,balance,unit,created_at) VALUES (?,?,?,?,?)')
      .bind('pb' + now.toString(36) + Math.random().toString(36).slice(2, 6), p.id, bal, p.unit, at).run().catch(() => {})
    taken.push({ provider: p.id, balance: bal, unit: p.unit, at })
  }
  return { taken, skipped }
}


/** 생성이 일어날 때마다 조용히 잔액을 남긴다(30분 쿨다운). 실패는 전부 무시 — 과금 흐름에 영향 없음. */
export async function autoSnapshot(db: D1Database, env: any): Promise<void> {
  try { await ensureBalanceTable(db); await snapshotBalances(db, env) } catch { /* 추적 실패는 무시 */ }
}

/** 잔액 스냅샷 → 일자별 잔액 (하루에 여러 번 찍혔으면 그날 마지막 값) */
export function dailyBalances(rows: { balance: number; created_at: string }[]): [string, number][] {
  const byDay = new Map<string, number>()
  for (const r of rows) byDay.set(String(r.created_at).slice(0, 10), Number(r.balance))
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

/** 일자별 실제 사용량 = 전날 잔액 − 그날 잔액.
 *  늘었으면(음수) 그날은 충전한 날이라 사용량을 계산할 수 없다 → null 로 표시하고 합계에서 뺀다. */
export function dailyUsage(days: [string, number][], usdPerUnit?: number | null) {
  const out: { date: string; balance: number; usedUnits: number | null; recharged: boolean; usedUsd: number | null }[] = []
  for (let i = 1; i < days.length; i++) {
    const [d, bal] = days[i]
    const used = days[i - 1][1] - bal
    const recharged = used < 0
    out.push({
      date: d,
      balance: bal,
      usedUnits: recharged ? null : Math.round(used * 100) / 100,
      recharged,
      usedUsd: recharged || !usdPerUnit ? null : Math.round(used * usdPerUnit * 10000) / 10000,
    })
  }
  return out
}
