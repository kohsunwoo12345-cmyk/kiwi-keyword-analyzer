import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, setSetting, getSetting, logAudit, clientIp } from '../_utils'

// AI 제공사 — 표시명 · 충전 URL · env 키 후보(generate.js 와 동일) · 잔액 단위.
// 연동 상태는 실제 인증 호출(probe)로 확인한다:
//  · balance API 가 있는 제공사(Runway/Luma/ElevenLabs) → 실시간 잔액 + 연동 검증
//  · validate API 가 있는 제공사(OpenAI/xAI/Google) → 연동 검증(잔액은 각사가 API 미제공 → 수동)
//  · 그 외(fal/Flux/Kling/Hailuo/Seedance) → 키가 설정돼 있으면 "연동됨", 잔액은 수동 입력
const PROVIDERS: { id: string; name: string; url: string; note: string; keys: string[]; unit?: string }[] = [
  { id: 'google', name: 'Google Veo', url: 'https://console.cloud.google.com/billing', note: 'Veo 3.1 (영상)', keys: ['VEO_API_KEY', 'veo_api_key', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'] },
  { id: 'runway', name: 'Runway', url: 'https://dev.runwayml.com/', note: 'Gen-4 · Aleph (영상)', keys: ['Runway_API_KEY', 'RUNWAY_API_KEY', 'runway_api_key'], unit: '크레딧' },
  { id: 'seedance', name: 'Seedance', url: 'https://fal.ai/dashboard/billing', note: 'Seedance 1.0/2.0 (영상)', keys: ['Seedance_API_KEY', 'SEEDANCE_API_KEY', 'seedance_api_key', 'Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY'] },
  { id: 'kling', name: 'Kling', url: 'https://app.klingai.com/', note: 'Kling 2.1/2.0/1.6 (영상)', keys: ['KLING_ACCESS_KEY', 'Kling_API_KEY', 'KLING_API_KEY', 'Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY'] },
  { id: 'hailuo', name: 'Hailuo (MiniMax)', url: 'https://www.minimax.io/platform', note: 'Hailuo 02 · Director (영상)', keys: ['Hailuo_API_KEY', 'HAILUO_API_KEY', 'hailuo_api_key', 'MINIMAX_API_KEY'] },
  { id: 'luma', name: 'Luma', url: 'https://lumalabs.ai/dashboard/api', note: 'Ray 2 · Flash (영상)', keys: ['Luma_API_KEY', 'LUMA_API_KEY', 'luma_api_key'], unit: 'USD' },
  { id: 'xai', name: 'xAI Grok', url: 'https://console.x.ai/', note: 'Grok Imagine (이미지)', keys: ['Grok_API_KEY', 'GROK_API_KEY', 'grok_api_key'] },
  { id: 'flux', name: 'Flux (BFL)', url: 'https://dashboard.bfl.ai/', note: 'Flux Pro · Kontext (이미지)', keys: ['FLUX_API_KEY', 'flux_api_key', 'BFL_API_KEY'] },
  { id: 'openai', name: 'GPT Image', url: 'https://platform.openai.com/settings/organization/billing/overview', note: 'GPT Image (이미지)', keys: ['GPT_API_KEY', 'OPENAI_API_KEY', 'gpt_api_key', 'openai_api_key'] },
  { id: 'nanobanana', name: 'Nano Banana', url: 'https://aistudio.google.com/', note: 'Nano Banana (Gemini 이미지)', keys: ['VEO_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY', 'Fal_API_KEY', 'FAL_API_KEY'] },
  { id: 'fal', name: 'fal', url: 'https://fal.ai/dashboard/billing', note: 'ControlNet · 립싱크 경로', keys: ['Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY', 'fal_api_key'] },
  { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/app/subscription', note: '립싱크 · AI 음성', keys: ['ElevenLabs_API_KEY', 'ELEVENLABS_API_KEY', 'elevenlabs_api_key'], unit: '문자' },
]

type Ov = { balance?: number | null; url?: string; updatedAt?: string }

function pickKey(env: any, names: string[]): string {
  for (const n of names) { const v = env[n]; if (v && String(v).trim()) return String(v).trim() }
  return ''
}

async function tfetch(url: string, init: RequestInit, ms = 7000): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try { return await fetch(url, { ...init, signal: ac.signal }) } finally { clearTimeout(t) }
}

// 제공사별 연동 확인(probe): { ok(연동 성공 여부), balance?, unit?, error? }
//  ok 가 undefined 면 "확인 API 없음"(키 설정만으로 연동 간주).
async function probe(id: string, key: string): Promise<{ ok?: boolean; balance?: number; unit?: string; error?: string }> {
  try {
    if (id === 'elevenlabs') {
      const r = await tfetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } })
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` }
      const j: any = await r.json()
      const used = Number(j?.character_count) || 0, limit = Number(j?.character_limit) || 0
      return { ok: true, balance: Math.max(0, limit - used), unit: '문자' }
    }
    if (id === 'runway') {
      const r = await tfetch('https://api.dev.runwayml.com/v1/organization', { headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' } })
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` }
      const j: any = await r.json()
      const c = Number(j?.creditBalance ?? j?.credit_balance ?? j?.credits)
      return isFinite(c) ? { ok: true, balance: c, unit: '크레딧' } : { ok: true }
    }
    if (id === 'luma') {
      const r = await tfetch('https://api.lumalabs.ai/dream-machine/v1/credits', { headers: { Authorization: `Bearer ${key}`, accept: 'application/json' } })
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` }
      const j: any = await r.json()
      const cents = Number(j?.credit_balance ?? j?.available_credit ?? j?.balance)
      return isFinite(cents) ? { ok: true, balance: Math.round(cents) / 100, unit: 'USD' } : { ok: true }
    }
    if (id === 'openai') {
      const r = await tfetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } })
      return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` }
    }
    if (id === 'xai') {
      const r = await tfetch('https://api.x.ai/v1/api-key', { headers: { Authorization: `Bearer ${key}` } })
      return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` }
    }
    if (id === 'google' || id === 'nanobanana') {
      // API 키(AIza...)만 검증 가능. 서비스계정 JSON 이면 검증 생략(키 설정만으로 연동 간주).
      if (key.trim().startsWith('{') || key.length > 200) return {}
      const r = await tfetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key), { headers: { accept: 'application/json' } })
      return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` }
    }
    return {} // fal/flux/kling/hailuo/seedance: 확인 API 없음 → 키 설정만으로 연동
  } catch (e: any) {
    return { ok: false, error: String(e?.name === 'AbortError' ? '시간 초과' : (e?.message || e)).slice(0, 80) }
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

// GET /api/admin/api-balance → 제공사별 연동 상태 + 남은 한도(실시간/수동) + 충전 URL
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
    let verified = false

    if (keyConfigured) {
      const pr = await probe(p.id, key)
      if (pr.ok === true) verified = true
      if (pr.ok === false) fetchError = pr.error || '연결 실패'
      if (typeof pr.balance === 'number') { balance = pr.balance; unit = pr.unit || unit; source = 'live' }
    }

    // 연동됨 = 키가 있고, 검증에 실패하지 않음(검증 API 없으면 키만으로 연동 인정)
    const connected = keyConfigured && fetchError === ''

    return {
      id: p.id, name: p.name, note: p.note,
      url: (o.url && String(o.url)) || p.url,
      balance, unit, source,
      connected, verified, keyConfigured, fetchError,
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
