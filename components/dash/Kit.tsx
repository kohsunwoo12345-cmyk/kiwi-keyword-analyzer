'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ============================================================
   대시보드 공용 UI

   설계 원칙
   1) 색보다 여백과 hairline 으로 나눈다. 강조색은 아이콘·수치 한 곳에만.
   2) 글자 크기 단계를 줄인다 — 제목 13.5 / 본문 13 / 보조 11.5.
   3) 한 카드에 여러 묶음이 들어가면 Section 으로 잘게 나눈다.
   토큰(var(--panel) 등) 기반이라 라이트/다크 자동 대응.
   ============================================================ */

/**
 * 공용 입력 클래스.
 * 화면마다 따로 정의하면서 focus 색(sky/amber/green/violet)과 transition 이
 * 제각각이 됐다. 브랜드 색 하나로 통일한다.
 */
export const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-[13px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-dim)] focus:border-indigo-500/70'

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
  /** 값 아래 미니 차트 */
  chart?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 transition-colors duration-300 hover:bg-[var(--panel-2)]">
      <div className="flex items-center gap-2">
        {Icon && (
          // 채운 아이콘 타일 대신 선 아이콘 — 지표가 넷씩 늘어서도 화면이 시끄럽지 않다
          <Icon size={13} strokeWidth={2.25} style={{ color: accent }} className="flex-shrink-0" />
        )}
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--text-dim)]">
          {label}
        </span>
      </div>
      <div className="mt-3 text-[27px] font-semibold leading-none tracking-[-0.025em] tabular-nums text-[var(--text)]">
        {value}
      </div>
      {sub && <div className="mt-2.5 text-[11.5px] leading-relaxed text-[var(--text-dim)]">{sub}</div>}
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
        <header className="flex items-center gap-3 border-b border-[var(--border-soft)] px-5 py-3.5">
          <div className="min-w-0">
            {title && <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h3>}
            {desc && <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-dim)]">{desc}</p>}
          </div>
          {action && <div className="ml-auto flex-shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

/**
 * 카드 안의 작은 묶음.
 * 입력·목록·안내가 한 카드에 뒤섞여 길어질 때, 작은 라벨과 hairline 으로
 * 눈에 보이는 단위를 나눈다. 카드의 첫 묶음에는 first 를 준다.
 */
export function Section({
  label,
  hint,
  action,
  children,
  first,
  className,
}: {
  label: string
  hint?: ReactNode
  action?: ReactNode
  children: ReactNode
  /** 카드의 첫 묶음이면 위 구분선을 그리지 않는다 */
  first?: boolean
  className?: string
}) {
  return (
    <section className={cn(!first && 'mt-6 border-t border-[var(--border-soft)] pt-6', className)}>
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">{label}</h4>
          {hint && <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-dim)]">{hint}</p>}
        </div>
        {action && <div className="ml-auto flex-shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}

/** 입력 한 칸 — 라벨·설명·오류를 같은 규칙으로 붙인다 */
export function Field({
  label,
  hint,
  error,
  optional,
  right,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  error?: ReactNode
  optional?: boolean
  /** 라벨 줄 오른쪽 (글자 수 카운터 등) */
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <label className="text-[11.5px] font-medium text-[var(--text-soft)]">
          {label}
          {optional && <span className="ml-1 font-normal text-[var(--text-dim)]">(선택)</span>}
        </label>
        {right && <span className="flex-shrink-0 text-[11px] tabular-nums text-[var(--text-dim)]">{right}</span>}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-[11.5px] font-medium text-rose-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-dim)]">{hint}</p>
      ) : null}
    </div>
  )
}

/** 항목 : 값 한 줄 — 요약 정보를 표 없이 보여줄 때 */
export function KeyValue({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2', className)}>
      <span className="flex-shrink-0 text-[12.5px] text-[var(--text-dim)]">{label}</span>
      <span className="min-w-0 truncate text-right text-[13px] font-medium tabular-nums text-[var(--text)]">{children}</span>
    </div>
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
    <div className={cn('flex flex-col items-center justify-center gap-1.5 px-4 py-12 text-center', className)}>
      <Icon size={20} strokeWidth={1.6} className="mb-1.5 text-[var(--text-dim)]" />
      <p className="text-[13px] font-semibold text-[var(--text)]">{title}</p>
      {hint && <p className="max-w-xs text-[11.5px] leading-relaxed text-[var(--text-dim)]">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
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
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={accent} strokeWidth="1.25" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * 막대 추이 차트.
 * 눈금선을 옅게 깔고 막대는 위로 갈수록 진해지는 그라디언트로 채운다.
 * 값이 0인 날도 자리를 지키고, 막대에 올리면 수치를 보여준다.
 */
export function BarTrend({
  data,
  accent = '#6366f1',
  height = 170,
  unit = '',
}: {
  data: { label: string; value: number }[]
  accent?: string
  height?: number
  unit?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  // 눈금은 최댓값 기준 4등분 — 축 숫자를 왼쪽에 아주 옅게 얹는다
  const ticks = [1, 0.5, 0]
  const nice = (v: number) => Math.round(max * v).toLocaleString('ko-KR')

  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between pb-5 text-right text-[9.5px] tabular-nums text-[var(--text-dim)]" style={{ height }}>
        {ticks.map((t) => (
          <span key={t}>{nice(t)}</span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between pb-5" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="h-px w-full bg-[var(--border-soft)]" />
          ))}
        </div>
        <div className="relative flex items-end gap-[3px]" style={{ height }}>
          {data.map((d, i) => (
            <div key={d.label + i} className="group/bar flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div
                // 막대가 카드 폭을 다 먹어 덩어리처럼 보이던 것을 최대 폭으로 제한한다
                className="relative w-full max-w-[34px] rounded-t-[2px] transition-[height] duration-500"
                style={{
                  height: `${Math.max(d.value > 0 ? 4 : 1.5, (d.value / max) * 88)}%`,
                  background: d.value > 0 ? `linear-gradient(180deg, ${accent}d9, ${accent}4d)` : 'var(--border-soft)',
                  animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 24}ms both`,
                }}
              >
                <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--text)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--panel)] opacity-0 transition-opacity group-hover/bar:opacity-100">
                  {d.value.toLocaleString('ko-KR')}
                  {unit}
                </span>
              </div>
              <span className="w-full text-center text-[9px] tabular-nums text-[var(--text-dim)]">{d.label}</span>
            </div>
          ))}
        </div>
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
    <div className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-[var(--panel-2)]">
      <Icon size={14} strokeWidth={2} style={{ color: accent }} className="flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] text-[var(--text)]">{title}</p>
        {meta && <p className="mt-0.5 truncate text-[10.5px] tabular-nums text-[var(--text-dim)]">{meta}</p>}
      </div>
      {right && <div className="flex-shrink-0 text-[11px] tabular-nums text-[var(--text-dim)]">{right}</div>}
    </div>
  )
}
