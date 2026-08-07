import { ensureOnce } from '../_utils'
import { ALIBABA_MODELS, ALIBABA_BY_NAME } from './_alibaba'
import { LTX_MODELS, LTX_BY_NAME } from './_ltx'
import { RECRAFT_MODELS } from './_recraft'
// 스튜디오 AI 생성 과금 규칙 (서버 권위 계산) — precheck·record 공용
//  · 실제 AI 비용(원) = 제공사 공개 단가(USD) × 환율
//  · 판매가 = 실제 비용 × 마크업.  마크업: 씨댄스 2.0 계열·이미지 모델 = 2.5배, 그 외 = 3배
//  · 크레딧 = 판매가 ÷ 50원(올림).  (50원 = 1크레딧)
//  · 매출(원) = 실제 차감 크레딧 × 50.  순이익 = 매출 − 실제 AI 비용

export const USD_KRW = 1400 // 폴백 기본 환율 (API 실패 시)
export const CREDIT_KRW = 50 // 50원 = 1크레딧

/** 무료 FX API 에서 현재 USD→KRW 환율 조회 (키 불필요, 여러 소스 폴백) */
/* ⚠ 반드시 시간 제한을 건다.
   예전에는 제한이 없었다. 이 함수는 남의 서버 세 곳을 차례로 부르는데, 그중 하나가
   응답을 안 주면 우리 요청이 거기 매달린 채로 끝나지 않았다.
   더 나쁜 건 이 자리가 회원만 지나가는 길이라는 것이다 — 관리자는 과금 계산을 안 하니
   환율을 볼 일이 없다. "관리자는 되는데 회원만 안 된다" 가 나올 수 있는 모양이다.
   그리고 실패하면 아무것도 저장하지 않으므로, 한 번 막히면 그 뒤 모든 회원 요청이
   같은 세 곳을 다시 부른다(하루 한 번이 아니다). */
async function fetchUsdKrw(timeoutMs = 2500): Promise<number | null> {
  const sources: { url: string; pick: (j: any) => any }[] = [
    { url: 'https://open.er-api.com/v6/latest/USD', pick: (j) => j?.rates?.KRW },
    { url: 'https://api.frankfurter.app/latest?from=USD&to=KRW', pick: (j) => j?.rates?.KRW },
    { url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', pick: (j) => j?.usd?.krw },
  ]
  for (const s of sources) {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), timeoutMs)
    try {
      const r = await fetch(s.url, { signal: ctl.signal })
      if (!r.ok) continue
      const j: any = await r.json()
      const v = Number(s.pick(j))
      if (v && v > 300 && v < 3000) return Math.round(v)
    } catch {
      /* 다음 소스로 */
    } finally {
      clearTimeout(t)
    }
  }
  return null
}

/* 오늘 환율을 받아 저장한다 — 응답을 내보낸 뒤(waitUntil) 부르는 용도다.
   요청 경로에서는 절대 부르지 않는다(위 주석 참조). 이미 오늘 것이 있으면 아무것도 안 한다. */
let __fxCheckedDay = ''
export async function refreshUsdKrw(db: D1Database): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    //  이 isolate 에서 오늘 것을 이미 확인했으면 아무것도 하지 않는다 —
    //  안 그러면 요청마다 조회가 하나씩 늘어난다(줄이려고 한 일을 되돌리는 셈이다).
    if (__fxCheckedDay === today) return
    const cached: any = await db.prepare('SELECT usd_krw FROM fx_rates WHERE date = ?').bind(today).first().catch(() => null)
    if (cached && Number(cached.usd_krw) > 0) { __fxCheckedDay = today; return }
    const fetched = await fetchUsdKrw()
    if (!fetched) return   // 못 받아왔으면 표시를 남기지 않는다 — 다음 isolate 가 다시 해 본다
    await db.prepare('INSERT OR REPLACE INTO fx_rates (date, usd_krw, updated_at) VALUES (?, ?, ?)')
      .bind(today, fetched, new Date().toISOString()).run().catch(() => {})
    __fxCheckedDay = today
  } catch { /* 환율 갱신 실패는 아무것도 막지 않는다 */ }
}

/** 전역 모델별 배수 (settings.model_markups JSON). {모델명: 배수}. 없으면 {}. */
// 레퍼런스 이미지 1장 추가당 크레딧 가산율(%) 기본값
export const REF_SURCHARGE_DEFAULT = 0.5
// 회원별 레퍼런스 가산율 해석: 회원 지정값 > 전역 설정 > 기본(0.5%)
/* ── 요금 설정값 짧은 캐시 ──────────────────────────────────────────────
   환율·마크업·가산율은 관리자가 가끔 바꾸는 설정값인데, 생성 한 건에서 두 번 읽힌다 —
   먼저 "이 요청을 시작해도 되나" 게이트에서, 다시 "얼마를 뺄까" 정산에서.
   Cloudflare 는 D1 질의 하나를 서브리퀘스트 하나로 세고 요청당 한도가 있어서,
   이 중복이 한도를 갉아먹다가 넘기면 함수가 통째로 끊긴다(회원만 502 나던 그 자리).
   같은 값을 짧게 들고 있는다. 관리자가 단가를 바꾸면 최대 이 시간만큼 늦게 반영된다. */
const PRICE_TTL_MS = 30_000
const __pcache = new Map<string, { at: number; v: any }>()
async function cachedRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = __pcache.get(key)
  const now = Date.now()
  if (hit && now - hit.at < PRICE_TTL_MS) return hit.v as T
  const v = await load()
  __pcache.set(key, { at: now, v })
  if (__pcache.size > 500) for (const k of __pcache.keys()) { __pcache.delete(k); if (__pcache.size <= 400) break }
  return v
}

export async function resolveRefSurcharge(db: D1Database, userId: string): Promise<number> {
  return cachedRead('refsur:' + userId, () => __resolveRefSurcharge(db, userId))
}
async function __resolveRefSurcharge(db: D1Database, userId: string): Promise<number> {
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
  return cachedRead('cnsur', () => __resolveCnSurcharge(db))
}
async function __resolveCnSurcharge(db: D1Database): Promise<number> {
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
  return cachedRead('markup:' + userId + '|' + model + '|' + userMarkup, () => __resolveMarkup(db, userId, model, userMarkup))
}
async function __resolveMarkup(db: D1Database, userId: string, model: string, userMarkup: number): Promise<number | undefined> {
  try {
    const um: any = await db.prepare('SELECT multiplier FROM user_model_markups WHERE user_id = ? AND model = ?').bind(userId, model).first()
    if (um && Number(um.multiplier) > 0) return Number(um.multiplier)
  } catch { /* table 없을 수 있음 */ }
  if (userMarkup && userMarkup > 0) return userMarkup
  const gm = await getModelMarkups(db)
  if (gm[model] && Number(gm[model]) > 0) return Number(gm[model])
  return undefined // computeCharge 기본값(2.5/3.0)
}

/* ── 실측 원가 덮어쓰기 ──
   Kling·BytePlus(씨댄스/씨드림) 같은 제공사는 "공식 문서에 적힌 단일 단가" 가 없다.
   포인트 패키지·계약별로 실제 단가가 달라져서, 우리가 얼마를 내는지는 청구서를 봐야 안다.
   그래서 코드에 박힌 추정값을 관리자가 실측값으로 덮어쓸 수 있게 한다 —
   Veo 오디오 등급처럼 문서가 애매한 항목도 같은 방법으로 바로잡는다.
   단위는 단가표와 같다: 'sec' 모델은 초당 USD, 나머지는 1건당 USD. */
/* ⚠ 표 만들기는 한 번이면 된다. 요청마다 반복하면 Cloudflare 가 D1 질의 하나하나를
   서브리퀘스트로 세어 요청당 한도를 갉아먹는다(실측 회원 41회 · 관리자 5회 — 관리자는
   이 경로를 아예 안 탄다). ⚠ 이 차이가 회원 502 의 원인이라고 적어 두었는데 확인된 게 아니다:
   당시 무료 요금제로 알고 계산했지만 실제 계정은 Workers 유료였다. 왕복을 줄이는 근거일 뿐이다.
   같은 isolate 안에서는 한 번만 하고, 실패하면 다음 요청에서 다시 시도한다. */
export async function ensureCostOverrides(db: D1Database): Promise<void> {
  return ensureOnce(db, 'schema_costov_v1', () => __ensureCostOverrides(db), ['model_cost_overrides'])
}
async function __ensureCostOverrides(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS model_cost_overrides (
       model TEXT PRIMARY KEY, usd REAL NOT NULL, note TEXT DEFAULT '', updated_at TEXT )`,
  ).run().catch(() => {})
}

/** 이 모델의 실측 원가(USD/단위). 설정이 없으면 undefined → 코드의 추정값을 쓴다. */
export async function resolveCostOverride(db: D1Database, model: string): Promise<number | undefined> {
  return cachedRead('costov:' + model, () => __resolveCostOverride(db, model))
}
async function __resolveCostOverride(db: D1Database, model: string): Promise<number | undefined> {
  try {
    await ensureCostOverrides(db)
    const r: any = await db.prepare('SELECT usd FROM model_cost_overrides WHERE model = ?').bind(String(model || '')).first()
    const v = Number(r?.usd)
    return Number.isFinite(v) && v > 0 ? v : undefined
  } catch {
    return undefined
  }
}

/** 오늘자 USD→KRW 환율 (하루 1회 조회 후 D1 캐시). 결제/생성 시점의 그날 환율을 반환. */
export async function getUsdKrw(db: D1Database): Promise<number> {
  return cachedRead('fx', () => __getUsdKrw(db))
}
async function __getUsdKrw(db: D1Database): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  //  표 만들기는 한 번이면 된다 — 요청마다 반복하면 서브리퀘스트 한도를 갉아먹는다(위 주석 참조)
  await ensureOnce(db, 'schema_fxrates_v1', async () => {
    await db.prepare(`CREATE TABLE IF NOT EXISTS fx_rates (date TEXT PRIMARY KEY, usd_krw REAL NOT NULL, updated_at TEXT)`).run().catch(() => {})
  }, ['fx_rates'])
  /* 오늘 것과 마지막 것을 한 번에 읽는다 — 왕복 하나로 끝난다. */
  const r: any = await db.prepare(
    'SELECT usd_krw, (date = ?) AS is_today FROM fx_rates ORDER BY (date = ?) DESC, date DESC LIMIT 1',
  ).bind(today, today).first().catch(() => null)
  const v = Number(r?.usd_krw)
  /* ⚠ 오늘 것이 없어도 여기서 받아오지 않는다.
     남의 서버를 부르는 일이라 늦어지거나 막히면 회원의 생성 요청이 통째로 매달린다.
     환율은 하루 사이 몇 원 움직이는 값이라 어제 값으로 계산해도 요금 차이가 없다시피 하다.
     오늘 값은 응답을 내보낸 뒤 refreshUsdKrw() 가 따로 받아 채운다(generate.js onRequest 참조). */
  if (v > 0) return v
  /* 저장된 값이 하나도 없을 때(첫 배포)만 어쩔 수 없이 받아온다 — 시간 제한이 걸려 있다. */
  const fetched = await fetchUsdKrw()
  if (fetched) {
    await db
      .prepare('INSERT OR REPLACE INTO fx_rates (date, usd_krw, updated_at) VALUES (?, ?, ?)')
      .bind(today, fetched, new Date().toISOString())
      .run()
      .catch(() => {})
    return fetched
  }
  return USD_KRW
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
  'Seedance 2.5': { u: 'sec', usd: 0.4116, audio: 0.02, prov: 'seedance' },
  'Seedance 2.0': { u: 'sec', usd: 0.3430, audio: 0.02, prov: 'seedance' },
  'Seedance 2.0 Fast': { u: 'sec', usd: 0.2744, audio: 0.02, prov: 'seedance' },
  'Seedance 2.0 Mini': { u: 'sec', usd: 0.1715, audio: 0.02, prov: 'seedance' },
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
  /* 업스케일은 단가표에 두지 않는다 — 과금 토큰은 단가표에 있는 모델에만 발급되므로,
     여기 없으면 어떤 경로로도 크레딧이 빠질 수 없다(무료를 코드 구조로 보장한다).
     화질 올리기는 브라우저에서 우리 자체 초해상 모델로 처리한다. */
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
  /* ── 화질 올리기(업스케일) — 우리 자체 초해상 모델 ──
     다른 항목과 성격이 다르다. 여기 적힌 usd 는 "제공사에 나가는 원가" 가 아니다 —
     추론이 사용자 기기(브라우저 WASM)나 빌려간 쪽에서 돌아 우리가 내는 돈은 0이다.
     그래서 이 값은 우리가 매긴 값이며, 아래 크레딧이 목표치가 되도록 거꾸로 잡았다.
       크레딧 = usd × 환율(1400) × 마크업 ÷ 50원
       이미지: 0.014 × 1400 × 2.5 ÷ 50 ≈ 1.0크레딧 / 장
       영상  : 0.0024 × 1400 × 3.0 ÷ 50 ≈ 0.2크레딧 / 초  (46초 영상 ≈ 9.3크레딧)
     영상은 목표 화질(4K 등)에 따라 RES_MULT 가 곱해진다 — 더 큰 결과가 더 비싸진다.
     값을 바꾸려면 코드를 고칠 필요 없다: 관리자 → 모델 단가(model_cost_overrides)에서
     이 이름으로 실측 단가를 넣으면 그 값이 이긴다. */
  '화질 올리기 (이미지 초해상 ×4)': { u: 'img', usd: 0.014, prov: 'upscale' },
  '화질 올리기 (영상 초해상 ×4)': { u: 'sec', usd: 0.0024, prov: 'upscale' },
  /* ControlNet 생성 — fal.ai 의 flux-general + ControlNet Union 으로 나간다.
     스튜디오에서는 회원이 고른 이미지 모델 이름으로 청구돼서 이 이름이 필요 없었지만,
     API·MCP 로 바로 부를 때는 청구할 이름이 없어 표에 없는 모델이 되고 — 그러면
     이미지 기본값($0.05)으로 잡히거나 아예 안 잡힌다. 그래서 자기 줄을 만든다.
     ⚠ 이 값($0.035/장)은 미확인 추정이다. fal 의 flux-general 공식 단가 원문을 못 구했다.
        확실한 확인은 제공사 청구서를 그 달 장수로 나눠 역산하는 것이고, 그때
        관리자 → 모델 단가에서 이 이름으로 실측값을 넣으면 그 값이 이긴다.
     여기에 ControlNet 가산(기본 +10%)이 따로 곱해진다. */
  'ControlNet 이미지 (Canny·Depth·Pose)': { u: 'img', usd: 0.035, prov: 'falcontrol' },
  /* 외부에 모델을 빌려줄 때(대여 1건 = 발급된 리스 토큰 1개). 유효기간 동안 그 기기에서 돌린다.
     'tok' 은 1건 과금이라 마크업이 2.5다: 0.30 × 1400 × 2.5 ÷ 50 = 21크레딧 / 대여 */
  '모델 대여 (초해상 ×4)': { u: 'tok', usd: 0.30, prov: 'lease' },
}

/* ── 알리바바 Wan·Qwen 이미지/영상 ──
   56줄을 손으로 여기 옮겨 적으면 _alibaba.ts 와 어긋나는 날이 반드시 온다
   (루마·클링이 그렇게 어긋나 있었다). 표는 한 군데만 두고 여기서는 얹기만 한다.
   ⚠ 단가는 잠정이다 — 근거와 이유는 _alibaba.ts 머리말에 적어 뒀다.
     관리자 → 모델 단가(model_cost_overrides)가 언제나 이 값을 이긴다. */
for (const r of ALIBABA_MODELS) {
  MODEL_COST[r.name] = { u: r.unit as CostUnit, usd: r.usd, prov: 'alibaba' }
}
/* ── LTX(Lightricks) 영상 ──
   알리바바와 같은 이유로 표는 _ltx.ts 한 군데만 두고 여기서는 얹기만 한다.
   ⚠ 단가는 잠정이고 모델 ID 도 아직 미확인이다 — 근거와 한계는 _ltx.ts 머리말에 적어 뒀다.
     그래서 이 모델들은 등록부에 **꺼진 채로** 심긴다(회원에게 안 보인다).
     그래도 단가표에는 지금 올려 둔다 — 확인 뒤 켜는 순간 요금이 0원인 모델이
     회원 앞에 나가는 것을 막기 위해서다(과금은 이 표를 본다). */
for (const r of LTX_MODELS) {
  MODEL_COST[r.name] = { u: r.unit as CostUnit, usd: r.usd, prov: 'ltx' }
}
/* ── Recraft 래스터·벡터 이미지 ──
   장당 정액이라 따로 계산할 것이 없다 — 표 값이 그대로 원가다(u:'img' 는 단위 1개 과금).
   ⚠ 같은 모델 ID 라도 벡터 경로가 두 배쯤 비싸다. 그래서 표시명을 나눠 두 줄로 둔 것이다.
     한 줄로 합치면 벡터를 래스터 값으로 청구하게 되고, 그 차액은 전부 우리 손해다.
   단가 출처와 한계는 _recraft.ts 머리말에 적어 뒀다(관리자 실측값이 언제나 이긴다). */
for (const r of RECRAFT_MODELS) {
  MODEL_COST[r.name] = { u: r.unit as CostUnit, usd: r.usd, prov: 'recraft' }
}
//  과금 이름을 한 곳에서만 쓰도록 묶는다 — 문자열을 여기저기 적으면 표와 어긋난다
export const UPSCALE_IMG = '화질 올리기 (이미지 초해상 ×4)'
export const UPSCALE_VID = '화질 올리기 (영상 초해상 ×4)'
export const LEASE_SR = '모델 대여 (초해상 ×4)'
export const CONTROLNET_IMG = 'ControlNet 이미지 (Canny·Depth·Pose)'

export const PROV_LABEL: Record<string, string> = {
  google: 'Google Veo', runway: 'Runway', runway_aleph: 'Runway Aleph', v2v_auto: 'V2V 자동', motion: '모션 전이', seedance: 'Seedance', seedream: 'Seedream',
  ark3d: '3D 생성 (ModelArk)', promptgen: '프롬프트 작성 LLM',
  hailuo: 'MiniMax Hailuo', luma: 'Luma', xai: 'Grok', flux: 'Flux', falcontrol: 'fal ControlNet',
  nanobanana: 'Nano Banana', openai: 'GPT Image', kling: 'Kling', narrate: '나레이션', lipsync: '립싱크', music: '음악 생성', upscale: '업스케일', alibaba: '알리바바 Wan(Model Studio)',
  ltx: 'LTX (Lightricks)', recraft: 'Recraft (벡터·로고)',
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
/* ── 씨댄스 토큰 수 ──
   BytePlus 청구서(2026-07, kohheejun3394)의 모든 줄이 프레임 수로 정확히 떨어졌다.
   720p 기준 108.9K·173.7K·216.9K·324.9K 토큰 → ×1024÷(1280×720) = 121·193·241·361 프레임.
   전부 (24×초 + 1) 이다 — 마지막 프레임이 한 장 더 붙는다(5초=121프레임, 10초=241프레임).
   예전 식(24×초)은 5초에서 0.83%, 10초에서 0.42% 적게 잡았다. */
const seedanceFrames = (secs: number) => SEEDANCE_FPS * secs + 1

/* ── 씨댄스 100만 토큰당 단가(USD) ──
   [실측] 위 청구서에 단가가 그대로 찍혀 있다 — Seedance 2.0 $0.007/K, 2.0 Fast $0.0056/K.
          금액도 검산된다: 2.0 Fast 173.7K × $0.0056 = $0.97272 = 청구서 금액과 소수점까지 일치.
   예전 표는 두 모델 모두 정확히 0.671429 배였다(4.7/7.00 = 3.76/5.60). 출처가 통째로
   낮았다는 뜻이라, 청구서로 확인된 두 값은 실측으로 바꾸고 Mini 는 같은 배수로 되돌린다
   ($3.50 = 2.0 의 정확히 절반 — 2.0/Fast/Mini 가 7.00/5.60/3.50 으로 떨어진다).
   1.x 계열과 1.5 Pro 영상 단가는 이 청구서에 항목이 없어 아직 미확인이다
   (1.5 Pro 는 "inference-audio" 줄만 있었다 — $0.0024/K). */
export const SEEDANCE_PER_M: Record<string, number> = {
  'Seedance 2.5': 8.4,                // 미확인(요금 미공개) — 2.0 의 1.2배로 안전하게 높게.
                                      //  덜 받으면 손해라서 높은 쪽으로 기울였다. 실측 정산이 차액을 되돌린다.
  'Seedance 2.0': 7.0,                // 실측 — 청구서 $0.007/K
  'Seedance 2.0 Fast': 5.6,           // 실측 — 청구서 $0.0056/K
  'Seedance 2.0 Mini': 3.5,           // 추정 — 2.0 의 0.5배(위 두 값과 같은 보정 배수)
  'Seedance 1.5 Pro': 3.5,            // 미확인
  'Seedance 1.0 Pro': 3.0,            // 미확인
  'Seedance 1.0 Pro Fast': 1.74,      // 미확인 — 3.0 × 0.58
  'Seedance 1.0 Lite (텍스트→영상)': 1.8,   // 미확인
  'Seedance 1.0 Lite (이미지→영상)': 1.8,   // 미확인
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
  const tokens = reported > 0 ? reported : (w * h * seedanceFrames(secs)) / 1024
  const usd = (tokens * perM) / 1_000_000
  // 오디오는 토큰 과금과 별개로 붙는 항목이라 표의 초당 가산을 그대로 더한다.
  const m = MODEL_COST[model]
  const audioAdd = input.audio && m && m.audio ? m.audio * secs : 0
  return usd + audioAdd
}

/** 루마 모델이면 실측 표로 원가(USD)를 낸다. 아니면 null → 일반 공식으로 간다. */
/* ── 알리바바 Wan 영상 — 해상도 구간이 화소비를 안 따른다 ──
   우리 기본 계산은 1080p 값에 화소비(720p = 0.444)를 곱한다. 그런데 알리바바 공개
   단가는 720P ¥0.6 / 1080P ¥1.0 — 화소비가 아니라 0.6 배다.
   기본 계산에 맡기면 720p 를 실제 원가의 74%(0.444/0.6)만 받는다. 26% 를 우리가 물고
   파는 셈이고, 회원이 720p 를 주로 쓰면 그게 그대로 손실이 된다.
   그래서 구간 값을 표에 적어 두고 여기서 그대로 쓴다(루마·Veo 와 같은 방식이다).
   ⚠ wan2.7·wan2.6 만 출처 둘이 일치하는 값이고(근거 A), 나머지는 우리 추정(C)이다.
     추정은 1080p 의 0.6 배로 두었다 — 확인된 표가 그 비율이기 때문이다. */
function wanUsd(input: ChargeInput): number | null {
  const row = (ALIBABA_BY_NAME as any)[String(input.model || '')]
  if (!row || row.kind !== 'video') return null
  const units = Math.max(1, Math.round(Number(input.units) || 5))
  const res = String(input.res || '1080p')
  //  1080p 미만은 720p 값을 쓴다 — 더 싸게 주는 구간이 공개돼 있지 않다.
  //  모르는 구간을 임의로 깎으면 그만큼 우리가 손해를 본다.
  const per = /1080|4K|2160/i.test(res) ? row.usd : (row.usd720 || row.usd)
  return per * units
}

/* ── LTX 영상 — 해상도 구간을 표에서 그대로 읽는다 ──
   알리바바에서 배운 것과 같은 이유다. 기본 계산은 1080p 값에 화소비(720p = 0.444)를
   곱하는데, 제공사 요금표가 그 비율을 안 따르면 우리가 차액을 물게 된다.
   ⚠ LTX 구간 값은 아직 확인된 것이 아니다(_ltx.ts 머리말). 확인되기 전까지는
     720p 를 1080p 의 절반 근처로 **덜 깎아** 둔다 — 모르는 구간을 임의로 깎으면
     그만큼 우리 손해가 되고, 되돌릴 수 없다. */
function ltxUsd(input: ChargeInput): number | null {
  const row = (LTX_BY_NAME as any)[String(input.model || '')]
  if (!row) return null
  const units = Math.max(1, Math.round(Number(input.units) || 5))
  const res = String(input.res || '1080p')
  const per = /1080|4K|2160/i.test(res) ? row.usd : (row.usd720 || row.usd)
  return per * units
}

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
export function computeCharge(input: ChargeInput, usdKrw: number = USD_KRW, markupOverride?: number, creditKrw: number = CREDIT_KRW, costOverrideUsd?: number): ChargeResult {
  const basis = creditKrw && creditKrw > 0 ? creditKrw : CREDIT_KRW // 1크레딧당 원(회원 단가). 기본 50, 충전단가(65 등) 전달 시 그 값 기준
  const rate = usdKrw && usdKrw > 0 ? usdKrw : USD_KRW
  /* 여기로 들어오는 숫자는 마지막까지 유한해야 한다.
     effectiveUnits 가 앞에서 걸러 주지만 이 함수를 직접 부르는 곳도 있고(MCP 추정·관리자 화면),
     Infinity·NaN 이 한 번이라도 새면 잔액 UPDATE 와 ai_usage 합계가 통째로 망가진다.
     계산 "직전" 에 한 번 더 막는다 — 방어는 두 겹이어야 한 겹이 뚫려도 돈이 안 샌다. */
  const fin = (v: any, dflt: number, max: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : dflt
  }
  input = { ...input, units: fin(input.units, 0, 3600), refs: fin((input as any).refs, 0, 64) }
  let model = String(input.model || '')
  /* ── 화질 올리기(업스케일) 과금 ──
     예전에는 여기서 무조건 0원으로 되돌렸다. 브라우저에서 우리 모델로 돌아 제공사 비용이
     0이라는 이유였고, "절대 유료가 되면 안 된다" 는 지시에 따라 다섯 겹으로 막아 뒀었다.
     그 방침이 뒤집혔다 — 업스케일도 과금한다(스튜디오·외부 대여 모두).
     제공사 원가가 0이라 이 값은 원가 보전이 아니라 우리가 매기는 값이다. 그래서
     추정식에 맡기지 않고 아래 MODEL_COST 에 이름을 올려 두고, 관리자가 실제 단가
     override(admin/model-pricing)로 언제든 바꿀 수 있게 한다.
     이름을 못 알아본 옛 그래프가 들어와도 업스케일로 잡히도록 별칭을 여기서 정규화한다 —
     안 그러면 표에 없는 이름이 되어 영상 기본값($0.06/초)으로 청구된다(25배 과청구). */
  if (/업스케일|화질 올리기|upscale/i.test(model) && !MODEL_COST[model]) {
    const asImg = input.kind === 'image' || /이미지|image|img/i.test(model)
    model = asImg ? UPSCALE_IMG : UPSCALE_VID
  }
  const m = MODEL_COST[model]
  // 'img'(장당) 외에 '3d'(모델 1개당)·'tok'(호출 1회당) 도 "단위 1개" 과금이다 — 초당 계산을 타면 안 된다.
  const isFlat = m ? (m.u === 'img' || m.u === '3d' || m.u === 'tok') : input.kind === 'image'
  const isImg = isFlat
  let usd: number
  /* 관리자가 청구서를 보고 넣은 실측 단가가 있으면 그게 가장 정확하다 — 추정 공식보다 앞선다.
     'sec' 모델은 초당 값이므로 길이를 곱하고, 나머지는 1건당 값이라 그대로 쓴다. */
  const ov = Number(costOverrideUsd)
  const hasOv = Number.isFinite(ov) && ov > 0
  const lu = hasOv
    ? (isFlat ? ov : ov * Math.max(1, Math.round(Number(input.units) || 8)))
    : (wanUsd(input) ?? ltxUsd(input) ?? lumaUsd(input) ?? veoUsd(input) ?? fluxUsd(input) ?? runwayUsd(input) ?? seedanceUsd(input) ?? openaiImgUsd(input))   // 공식 요금표가 있는 제공사 우선
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
/* 위와 같은 이유로 한 번만 한다 — 요청마다 반복하면 서브리퀘스트 한도를 갉아먹는다. */
/* ⚠ 아래 cols 에 칸을 새로 추가하면 이 열쇠의 번호를 반드시 올려야 한다.
     ensureOnce 는 "표시가 있고 그 표가 있으면" 통째로 건너뛴다 — 표는 이미 있으므로
     번호를 그대로 두면 새 칸은 이미 도는 DB(=운영)에 영영 안 생긴다.
     실제로 archive_tries 가 그랬다: 보관 그물의 질의가 없는 칸을 읽어 조용히 터지고,
     catch 에 걸려 "옮길 것 0건" 으로 답했다. 크론은 멀쩡히 도는데 아무것도 안 옮긴다.
     v1 → v2: archive_tries 추가. */
export async function ensureAiUsage(db: D1Database): Promise<void> {
  return ensureOnce(db, 'schema_aiusage_v2', () => __ensureAiUsage(db), ['ai_usage'])
}
async function __ensureAiUsage(db: D1Database): Promise<void> {
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
    /* 보관 그물이 몇 번이나 시도했는지. 제공사 주소는 며칠이면 만료되고 그 뒤로는
       몇 번을 해도 못 가져온다 — 세지 않으면 그 줄들이 목록 맨 앞에 영원히 남아
       정기 실행마다 같은 여섯 건을 다시 내려받으려 하고, 그 뒤에 있는
       아직 살릴 수 있는 줄에는 영영 닿지 못한다. */
    archive_tries: 'archive_tries INTEGER DEFAULT 0',
  }
  for (const [name, ddl] of Object.entries(cols)) {
    await db.prepare(`ALTER TABLE ai_usage ADD COLUMN ${ddl}`).run().catch(() => {})
  }
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id)').run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_usage(created_at)').run().catch(() => {})
}
