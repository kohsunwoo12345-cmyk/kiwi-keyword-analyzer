'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ============================================================
   대시보드 공용 UI — 페이지마다 다르게 생기던 카드·지표·빈 상태를
   한 벌로 통일한다. 토큰(var(--panel) 등) 기반이라 라이트/다크 자동 대응.
   ============================================================ */

/** 지표 타일 — 큰 숫자 하나와 보조 설명 */
export function Metric({
  label,
  value,
  icon: Icon,
  accent = '#6366f1',
  sub,
  chart,
}: {
  label: string
  value: ReactNode
  icon?: LucideIcon
  accent?: string
  /** 값 아래 보조 설명 (예: 만료일, 전월 대비) */
  sub?: ReactNode
  /** 우측 하단 미니 차트 */
  chart?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--border-strong,var(--border))]">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}66, transparent)` }} />
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-[var(--text-soft)]">{label}</span>
        {Icon && (
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl" style={{ background: `${accent}18`, color: accent }}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <div className="mt-3 text-[26px] font-extrabold leading-none tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-2 text-[11.5px] text-[var(--text-dim)]">{sub}</div>}
      {chart && <div className="mt-3">{chart}</div>}
    </div>
  )
}

/** 섹션 카드 — 제목 줄 + 본문 */
export function Card({
  title,
  desc,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  desc?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]', className)}>
      {(title || action) && (
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5">
          <div className="min-w-0">
            {title && <h3 className="truncate text-[14px] font-bold tracking-tight">{title}</h3>}
            {desc && <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-dim)]">{desc}</p>}
          </div>
          {action && <div className="ml-auto flex-shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

/** 데이터가 없을 때 — 무엇을 하면 채워지는지까지 알려준다 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-4 py-10 text-center', className)}>
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--panel-2)] text-[var(--text-dim)]">
        <Icon size={19} />
      </span>
      <p className="mt-1 text-[13.5px] font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-[12px] leading-relaxed text-[var(--text-dim)]">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** 미니 스파크라인 — 지표 타일 안에 들어가는 작은 추이 */
export function Spark({ data, accent = '#6366f1', height = 28 }: { data: number[]; accent?: string; height?: number }) {
  if (!data.length) return null
  const max = Math.max(1, ...data)
  const w = 100
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, height - (v / max) * (height - 3) - 1.5])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L ${w} ${height} L 0 ${height} Z`
  const id = `spk-${accent.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-7 w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** 막대 추이 차트 — 값이 0인 날도 자리를 지키고, 막대에 올리면 수치를 보여준다 */
export function BarTrend({
  data,
  accent = '#6366f1',
  height = 190,
  unit = '',
}: {
  data: { label: string; value: number }[]
  accent?: string
  height?: number
  unit?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={d.label + i} className="group/bar flex h-full flex-1 flex-col justify-end gap-1.5">
            <div
              className="relative w-full rounded-t-[5px] transition-[height] duration-500"
              style={{
                height: `${Math.max(d.value > 0 ? 6 : 2, (d.value / max) * 88)}%`,
                background: d.value > 0 ? `linear-gradient(180deg, ${accent}, ${accent}88)` : 'var(--panel-2)',
                animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms both`,
              }}
            >
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--text)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--panel)] opacity-0 transition-opacity group-hover/bar:opacity-100">
                {d.value.toLocaleString('ko-KR')}
                {unit}
              </span>
            </div>
            <span className="text-center text-[9px] tabular-nums text-[var(--text-dim)]">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 목록 한 줄 — 아이콘 + 본문 + 시각 */
export function ListRow({
  icon: Icon,
  accent = '#6366f1',
  title,
  meta,
  right,
}: {
  icon: LucideIcon
  accent?: string
  title: ReactNode
  meta?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[var(--panel-2)]">
      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg" style={{ background: `${accent}18`, color: accent }}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium">{title}</p>
        {meta && <p className="mt-0.5 truncate text-[10.5px] text-[var(--text-dim)]">{meta}</p>}
      </div>
      {right && <div className="flex-shrink-0 text-[11px] text-[var(--text-dim)]">{right}</div>}
    </div>
  )
}
