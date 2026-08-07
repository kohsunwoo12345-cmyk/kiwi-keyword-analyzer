/* ══════════════════════════════════════════════════════════════════════════
   Recraft — 래스터 이미지 + **벡터(SVG)** 생성 한 곳
   ──────────────────────────────────────────────────────────────────────────
   알리바바(_alibaba.ts)·LTX(_ltx.ts)와 같은 자리다. 서버 단가표(MODEL_COST)·
   등록부(_registry)·관리자 화면(ai-models)이 전부 이 표 하나를 본다.

   ── 왜 Recraft 인가 ────────────────────────────────────────────────────
   우리 이미지 모델 중 **벡터를 내는 게 하나도 없다.** 로고·아이콘·타이포그래피는
   래스터로 뽑아 봐야 확대하면 깨져서 실제 마케팅 결과물로 못 쓴다.
   Recraft 는 SVG 를 직접 낸다 — 지금 우리에게 없는 유일한 종류다.

   ── 이 표의 출처 (LTX 와 다르다. 여기는 실제로 읽었다) ──────────────────
   recraft.ai 자체는 이 개발 환경에서 403 이지만, **공개된 OpenAPI 명세를 통째로
   받아 읽었다**(api-evangelist/recraft-ai · openapi/, 2026-05-22판).
     · 주소   servers: https://external.api.recraft.ai/v1
     · 인증   bearerAuth — Authorization: Bearer <토큰>
     · 모델   GenerationRequest.model 의 enum 값 그대로 (recraftv4_1 … recraftv2)
     · 경로   래스터 /images/generations · 벡터 /images/generations/vector
     · 단가   plans/recraft-ai-plans-pricing.yml 의 operations 표 (1,000 API unit = $1)
   즉 모델 ID 는 **enum 에서 그대로 옮긴 것**이지 지어낸 것이 아니다.

   ⚠ 다만 이 명세는 Recraft 가 아니라 제3자가 정리해 공개한 것이다. 값은 구체적이고
     서로 앞뒤가 맞지만, **제공사 원문으로 대조한 것은 아니다.** 그래서 단가에 '잠정'
     표시를 남겨 둔다. 관리자 → 모델 단가에서 실측값을 넣으면 그 값이 언제나 이긴다.
     확정 방법은 청구서를 그 달 장수로 나눠 역산하는 것이다.

   ── ⚠ 아직 연결 전이다 ────────────────────────────────────────────────
   키(Recraft_API_KEY)는 들어와 있고 키가 진짜 되는지는 관리자 → Recraft 키 확인에서
   무과금으로 가린다. 하지만 **생성 경로는 아직 없다.** 그래서 이 모델들은 등록부에
   꺼진 채로 심긴다 — 켜 두면 "고를 수는 있는데 누르면 실패" 인 모델이 회원에게 나간다.

   ── 연결할 때 먼저 풀어야 할 것: 결과가 SVG 다 ─────────────────────────
   벡터 모델의 응답은 .svg 다. 우리 보관함·갤러리·업스케일은 png/jpg/webp 를 전제로
   돌아간다. 벡터를 켜기 전에 그쪽을 먼저 봐야 한다 — 안 보고 켜면 "만들어지긴 했는데
   화면에 안 뜨는" 결과물이 쌓인다. 래스터 모델만 먼저 켜는 것도 방법이다.
   ══════════════════════════════════════════════════════════════════════════ */

import type { KeyProvider } from './_keycheck'

export type RecraftRow = {
  name: string          // 스튜디오 표시명
  id: string            // 제공사 모델 ID (OpenAPI enum 값 그대로)
  kind: 'image'
  unit: 'img'
  usd: number           // 장당 — 위 operations 표의 priceUsd
  /** 어느 경로로 나가는가. 같은 모델 ID 라도 경로가 벡터냐 래스터냐로 단가가 갈린다. */
  vector: boolean
  cat: string
  opts: any
}

/* 비율은 명세에 적힌 14종 그대로다(size 는 "1024x1024" 같은 실치수도 받는다).
   벡터는 확대해도 안 깨지므로 해상도 선택이 의미 없다 — res 를 비워 둔다. */
const RATIOS = ['1:1', '2:1', '1:2', '3:2', '2:3', '4:3', '3:4', '5:4', '4:5', '6:10', '14:10', '10:14', '16:9', '9:16']
const IOPT = {
  secs: [], ratios: RATIOS, res: [],
  audio: false, watermark: false, neg: true, cfg: false, seed: false,
}

const CAT_RASTER = '이미지 · Recraft'
const CAT_VECTOR = '이미지 (벡터 SVG) · Recraft'

/* ⚠ opts 에 vector 를 실어 둔다. 등록부는 표시명·제공사·모델 ID 만 남기는데, Recraft 는
   **같은 모델 ID 가 경로 두 개로 갈린다**(래스터/벡터). ID 만 보면 어느 쪽인지 알 수 없어
   나중에 생성 경로를 붙일 때 벡터를 래스터 경로로 보내게 된다 — 결과도 요금도 달라진다. */
const R = (name: string, id: string, usd: number, vector: boolean): RecraftRow =>
  ({ name, id, kind: 'image', unit: 'img', usd, vector,
     cat: vector ? CAT_VECTOR : CAT_RASTER, opts: { ...IOPT, vector } })

export const RECRAFT_MODELS: RecraftRow[] = [
  /* ── 래스터(PNG·WEBP·JPG) ── */
  R('Recraft V4.1 (이미지)', 'recraftv4_1', 0.04, false),
  R('Recraft V4.1 Pro (이미지)', 'recraftv4_1_pro', 0.25, false),
  R('Recraft V4.1 Utility (이미지)', 'recraftv4_1_utility', 0.04, false),
  R('Recraft V4 (이미지)', 'recraftv4', 0.04, false),
  R('Recraft V4 Pro (이미지)', 'recraftv4_pro', 0.25, false),
  R('Recraft V3 (이미지)', 'recraftv3', 0.04, false),
  R('Recraft V2 (이미지)', 'recraftv2', 0.022, false),

  /* ── 벡터(SVG) — 우리에게 없던 종류다. 로고·아이콘·타이포그래피용 ── */
  R('Recraft V4.1 (벡터 SVG)', 'recraftv4_1', 0.08, true),
  R('Recraft V4.1 Pro (벡터 SVG)', 'recraftv4_1_pro', 0.30, true),
  R('Recraft V4 (벡터 SVG)', 'recraftv4', 0.08, true),
  R('Recraft V4 Pro (벡터 SVG)', 'recraftv4_pro', 0.30, true),
  R('Recraft V3 (벡터 SVG)', 'recraftv3', 0.08, true),
  R('Recraft V2 (벡터 SVG)', 'recraftv2', 0.044, true),
]

/** 표시명 → 행. */
export const RECRAFT_BY_NAME: Record<string, RecraftRow> =
  RECRAFT_MODELS.reduce((o, r) => { o[r.name] = r; return o }, {} as Record<string, RecraftRow>)

/* 주소는 명세의 servers 값 하나다. LTX 처럼 후보를 훑을 이유가 없다 — 원문을 읽었다. */
export const RECRAFT_BASE = 'https://external.api.recraft.ai/v1'

/** 어느 경로로 제출하는가. 같은 모델 ID 라도 벡터는 경로가 다르고 단가도 다르다. */
export const recraftPath = (row: RecraftRow) =>
  row.vector ? '/images/generations/vector' : '/images/generations'

/** 키 환경변수 후보 — generate.js 의 keys() 와 같은 값이어야 한다. */
export const RECRAFT_KEY_NAMES = ['Recraft_API_KEY', 'RECRAFT_API_KEY', 'recraft_api_key', 'RECRAFTAI_API_KEY']

/** 아직 생성 경로가 없다. 화면이 "연동됨" 으로 보이지 않게 하는 단 하나의 값. */
export const RECRAFT_WIRED = false

/* Recraft 잔액은 "API unit" 으로 온다. 1,000 unit = $1.00 (명세의 unitDefinitions).
   화면에 12345 라고만 띄우면 그게 돈인지 장수인지 아무도 모른다 — 달러로 바꿔 준다. */
export const RECRAFT_UNITS_PER_USD = 1000

/* 키 확인(무과금)에 쓸 정의. 판정 로직은 _keycheck.ts 한 군데에만 있다.

   ⚠ 읽어 볼 경로가 **하나뿐**인 것은 실수가 아니다.
     명세에 GET 은 /users/me 하나다. 그리고 그거면 충분하다 — 계정과 잔액을 돌려주는,
     인증을 반드시 보는 경로다. LTX 처럼 후보를 훑을 이유가 없다(주소를 원문으로 읽었다).
     생성 경로(/images/generations…)는 **아예 건드리지 않는다.** GET 이라도 생성 주소를
     두들기면 "확인만 했는데" 라는 말이 나오게 된다. 그럴 필요가 없으니 하지 않는다. */
export const RECRAFT_KEYCHECK: KeyProvider = {
  id: 'recraft',
  label: 'Recraft',
  envNames: RECRAFT_KEY_NAMES,
  hosts: [RECRAFT_BASE],
  hostOverrideEnv: ['RECRAFT_HOST_OVERRIDE', 'recraft_host_override'],
  console: 'https://www.recraft.ai/profile/api',
  wired: RECRAFT_WIRED,
  주소근거: '공개된 OpenAPI 명세(2026-05-22판)의 servers 값을 그대로 씁니다 — '
          + 'https://external.api.recraft.ai/v1. 인증은 Authorization: Bearer 입니다.',
  probes: [
    { 이름: '계정·잔액 조회 (GET /users/me)', path: '/users/me', 종류: 'account' },
  ],
  //  credits 는 API unit 이다. 달러로 바꿔 보여 준다(1,000 unit = $1).
  balance: (j) => {
    const n = Number(j && (j.credits ?? (j.data && j.data.credits)))
    return Number.isFinite(n) ? { value: n / RECRAFT_UNITS_PER_USD, unit: 'USD' } : null
  },
}
