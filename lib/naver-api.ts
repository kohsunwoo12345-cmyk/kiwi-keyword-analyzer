/**
 * 네이버 API 연동 레이어
 * - 검색광고 API: 키워드별 월간 검색량, 연관 키워드 (API 키 필요)
 * - 네이버 쇼핑 인사이트: 카테고리별 실시간 트렌드 키워드 (인증 불필요 ✅)
 * - 네이버 자동완성 API: 연관 키워드 (인증 불필요 ✅)
 * - DataLab API: 검색 트렌드 (OpenAPI 키 필요)
 * - OpenAPI: 블로그/카페 발행량 (클라이언트 ID/Secret 필요)
 */

// Edge Runtime 호환: Node.js crypto 대신 Web Crypto API 사용

// ──────────────────────────────────────────────
// 환경 변수
// ──────────────────────────────────────────────
const AD_API_BASE = 'https://api.searchad.naver.com'
const DATALAB_BASE = 'https://openapi.naver.com/v1/datalab/search'
const OPEN_API_BASE = 'https://openapi.naver.com/v1/search'

// 네이버 쇼핑 인사이트 - 인증 불필요
const SHOPPING_INSIGHT_URL = 'https://datalab.naver.com/shoppingInsight/getCategoryKeywordRank.naver'
const SHOPPING_CATEGORY_URL = 'https://datalab.naver.com/shoppingInsight/getCategoryList.naver'
const AUTOCOMPLETE_URL = 'https://ac.search.naver.com/nx/ac'

// 네이버 쇼핑 카테고리 cid (getCategoryList.naver 에서 확인된 실제 값)
export const NAVER_SHOPPING_CATEGORIES = [
  { cid: 50000000, name: '패션의류', icon: '👗' },
  { cid: 50000001, name: '패션잡화', icon: '👜' },
  { cid: 50000002, name: '화장품/미용', icon: '💄' },
  { cid: 50000003, name: '디지털/가전', icon: '💻' },
  { cid: 50000004, name: '가구/인테리어', icon: '🛋️' },
  { cid: 50000005, name: '출산/육아', icon: '🍼' },
  { cid: 50000006, name: '식품', icon: '🍎' },
  { cid: 50000007, name: '스포츠/레저', icon: '⚽' },
  { cid: 50000008, name: '생활/건강', icon: '🏥' },
  { cid: 50000009, name: '여가/생활편의', icon: '🎭' },
  { cid: 50005542, name: '도서', icon: '📚' },
]

function getEnv() {
  return {
    adCustomerId: process.env.NAVER_AD_CUSTOMER_ID || '',
    adApiKey: process.env.NAVER_AD_ACCESS_LICENSE || '',
    adSecretKey: process.env.NAVER_API_SECRET_KEY || '',
    clientId: process.env.NAVER_CLIENT_ID || '',
    clientSecret: process.env.NAVER_CLIENT_SECRET || '',
  }
}

// ──────────────────────────────────────────────
// HMAC 서명 (검색광고 API)
// ──────────────────────────────────────────────
// Web Crypto API 기반 HMAC-SHA256 (Edge Runtime 호환)
async function makeSignature(timestamp: number, method: string, path: string, secretKey: string): Promise<string> {
  const message = `${timestamp}.${method}.${path}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

async function adHeaders(method: string, path: string) {
  const env = getEnv()
  const timestamp = Date.now()
  const signature = await makeSignature(timestamp, method, path, env.adSecretKey)
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': String(timestamp),
    'X-API-KEY': env.adApiKey,
    'X-Customer': env.adCustomerId,
    'X-Signature': signature,
  }
}

function openApiHeaders() {
  const env = getEnv()
  return {
    'X-Naver-Client-Id': env.clientId,
    'X-Naver-Client-Secret': env.clientSecret,
  }
}

// 쇼핑 인사이트 공통 헤더
const SHOPPING_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Referer': 'https://datalab.naver.com/shoppingInsight/sCategory.naver',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
}

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────
export interface KeywordStat {
  relKeyword: string
  monthlyPcQcCnt: number
  monthlyMobileQcCnt: number
  monthlyAvePcClkCnt: number
  monthlyAveMobileClkCnt: number
  monthlyAvePcCtr: number
  monthlyAveMobileCtr: number
  plAvgDepth: number
  compIdx: string
  monthlyAvePcBidAmt: number
  monthlyAveMobileBidAmt: number
  isRestricted: boolean
}

export interface RelKeyword {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number
  cafeCount: number
  saturationRatio: number
}

export interface TrendData {
  period: string
  ratio: number
}

export interface NaverSearchResult {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  pcCtr: number
  mobileCtr: number
  pcBid: number
  mobileBid: number
  competitionLevel: string
  relKeywords: RelKeyword[]
  blogCount: number
  cafeCount: number
  trends: TrendData[]
  monthlyTrends: { month: string; pc: number; mobile: number }[]
  genderRatio?: { male: number; female: number }
  ageGroup?: { [key: string]: number }
}

export interface TrendingKeyword {
  rank: number
  keyword: string
  category: string
  categoryIcon: string
  cid: number
}

export interface ShoppingRankResponse {
  statusCode: number
  range: string
  ranks: { rank: number; keyword: string; linkId: string }[]
}

// ──────────────────────────────────────────────
// ✅ 1. 네이버 쇼핑 인사이트 — 실제 트렌딩 키워드 (인증 불필요)
// ──────────────────────────────────────────────
export async function fetchRealTrendingKeywords(
  cid: number = 50000000,
  count: number = 20,
  device: 'pc' | 'mo' | '' = '',
  sex: 'f' | 'm' | '' = '',
  age: string = ''
): Promise<TrendingKeyword[]> {
  // 날짜 계산 (어제 기준 — 오늘 데이터는 아직 집계 안 됨)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const endDate = yesterday.toISOString().slice(0, 10)
  const startDate = twoDaysAgo.toISOString().slice(0, 10)

  const body = new URLSearchParams({
    cid: String(cid),
    timeUnit: 'date',
    startDate,
    endDate,
    age,
    sex,
    device,
    count: String(count),
  })

  try {
    const res = await fetch(SHOPPING_INSIGHT_URL, {
      method: 'POST',
      headers: SHOPPING_HEADERS,
      body: body.toString(),
    })

    if (!res.ok) throw new Error(`Shopping Insight API error: ${res.status}`)
    const json = await res.json() as ShoppingRankResponse

    if (!json.ranks || json.ranks.length === 0) {
      console.warn(`[ShoppingInsight] Empty ranks for cid=${cid}`)
      return []
    }

    // 카테고리 정보 매핑
    const category = NAVER_SHOPPING_CATEGORIES.find(c => c.cid === cid)
    const categoryName = category?.name || '전체'
    const categoryIcon = category?.icon || '📊'

    return json.ranks.map(r => ({
      rank: r.rank,
      keyword: r.keyword,
      category: categoryName,
      categoryIcon,
      cid,
    }))
  } catch (e) {
    console.error(`[ShoppingInsight] fetchRealTrendingKeywords error (cid=${cid}):`, e)
    return []
  }
}

// ──────────────────────────────────────────────
// ✅ 2. 네이버 쇼핑 인사이트 — 전체 카테고리 트렌드 (병렬 조회)
// ──────────────────────────────────────────────
export async function fetchAllCategoryTrends(count: number = 10): Promise<{
  category: { cid: number; name: string; icon: string }
  keywords: TrendingKeyword[]
  dateRange: string
}[]> {
  // 주요 카테고리만 선택 (응답 빠른 것들)
  const targetCategories = NAVER_SHOPPING_CATEGORIES.filter(c => 
    [50000000, 50000001, 50000002, 50000006, 50000007, 50000008].includes(c.cid)
  )

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const endDate = yesterday.toISOString().slice(0, 10)
  const startDate = twoDaysAgo.toISOString().slice(0, 10)

  const results = await Promise.allSettled(
    targetCategories.map(async (cat) => {
      const body = new URLSearchParams({
        cid: String(cat.cid),
        timeUnit: 'date',
        startDate,
        endDate,
        age: '',
        sex: '',
        device: '',
        count: String(count),
      })

      const res = await fetch(SHOPPING_INSIGHT_URL, {
        method: 'POST',
        headers: SHOPPING_HEADERS,
        body: body.toString(),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as ShoppingRankResponse

      return {
        category: cat,
        keywords: (json.ranks || []).map(r => ({
          rank: r.rank,
          keyword: r.keyword,
          category: cat.name,
          categoryIcon: cat.icon,
          cid: cat.cid,
        })),
        dateRange: json.range || `${startDate} ~ ${endDate}`,
      }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<{
      category: typeof targetCategories[0]
      keywords: TrendingKeyword[]
      dateRange: string
    }> => r.status === 'fulfilled' && r.value.keywords.length > 0)
    .map(r => r.value)
}

// ──────────────────────────────────────────────
// ✅ 3. 네이버 자동완성 API — 실제 연관 키워드 (인증 불필요)
// ──────────────────────────────────────────────
export async function fetchRealRelatedKeywords(keyword: string, limit: number = 20): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      q: keyword,
      st: '100',
      r_format: 'json',
      r_enc: 'UTF-8',
      lang: 'ko',
      r_lt: String(limit),
    })

    const res = await fetch(`${AUTOCOMPLETE_URL}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://search.naver.com/',
      },
    })

    if (!res.ok) throw new Error(`Autocomplete API error: ${res.status}`)
    const json = await res.json() as { items: string[][][] }

    // 응답 구조: { items: [[["키워드1"], ["키워드2"], ...]] }
    const items = json.items?.[0] || []
    return items
      .map(item => item[0])
      .filter(k => k && k !== keyword)
      .slice(0, limit)
  } catch (e) {
    console.error('[Autocomplete] fetchRealRelatedKeywords error:', e)
    return getMockRelatedKeywords(keyword).slice(0, limit)
  }
}

// ──────────────────────────────────────────────
// ✅ 4. 네이버 쇼핑 카테고리 목록 조회 (인증 불필요)
// ──────────────────────────────────────────────
export async function fetchShoppingCategories(): Promise<{ cid: number; name: string; pid: number }[]> {
  try {
    const res = await fetch(SHOPPING_CATEGORY_URL, {
      headers: SHOPPING_HEADERS,
    })
    if (!res.ok) throw new Error(`Category API error: ${res.status}`)
    const json = await res.json() as { cid: number; name: string; pid: number }[]
    return json || []
  } catch (e) {
    console.error('[ShoppingInsight] fetchShoppingCategories error:', e)
    return NAVER_SHOPPING_CATEGORIES.map(c => ({ cid: c.cid, name: c.name, pid: 0 }))
  }
}

// ──────────────────────────────────────────────
// 5. 검색광고 API — 키워드 통계 조회
// ──────────────────────────────────────────────
export async function fetchKeywordStats(keywords: string[]): Promise<KeywordStat[]> {
  const path = '/keywordstool'
  const env = getEnv()
  
  // API 키가 없으면 모의 데이터 반환
  if (!env.adApiKey || !env.adCustomerId || !env.adSecretKey) {
    return getMockKeywordStats(keywords)
  }

  try {
    const params = new URLSearchParams()
    keywords.slice(0, 5).forEach(k => params.append('hintKeywords', k))
    params.set('showDetail', '1')

    const res = await fetch(`${AD_API_BASE}${path}?${params}`, {
      headers: await adHeaders('GET', path),
    })
    if (!res.ok) throw new Error(`AD API error: ${res.status}`)
    const json = await res.json() as { keywordList: KeywordStat[] }
    return json.keywordList || []
  } catch (e) {
    console.error('[NaverAD] fetchKeywordStats error:', e)
    return getMockKeywordStats(keywords)
  }
}

// ──────────────────────────────────────────────
// 6. DataLab API — 검색 트렌드
// ──────────────────────────────────────────────
export async function fetchSearchTrend(
  keyword: string,
  startDate: string,
  endDate: string,
  timeUnit: 'date' | 'week' | 'month' = 'month'
): Promise<TrendData[]> {
  const env = getEnv()

  if (!env.clientId || !env.clientSecret) {
    return getMockTrendData(startDate, endDate, timeUnit)
  }

  try {
    const body = {
      startDate,
      endDate,
      timeUnit,
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    }
    const res = await fetch(DATALAB_BASE, {
      method: 'POST',
      headers: { ...openApiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`DataLab error: ${res.status}`)
    const json = await res.json() as { results: { data: { period: string; ratio: number }[] }[] }
    return json.results?.[0]?.data || []
  } catch (e) {
    console.error('[NaverDataLab] fetchSearchTrend error:', e)
    return getMockTrendData(startDate, endDate, timeUnit)
  }
}

// ──────────────────────────────────────────────
// 7. OpenAPI — 블로그/카페 발행량
// ──────────────────────────────────────────────
export async function fetchBlogCount(keyword: string): Promise<number> {
  const env = getEnv()
  if (!env.clientId) return getMockBlogCount(keyword)

  try {
    const params = new URLSearchParams({ query: keyword, display: '1', start: '1', sort: 'date' })
    const res = await fetch(`${OPEN_API_BASE}/blog?${params}`, {
      headers: openApiHeaders(),
    })
    if (!res.ok) throw new Error(`Blog API error: ${res.status}`)
    const json = await res.json() as { total: number }
    return json.total || 0
  } catch {
    return getMockBlogCount(keyword)
  }
}

export async function fetchCafeCount(keyword: string): Promise<number> {
  const env = getEnv()
  if (!env.clientId) return getMockBlogCount(keyword) / 5

  try {
    const params = new URLSearchParams({ query: keyword, display: '1', start: '1', sort: 'date' })
    const res = await fetch(`${OPEN_API_BASE}/cafearticle?${params}`, {
      headers: openApiHeaders(),
    })
    if (!res.ok) throw new Error(`Cafe API error: ${res.status}`)
    const json = await res.json() as { total: number }
    return json.total || 0
  } catch {
    return getMockBlogCount(keyword) / 5
  }
}

// ──────────────────────────────────────────────
// 8. 종합 키워드 분석 (메인 함수)
// ──────────────────────────────────────────────
export async function analyzeKeyword(keyword: string): Promise<NaverSearchResult> {
  const today = new Date()
  const endDate = today.toISOString().slice(0, 10)
  const startDate1y = new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString().slice(0, 10)
  const start5y = '2016-01-01'

  // 실제 연관 키워드 먼저 조회 (자동완성 API - 인증 불필요)
  const [stats, blogCount, cafeCount, trends1y, trends5y, realRelated] = await Promise.all([
    fetchKeywordStats([keyword]),
    fetchBlogCount(keyword),
    fetchCafeCount(keyword),
    fetchSearchTrend(keyword, startDate1y, endDate, 'month'),
    fetchSearchTrend(keyword, start5y, endDate, 'month'),
    fetchRealRelatedKeywords(keyword, 15),
  ])

  const mainStat = stats.find(s => s.relKeyword === keyword) || stats[0]
  const pcSearch = mainStat ? parseSearchCount(mainStat.monthlyPcQcCnt) : getMockPcSearch(keyword)
  const mobileSearch = mainStat ? parseSearchCount(mainStat.monthlyMobileQcCnt) : getMockMobileSearch(keyword)

  // 연관 키워드: 검색광고 API 결과 + 자동완성 결과 통합
  const adRelKeywords: RelKeyword[] = stats.slice(0, 10).map(s => ({
    keyword: s.relKeyword,
    pcSearch: parseSearchCount(s.monthlyPcQcCnt),
    mobileSearch: parseSearchCount(s.monthlyMobileQcCnt),
    totalSearch: parseSearchCount(s.monthlyPcQcCnt) + parseSearchCount(s.monthlyMobileQcCnt),
    blogCount: Math.round(getMockBlogCount(s.relKeyword)),
    cafeCount: Math.round(getMockBlogCount(s.relKeyword) / 5),
    saturationRatio: 0,
  }))

  // 자동완성에서 가져온 실제 연관어 추가 (검색광고 API 결과에 없는 것들만)
  const existingKeywords = new Set(adRelKeywords.map(r => r.keyword))
  const autocompleteRelKeywords: RelKeyword[] = realRelated
    .filter(k => !existingKeywords.has(k))
    .map(k => ({
      keyword: k,
      pcSearch: getMockPcSearch(k),
      mobileSearch: getMockMobileSearch(k),
      totalSearch: getMockPcSearch(k) + getMockMobileSearch(k),
      blogCount: Math.round(getMockBlogCount(k)),
      cafeCount: Math.round(getMockBlogCount(k) / 5),
      saturationRatio: 0,
    }))

  const relKeywords = [...adRelKeywords, ...autocompleteRelKeywords].slice(0, 20)

  // 월별 트렌드 (최근 12개월)
  const monthlyTrends = generateMonthlyTrends(trends1y, pcSearch, mobileSearch)

  return {
    keyword,
    pcSearch,
    mobileSearch,
    totalSearch: pcSearch + mobileSearch,
    pcCtr: mainStat ? mainStat.monthlyAvePcCtr : 0.05,
    mobileCtr: mainStat ? mainStat.monthlyAveMobileCtr : 0.08,
    pcBid: mainStat ? mainStat.monthlyAvePcBidAmt : 500,
    mobileBid: mainStat ? mainStat.monthlyAveMobileBidAmt : 400,
    competitionLevel: mainStat?.compIdx || '중',
    relKeywords,
    blogCount,
    cafeCount,
    trends: trends5y.length > 0 ? trends5y : getMockTrendData(start5y, endDate, 'month'),
    monthlyTrends,
    genderRatio: getMockGenderRatio(keyword),
    ageGroup: getMockAgeGroup(keyword),
  }
}

function parseSearchCount(val: number | string): number {
  if (typeof val === 'number') return val
  if (val === '< 10') return 5
  return parseInt(String(val).replace(/,/g, '')) || 0
}

function generateMonthlyTrends(
  trends: TrendData[],
  pcSearch: number,
  mobileSearch: number
): { month: string; pc: number; mobile: number }[] {
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
    const trendItem = trends.find(t => t.period.startsWith(label.replace('.', '-')))
    const ratio = trendItem ? trendItem.ratio / 100 : (0.7 + Math.random() * 0.3)
    months.push({
      month: `${d.getMonth() + 1}월`,
      pc: Math.round(pcSearch * ratio),
      mobile: Math.round(mobileSearch * ratio),
    })
  }
  return months
}

// ──────────────────────────────────────────────
// 모의(Mock) 데이터 — API 키 없을 때 데모용
// ──────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff
  return Math.abs(h)
}

function getMockPcSearch(keyword: string): number {
  const h = hashStr(keyword)
  const ranges = [300, 500, 800, 1500, 3000, 5000, 8000, 12000, 20000, 40000, 80000, 150000]
  return ranges[h % ranges.length]
}

function getMockMobileSearch(keyword: string): number {
  return Math.round(getMockPcSearch(keyword) * (1.5 + (hashStr(keyword + 'm') % 20) / 10))
}

function getMockBlogCount(keyword: string): number {
  const pc = getMockPcSearch(keyword)
  const ratio = 0.3 + (hashStr(keyword + 'b') % 30) / 10
  return Math.round(pc * ratio)
}

export function getMockKeywordStats(keywords: string[]): KeywordStat[] {
  return keywords.map(k => ({
    relKeyword: k,
    monthlyPcQcCnt: getMockPcSearch(k),
    monthlyMobileQcCnt: getMockMobileSearch(k),
    monthlyAvePcClkCnt: Math.round(getMockPcSearch(k) * 0.05),
    monthlyAveMobileClkCnt: Math.round(getMockMobileSearch(k) * 0.07),
    monthlyAvePcCtr: 0.05 + (hashStr(k) % 10) / 100,
    monthlyAveMobileCtr: 0.07 + (hashStr(k + 'ctr') % 10) / 100,
    plAvgDepth: 3 + (hashStr(k) % 5),
    compIdx: ['낮음', '중간', '높음'][hashStr(k) % 3],
    monthlyAvePcBidAmt: 200 + (hashStr(k) % 1800),
    monthlyAveMobileBidAmt: 150 + (hashStr(k) % 1500),
    isRestricted: false,
  }))
}

function getMockTrendData(start: string, end: string, unit: string): TrendData[] {
  const result: TrendData[] = []
  const startD = new Date(start)
  const endD = new Date(end)
  const cur = new Date(startD)

  while (cur <= endD) {
    const period = cur.toISOString().slice(0, 7)
    const month = cur.getMonth()
    const seasonal = 50 + 30 * Math.sin((month / 12) * 2 * Math.PI - 1) + Math.random() * 15
    result.push({ period, ratio: Math.min(100, Math.max(5, Math.round(seasonal))) })
    if (unit === 'month') cur.setMonth(cur.getMonth() + 1)
    else if (unit === 'week') cur.setDate(cur.getDate() + 7)
    else cur.setDate(cur.getDate() + 1)
  }
  return result
}

function getMockGenderRatio(keyword: string): { male: number; female: number } {
  const h = hashStr(keyword + 'gender')
  const male = 30 + (h % 40)
  return { male, female: 100 - male }
}

function getMockAgeGroup(keyword: string): { [key: string]: number } {
  const h = hashStr(keyword + 'age')
  const raw = [h % 15 + 5, h % 25 + 15, h % 30 + 20, h % 25 + 15, h % 20 + 10, h % 15 + 5]
  const sum = raw.reduce((a, b) => a + b, 0)
  return {
    '10대': Math.round(raw[0] / sum * 100),
    '20대': Math.round(raw[1] / sum * 100),
    '30대': Math.round(raw[2] / sum * 100),
    '40대': Math.round(raw[3] / sum * 100),
    '50대': Math.round(raw[4] / sum * 100),
    '60대+': Math.round(raw[5] / sum * 100),
  }
}

// 연관 키워드 확장 (시드 기반 자동완성 실패 시 폴백)
export function getMockRelatedKeywords(seed: string): string[] {
  const suffixes = ['방법', '추천', '후기', '가격', '비교', '종류', '효과', '부작용', '사용법', '구매']
  const prefixes = ['최신', '인기', '저렴한', '좋은', '국산', '수입', '프리미엄', '초보자용']
  const related: string[] = []

  for (const s of suffixes) related.push(`${seed} ${s}`)
  for (const p of prefixes) related.push(`${p} ${seed}`)
  related.push(`${seed}란`, `${seed}이란`, `${seed} 뜻`, `${seed} 의미`)

  return related
}

// 급상승 키워드 Mock (쇼핑 인사이트 실패 시 폴백)
export function getMockTrendingKeywords(): { keyword: string; change: number; category: string }[] {
  return [
    { keyword: '한강 피크닉', change: 320, category: '여행/레저' },
    { keyword: '에어컨 청소', change: 180, category: '생활/건강' },
    { keyword: '여름 원피스', change: 250, category: '패션의류' },
    { keyword: '냉면 맛집', change: 140, category: '식품' },
    { keyword: '자외선 차단제', change: 210, category: '화장품/미용' },
    { keyword: '캠핑 의자', change: 175, category: '스포츠/레저' },
    { keyword: '수박 화채', change: 430, category: '식품' },
    { keyword: '해수욕장', change: 380, category: '여가/생활편의' },
    { keyword: '선풍기 추천', change: 290, category: '디지털/가전' },
    { keyword: '아이스크림 케이크', change: 160, category: '식품' },
    { keyword: '수영복 추천', change: 340, category: '패션의류' },
    { keyword: '물놀이용품', change: 270, category: '스포츠/레저' },
    { keyword: '여름 방학', change: 190, category: '도서' },
    { keyword: '냉각 패치', change: 150, category: '생활/건강' },
    { keyword: '썬크림', change: 220, category: '화장품/미용' },
  ]
}

export function getMockSeasonKeywords(): { keyword: string; months: number[]; peak: number }[] {
  return [
    { keyword: '벚꽃 명소', months: [3, 4], peak: 4 },
    { keyword: '단풍 여행', months: [10, 11], peak: 10 },
    { keyword: '크리스마스 선물', months: [11, 12], peak: 12 },
    { keyword: '설날 선물', months: [12, 1, 2], peak: 1 },
    { keyword: '여름 휴가', months: [6, 7, 8], peak: 7 },
    { keyword: '겨울 코트', months: [10, 11, 12], peak: 11 },
    { keyword: '수능 후기', months: [11, 12], peak: 11 },
    { keyword: '입학 선물', months: [2, 3], peak: 3 },
    { keyword: '김장 배추', months: [10, 11], peak: 11 },
    { keyword: '봄 나들이', months: [3, 4, 5], peak: 4 },
  ]
}
