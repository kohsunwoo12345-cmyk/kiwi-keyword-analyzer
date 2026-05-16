'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { GradeChip } from '@/components/ui/GradeChip'
import { Badge } from '@/components/ui/Badge'
import { AlignJustify, Loader2, Download, Search, X, ArrowRight, AlertCircle } from 'lucide-react'
import { formatNumberFull, calcKeywordGrade, calcSaturation } from '@/lib/utils'
import { getMockKeywordStats } from '@/lib/naver-api'

const MAX_FREE = 20
const MAX_PRO = 50

interface BulkResult {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number
  cafeCount: number
  saturation: string
  satColor: string
  grade: string
  gradeColor: string
}

export default function BulkAnalysisPage() {
  const router = useRouter()
  const [inputText, setInputText] = useState('')
  const [results, setResults] = useState<BulkResult[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const keywords = inputText
    .split(/[\n,，、\s]+/)
    .map(k => k.trim())
    .filter(k => k.length > 0)
    .slice(0, MAX_PRO)

  const handleAnalyze = async () => {
    if (keywords.length === 0) return
    setLoading(true)
    setResults([])
    setProgress(0)

    const targets = keywords.slice(0, MAX_FREE)
    const batchResults: BulkResult[] = []

    for (let i = 0; i < targets.length; i++) {
      const kw = targets[i]
      await new Promise(r => setTimeout(r, 80))
      const stats = getMockKeywordStats([kw])[0]
      const pc = stats.monthlyPcQcCnt
      const mobile = stats.monthlyMobileQcCnt
      const total = pc + mobile
      const blog = Math.round(total * (0.15 + Math.random() * 0.5))
      const cafe = Math.round(blog * 0.2)
      const sat = calcSaturation(total, blog + cafe)
      const grade = calcKeywordGrade(total, blog + cafe)
      batchResults.push({
        keyword: kw,
        pcSearch: pc,
        mobileSearch: mobile,
        totalSearch: total,
        blogCount: blog,
        cafeCount: cafe,
        saturation: sat.label,
        satColor: sat.color,
        grade: grade.grade,
        gradeColor: grade.color,
      })
      setProgress(Math.round(((i + 1) / targets.length) * 100))
    }

    setResults(batchResults)
    setLoading(false)
  }

  const handleCsvDownload = () => {
    const rows = [
      ['키워드', 'PC검색량', '모바일검색량', '총검색량', '블로그발행량', '카페발행량', '포화도', '등급'],
      ...results.map(r => [r.keyword, r.pcSearch, r.mobileSearch, r.totalSearch, r.blogCount, r.cafeCount, r.saturation, r.grade])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `대량키워드분석_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const clearAll = () => {
    setInputText('')
    setResults([])
    setProgress(0)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <AlignJustify className="w-7 h-7 text-orange-500" />
          대량 키워드 분석
        </h1>
        <p className="text-gray-500 text-sm mt-1">최대 {MAX_FREE}개(무료) / {MAX_PRO}개(멤버십) 키워드를 동시에 분석합니다</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 입력 영역 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>키워드 입력</CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${keywords.length > MAX_FREE ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {keywords.length} / {MAX_FREE}
                  </span>
                  {inputText && (
                    <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                      <X className="w-3 h-3" />초기화
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`키워드를 한 줄에 하나씩 입력하세요\n예:\n다이어트\n재테크\n노트북 추천\n...`}
                rows={14}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />

              {keywords.length > MAX_FREE && (
                <div className="flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>무료 버전은 최대 {MAX_FREE}개까지 분석합니다. 멤버십으로 {MAX_PRO}개까지 가능합니다.</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || keywords.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {loading ? `분석 중... ${progress}%` : '일괄 분석 시작'}
                </button>
                {results.length > 0 && (
                  <button
                    onClick={handleCsvDownload}
                    className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:border-orange-400 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                )}
              </div>

              {/* 예시 불러오기 */}
              <div>
                <p className="text-xs text-gray-400 mb-2">예시 불러오기:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ['다이어트\n재테크\n노트북 추천\n강아지 용품\n헤어스타일'],
                    ['블로그 수익화\nSEO 최적화\n네이버 블로그\n티스토리 블로그\n애드센스'],
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setInputText(example[0])}
                      className="text-xs bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-500 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      예시 {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 결과 영역 */}
        <div className="lg:col-span-3">
          {loading && (
            <Card>
              <CardBody className="py-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
                <div>
                  <p className="font-semibold text-gray-700">{keywords[Math.round(progress / 100 * keywords.length) - 1] || keywords[0]} 분석 중...</p>
                  <p className="text-sm text-gray-400 mt-1">총 {Math.min(keywords.length, MAX_FREE)}개 키워드 · {progress}% 완료</p>
                </div>
                <div className="w-full max-w-xs mx-auto h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </CardBody>
            </Card>
          )}

          {!loading && results.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>분석 결과 ({results.length}개)</CardTitle>
                  <Badge variant="warning">무료 {MAX_FREE}개 제공</Badge>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2.5 text-xs text-gray-500">키워드</th>
                      <th className="text-center px-3 py-2.5 text-xs text-gray-500 w-10">등급</th>
                      <th className="text-right px-3 py-2.5 text-xs text-gray-500">PC</th>
                      <th className="text-right px-3 py-2.5 text-xs text-gray-500">모바일</th>
                      <th className="text-right px-3 py-2.5 text-xs text-gray-500">합계</th>
                      <th className="text-right px-3 py-2.5 text-xs text-gray-500">블로그</th>
                      <th className="text-center px-3 py-2.5 text-xs text-gray-500">포화도</th>
                      <th className="text-center px-3 py-2.5 text-xs text-gray-500">분석</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.keyword} className="border-b border-gray-50 hover:bg-orange-50">
                        <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[120px] truncate">{r.keyword}</td>
                        <td className="px-3 py-2.5 text-center">
                          <GradeChip grade={r.grade} size="sm" />
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{formatNumberFull(r.pcSearch)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{formatNumberFull(r.mobileSearch)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-gray-900">{formatNumberFull(r.totalSearch)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{formatNumberFull(r.blogCount)}</td>
                        <td className={`px-3 py-2.5 text-center text-xs font-medium ${r.satColor}`}>{r.saturation}</td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => router.push(`/keyword?q=${encodeURIComponent(r.keyword)}`)}
                            className="text-gray-400 hover:text-orange-500 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <AlignJustify className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">키워드를 입력하고 일괄 분석 시작 버튼을 누르세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
