'use client'
import { useState } from 'react'
import { Check, X, Leaf } from 'lucide-react'

const PLANS = [
  {
    type: 'free',
    name: '무료',
    price: 0,
    period: '영구 무료',
    color: 'border-gray-200',
    headerBg: 'bg-gray-50',
    btnClass: 'bg-gray-700 hover:bg-gray-800 text-white',
    features: {
      relKeyword: '10개',
      cluster: '3개',
      trendPeriod: '1년',
      csv: false,
      bulkLimit: '20개',
      advFilter: false,
      rankTracker: '1 프로젝트',
      influenceRank: 'TOP 50',
      keywordExpand: '2depth',
    },
  },
  {
    type: 'basic',
    name: '베이직',
    price: 9900,
    period: '/월',
    color: 'border-blue-300',
    headerBg: 'bg-blue-50',
    btnClass: 'bg-blue-500 hover:bg-blue-600 text-white',
    badge: 'BASIC',
    features: {
      relKeyword: '50개',
      cluster: '20개',
      trendPeriod: '3년',
      csv: true,
      bulkLimit: '30개',
      advFilter: false,
      rankTracker: '3 프로젝트',
      influenceRank: 'TOP 500',
      keywordExpand: '5depth',
    },
  },
  {
    type: 'standard',
    name: '스탠다드',
    price: 19900,
    period: '/월',
    color: 'border-green-400',
    headerBg: 'bg-green-50',
    btnClass: 'bg-green-500 hover:bg-green-600 text-white',
    badge: '추천',
    popular: true,
    features: {
      relKeyword: '100개',
      cluster: '50개',
      trendPeriod: '4년',
      csv: true,
      bulkLimit: '50개',
      advFilter: true,
      rankTracker: '10 프로젝트',
      influenceRank: 'TOP 1000',
      keywordExpand: '무제한',
    },
  },
  {
    type: 'premium',
    name: '프리미엄',
    price: 39900,
    period: '/월',
    color: 'border-purple-400',
    headerBg: 'bg-purple-50',
    btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
    badge: 'PRO',
    features: {
      relKeyword: '200개',
      cluster: '100개',
      trendPeriod: '2016년~',
      csv: true,
      bulkLimit: '50개',
      advFilter: true,
      rankTracker: '무제한',
      influenceRank: 'TOP 2000',
      keywordExpand: '무제한',
    },
  },
]

const FEATURE_ROWS = [
  { label: '연관 키워드', key: 'relKeyword' },
  { label: '주제 클러스터', key: 'cluster' },
  { label: '트렌드 조회기간', key: 'trendPeriod' },
  { label: 'CSV 다운로드', key: 'csv' },
  { label: '대량 분석 키워드', key: 'bulkLimit' },
  { label: '고급 필터', key: 'advFilter' },
  { label: '순위 추적 프로젝트', key: 'rankTracker' },
  { label: '영향력 순위', key: 'influenceRank' },
  { label: '키워드 확장', key: 'keywordExpand' },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-sm px-4 py-1.5 rounded-full mb-4 font-medium">
          <Leaf className="w-4 h-4" />
          핵심 기능 무료 제공
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">데이터로 성장하는 가장 합리적인 선택</h1>
        <p className="text-gray-500">지금 시작하고, 필요할 때 업그레이드하세요</p>
        {/* 연/월 토글 */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>월간</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
            연간 <span className="text-green-600 font-bold ml-1">20% 할인</span>
          </span>
        </div>
      </div>

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {PLANS.map(plan => (
          <div
            key={plan.type}
            className={`border-2 rounded-2xl overflow-hidden relative ${plan.color} ${plan.popular ? 'shadow-xl shadow-green-100' : ''}`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center text-xs font-bold py-1">
                가장 인기 있는 플랜
              </div>
            )}
            <div className={`p-5 ${plan.headerBg} ${plan.popular ? 'pt-8' : ''}`}>
              {plan.badge && (
                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-2 ${
                  plan.type === 'basic' ? 'bg-blue-500 text-white' :
                  plan.type === 'standard' ? 'bg-green-500 text-white' :
                  'bg-purple-600 text-white'
                }`}>{plan.badge}</span>
              )}
              <h3 className="text-xl font-black text-gray-900">{plan.name}</h3>
              <div className="mt-2">
                {plan.price === 0 ? (
                  <span className="text-3xl font-black text-gray-900">무료</span>
                ) : (
                  <>
                    <span className="text-3xl font-black text-gray-900">
                      ₩{annual ? Math.round(plan.price * 0.8).toLocaleString() : plan.price.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </>
                )}
              </div>
              {annual && plan.price > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  연 ₩{(Math.round(plan.price * 0.8) * 12).toLocaleString()} 결제
                </p>
              )}
            </div>
            <div className="p-5 space-y-3">
              {FEATURE_ROWS.map(row => {
                const val = plan.features[row.key as keyof typeof plan.features]
                return (
                  <div key={row.key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    {typeof val === 'boolean' ? (
                      val ? <Check className="w-4 h-4 text-green-500 font-bold" /> : <X className="w-4 h-4 text-gray-300" />
                    ) : (
                      <span className="font-semibold text-gray-800">{String(val)}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="px-5 pb-5">
              <a
                href={plan.price === 0 ? '/signup' : '/signup'}
                className={`block w-full text-center py-2.5 rounded-xl font-bold text-sm transition-colors ${plan.btnClass}`}
              >
                {plan.price === 0 ? '무료로 시작' : `${plan.name} 시작하기`}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* 비교표 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">기능 상세 비교</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-sm text-gray-500 font-medium">기능</th>
                {PLANS.map(p => (
                  <th key={p.type} className={`text-center px-4 py-3 text-sm font-bold ${p.popular ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="px-5 py-3 text-sm text-gray-700">{row.label}</td>
                  {PLANS.map(p => {
                    const val = p.features[row.key as keyof typeof p.features]
                    return (
                      <td key={p.type} className={`text-center px-4 py-3 text-sm ${p.popular ? 'bg-green-50/50' : ''}`}>
                        {typeof val === 'boolean' ? (
                          val ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />
                        ) : (
                          <span className="font-medium text-gray-800">{String(val)}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-5 text-center">자주 묻는 질문</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { q: '무료 플랜은 기간 제한이 있나요?', a: '아니요. 무료 플랜은 영구적으로 사용할 수 있습니다. 연관 키워드 10개, 트렌드 1년 조회 등 핵심 기능을 무료로 제공합니다.' },
            { q: '데이터는 얼마나 자주 갱신되나요?', a: '네이버 검색광고 API를 통해 매일 갱신됩니다. 트렌드 데이터는 DataLab API 기준으로 제공됩니다.' },
            { q: '중간에 플랜 변경이 가능한가요?', a: '언제든지 상위 플랜으로 업그레이드하거나 하위 플랜으로 변경할 수 있습니다. 일할 정산으로 처리됩니다.' },
            { q: 'API 키를 직접 입력할 수 있나요?', a: '네이버 검색광고 API 키를 직접 입력해 사용하는 셀프 호스팅 옵션을 지원합니다. 설정 페이지에서 등록하세요.' },
          ].map((faq, i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">Q. {faq.q}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">A. {faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
