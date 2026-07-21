'use client'

// SUPERPLACE 문자 발송(SMS) 도구를 그대로 이식(BYGENCY 브랜딩) — /tools/sms 를 임베드
export default function SmsSendPage() {
  return (
    <iframe
      src="/tools/sms?embed=1"
      title="문자 발송"
      className="block h-[calc(100vh-56px)] min-h-[720px] w-full border-0 lg:h-[calc(100vh-56px)]"
    />
  )
}
