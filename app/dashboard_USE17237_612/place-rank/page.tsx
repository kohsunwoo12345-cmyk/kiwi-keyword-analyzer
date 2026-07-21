'use client'

// SUPERPLACE 네이버 플레이스 순위 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/place 를 임베드
export default function PlaceRankToolPage() {
  return (
    <iframe
      src="/tools/place?embed=1"
      title="플레이스 순위"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-[calc(100vh-56px)]"
    />
  )
}
