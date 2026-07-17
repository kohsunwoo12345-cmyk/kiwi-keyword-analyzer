'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, ChevronDown, LogOut, Shield, Moon, Sun, Sparkles } from 'lucide-react'
import { NAV_HOME, NAV_CATEGORIES, type NavCategory } from '@/lib/nav'
import { Logo } from '@/components/Brand'
import { useAuth, logout } from '@/lib/auth'
import { useDashTheme } from '@/components/dash/DashThemeProvider'
import { cn } from '@/lib/utils'

function useActiveCat(pathname: string | null) {
  return NAV_CATEGORIES.find((c) => c.items.some((i) => i.href === pathname))?.id
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const hasPlan = user?.role === 'admin' || user?.hasPlan === 1
  const activeCat = useActiveCat(pathname)
  const [open, setOpen] = useState<Record<string, boolean>>(
    activeCat ? { [activeCat]: true } : {},
  )

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  const homeActive = pathname === NAV_HOME.href
  const HomeIcon = NAV_HOME.icon

  return (
    <nav className="space-y-0.5">
      <Link
        href={NAV_HOME.href}
        onClick={onNavigate}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
          homeActive
            ? 'bg-gradient-to-r from-violet-50 to-transparent text-violet-700'
            : 'text-[var(--text-soft)] hover:bg-slate-100 hover:text-[var(--text)]',
        )}
      >
        <span
          className={cn(
            'grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg',
            homeActive ? 'brand-gradient text-white' : 'bg-slate-100 text-[var(--text-dim)]',
          )}
        >
          <HomeIcon size={15} />
        </span>
        홈
      </Link>

      {hasPlan ? (
        <>
          <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
            마케팅 도구
          </p>

          {NAV_CATEGORIES.map((cat) => (
            <CategoryBlock
              key={cat.id}
              cat={cat}
              open={!!open[cat.id]}
              onToggle={() => toggle(cat.id)}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </>
      ) : (
        /* 플랜 미보유 → 도구 숨김, 요금제 활성화 유도만 노출 */
        <Link
          href="/activate"
          onClick={onNavigate}
          className="mt-4 flex items-center gap-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-500/15"
        >
          <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg brand-gradient text-white">
            <Sparkles size={14} />
          </span>
          요금제 활성화하기
        </Link>
      )}
    </nav>
  )
}

function CategoryBlock({
  cat,
  open,
  onToggle,
  pathname,
  onNavigate,
}: {
  cat: NavCategory
  open: boolean
  onToggle: () => void
  pathname: string | null
  onNavigate?: () => void
}) {
  const CatIcon = cat.icon
  const hasActive = cat.items.some((i) => i.href === pathname)

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          hasActive ? 'text-[var(--text)]' : 'text-[var(--text-soft)] hover:bg-slate-100 hover:text-[var(--text)]',
        )}
      >
        <span
          className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg"
          style={{ background: `${cat.accent}18`, color: cat.accent }}
        >
          <CatIcon size={15} />
        </span>
        <span className="truncate">{cat.title}</span>
        {cat.badge && (
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-bold',
              cat.badge === 'HOT' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600',
            )}
          >
            {cat.badge}
          </span>
        )}
        <ChevronDown
          size={15}
          className={cn('ml-auto text-[var(--text-dim)] transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mb-1 ml-4 mt-0.5 space-y-0.5 border-l border-[var(--border)] pl-3">
          {cat.items.map((it) => {
            const active = pathname === it.href
            const ItIcon = it.icon
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all',
                  active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-[var(--text-soft)] hover:bg-slate-100 hover:text-[var(--text)]',
                )}
              >
                <ItIcon size={14} className={active ? 'text-violet-600' : 'text-[var(--text-dim)]'} />
                <span className="truncate">{it.title}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Brand() {
  return <Logo size={30} />
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* mobile top bar */}
      <div className="glass sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] px-4 py-3 lg:hidden">
        <Brand />
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-soft)]"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="h-full w-72 overflow-y-auto border-r border-[var(--border)] bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-[var(--border)] bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-[var(--border)] px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <SidebarBody />
        </div>
        <UserFooter />
      </aside>
    </>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useDashTheme()
  return (
    <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
          theme === 'light' ? 'bg-white text-slate-800 shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text-soft)]',
        )}
        aria-pressed={theme === 'light'}
      >
        <Sun size={13} /> 라이트
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
          theme === 'dark' ? 'bg-slate-900 text-white shadow-sm' : 'text-[var(--text-dim)] hover:text-[var(--text-soft)]',
        )}
        aria-pressed={theme === 'dark'}
      >
        <Moon size={13} /> 다크
      </button>
    </div>
  )
}

function UserFooter() {
  const router = useRouter()
  const { user } = useAuth()
  const name = user?.name || '마케터'
  const sub = user?.role === 'admin' ? 'ADMIN' : (!user?.plan || user.plan === '없음' ? '요금제 미가입' : `${user.plan} 플랜`)

  return (
    <div className="space-y-2 border-t border-[var(--border)] p-3">
      <ThemeToggle />
      {user?.role === 'admin' && (
        <Link
          href="/adminsunkoh028741_11263"
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <Shield size={15} /> 관리자 콘솔
        </Link>
      )}
      <Link
        href="/dashboard_USE17237_612/profile"
        className="card-2 flex items-center gap-3 p-3 transition-all hover:border-violet-300 hover:bg-violet-50/50"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full brand-gradient text-sm font-bold text-white">
          {name[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}님</p>
          <p className="truncate text-xs text-[var(--text-dim)]">{sub}</p>
        </div>
      </Link>
      <button
        onClick={async () => {
          await logout()
          router.push('/login')
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:bg-slate-100 hover:text-[var(--text)]"
      >
        <LogOut size={15} /> 로그아웃
      </button>
    </div>
  )
}
