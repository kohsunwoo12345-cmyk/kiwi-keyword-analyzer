'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  TrendingUp,
  Calendar,
  ArrowRight,
  Flame,
  Snowflake,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
} from 'lucide-react'
import { NAVER_SHOPPING_CATEGORIES, getMockSeasonKeywords } from '@/lib/naver-api'

// 타입 정의
interface TrendingKeyword {
  rank: number
  keyword: string
  category: string
  categoryIcon: string
  cid: number
}

interface CategoryTrend {
  category: { cid: number; name: string; icon: string }
  keywords: TrendingKeyword[]
  dateRange: string
}

interface TrendsApiResponse {
  ok: boolean
  type: string
  dateRange: string
  updatedAt: string
  data?: CategoryTrend[]
  keywords?: TrendingKeyword[]
  cid?: number
  category?: { cid: number; name: string; icon: string }
  count?: number
  isRealData?: boolean
}

// 시즌 키워드는 실제 계절에 맞게 정적으로 구성
const SEASON = getMockSeasonKeywords()
const CURRENT_MONTH = new Date().getMonth() + 1

// 계절 아이콘 함수
function getSeasonIcon(months: number[]): string {
  const spring = [3, 4, 5]
  const summer = [6, 7, 8]
  const fall = [9, 10, 11]
  const winter = [12, 1, 2]
  const overlap = (a: number[], b: number[]) => a.some(m => b.includes(m))
  if (overlap(months, summer)) return '☀️'
  if (overlap(months, spring)) return '🌸'
  if (overlap(months, fall)) return '🍂'
  if (overlap(months, winter)) return '❄️'
  return '📅'
}

export default function TrendsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'rising' | 'season' | 'category'>('rising')

  // 실시간 트렌드 상태
  const [allTrends, setAllTrends] = useState<CategoryTrend[]>([])
  const [singleTrend, setSingleTrend] = useState<TrendingKeyword[]>([])
  const [selectedCid, setSelectedCid] = useState<number>(50000000) // 패션의류
  const [dateRange, setDateRange] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRealData, setIsRealData] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  // 전체 카테고리 트렌드 조회
  const fetchAllTrends = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/trends?type=all&count=10')
      const json: TrendsApiResponse = await res.json()
      if (json.ok && json.data && json.data.length > 0) {
        setAllTrends(json.data)
        setDateRange(json.dateRange || '')
        setIsRealData(true)
        setLastUpdated(new Date(json.updatedAt).toLocaleTimeString('ko-KR'))
      } else {
        setError('데이터를 불러오는 데 실패했습니다')
      }
    } catch (e) {
      console.error(e)
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  // 단일 카테고리 트렌드 조회
  const fetchSingleTrend = useCallback(async (cid: number, count = 20) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/trends?cid=${cid}&count=${count}`)
      const json: TrendsApiResponse = await res.json()
      if (json.ok && json.keywords) {
        setSingleTrend(json.keywords)
        setDateRange(json.dateRange || '')
        setIsRealData(json.isRealData ?? false)
        setLastUpdated(new Date(json.updatedAt || Date.now()).toLocaleTimeString('ko-KR'))
      } else {
        setError('데이터를 불러오는 데 실패했습니다')
      }
    } catch (e) {
      console.error(e)
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    if (activeTab === 'rising') {
      fetchSingleTrend(selectedCid, 20)
    } else if (activeTab === 'category') {
      fetchAllTrends()
    }
  }, [activeTab, selectedCid, fetchSingleTrend, fetchAllTrends])

  // 시즌 키워드
  const currentSeasonKeywords = SEASON.filter(s => s.months.includes(CURRENT_MONTH))
  const upcomingSeasonKeywords = SEASON.filter(s => {
    const next = CURRENT_MONTH % 12 + 1
    return !s.months.includes(CURRENT_MONTH) && (s.months.includes(next) || s.months.includes((next % 12) + 1))
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-red-500" />
            트렌드
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            네이버 쇼핑 인사이트 실시간 트렌드 키워드
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRealData ? (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              실제 데이터
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              데이터 로딩 중
            </div>
          )}
          {dateRange && (
            <Badge variant="secondary" className="text-xs">{dateRange}</Badge>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveTab('rising')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'rising' ? 'bg-red-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'
          }`}
        >
          <Flame className="w-4 h-4" />
          급상승 TOP20
        </button>
        <button
          onClick={() => setActiveTab('category')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'category' ? 'bg-blue-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          카테고리별 트렌드
        </button>
        <button
          onClick={() => setActiveTab('season')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'season' ? 'bg-orange-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          시즌 키워드
        </button>
      </div>

      {/* ── 급상승 TOP20 탭 ── */}
      {activeTab === 'rising' && (
        <div className="space-y-5">
          {/* 카테고리 선택 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">카테고리 선택</span>
              <button
                onClick={() => fetchSingleTrend(selectedCid, 20)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {NAVER_SHOPPING_CATEGORIES.map(cat => (
                <button
                  key={cat.cid}
                  onClick={() => setSelectedCid(cat.cid)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    selectedCid === cat.cid
                      ? 'border-red-500 bg-red-50 text-red-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 로딩/에러 상태 */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-red-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">네이버 쇼핑 인사이트에서 실시간 데이터를 가져오는 중...</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium text-sm">{error}</p>
                <button
                  onClick={() => fetchSingleTrend(selectedCid, 20)}
                  className="text-red-600 text-xs underline mt-1"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {!loading && !error && singleTrend.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 키워드 랭킹 리스트 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-red-500" />
                      {NAVER_SHOPPING_CATEGORIES.find(c => c.cid === selectedCid)?.icon}{' '}
                      {NAVER_SHOPPING_CATEGORIES.find(c => c.cid === selectedCid)?.name} TOP{singleTrend.length}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      실시간 · {lastUpdated}
                    </div>
                  </div>
                  {dateRange && (
                    <p className="text-xs text-gray-400 mt-1">기준 기간: {dateRange}</p>
                  )}
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                    {singleTrend.map((item) => (
                      <div
                        key={item.keyword}
                        onClick={() => router.push(`/keyword?q=${encodeURIComponent(item.keyword)}`)}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-red-50 cursor-pointer group transition-colors"
                      >
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black flex-shrink-0 ${
                          item.rank <= 3
                            ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-sm'
                            : item.rank <= 10
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-gray-900 group-hover:text-red-700 block truncate">
                            {item.keyword}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.rank <= 3 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">HOT</span>
                          )}
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              {/* 순위 시각화 */}
              <Card>
                <CardHeader>
                  <CardTitle>순위 시각화</CardTitle>
                </CardHeader>
                <CardBody className="space-y-2.5 max-h-[600px] overflow-y-auto">
                  {singleTrend.slice(0, 20).map((item) => {
                    const barWidth = Math.max(5, Math.round(((21 - item.rank) / 20) * 100))
                    return (
                      <div key={item.keyword}>
                        <div className="flex justify-between text-xs mb-1">
                          <span
                            className="text-gray-700 font-medium cursor-pointer hover:text-red-600 truncate max-w-[160px]"
                            onClick={() => router.push(`/keyword?q=${encodeURIComponent(item.keyword)}`)}
                          >
                            {item.rank}. {item.keyword}
                          </span>
                          <span className="text-gray-400 ml-2">#{item.rank}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.rank <= 3
                                ? 'bg-gradient-to-r from-red-500 to-orange-400'
                                : item.rank <= 10
                                ? 'bg-gradient-to-r from-orange-400 to-yellow-400'
                                : 'bg-gradient-to-r from-blue-300 to-blue-400'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardBody>
              </Card>
            </div>
          )}

          {/* 데이터 출처 */}
          {isRealData && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              출처: 네이버 쇼핑 인사이트 (datalab.naver.com) · 실제 검색량 기반 순위
            </div>
          )}
        </div>
      )}

      {/* ── 카테고리별 트렌드 탭 ── */}
      {activeTab === 'category' && (
        <div className="space-y-5">
          {/* 새로고침 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={fetchAllTrends}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg hover:border-blue-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              전체 새로고침
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">모든 카테고리 트렌드를 가져오는 중...</p>
                <p className="text-gray-400 text-xs mt-1">네이버 쇼핑 인사이트 병렬 조회 중</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && allTrends.length > 0 && (
            <>
              {/* 데이터 요약 헤더 */}
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div>
                  <span className="text-green-700 font-medium text-sm">
                    네이버 쇼핑 인사이트 실시간 데이터 · {allTrends.length}개 카테고리
                  </span>
                  {dateRange && (
                    <span className="text-green-600 text-xs ml-2">({dateRange} 기준)</span>
                  )}
                </div>
              </div>

              {/* 카테고리 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {allTrends.map(({ category, keywords }) => (
                  <Card key={category.cid} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="text-xl">{category.icon}</span>
                          {category.name}
                        </CardTitle>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          실시간
                        </span>
                      </div>
                    </CardHeader>
                    <CardBody className="p-0">
                      <div className="divide-y divide-gray-50">
                        {keywords.slice(0, 10).map((item) => (
                          <div
                            key={item.keyword}
                            onClick={() => router.push(`/keyword?q=${encodeURIComponent(item.keyword)}`)}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer group"
                          >
                            <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold flex-shrink-0 ${
                              item.rank <= 3
                                ? 'bg-red-500 text-white'
                                : 'text-gray-400'
                            }`}>
                              {item.rank}
                            </span>
                            <span className="flex-1 text-sm text-gray-800 group-hover:text-blue-600 font-medium truncate">
                              {item.keyword}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                      {/* 더보기 */}
                      <div className="px-4 py-2 border-t border-gray-50">
                        <button
                          onClick={() => {
                            setSelectedCid(category.cid)
                            setActiveTab('rising')
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          {category.name} 전체 보기 →
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 시즌 키워드 탭 ── */}
      {activeTab === 'season' && (
        <div className="space-y-6">
          {/* 이번 달 */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              이번 달 ({CURRENT_MONTH}월) 시즌 키워드
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {currentSeasonKeywords.length > 0 ? currentSeasonKeywords.map(item => (
                <div
                  key={item.keyword}
                  onClick={() => router.push(`/keyword?q=${encodeURIComponent(item.keyword)}`)}
                  className="border border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 group-hover:text-orange-700">
                      {getSeasonIcon(item.months)} {item.keyword}
                    </span>
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded font-bold">HOT</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {item.months.map(m => (
                      <span
                        key={m}
                        className={`text-xs px-2 py-0.5 rounded ${
                          m === CURRENT_MONTH ? 'bg-orange-400 text-white font-bold' : 'bg-orange-100 text-orange-600'
                        }`}
                      >
                        {m}월
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    최고점 {item.peak}월
                  </div>
                </div>
              )) : (
                <div className="col-span-3 text-center py-8 text-gray-400">
                  이번 달({CURRENT_MONTH}월) 시즌 키워드가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 다음 달 준비 */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-blue-500" />
              미리 준비하세요 ({CURRENT_MONTH % 12 + 1}월 이후)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {upcomingSeasonKeywords.length > 0 ? upcomingSeasonKeywords.map(item => (
                <div
                  key={item.keyword}
                  onClick={() => router.push(`/keyword?q=${encodeURIComponent(item.keyword)}`)}
                  className="border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 group-hover:text-blue-700">
                      {getSeasonIcon(item.months)} {item.keyword}
                    </span>
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-bold">SOON</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {item.months.map(m => (
                      <span key={m} className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-600">
                        {m}월
                      </span>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="col-span-3 text-center py-8 text-gray-400">준비 키워드가 없습니다</div>
              )}
            </div>
          </div>

          {/* 연간 캘린더 */}
          <Card>
            <CardHeader>
              <CardTitle>연간 시즌 키워드 캘린더</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const hasKeywords = SEASON.some(s => s.months.includes(month))
                  const isCurrent = month === CURRENT_MONTH
                  const monthKeywords = SEASON.filter(s => s.months.includes(month))
                  return (
                    <div
                      key={month}
                      title={monthKeywords.map(k => k.keyword).join(', ')}
                      className={`rounded-xl p-2 text-center transition-all cursor-default ${
                        isCurrent
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-sm'
                          : hasKeywords
                          ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 hover:from-blue-200 hover:to-indigo-200'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <div className="text-xs font-bold">{month}월</div>
                      {hasKeywords && (
                        <div className="text-[10px] mt-0.5 opacity-70">{monthKeywords.length}개</div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                파란색: 시즌 키워드 있음 · 초록색: 현재 월
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
