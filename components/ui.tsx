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
    'brand-gradient text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-[1.05]',
  soft: 'bg-indigo-500/12 text-indigo-600 border border-indigo-500/25 hover:bg-indigo-500/15',
  outline: 'border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] hover:border-indigo-400/60 hover:bg-[var(--panel-2)]',
  ghost: 'text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--panel-2)]',
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
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-blue-200 shadow-sm backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full brand-gradient" />
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
  accent = '#2563eb',
}: {
  label: string
  value: string
  delta?: number
  icon?: LucideIcon
  accent?: string
}) {
  const up = (delta ?? 0) >= 0
  return (
    <div className="card hover-lift p-5">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-[var(--text-soft)]">{label}</span>
        {Icon && (
          <span
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: `${accent}14`, color: accent }}
          >
            <Icon size={17} />
          </span>
        )}
      </div>
      <div className="mt-3.5 flex items-end justify-between">
        <span className="text-[28px] font-extrabold leading-none tracking-tight">{value}</span>
        {delta !== undefined && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-semibold',
              up ? 'text-emerald-600' : 'text-rose-500',
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
