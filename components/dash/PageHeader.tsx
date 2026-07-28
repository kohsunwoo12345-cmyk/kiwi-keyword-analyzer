import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmojiText } from '@/components/Emoji'

/**
 * 화면 머리말.
 * 큰 색 타일과 색 eyebrow 로 강조하던 것을, 얇은 세로선 하나와
 * 무채색 eyebrow 로 낮췄다. 강조색은 세로선에만 남긴다.
 */
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  desc,
  accent = '#2563eb',
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
    <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-7">
      <div className="flex items-stretch gap-4">
        <span className="w-[3px] flex-shrink-0 rounded-full" style={{ background: accent }} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            <Icon size={12} strokeWidth={2.25} style={{ color: accent }} />
            {eyebrow}
          </p>
          <h1 className="mt-1.5 text-[21px] font-semibold tracking-[-0.025em] text-[var(--text)]">
            <EmojiText>{title}</EmojiText>
          </h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-soft)]">{desc}</p>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
