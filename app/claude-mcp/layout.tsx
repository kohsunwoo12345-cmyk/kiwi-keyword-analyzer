import type { Metadata } from 'next'

// 이 라우트의 page 는 'use client' 라 metadata 를 내보낼 수 없다.
// 없으면 루트 layout 의 기본값(홈 제목·설명)을 그대로 물려받아 검색엔진에 중복으로 보인다.
export const metadata: Metadata = {
  title: 'Claude MCP 연동',
  description: 'Claude 등 MCP 클라이언트에서 BYGENCY 의 영상 제작·마케팅 도구를 바로 호출하세요. 연결 방법과 제공 도구를 안내합니다.',
  alternates: { canonical: '/claude-mcp' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
