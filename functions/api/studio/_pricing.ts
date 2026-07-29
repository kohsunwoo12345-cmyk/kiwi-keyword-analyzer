// 스튜디오 AI 생성 과금 규칙 (서버 권위 계산) — precheck·record 공용
//  · 실제 AI 비용(원) = 제공사 공개 단가(USD) × 환율
//  · 판매가 = 실제 비용 × 마크업.  마크업: 씨댄스 2.0 계열·이미지 모델 = 2.5배, 그 외 = 3배
//  · 크레딧 = 판매가 ÷ 50원(올림).  (50원 = 1크레딧)
//  · 매출(원) = 실제 차감 크레딧 × 50.  순이익 = 매출 − 실제 AI 비용

export const USD_KRW = 1400 // 폴백 기본 환율 (API 실패 시)
export const CREDIT_KRW = 50 // 50원 = 1크레딧

/** 무료 FX API 에서 현재 USD→KRW 환율 조회 (키 불필요, 여러 소스 폴백) */
async function fetchUsdKrw(): Promise<number | null> {
  const sources: { url: string; pick: (j: any) => any }[] = [
    { url: 'https://open.er-api.com/v6/latest/USD', pick: (j) => j?.rates?.KRW },
    { url: 'https://api.frankfurter.app/latest?from=USD&to=KRW', pick: (j) => j?.rates?.KRW },
    { url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', pick: (j) => j?.usd?.krw },
  ]
  for (const s of sources) {
    try {
      const r = await fetch(s.url)
      if (!r.ok) continue
      const j: any = await r.json()
      const v = Number(s.pick(j))
      if (v && v > 300 && v < 3000) return Math.round(v)
    } catch {
      /* 다음 소스로 */
    }
  }
  return null
}

/** 전역 모델별 배수 (settings.model_markups JSON). {모델명: 배수}. 없으면 {}. */
// 레퍼런스 이미지 1장 추가당 크레딧 가산율(%) 기본값
export const REF_SURCHARGE_DEFAULT = 0.5
// 회원별 레퍼런스 가산율 해석: 회원 지정값 > 전역 설정 > 기본(0.5%)
export async function resolveRefSurcharge(db: D1Database, userId: string): Promise<number> {
  try {
    if (userId) {
      const u: any = await db.prepare('SELECT ref_surcharge FROM users WHERE id = ?').bind(userId).first()
      if (u && u.ref_surcharge != null && Number(u.ref_surcharge) >= 0) return Number(u.ref_surcharge)
    }
  } catch { /* 컬럼 없음 */ }
  try {
    const row: any = await db.prepare("SELECT value FROM settings WHERE key = 'ref_surcharge_pct'").first()
    if (row && row.value != null && row.value !== '') { const n = Number(row.value); if (n >= 0) return n }
  } catch { /* noop */ }
  return REF_SURCHARGE_DEFAULT
}
// ControlNet(Canny/Depth/Pose) 사용 시 추가 가산율(%) 기본값. (전처리·추가 추론 비용 반영)
export const CN_SURCHARGE_DEFAULT = 10
// 전역 ControlNet 가산율 해석: settings.controlnet_surcharge_pct > 기본(10%)
export async function resolveCnSurcharge(db: D1Database): Promise<number> {
  try {
    const row: any = await db.prepare("SELECT value FROM settings WHERE key = 'controlnet_surcharge_pct'").first()
    if (row && row.value != null && row.value !== '') { const n = Number(row.value); if (n >= 0) return n }
  } catch { /* noop */ }
  return CN_SURCHARGE_DEFAULT
}
export async function getModelMarkups(db: D1Database): Promise<Record<string, number>> {
  try {
    const row: any = await db.prepare("SELECT value FROM settings WHERE key = 'model_markups'").first()
    if (!row || !row.value) return {}
    const o = JSON.parse(row.value)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}
/** 회원·모델별 배수 해석 우선순위: 회원×모델 override > 회원 전체 배수 > 전역 모델 배수 > 기본값 */
export async function resolveMarkup(db: D1Database, userId: string, model: string, userMarkup: number): Promise<number | undefined> {
  try {
    const um: any = await db.prepare('SELECT multiplier FROM user_model_markups WHERE user_id = ? AND model = ?').bind(userId, model).first()
    if (um && Number(um.multiplier) > 0) return Number(um.multiplier)
  } catch { /* table 없을 수 있음 */ }
  if (userMarkup && userMarkup > 0) return userMarkup
  const gm = await getModelMarkups(db)
  if (gm[model] && Number(gm[model]) > 0) return Number(gm[model])
  return undefined // computeCharge 기본값(2.5/3.0)
}

/** 오늘자 USD→KRW 환율 (하루 1회 조회 후 D1 캐시). 결제/생성 시점의 그날 환율을 반환. */
export async function getUsdKrw(db: D1Database): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  await db
    .prepare(`CREATE TABLE IF NOT EXISTS fx_rates (date TEXT PRIMARY KEY, usd_krw REAL NOT NULL, updated_at TEXT)`)
    .run()
    .catch(() => {})
  const cached: any = await db.prepare('SELECT usd_krw FROM fx_rates WHERE date = ?').bind(today).first().catch(() => null)
  if (cached && Number(cached.usd_krw) > 0) return Number(cached.usd_krw)

  const fetched = await fetchUsdKrw()
  if (fetched) {
    await db
      .prepare('INSERT OR REPLACE INTO fx_rates (date, usd_krw, updated_at) VALUES (?, ?, ?)')
      .bind(today, fetched, new Date().toISOString())
      .run()
      .catch(() => {})
    return fetched
  }
  // API 실패 → 마지막으로 저장된 환율, 그것도 없으면 기본값
  const last: any = await db.prepare('SELECT usd_krw FROM fx_rates ORDER BY date DESC LIMIT 1').first().catch(() => null)
  return last && Number(last.usd_krw) > 0 ? Number(last.usd_krw) : USD_KRW
}

/** 해상도별 실제 픽셀 크기. 토큰 과금 계산과 배율 산출의 공통 기준이다. */
export const RES_PX: Record<string, [number, number]> = {
  '480p': [854, 480],
  '540p': [960, 540],
  '720p': [1280, 720],
  '1080p': [1920, 1080],
  '4K': [3840, 2160],
}
const PX_1080P = RES_PX['1080p'][0] * RES_PX['1080p'][1]

/* 1080p 기준 해상도 배율 — 화소 수에 정비례한다.
   예전 값(540p 0.35 · 720p 0.6 · 4K 2.6)은 근거 없이 눈대중으로 넣은 것이었고,
   실제 화소비(0.25 · 0.444 · 4.0)와 어긋나 고해상도일수록 원가보다 적게 받았다.
   4K 는 원가의 65% 만 받고 있었다 — 마크업을 곱해도 남지 않는 구간이 생긴다.
   영상 원가는 어느 제공사든 화소 수에 비례하므로(토큰 과금이든 등급별 정액이든)
   비례식을 기본으로 두고, 정액제 제공사는 아래 전용 함수에서 따로 처리한다. */
const RES_MULT: Record<string, number> = Object.fromEntries(
  Object.entries(RES_PX).map(([k, [w, h]]) => [k, (w * h) / PX_1080P]),
)

/* ══ 단가 근거 등급 (2026-07 기준) ═════════════════════════════════════════
   우리는 재판매 사이트가 아니라 제공사 공식 API 를 직접 호출한다
   (Kling=api-singapore.klingai.com, 씨댄스·씨드림·3D=ark.ap-southeast.bytepluses.com).
   그래서 fal·Kie 같은 재판매가는 참고용일 뿐 우리 원가가 아니다.

   ◎ 실측 — 제공사가 응답으로 알려준 값으로 청구 (추정 없음)
       씨댄스: ModelArk 이 usage.completion_tokens 를 돌려준다. 그 값이 오면 그대로 쓰고,
               안 오면 아래 토큰식으로 추정한다.
   ● 원문 확인 — 제공사 공식 요금표를 직접 읽고 맞춘 값
       Runway · Google Veo · BFL FLUX.2 · Luma Agents                       21종
       Seedream 4.0 $0.035 · 4.5 $0.045 (ModelArk 공식 장당 단가와 일치)      4종
       Nano Banana $0.039 (구글 공식 1K 이미지 단가)                          1종
   ● 공시가 대조 — 계산식이 공시가를 재현함을 확인
       Seedance (fal 공시가로 1.0 Pro·1.0 Lite 재현)                         8종
       OpenAI 이미지 (medium 정사각 $0.042 / 긴 쪽 $0.063 일치)               4종
   ○ 미확인 — 공식 원문을 못 구했거나 출처가 재판매가뿐이라 손대지 않은 값
       Kling 11 · Seedream 5.0 계열 4 · promptgen 14 · MiniMax 3 · 3D 2 ·
       xAI 2 · 음악/업스케일/나레이션/립싱크/모션 5                          약 41종

   미확인 항목의 위험 크기는 마크업이 정한다. 매출 = 원가 × 마크업(2.5 또는 3.0)이므로
   실제 원가가 표보다 그 배수 넘게 비싸면 팔수록 손해다. 씨댄스가 정확히 그 경우였다
   (실제가 3.7배 비쌌다).
   Kling 참고: 공식 3.0 크레딧표는 720p 6·1080p 8 크레딧/초(오디오 시 9·12)로 확인했으나,
   크레딧→달러 환산율의 공식 출처를 못 잡아 값은 그대로 뒀다. 현재 값(2.1 Master $0.095/초)은
   여러 재판매가($0.16/초 등)보다 낮지만 마크업 3배 안에는 들어온다.
   가장 확실한 확인은 제공사 청구서를 그 달 사용량으로 나눠 역산하는 것이다.
   ══════════════════════════════════════════════════════════════════════ */
// 모델 표시명 → 단가.
// u:'sec'(영상 초당) | 'img'(이미지 장당) | '3d'(모델 1개당) | 'tok'(호출 1회당), usd, audio(오디오 초당 추가), prov(집계용)
export type CostUnit = 'sec' | 'img' | '3d' | 'tok'
export const MODEL_COST: Record<string, { u: CostUnit; usd: number; audio?: number; prov: string }> = {
  /* 런웨이 공식 표 원문 확인 (docs.dev.runwayml.com/guides/pricing.md) — 1크레딧 = $0.01.
       gen4_turbo    초당  5크레딧 = $0.05   ← 현재 값과 일치
       gen3a_turbo   초당  5크레딧 = $0.05   ← 현재 값과 일치 (단 2026-07-30 종료)
       gen4_aleph    초당 15크레딧 = $0.15   ← 예전 값 (2026-07-30 종료)
       aleph2        초당 28크레딧 = $0.28   ← 후속. 생성당 최소 56크레딧($0.56)
       참고(미노출): gen4.5 초당 12크레딧 = $0.12
     Aleph 는 후속 모델로 갈아타면서 단가가 1.87배 올랐다. gen4_aleph 값($0.15)을
     그대로 두면 aleph2 로 나가는 요청마다 원가의 절반만 받는다. */
  'Runway Aleph (영상→실사 V2V)': { u: 'sec', usd: 0.28, prov: 'runway_aleph' },
  /* V2V 자동은 1순위가 Aleph 이고(런웨이 키가 있으면 거의 항상 여기로 간다)
     실패했을 때만 씨댄스로 내려간다 → 기대값을 Aleph 기준으로 잡는다. */
  'V2V 자동 (최고정확도·모델 자동선택)': { u: 'sec', usd: 0.28, prov: 'v2v_auto' },
  '모션 전이 (원본 움직임 유지·Motion Transfer)': { u: 'sec', usd: 0.12, prov: 'motion' },
  // 오디오는 단가에 포함이다(위 VEO_PRICE 주석 참조) — audio 가산을 두면 이중 청구가 된다
  'Google Veo 3.1': { u: 'sec', usd: 0.40, prov: 'google' },
  'Runway Gen-4': { u: 'sec', usd: 0.05, prov: 'runway' },
  'Runway Gen-3 Alpha Turbo': { u: 'sec', usd: 0.05, prov: 'runway' },
  'Grok Imagine (영상)': { u: 'sec', usd: 0.10, prov: 'xai' },
  /* 씨댄스는 초당 정액이 아니라 토큰 과금이다 — 실제 계산은 아래 seedanceUsd() 가 한다.
     여기 usd 값은 그 함수를 타지 못했을 때의 폴백이자 관리자 화면 표시용이며,
     100만 토큰당 단가로 1080p 초당 원가를 환산해 맞춰 둔다(1080p 1초 = 48,600토큰).
     audio 는 토큰과 별개로 붙는 항목이라 seedanceUsd() 에서도 그대로 더한다. */
  'Seedance 2.0': { u: 'sec', usd: 0.2284, audio: 0.02, prov: 'seedance' },
  'Seedance 2.0 Fast': { u: 'sec', usd: 0.1827, audio: 0.02, prov: 'seedance' },
  'Seedance 2.0 Mini': { u: 'sec', usd: 0.1142, audio: 0.02, prov: 'seedance' },
  'Seedance 1.5 Pro': { u: 'sec', usd: 0.1701, prov: 'seedance' },
  'Seedance 1.0 Pro': { u: 'sec', usd: 0.1458, prov: 'seedance' },
  'Seedance 1.0 Pro Fast': { u: 'sec', usd: 0.0846, prov: 'seedance' },
  'Seedance 1.0 Lite (텍스트→영상)': { u: 'sec', usd: 0.0875, prov: 'seedance' },
  'Seedance 1.0 Lite (이미지→영상)': { u: 'sec', usd: 0.0875, prov: 'seedance' },
  'MiniMax Hailuo 02': { u: 'sec', usd: 0.048, prov: 'hailuo' },
  'MiniMax T2V-01 Director': { u: 'sec', usd: 0.043, prov: 'hailuo' },
  'MiniMax I2V-01 Director': { u: 'sec', usd: 0.043, prov: 'hailuo' },
  // Luma Agents API. 구세대 Ray 2/Flash 2/1.6 은 이 계정 키로 호출되지 않으므로 노드에서 뺐지만,
  //  예전 그래프가 그대로 요청할 수 있어 단가는 남겨 둔다(없으면 이미지 기본값 $0.05 로 잘못 청구된다).
  /* 루마는 초당 정액이 아니라 "종류·해상도·길이" 표로 값이 정해진다(아래 LUMA_* 표가 실제 기준이고,
     lumaUsd() 가 이 항목의 usd 를 무시하고 그 표로 계산한다).
     그런데 이 표시값이 실제와 3~9배 어긋나 있었다 — 관리자 "AI 모델별 단가" 화면이
     이 값을 그대로 보여주므로, 초당 $0.08 로 적혀 있으면 원가를 그만큼으로 오해하게 된다.
     대표 조건(1080p·5초)의 실제 초당 환산값으로 맞춘다.
       생성 $1.20/5초 = 초당 $0.24 · 편집 $2.16/5초 = 초당 $0.432 · 비율변경 초당 $0.36 */
  'Luma Ray 3.2': { u: 'sec', usd: 0.24, prov: 'luma' },
  'Luma Ray 3.2 (영상 편집)': { u: 'sec', usd: 0.432, prov: 'luma' },
  'Luma Ray 3.2 (비율 변경)': { u: 'sec', usd: 0.36, prov: 'luma' },
  'Luma Uni 1': { u: 'img', usd: 0.04, prov: 'luma' },
  'Luma Uni 1 Max': { u: 'img', usd: 0.08, prov: 'luma' },
  /* 예전 그래프 호환용 이름 — 지금 노드 목록에는 없다. 서버가 전부 현행 ray-3.2 로 보내므로
     요금도 같아야 한다(예전엔 초당 $0.08·$0.04·$0.06 으로 제각각이었다). */
  'Luma Ray 2': { u: 'sec', usd: 0.24, prov: 'luma' },
  'Luma Ray Flash 2': { u: 'sec', usd: 0.24, prov: 'luma' },
  'Luma Ray 1.6': { u: 'sec', usd: 0.24, prov: 'luma' },
  /* ── Kling (클링) — 텍스트→영상 / 이미지→영상 / 영상→영상 ──
     ⚠ 미검증 단가. 공식 문서(klingai.com/global/dev/pricing, app.klingai.com/global/docs/point-policy)가
     개발 환경에서 403 이라 아직 원문을 못 봤다. 검색으로는 2.1 Master 5초가
     $0.475(우리 값) · $0.80 · $1.40 · $1.70 로 제각각인데, 대부분은 재판매 사이트 가격이다.
     그런 값으로 청구를 바꾸면 루마 때처럼 반대 방향으로 틀릴 수 있어 손대지 않았다.
     확인 방법: 배포된 서버에서 /api/generate?diag=prices 를 열면 위 주소들을 서버가 대신 읽어
     "단가로 보이는 줄" 과 현재 우리 단가를 나란히 보여준다. 원문 확인 후 이 값들을 고칠 것.
     최악의 경우(실제 $0.28/초) 2.1 Master 는 마크업 3배를 붙여도 본전 근처다. */
  'Kling 3.0 Pro (텍스트→영상)': { u: 'sec', usd: 0.11, prov: 'kling' },
  'Kling 3.0 Pro (이미지→영상)': { u: 'sec', usd: 0.11, prov: 'kling' },
  'Kling 3.0 Fast (텍스트→영상)': { u: 'sec', usd: 0.055, prov: 'kling' },
  'Kling 3.0 Fast (이미지→영상)': { u: 'sec', usd: 0.055, prov: 'kling' },
  'Kling 2.1 Master (텍스트→영상)': { u: 'sec', usd: 0.095, prov: 'kling' },
  'Kling 2.1 Master (이미지→영상)': { u: 'sec', usd: 0.095, prov: 'kling' },
  'Kling 2.0 Master (텍스트→영상)': { u: 'sec', usd: 0.062, prov: 'kling' },
  'Kling 2.0 Master (이미지→영상)': { u: 'sec', usd: 0.062, prov: 'kling' },
  'Kling 1.6 Pro (텍스트→영상)': { u: 'sec', usd: 0.049, prov: 'kling' },
  'Kling 1.6 Pro (이미지→영상)': { u: 'sec', usd: 0.049, prov: 'kling' },
  'Kling 1.6 Standard (이미지→영상)': { u: 'sec', usd: 0.028, prov: 'kling' },
  'Grok Imagine': { u: 'img', usd: 0.07, prov: 'xai' },
  // ── Seedream (씨드림) — ByteDance ModelArk 이미지 (씨댄스와 같은 키 공유) ──
  'Seedream 5.0 Pro': { u: 'img', usd: 0.075, prov: 'seedream' },
  'Seedream 5.0 Pro (레퍼런스 편집)': { u: 'img', usd: 0.075, prov: 'seedream' },
  'Seedream 5.0 Lite': { u: 'img', usd: 0.035, prov: 'seedream' },
  'Seedream 5.0 Lite (레퍼런스 편집)': { u: 'img', usd: 0.035, prov: 'seedream' },
  'Seedream 4.5': { u: 'img', usd: 0.045, prov: 'seedream' },
  'Seedream 4.5 (레퍼런스 편집)': { u: 'img', usd: 0.045, prov: 'seedream' },
  'Seedream 4.0': { u: 'img', usd: 0.035, prov: 'seedream' },
  'Seedream 4.0 (레퍼런스 편집)': { u: 'img', usd: 0.035, prov: 'seedream' },
  // Seedream 3.0 · SeedEdit 3.0 은 콘솔 목록에는 있으나 이 계정에서 호출하면 404 다(probe-all 확인).
  //  개통되면 아래 두 줄을 되살리고 스튜디오 목록에도 다시 넣는다.
  // 'Seedream 3.0': { u: 'img', usd: 0.03, prov: 'seedream' },
  // 'SeedEdit 3.0 (레퍼런스 편집)': { u: 'img', usd: 0.03, prov: 'seedream' },
  /* 구글 공식(ai.google.dev/gemini-api/docs/pricing 원문 확인):
     "Output images at 1K (1024x1024px) consume 1290 tokens and are equivalent to $0.039 per image".
     2K 는 $0.067, 4K 는 $0.101 인데 우리는 1K 급만 보낸다 — 이 값이 맞다. */
  'Nano Banana': { u: 'img', usd: 0.039, prov: 'nanobanana' },
  'GPT Image 2': { u: 'img', usd: 0.08, prov: 'openai' },
  'GPT Image 1.5': { u: 'img', usd: 0.06, prov: 'openai' },
  'GPT Image': { u: 'img', usd: 0.042, prov: 'openai' },
  'GPT Image Mini': { u: 'img', usd: 0.011, prov: 'openai' },
  /* FLUX.2 는 API 제공분이 max·pro·flex 셋(dev 는 오픈웨이트라 API 없음) — probe-all 로 셋 다 확인됨.
     BFL 은 "요청당" 이 아니라 "출력 메가픽셀당" 과금한다(1크레딧=$0.01). 우리 출력은 약 1MP
     (1024x1024=1.05MP · 1344x768=1.03MP)라 1MP 단가를 그대로 쓴다.
       max  = 첫 1MP $0.07 (이후 MP당 $0.03)
       flex = MP당 $0.06
       pro  = MP당 $0.03
     ※ 이전 값(max 0.06 · pro 0.04 · flex 0.03)은 추정치였고 flex 가 실제의 절반이었다. */
  'Flux 2 Max': { u: 'img', usd: 0.07, prov: 'flux' },
  'Flux 2 Pro': { u: 'img', usd: 0.03, prov: 'flux' },
  'Flux 2 Flex': { u: 'img', usd: 0.05, prov: 'flux' },   // 공식 표 from $0.05 (예전 $0.06 은 근거 없는 값이었다)
  // Flux 2 Dev·Flux Pro 는 이 계정에서 403 Forbidden(권한 없음) — 개통되면 주석만 풀면 된다
  // 'Flux 2 Dev': { u: 'img', usd: 0.025, prov: 'flux' },
  'Flux 1.1 Pro Ultra': { u: 'img', usd: 0.06, prov: 'flux' },
  'Flux 1.1 Pro': { u: 'img', usd: 0.04, prov: 'flux' },
  // 'Flux Pro': { u: 'img', usd: 0.05, prov: 'flux' },
  'Flux Dev': { u: 'img', usd: 0.025, prov: 'flux' },
  'Flux Kontext Max (레퍼런스 편집)': { u: 'img', usd: 0.08, prov: 'flux' },
  'Flux Kontext Pro (레퍼런스 편집)': { u: 'img', usd: 0.04, prov: 'flux' },   // BFL 공식 $0.04/장
  // ── 오디오·립싱크 (초당) — 관리자 ai-pricing 에서 모델별 배수 설정 가능 ──
  '음악 생성 (BGM·뮤직)': { u: 'sec', usd: 0.01, prov: 'music' },
  '업스케일 4K (영상 화질 향상)': { u: 'sec', usd: 0.04, prov: 'upscale' },
  '나레이션 (AI 음성 해설)': { u: 'sec', usd: 0.02, prov: 'narrate' },
  '립싱크 (인물 말하기)': { u: 'sec', usd: 0.1, prov: 'lipsync' },

  /* ── 3D 생성 (BytePlus ModelArk · 모델 1개당 과금) ──
     ⚠️ 단가는 공개 시세 기준 잠정값이다. 콘솔의 실제 단가를 확인한 뒤 이 값을 맞춰야 한다.
     생성 노드에는 아직 노출하지 않는다(엔드포인트·응답 규격 확인 전). 관리자 화면에는 표시된다. */
  //  실제 ID 확인됨(probe-all): hyper3d-gen2-260112 / hitem3d-2-0-251223
  'Hyper3D Gen-2 (3D 생성)': { u: '3d', usd: 0.4, prov: 'ark3d' },
  'Hitem3D 2.0 (3D 생성)': { u: '3d', usd: 0.4, prov: 'ark3d' },

  /* ── 프롬프트 작성 LLM (호출 1회당) ──
     영상·이미지와 같은 ARK 키로 호출하므로 외부 API 비용이 없다.
     값은 500토큰 안팎의 1회 호출 기준 잠정값. */
  //  probe-all 로 "실제 호출되는" 것만 등록(계정 카탈로그 35개 전수 확인).
  //  접미사 없는 형태는 전부 404 라 접미사까지 포함한 ID 가 정확한 값이다.
  'deepseek-v4-pro-260425': { u: 'tok', usd: 0.004, prov: 'promptgen' },
  'deepseek-v4-flash-260425': { u: 'tok', usd: 0.001, prov: 'promptgen' },
  'deepseek-v3-2-251201': { u: 'tok', usd: 0.002, prov: 'promptgen' },
  'glm-5-2-260617': { u: 'tok', usd: 0.003, prov: 'promptgen' },
  'glm-4-7-251222': { u: 'tok', usd: 0.0015, prov: 'promptgen' },
  'dola-seed-2-1-turbo-260628': { u: 'tok', usd: 0.002, prov: 'promptgen' },
  'gpt-oss-120b-250805': { u: 'tok', usd: 0.0008, prov: 'promptgen' },
  /* GPT·Gemini 프롬프트 LLM — 노드에는 있는데 이 표에 없어 관리자 '모델 목록' 에서 통째로
     빠져 있었다. 단가는 프롬프트 작성 1회(입력 ~500 · 출력 ~300 토큰) 기준 잠정 추정값이다.
     ※ 실제 차감은 이 값이 아니라 promptgen 의 정액 단가를 따른다(아래 주석 참조). */
  'gpt-4o': { u: 'tok', usd: 0.004, prov: 'promptgen' },
  'gpt-4o-mini': { u: 'tok', usd: 0.00026, prov: 'promptgen' },
  'gpt-4.1': { u: 'tok', usd: 0.0034, prov: 'promptgen' },
  'gpt-4.1-mini': { u: 'tok', usd: 0.00068, prov: 'promptgen' },
  'gpt-4.1-nano': { u: 'tok', usd: 0.00017, prov: 'promptgen' },
  'gpt-4-turbo': { u: 'tok', usd: 0.014, prov: 'promptgen' },
  'gpt-3.5-turbo': { u: 'tok', usd: 0.0007, prov: 'promptgen' },
  'gemini-3.5-flash': { u: 'tok', usd: 0.0012, prov: 'promptgen' },
  'gemini-2.5-pro': { u: 'tok', usd: 0.0036, prov: 'promptgen' },
  'gemini-2.5-flash': { u: 'tok', usd: 0.0009, prov: 'promptgen' },
  'gemini-2.5-flash-lite': { u: 'tok', usd: 0.00017, prov: 'promptgen' },
}

export const PROV_LABEL: Record<string, string> = {
  google: 'Google Veo', runway: 'Runway', runway_aleph: 'Runway Aleph', v2v_auto: 'V2V 자동', motion: '모션 전이', seedance: 'Seedance', seedream: 'Seedream',
  ark3d: '3D 생성 (ModelArk)', promptgen: '프롬프트 작성 LLM',
  hailuo: 'MiniMax Hailuo', luma: 'Luma', xai: 'Grok', flux: 'Flux', falcontrol: 'fal ControlNet',
  nanobanana: 'Nano Banana', openai: 'GPT Image', kling: 'Kling', narrate: '나레이션', lipsync: '립싱크', music: '음악 생성', upscale: '업스케일',
}

export interface ChargeInput {
  model: string
  units?: number // 영상: 초, 이미지: 무시
  kind?: string // 'image' | 'video'
  res?: string // '720p'|'1080p'|'4K'
  audio?: boolean
  hdr?: boolean // 루마 전용 — HDR 출력이면 요금표가 달라진다
  exr?: boolean // 루마 전용 — EXR 동시 내보내기(HDR 전제)
  refs?: number // 루마 이미지 전용 — 레퍼런스 장수마다 원가가 오른다
  ratio?: string // 이미지 비율 — OpenAI 는 가로/세로가 길면 원가가 1.5배다
  usageTokens?: number // 제공사가 알려준 실제 소비 토큰(ModelArk). 있으면 추정 대신 이 값으로 계산한다
}

export interface ChargeResult {
  model: string
  provider: string
  kind: 'image' | 'video'
  usd: number // 실제 AI 비용(USD)
  usdKrw: number // 적용 환율 (그날의 USD→KRW)
  costKrw: number // 실제 AI 비용(원) — 표시용 정수 반올림
  /** 실제 AI 비용(원) 원값. 1원 미만이 0 으로 뭉개지지 않게, 저장·합계는 이 값을 쓴다
   *  (프롬프트 LLM 은 건당 0.2~0.4원이라 정수로 저장하면 관리자 원가 합계가 0 으로 쌓였다) */
  costKrwExact: number
  markup: number // 3.0 | 2.5
  credits: number // 차감 크레딧
  revenueKrw: number // 매출(원) = credits × 50
  profitKrw: number // 순이익(원) = revenue − cost
}

/* ══ 루마 Agents API 실측 요금표 (docs.agents.lumalabs.ai/guides/pricing) ══
   루마는 "초당 정액 × 해상도 배율" 이 아니다. 요청 종류·해상도·길이·HDR 로 값이 정해진 표다.
   그래서 우리 일반 공식으로는 맞출 수 없다 — 실제로 크게 어긋나 있었다.
     1080p 10초 생성: 우리 계산 $0.80 vs 실제 $3.60 (4.5배)
     1080p  5초 편집: 우리 계산 $0.40 vs 실제 $2.16 (5.4배)
   마크업 3배를 붙여도 원가에 못 미쳐, 1080p 10초 한 건마다 약 1,680원씩 손실이었다.
   10초가 5초의 2배가 아니라 3배인 것도(생성 기준) 일반 공식으로는 표현되지 않는다. */
const LUMA_VIDEO_GEN: Record<string, [number, number]> = {   // [5초, 10초] 표준
  '360p': [0.06, 0.18], '540p': [0.15, 0.45], '720p': [0.30, 0.90], '1080p': [1.20, 3.60],
}
const LUMA_VIDEO_GEN_HDR: Record<string, number> = { '720p': 0.60, '1080p': 2.40 }        // HDR 은 5초 전용
const LUMA_VIDEO_GEN_EXR: Record<string, number> = { '720p': 0.90, '1080p': 3.60 }
const LUMA_VIDEO_EDIT: Record<string, [number, number]> = {
  '360p': [0.54, 1.08], '540p': [0.72, 1.44], '720p': [1.08, 2.16], '1080p': [2.16, 4.32],
}
const LUMA_VIDEO_EDIT_HDR: Record<string, [number, number]> = {
  '360p': [1.08, 2.16], '540p': [1.44, 2.88], '720p': [2.16, 4.32], '1080p': [4.32, 8.64],
}
const LUMA_VIDEO_EDIT_EXR: Record<string, [number, number]> = {
  '360p': [1.62, 3.24], '540p': [2.16, 4.32], '720p': [3.24, 6.48], '1080p': [6.48, 12.96],
}
const LUMA_REFRAME: Record<string, number> = { '360p': 0.03, '540p': 0.06, '720p': 0.12, '1080p': 0.36 }  // 초당
const LUMA_IMG_BASE: Record<string, number> = { 'Luma Uni 1': 0.0404, 'Luma Uni 1 Max': 0.1000 }
const LUMA_IMG_1REF: Record<string, number> = { 'Luma Uni 1': 0.0434, 'Luma Uni 1 Max': 0.1030 }
const LUMA_REF_STEP = 0.0030   // 레퍼런스 1장 추가마다

/* ── 씨댄스: 초당 정액이 아니라 토큰 과금이다 ──────────────────────────────
   BytePlus ModelArk·fal 이 같은 식을 쓴다.
     토큰 = 가로 × 세로 × fps × 초 ÷ 1024
     원가(USD) = 토큰 × (100만 토큰당 단가) ÷ 1,000,000
   즉 원가가 화소 수에 정확히 비례한다. "초당 얼마 × 어림 배율" 로는 맞출 수 없다.

   식 검증(fal 공시가와 대조):
     1.0 Pro   1080p 5초 = 1920×1080×24×5÷1024 = 243,000토큰 × $3.0/M = $0.729  (공시 약 $0.74)
     1.0 Lite   720p 5초 = 1280× 720×24×5÷1024 = 108,000토큰 × $1.8/M = $0.194  (공시 약 $0.18)

   단가 출처:
     · 1.0 Pro $3.0/M · 1.0 Lite $1.8/M — fal 공개 가격(위 대조로 확인).
     · 2.0 $4.7/M — ModelArk 1080p 영상입력 없음 기준. 여러 곳이 같은 값을 싣는다.
       참고로 런웨이가 seedance2 1080p 를 초당 $0.40 에 재판매하는데,
       이 값으로 계산한 초당 원가 $0.228 의 1.75배다 — 재판매 마진으로 설명된다.
     · 2.0 Fast·Mini — 공개된 등급비(표준 1 : Fast 0.8 : Mini 0.5)를 2.0 단가에 적용.
     · 1.5 Pro — 1.0 Pro 와 2.0 사이. 공식 표를 못 구해 잠정값이다.
   ※ 실제 청구서로 검증되면 이 표만 고치면 된다. 계산식은 그대로 쓴다. */
const SEEDANCE_FPS = 24
const SEEDANCE_PER_M: Record<string, number> = {
  'Seedance 2.0': 4.7,
  'Seedance 2.0 Fast': 3.76,          // 4.7 × 0.8
  'Seedance 2.0 Mini': 2.35,          // 4.7 × 0.5
  'Seedance 1.5 Pro': 3.5,            // 잠정
  'Seedance 1.0 Pro': 3.0,
  'Seedance 1.0 Pro Fast': 1.74,      // 3.0 × 0.58 (기존 표의 Pro 대비 비율 유지)
  'Seedance 1.0 Lite (텍스트→영상)': 1.8,
  'Seedance 1.0 Lite (이미지→영상)': 1.8,
}

/* ── OpenAI 이미지: 크기에 따라 원가가 다르다 ──────────────────────────────
   공식 medium 등급 기준 gpt-image-1 은 1024×1024 $0.042, 1536×1024·1024×1536 $0.063 —
   정사각형이 아니면 정확히 1.5배다. 우리 비율 9종 중 8종이 긴 쪽으로 나가는데
   지금까지 크기와 무관하게 한 값으로 청구해 왔다.
   (high 등급은 $0.167 / $0.25 로 4배지만, 우리는 buildOpenAIImagePayload 에서
    medium 으로 고정해 원가를 결정적으로 만들었다.) */
const OPENAI_SQUARE_RATIOS = new Set(['1:1'])
const OPENAI_LONG_FACTOR = 1.5

/** OpenAI 이미지면 비율에 따른 원가(USD)를 낸다. 아니면 null. */
function openaiImgUsd(input: ChargeInput): number | null {
  const m = MODEL_COST[String(input.model || '')]
  if (!m || m.prov !== 'openai') return null
  const ratio = String(input.ratio || '1:1')
  const square = OPENAI_SQUARE_RATIOS.has(ratio)
  return m.usd * (square ? 1 : OPENAI_LONG_FACTOR)
}

/** 씨댄스면 토큰식으로 원가(USD)를 낸다. 아니면 null → 다음 규칙으로 간다. */
function seedanceUsd(input: ChargeInput): number | null {
  const model = String(input.model || '')
  const perM = SEEDANCE_PER_M[model]
  if (perM == null) return null
  const [w, h] = RES_PX[String(input.res || '1080p')] || RES_PX['1080p']
  const secs = Math.max(1, Math.round(Number(input.units) || 5))
  // 제공사가 실제 소비 토큰을 알려줬으면 그 값이 우선이다 — 추정이 아니라 실측으로 청구한다.
  const reported = Number(input.usageTokens) || 0
  const tokens = reported > 0 ? reported : (w * h * SEEDANCE_FPS * secs) / 1024
  const usd = (tokens * perM) / 1_000_000
  // 오디오는 토큰 과금과 별개로 붙는 항목이라 표의 초당 가산을 그대로 더한다.
  const m = MODEL_COST[model]
  const audioAdd = input.audio && m && m.audio ? m.audio * secs : 0
  return usd + audioAdd
}

/** 루마 모델이면 실측 표로 원가(USD)를 낸다. 아니면 null → 일반 공식으로 간다. */
function lumaUsd(input: ChargeInput): number | null {
  const model = String(input.model || '')
  if (!/^Luma /.test(model)) return null
  const res = String(input.res || '1080p')
  const refs = Math.max(0, Number(input.refs) || 0)
  if (LUMA_IMG_BASE[model] != null) {
    if (refs <= 0) return LUMA_IMG_BASE[model]
    return LUMA_IMG_1REF[model] + LUMA_REF_STEP * (Math.min(9, refs) - 1)
  }
  // 길이는 5초·10초 두 구간뿐이다. 그 사이 값은 위 구간으로 올린다(제공사가 그렇게 스냅한다).
  const slot = (Number(input.units) || 5) > 5 ? 1 : 0
  const pick = (t: Record<string, [number, number]>) => (t[res] || t['1080p'])[slot]
  if (/비율 변경/.test(model)) return (LUMA_REFRAME[res] || LUMA_REFRAME['1080p']) * Math.max(1, Number(input.units) || 5)
  if (/영상 편집/.test(model)) {
    if (input.hdr && input.exr) return pick(LUMA_VIDEO_EDIT_EXR)
    if (input.hdr) return pick(LUMA_VIDEO_EDIT_HDR)
    return pick(LUMA_VIDEO_EDIT)
  }
  // 생성 — HDR·EXR 은 5초 전용이라 길이와 무관하게 5초 요금이다(제공사가 10초를 반려한다).
  if (input.hdr && input.exr) return LUMA_VIDEO_GEN_EXR[res] || LUMA_VIDEO_GEN_EXR['1080p']
  if (input.hdr) return LUMA_VIDEO_GEN_HDR[res] || LUMA_VIDEO_GEN_HDR['1080p']
  return pick(LUMA_VIDEO_GEN)
}

/* ══ Google Veo 실측 요금표 (ai.google.dev/gemini-api/docs/pricing) ══
   문서 원문: "Veo 3.1 Standard video with audio price (default) — $0.40 (720p and 1080p), $0.60 (4k)"
   여기서 두 가지가 우리 계산과 달랐다.
     ① 오디오가 기본 포함이다. 우리는 초당 $0.35 를 따로 더하고 있었다.
     ② 720p 와 1080p 가 같은 값이다. 우리는 720p 에 0.6 배율을 적용해 40% 덜 받았고,
        4K 는 2.6 배율이라 실제(1.5배)보다 훨씬 많이 받았다.
   8초 오디오 영상 기준 오차: 720p 1.47배 과다 · 1080p 1.88배 과다 · 4K 2.32배 과다.
   (초기 검색에서 본 "초당 $0.10" 은 Standard 가 아니라 Fast 였다 — 한 줄만 보고 바꿨으면
    정반대로 틀릴 뻔했다.)
   2026-07 문서 원문 재확인 — 위 표(Standard $0.40/$0.40/$0.60)가 현재도 그대로다.
   같은 표의 미노출 모델: Fast $0.10(720p)/$0.12(1080p)/$0.30(4K),
   Lite $0.05(720p)/$0.08(1080p, 4K 미지원). 싼 선택지로 붙일 때 이 값을 그대로 쓰면 된다. */
const VEO_PRICE: Record<string, number> = { '720p': 0.40, '1080p': 0.40, '4K': 0.60 }
function veoUsd(input: ChargeInput): number | null {
  if (!/^Google Veo/.test(String(input.model || ''))) return null
  const res = String(input.res || '1080p')
  const perSec = VEO_PRICE[res] != null ? VEO_PRICE[res] : VEO_PRICE['1080p']
  return perSec * Math.max(1, Number(input.units) || 8)      // 오디오 포함 단가라 추가 가산이 없다
}

/* ══ BFL FLUX.2 공식 요금 (docs.bfl.ai/quick_start/pricing.md — 원문 확인) ══
   1크레딧 = $0.01. FLUX.2 는 출력 해상도에 따라 오르는 메가픽셀 단가이고,
   "텍스트→이미지" 와 "이미지 편집(레퍼런스 있음)" 의 기본 단가가 따로 있다.
     모델        텍스트→이미지   이미지 편집
     max         from $0.07     from $0.07
     pro         from $0.03     from $0.045
     flex        from $0.05     from $0.05
   메가픽셀 가산은 "출력" 해상도에만 붙는다(첫 1MP 가 기본 요금, 이후 MP 마다 추가).
   우리가 보내는 해상도는 전부 1MP 이하(1344×756·1024×1024·896×1120·736×1312)라
   기본 단가가 그대로 맞는다.

   ⚠ 앞서 한 번 여기를 잘못 고쳤다. 검색 요약만 보고 "레퍼런스 입력 1장마다 MP 단가가
   더 붙는다" 고 넣었는데, 공식 표에는 그런 항목이 없고 편집용 단가가 따로 있을 뿐이다.
   그대로 뒀으면 flex 에 8장 붙일 때 $0.54 를 물려 실제($0.05)의 10.8배를 받을 뻔했다.
   제공사 단가는 공식 문서 원문을 본 것만 반영한다 — 검색 요약으로는 고치지 않는다. */
const FLUX2_PRICE: Record<string, { t2i: number; edit: number }> = {
  'Flux 2 Max':  { t2i: 0.07, edit: 0.07 },
  'Flux 2 Pro':  { t2i: 0.03, edit: 0.045 },
  'Flux 2 Flex': { t2i: 0.05, edit: 0.05 },
}
function fluxUsd(input: ChargeInput): number | null {
  const p = FLUX2_PRICE[String(input.model || '')]
  if (!p) return null
  // 레퍼런스가 하나라도 붙으면 buildFluxPayload 가 input_image 를 실어 편집 요청이 된다
  return (Number(input.refs) || 0) > 0 ? p.edit : p.t2i
}

/* ══ 런웨이 Aleph 2.0 의 "생성당 최소 요금" ══
   공식 표: `aleph2` 는 초당 28크레딧이면서 "56 credit minimum per generation" 이다.
   즉 1초짜리를 만들어도 $0.28 이 아니라 $0.56 이 나간다. 초당 정액만으로는 표현이 안 된다. */
const ALEPH2_MIN_USD = 0.56
function runwayUsd(input: ChargeInput): number | null {
  const m = String(input.model || '')
  if (!/^Runway Aleph|^V2V 자동/.test(m)) return null
  const per = MODEL_COST[m] ? MODEL_COST[m].usd : 0.28
  const secs = Math.max(1, Number(input.units) || 5)
  return Math.max(ALEPH2_MIN_USD, per * secs)
}

/** 소수 2자리 반올림 (크레딧 정밀도) */
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

/** 서버 권위 과금 계산 — 스튜디오 recordCost 공식과 동일. usdKrw 는 그날의 환율.
 *  markupOverride: 회원별 관리자 지정 배수(원가=1). 지정 시 기본 마크업 대신 사용하며 최소 1배로 강제.
 *  크레딧 = 실제비용(원) × 배수 ÷ 50 을 소수 2자리로 차감(예: 2.5원→0.05, 57원→1.14). */
export function computeCharge(input: ChargeInput, usdKrw: number = USD_KRW, markupOverride?: number, creditKrw: number = CREDIT_KRW): ChargeResult {
  const basis = creditKrw && creditKrw > 0 ? creditKrw : CREDIT_KRW // 1크레딧당 원(회원 단가). 기본 50, 충전단가(65 등) 전달 시 그 값 기준
  const rate = usdKrw && usdKrw > 0 ? usdKrw : USD_KRW
  const model = String(input.model || '')
  const m = MODEL_COST[model]
  // 'img'(장당) 외에 '3d'(모델 1개당)·'tok'(호출 1회당) 도 "단위 1개" 과금이다 — 초당 계산을 타면 안 된다.
  const isFlat = m ? (m.u === 'img' || m.u === '3d' || m.u === 'tok') : input.kind === 'image'
  const isImg = isFlat
  let usd: number
  const lu = lumaUsd(input) ?? veoUsd(input) ?? fluxUsd(input) ?? runwayUsd(input) ?? seedanceUsd(input) ?? openaiImgUsd(input)   // 공식 요금표가 있는 제공사 우선
  if (lu != null) {
    usd = lu
  } else if (isImg) {
    usd = m ? m.usd : 0.05
  } else {
    const units = Math.max(1, Math.round(Number(input.units) || 8))
    const base = m ? m.usd : 0.06
    const resMult = RES_MULT[input.res || '1080p'] || 1
    const r = base * resMult
    const audioAdd = input.audio && m && m.audio ? m.audio * units : 0
    usd = r * units + audioAdd
  }
  /* 원(KRW) 환산은 "표시용 정수" 와 "계산용 실수" 를 분리한다.
     예전엔 Math.round(usd*rate) 한 정수로 크레딧을 계산해서, 1원이 안 되는 호출이
     0원 → 0크레딧 → 사실상 무료가 됐다. 프롬프트 LLM 중 싼 3종이 실제로 그랬다
     (gpt-4o-mini $0.00026 = 0.364원 → 0원 → 0크레딧, gpt-4.1-nano·gemini-2.5-flash-lite 도 같음).
     계산은 실수로 하고, 반올림은 보고용 costKrw 에만 쓴다. */
  const costKrwExact = usd * rate
  const costKrw = Math.round(costKrwExact)
  // 마크업: 회원별 지정 배수가 있으면 그 값(최소 1배). 없으면 씨댄스 2.0/이미지=2.5, 그 외 3배
  const isSeed20 = /Seedance\s*2\.0/i.test(model)
  const defaultMarkup = isSeed20 || isImg ? 2.5 : 3.0
  const markup = markupOverride && markupOverride > 0 ? Math.max(1, markupOverride) : defaultMarkup
  const priceKrw = costKrwExact * markup
  // 정확 비례 소수 크레딧 (올림 없음, 최소 1 없음). 1크레딧=basis원 → 1배·원가 6500원·65원기준 = 100크레딧
  const credits = round2(priceKrw / basis)
  const revenueKrw = round2(credits * basis)
  return {
    model,
    provider: m ? m.prov : String((input as any).provider || ''),
    kind: isImg ? 'image' : 'video',
    usd: Math.round(usd * 10000) / 10000,
    usdKrw: rate,
    costKrw,
    costKrwExact: Math.round(costKrwExact * 10000) / 10000,
    markup,
    credits,
    revenueKrw,
    profitKrw: round2(revenueKrw - costKrw),
  }
}

/** ai_usage 테이블 보장 + 정산 컬럼 마이그레이션 */
export async function ensureAiUsage(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY, user_id TEXT DEFAULT '', email TEXT DEFAULT '', name TEXT DEFAULT '',
      provider TEXT DEFAULT '', model TEXT DEFAULT '', kind TEXT DEFAULT '',
      units REAL DEFAULT 0, usd REAL DEFAULT 0, created_at TEXT NOT NULL
    )`,
    )
    .run()
  // 정산용 컬럼 (기존 테이블에도 추가)
  const cols: Record<string, string> = {
    cost_krw: 'cost_krw INTEGER DEFAULT 0',
    credits: 'credits INTEGER DEFAULT 0',
    revenue_krw: 'revenue_krw INTEGER DEFAULT 0',
    markup: 'markup REAL DEFAULT 0',
    usd_krw: 'usd_krw REAL DEFAULT 0',
    // 생성 콘텐츠 아카이브 (관리자 생성 기록 화면)
    prompt: "prompt TEXT DEFAULT ''",
    refs: "refs TEXT DEFAULT ''", // 레퍼런스 URL JSON 배열
    result_url: "result_url TEXT DEFAULT ''", // 결과 이미지/영상 URL(가능하면 R2 durable)
    result_kind: "result_kind TEXT DEFAULT ''", // image | video
  }
  for (const [name, ddl] of Object.entries(cols)) {
    await db.prepare(`ALTER TABLE ai_usage ADD COLUMN ${ddl}`).run().catch(() => {})
  }
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id)').run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_usage(created_at)').run().catch(() => {})
}
