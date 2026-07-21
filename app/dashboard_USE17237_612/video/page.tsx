'use client'

// SUPERPLACE AI 영상 제작(NODE STUDIO) 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/video 를 임베드
export default function VideoToolPage() {
  return (
    <iframe
      src="/tools/video?embed=1"
      title="AI 영상 제작"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-[calc(100vh-56px)]"
    />
  )
}
