'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SearchBar } from '@/components/ui/SearchBar'
import { GradeChip } from '@/components/ui/GradeChip'
import { Badge } from '@/components/ui/Badge'
import { TabBasicInfo } from './tabs/TabBasicInfo'
import { TabRelKeywords } from './tabs/TabRelKeywords'
import { TabTrend } from './tabs/TabTrend'
import { TabSection } from './tabs/TabSection'
import { TabPersonality } from './tabs/TabPersonality'
import {
  Search, Info, TrendingUp, Layers, User, Loader2, AlertCircle,
  Monitor, Smartphone, FileText, Coffee, Download, RefreshCw,
  Globe, BarChart2, ChevronUp, ChevronDown,
} from 'lucide-react'
import { formatNumberFull } from '@/lib/utils'

const TABS = [
  { id: 'basic', label: '기본정보', icon: Info },
  { id: 'related', label: '연관키워드', icon: Search },
  { id: 'trend', label: '트렌드분석', icon: TrendingUp },
  { id: 'section', label: '섹션분석', icon: Layers },
  { id: 'personality', label: '성향분석', icon: User },
]

export interface GoogleData {
  totalResults: string
  totalResultsNum: number
  topResults: { title: string; link: string; description: string }[]
}

export interface AnalysisData {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number
  cafeCount: number
  newsCount: number
  saturation: { label: string; color: string; level: number }
  grade: { grade: string; color: string; bg: string }
  relKeywords: RelKw[]
  trends: { period: string; ratio: number }[]
  monthlyTrends: { month: string; pc: number; mobile: number }[]
  monthlyRatio: { month: string; pc: number; mobile: number; ratio: number }[]
  weekdayTrends: { day: string; ratio: number }[]
  genderRatio: { male: number; female: number }
  ageGroup: { [key: string]: number }
  deviceRatio: { pc: number; mobile: number }
  sections: NavSection[]
  issueIndex: number
  estimatedSearch: number
  firstAppearDate: string
  pcBid: number
  mobileBid: number
  pcCtr: number
  mobileCtr: number
  competitionLevel: string
  google: GoogleData
}

interface RelKw {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number
  cafeCount: number
  saturationRatio: number
  competitionLevel: string
}

interface NavSection {
  name: string
  icon: string
  platform: string
  count?: number
  items?: string[]
}

// ── 상단 KPI 카드 ─────────────────────────────────────────
function KpiCard({
  label, value, subLabel, subValue, icon, trend, color = 'blue',
}: {
  label: string
  value: string | number
  subLabel?: string
  subValue?: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal'
}) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-700' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', text: 'text-green-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-700' },
    pink:   { bg: 'bg-pink-50',   icon: 'bg-pink-100 text-pink-600',   text: 'text-pink-700' },
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-600',   text: 'text-teal-700' },
  }
  const c = colorMap[color]
  return (
    <div className={`${c.bg} rounded-2xl p-4 border border-white shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center text-xs font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {trend === 'up' ? <ChevronUp className="w-3 h-3" /> : trend === 'down' ? <ChevronDown className="w-3 h-3" /> : '—'}
          </span>
        )}
      </div>
      <div className={`text-2xl font-black ${c.text} leading-none mb-1`}>
        {typeof value === 'number' ? formatNumberFull(value) : value}
      </div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      {subLabel && subValue !== undefined && (
        <div className="mt-2 pt-2 border-t border-white/60 flex justify-between text-[11px]">
          <span className="text-gray-400">{subLabel}</span>
          <span className="font-semibold text-gray-600">
            {typeof subValue === 'number' ? formatNumberFull(subValue) : subValue}
          </span>
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export function KeywordAnalysis({ initialKeyword }: { initialKeyword?: string }) {
  const router = useRouter()
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [currentKeyword, setCurrentKeyword] = useState(initialKeyword || '')
  const [analysisTime, setAnalysisTime] = useState(0)

  const analyze = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return
    setLoading(true)
    setError(null)
    setCurrentKeyword(keyword)
    const t0 = Date.now()
    router.push(`/keyword?q=${encodeURIComponent(keyword)}`, { scroll: false })

    try {
      const res = await fetch(`/api/keyword?q=${encodeURIComponent(keyword)}`)
      if (!res.ok) throw new Error('분석 실패')
      const json = await res.json()
      setData(json)
      setActiveTab('basic')
      setAnalysisTime(((Date.now() - t0) / 1000).toFixed(1) as any)
    } catch (e) {
      setError('키워드 분석 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (initialKeyword) analyze(initialKeyword)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExcelDownload = () => {
    if (!data) return
    window.open(`/api/keyword/excel?q=${encodeURIComponent(data.keyword)}`, '_blank')
  }

  const pcRatio = data ? Math.round((data.pcSearch / (data.totalSearch || 1)) * 100) : 0
  const mobileRatio = data ? Math.round((data.mobileSearch / (data.totalSearch || 1)) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 검색바 */}
      <div className="mb-6">
        <SearchBar
          onSearch={analyze}
          defaultValue={currentKeyword}
          placeholder="키워드를 입력하고 분석하세요 (예: 마케팅, 다이어트, 재테크)"
          size="lg"
          className="max-w-3xl"
        />
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-green-100 border-t-green-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-gray-600 font-medium">
            <span className="text-green-600 font-bold">{currentKeyword}</span> 분석 중...
          </p>
          <p className="text-xs text-gray-400">네이버 · 구글 실시간 데이터 수집 중</p>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 max-w-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => analyze(currentKeyword)} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && !data && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Search className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">키워드 인사이트</h2>
          <p className="text-gray-500 mb-2">검색량 · 트렌드 · 연관 키워드 · 성향 분석을 제공합니다</p>
          <p className="text-xs text-gray-400 mb-8">네이버 검색광고 API + 구글 검색 결과 기반 실시간 분석</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['마케팅', '다이어트', '재테크', '인테리어', '노트북 추천', '강아지'].map(kw => (
              <button
                key={kw}
                onClick={() => analyze(kw)}
                className="text-sm bg-white hover:bg-green-50 hover:text-green-700 border border-gray-200 hover:border-green-300 text-gray-600 px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 분석 결과 */}
      {!loading && data && (
        <div className="space-y-6">

          {/* ── 키워드 헤더 바 ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-start gap-4">
              {/* 키워드 + 등급 */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GradeChip grade={data.grade.grade} size="xl" />
                <div className="min-w-0">
                  <h1 className="text-2xl font-black text-gray-900">{data.keyword}</h1>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                      data.issueIndex > 10 ? 'bg-red-100 text-red-700' :
                      data.issueIndex > 3 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {data.issueIndex > 10 ? '🔥 고이슈' : data.issueIndex > 3 ? '📊 보통이슈' : '✅ 안정키워드'}
                    </span>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                      data.competitionLevel === '높음' ? 'bg-red-100 text-red-700' :
                      data.competitionLevel === '낮음' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      경쟁 {data.competitionLevel}
                    </span>
                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {data.saturation.label} 포화
                    </span>
                  </div>
                </div>
              </div>

              {/* 오른쪽 버튼 그룹 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">분석 {analysisTime}초</span>
                <button
                  onClick={() => analyze(data.keyword)}
                  className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  재분석
                </button>
                <button
                  onClick={handleExcelDownload}
                  className="flex items-center gap-1.5 text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors shadow-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  엑셀 다운로드
                </button>
              </div>
            </div>

            {/* ── KPI 카드 그리드 ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
              <KpiCard
                label="PC 검색량"
                value={data.pcSearch}
                subLabel="비율"
                subValue={`${pcRatio}%`}
                icon={<Monitor className="w-4 h-4" />}
                color="blue"
              />
              <KpiCard
                label="모바일 검색량"
                value={data.mobileSearch}
                subLabel="비율"
                subValue={`${mobileRatio}%`}
                icon={<Smartphone className="w-4 h-4" />}
                color="green"
              />
              <KpiCard
                label="총 검색량"
                value={data.totalSearch}
                subLabel="예상(당월)"
                subValue={data.estimatedSearch}
                icon={<BarChart2 className="w-4 h-4" />}
                color="teal"
              />
              <KpiCard
                label="블로그 발행량"
                value={data.blogCount}
                subLabel="카페"
                subValue={data.cafeCount}
                icon={<FileText className="w-4 h-4" />}
                color="purple"
              />
              <KpiCard
                label="구글 검색 결과"
                value={data.google?.totalResults || '-'}
                subLabel="뉴스"
                subValue={data.newsCount}
                icon={<Globe className="w-4 h-4" />}
                color="orange"
              />
              <KpiCard
                label="PC CPC"
                value={data.pcBid ? `₩${formatNumberFull(data.pcBid)}` : '데이터 없음'}
                subLabel="모바일 CPC"
                subValue={data.mobileBid ? `₩${formatNumberFull(data.mobileBid)}` : '-'}
                icon={<Coffee className="w-4 h-4" />}
                color="pink"
              />
            </div>

            {/* ── PC/모바일 비율 바 ── */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-gray-500 w-8">PC</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-400 transition-all duration-700" style={{ width: `${pcRatio}%` }} />
                <div className="h-full bg-green-400 transition-all duration-700" style={{ width: `${mobileRatio}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-16 text-right">모바일</span>
              <span className="text-xs font-bold text-blue-600">{pcRatio}%</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs font-bold text-green-600">{mobileRatio}%</span>
            </div>
          </div>

          {/* ── 탭 ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100">
              <div className="flex overflow-x-auto">
                {TABS.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                        activeTab === tab.id
                          ? 'border-green-500 text-green-700 bg-green-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="p-6">
              {activeTab === 'basic' && <TabBasicInfo data={data} onKeywordClick={analyze} />}
              {activeTab === 'related' && <TabRelKeywords data={data} onKeywordClick={analyze} />}
              {activeTab === 'trend' && <TabTrend data={data} />}
              {activeTab === 'section' && <TabSection data={data} />}
              {activeTab === 'personality' && <TabPersonality data={data} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
