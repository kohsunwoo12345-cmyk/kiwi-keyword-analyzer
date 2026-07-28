import type { Metadata } from 'next'

// 이 라우트의 page 는 'use client' 라 metadata 를 내보낼 수 없다.
// 없으면 루트 layout 의 기본값(홈 제목·설명)을 그대로 물려받아 검색엔진에 중복으로 보인다.
export const metadata: Metadata = {
  title: '회원가입',
  description: 'BYGENCY 계정을 만들고 노드형 AI 영상 스튜디오와 올인원 마케팅 도구를 3분 만에 시작하세요.',
  alternates: { canonical: '/signup' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
