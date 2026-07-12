'use client'

// SUPERPLACE 퍼널 빌더 PRO(랜딩페이지 제작) 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/funnel 을 임베드
export default function LandingToolPage() {
  return (
    <iframe
      src="/tools/funnel?embed=1"
      title="랜딩페이지 제작"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-screen"
    />
  )
}
