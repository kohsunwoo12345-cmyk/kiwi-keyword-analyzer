'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { GradeChip } from '@/components/ui/GradeChip'
import { Hash, Loader2, Search, ArrowRight, Monitor, Smartphone, TrendingUp } from 'lucide-react'
import { formatNumberFull, calcKeywordGrade, calcSaturation } from '@/lib/utils'
import { getMockKeywordStats } from '@/lib/naver-api'

interface QuickResult {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number
  grade: string
  satLabel: string
  satColor: string
}

const PRESET_KEYWORDS = [
  '다이어트', '재테크', '노트북 추천', '강아지', '헤어스타일',
  '주식 투자', '부업', '인테리어', '요리', '영어 공부',
  '헬스', '캠핑', '드라마', '게임 추천', '자동차'
]

export default function QuickSearchPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [results, setResults] = useState<QuickResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchKeyword = async (kw: string) => {
    if (!kw.trim()) return
    if (results.find(r => r.keyword === kw)) return
    setLoading(true)

    await new Promise(r => setTimeout(r, 300))
    const stats = getMockKeywordStats([kw])[0]
    const pc = stats.monthlyPcQcCnt
    const mobile = stats.monthlyMobileQcCnt
    const total = pc + mobile
    const blog = Math.round(total * (0.15 + Math.random() * 0.4))
    const sat = calcSaturation(total, blog)
    const grade = calcKeywordGrade(total, blog)

    setResults(prev => [{
      keyword: kw,
      pcSearch: pc,
      mobileSearch: mobile,
      totalSearch: total,
      blogCount: blog,
      grade: grade.grade,
      satLabel: sat.label,
      satColor: sat.color,
    }, ...prev.slice(0, 19)])

    setInput('')
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchKeyword(input.trim())
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Hash className="w-7 h-7 text-teal-500" />
          간편 키워드 조회
        </h1>
        <p className="text-gray-500 text-sm mt-1">키워드를 입력하면 즉시 검색량 결과를 보여줍니다. 여러 개 연속으로 조회하세요.</p>
      </div>

      {/* 검색 입력 */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Hash className="absolute left-4 top-3 w-5 h-5 text-teal-400" />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="키워드 입력 후 Enter (예: 다이어트)"
            autoFocus
            className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          조회
        </button>
      </form>

      {/* 빠른 예시 */}
      <div className="flex flex-wrap gap-2 mb-8">
        {PRESET_KEYWORDS.map(kw => (
          <button
            key={kw}
            onClick={() => searchKeyword(kw)}
            className="text-xs text-gray-600 bg-gray-100 hover:bg-teal-100 hover:text-teal-700 px-3 py-1.5 rounded-full transition-colors"
          >
            {kw}
          </button>
        ))}
      </div>

      {/* 결과 카드들 */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">최근 조회 ({results.length}개)</h2>
            <button onClick={() => setResults([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">모두 지우기</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((r, i) => (
              <Card key={r.keyword} hover className={i === 0 ? 'border-teal-300 shadow-md' : ''}>
                <CardBody className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GradeChip grade={r.grade} size="sm" />
                      <span className="font-bold text-gray-900">{r.keyword}</span>
                      {i === 0 && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">최신</span>}
                    </div>
                    <button
                      onClick={() => router.push(`/keyword?q=${encodeURIComponent(r.keyword)}`)}
                      className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1 border border-teal-200 hover:border-teal-400 px-2 py-1 rounded-lg transition-colors"
                    >
                      상세분석 <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-1">
                        <Monitor className="w-3 h-3" />PC
                      </div>
                      <div className="font-bold text-gray-800 text-sm">{formatNumberFull(r.pcSearch)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-1">
                        <Smartphone className="w-3 h-3" />모바일
                      </div>
                      <div className="font-bold text-gray-800 text-sm">{formatNumberFull(r.mobileSearch)}</div>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-teal-600 mb-1">
                        <TrendingUp className="w-3 h-3" />합계
                      </div>
                      <div className="font-bold text-teal-700 text-sm">{formatNumberFull(r.totalSearch)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 text-xs text-gray-500">
                    <span>블로그 발행량: <strong className="text-gray-700">{formatNumberFull(r.blogCount)}</strong></span>
                    <span className={r.satColor}>포화도: {r.satLabel}</span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Hash className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">키워드를 입력하면 즉시 검색량이 표시됩니다</p>
          <p className="text-xs mt-1 text-gray-300">여러 개를 연속으로 조회하면 비교하기 쉽습니다</p>
        </div>
      )}
    </div>
  )
}
