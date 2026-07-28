import type { Metadata } from 'next'

// 이 라우트의 page 는 'use client' 라 metadata 를 내보낼 수 없다.
// 없으면 루트 layout 의 기본값(홈 제목·설명)을 그대로 물려받아 검색엔진에 중복으로 보인다.
export const metadata: Metadata = {
  title: 'API 문서',
  description: 'BYGENCY 이미지·영상 생성 API 레퍼런스. 키 발급부터 호출, 상태 확인, 응답 형식과 크레딧 차감까지 정리했습니다.',
  alternates: { canonical: '/docs/api' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
