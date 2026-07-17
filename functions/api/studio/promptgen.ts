import { Env, json, resolveDB, ensureSchema, getSessionUser } from '../_utils'

function pick(env: any, names: string[]): string {
  for (const n of names) { const v = env?.[n]; if (v) return String(v) }
  return ''
}

const SYS = `You are a world-class prompt engineer for AI image and video generation models (Seedance, Veo, Flux, Nano Banana, etc.).
Given a user's brief, write ONE vivid, concrete, production-ready generation prompt in English.
Rules:
- Output ONLY the prompt text. No preamble, no quotes, no markdown, no explanation.
- Be specific about subject, composition, lighting, mood, camera, lens, color, and style.
- For video, include motion/camera movement. Keep it under 120 words.`

// POST /api/studio/promptgen { provider:'gpt'|'gemini', brief, kind:'image'|'video' } → { ok, prompt }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (db) { try { await ensureSchema(db); const me = await getSessionUser(request, db); if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401) } catch {} }

  const b: any = await request.json().catch(() => ({}))
  const provider = b.provider === 'gemini' ? 'gemini' : 'gpt'
  const kind = b.kind === 'video' ? 'video' : 'image'
  const brief = String(b.brief || '').trim().slice(0, 2000)
  if (!brief) return json({ ok: false, error: '무엇을 만들지 간단히 적어주세요.' }, 400)

  const userMsg = `Target: ${kind} generation.\nBrief: ${brief}\n\nWrite the single best ${kind} generation prompt.`
  const openaiKey = pick(env, ['GPT_API_KEY', 'OPENAI_API_KEY', 'gpt_api_key', 'openai_api_key'])
  const googleKey = pick(env, ['VEO_API_KEY', 'veo_api_key', 'GEMINI_API_KEY', 'gemini_api_key', 'GOOGLE_API_KEY'])

  try {
    if (provider === 'gemini') {
      if (!googleKey) return json({ ok: false, error: 'Gemini(Google) API 키가 설정되지 않았습니다.' }, 400)
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(googleKey),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYS }] },
            contents: [{ role: 'user', parts: [{ text: userMsg }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 400 },
          }),
        },
      )
      const j: any = await r.json().catch(() => ({}))
      if (!r.ok) return json({ ok: false, error: 'Gemini 오류: ' + String(j?.error?.message || r.status).slice(0, 160) }, 502)
      const text = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim()
      if (!text) return json({ ok: false, error: 'Gemini 응답이 비어 있습니다.' }, 502)
      return json({ ok: true, prompt: text, provider: 'gemini' })
    }
    // OpenAI (GPT)
    if (!openaiKey) return json({ ok: false, error: 'OpenAI(GPT) API 키가 설정되지 않았습니다.' }, 400)
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + openaiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.9,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: userMsg },
        ],
      }),
    })
    const j: any = await r.json().catch(() => ({}))
    if (!r.ok) return json({ ok: false, error: 'GPT 오류: ' + String(j?.error?.message || r.status).slice(0, 160) }, 502)
    const text = String(j?.choices?.[0]?.message?.content || '').trim()
    if (!text) return json({ ok: false, error: 'GPT 응답이 비어 있습니다.' }, 502)
    return json({ ok: true, prompt: text, provider: 'gpt' })
  } catch (e: any) {
    return json({ ok: false, error: '프롬프트 생성 실패: ' + String(e?.message || e).slice(0, 160) }, 500)
  }
}
