'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Sparkles, LayoutDashboard, Menu, X, ChevronRight } from 'lucide-react'
import { FEATURES } from '@/lib/features'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const items = [
    { slug: '', title: '대시보드', icon: LayoutDashboard, short: '홈' },
    ...FEATURES,
  ]

  const NavList = () => (
    <nav className="space-y-1">
      {items.map((it) => {
        const href = it.slug ? `/dashboard/${it.slug}` : '/dashboard'
        const active = pathname === href
        const Icon = it.icon as any
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              active
                ? 'bg-gradient-to-r from-violet-500/20 to-transparent text-white'
                : 'text-[var(--text-soft)] hover:bg-white/5 hover:text-white',
            )}
          >
            <span
              className={cn(
                'grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg transition-colors',
                active ? 'brand-gradient text-white' : 'bg-white/5 text-[var(--text-dim)] group-hover:text-white',
              )}
            >
              <Icon size={15} />
            </span>
            <span className="truncate">{it.title}</span>
            {active && <ChevronRight size={15} className="ml-auto text-violet-400" />}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* mobile top bar */}
      <div className="glass sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg brand-gradient">
            <Sparkles size={16} className="text-white" />
          </span>
          <span className="font-bold">바이<span className="brand-text">전시</span></span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-soft)]"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)}>
          <aside
            className="h-full w-72 border-r border-[var(--border)] bg-[var(--bg-soft)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <NavList />
          </aside>
        </div>
      )}

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-soft)] lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--border)] px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient shadow-lg shadow-violet-900/40">
              <Sparkles size={18} className="text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              바이<span className="brand-text">전시</span>
            </span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <NavList />
        </div>
        <div className="border-t border-[var(--border)] p-3">
          <div className="card-2 flex items-center gap-3 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full brand-gradient text-sm font-bold text-white">
              마
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">마케터님</p>
              <p className="truncate text-xs text-[var(--text-dim)]">Pro 플랜</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
