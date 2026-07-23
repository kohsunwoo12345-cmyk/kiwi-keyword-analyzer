import type { Metadata } from 'next'
import { TermsContent } from './TermsContent'

export const metadata: Metadata = {
  title: '이용약관 · BYGENCY',
  description: 'BYGENCY 통합 이용약관',
}

export default function TermsPage() {
  return <TermsContent />
}
