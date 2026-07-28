import type { Metadata } from 'next'

// 이 라우트의 page 는 'use client' 라 metadata 를 내보낼 수 없다.
// 없으면 루트 layout 의 기본값(홈 제목·설명)을 그대로 물려받아 검색엔진에 중복으로 보인다.
export const metadata: Metadata = {
  title: '문의하기',
  description: '도입 상담, 견적, 제휴 문의를 남겨주세요. BYGENCY 팀이 확인 후 연락드립니다.',
  alternates: { canonical: '/contact' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
