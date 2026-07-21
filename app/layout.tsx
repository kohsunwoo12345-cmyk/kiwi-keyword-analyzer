import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { VisitTracker } from '@/components/VisitTracker'
import { PublicNoticePopups } from '@/components/PublicNoticePopups'
import { EmojiParser } from '@/components/EmojiParser'
import { SupportChat } from '@/components/SupportChat'
import { LanguageProvider } from '@/lib/i18n'
import { JsonLd } from '@/components/seo/JsonLd'
import { orgLd, websiteLd, SITE_URL, KEYWORDS } from '@/lib/seo'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'BYGENCY (바이전시) — 노드형 AI 광고 영상 제작 · 올인원 마케팅 플랫폼',
    template: '%s · BYGENCY',
  },
  description:
    '국내 1위를 지향하는 노드형 AI 광고 영상 제작 플랫폼. Veo·Runway·Seedance·Kling 등 최신 AI 모델을 노드로 연결해 광고 영상을 만들고, 유튜브·블로그·광고 분석, DB수집 랜딩페이지, CRM 까지 한 곳에서. 한국어·영어·일본어·중국어 지원.',
  keywords: KEYWORDS,
  applicationName: 'BYGENCY',
  authors: [{ name: '(주)넥스트 바이전시', url: SITE_URL }],
  creator: '(주)넥스트 바이전시',
  publisher: '(주)넥스트 바이전시',
  category: 'technology',
  alternates: {
    canonical: '/',
    languages: {
      ko: '/',
      en: '/',
      ja: '/',
      zh: '/',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'BYGENCY',
    url: SITE_URL,
    title: 'BYGENCY (바이전시) — 노드형 AI 광고 영상 제작 · 올인원 마케팅',
    description:
      '노드형 AI 광고 영상 제작부터 유튜브·블로그·광고 분석, DB수집 랜딩페이지, CRM 까지. 마케팅의 모든 것을 BYGENCY 하나로. 한·영·일·중 지원.',
    locale: 'ko_KR',
    alternateLocale: ['en_US', 'ja_JP', 'zh_CN'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BYGENCY (바이전시) — 노드형 AI 광고 영상 제작',
    description:
      '노드형 AI 광고 영상 제작 · 유튜브/블로그/광고 분석 · DB수집 랜딩페이지 · CRM. 마케팅의 모든 것을 한 곳에서.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  verification: {
    google: 'KyRRy4i1SLsGN83YlmgJr9xhdgLOQ_OH1alq7R53bpk',
    other: {
      'naver-site-verification': 'e6ab6cca51096ee37cbf19e8e9c326f966bed155',
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <JsonLd data={[orgLd(), websiteLd()]} />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <VisitTracker />
          <EmojiParser />
          {children}
          <PublicNoticePopups />
          <SupportChat />
        </LanguageProvider>
      </body>
    </html>
  )
}
