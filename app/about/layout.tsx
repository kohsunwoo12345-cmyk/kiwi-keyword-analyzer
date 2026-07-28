import type { Metadata } from 'next'

// 이 라우트의 page 는 'use client' 라 metadata 를 내보낼 수 없다.
// 없으면 루트 layout 의 기본값(홈 제목·설명)을 그대로 물려받아 검색엔진에 중복으로 보인다.
export const metadata: Metadata = {
  title: '회사 소개',
  description: '(주)넥스트 바이전시가 만드는 노드형 AI 광고 영상 제작 플랫폼. 우리가 무엇을 만들고 어디로 가는지 소개합니다.',
  alternates: { canonical: '/about' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
