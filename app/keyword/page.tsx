import { Suspense } from 'react'
import { KeywordAnalysisWrapper } from './KeywordAnalysisWrapper'

export const metadata = {
  title: '키워드 분석 — 키위분석',
  description: '네이버 키워드 월간 검색량, 연관키워드, 트렌드, 섹션, 성향 분석',
}

export default function KeywordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <KeywordAnalysisWrapper />
    </Suspense>
  )
}
