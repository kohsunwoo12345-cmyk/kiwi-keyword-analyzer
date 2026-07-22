'use client'

// SUPERPLACE 랜딩페이지 빌더를 그대로 이식(BYGENCY 브랜딩) — /tools/landing-builder 를 임베드
export default function LandingBuilderPage() {
  return (
    <iframe
      src="/tools/landing-builder.html?embed=1"
      title="랜딩페이지 제작"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-screen"
    />
  )
}
