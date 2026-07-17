'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, ArrowRight, Clapperboard } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const HOME = '/dashboard_USE17237_612'

/**
 * 플랜 없이도 볼 수 있는 경로: 대시보드 홈 + 계정(프로필).
 * 그 외 마케팅 도구 페이지는 유료 플랜이 있어야 접근 가능.
 */
function allowedWithoutPlan(pathname: string | null) {
  if (!pathname) return true
  if (pathname === HOME) return true
  if (pathname.startsWith(HOME + '/profile')) return true
  return false
}

/**
 * 대시보드 접근 게이트.
 * - 미로그인 → /login
 * - 가입 정보 미완료 → /complete-profile
 * - 플랜 미보유 → 홈/프로필만 접근 가능, 도구 페이지는 요금제 활성화 안내
 * (관리자는 모두 면제)
 */
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, ready } = useAuth()

  const profileOk = ready && !!user && !!user.addressComplete
  const hasPlan = !!user && (user.role === 'admin' || user.hasPlan === 1)

  useEffect(() => {
    if (!ready) return
    if (!user) { router.replace('/login'); return }
    if (!user.addressComplete) { router.replace('/complete-profile') }
  }, [ready, user, router])

  if (profileOk) {
    // 플랜이 있으면 전체 허용. 없으면 홈/프로필만 허용.
    if (hasPlan || allowedWithoutPlan(pathname)) return <>{children}</>
    // 도구 페이지인데 플랜이 없음 → 요금제 활성화 안내(도구 비노출)
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
            <Sparkles size={30} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)]">요금제를 활성화해 주세요</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
            이 도구는 <b className="text-[var(--text)]">요금제 결제 후</b> 이용할 수 있습니다. 플랜을 결제하면
            <b className="text-violet-300"> 마케팅 대시보드와 노드형 AI 영상 제작 모두</b> 사용 가능하게 전환됩니다.
          </p>
          <Link href="/activate" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110">
            바로 요금제를 활성화해 주세요 <ArrowRight size={16} />
          </Link>
          <Link href={HOME} className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition hover:bg-white/5">
            대시보드 홈으로
          </Link>
          <a href="/studio-nvc-prv-8b3k2/" className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition hover:bg-white/5">
            <Clapperboard size={15} /> 노드형 영상 스튜디오
          </a>
        </div>
      </div>
    )
  }

  // 확인/이동 중
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-6">
      <div className="flex flex-col items-center text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-soft)]">
          {!ready ? '계정 정보를 확인하는 중…' : !user ? '로그인이 필요합니다. 이동 중…' : '가입 정보 입력이 필요합니다. 이동 중…'}
        </p>
      </div>
    </div>
  )
}
