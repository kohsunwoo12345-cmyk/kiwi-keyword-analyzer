'use client'

// SUPERPLACE 블로그 분석 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/blog 를 임베드
export default function BlogToolPage() {
  return (
    <iframe
      src="/tools/blog?embed=1"
      title="블로그 분석"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-[calc(100vh-56px)]"
    />
  )
}
