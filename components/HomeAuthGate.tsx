'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

/**
 * 홈(랜딩)에서 로그인 상태면 대시보드로 이동.
 * 로그인 확인 중에는 짧게 로딩 오버레이를 보여줘 마케팅 화면 깜빡임을 최소화.
 */
export function HomeAuthGate() {
  const router = useRouter()
  const { user, ready } = useAuth()

  useEffect(() => {
    if (ready && user) router.replace('/dashboard')
  }, [ready, user, router])

  if (ready && user) {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-[var(--text-soft)]">대시보드로 이동 중…</p>
        </div>
      </div>
    )
  }
  return null
}
