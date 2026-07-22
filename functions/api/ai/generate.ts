import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, logActivity } from '../_utils'

// POST /api/ai/generate { prompt, system?, feature, cost?, max_tokens? } → OpenAI 텍스트 생성 (크레딧 차감)
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const prompt = String(body.prompt || '').trim()
  const system = String(body.system || '당신은 한국어 마케팅 콘텐츠 전문가입니다. 자연스럽고 전환율 높은 카피를 작성합니다.')
  const feature = String(body.feature || 'AI 생성')
  if (!prompt) return json({ ok: false, error: '내용을 입력하세요.' }, 400)

  // ── 남용 방지: 모델·비용을 서버가 확정한다(클라이언트가 고가 모델을 1크레딧에 쓰는 것을 차단) ──
  //  저비용 텍스트 모델만 허용하고, 각 모델의 크레딧 원가를 서버에서 강제한다.
  const MODEL_COSTS: Record<string, number> = { 'gpt-4o-mini': 2, 'gpt-5-mini': 2, 'gpt-4.1-mini': 2 }
  const reqModel = String(body.model || 'gpt-4o-mini')
  const model = MODEL_COSTS[reqModel] ? reqModel : 'gpt-4o-mini'
  const cost = MODEL_COSTS[model] || 2

  // 크레딧 선차감
  const spend = await spendCredits(db, me.id, cost, feature, prompt.slice(0, 40))
  if (!spend.ok) return json({ ok: false, error: spend.error, balance: (spend as any).balance }, 402)

  const apiKey = env?.OPENAI_API_KEY
  const refund = async (reason: string, status = 200, extra: any = {}) => {
    await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(cost, me.id).run()
    return json({ ok: false, error: reason, refunded: true, ...extra }, status)
  }
  if (!apiKey) return refund('OPENAI_API_KEY 환경변수가 설정되지 않았습니다. (크레딧 환불됨)')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: Math.min(2000, Math.max(100, Number(body.max_tokens || 900))),
        temperature: 0.8,
      }),
    })
    if (!res.ok) {
      const errTxt = await res.text().catch(() => '')
      return refund(`OpenAI 응답 오류 (${res.status})`, 200, { detail: errTxt.slice(0, 200) })
    }
    const data: any = await res.json()
    const text = data?.choices?.[0]?.message?.content?.trim() || ''
    if (!text) return refund('생성 결과가 비어 있습니다.')
    await logActivity(db, me.id, 'credit', `${feature} 생성 (-${cost} 크레딧)`)
    const fresh: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
    return json({ ok: true, text, cost, credits: fresh?.credits ?? null })
  } catch (e: any) {
    return refund(`생성 실패: ${String(e?.message || e).slice(0, 120)}`)
  }
}
