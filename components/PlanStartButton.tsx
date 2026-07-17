'use client'

import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'

type Variant = 'primary' | 'ghost' | 'outline' | 'soft'
type Size = 'sm' | 'md' | 'lg'

/**
 * 요금제 시작 버튼.
 * - 도입 문의(contact) → /contact
 * - 로그인 상태 → /activate?track=..&plan=.. (본인 계정으로 바로 결제/신청 화면)
 * - 비로그인 → /signup (가입 후 온보딩)
 */
export function PlanStartButton({
  track,
  plan,
  label,
  variant = 'primary',
  size,
  className,
  contact = false,
}: {
  track: 'video' | 'marketer'
  plan: string
  label: string
  variant?: Variant
  size?: Size
  className?: string
  contact?: boolean
}) {
  const { user, ready } = useAuth()
  const href = contact
    ? '/contact'
    : ready && user
      ? `/activate?track=${track}&plan=${encodeURIComponent(plan)}`
      : '/signup'
  return (
    <Button href={href} variant={variant} size={size} className={className}>
      {label}
    </Button>
  )
}
