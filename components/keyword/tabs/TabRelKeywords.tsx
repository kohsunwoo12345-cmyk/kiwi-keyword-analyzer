'use client'
import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { GradeChip } from '@/components/ui/GradeChip'
import { formatNumberFull, calcKeywordGrade, calcSaturation } from '@/lib/utils'
import type { AnalysisData } from '../KeywordAnalysis'
import {
  Download, ChevronUp, ChevronDown, Search, Filter,
  FileSpreadsheet, BarChart2, TrendingUp, ArrowUpDown,
} from 'lucide-react'

interface Props {
  data: AnalysisData
  onKeywordClick: (kw: string) => void
}

type SortKey = 'totalSearch' | 'pcSearch' | 'mobileSearch' | 'blogCount' | 'saturationRatio'

const COMPETITION_COLOR: Record<string, string> = {
  '높음': 'text-red-600 bg-red-50',
  '보통': 'text-yellow-600 bg-yellow-50',
  '낮음': 'text-green-600 bg-green-50',
}

function SatBar({ ratio }: { ratio: number }) {
  const color = ratio < 30 ? 'bg-blue-400' : ratio < 60 ? 'bg-green-400' : ratio < 90 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(ratio, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 tabular-nums w-9 text-right">{ratio}%</span>
    </div>
  )
}

export function TabRelKeywords({ data, onKeywordClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('totalSearch')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState('')
  const [showAll, setShowAll] = useState(false)

  const PREVIEW = 20

  const sorted = [...data.relKeywords]
    .filter(r => r.keyword.includes(filter))
    .sort((a, b) => sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey])

  const visible = showAll ? sorted : sorted.slice(0, PREVIEW)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-gray-300 inline ml-0.5" />
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-green-600 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 text-green-600 inline ml-0.5" />
  }

  // CSV 다운로드
  const handleCsvDownload = () => {
    const rows = [
      ['키워드', 'PC검색량', '모바일검색량', '총검색량', '블로그발행량', '카페발행량', '포화지수', '경쟁도', '등급'],
      ...sorted.map(r => {
        const grade = calcKeywordGrade(r.totalSearch, r.blogCount + r.cafeCount)
        return [
          r.keyword, r.pcSearch, r.mobileSearch, r.totalSearch,
          r.blogCount, r.cafeCount, `${r.saturationRatio}%`, r.competitionLevel || '보통', grade.grade,
        ]
      }),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `연관키워드_${data.keyword}.csv`
    a.click()
  }

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    window.open(`/api/keyword/excel?q=${encodeURIComponent(data.keyword)}`, '_blank')
  }

  // 통계
  const avgSearch = Math.round(sorted.reduce((a, r) => a + r.totalSearch, 0) / (sorted.length || 1))
  const maxSearch = Math.max(...sorted.map(r => r.totalSearch), 0)
  const lowComp = sorted.filter(r => r.competitionLevel === '낮음').length

  return (
    <div className="space-y-5">

      {/* ── 요약 카드 3개 ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
          <div className="text-xl font-black text-blue-700">{sorted.length}개</div>
          <div className="text-xs text-blue-500 mt-0.5">연관 키워드</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <div className="text-xl font-black text-green-700">{formatNumberFull(avgSearch)}</div>
          <div className="text-xs text-green-500 mt-0.5">평균 검색량</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
          <div className="text-xl font-black text-purple-700">{lowComp}개</div>
          <div className="text-xs text-purple-500 mt-0.5">저경쟁 키워드</div>
        </div>
      </div>

      {/* ── 상단 컨트롤 ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="키워드 필터..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          />
        </div>
        <button
          onClick={handleCsvDownload}
          className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:border-green-400 text-gray-600 px-3 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
        <button
          onClick={handleExcelDownload}
          className="flex items-center gap-1.5 text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors shadow-sm font-medium"
        >
          <FileSpreadsheet className="w-4 h-4" />
          엑셀 전체 다운로드
        </button>
      </div>

      {/* ── 테이블 ── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-3 text-xs text-gray-400 font-medium w-8">#</th>
                <th className="text-left px-3 py-3 text-xs text-gray-400 font-medium">키워드</th>
                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium w-10">등급</th>
                <th
                  className="text-right px-3 py-3 text-xs text-gray-400 font-medium cursor-pointer hover:text-green-600 select-none"
                  onClick={() => handleSort('pcSearch')}
                >
                  PC <SortIcon k="pcSearch" />
                </th>
                <th
                  className="text-right px-3 py-3 text-xs text-gray-400 font-medium cursor-pointer hover:text-green-600 select-none"
                  onClick={() => handleSort('mobileSearch')}
                >
                  모바일 <SortIcon k="mobileSearch" />
                </th>
                <th
                  className="text-right px-3 py-3 text-xs text-gray-400 font-medium cursor-pointer hover:text-green-600 select-none"
                  onClick={() => handleSort('totalSearch')}
                >
                  총검색량 <SortIcon k="totalSearch" />
                </th>
                <th
                  className="text-right px-3 py-3 text-xs text-gray-400 font-medium cursor-pointer hover:text-green-600 select-none"
                  onClick={() => handleSort('blogCount')}
                >
                  블로그 <SortIcon k="blogCount" />
                </th>
                <th
                  className="px-3 py-3 text-xs text-gray-400 font-medium cursor-pointer hover:text-green-600 select-none text-center"
                  onClick={() => handleSort('saturationRatio')}
                >
                  포화도 <SortIcon k="saturationRatio" />
                </th>
                <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">경쟁도</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => {
                const grade = calcKeywordGrade(r.totalSearch, r.blogCount + r.cafeCount)
                const compColor = COMPETITION_COLOR[r.competitionLevel] || 'text-gray-500 bg-gray-50'
                const isTop = i === 0 && !filter
                return (
                  <tr
                    key={r.keyword}
                    className={`border-b border-gray-50 hover:bg-green-50/50 transition-colors ${isTop ? 'bg-green-50/30' : ''}`}
                  >
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => onKeywordClick(r.keyword)}
                        className="font-medium text-gray-800 hover:text-green-700 text-left flex items-center gap-1"
                      >
                        {r.keyword}
                        {isTop && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded font-bold">TOP</span>}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <GradeChip grade={grade.grade} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums text-xs">
                      {formatNumberFull(r.pcSearch)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums text-xs">
                      {formatNumberFull(r.mobileSearch)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900 tabular-nums text-xs">
                      {formatNumberFull(r.totalSearch)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums text-xs">
                      {formatNumberFull(r.blogCount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <SatBar ratio={r.saturationRatio} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${compColor}`}>
                        {r.competitionLevel || '보통'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 더보기 / 접기 */}
        {sorted.length > PREVIEW && (
          <div className="p-4 border-t border-gray-50 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1 mx-auto"
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4" />접기</>
              ) : (
                <><ChevronDown className="w-4 h-4" />나머지 {sorted.length - PREVIEW}개 더보기</>
              )}
            </button>
          </div>
        )}
      </Card>

      {/* ── 주제 클러스터 ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-500" />
              주제 클러스터
            </CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                title: `${data.keyword} 정보성`,
                keywords: sorted.slice(0, 5).map(r => r.keyword),
                color: 'border-blue-200 bg-blue-50',
                titleColor: 'text-blue-800',
                dot: 'bg-blue-400',
              },
              {
                title: `${data.keyword} 상업성`,
                keywords: sorted.slice(5, 10).map(r => r.keyword),
                color: 'border-green-200 bg-green-50',
                titleColor: 'text-green-800',
                dot: 'bg-green-400',
              },
              {
                title: `${data.keyword} 후기/리뷰`,
                keywords: sorted.slice(10, 15).map(r => r.keyword),
                color: 'border-purple-200 bg-purple-50',
                titleColor: 'text-purple-800',
                dot: 'bg-purple-400',
              },
            ].map(cluster => (
              <div key={cluster.title} className={`border rounded-xl p-4 ${cluster.color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${cluster.dot}`} />
                  <h4 className={`font-bold text-sm ${cluster.titleColor}`}>{cluster.title}</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cluster.keywords.map(kw => (
                    <button
                      key={kw}
                      onClick={() => onKeywordClick(kw)}
                      className="text-xs bg-white border border-gray-200 hover:border-green-400 hover:text-green-700 px-2.5 py-1 rounded-lg transition-colors shadow-sm"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

    </div>
  )
}
