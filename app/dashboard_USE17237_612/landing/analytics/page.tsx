'use client'

// SUPERPLACE 랜딩페이지 유입 경로 분석 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/landing-traffic.html 를 임베드
export default function LandingAnalyticsPage() {
  return (
    <iframe
      src="/tools/landing-traffic.html?embed=1"
      title="랜딩 성과분석"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-screen"
    />
  )
}
