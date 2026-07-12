'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'ghost' | 'outline' | 'soft'
type BtnSize = 'sm' | 'md' | 'lg'

const btnBase =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap'
const btnVariants: Record<BtnVariant, string> = {
  primary:
    'brand-gradient text-white shadow-lg shadow-violet-900/30 hover:shadow-violet-700/40 hover:brightness-110',
  soft: 'bg-white/5 text-white border border-white/10 hover:bg-white/10',
  outline: 'border border-[var(--border)] text-[var(--text)] hover:bg-white/5',
  ghost: 'text-[var(--text-soft)] hover:text-white hover:bg-white/5',
}
const btnSizes: Record<BtnSize, string> = {
  sm: 'text-sm px-3.5 py-2',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-7 py-3.5',
}

interface BtnProps {
  children: ReactNode
  variant?: BtnVariant
  size?: BtnSize
  href?: string
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className,
  type = 'button',
  disabled,
}: BtnProps) {
  const cls = cn(btnBase, btnVariants[variant], btnSizes[size], className)
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  )
}

/* ---------- Badge ---------- */
export function Badge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Section heading ---------- */
export function SectionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold text-violet-300">
      {children}
    </span>
  )
}

/* ---------- Stat card ---------- */
export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = '#7c3aed',
}: {
  label: string
  value: string
  delta?: number
  icon?: LucideIcon
  accent?: string
}) {
  const up = (delta ?? 0) >= 0
  return (
    <div className="card p-5 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between">
        <span className="text-sm text-[var(--text-soft)]">{label}</span>
        {Icon && (
          <span
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ background: `${accent}1a`, color: accent }}
          >
            <Icon size={17} />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {delta !== undefined && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-semibold',
              up ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  )
}

/* ---------- Panel ---------- */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('card p-5', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="font-semibold">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
