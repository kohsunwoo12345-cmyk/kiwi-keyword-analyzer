import { Env, json, resolveDB, ensureSchema, getSessionUser, getSetting, applyBalance } from '../_utils'
import { getUsdKrw, CREDIT_KRW } from './_pricing'

function pick(env: any, names: string[]): string {
  for (const n of names) { const v = env?.[n]; if (v) return String(v) }
  return ''
}

// 프롬프트 작성 1회 원가(USD) — LLM 텍스트 생성 대략 원가
const PROMPT_BASE_USD = 0.005

const SYS = `You are a world-class prompt engineer for AI image and video generation models (Seedance, Veo, Flux, Nano Banana, etc.).
Given a user's brief, write ONE vivid, concrete, production-ready generation prompt in English.
Rules:
- Output ONLY the prompt text. No preamble, no quotes, no markdown, no explanation.
- Be specific about subject, composition, lighting, mood, camera, lens, color, and style.
- For video, include motion/camera movement. Keep it under 120 words.`

// 프롬프트 작성 배수(원가율) — 관리자 ai-pricing 에서 조절, 기본 2.5, 원가 이하(1 미만) 불가
async function promptMarkup(db: any): Promise<number> {
  try { const v = await getSetting(db, 'promptgen_markup'); const n = Number(v); if (v != null && v !== '' && isFinite(n)) return Math.max(1, n) } catch {}
  return 2.5
}
// 실제 차감 크레딧 = 원가(USD) × 환율 / 크레딧단가 × 배수
async function promptCost(db: any): Promise<number> {
  const markup = await promptMarkup(db)
  let rate = 1350
  try { rate = await getUsdKrw(db) } catch {}
  const credits = (PROMPT_BASE_USD * rate / CREDIT_KRW) * markup
  return Math.round(credits * 100) / 100
}

/* 모델 ID 가 은퇴하면(저장해 둔 워크플로우에 옛 ID 가 남아 있는 경우) 호출이 404 로 죽는다.
   그때 되돌아갈 현행 모델. 목록에서 지워도 예전 그래프는 옛 ID 를 그대로 들고 있다. */
const GEMINI_FALLBACK = 'gemini-2.5-flash'
const GPT_FALLBACK = 'gpt-4o-mini'

// POST /api/studio/promptgen { provider, model, brief, kind } → { ok, prompt }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  let me: any = null
  if (db) { try { await ensureSchema(db); me = await getSessionUser(request, db); if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401) } catch {} }

  const b: any = await request.json().catch(() => ({}))
  const model = String(b.model || '').trim()
  const isGemini = b.provider === 'gemini' || /^gemini/i.test(model)
  const kind = b.kind === 'video' ? 'video' : 'image'
  const brief = String(b.brief || '').trim().slice(0, 2000)
  if (!brief) return json({ ok: false, error: '무엇을 만들지 간단히 적어주세요.' }, 400)

  // 크레딧 사전 확인 (관리자 설정 비용)
  const cost = db ? await promptCost(db) : 0
  if (db && me && cost > 0) {
    const isAdmin = me.role === 'admin' || me.email === (env as any).ADMIN_EMAIL
    if (!isAdmin && (Number(me.credits) || 0) < cost) {
      return json({ ok: false, error: `크레딧이 부족합니다. (프롬프트 작성 ${cost} 크레딧 필요)`, needCredit: true }, 402)
    }
  }

  const userMsg = `Target: ${kind} generation.\nBrief: ${brief}\n\nWrite the single best ${kind} generation prompt.`
  const openaiKey = pick(env, ['GPT_API_KEY', 'OPENAI_API_KEY', 'gpt_api_key', 'openai_api_key'])
  const googleKey = pick(env, ['VEO_API_KEY', 'veo_api_key', 'GEMINI_API_KEY', 'gemini_api_key', 'GOOGLE_API_KEY'])

  try {
    let prompt = ''
    if (isGemini) {
      if (!googleKey) return json({ ok: false, error: 'Gemini(Google) API 키가 설정되지 않았습니다.' }, 400)
      const gm = /^gemini/i.test(model) ? model : GEMINI_FALLBACK
      const callGemini = (id: string) => fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(id) + ':generateContent?key=' + encodeURIComponent(googleKey),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYS }] },
            contents: [{ role: 'user', parts: [{ text: userMsg }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 500 },
          }),
        },
      )
      let r = await callGemini(gm)
      // 저장해 둔 워크플로우에 종료된 모델 ID 가 남아 있으면 404 가 난다 → 현행 모델로 1회 폴백.
      if (r.status === 404 && gm !== GEMINI_FALLBACK) r = await callGemini(GEMINI_FALLBACK)
      const j: any = await r.json().catch(() => ({}))
      if (!r.ok) return json({ ok: false, error: 'Gemini 오류: ' + String(j?.error?.message || r.status).slice(0, 160) }, 502)
      prompt = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim()
    } else {
      if (!openaiKey) return json({ ok: false, error: 'OpenAI(GPT) API 키가 설정되지 않았습니다.' }, 400)
      const gpt = /^gpt|^o[0-9]/i.test(model) ? model : GPT_FALLBACK
      const callGpt = (id: string) => fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + openaiKey },
        body: JSON.stringify({
          model: id,
          temperature: 0.9,
          max_tokens: 500,
          messages: [{ role: 'system', content: SYS }, { role: 'user', content: userMsg }],
        }),
      })
      let r = await callGpt(gpt)
      // 은퇴한 모델 ID(예전에 저장한 워크플로우)면 model_not_found 로 404/400 → 현행 모델로 1회 폴백.
      if ((r.status === 404 || r.status === 400) && gpt !== GPT_FALLBACK) r = await callGpt(GPT_FALLBACK)
      const j: any = await r.json().catch(() => ({}))
      if (!r.ok) return json({ ok: false, error: 'GPT 오류: ' + String(j?.error?.message || r.status).slice(0, 160) }, 502)
      prompt = String(j?.choices?.[0]?.message?.content || '').trim()
    }
    if (!prompt) return json({ ok: false, error: '응답이 비어 있습니다.' }, 502)

    // 성공 시에만 크레딧 차감
    if (db && me && cost > 0) {
      const isAdmin = me.role === 'admin' || me.email === (env as any).ADMIN_EMAIL
      if (!isAdmin) await applyBalance(db, me.id, 'credit', -cost, `프롬프트 작성 (${isGemini ? 'Gemini' : 'GPT'} · ${model || 'auto'})`).catch(() => {})
    }
    return json({ ok: true, prompt, provider: isGemini ? 'gemini' : 'gpt', model, cost })
  } catch (e: any) {
    return json({ ok: false, error: '프롬프트 생성 실패: ' + String(e?.message || e).slice(0, 160) }, 500)
  }
}
