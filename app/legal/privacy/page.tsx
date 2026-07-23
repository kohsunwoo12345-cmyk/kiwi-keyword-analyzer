import type { Metadata } from 'next'
import { PrivacyContent } from './PrivacyContent'

export const metadata: Metadata = {
  title: '개인정보처리방침 · BYGENCY',
  description: 'BYGENCY 개인정보처리방침',
}

export default function PrivacyPolicyPage() {
  return <PrivacyContent />
}
