import type { Metadata } from 'next'
import { CookiesContent } from './CookiesContent'

export const metadata: Metadata = {
  title: '쿠키정책 · BYGENCY',
  description: 'BYGENCY 쿠키정책',
}

export default function CookiePolicyPage() {
  return <CookiesContent />
}
