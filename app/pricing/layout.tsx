import type { Metadata } from 'next'

// 이 라우트의 page 는 'use client' 라 metadata 를 내보낼 수 없다.
// 없으면 루트 layout 의 기본값(홈 제목·설명)을 그대로 물려받아 검색엔진에 중복으로 보인다.
export const metadata: Metadata = {
  title: '요금제',
  description: 'BYGENCY 요금제와 크레딧 정책을 한눈에. 영상 제작·마케팅 도구를 필요한 만큼만 쓰고, 사용한 크레딧만큼만 지불하세요.',
  alternates: { canonical: '/pricing' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
