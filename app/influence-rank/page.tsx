'use client'
import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Star, TrendingUp, TrendingDown, Minus, Search, Download, Filter } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface InfluenceItem {
  rank: number
  name: string
  url: string
  keywordCount: number
  exposureIndex: number
  freshnessGrade: string
  expertGrade: string
  category: string
  rankChange: number
  type: 'blog' | 'site'
}

function generateInfluenceData(): InfluenceItem[] {
  const items: InfluenceItem[] = []
  const categories = ['IT/테크', '음식/요리', '패션/뷰티', '여행', '건강/운동', '육아', '재테크', '게임', '영화/문화', '자동차']
  const grades = ['S', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C', 'D']
  const blogNames = [
    '테크리뷰어', '맛집탐험가', '뷰티인사이더', '여행작가김씨', '헬스마스터',
    '육아일기맘', '재테크고수', '게임가이드', '영화평론가', '자동차매니아',
    '라이프스타일러', '요리연구가', '패션블로거', 'IT전문가', '건강멘토',
    '투자달인', '뷰티유튜버', '여행전문가', '음식평론가', '스포츠매니아',
  ]
  for (let i = 0; i < 50; i++) {
    const baseKeywords = 800 - i * 13 + Math.floor(Math.random() * 50)
    items.push({
      rank: i + 1,
      name: blogNames[i % blogNames.length] + (i >= blogNames.length ? Math.floor(i / blogNames.length) + 1 : ''),
      url: `blog${i + 1}.naver.com`,
      keywordCount: Math.max(10, baseKeywords),
      exposureIndex: Math.max(0.01, (0.98 - i * 0.018 + Math.random() * 0.02)).toFixed(2) as unknown as number,
      freshnessGrade: grades[Math.floor(Math.random() * grades.length)],
      expertGrade: grades[Math.floor(Math.random() * grades.length)],
      category: categories[i % categories.length],
      rankChange: Math.floor(Math.random() * 10) - 5,
      type: i % 3 === 0 ? 'site' : 'blog',
    })
  }
  return items
}

const ALL_DATA = generateInfluenceData()

export default function InfluenceRankPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('전체')
  const [type, setType] = useState<'all' | 'blog' | 'site'>('all')
  const categories = ['전체', 'IT/테크', '음식/요리', '패션/뷰티', '여행', '건강/운동', '육아', '재테크', '게임', '영화/문화']

  const filtered = ALL_DATA
    .filter(d => category === '전체' || d.category === category)
    .filter(d => type === 'all' || d.type === type)
    .filter(d => !search || d.name.includes(search) || d.url.includes(search))

  const handleCsvDownload = () => {
    const rows = [
      ['순위', '이름', 'URL', '유효키워드', '노출지수', '최신성', '전문성', '카테고리', '변화'],
      ...filtered.slice(0, 20).map(d => [d.rank, d.name, d.url, d.keywordCount, d.exposureIndex, d.freshnessGrade, d.expertGrade, d.category, d.rankChange])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '영향력순위.csv'
    a.click()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Star className="w-7 h-7 text-yellow-500" />
            영향력 순위
          </h1>
          <p className="text-gray-500 text-sm mt-1">네이버 블로그·사이트의 유효 키워드 수 기반 영향력 TOP 2000</p>
        </div>
        <button onClick={handleCsvDownload} className="flex items-center gap-2 text-sm border border-gray-200 hover:border-green-400 px-3 py-2 rounded-lg text-gray-600 transition-colors">
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="블로그명·URL 검색..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'blog', 'site'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {t === 'all' ? '전체' : t === 'blog' ? '블로그' : '사이트'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${category === cat ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 등급 설명 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: '유효 키워드 수', desc: '상위 노출에 영향 주는 키워드 수', color: 'bg-blue-50 border-blue-200' },
          { label: '노출 지수', desc: '1에 가까울수록 상위 노출 가능성↑', color: 'bg-green-50 border-green-200' },
          { label: '최신성 등급', desc: '최근 발행 콘텐츠 비율', color: 'bg-purple-50 border-purple-200' },
          { label: '전문성 등급', desc: '특정 주제 집중도', color: 'bg-yellow-50 border-yellow-200' },
        ].map(item => (
          <div key={item.label} className={`border rounded-lg p-3 ${item.color}`}>
            <div className="text-xs font-bold text-gray-700">{item.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-center px-4 py-3 text-xs text-gray-500 w-12">순위</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500">블로그/사이트</th>
                <th className="text-center px-4 py-3 text-xs text-gray-500">변화</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500">유효키워드</th>
                <th className="text-center px-4 py-3 text-xs text-gray-500">노출지수</th>
                <th className="text-center px-4 py-3 text-xs text-gray-500">최신성</th>
                <th className="text-center px-4 py-3 text-xs text-gray-500">전문성</th>
                <th className="text-center px-4 py-3 text-xs text-gray-500">카테고리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map(item => (
                <tr key={item.rank} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      item.rank <= 3 ? 'bg-yellow-400 text-white' :
                      item.rank <= 10 ? 'bg-gray-200 text-gray-700' :
                      'text-gray-500'
                    }`}>
                      {item.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.url}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.rankChange > 0 ? (
                      <span className="flex items-center justify-center gap-0.5 text-green-600 text-xs"><TrendingUp className="w-3 h-3" />+{item.rankChange}</span>
                    ) : item.rankChange < 0 ? (
                      <span className="flex items-center justify-center gap-0.5 text-red-500 text-xs"><TrendingDown className="w-3 h-3" />{item.rankChange}</span>
                    ) : (
                      <Minus className="w-4 h-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatNumber(item.keywordCount)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center">
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-1.5">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${Number(item.exposureIndex) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-700">{item.exposureIndex}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      item.freshnessGrade === 'S' ? 'bg-purple-100 text-purple-700' :
                      item.freshnessGrade === 'A' ? 'bg-blue-100 text-blue-700' :
                      item.freshnessGrade === 'B' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.freshnessGrade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      item.expertGrade === 'S' ? 'bg-purple-100 text-purple-700' :
                      item.expertGrade === 'A' ? 'bg-blue-100 text-blue-700' :
                      item.expertGrade === 'B' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.expertGrade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-sm text-gray-500">
          무료 TOP 50 · <a href="/pricing" className="text-green-600 font-medium hover:underline">멤버십으로 TOP 2000 전체 보기</a>
        </div>
      </Card>
    </div>
  )
}
