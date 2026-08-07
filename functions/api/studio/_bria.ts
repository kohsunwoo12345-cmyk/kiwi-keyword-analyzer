/* ══════════════════════════════════════════════════════════════════════════
   Bria — "저작권이 안전한" 이미지 생성·편집 한 곳
   ──────────────────────────────────────────────────────────────────────────
   알리바바(_alibaba.ts)·LTX(_ltx.ts)·Recraft(_recraft.ts)와 같은 자리다.
   서버 단가표(MODEL_COST)·등록부(_registry)·관리자 화면이 전부 이 표 하나를 본다.

   ── 왜 Bria 인가 ───────────────────────────────────────────────────────
   품질이 아니라 **라이선스** 때문이다. Bria 는 사용권을 확보한 데이터로만 학습했다고
   내세운다. 회원이 만든 이미지를 광고·상세페이지처럼 **파는 물건에 얹을 때** 우리가
   "이건 저작권이 안전하다" 고 말할 수 있는 유일한 제공사다.
   (docs/model-gap-weave-higgsfield.md 에서 4순위로 꼽아 둔 그 이유 그대로다.)
   배경 제거·확장·지우기 같은 편집 API 도 강해서 마케팅 소재 다듬기에 바로 쓰인다.

   ── 이 표의 출처 ───────────────────────────────────────────────────────
   bria.ai·docs.bria.ai 는 이 개발 환경에서 403 이다. 대신 **Bria 가 직접 배포하는
   공식 ComfyUI 노드 저장소**(github.com/Bria-AI/ComfyUI-BRIA-API)를 통째로 받아
   코드에서 읽었다. 문서가 아니라 그들이 실제로 호출하는 코드다.
     · 주소   https://engine.prod.bria-api.com
     · 인증   ⚠ **`api_token: <키>` 헤더다. Bearer 가 아니다.**
              (nodes/common.py 의 bria_json_headers)
     · 경로   생성 /v2/image/generate · /v2/image/generate/lite
              편집 /v2/image/edit/{remove_background|replace_background|erase|gen_fill|expand|enhance}
     · 조회   GET /v1/tailored-gen/models/{id}  ← 읽기 전용. 키 확인에 쓴다.
   단가는 공개 가격 조사값이고 배경 제거 $0.018 은 우리 조사 문서와도 값이 같다.

   ⚠ 그래도 '잠정' 표시를 남긴다. 제공사 공식 가격표 원문을 못 봤다.
     관리자 → 모델 단가에서 실측값을 넣으면 그 값이 언제나 이긴다.

   ── 일부러 안 넣은 것: 영상 편집 ──────────────────────────────────────
   Bria 는 영상 배경 제거·그린스크린·해상도 올리기도 있다
   (/v2/video/edit/{remove_background|green_screen|increase_resolution|erase}).
   **단가를 하나도 못 구해서 넣지 않았다.** 초당인지 건당인지도 모른다.
   모르는 값을 넣으면 그 차액만큼 우리가 물게 되고, 그건 되돌릴 수 없다.
   가격을 확인하면 이 표에 줄만 더하면 된다.

   ── ⚠ 아직 연결 전이다 ────────────────────────────────────────────────
   키(BRIA_API_KEY)는 들어와 있고 진짜 되는지는 관리자 → Bria 키 확인에서 무과금으로
   가린다. 하지만 **생성 경로는 아직 없다.** 그래서 등록부에 꺼진 채로 심긴다 —
   켜 두면 "고를 수는 있는데 누르면 실패" 인 모델이 회원에게 나간다.

   ── 연결할 때 먼저 볼 것: v2 는 비동기다 ───────────────────────────────
   v2 는 즉시 결과를 안 주고 request_id 와 status_url 을 돌려준다. 우리 생성 경로의
   폴링(statusUrl) 방식에 맞춰야 하고, 실패로 끝나면 환불이 돌아야 한다 —
   알리바바에서 "제출됐다 = 성공" 으로 봤다가 데인 자리와 같은 모양이다.
   ══════════════════════════════════════════════════════════════════════════ */

import type { KeyProvider } from './_keycheck'

export type BriaRow = {
  name: string          // 스튜디오 표시명
  id: string            // 우리가 부를 경로(제공사에 '모델 ID' 개념이 없어 경로가 곧 식별자다)
  kind: 'image'
  unit: 'img'
  usd: number           // 장당
  cat: string
  /** 원본 이미지가 있어야 도는 편집 기능인가 — 노드가 입력을 요구해야 한다 */
  needsImage: boolean
  opts: any
}

/* 비율·해상도 선택은 생성 계열만 의미가 있다. 편집은 원본을 따라간다.
   seed 는 공식 노드가 실제로 받는 값이라 켜 둔다. */
const GEN_OPT = {
  secs: [], ratios: ['1:1', '16:9', '9:16', '4:3', '3:4'], res: [],
  audio: false, watermark: false, neg: true, cfg: false, seed: true,
}
const EDIT_OPT = {
  secs: [], ratios: [], res: [],
  audio: false, watermark: false, neg: false, cfg: false, seed: false,
}

const CAT_GEN = '이미지 · Bria(저작권 안전)'
const CAT_EDIT = '이미지 (편집) · Bria'

const G = (name: string, id: string, usd: number): BriaRow =>
  ({ name, id, kind: 'image', unit: 'img', usd, cat: CAT_GEN, needsImage: false, opts: GEN_OPT })
const E = (name: string, id: string, usd: number): BriaRow =>
  ({ name, id, kind: 'image', unit: 'img', usd, cat: CAT_EDIT, needsImage: true, opts: EDIT_OPT })

export const BRIA_MODELS: BriaRow[] = [
  /* ── 생성 (FIBO) ── */
  G('Bria FIBO (텍스트→이미지)', '/v2/image/generate', 0.03),
  G('Bria FIBO Lite (텍스트→이미지)', '/v2/image/generate/lite', 0.02),

  /* ── 편집 — 마케팅 소재 다듬기에 바로 쓰이는 것들 ── */
  E('Bria 배경 제거', '/v2/image/edit/remove_background', 0.018),
  E('Bria 배경 교체', '/v2/image/edit/replace_background', 0.03),
  E('Bria 지우기 (Erase)', '/v2/image/edit/erase', 0.03),
  E('Bria 채우기 (Gen Fill)', '/v2/image/edit/gen_fill', 0.03),
  E('Bria 확장 (Expand)', '/v2/image/edit/expand', 0.03),
  E('Bria 화질 개선 (Enhance)', '/v2/image/edit/enhance', 0.03),
]

/** 표시명 → 행. */
export const BRIA_BY_NAME: Record<string, BriaRow> =
  BRIA_MODELS.reduce((o, r) => { o[r.name] = r; return o }, {} as Record<string, BriaRow>)

/** 주소는 공식 노드 코드에서 읽은 값 하나다 — 후보를 훑을 이유가 없다. */
export const BRIA_BASE = 'https://engine.prod.bria-api.com'

/** 키 환경변수 후보 — generate.js 의 keys() 와 같은 값이어야 한다. */
export const BRIA_KEY_NAMES = ['BRIA_API_KEY', 'Bria_API_KEY', 'bria_api_key', 'BRIA_API_TOKEN']

/** ⚠ Bearer 가 아니다. 공식 노드(nodes/common.py)가 쓰는 그대로. */
export const briaAuth = (key: string) => ({ api_token: key })

/** 아직 생성 경로가 없다. 화면이 "연동됨" 으로 보이지 않게 하는 단 하나의 값. */
export const BRIA_WIRED = false

/* 키 확인(무과금)에 쓸 정의. 판정 로직은 _keycheck.ts 한 군데에만 있다.

   ⚠ 읽는 경로는 조회 전용 두 개뿐이고 **생성 경로는 아예 건드리지 않는다.**
     ① /v1/tailored-gen/models/      — 이 계정에 등록된 맞춤 모델 목록
     ② /v1/tailored-gen/models/<없는 ID> — 인증이 통과하면 "그런 모델 없음", 죽었으면 인증 거절
     ②가 있는 이유: ①이 200 을 주더라도 그게 인증을 본 결과인지 알 수 없고, 맞춤 모델을
     하나도 안 만든 계정이면 목록이 비어 있어 판단할 거리가 적다. ②는 인증만 가르는 자리다.
     (물론 최종 판정은 여기에 더해 '일부러 틀린 키' 대조까지 보고 낸다.) */
export const BRIA_KEYCHECK: KeyProvider = {
  id: 'bria',
  label: 'Bria',
  envNames: BRIA_KEY_NAMES,
  hosts: [BRIA_BASE],
  hostOverrideEnv: ['BRIA_HOST_OVERRIDE', 'bria_host_override'],
  auth: briaAuth,
  console: 'https://platform.bria.ai/',
  wired: BRIA_WIRED,
  주소근거: '공식 ComfyUI 노드 저장소(Bria-AI/ComfyUI-BRIA-API)의 코드에서 읽은 값입니다 — '
          + 'https://engine.prod.bria-api.com. 인증은 Bearer 가 아니라 api_token 헤더입니다.',
  probes: [
    { 이름: '맞춤 모델 목록 (GET /v1/tailored-gen/models/)', path: '/v1/tailored-gen/models/', 종류: 'models' },
    { 이름: '없는 모델 조회', path: '/v1/tailored-gen/models/__no_such_model__', 종류: 'job' },
  ],
  //  잔액을 주는 조회 경로를 아직 못 찾았다. 없는 것을 있는 척하지 않는다 — balance 를 안 단다.
}
