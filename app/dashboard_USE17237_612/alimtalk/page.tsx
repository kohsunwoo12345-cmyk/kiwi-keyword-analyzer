'use client'

// SUPERPLACE 알림톡 발송 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/alimtalk 를 임베드
export default function AlimtalkSendPage() {
  return (
    <iframe
      src="/tools/alimtalk?embed=1"
      title="알림톡 발송"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-[calc(100vh-56px)]"
    />
  )
}
