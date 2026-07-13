'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'

const STUDIO_PATH = '/studio-nvc-prv-8b3k2/'

/**
 * 홈에서 AI 영상 제작 플랜(videoPlan) 가입자는 노드 스튜디오로 자동 이동.
 * (일반 방문/로그인만 한 회원은 홈 그대로 열람)
 */
export function StudioGate() {
  const { user, ready } = useAuth()
  useEffect(() => {
    if (ready && user && user.videoPlan && user.videoPlan !== '없음' && typeof window !== 'undefined') {
      window.location.replace(STUDIO_PATH)
    }
  }, [ready, user])

  if (ready && user && user.videoPlan && user.videoPlan !== '없음') {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-[#070b16]">
        <div className="flex flex-col items-center gap-3 text-white">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          <p className="text-sm text-slate-300">노드 스튜디오로 이동 중…</p>
        </div>
      </div>
    )
  }
  return null
}
