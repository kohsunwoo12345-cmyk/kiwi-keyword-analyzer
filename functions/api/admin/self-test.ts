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
  const relayRaw = pick(e, ['OPENAI_RELAY_URL', 'openai_relay_url'])
  const openaiBase = (relayRaw || 'https://api.openai.com').replace(/\/$/, '')
  const openaiHost = (() => { try { return new URL(openaiBase).host } catch { return openaiBase } })()
  const openaiRelaySet = !!relayRaw && !openaiBase.includes('api.openai.com')
  const defs: { id: string; name: string; covers: string; keys: string[]; run?: (key: string) => Promise<{ ok: boolean; status: number; msg: string }> }[] = [
    { id: 'openai', name: 'GPT Image (OpenAI)', covers: 'GPT Image 2/1.5/1/mini', keys: ['GPT_API_KEY', 'OPENAI_API_KEY', 'gpt_api_key', 'openai_api_key'],
      run: async (key) => {
        // (릴레이 사용 시) 먼저 릴레이 서버 자체에 닿는지 헬스 확인 → 누가 막는지 격리
        let relayInfo = ''
        if (openaiRelaySet) {
          try {
            const hr = await tfetch(openaiBase + '/', {}, 8000)
            const ht = (await hr.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 100)
            relayInfo = /aligo-relay|service/i.test(ht) ? '릴레이서버 도달OK' : `릴레이루트 HTTP${hr.status} "${ht.slice(0, 50)}"`
          } catch (er: any) { relayInfo = '릴레이서버 연결실패:' + String(er?.name === 'AbortError' ? 'timeout(포트/방화벽/HTTP차단)' : (er?.message || er)).slice(0, 60) }
        }
        const r = await tfetch(openaiBase + '/v1/models', { headers: { Authorization: `Bearer ${key}` } })
        if (r.ok) return { ok: true, status: r.status, msg: (openaiRelaySet ? '릴레이 경유 정상' : '직접 호출 정상') + ` (경유: ${openaiHost})` }
        const body = (await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160)
        const srv = r.headers.get('server') || '없음'
        const cf = r.headers.get('cf-ray') ? 'cf-ray有' : 'cf-ray無'
        if (/unsupported_country|country.*not supported/i.test(body)) {
          return { ok: false, status: r.status, msg: `국가 차단 · ${relayInfo} · 릴레이가 지원국가 IP인지 확인 필요` }
        }
        return { ok: false, status: r.status, msg: `HTTP ${r.status} · ${relayInfo || '직접호출'} · server=${srv} · ${cf} · body=${body || '(빈본문)'}` }
      } },
    { id: 'elevenlabs', name: 'ElevenLabs', covers: '나레이션·립싱크·목소리교체', keys: ['ElevenLabs_API_KEY', 'ELEVENLABS_API_KEY', 'elevenlabs_api_key'],
      run: async (key) => {
        // 생성 기능(TTS/STS)이 쓰는 것과 동일한 인증. 구독조회는 user_read 권한이 필요해 실패할 수 있으므로
        // 음성 목록(/v1/voices)으로 검증하고, 권한 부족(인증은 성공)은 별도로 안내.
        const r = await tfetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } })
        if (r.ok) return { ok: true, status: r.status, msg: '정상 (음성 목록 조회 성공 → 생성 가능)' }
        const body = await r.text().catch(() => '')
        if (r.status === 401 && /permission|missing|user_read|voices_read/i.test(body)) {
          // 키 자체는 유효(인증 성공), 조회 권한만 없음 → 생성은 정상일 가능성이 높음
          return { ok: true, status: r.status, msg: '키 인증 성공 · 조회권한만 제한됨(생성은 정상). 잔액·목록 표시하려면 키에 user_read/voices_read 권한 추가' }
        }
        return { ok: false, status: r.status, msg: (r.status === 401 ? '실패 HTTP 401 · 키가 유효하지 않음' : '') + (body ? ' · ' + body.replace(/\s+/g, ' ').slice(0, 140) : await errText(r)) }
      } },
    { id: 'luma', name: 'Luma', covers: 'Ray 2 · Ray Flash 2 · Ray 1.6', keys: ['Luma_API_KEY', 'LUMA_API_KEY', 'luma_api_key'],
      run: async (key) => {
        // 실제 생성이 쓰는 엔드포인트(/generations)로 인증 검증. (목록 조회는 무료)
        const r = await tfetch('https://api.lumalabs.ai/dream-machine/v1/generations?limit=1', { headers: { Authorization: `Bearer ${key}`, accept: 'application/json' } })
        return { ok: r.ok, status: r.status, msg: r.ok ? '정상 (Ray 2·Flash·1.6 동일 엔드포인트)' : await errText(r) }
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
    // 응답 본문으로 원인 구분: 인증 문구가 있으면 국가차단이 아니라 '키 문제'
    const authish = /not authenticated|invalid[^a-z]*api|invalid[^a-z]*key|unauthor|authentication_error|missing[^a-z]*permission|forbidden.*key/i.test(body)
    const countryish = /unsupported_country|country.*not supported|region.*not/i.test(body)
    const hint = authish ? '키 인증 실패 → 키 값·권한 확인'
      : countryish ? '국가 차단 → 미국 릴레이(OPENAI_RELAY_URL) 필요'
      : r.status === 401 ? '키 인증 실패 → 키 값 확인'
      : r.status === 403 ? '접근 거부(키 인증 실패 또는 국가/권한 제한)'
      : r.status === 404 ? '엔드포인트 404' : r.status === 429 ? '레이트리밋' : '오류'
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
  return json({
    ok: true, ranAt: new Date().toISOString(),
    summary: { testedOk, testedFail, total: results.length },
    diag: { openaiRelayConfigured: openaiRelaySet, openaiBaseHost: openaiHost },
    results,
  })
}
