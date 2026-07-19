import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, setSetting, getSetting, logAudit, clientIp } from '../_utils'

// AI 제공사 목록 — 표시명 · 충전(결제) URL · env 키 후보 · 라이브 잔액 조회 지원 여부.
//  · supportsLive=true 인 제공사는 서버가 env 키로 각 API 를 호출해 실시간 잔액을 가져온다.
//  · 그 외 제공사는 공개 잔액 API 가 없어 관리자가 값을 입력(수동)하거나, 충전 버튼으로 대시보드에서 확인.
const PROVIDERS: { id: string; name: string; url: string; note: string; keys: string[]; supportsLive?: boolean; unit?: string }[] = [
  { id: 'google', name: 'Google Veo', url: 'https://console.cloud.google.com/billing', note: 'Veo 3.1 (영상)', keys: ['VEO_API_KEY', 'veo_api_key', 'GOOGLE_API_KEY'] },
  { id: 'runway', name: 'Runway', url: 'https://dev.runwayml.com/', note: 'Gen-4 · Aleph (영상)', keys: ['Runway_API_KEY', 'RUNWAY_API_KEY', 'runway_api_key'], supportsLive: true, unit: '크레딧' },
  { id: 'seedance', name: 'Seedance', url: 'https://fal.ai/dashboard/billing', note: 'Seedance 1.0/2.0 (영상)', keys: ['Seedance_API_KEY', 'SEEDANCE_API_KEY', 'seedance_api_key'] },
  { id: 'kling', name: 'Kling', url: 'https://app.klingai.com/', note: 'Kling 2.1/2.0/1.6 (영상)', keys: ['KLING_ACCESS_KEY', 'Kling_API_KEY', 'KLING_API_KEY'] },
  { id: 'hailuo', name: 'Hailuo (MiniMax)', url: 'https://www.minimax.io/platform', note: 'Hailuo 02 · Director (영상)', keys: ['Hailuo_API_KEY', 'HAILUO_API_KEY', 'MINIMAX_API_KEY'] },
  { id: 'luma', name: 'Luma', url: 'https://lumalabs.ai/dashboard/api', note: 'Ray 2 · Flash (영상)', keys: ['Luma_API_KEY', 'LUMA_API_KEY', 'luma_api_key'], supportsLive: true, unit: 'USD' },
  { id: 'xai', name: 'xAI Grok', url: 'https://console.x.ai/', note: 'Grok Imagine (이미지)', keys: ['Grok_API_KEY', 'GROK_API_KEY', 'grok_api_key'] },
  { id: 'flux', name: 'Flux (BFL)', url: 'https://dashboard.bfl.ai/', note: 'Flux Pro · Kontext (이미지)', keys: ['FLUX_API_KEY', 'flux_api_key', 'BFL_API_KEY'] },
  { id: 'openai', name: 'GPT Image', url: 'https://platform.openai.com/settings/organization/billing/overview', note: 'GPT Image (이미지)', keys: ['GPT_API_KEY', 'OPENAI_API_KEY', 'gpt_api_key'] },
  { id: 'nanobanana', name: 'Nano Banana', url: 'https://fal.ai/dashboard/billing', note: 'Nano Banana (이미지)', keys: ['Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY', 'GPT_API_KEY'] },
  { id: 'fal', name: 'fal ControlNet', url: 'https://fal.ai/dashboard/billing', note: 'ControlNet · 립싱크 경로', keys: ['Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY', 'fal_api_key'] },
  { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/app/subscription', note: '립싱크 · AI 음성', keys: ['ElevenLabs_API_KEY', 'ELEVENLABS_API_KEY', 'elevenlabs_api_key'], supportsLive: true, unit: '문자' },
]

type Ov = { balance?: number | null; url?: string; updatedAt?: string }

function pickKey(env: any, names: string[]): string {
  for (const n of names) { const v = env[n]; if (v && String(v).trim()) return String(v).trim() }
  return ''
}

// 타임아웃 있는 fetch (제공사 API 가 느려도 대시보드가 막히지 않도록)
async function tfetch(url: string, init: RequestInit, ms = 6000): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try { return await fetch(url, { ...init, signal: ac.signal }) } finally { clearTimeout(t) }
}

// 제공사별 실시간 잔액 조회 → { balance, unit } | { error }
async function fetchLive(id: string, key: string): Promise<{ balance?: number; unit?: string; error?: string }> {
  try {
    if (id === 'runway') {
      const r = await tfetch('https://api.dev.runwayml.com/v1/organization', { headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' } })
      if (!r.ok) return { error: `HTTP ${r.status}` }
      const j: any = await r.json()
      const c = Number(j?.creditBalance ?? j?.credit_balance ?? j?.credits)
      if (!isFinite(c)) return { error: '응답 파싱 실패' }
      return { balance: c, unit: '크레딧' }
    }
    if (id === 'elevenlabs') {
      const r = await tfetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } })
      if (!r.ok) return { error: `HTTP ${r.status}` }
      const j: any = await r.json()
      const used = Number(j?.character_count) || 0
      const limit = Number(j?.character_limit) || 0
      return { balance: Math.max(0, limit - used), unit: '문자' }
    }
    if (id === 'luma') {
      const r = await tfetch('https://api.lumalabs.ai/dream-machine/v1/credits', { headers: { Authorization: `Bearer ${key}`, accept: 'application/json' } })
      if (!r.ok) return { error: `HTTP ${r.status}` }
      const j: any = await r.json()
      const cents = Number(j?.credit_balance ?? j?.available_credit ?? j?.balance)
      if (!isFinite(cents)) return { error: '응답 파싱 실패' }
      return { balance: Math.round(cents) / 100, unit: 'USD' } // Luma: USD 센트 → 달러
    }
    return { error: '미지원' }
  } catch (e: any) {
    return { error: String(e?.name === 'AbortError' ? '시간 초과' : (e?.message || e)).slice(0, 80) }
  }
}

async function loadOverrides(db: D1Database): Promise<Record<string, Ov>> {
  try {
    const raw = await getSetting(db, 'api_providers')
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch { return {} }
}

// GET /api/admin/api-balance → 제공사별 남은 한도(실시간 조회 + 수동 폴백) + 충전 URL
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const ov = await loadOverrides(db)

  const providers = await Promise.all(PROVIDERS.map(async (p) => {
    const o = ov[p.id] || {}
    const key = pickKey(env as any, p.keys)
    const keyConfigured = !!key
    const manual = o.balance == null ? null : Number(o.balance)

    let balance: number | null = manual
    let unit = p.unit || ''
    let source: 'live' | 'manual' | 'none' = manual != null ? 'manual' : 'none'
    let fetchError = ''

    if (p.supportsLive && keyConfigured) {
      const live = await fetchLive(p.id, key)
      if (live.error) { fetchError = live.error } // 실패 → 수동값/없음 유지
      else if (typeof live.balance === 'number') { balance = live.balance; unit = live.unit || unit; source = 'live' }
    }

    return {
      id: p.id, name: p.name, note: p.note,
      url: (o.url && String(o.url)) || p.url,
      balance, unit, source,
      supportsLive: !!p.supportsLive,
      keyConfigured,
      fetchError,
      updatedAt: o.updatedAt || '',
    }
  }))

  return json({ ok: true, providers, fetchedAt: new Date().toISOString() })
}

// POST /api/admin/api-balance { action:'set', id, balance?, url? } — 수동 잔액/URL 입력
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const admin = { id: guard.me.id, email: guard.me.email }
  const ip = clientIp(request)

  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')
  const id = String(b.id || '')
  if (!PROVIDERS.some((p) => p.id === id)) return json({ ok: false, error: '알 수 없는 제공사' }, 400)

  const ov = await loadOverrides(db)
  const cur: Ov = ov[id] || {}

  if (action === 'set') {
    if (b.balance === '' || b.balance == null) cur.balance = null
    else { const n = Number(b.balance); if (!isFinite(n) || n < 0) return json({ ok: false, error: '잔액은 0 이상 숫자' }, 400); cur.balance = Math.round(n * 100) / 100 }
    if (typeof b.url === 'string' && b.url.trim()) {
      const u = b.url.trim()
      if (!/^https?:\/\//i.test(u)) return json({ ok: false, error: '충전 URL 은 http(s):// 로 시작해야 합니다.' }, 400)
      cur.url = u.slice(0, 500)
    }
    cur.updatedAt = new Date().toISOString()
    ov[id] = cur
    await setSetting(db, 'api_providers', JSON.stringify(ov))
    await logAudit(db, admin, 'api_balance_set', id, cur.balance == null ? '한도 초기화' : cur.balance + ' 잔액', 'info', ip)
    return json({ ok: true, balance: cur.balance ?? null, url: cur.url || '' })
  }
  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
