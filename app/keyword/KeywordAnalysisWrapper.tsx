'use client'
import { useSearchParams } from 'next/navigation'
import { KeywordAnalysis } from '@/components/keyword/KeywordAnalysis'

export function KeywordAnalysisWrapper() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  return <KeywordAnalysis initialKeyword={q} />
}
