/* ══════════════════════════════════════════════════════════════════════════
   Stability AI — Stable Image / Stable Diffusion
   ──────────────────────────────────────────────────────────────────────────
   알리바바·LTX·Recraft·Bria 와 같은 자리다. 서버 단가표(MODEL_COST)·등록부·
   관리자 화면이 전부 이 표 하나를 본다.

   ── ⚠ 환경변수 이름부터 ────────────────────────────────────────────────
   받은 이름이 `Stabilitya-API-KEY` 였다. Stability 에 a 가 하나 더 붙어 있고
   구분자도 밑줄이 아니라 붙임표다. 오타로 보이지만 **진짜 그 이름으로 넣었을 수도**
   있어서 지어내지 않는다. 그래서 후보를 넓게 잡고, 관리자 → Stability 키 확인 화면이
   **실제로 잡힌 이름을 그대로 보여 준다.** "키 없음" 과 "이름이 다름" 은 다른 문제이고,
   화면이 그 둘을 구분해 주지 않으면 멀쩡한 키를 두고 헤매게 된다.

   ── 이 표의 출처 ───────────────────────────────────────────────────────
   api.stability.ai·platform.stability.ai 는 이 개발 환경에서 403 이다. 대신
   공개된 OpenAPI 명세 묶음(api-evangelist/stability-ai, openapi/)을 받아 읽었다.
     · 주소   servers: https://api.stability.ai
     · 인증   bearerAuth — Authorization: Bearer <키>   (Bria 와 달리 표준 방식이다)
     · 경로   생성 /v2beta/stable-image/generate/{ultra|core|sd3}
              (편집·업스케일·3D·영상 경로도 같은 묶음에 있다 — 아래 참고)
   단가는 같은 저장소의 요금 정리(1 credit = $0.01)와 우리 조사 문서가 같은 값이다:
     Ultra $0.08(8크레딧) · Core $0.03(3크레딧)

   ── ⚠ 지금 이 시점의 위험: 값이 막 바뀌었을 수 있다 ────────────────────
   조사 중에 "2026년 8월에 장당 크레딧이 1.25 → 8 로 소급 변경됐다" 는 이용자 보고를
   봤다. 오늘이 그 달이다. 사실이면 우리 표가 하루아침에 몇 배 틀릴 수 있고,
   그 방향이 "우리가 싸게 팔았다" 쪽이면 되돌릴 수 없다.
   → 그래서 이 제공사는 **켜기 전에 관리자 → 모델 단가에서 실측값을 넣는 것**을
     연결 조건으로 본다. 청구서 한 장을 그달 장수로 나누면 바로 나온다.

   ── 일부러 안 넣은 것 ─────────────────────────────────────────────────
   편집(erase·inpaint·outpaint·search-and-replace·remove-background)·업스케일 3종·
   3D·영상 경로가 명세에 다 있다. **단가를 못 구해서 넣지 않았다.**
   모르는 값을 넣으면 그 차액을 우리가 문다. 값을 확인하면 이 표에 줄만 더하면 된다.

   ── 우선순위는 낮다(그래도 붙이는 이유) ────────────────────────────────
   우리 조사 문서의 판단은 "Flux 8종이 이미 상위 호환, 우선순위 낮음" 이다. 맞다.
   다만 키가 들어와 있으니 **그 키가 살아 있는지**는 지금 답할 수 있어야 하고,
   나머지 제공사와 같은 자리에 같은 모양으로 놓여 있어야 나중에 붙일 때 헷갈리지 않는다.
   ══════════════════════════════════════════════════════════════════════════ */

import type { KeyProvider } from './_keycheck'

export type StabilityRow = {
  name: string          // 스튜디오 표시명
  id: string            // 우리가 부를 경로(제공사가 경로로 모델을 가른다)
  kind: 'image'
  unit: 'img'
  usd: number           // 장당
  cat: string
  opts: any
}

/* 비율은 명세의 aspect_ratio 값 그대로다. 해상도는 모델이 정하므로 고르게 두지 않는다. */
const IOPT = {
  secs: [], ratios: ['1:1', '16:9', '9:16', '3:2', '2:3', '4:5', '5:4', '21:9', '9:21'], res: [],
  audio: false, watermark: false, neg: true, cfg: false, seed: true,
}

const CAT = '이미지 · Stability AI'

const S = (name: string, id: string, usd: number): StabilityRow =>
  ({ name, id, kind: 'image', unit: 'img', usd, cat: CAT, opts: IOPT })

/* ⚠ 단가를 **천장으로 올려 잡았다.** 위 머리말의 "2026-08 에 장당 1.25 → 8 크레딧으로
   소급 변경" 보고가 사실이면, 명세 그대로(Core 3크레딧 = $0.03)로 켜는 순간 장마다
   차액을 우리가 문다. 그리고 그건 되돌릴 수 없다 — 이미 만들어 준 것은 못 무른다.
   반대로 비싸게 잡아 두면 청구서를 보고 관리자 → 모델 단가에서 **내리면 그만**이다.
   그래서 셋 다 확인된 최고치(8크레딧 = $0.08) 기준으로 둔다.
   명세 원문 값은 지우지 않고 여기 남긴다 — 확인되면 이 줄로 되돌리면 된다:
       Ultra $0.08(8크레딧) · Core $0.03(3크레딧) · SD3.5 $0.065(가장 비싼 변형 기준)
   알리바바에서 쓴 근거 등급과 같은 뜻이다: A = 출처 둘이 일치, C = 우리 천장 추정. */
export const STABILITY_MODELS: StabilityRow[] = [
  S('Stable Image Ultra', '/v2beta/stable-image/generate/ultra', 0.08),
  S('Stable Image Core', '/v2beta/stable-image/generate/core', 0.08),
  /* sd3 경로는 요청의 model 값으로 여러 변형(large·large-turbo·medium)을 가른다.
     변형마다 크레딧이 다른데 그 표를 확인하지 못했다. 한 줄로 두되 **가장 비싼 변형 기준**
     으로 잡는다 — 싸게 잡으면 회원이 큰 모델을 고를 때마다 차액을 우리가 물고,
     그건 되돌릴 수 없다. 확인되면 관리자 → 모델 단가에서 내리면 된다. */
  S('Stable Diffusion 3.5', '/v2beta/stable-image/generate/sd3', 0.08),
]

/** 표시명 → 행. */
export const STABILITY_BY_NAME: Record<string, StabilityRow> =
  STABILITY_MODELS.reduce((o, r) => { o[r.name] = r; return o }, {} as Record<string, StabilityRow>)

/** 명세의 servers 값 하나다. */
export const STABILITY_BASE = 'https://api.stability.ai'

/* 키 환경변수 후보 — generate.js 의 keys() 와 같은 값이어야 한다.
   ⚠ 받은 이름(`Stabilitya-API-KEY`)을 **맨 앞에 그대로** 둔다. 오타처럼 보인다고
     빼면, 진짜 그 이름으로 넣어 뒀을 때 "키가 없다" 는 틀린 답이 나온다.
     표준형도 함께 본다 — 나중에 이름을 고쳐도 그대로 잡힌다. */
export const STABILITY_KEY_NAMES = [
  'Stabilitya-API-KEY', 'Stabilitya_API_KEY',
  'Stability-API-KEY', 'Stability_API_KEY', 'STABILITY_API_KEY', 'stability_api_key',
  'STABILITY_AI_API_KEY', 'SD_API_KEY',
]

/** 생성 경로가 붙었다(v2beta · multipart). 화면의 "연결 전" 딱지를 가르는 단 하나의 값.
    등록부에서도 켠다 — 다만 단가는 위처럼 **천장으로** 잡아 두었다. 싸게 잡고 켜는 것과
    비싸게 잡고 켜는 것은 위험이 다르다. 전자는 못 무르고 후자는 관리자가 내리면 된다.
    관리자 화면에는 [잠정] 딱지가 붙는다(admin/ai-models.ts costProvisional). */
export const STABILITY_WIRED = true

/* 키 확인(무과금)에 쓸 정의. 판정 로직은 _keycheck.ts 한 군데에만 있다.

   ⚠ 조회 전용 경로만 읽고 **생성 경로(/v2beta/stable-image/…)는 아예 안 건드린다.**
     다만 Recraft·Bria 와 달리 **읽기 경로를 원문으로 확정하지 못했다** — 받아 본 명세
     묶음에는 생성 계열만 있고 계정·잔액 조회가 없었다. 그래서 LTX 때처럼 후보를 훑어
     실제로 답하는 것을 찾는다. 어느 것이 답했는지는 화면 표에 그대로 나온다.
     (최종 판정은 여기에 더해 '일부러 틀린 키' 대조까지 보고 낸다 — 404 만 보고
      "키가 죽었다" 고 하지 않는다.) */
export const STABILITY_KEYCHECK: KeyProvider = {
  id: 'stability',
  label: 'Stability AI',
  envNames: STABILITY_KEY_NAMES,
  hosts: [STABILITY_BASE],
  hostOverrideEnv: ['STABILITY_HOST_OVERRIDE', 'stability_host_override'],
  console: 'https://platform.stability.ai/account/keys',
  wired: STABILITY_WIRED,
  주소근거: '공개 OpenAPI 명세(api-evangelist/stability-ai)의 servers 값을 그대로 씁니다 — '
          + 'https://api.stability.ai, 인증은 Authorization: Bearer 입니다. '
          + '다만 계정·잔액 조회 경로는 그 명세에 없어 확정하지 못했습니다 — 후보를 훑어 실제로 답하는 것을 찾습니다.',
  probes: [
    { 이름: '잔액 조회', path: '/v1/user/balance', 종류: 'account' },
    { 이름: '계정 조회', path: '/v1/user/account', 종류: 'account' },
    { 이름: '엔진 목록', path: '/v1/engines/list', 종류: 'models' },
  ],
  //  크레딧이 곧 돈이다(1 credit = $0.01). 숫자만 띄우면 그게 돈인지 장수인지 모른다.
  balance: (j) => {
    const n = Number(j && (j.credits ?? j.balance ?? j.credit_balance))
    return Number.isFinite(n) ? { value: n * 0.01, unit: 'USD' } : null
  },
}
