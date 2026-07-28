import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser } from '../_utils'
import { MODEL_COST, PROV_LABEL, computeCharge, getUsdKrw } from '../studio/_pricing'
import {
  SEEDREAM_IDS, SEEDANCE_IDS, FLUX_ENDPOINTS, OPENAI_IMG_ID,
  HAILUO_IDS, LUMA_IDS, KLING_API, RUNWAY_MODELS, ARK3D_IDS, gcpCreds,
} from '../generate.js'

// GET /api/admin/ai-models — 연동된 AI 모델 전체 목록.
//  · 모델ID·제공사·종류·원가·크레딧 + "실제 호출 가능 상태"를 한 화면에 모은다.
//  · 상태: live(키 있음 + 모델ID 공식확인) / unverified(키는 있으나 모델ID 미확인) / nokey(키 미설정)
//  · 실제 생성 검증은 /api/generate?diag=images-all (이미지) · ?diag=seedance-all (영상) 로 수행.

function pick(env: any, names: string[]): string {
  for (const n of names) { const v = env[n]; if (v && String(v).trim()) return String(v).trim() }
  return ''
}

// 제공사 → 키 후보(자체 생성 경로가 실제로 읽는 이름과 동일해야 함)
const PROVIDER_KEYS: Record<string, string[]> = {
  seedance: ['Seedance_API_KEY', 'SEEDANCE_API_KEY', 'seedance_api_key'],
  seedream: ['Seedance_API_KEY', 'SEEDANCE_API_KEY', 'seedance_api_key'], // 씨댄스와 같은 ByteDance 키 공유
  flux: ['FLUX_API_KEY', 'flux_api_key', 'BFL_API_KEY'],
  openai: ['GPT_API_KEY', 'OPENAI_API_KEY', 'gpt_api_key', 'openai_api_key'],
  google: ['VEO_API_KEY', 'veo_api_key', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'],
  nanobanana: ['VEO_API_KEY', 'veo_api_key', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'],
  xai: ['Grok_API_KEY', 'GROK_API_KEY', 'grok_api_key'],
  runway: ['Runway_API_KEY', 'RUNWAY_API_KEY', 'runway_api_key'],
  runway_aleph: ['Runway_API_KEY', 'RUNWAY_API_KEY', 'runway_api_key'],
  hailuo: ['Hailuo_API_KEY', 'HAILUO_API_KEY', 'hailuo_api_key', 'MINIMAX_API_KEY'],
  luma: ['Luma_API_KEY', 'LUMA_API_KEY', 'luma_api_key'],
  // 3D 생성·프롬프트 작성 LLM 은 씨댄스와 같은 ByteDance ModelArk 키를 쓴다
  ark3d: ['Seedance_API_KEY', 'SEEDANCE_API_KEY', 'seedance_api_key'],
  promptgen: ['Seedance_API_KEY', 'SEEDANCE_API_KEY', 'seedance_api_key'],
  kling: ['KLING_ACCESS_KEY', 'Kling_API_KEY', 'KLING_API_KEY', 'Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY'],
  falcontrol: ['Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY', 'fal_api_key'],
  motion: ['Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY', 'fal_api_key'],
  lipsync: ['Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY', 'fal_api_key'],
  narrate: ['Fal_API_KEY', 'FAL_API_KEY', 'FAL_KEY', 'fal_api_key'],
  v2v_auto: ['Runway_API_KEY', 'RUNWAY_API_KEY', 'Seedance_API_KEY', 'Fal_API_KEY', 'FAL_API_KEY'],
}

// 모델ID 매핑 원본(생성 코드와 동일한 객체를 그대로 import → 값이 어긋날 수 없음)
function modelIdOf(model: string): string {
  const s = (SEEDREAM_IDS as any)[model]; if (s) return Array.isArray(s) ? s[0] : s
  const d = (SEEDANCE_IDS as any)[model]; if (d) return d
  const f = (FLUX_ENDPOINTS as any)[model]; if (f) return f
  const o = (OPENAI_IMG_ID as any)[model]; if (o) return o
  const h = (HAILUO_IDS as any)[model]; if (h) return h
  const l = (LUMA_IDS as any)[model]; if (l) return l
  const t = (ARK3D_IDS as any)[model]; if (t) return Array.isArray(t) ? t[0] : t
  // 프롬프트 작성 LLM 은 표시명이 곧 모델 ID 다(deepseek-v4-pro-260425 등)
  if (/^(deepseek|glm|dola-seed|gpt-oss|doubao|skylark|kimi)-/i.test(model)) return model
  const k = (KLING_API as any)[model]; if (k) return `${k.m} (${k.mode}/${k.ep})`
  const r = (RUNWAY_MODELS as any)[model]; if (r) return r
  if (model === 'Google Veo 3.1') return 'veo-3.1-generate-001'
  if (model === 'Nano Banana') return 'gemini-2.5-flash-image'
  if (/Grok Imagine/.test(model)) return 'grok-imagine-image'
  return '(파이프라인 — 단일 모델 아님)'
}

// 모델ID를 공식 문서로 확인했는지. false = 콘솔 표기와 다를 수 있어 실검증 필요.
// (Seedream 4.5/5.0 은 ByteDance 공식 문서 직접열람이 막혀 있어 후보 폴백으로 처리)
const UNVERIFIED_IDS = new Set<string>([
  'Seedream 5.0 Pro', 'Seedream 5.0 Pro (레퍼런스 편집)',
  'Seedream 5.0 Lite', 'Seedream 5.0 Lite (레퍼런스 편집)',
  'Seedream 4.5', 'Seedream 4.5 (레퍼런스 편집)',
  // 3D 는 요청 형식은 확정했으나(콘솔 cURL) 성공 응답을 아직 실물로 못 봤다.
  'Hyper3D Gen-2 (3D 생성)', 'Hitem3D 2.0 (3D 생성)',
  // 루마 Agents API 로 막 교체한 신규 모델 — 실제 생성 확인 전.
  'Luma Ray 3.2', 'Luma Uni 1', 'Luma Uni 1 Max',
])

// 여러 제공사를 조합하는 파이프라인(단일 모델 아님)
const PIPELINES = new Set<string>([
  'V2V 자동 (최고정확도·모델 자동선택)', '모션 전이 (원본 움직임 유지·Motion Transfer)',
  '나레이션 (AI 음성 해설)', '립싱크 (인물 말하기)',
])

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const e: any = env
  const rate = await getUsdKrw(db)

  const keyOf: Record<string, boolean> = {}
  for (const [prov, names] of Object.entries(PROVIDER_KEYS)) keyOf[prov] = !!pick(e, names)
  // 나노바나나·Veo 는 Vertex 서비스계정으로도 동작 (생성 경로와 동일한 판정 함수 사용)
  if (gcpCreds(e)) { keyOf.google = true; keyOf.nanobanana = true }

  const models = Object.keys(MODEL_COST).map((model) => {
    const m: any = (MODEL_COST as any)[model]
    // 'img'(장당)·'3d'(모델 1개당)·'tok'(호출 1회당) 은 단위 1개 과금 → 초당 계산을 타면 안 된다.
    const kind = m.u === 'sec' ? 'video' : m.u === '3d' ? '3d' : m.u === 'tok' ? 'llm' : 'image'
    const prov = m.prov as string
    const keyConfigured = !!keyOf[prov]
    const isPipeline = PIPELINES.has(model)
    const idUnverified = UNVERIFIED_IDS.has(model)
    const status = !keyConfigured ? 'nokey' : idUnverified ? 'unverified' : 'live'
    const c = computeCharge({ model, units: kind === 'image' ? 1 : 8, kind, res: '1080p' } as any, rate)
    return {
      model,
      modelId: modelIdOf(model),
      provider: prov,
      providerLabel: PROV_LABEL[prov] || prov,
      kind,
      unit: m.u,               // 'img' = 장당 · 'sec' = 초당
      usd: m.usd,
      audioUsd: m.audio || 0,
      credits: c.credits,      // 기본 배수 기준 예상 크레딧(이미지 1장 / 영상 8초)
      keyConfigured,
      isPipeline,
      idUnverified,
      status,                  // live | unverified | nokey
    }
  })

  const providers = [...new Set(models.map((x) => x.provider))].map((p) => ({
    id: p, label: PROV_LABEL[p] || p, keyConfigured: !!keyOf[p],
    count: models.filter((x) => x.provider === p).length,
  })).sort((a, b) => a.label.localeCompare(b.label, 'ko'))

  return json({
    ok: true,
    usdKrw: rate,
    summary: {
      total: models.length,
      live: models.filter((x) => x.status === 'live').length,
      unverified: models.filter((x) => x.status === 'unverified').length,
      nokey: models.filter((x) => x.status === 'nokey').length,
      image: models.filter((x) => x.kind === 'image').length,
      video: models.filter((x) => x.kind === 'video').length,
    },
    providers,
    models,
  })
}
