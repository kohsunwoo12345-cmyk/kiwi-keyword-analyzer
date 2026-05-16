'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchBar } from '@/components/ui/SearchBar'
import { Search, BarChart2, TrendingUp, Star, Layers, Zap, Hash, AlignJustify, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const TOOLS = [
  {
    href: '/keyword',
    icon: Search,
    label: '키워드 분석',
    desc: '검색량·발행량·트렌드·섹션·성향 5가지 탭 완전 분석',
    color: 'bg-green-50 text-green-600 border-green-200',
    badge: '핵심',
  },
  {
    href: '/rank-tracker',
    icon: BarChart2,
    label: '검색 순위 추적',
    desc: '프로젝트별 키워드 순위를 매일 자동 기록 · 변화 추이',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    badge: 'NEW',
  },
  {
    href: '/influence-rank',
    icon: Star,
    label: '영향력 순위',
    desc: '네이버 블로그·사이트 영향력 점수 TOP 2000',
    color: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    badge: '',
  },
  {
    href: '/keyword-suggest',
    icon: Zap,
    label: '키워드 추천',
    desc: 'AI 필터 기반 맞춤 키워드 자동 추천',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    badge: 'AI',
  },
  {
    href: '/trends',
    icon: TrendingUp,
    label: '트렌드',
    desc: '급상승 키워드 · 시즌 키워드 한눈에 보기',
    color: 'bg-red-50 text-red-600 border-red-200',
    badge: 'NEW',
  },
  {
    href: '/keyword-expand',
    icon: Layers,
    label: '키워드 확장',
    desc: '시드 키워드 → 연관 키워드 트리 자동 확장',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    badge: '',
  },
  {
    href: '/bulk-analysis',
    icon: AlignJustify,
    label: '대량 키워드 분석',
    desc: '최대 50개 키워드 동시 분석 · 엑셀 다운로드',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    badge: '',
  },
  {
    href: '/quick-search',
    icon: Hash,
    label: '간편 키워드 조회',
    desc: '빠른 단순 검색량 조회 · 즉시 결과',
    color: 'bg-teal-50 text-teal-600 border-teal-200',
    badge: '',
  },
]

const POPULAR_KEYWORDS = ['다이어트', '재테크', '노트북 추천', '주식 투자', '부업', '강아지', '헤어스타일', '원룸 인테리어']

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen">
      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-sm px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            네이버 키워드 분석 올인원 도구
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            키워드 하나로<br />블로그 전략 완성
          </h1>
          <p className="text-green-100 text-lg mb-10 leading-relaxed">
            검색량 · 경쟁도 · 트렌드 · 섹션 분석까지<br />
            블랙키위의 모든 기능을 무료로 사용하세요
          </p>
          <div className="max-w-xl mx-auto">
            <SearchBar
              onSearch={kw => router.push(`/keyword?q=${encodeURIComponent(kw)}`)}
              placeholder="분석할 키워드 입력 (예: 다이어트)"
              size="lg"
              className="shadow-xl"
            />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {POPULAR_KEYWORDS.map(kw => (
              <button
                key={kw}
                onClick={() => router.push(`/keyword?q=${encodeURIComponent(kw)}`)}
                className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 주요 지표 */}
      <section className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: '분석 키워드', value: '1,200만+' },
              { label: '월간 사용자', value: '38만+' },
              { label: '데이터 갱신', value: '매일' },
              { label: '무료 제공', value: '핵심기능' },
            ].map(item => (
              <div key={item.label}>
                <div className="text-2xl font-black text-green-600">{item.value}</div>
                <div className="text-sm text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 툴 그리드 */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">8가지 전문 분석 도구</h2>
          <p className="text-gray-500">블로그 · 스마트스토어 · 유튜브 운영자에게 꼭 필요한 모든 기능</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOLS.map(tool => {
            const Icon = tool.icon
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group relative border rounded-xl p-5 hover:shadow-md transition-all ${tool.color}`}
              >
                {tool.badge && (
                  <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {tool.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mb-3 shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{tool.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{tool.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium text-green-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  바로가기 <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 요금제 CTA */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-2xl font-bold mb-3">더 많은 데이터가 필요하신가요?</h2>
          <p className="text-gray-400 mb-8">연관키워드 최대 200개 · 4년치 트렌드 · CSV 다운로드 · 무제한 분석</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing" className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-bold transition-colors">
              요금제 보기
            </Link>
            <Link href="/keyword" className="border border-gray-600 hover:border-gray-400 text-gray-300 px-8 py-3 rounded-xl font-medium transition-colors">
              무료로 시작
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
