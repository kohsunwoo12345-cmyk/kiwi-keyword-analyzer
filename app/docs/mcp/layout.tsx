import type { Metadata } from 'next'

// 이 라우트의 page 는 'use client' 라 metadata 를 내보낼 수 없다.
// 없으면 루트 layout 의 기본값(홈 제목·설명)을 그대로 물려받아 검색엔진에 중복으로 보인다.
export const metadata: Metadata = {
  title: 'MCP 문서',
  description: 'BYGENCY MCP 서버 연결 가이드. 지원 도구 목록과 인증, 호출 예시를 담았습니다.',
  alternates: { canonical: '/docs/mcp' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
