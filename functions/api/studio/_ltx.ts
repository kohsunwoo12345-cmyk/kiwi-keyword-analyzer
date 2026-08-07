/* ══════════════════════════════════════════════════════════════════════════
   LTX(Lightricks) — LTX-2 계열 영상 모델 한 곳
   ──────────────────────────────────────────────────────────────────────────
   알리바바(_alibaba.ts)와 같은 자리다. 서버 단가표(MODEL_COST)·등록부(_registry)·
   관리자 화면(ai-models)이 전부 이 표 하나를 본다. 세 군데에 따로 적으면 반드시
   어긋난다 — 루마·클링에서 실제로 그랬다.

   ── ⚠ 이 표의 상태: "아직 확인 안 됨" ────────────────────────────────────
   솔직하게 적는다. 이 개발 환경에서는 LTX 공식 문서(docs.ltx.video · docs.ltx.io ·
   ltx.io)가 **전부 403** 이라 원문을 한 줄도 못 읽었다. 알리바바 때 가격표가 403 이던
   것과 같은 상황이다. 그래서 아래 값들의 출처는 이렇다:

     · 모델 ID (ltx-2.3-pro · ltx-2.3-fast)
         공식 문서를 인용한 2차 자료에서 읽었다. 그런데 같은 이름이 자료마다
         `ltx-2.3-pro` 와 `ltx-2-3-pro` (점 vs 붙임표) 두 모양으로 나온다.
         **둘 중 무엇이 맞는지 우리는 모른다.** 지어내지 않고 모른다고 적어 둔다.
     · 단가 ($0.04/초부터)
         2차 자료의 공시가다. 어느 모델·어느 해상도 기준인지가 분명하지 않다.

   그래서 이 표는 **등록부에 꺼진 상태(enabled 0)로 심긴다.** 켜는 조건은 하나다 —
   관리자 → LTX 키 확인(/api/generate?diag=ltx)이 **제공사가 직접 알려 준 모델 목록**을
   받아 오는 것. 그때 그 ID 로 등록하면 그때부터 노드에 나타난다.

   왜 이렇게까지 하나: 확인 없이 켜면 "회원이 고를 수는 있는데 누르면 404" 인 모델이
   생긴다. 등록부 머리말에 적힌 그 경고가 바로 이 경우를 막으려는 것이다.

   ── ⚠ 단가는 비싼 쪽으로 잡아 뒀다 ───────────────────────────────────────
   알리바바에서 세운 원칙 그대로다.
     싸게 잡으면 → 원가보다 싸게 팔아 우리가 손해를 본다(되돌릴 수 없다)
     비싸게 잡으면 → 회원에게 더 받는다(확인되면 내리면 된다)
   되돌릴 수 있는 쪽을 고른다. 관리자 → 모델 단가(model_cost_overrides)가 언제나 이긴다.
   ══════════════════════════════════════════════════════════════════════════ */

import type { KeyProvider } from './_keycheck'

export type LtxRow = {
  name: string          // 스튜디오 표시명
  id: string            // 제공사 모델 ID (⚠ 미확인 — 위 머리말 참고)
  kind: 'video'
  unit: 'sec'
  usd: number           // 1080p 기준 초당
  usd720?: number       // 720p 초당 — 구간 값이 화소비를 안 따를 수 있어 따로 둔다
  cat: string
  opts: any
}

/* 영상 옵션 — LTX-2 는 영상과 오디오를 같이 만드는 것이 특징이라 audio 를 켜 둔다.
   길이·비율·해상도는 확인 전까지 가장 보수적인 공통값이다. */
const VOPT = {
  secs: [5, 10], ratios: ['16:9', '9:16', '1:1'], res: ['720p', '1080p'],
  audio: true, watermark: false, neg: true, cfg: false, seed: true,
}

export const LTX_MODELS: LtxRow[] = [
  { name: 'LTX 2.3 Pro (텍스트·이미지→영상)', id: 'ltx-2.3-pro', kind: 'video', unit: 'sec',
    usd: 0.12, usd720: 0.06, cat: '영상 · LTX(Lightricks)', opts: VOPT },
  { name: 'LTX 2.3 Fast (텍스트·이미지→영상)', id: 'ltx-2.3-fast', kind: 'video', unit: 'sec',
    usd: 0.06, usd720: 0.04, cat: '영상 · LTX(Lightricks)', opts: VOPT },
]

/** 표시명 → 행. */
export const LTX_BY_NAME: Record<string, LtxRow> =
  LTX_MODELS.reduce((o, r) => { o[r.name] = r; return o }, {} as Record<string, LtxRow>)

/** 제공사 모델 ID 로도 찾을 수 있게. */
export const LTX_BY_ID: Record<string, LtxRow> =
  LTX_MODELS.reduce((o, r) => { o[r.id] = r; return o }, {} as Record<string, LtxRow>)

/* 확인 후보 주소. 하나로 못 박지 않는 이유는 머리말에 적어 둔 그대로다 —
   공식 문서를 못 읽어서 어느 쪽이 진짜인지 모른다. 진단(?diag=ltx)이 둘 다 훑어
   **실제로 답하는 곳**을 찾는다. 답이 나오면 그때 여기를 한 줄로 줄이면 된다. */
export const LTX_HOSTS = ['https://api.ltx.video', 'https://api.ltx.io']

/** 키 환경변수 후보 — generate.js 의 keys() 와 같은 값이어야 한다. */
export const LTX_KEY_NAMES = ['LTX_API_KEY', 'ltx_api_key', 'Ltx_API_KEY', 'LTX2_API_KEY',
                              'LIGHTRICKS_API_KEY', 'lightricks_api_key']

/** 아직 생성 경로가 없다. 화면이 "연동됨" 으로 보이지 않게 하는 단 하나의 값. */
export const LTX_WIRED = false

/* 키 확인(무과금)에 쓸 정의. 판정 로직은 _keycheck.ts 한 군데에만 있다 —
   제공사마다 한 벌씩 적으면 한쪽만 고쳐지는 날이 반드시 온다. */
export const LTX_KEYCHECK: KeyProvider = {
  id: 'ltx',
  label: 'LTX (Lightricks)',
  envNames: LTX_KEY_NAMES,
  hosts: LTX_HOSTS,
  hostOverrideEnv: ['LTX_HOST_OVERRIDE', 'ltx_host_override'],
  console: 'https://console.ltx.video/',
  wired: LTX_WIRED,
  주소근거: '공식 문서(docs.ltx.video·ltx.io)가 이 환경에서 403 이라 주소를 원문으로 확인하지 못했습니다. '
          + '그래서 후보 두 곳을 훑어 실제로 답하는 곳을 찾습니다.',
  probes: [
    { 이름: '모델 목록 v1', path: '/v1/models', 종류: 'models' },
    { 이름: '모델 목록 v2', path: '/v2/models', 종류: 'models' },
    { 이름: '잔액 조회', path: '/v1/credits', 종류: 'account' },
    { 이름: '계정 조회', path: '/v1/me', 종류: 'account' },
    /* 없는 작업 번호를 물어본다. 인증이 통과하면 "그런 작업 없음"(404), 키가 죽었으면 401 이다 —
       만들지 않고 인증만 가르는 데 가장 좋은 요청이다. */
    { 이름: '없는 작업 조회', path: '/v2/text-to-video/00000000-0000-4000-8000-000000000000', 종류: 'job' },
  ],
  balance: (j) => {
    const n = Number(j && (j.credits ?? j.balance ?? j.credit_balance ?? (j.data && (j.data.credits ?? j.data.balance))))
    return Number.isFinite(n) ? { value: n, unit: '크레딧' } : null
  },
}
