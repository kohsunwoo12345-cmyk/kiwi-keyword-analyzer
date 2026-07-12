import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://kiwi-keyword-analyzer.pages.dev'),
  title: {
    default: 'BYGENCY (바이전시) — 올인원 마케팅 그로스 플랫폼',
    template: '%s · BYGENCY',
  },
  description:
    'DB수집 랜딩페이지부터 유튜브·블로그 분석, 광고 분석, CRM, AI 영상 제작까지. 마케팅에 필요한 모든 것을 한 곳에서.',
  keywords: ['BYGENCY', '바이전시', '마케팅', 'DB수집', '유튜브분석', '블로그분석', 'CRM', 'AI영상'],
  applicationName: 'BYGENCY',
  openGraph: {
    type: 'website',
    siteName: 'BYGENCY',
    title: 'BYGENCY — 올인원 마케팅 그로스 플랫폼',
    description:
      'DB수집 · 유튜브/블로그 분석 · 광고 분석 · CRM · AI 영상 제작. 마케팅에 필요한 모든 것을 한 곳에서.',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BYGENCY — 올인원 마케팅 그로스 플랫폼',
    description: 'DB수집 · 유튜브/블로그 분석 · 광고 · CRM · AI 영상 제작.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
