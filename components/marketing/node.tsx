'use client'

/**
 * 마케팅 노드 스튜디오 디자인 시스템
 * studio-nvc-prv-8b3k2(ComfyUI 스타일 노드 캔버스)의 다크 테마를 관리자
 * 마케팅 대시보드/하위 페이지에 통일 적용하기 위한 재사용 컴포넌트.
 * 스타일 토큰은 app/globals.css 의 `.mkt-canvas` 스코프에 정의돼 있다.
 */
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** CSS 커스텀 프로퍼티(--nc 등)를 포함한 style 객체를 CSSProperties로 캐스팅 */
const sx = (o: Record<string, string | number | undefined>): CSSProperties => o as CSSProperties

/** 다크 노드 캔버스 래퍼 — 점 그리드 배경 + 라디얼 글로우 */
export function MktCanvas({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mkt-canvas animate-fade-in', className)}>{children}</div>
}

/** 스튜디오 메뉴바를 미러한 페이지 헤더 */
export function MktHeader({
  icon: Icon,
  eyebrow,
  title,
  desc,
  accent = '#5b6cff',
  action,
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
  desc: string
  accent?: string
  action?: ReactNode
}) {
  return (
    <div className="mkt-topbar">
      <span
        className="mkt-badge h-11 w-11"
        style={sx({ '--nc': accent, background: `linear-gradient(135deg, ${accent}, ${accent}bb)` })}
      >
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mkt-eyebrow">{eyebrow}</p>
        <h1 className="mkt-h1 leading-tight">{title}</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--mkt-text-dim)]">{desc}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

/** 다크 노드 패널(섹션 카드) */
export function MktPanel({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('mkt-panel', className)}>
      {(title || action) && (
        <div className="mkt-panel-hd">
          {Icon && <Icon size={15} className="text-[var(--mkt-accent-2)]" />}
          <span className="flex-1">{title}</span>
          {action}
        </div>
      )}
      <div className={cn('mkt-panel-bd', bodyClassName)}>{children}</div>
    </section>
  )
}

/** 스탯 카드 */
export function MktStat({
  label,
  value,
  icon: Icon,
  accent = '#5b6cff',
  hint,
}: {
  label: string
  value: ReactNode
  icon?: LucideIcon
  accent?: string
  hint?: string
}) {
  return (
    <div className="mkt-stat" style={sx({ '--nc': accent })}>
      <div className="flex items-center justify-between">
        <div className="mkt-stat-l">{label}</div>
        {Icon && (
          <span className="mkt-badge h-8 w-8" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <div className="mkt-stat-v mt-2 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-[var(--mkt-text-dim)]">{hint}</div>}
    </div>
  )
}

/** 태그 필 */
export function MktTag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('mkt-tag', className)}>{children}</span>
}

/** 버튼 */
export function MktButton({
  children,
  onClick,
  disabled,
  variant = 'solid',
  type = 'button',
  className,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'solid' | 'ghost'
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn('mkt-btn', variant === 'ghost' && 'ghost', className)}>
      {children}
    </button>
  )
}

/**
 * ComfyUI 스타일 노드 카드. href 가 있으면 링크 노드(허브용),
 * 없으면 정적 노드. 좌/우 포트 점과 상단 색 점으로 노드 그래프 느낌.
 */
export function MktNode({
  title,
  desc,
  icon: Icon,
  href,
  accent = '#5b6cff',
  tag,
  nodeId,
  cta = '열기',
  ports = { in: false, out: false },
  style,
  className,
}: {
  title: string
  desc?: string
  icon: LucideIcon
  href?: string
  accent?: string
  tag?: string
  nodeId?: string
  cta?: string
  ports?: { in?: boolean; out?: boolean }
  style?: CSSProperties
  className?: string
}) {
  const inner = (
    <>
      {ports.in && <span className="mkt-port in" style={{ background: accent }} />}
      {ports.out && <span className="mkt-port out" style={{ background: accent }} />}
      <div className="mkt-node-hd">
        <span className="mkt-node-dot" />
        <span className="truncate">{title}</span>
        {nodeId && <span className="mkt-node-id">{nodeId}</span>}
      </div>
      <div className="mkt-node-bd">
        <div className="flex items-start gap-3">
          <span className="mkt-badge h-10 w-10" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
            <Icon size={19} />
          </span>
          {tag && <MktTag className="ml-auto">{tag}</MktTag>}
        </div>
        {desc && <p className="text-[12.5px] leading-relaxed text-[var(--mkt-text-soft)]">{desc}</p>}
        {href && (
          <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[12.5px] font-bold" style={{ color: accent }}>
            {cta}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        )}
      </div>
    </>
  )
  const cls = cn('mkt-node', className)
  const st = sx({ '--nc': accent, ...(style as Record<string, string | number>) })
  if (href) {
    const external = href.startsWith('/tools/') || href.startsWith('http')
    if (external) {
      return (
        <a href={href} className={cls} style={st} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
          {inner}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} style={st}>
        {inner}
      </Link>
    )
  }
  return (
    <div className={cls} style={st}>
      {inner}
    </div>
  )
}

/** 테이블 헬퍼 클래스(다크) — 하위 페이지에서 공용 사용 */
export const mktTable = {
  thead: 'border-b border-[var(--mkt-border)] text-left text-xs',
  th: 'mkt-th px-3 py-2.5 font-semibold whitespace-nowrap',
  td: 'px-3 py-2.5 whitespace-nowrap',
  tr: 'mkt-tr',
}
