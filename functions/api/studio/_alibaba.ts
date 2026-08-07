/* ══════════════════════════════════════════════════════════════════════════
   알리바바 DashScope(Model Studio) — Wan 영상·이미지 모델 한 곳
   ──────────────────────────────────────────────────────────────────────────
   여기 한 군데가 정답이다. 서버 단가표(MODEL_COST)·생성 경로(generate.js)·
   노드 피커(등록부 경유)·관리자 화면이 전부 이 표를 본다.
   세 군데에 따로 적어 두면 반드시 어긋난다 — 실제로 루마·클링에서 그랬다.

   ── 모델 목록의 출처 ──────────────────────────────────────────────────
   추측이 아니라 **운영 키로 받은 목록** 이다.
   GET /api/generate?diag=alibaba 가 /api/v1/models 를 끝까지 넘겨 받아
   국제판(싱가포르)에서 234개 중 wan 37개를 확인했다. 그 37개가 그대로 여기 있다.
   qwen-image 계열과 z-image-turbo 도 같은 키로 잡히는 알리바바 이미지 모델이라 함께 넣는다.
   (happyhorse 계열은 뺐다 — 같은 플랫폼에 올라와 있지만 알리바바 자체 모델이 아니다.)

   ── 요청 형식의 출처 ──────────────────────────────────────────────────
   공식 SDK(PyPI `dashscope` 1.26.5) 소스에서 그대로 읽었다. 문서 사이트는
   이 환경에서 403 이라 못 읽지만 SDK 는 같은 것을 코드로 적어 둔 것이다.
     · 영상  : /api/v1/services/aigc/video-generation/video-synthesis
               input.prompt (+ img_url · first_frame_url · last_frame_url · media[])
               parameters: size · duration · resolution · ratio · seed · prompt_extend · watermark
     · 이미지: /api/v1/services/aigc/image-generation/generation
               input.messages = [{role:'user', content:[{text}, {image}]}]   ← t2i 인데 대화형이다
     · 구형 이미지: /api/v1/services/aigc/text2image/image-synthesis  (input.prompt)
   그리고 우리가 실제로 제출해 보고 받은 오류가 이걸 확인해 줬다 —
   "Field required: input.prompt" · "input.media" · "input.messages".

   ── 단가 — 어디까지 확인이고 어디부터 상한인가 ────────────────────────
   알리바바 공식 문서 사이트(alibabacloud.com·help.aliyun.com)는 **우리 회사 egress
   정책에서 차단**돼 있다. 우회하지 않는다. 대신 그 표를 그대로 옮겨 적은 곳
   여럿을 교차 확인했고, 서로 어긋나지 않는 값만 확정(A)으로 올렸다.

   확정(A) — 서로 다른 출처가 같은 값을 낸 것
     wan2.7 · wan2.6 · wan2.5 영상 : ¥0.6/초(720P) · ¥1.0/초(1080P)
                                     = $0.086 / $0.144  (국제판 공개가와 환산이 맞는다)
     wan2.2 plus 영상             : ¥0.4/초(720P) · ¥0.6/초(1080P) = $0.057 / $0.086
     wan2.6-t2i 이미지            : ¥0.2/장 = $0.029
     무료 체험                    : 영상 50초 · 이미지 50장, 개통 후 90일
                                     (실패는 과금 안 된다 — 성공한 것만 센다)

   상한(C) — 값이 따로 안 나온 것. **추측해서 깎지 않고 같은 계열의 확정값을 그대로 쓴다.**
     싸게 잡으면 원가보다 싸게 팔아 손해가 나고 되돌릴 수 없다.
     비싸게 잡으면 회원에게 더 받고, 확인되면 내리면 된다. 되돌릴 수 있는 쪽을 고른다.
     flash·turbo·animate·vace·kf2v·2.1 계열·Qwen 이미지가 여기 해당한다.

   ⚠ 위 값은 중국(百炼) 표기다. 국제판(우리 키)은 표가 따로 있을 수 있다 —
     다만 wan2.7 은 국제판 공개가($0.086/$0.144)가 중국 표의 환산과 정확히 맞았다.
     실제 청구서를 보면 관리자 → 모델 단가에서 덮어쓴다(그 값이 언제나 이긴다).
   ══════════════════════════════════════════════════════════════════════════ */

export type AliRow = {
  name: string          // 스튜디오 표시명
  id: string            // 제공사 모델 ID
  kind: 'video' | 'image'
  unit: 'sec' | 'img'
  usd: number           // 영상=1080p 기준 초당 · 이미지=장당
  usd720?: number       // 영상만 — 720p 초당. 화소비로 깎으면 실제보다 싸진다(아래 설명)
  근거?: 'A' | 'C'      // A = 서로 다른 출처 둘이 같은 값 · C = 우리 추정(더 비싸게 잡음)
  cat: string           // 피커 분류
  pinned?: boolean      // 날짜 고정판(같은 모델의 다른 이름)
  opts?: any
}

const V = (name: string, id: string, usd: number, opts?: any, pinned?: boolean,
           usd720?: number, 근거: 'A' | 'C' = 'C'): AliRow =>
  ({ name, id, kind: 'video', unit: 'sec', usd, usd720, 근거, cat: '영상 · Wan(알리바바)', pinned, opts })
const I = (name: string, id: string, usd: number, opts?: any, pinned?: boolean,
           근거: 'A' | 'C' = 'C'): AliRow =>
  ({ name, id, kind: 'image', unit: 'img', usd, 근거, cat: '이미지 · 알리바바', pinned, opts })

//  영상 옵션 — SDK 가 받는 값 그대로다(duration·resolution·ratio·seed·prompt_extend·watermark)
const VOPT = { secs: [5, 10], ratios: ['16:9', '9:16', '1:1'], res: ['720p', '1080p'],
               audio: false, watermark: true, neg: true, cfg: false, seed: true }
const VOPT_LONG = { ...VOPT, secs: [5, 10, 15] }
const IOPT = { secs: [], ratios: ['1:1', '16:9', '9:16', '4:3', '3:4'], res: [],
               audio: false, watermark: false, neg: true, cfg: false, seed: true }

export const ALIBABA_MODELS: AliRow[] = [
  /* ── 영상 27개 — diag=alibaba 가 받아 온 wan 영상 후보 그대로 ── */
  V('Wan 2.7 (텍스트→영상)', 'wan2.7-t2v', 0.144, VOPT_LONG, false, 0.086, 'A'),
  V('Wan 2.7 (텍스트→영상 · 04-25판)', 'wan2.7-t2v-2026-04-25', 0.144, VOPT_LONG, true, 0.086, 'A'),
  V('Wan 2.7 (텍스트→영상 · 06-12판)', 'wan2.7-t2v-2026-06-12', 0.144, VOPT_LONG, true, 0.086, 'A'),
  V('Wan 2.7 (이미지→영상)', 'wan2.7-i2v', 0.144, VOPT_LONG, false, 0.086, 'A'),
  V('Wan 2.7 (이미지→영상 · 04-25판)', 'wan2.7-i2v-2026-04-25', 0.144, VOPT_LONG, true, 0.086, 'A'),
  V('Wan 2.7 (레퍼런스→영상)', 'wan2.7-r2v', 0.144, VOPT_LONG, false, 0.086, 'A'),
  V('Wan 2.7 (레퍼런스→영상 · 06-12판)', 'wan2.7-r2v-2026-06-12', 0.144, VOPT_LONG, true, 0.086, 'A'),
  V('Wan 2.7 (영상 편집)', 'wan2.7-videoedit', 0.144, VOPT_LONG, false, 0.086, 'C'),
  V('Wan 2.6 (텍스트→영상)', 'wan2.6-t2v', 0.144, VOPT_LONG, false, 0.086, 'A'),
  V('Wan 2.6 (이미지→영상)', 'wan2.6-i2v', 0.144, VOPT_LONG, false, 0.086, 'A'),
  V('Wan 2.6 Flash (이미지→영상)', 'wan2.6-i2v-flash', 0.144, VOPT, false, 0.086, 'C'),
  V('Wan 2.6 (레퍼런스→영상)', 'wan2.6-r2v', 0.144, VOPT_LONG, false, 0.086, 'A'),
  V('Wan 2.6 Flash (레퍼런스→영상)', 'wan2.6-r2v-flash', 0.144, VOPT, false, 0.086, 'C'),
  V('Wan 2.5 (텍스트→영상)', 'wan2.5-t2v-preview', 0.144, VOPT, false, 0.086, 'A'),
  V('Wan 2.5 (이미지→영상)', 'wan2.5-i2v-preview', 0.144, VOPT, false, 0.086, 'A'),
  V('Wan 2.2 Plus (텍스트→영상)', 'wan2.2-t2v-plus', 0.086, VOPT, false, 0.057, 'A'),
  V('Wan 2.2 Plus (이미지→영상)', 'wan2.2-i2v-plus', 0.086, VOPT, false, 0.057, 'A'),
  V('Wan 2.2 Flash (이미지→영상)', 'wan2.2-i2v-flash', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.2 Flash (첫·끝 프레임→영상)', 'wan2.2-kf2v-flash', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.2 (동작 합성·Animate Mix)', 'wan2.2-animate-mix', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.2 (동작 전이·Animate Move)', 'wan2.2-animate-move', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.1 Plus (텍스트→영상)', 'wan2.1-t2v-plus', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.1 Turbo (텍스트→영상)', 'wan2.1-t2v-turbo', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.1 Plus (이미지→영상)', 'wan2.1-i2v-plus', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.1 Turbo (이미지→영상)', 'wan2.1-i2v-turbo', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.1 Plus (첫·끝 프레임→영상)', 'wan2.1-kf2v-plus', 0.086, VOPT, false, 0.057, 'C'),
  V('Wan 2.1 VACE (영상 편집·참조)', 'wan2.1-vace-plus', 0.086, VOPT, false, 0.057, 'C'),

  /* ── 이미지 10개(Wan) ── */
  I('Wan 2.7 이미지 Pro', 'wan2.7-image-pro', 0.087, IOPT, false, 'C'),
  I('Wan 2.7 이미지', 'wan2.7-image', 0.058, IOPT, false, 'C'),
  I('Wan 2.6 이미지', 'wan2.6-image', 0.029, IOPT, false, 'C'),
  I('Wan 2.6 (텍스트→이미지)', 'wan2.6-t2i', 0.029, IOPT, false, 'A'),
  I('Wan 2.5 (텍스트→이미지)', 'wan2.5-t2i-preview', 0.029, IOPT, false, 'C'),
  I('Wan 2.5 (이미지 편집)', 'wan2.5-i2i-preview', 0.029, IOPT, false, 'C'),
  I('Wan 2.2 Plus (텍스트→이미지)', 'wan2.2-t2i-plus', 0.029, IOPT, false, 'C'),
  I('Wan 2.2 Flash (텍스트→이미지)', 'wan2.2-t2i-flash', 0.029, IOPT, false, 'C'),
  I('Wan 2.1 Plus (텍스트→이미지)', 'wan2.1-t2i-plus', 0.029, IOPT, false, 'C'),
  I('Wan 2.1 Turbo (텍스트→이미지)', 'wan2.1-t2i-turbo', 0.029, IOPT, false, 'C'),

  /* ── 이미지 19개(Qwen·Z) — 같은 키로 잡히는 알리바바 이미지 모델 ── */
  I('Qwen 이미지 3.0 Pro', 'qwen-image-3.0-pro', 0.08, IOPT, false, 'C'),
  I('Qwen 이미지 2.0 Pro', 'qwen-image-2.0-pro', 0.08, IOPT, false, 'C'),
  I('Qwen 이미지 2.0 Pro (03-03판)', 'qwen-image-2.0-pro-2026-03-03', 0.08, IOPT, true, 'C'),
  I('Qwen 이미지 2.0 Pro (04-22판)', 'qwen-image-2.0-pro-2026-04-22', 0.08, IOPT, true, 'C'),
  I('Qwen 이미지 2.0 Pro (06-22판)', 'qwen-image-2.0-pro-2026-06-22', 0.08, IOPT, true, 'C'),
  I('Qwen 이미지 2.0', 'qwen-image-2.0', 0.05, IOPT, false, 'C'),
  I('Qwen 이미지 2.0 (03-03판)', 'qwen-image-2.0-2026-03-03', 0.05, IOPT, true, 'C'),
  I('Qwen 이미지 Max', 'qwen-image-max', 0.08, IOPT, false, 'C'),
  I('Qwen 이미지 Max (12-30판)', 'qwen-image-max-2025-12-30', 0.08, IOPT, true, 'C'),
  I('Qwen 이미지 Plus', 'qwen-image-plus', 0.05, IOPT, false, 'C'),
  I('Qwen 이미지 Plus (01-09판)', 'qwen-image-plus-2026-01-09', 0.05, IOPT, true, 'C'),
  I('Qwen 이미지', 'qwen-image', 0.05, IOPT, false, 'C'),
  I('Qwen 이미지 편집 Max', 'qwen-image-edit-max', 0.08, IOPT, false, 'C'),
  I('Qwen 이미지 편집 Max (01-16판)', 'qwen-image-edit-max-2026-01-16', 0.08, IOPT, true, 'C'),
  I('Qwen 이미지 편집 Plus', 'qwen-image-edit-plus', 0.05, IOPT, false, 'C'),
  I('Qwen 이미지 편집 Plus (10-30판)', 'qwen-image-edit-plus-2025-10-30', 0.05, IOPT, true, 'C'),
  I('Qwen 이미지 편집 Plus (12-15판)', 'qwen-image-edit-plus-2025-12-15', 0.05, IOPT, true, 'C'),
  I('Qwen 이미지 편집', 'qwen-image-edit', 0.05, IOPT, false, 'C'),
  I('Z-Image Turbo', 'z-image-turbo', 0.03, IOPT, false, 'C'),
]

/** 표시명 → 행. 생성 경로가 이걸로 실제 모델 ID 를 찾는다. */
export const ALIBABA_BY_NAME: Record<string, AliRow> =
  ALIBABA_MODELS.reduce((o, r) => { o[r.name] = r; return o }, {} as Record<string, AliRow>)

/** 제공사 모델 ID 로도 찾을 수 있게 — 외부 대여 API 는 ID 로 부른다. */
export const ALIBABA_BY_ID: Record<string, AliRow> =
  ALIBABA_MODELS.reduce((o, r) => { o[r.id] = r; return o }, {} as Record<string, AliRow>)

/* 국제판(싱가포르) 전용이다. 우리 키는 베이징에서 401 이 떨어진다 —
   실측으로 확인했고, 리전은 키·모델·단가가 완전히 분리돼 있어 교차 호출이 안 된다. */
export const ALIBABA_BASE = 'https://dashscope-intl.aliyuncs.com'

/** 어느 경로로 제출하는가. SDK 소스에서 읽은 그대로. */
export function alibabaPath(row: AliRow): string {
  if (row.kind === 'video') return '/api/v1/services/aigc/video-generation/video-synthesis'
  //  wan2.5 이하 구형 t2i 는 대화형 스키마가 아니라 옛 image-synthesis 경로다
  if (/^wan2\.[12]/.test(row.id)) return '/api/v1/services/aigc/text2image/image-synthesis'
  return '/api/v1/services/aigc/image-generation/generation'
}

/** 이 모델이 대화형(messages) 입력을 쓰는가 — 실측 오류가 알려 준 그 구분이다. */
export const alibabaUsesMessages = (row: AliRow) =>
  row.kind === 'image' && !/^wan2\.[12]/.test(row.id)
