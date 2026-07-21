import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

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
    <div className="flex flex-col gap-4 border-b border-[var(--border)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div className="flex items-center gap-4">
        <span
          className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl"
          style={{ background: `${accent}22`, color: accent }}
        >
          <Icon size={24} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            {eyebrow}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-sm text-[var(--text-soft)]">{desc}</p>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
