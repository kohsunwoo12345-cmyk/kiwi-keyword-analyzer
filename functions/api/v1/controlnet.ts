// POST /api/v1/controlnet — ControlNet(Canny/Depth/Pose/Tile/Blur/Gray)로 이미지 생성.
//
// /api/v1/generate 에 provider:"falcontrol" 로 불러도 되지만, 그러려면 controlnets 배열을
// 정확한 모양으로 만들어 보내야 한다. 그 모양을 외우게 하는 대신 여기서 받아 준다 —
// 바깥에서 쓰는 사람은 "무슨 타입, 어떤 이미지, 얼마나 강하게" 만 정하면 된다.
//
// 과금은 /api/v1/generate 와 같은 자리에서 같은 규칙으로 일어난다(ControlNet 가산 +10% 포함).
// 그래서 여기서는 요청을 정규화만 하고 그 처리기에 그대로 넘긴다 — 돈 계산을 두 벌 만들면
// 언젠가 어긋난다.
//
// ⚠ ControlNet 가중치는 우리 것이 아니다(fal.ai 가 돌린다). 그래서 /api/v1/lease 로
//   빌려가는 대상이 아니다. 빌려주는 건 우리가 만든 초해상 모델뿐이다.
import { json } from '../_utils'
import { CONTROLNET_IMG } from '../studio/_pricing'
import { onRequestPost as generatePost } from './generate.js'

//  fal ControlNet Union 이 아는 타입만 받는다 — 모르는 타입은 조용히 무시되면 안 된다
const TYPES = ['canny', 'depth', 'pose', 'tile', 'blur', 'gray']

export const onRequestPost: PagesFunction = async (ctx) => {
  const request = ctx.request as Request
  let b: any
  try { b = await request.clone().json() } catch { b = null }
  if (!b || typeof b !== 'object') return json({ ok: false, error: 'JSON 본문이 필요합니다.' }, 400)

  const prompt = String(b.prompt || '').trim()
  if (!prompt) return json({ ok: false, error: 'prompt 는 필수입니다.' }, 400)

  /* 두 가지 모양을 다 받는다:
       간단형: { type:"canny", image_url:"...", strength:0.8 }
       스택형: { controls:[{type,image_url,strength,start,end}, ...] }  (최대 3개까지 겹친다) */
  const raw = Array.isArray(b.controls) && b.controls.length
    ? b.controls
    : (b.type ? [{ type: b.type, image_url: b.image_url || b.control_image_url, strength: b.strength, start: b.start, end: b.end }] : [])
  if (!raw.length) return json({ ok: false, error: 'type 또는 controls 가 필요합니다. 쓸 수 있는 타입: ' + TYPES.join(', ') }, 400)

  const bad = raw.find((c: any) => !TYPES.includes(String(c && c.type || '').toLowerCase()))
  if (bad) return json({ ok: false, error: `모르는 ControlNet 타입: ${bad.type}. 쓸 수 있는 것: ${TYPES.join(', ')}` }, 400)

  const missing = raw.find((c: any) => !String(c.image_url || c.control_image_url || b.image_url || '').trim())
  if (missing) return json({ ok: false, error: 'ControlNet 은 기준 이미지가 필요합니다 (image_url).' }, 400)

  const controlnets = raw.slice(0, 3).map((c: any) => ({
    type: String(c.type).toLowerCase(),
    control_image_url: String(c.image_url || c.control_image_url || b.image_url),
    strength: c.strength,
    start: c.start,
    end: c.end,
  }))

  //  실제 처리·과금은 /api/v1/generate 가 한다. 값 계산을 두 벌 만들지 않으려는 것이다.
  const inner = {
    ...b,
    provider: 'falcontrol',
    /* 청구는 단가표에 있는 이름으로 한다. 실제 fal 엔드포인트는 buildFalControlPayload 가
       스스로 정하므로(flux-general 고정) 이 이름이 생성에 영향을 주지 않는다 —
       표에 없는 이름을 넣으면 이미지 기본값으로 잡혀 원가와 어긋난다. */
    model: CONTROLNET_IMG,
    kind: 'image',
    prompt,
    controlnets,
    cn: controlnets.length,
    ratio: b.ratio || '1:1',
  }
  const req = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(inner),
  })
  return generatePost({ ...(ctx as any), request: req })
}

export const onRequestGet: PagesFunction = async () =>
  json({
    ok: true,
    types: TYPES,
    usage: {
      method: 'POST /api/v1/controlnet',
      headers: { Authorization: 'Bearer bg_live_...' },
      simple: { prompt: '눈 내리는 골목의 고양이', type: 'canny', image_url: 'https://…/ref.png', strength: 0.8 },
      stacked: {
        prompt: '…',
        controls: [
          { type: 'canny', image_url: 'https://…/edge.png', strength: 0.9 },
          { type: 'depth', image_url: 'https://…/depth.png', strength: 0.5, start: 0, end: 0.7 },
        ],
      },
    },
    note: 'ControlNet 가중치는 fal.ai 가 돌립니다 — 대여(/api/v1/lease) 대상이 아닙니다. 대여는 우리 초해상 모델만 가능합니다.',
    pricing: '이미지 생성 요금 + ControlNet 가산(기본 +10%). 크레딧은 스튜디오와 같은 규칙으로 차감됩니다.',
  })
