'use client'

import { usePathname } from 'next/navigation'

// 대시보드 페이지 전환 슬라이드 — 경로가 바뀔 때마다 key 가 바뀌어 슬라이드-인 애니메이션이 재생된다.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="dash-page-slide">
      {children}
    </div>
  )
}
