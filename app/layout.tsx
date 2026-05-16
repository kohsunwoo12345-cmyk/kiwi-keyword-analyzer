import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '키위분석 — 네이버 키워드 분석 도구',
  description: '키워드 분석, 검색 순위 추적, 영향력 순위, 트렌드 등 네이버 SEO 필수 도구 모음',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Navbar />
        <main className="min-h-[calc(100vh-56px)]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
