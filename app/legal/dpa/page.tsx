import type { Metadata } from 'next'
import { DpaContent } from './DpaContent'

export const metadata: Metadata = {
  title: '개인정보처리위탁 특약 · BYGENCY',
  description: 'BYGENCY 기업 고객용 개인정보처리위탁 특약',
}

export default function DpaPage() {
  return <DpaContent />
}
