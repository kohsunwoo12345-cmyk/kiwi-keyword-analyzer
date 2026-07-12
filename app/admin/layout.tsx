'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  Shield,
  ShieldAlert,
  BadgeCheck,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react'
import { Logo } from '@/components/Brand'
import { cn } from '@/lib/utils'

const NAV = [
  { title: '관리자 대시보드', href: '/admin', icon: LayoutDashboard },
  { title: '회원 관리', href: '/admin/users', icon: Users },
  { title: '실시간 모니터링', href: '/admin/users', icon: Activity, exactHref: '/admin/users#live' },
  { title: '보안', href: '/admin/security', icon: ShieldAlert },
  { title: '승인 관리', href: '/admin/approvals', icon: BadgeCheck },
  { title: '설정', href: '#', icon: Settings },
]

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="space-y-1">
      <p className="px-3 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
        관리 메뉴
      </p>
      {NAV.map((it) => {
        const Icon = it.icon
        const active =
          it.href !== '#' &&
          (pathname === it.href || (it.href !== '/admin' && pathname.startsWith(it.href)))
        return (
          <Link
            key={it.title}
            href={it.exactHref || it.href}
            onClick={onNavigate}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              active
                ? 'bg-gradient-to-r from-violet-50 to-transparent text-violet-700'
                : 'text-[var(--text-soft)] hover:bg-slate-100 hover:text-[var(--text)]',
            )}
          >
            <span
              className={cn(
                'grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg transition-colors',
                active
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
                  : 'bg-slate-100 text-[var(--text-dim)] group-hover:text-violet-600',
              )}
            >
              <Icon size={15} />
            </span>
            <span className="truncate">{it.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function AdminBrand() {
  return (
    <div className="flex items-center gap-2">
      <Logo size={28} href="/admin" />
      <span className="rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-white">
        ADMIN
      </span>
    </div>
  )
}

function SidebarFooter() {
  return (
    <div className="space-y-2 border-t border-[var(--border)] p-3">
      <div className="card-2 flex items-center gap-3 p-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white">
          관
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">관리자</p>
          <p className="truncate text-xs text-[var(--text-dim)]">admin@bygency.com</p>
        </div>
      </div>
      <Link
        href="/"
        className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:bg-slate-100 hover:text-[var(--text)]"
      >
        <ArrowLeft size={15} /> 사이트로 돌아가기
      </Link>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--bg)] lg:flex">
      {/* mobile top bar */}
      <div className="glass sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] px-4 py-3 lg:hidden">
        <AdminBrand />
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-soft)]"
          aria-label="메뉴"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="flex h-full w-72 flex-col overflow-y-auto border-r border-[var(--border)] bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border)] bg-[#0a1730] px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                Admin Console
              </p>
              <div className="mt-2">
                <Logo size={26} href="/admin" wordClassName="!text-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <AdminNav onNavigate={() => setMobileOpen(false)} />
            </div>
            <SidebarFooter />
          </aside>
        </div>
      )}

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-[var(--border)] bg-white lg:flex">
        <div className="border-b border-[var(--border)] bg-[#0a1730] px-5 py-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            <Shield size={12} /> Admin Console
          </p>
          <div className="mt-2.5">
            <Logo size={26} href="/admin" wordClassName="!text-white" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <AdminNav />
        </div>
        <SidebarFooter />
      </aside>

      {/* main */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
