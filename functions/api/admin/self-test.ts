import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser } from '../_utils'

// GET /api/admin/self-test — 각 AI 제공사에 실제 인증 호출을 날려 "정상 호출되는지" 진단.
//  · Cloudflare(실제 키·egress)에서 실행되므로 실배포와 동일한 조건으로 검증된다.
//  · 비용이 드는 실제 생성이 아니라, 인증·연결을 확인하는 가벼운 호출(모델목록·구독·잔액 등)만 수행.
//  · OpenAI 는 실제 이미지 경로와 동일하게 릴레이(OPENAI_RELAY_URL) 를 경유해 검증한다.

function pick(env: any, names: string[]): string {
  for (const n of names) { const v = env[n]; if (v && String(v).trim()) return String(v).trim() }
  return ''
}
async function tfetch(url: string, init: RequestInit, ms = 12000): Promise<Response> {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms)
  try { return await fetch(url, { ...init, signal: ac.signal }) } finally { clearTimeout(t) }
}

interface Item {
  id: string; name: string; covers: string
  keyConfigured: boolean; tested: boolean
  ok: boolean | null; status: number; latencyMs: number; message: string
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const e: any = env

  // 제공사별: 키 후보 · 표시명 · 무엇을 검증하는지 · 실제 검증 호출
  const openaiBase = (pick(e, ['OPENAI_RELAY_URL', 'openai_relay_url']) || 'https://api.openai.com').replace(/\/$/, '')
  const defs: { id: string; name: string; covers: string; keys: string[]; run?: (key: string) => Promise<{ ok: boolean; status: number; msg: string }> }[] = [
    { id: 'openai', name: 'GPT Image (OpenAI)', covers: 'GPT Image 2/1.5/1/mini', keys: ['GPT_API_KEY', 'OPENAI_API_KEY', 'gpt_api_key', 'openai_api_key'],
      run: async (key) => { const r = await tfetch(openaiBase + '/v1/models', { headers: { Authorization: `Bearer ${key}` } }); return { ok: r.ok, status: r.status, msg: r.ok ? (openaiBase.includes('openai.com') ? '직접 호출 정상' : '릴레이 경유 정상') : await errText(r) } } },
    { id: 'elevenlabs', name: 'ElevenLabs', covers: '나레이션·립싱크·목소리교체', keys: ['ElevenLabs_API_KEY', 'ELEVENLABS_API_KEY', 'elevenlabs_api_key'],
      run: async (key) => { const r = await tfetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } }); let extra = ''; if (r.ok) { try { const j: any = await r.json(); extra = ` · 남은 문자 ${Math.max(0, (Number(j.character_limit) || 0) - (Number(j.character_count) || 0)).toLocaleString('ko-KR')}` } catch {} } return { ok: r.ok, status: r.status, msg: r.ok ? '정상' + extra : await errText(r) } } },
    { id: 'luma', name: 'Luma', covers: 'Ray 2 · Ray Flash 2 · Ray 1.6', keys: ['Luma_API_KEY', 'LUMA_API_KEY', 'luma_api_key'],
      run: async (key) => {
        let r = await tfetch('https://api.lumalabs.ai/dream-machine/v1/credits', { headers: { Authorization: `Bearer ${key}`, accept: 'application/json' } })
        if (r.status === 404) r = await tfetch('https://api.lumalabs.ai/dream-machine/v1/generations?limit=1', { headers: { Authorization: `Bearer ${key}`, accept: 'application/json' } })
        return { ok: r.ok, status: r.status, msg: r.ok ? '정상 (3개 모델 동일 엔드포인트)' : await errText(r) }
      } },
    { id: 'runway', name: 'Runway', covers: 'Gen-4 · Aleph', keys: ['Runway_API_KEY', 'RUNWAY_API_KEY', 'runway_api_key'],
      run: async (key) => { const r = await tfetch('https://api.dev.runwayml.com/v1/organization', { headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' } }); return { ok: r.ok, status: r.status, msg: r.ok ? '정상' : await errText(r) } } },
    { id: 'google', name: 'Google Veo', covers: 'Veo 3.1 · Nano Banana(Gemini)', keys: ['VEO_API_KEY', 'veo_api_key', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'],
      run: async (key) => { if (key.startsWith('{') || key.length > 200) return { ok: true, status: 0, msg: '서비스계정 키(검증 생략)' }; const r = await tfetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key), { headers: { accept: 'application/json' } }); return { ok: r.ok, status: r.status, msg: r.ok ? '정상' : await errText(r) } } },
    { id: 'xai', name: 'xAI Grok', covers: 'Grok Imagine', keys: ['Grok_API_KEY', 'GROK_API_KEY', 'grok_api_key'],
      run: async (key) => { const r = await tfetch('https://api.x.ai/v1/api-key', { headers: { Authorization: `Bearer ${key}` } }); return { ok: r.ok, status: r.status, msg: r.ok ? '정상' : await errText(r) } } },
    // 실시간 검증 엔드포인트가 없는 제공사 — 키 설정 여부만 확인
    { id: 'seedance', name: 'Seedance', covers: 'Seedance 1.0/2.0', keys: ['Seedance_API_KEY', 'SEEDANCE_API_KEY', 'seedance_api_key', 'Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY'] },
    { id: 'kling', name: 'Kling', covers: 'Kling 2.1/2.0/1.6', keys: ['KLING_ACCESS_KEY', 'Kling_API_KEY', 'KLING_API_KEY', 'Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY'] },
    { id: 'hailuo', name: 'Hailuo (MiniMax)', covers: 'Hailuo 02 · Director', keys: ['Hailuo_API_KEY', 'HAILUO_API_KEY', 'hailuo_api_key', 'MINIMAX_API_KEY'] },
    { id: 'flux', name: 'Flux (BFL)', covers: 'Flux Pro · Kontext', keys: ['FLUX_API_KEY', 'flux_api_key', 'BFL_API_KEY'] },
    { id: 'fal', name: 'fal', covers: 'ControlNet · 립싱크 경로', keys: ['Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY', 'fal_api_key'] },
  ]

  async function errText(r: Response): Promise<string> {
    let body = ''
    try { body = (await r.text()).replace(/\s+/g, ' ').slice(0, 140) } catch {}
    const hint = r.status === 401 ? '키 인증 실패' : r.status === 403 ? '접근 차단(국가/권한/릴레이 필요)' : r.status === 404 ? '엔드포인트 404' : r.status === 429 ? '레이트리밋' : '오류'
    return `실패 HTTP ${r.status} · ${hint}${body ? ' · ' + body : ''}`
  }

  const results: Item[] = await Promise.all(defs.map(async (d) => {
    const key = pick(e, d.keys)
    const keyConfigured = !!key
    if (!keyConfigured) return { id: d.id, name: d.name, covers: d.covers, keyConfigured: false, tested: false, ok: null, status: 0, latencyMs: 0, message: '환경변수에 API 키 미설정' }
    if (!d.run) return { id: d.id, name: d.name, covers: d.covers, keyConfigured: true, tested: false, ok: null, status: 0, latencyMs: 0, message: '키 설정됨 · 실시간 검증 엔드포인트 미지원(생성 시 확인)' }
    const t0 = Date.now()
    try {
      const r = await d.run(key)
      return { id: d.id, name: d.name, covers: d.covers, keyConfigured: true, tested: true, ok: r.ok, status: r.status, latencyMs: Date.now() - t0, message: r.msg }
    } catch (err: any) {
      return { id: d.id, name: d.name, covers: d.covers, keyConfigured: true, tested: true, ok: false, status: 0, latencyMs: Date.now() - t0, message: String(err?.name === 'AbortError' ? '시간 초과(연결 실패)' : (err?.message || err)).slice(0, 120) }
    }
  }))

  const testedOk = results.filter((r) => r.tested && r.ok).length
  const testedFail = results.filter((r) => r.tested && r.ok === false).length
  return json({ ok: true, ranAt: new Date().toISOString(), summary: { testedOk, testedFail, total: results.length }, results })
}
