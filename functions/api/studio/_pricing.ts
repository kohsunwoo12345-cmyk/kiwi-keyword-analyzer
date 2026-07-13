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

const RES_MULT: Record<string, number> = { '720p': 0.6, '1080p': 1.0, '4K': 2.6 }

// 모델 표시명 → 단가.  u:'sec'(영상 초당) | 'img'(이미지 장당), usd, audio(오디오 초당 추가), prov(집계용)
export const MODEL_COST: Record<string, { u: 'sec' | 'img'; usd: number; audio?: number; prov: string }> = {
  'Runway Aleph (영상→실사 V2V)': { u: 'sec', usd: 0.15, prov: 'runway_aleph' },
  'Google Veo 3.1': { u: 'sec', usd: 0.40, audio: 0.35, prov: 'google' },
  'Runway Gen-4': { u: 'sec', usd: 0.05, prov: 'runway' },
  'Seedance 2.0': { u: 'sec', usd: 0.062, audio: 0.02, prov: 'seedance' },
  'Seedance 2.0 Fast': { u: 'sec', usd: 0.036, audio: 0.02, prov: 'seedance' },
  'Seedance 1.5 Pro': { u: 'sec', usd: 0.05, prov: 'seedance' },
  'Seedance 1.0 Pro': { u: 'sec', usd: 0.062, prov: 'seedance' },
  'Seedance 1.0 Pro Fast': { u: 'sec', usd: 0.036, prov: 'seedance' },
  'Seedance 1.0 Lite (텍스트→영상)': { u: 'sec', usd: 0.018, prov: 'seedance' },
  'Seedance 1.0 Lite (이미지→영상)': { u: 'sec', usd: 0.018, prov: 'seedance' },
  'MiniMax Hailuo 02': { u: 'sec', usd: 0.048, prov: 'hailuo' },
  'MiniMax T2V-01 Director': { u: 'sec', usd: 0.043, prov: 'hailuo' },
  'MiniMax I2V-01 Director': { u: 'sec', usd: 0.043, prov: 'hailuo' },
  'Luma Ray 2': { u: 'sec', usd: 0.08, prov: 'luma' },
  'Luma Ray Flash 2': { u: 'sec', usd: 0.04, prov: 'luma' },
  'Luma Ray 1.6': { u: 'sec', usd: 0.06, prov: 'luma' },
  'Grok Imagine': { u: 'img', usd: 0.07, prov: 'xai' },
  'Nano Banana': { u: 'img', usd: 0.039, prov: 'nanobanana' },
  'GPT Image 2': { u: 'img', usd: 0.08, prov: 'openai' },
  'GPT Image 1.5': { u: 'img', usd: 0.06, prov: 'openai' },
  'GPT Image': { u: 'img', usd: 0.04, prov: 'openai' },
  'GPT Image Mini': { u: 'img', usd: 0.015, prov: 'openai' },
  'Flux 1.1 Pro Ultra': { u: 'img', usd: 0.06, prov: 'flux' },
  'Flux 1.1 Pro': { u: 'img', usd: 0.04, prov: 'flux' },
  'Flux Pro': { u: 'img', usd: 0.05, prov: 'flux' },
  'Flux Dev': { u: 'img', usd: 0.025, prov: 'flux' },
  'Flux Kontext Max (레퍼런스 편집)': { u: 'img', usd: 0.08, prov: 'flux' },
  'Flux Kontext Pro (레퍼런스 편집)': { u: 'img', usd: 0.05, prov: 'flux' },
}

export const PROV_LABEL: Record<string, string> = {
  google: 'Google Veo', runway: 'Runway', runway_aleph: 'Runway Aleph', seedance: 'Seedance',
  hailuo: 'MiniMax Hailuo', luma: 'Luma', xai: 'Grok', flux: 'Flux', falcontrol: 'fal ControlNet',
  nanobanana: 'Nano Banana', openai: 'GPT Image',
}

export interface ChargeInput {
  model: string
  units?: number // 영상: 초, 이미지: 무시
  kind?: string // 'image' | 'video'
  res?: string // '720p'|'1080p'|'4K'
  audio?: boolean
}

export interface ChargeResult {
  model: string
  provider: string
  kind: 'image' | 'video'
  usd: number // 실제 AI 비용(USD)
  usdKrw: number // 적용 환율 (그날의 USD→KRW)
  costKrw: number // 실제 AI 비용(원)
  markup: number // 3.0 | 2.5
  credits: number // 차감 크레딧
  revenueKrw: number // 매출(원) = credits × 50
  profitKrw: number // 순이익(원) = revenue − cost
}

/** 서버 권위 과금 계산 — 스튜디오 recordCost 공식과 동일. usdKrw 는 그날의 환율. */
export function computeCharge(input: ChargeInput, usdKrw: number = USD_KRW): ChargeResult {
  const rate = usdKrw && usdKrw > 0 ? usdKrw : USD_KRW
  const model = String(input.model || '')
  const m = MODEL_COST[model]
  const isImg = m ? m.u === 'img' : input.kind === 'image'
  let usd: number
  if (isImg) {
    usd = m ? m.usd : 0.05
  } else {
    const units = Math.max(1, Math.round(Number(input.units) || 8))
    const base = m ? m.usd : 0.06
    const resMult = RES_MULT[input.res || '1080p'] || 1
    const r = base * resMult
    const audioAdd = input.audio && m && m.audio ? m.audio * units : 0
    usd = r * units + audioAdd
  }
  const costKrw = Math.round(usd * rate)
  // 마크업: 씨댄스 2.0 계열 또는 이미지(사진 제작) 모델 = 2.5배, 그 외 3배
  const isSeed20 = /Seedance\s*2\.0/i.test(model)
  const markup = isSeed20 || isImg ? 2.5 : 3.0
  const priceKrw = costKrw * markup
  const credits = Math.max(1, Math.ceil(priceKrw / CREDIT_KRW))
  const revenueKrw = credits * CREDIT_KRW
  return {
    model,
    provider: m ? m.prov : String((input as any).provider || ''),
    kind: isImg ? 'image' : 'video',
    usd: Math.round(usd * 10000) / 10000,
    usdKrw: rate,
    costKrw,
    markup,
    credits,
    revenueKrw,
    profitKrw: revenueKrw - costKrw,
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
  }
  for (const [name, ddl] of Object.entries(cols)) {
    await db.prepare(`ALTER TABLE ai_usage ADD COLUMN ${ddl}`).run().catch(() => {})
  }
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id)').run().catch(() => {})
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_usage(created_at)').run().catch(() => {})
}
