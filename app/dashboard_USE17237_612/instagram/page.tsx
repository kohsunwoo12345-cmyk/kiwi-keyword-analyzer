'use client'

// SUPERPLACE 인스타그램 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/instagram 를 임베드
export default function InstagramToolPage() {
  return (
    <iframe
      src="/tools/instagram?embed=1"
      title="인스타그램"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-screen"
    />
  )
}
