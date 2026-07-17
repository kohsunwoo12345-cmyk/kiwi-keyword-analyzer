'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

/**
 * 대시보드 접근 게이트.
 * - 로그인하지 않았거나(→ /login)
 * - 가입 정보(국가·회사이름·전화번호·사업장 주소)를 모두 입력하지 않은 회원(→ /complete-profile)은
 *   대시보드 콘텐츠 자체가 렌더되지 않도록 차단한다. (관리자는 면제)
 */
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, ready } = useAuth()

  const allowed = ready && !!user && !!user.addressComplete

  useEffect(() => {
    if (!ready) return
    if (!user) { router.replace('/login'); return }
    if (!user.addressComplete) { router.replace('/complete-profile') }
  }, [ready, user, router])

  if (allowed) return <>{children}</>

  // 확인/이동 중에는 대시보드를 절대 노출하지 않는다.
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-6">
      <div className="flex flex-col items-center text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-soft)]">
          {!ready
            ? '계정 정보를 확인하는 중…'
            : !user
            ? '로그인이 필요합니다. 이동 중…'
            : '가입 정보 입력이 필요합니다. 이동 중…'}
        </p>
      </div>
    </div>
  )
}
