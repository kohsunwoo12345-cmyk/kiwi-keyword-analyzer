'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

/**
 * 가입 후 사업장 주소 미입력 회원을 주소 입력 페이지로 강제 이동.
 * (관리자는 addressComplete=true 로 면제)
 */
export function ProfileGate() {
  const router = useRouter()
  const { user, ready } = useAuth()

  useEffect(() => {
    if (!ready || !user) return
    if (!user.addressComplete) {
      router.replace('/complete-profile')
    }
  }, [ready, user, router])

  return null
}
