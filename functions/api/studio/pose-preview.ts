import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { enforceRateLimit, ensureApiKeysSchema } from '../_apikeys'

// POST /api/studio/pose-preview { imageUrl } → fal OpenPose/DWPose 전처리기로 "정확한" 포즈맵 생성.
//  MediaPipe(브라우저)는 애니/일러스트에 약하므로, 생성이 실제 쓰는 fal 전처리기로 정밀 포즈맵을 만든다.
//  인증: 로그인 세션 필수(유료 fal 호출) · 레이트리밋 적용. 크레딧 차감 없음(전처리는 저비용).

function falKey(env: any): string {
  for (const n of ['Fal_API_KEY', 'FAL_API_KEY', 'fal_api_key', 'FAL_KEY', 'Fal_KEY']) {
    const v = env && env[n]; if (v && String(v).trim()) return String(v).trim()
  }
  return ''
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  // 남용 방지 — 유료 fal 호출이므로 레이트리밋(관리자 면제)
  try { await ensureApiKeysSchema(db) } catch {}
  const rl = await enforceRateLimit(db, me.id, 'post', me.role === 'admin')
  if (!rl.ok) return json({ ok: false, error: rl.reason || '요청이 너무 많습니다.' }, 429)

  const key = falKey(env)
  if (!key) return json({ ok: false, error: 'fal 전처리기 미설정(FAL_API_KEY)' }, 503)

  const body: any = await request.json().catch(() => ({}))
  let imageUrl = String(body.imageUrl || body.image_url || '').trim()
  if (!imageUrl) return json({ ok: false, error: '이미지가 필요합니다.' }, 400)
  // 상대경로(/api/media/..)는 fal 이 접근 가능한 절대 URL 로 (data:·http(s): 는 그대로)
  if (imageUrl.startsWith('/')) imageUrl = new URL(request.url).origin + imageUrl

  const model = String((env as any).FAL_OPENPOSE_MODEL || (env as any).fal_openpose_model || 'fal-ai/image-preprocessors/openpose')
  try {
    const res = await fetch('https://fal.run/' + model, {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
    })
    const d: any = await res.json().catch(() => ({}))
    if (!res.ok) return json({ ok: false, error: 'fal 오류(' + res.status + ') ' + String(d?.detail || d?.error || '').slice(0, 160) }, 502)
    const url = d?.image?.url || (Array.isArray(d?.images) && d.images[0] && d.images[0].url) || d?.url || d?.output?.url
    if (!url) return json({ ok: false, error: 'fal 결과에 포즈 이미지가 없습니다.' }, 502)
    return json({ ok: true, url })
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e).slice(0, 160) }, 502)
  }
}
