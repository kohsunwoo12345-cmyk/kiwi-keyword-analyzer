'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, ArrowRight, Clapperboard } from 'lucide-react'
import { useAuth, type User } from '@/lib/auth'

const HOME = '/dashboard_USE17237_612'
const STUDIO = '/studio-nvc-prv-8b3k2/#chat'

/**
 * 플랜 없이도 볼 수 있는 경로: 대시보드 홈 + 계정(프로필).
 * 그 외 마케팅 도구 페이지는 유료(마케팅) 플랜이 있어야 접근 가능.
 */
function allowedWithoutPlan(pathname: string | null) {
  if (!pathname) return true
  if (pathname === HOME) return true
  if (pathname.startsWith(HOME + '/profile')) return true
  return false
}

/** 플랜이 활성(존재 + 미만료)인지. until 빈값 = 무기한. */
function planActive(plan?: string, until?: string | null, now?: string): boolean {
  if (!plan || plan === '없음') return false
  if (!until) return true
  return until > (now || new Date().toISOString())
}

export type GateResult =
  | { kind: 'loading' }
  | { kind: 'redirect'; to: string }   // SPA 라우팅(로그인·프로필 완성)
  | { kind: 'video-only' }             // 영상 전용 회원 → 대시보드 완전 차단, 스튜디오로 하드 이동
  | { kind: 'need-plan' }              // 도구 페이지인데 마케팅 플랜 없음 → 요금제 안내
  | { kind: 'allow' }                  // 렌더 허용

/**
 * 대시보드 접근 판정(순수 함수 — 테스트 가능).
 * 규칙:
 *  - 미로그인 → /login
 *  - 가입정보 미완료 → /complete-profile
 *  - (관리자 아님) 영상 플랜만 활성 + 마케팅 플랜 비활성 → 일반 대시보드 **완전 차단**, 스튜디오로 이동
 *  - 마케팅 플랜 활성(또는 관리자) → 전체 허용
 *  - 플랜 없음 → 홈/프로필만 허용, 도구 페이지는 요금제 안내
 * 만료(plan_until 경과)는 문자열이 남아있어도 '비활성'으로 처리한다.
 */
export function evalGate(user: User | null, ready: boolean, pathname: string | null, now?: string): GateResult {
  if (!ready) return { kind: 'loading' }
  if (!user) return { kind: 'redirect', to: '/login' }
  if (!user.addressComplete) return { kind: 'redirect', to: '/complete-profile' }

  const admin = user.role === 'admin'
  const marketingActive = admin || planActive(user.plan, user.planUntil, now)
  const videoActive = admin || planActive(user.videoPlan, user.videoPlanUntil, now)

  // 영상 전용(마케팅 미보유/만료) 회원은 일반 대시보드에 아예 들어올 수 없다.
  if (!admin && videoActive && !marketingActive) return { kind: 'video-only' }

  if (marketingActive || allowedWithoutPlan(pathname)) return { kind: 'allow' }
  return { kind: 'need-plan' }
}

/**
 * 대시보드 접근 게이트(관리자는 모두 면제).
 */
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, ready } = useAuth()

  const gate = evalGate(user, ready, pathname)
  const redirectTo = gate.kind === 'redirect' ? gate.to : ''

  useEffect(() => {
    if (gate.kind === 'redirect') { router.replace(gate.to); return }
    // 영상 전용 회원 → 대시보드를 렌더하지 않고 스튜디오로 하드 이동(라우트 차단)
    if (gate.kind === 'video-only') { window.location.replace(STUDIO) }
  }, [gate.kind, redirectTo, router])

  // 영상 전용 회원: 대시보드 자식은 절대 렌더하지 않음
  if (gate.kind === 'video-only') {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-6">
        <div className="flex flex-col items-center text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-sm text-[var(--text-soft)]">영상 스튜디오로 이동 중…</p>
          <a href={STUDIO} className="mt-3 text-xs font-semibold text-violet-500 underline-offset-2 hover:underline">
            바로 이동하지 않으면 여기를 눌러주세요
          </a>
        </div>
      </div>
    )
  }

  if (gate.kind === 'allow') return <>{children}</>

  // 도구 페이지인데 마케팅 플랜 없음 → 요금제 활성화 안내(도구 비노출)
  if (gate.kind === 'need-plan') {
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
          <a href={STUDIO} className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition hover:bg-white/5">
            <Clapperboard size={15} /> 노드형 영상 스튜디오
          </a>
        </div>
      </div>
    )
  }

  // 확인/이동 중 (loading | redirect)
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
