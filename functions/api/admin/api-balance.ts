import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, setSetting, getSetting, logAudit, clientIp } from '../_utils'

// AI 제공사 기본 목록 — 표시명 + 충전(결제) 페이지 기본 URL.
// balance/url 은 settings.api_providers(JSON) 로 관리자가 덮어쓸 수 있음.
const DEFAULT_PROVIDERS: { id: string; name: string; url: string; note: string }[] = [
  { id: 'google', name: 'Google Veo', url: 'https://console.cloud.google.com/billing', note: 'Veo 3.1 (영상)' },
  { id: 'runway', name: 'Runway', url: 'https://dev.runwayml.com/', note: 'Gen-4 · Aleph (영상)' },
  { id: 'seedance', name: 'Seedance', url: 'https://fal.ai/dashboard/billing', note: 'Seedance 1.0/2.0 (영상)' },
  { id: 'kling', name: 'Kling', url: 'https://app.klingai.com/', note: 'Kling 2.1/2.0/1.6 (영상)' },
  { id: 'hailuo', name: 'Hailuo (MiniMax)', url: 'https://www.minimax.io/platform', note: 'Hailuo 02 · Director (영상)' },
  { id: 'luma', name: 'Luma', url: 'https://lumalabs.ai/dashboard/api', note: 'Ray 2 · Flash (영상)' },
  { id: 'xai', name: 'xAI Grok', url: 'https://console.x.ai/', note: 'Grok Imagine (이미지)' },
  { id: 'flux', name: 'Flux (BFL)', url: 'https://dashboard.bfl.ai/', note: 'Flux Pro · Kontext (이미지)' },
  { id: 'openai', name: 'GPT Image', url: 'https://platform.openai.com/settings/organization/billing/overview', note: 'GPT Image (이미지)' },
  { id: 'nanobanana', name: 'Nano Banana', url: 'https://fal.ai/dashboard/billing', note: 'Nano Banana (이미지)' },
  { id: 'fal', name: 'fal ControlNet', url: 'https://fal.ai/dashboard/billing', note: 'ControlNet · 립싱크 경로' },
  { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/app/subscription', note: '립싱크 · AI 음성' },
]

type Ov = { balance?: number | null; url?: string; updatedAt?: string }

async function loadOverrides(db: D1Database): Promise<Record<string, Ov>> {
  try {
    const raw = await getSetting(db, 'api_providers')
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch { return {} }
}

// GET /api/admin/api-balance → 제공사별 남은 한도(잔액) + 충전 URL
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const ov = await loadOverrides(db)
  const providers = DEFAULT_PROVIDERS.map((p) => {
    const o = ov[p.id] || {}
    return {
      id: p.id,
      name: p.name,
      note: p.note,
      url: (o.url && String(o.url)) || p.url,
      balance: o.balance == null ? null : Number(o.balance), // null = 미입력
      updatedAt: o.updatedAt || '',
    }
  })
  return json({ ok: true, providers })
}

// POST /api/admin/api-balance { action:'set', id, balance?, url? }
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
  if (!DEFAULT_PROVIDERS.some((p) => p.id === id)) return json({ ok: false, error: '알 수 없는 제공사' }, 400)

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
