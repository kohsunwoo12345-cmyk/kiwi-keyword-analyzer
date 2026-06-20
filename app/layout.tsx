import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '모토진단 — 오토바이 OBD-II 진단 도구',
  description: '노트북과 ELM327 어댑터로 오토바이 고장코드 · 실시간 데이터 · 주행 로그를 확인하는 웹 진단 도구',
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
