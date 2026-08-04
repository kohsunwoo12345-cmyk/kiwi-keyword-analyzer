'use client'

import { useId } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/** BYGENCY 로고 마크 (SVG 재현) */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const bg = `bgm-${uid}`
  const teal = `tlm-${uid}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bg} x1="18" y1="26" x2="86" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#152e8f" />
          <stop offset="0.5" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#25d3e0" />
        </linearGradient>
        <linearGradient id={teal} x1="86" y1="30" x2="102" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2ee6c8" />
          <stop offset="1" stopColor="#16b8b0" />
        </linearGradient>
      </defs>
      <path
        d="M30 30 H66 a20 20 0 0 1 0 40 H50 l10 12 H44 l-14 -17 V30 Z M44 42 V52 H62 a5 5 0 0 0 0 -10 Z"
        fill={`url(#${bg})`}
      />
      <path d="M20 34 L38 34 L64 86 L64 104 L54 104 L20 40 Z" fill={`url(#${bg})`} />
      <path d="M96 62 L74 96 L64 96 L86 58 Z" fill={`url(#${teal})`} />
      <rect x="82" y="46" width="7" height="20" rx="1.5" fill={`url(#${teal})`} />
      <rect x="92" y="38" width="7" height="28" rx="1.5" fill={`url(#${teal})`} />
      <rect x="102" y="30" width="7" height="36" rx="1.5" fill={`url(#${teal})`} />
      <rect x="30" y="92" width="8" height="8" rx="1" fill="#1d4ed8" />
      <rect x="42" y="88" width="6" height="6" rx="1" fill="#2563eb" />
      <rect x="26" y="104" width="5" height="5" rx="1" fill="#3b82f6" />
      <rect x="40" y="102" width="4" height="4" rx="1" fill="#60a5fa" />
    </svg>
  )
}

/* 앱 아이콘(라운드 흰 타일 + 마크).
   ⚠ 512×512 PNG(28KB) 원본을 그대로 쓰고 있었다. 화면에는 36~44px 로 그리는데
     28KB 를 받는 셈이고, 게다가 헤더에 있어 첫 화면에서 가장 먼저 받는 파일이었다.
     같은 그림을 144px webp 로 줄이니 2.5KB — 11배 작다(레티나 44px×2 를 덮는다).
     원본 PNG(app-icon.png)는 남겨 둔다. 나중에 큰 크기가 필요할 때의 원본이다.
   교체할 때는 원본을 바꾸고 scripts/ 의 변환을 다시 돌리면 된다. */
export function AppIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/app-icon-144.webp"
      alt="BYGENCY"
      width={size}
      height={size}
      className={cn(
        'rounded-[24%] bg-white ring-1 ring-slate-200 shadow-[0_3px_10px_rgba(20,22,31,0.14)]',
        className,
      )}
      style={{ width: size, height: size }}
    />
  )
}

/** 로고 + BYGENCY 워드마크 락업 */
export function Logo({
  size = 34,
  href = '/',
  wordClassName,
  className,
}: {
  size?: number
  href?: string | null
  wordClassName?: string
  className?: string
}) {
  const inner = (
    <span className={cn('flex items-center gap-2.5', className)}>
      <AppIcon size={size} />
      <span
        className={cn(
          'brand-wordmark font-black tracking-[0.14em] text-[#0a1730]',
          wordClassName,
        )}
        style={{ fontSize: size * 0.62 }}
      >
        BYGENCY
      </span>
    </span>
  )
  if (href === null) return inner
  return (
    <Link href={href} aria-label="BYGENCY 홈">
      {inner}
    </Link>
  )
}
