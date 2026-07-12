'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 스크롤 진입 시 페이드+슬라이드 인 */
export function Reveal({
  children,
  className,
  variant,
  delay = 0,
  as: Tag = 'div',
  once = true,
}: {
  children: ReactNode
  className?: string
  variant?: 'up' | 'left' | 'right' | 'scale'
  delay?: number
  as?: any
  once?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          if (once) io.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once])

  const variantClass =
    variant === 'left'
      ? 'reveal-left'
      : variant === 'right'
      ? 'reveal-right'
      : variant === 'scale'
      ? 'reveal-scale'
      : ''

  return (
    <Tag
      ref={ref as any}
      className={cn('reveal', variantClass, inView && 'in-view', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

/** 뷰포트 진입 시 0 → target 카운트업 */
export function Counter({
  to,
  duration = 1600,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  to: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setVal(to * eased)
          if (p < 1) requestAnimationFrame(tick)
          else setVal(to)
        }
        requestAnimationFrame(tick)
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])

  const display = val.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

/** 무한 가로 스크롤(로고/키워드 띠) */
export function Marquee({ items, className }: { items: ReactNode[]; className?: string }) {
  const doubled = [...items, ...items]
  return (
    <div className={cn('marquee-mask overflow-hidden', className)}>
      <div className="marquee-track gap-10">
        {doubled.map((it, i) => (
          <div key={i} className="flex-shrink-0">
            {it}
          </div>
        ))}
      </div>
    </div>
  )
}
