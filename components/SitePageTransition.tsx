'use client'

import { usePathname } from 'next/navigation'

// 사이트 전역 페이지 전환 슬라이드 — 공개 페이지(홈·요금제·문서·로그인 등)에서 경로가 바뀌면
// key 변경으로 슬라이드-인 애니메이션이 재생된다.
//
// 관리자(/adminsunkoh…)·대시보드(/dashboard_USE…)는 각자의 레이아웃 안에서 <PageTransition> 으로
// "본문(main)만" 슬라이드한다(사이드바는 고정 유지). 여기서 한 번 더 감싸면 이중 슬라이드가 되어
// 이동 거리가 두 배가 되고 사이드바까지 흔들리므로, 그 경로는 감싸지 않고 그대로 통과시킨다.
const SELF_ANIMATED = ['/adminsunkoh028741_11263', '/dashboard_USE17237_612']

export function SitePageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  if (SELF_ANIMATED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return <>{children}</>
  }
  return (
    <div key={pathname} className="dash-page-slide">
      {children}
    </div>
  )
}
