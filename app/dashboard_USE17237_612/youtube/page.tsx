'use client'

// SUPERPLACE 유튜브 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/youtube 를 임베드
export default function YoutubeToolPage() {
  return (
    <iframe
      src="/tools/youtube?embed=1"
      title="유튜브 분석"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-[calc(100vh-56px)]"
    />
  )
}
