'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackVisit } from '@/lib/auth'

/** 페이지 이동마다 방문 1건 기록 (접속 통계용). */
export function VisitTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname) return
    // 관리자 콘솔 자체 방문은 통계에서 제외
    if (pathname.startsWith('/adminsunkoh028741_11263')) return
    const ref = typeof document !== 'undefined' ? document.referrer || '' : ''
    trackVisit(pathname, ref)
  }, [pathname])
  return null
}
