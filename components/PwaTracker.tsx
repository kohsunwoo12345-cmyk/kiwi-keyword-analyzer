'use client'

import { useEffect } from 'react'
import { trackPwa } from '@/lib/auth'

/**
 * PWA 설치 / 푸시 허용 현황을 관리자 보안 센터로 보고.
 * 서비스워커 없이도 현재 상태(설치 여부 · 알림 권한)를 1회 기록한다.
 */
export function PwaTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // 중복 보고 방지 (세션당 1회)
    try {
      if (sessionStorage.getItem('pwa_tracked') === '1') return
      sessionStorage.setItem('pwa_tracked', '1')
    } catch {
      /* ignore */
    }
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    const allowed = typeof Notification !== 'undefined' && Notification.permission === 'granted'
    // 설치(standalone)했거나 알림을 허용한 사용자만 기록 (일반 웹 방문은 제외)
    if (!standalone && !allowed) return
    trackPwa({
      platform: standalone ? 'PWA' : 'Web',
      allowed,
    }).catch(() => {})
  }, [])
  return null
}
