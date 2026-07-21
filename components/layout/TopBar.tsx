'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronDown, LogOut, Shield, Moon, Sun, Sparkles, CreditCard, Settings } from 'lucide-react'
import { NAV_HOME, NAV_CATEGORIES, type NavCategory } from '@/lib/nav'
import { Logo } from '@/components/Brand'
import { useAuth, logout } from '@/lib/auth'
import { useDashTheme } from '@/components/dash/DashThemeProvider'
import { cn } from '@/lib/utils'

// 스튜디오 노드와 동일한 프로필 아바타 SVG (그라디언트 인물 원형)
function AvatarSvg({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="url(#bg_pfg)" />
      <circle cx="12" cy="9.4" r="3.4" fill="#fff" />
      <path d="M5.6 19.2c.8-3.2 3.3-4.9 6.4-4.9s5.6 1.7 6.4 4.9A11 11 0 0112 21a11 11 0 01-6.4-1.8z" fill="#fff" />
      <defs>
        <linearGradient id="bg_pfg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6f7bff" />
          <stop offset="1" stopColor="#9a5cff" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function CategoryMenu({ cat, pathname, onNavigate }: { cat: NavCategory; pathname: string | null; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const CatIcon = cat.icon
  const hasActive = cat.items.some((i) => i.href === pathname)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative flex-shrink-0" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors whitespace-nowrap',
          hasActive || open ? 'bg-[var(--panel-2)] text-[var(--text)]' : 'text-[var(--text-soft)] hover:text-[var(--text)]',
        )}
      >
        <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: `${cat.accent}1f`, color: cat.accent }}>
          <CatIcon size={12} />
        </span>
        {cat.title}
        {cat.badge && (
          <span className={cn('rounded px-1 py-px text-[9px] font-bold', cat.badge === 'HOT' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white')}>
            {cat.badge}
          </span>
        )}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[210px] rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-1.5 shadow-xl">
          {cat.items.map((it) => {
            const Icon = it.icon
            const active = it.href === pathname
            return (
              <Link
                key={it.title + it.href}
                href={it.href}
                onClick={() => { setOpen(false); onNavigate?.() }}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                  active ? 'bg-gradient-to-r from-violet-50 to-transparent text-violet-700' : 'text-[var(--text-soft)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]',
                )}
              >
                <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${cat.accent}14`, color: cat.accent }}>
                  <Icon size={13} />
                </span>
                {it.title}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useDashTheme()
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'grid place-items-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:text-[var(--text)]',
        compact ? 'h-9 w-9' : 'h-8 w-8',
      )}
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      aria-label="테마 전환"
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}

function ProfilePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { user } = useAuth()
  const name = user?.name || '마케터'
  const isAdmin = user?.role === 'admin'
  const sub = isAdmin ? 'ADMIN' : (!user?.plan || user.plan === '없음' ? '요금제 미가입' : `${user.plan} 플랜`)

  return (
    <>
      <div className={cn('fixed inset-0 z-[60] bg-black/40 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={onClose} />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[61] flex h-full w-[320px] max-w-[86vw] flex-col border-l border-[var(--border)] bg-[var(--bg-soft)] shadow-2xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <p className="text-sm font-bold text-[var(--text)]">내 계정</p>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label="닫기">
            <X size={17} />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
          <AvatarSvg size={44} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[var(--text)]">{name}님</p>
            <p className="truncate text-xs text-[var(--text-dim)]">{user?.email || sub}</p>
            <span className="mt-1 inline-block rounded-md bg-violet-500/12 px-2 py-0.5 text-[11px] font-bold text-violet-600">{sub}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <Link href="/dashboard_USE17237_612/profile" onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-soft)] transition-colors hover:bg-[var(--panel-2)] hover:text-[var(--text)]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--panel-2)]"><Settings size={15} /></span> 프로필 · 설정
          </Link>
          <Link href="/dashboard_USE17237_612/credits" onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-soft)] transition-colors hover:bg-[var(--panel-2)] hover:text-[var(--text)]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--panel-2)]"><CreditCard size={15} /></span> 크레딧 · 결제
          </Link>
          {isAdmin && (
            <Link href="/adminsunkoh028741_11263" onClick={onClose} className="flex items-center gap-3 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Shield size={15} /></span> 관리자 콘솔
            </Link>
          )}
        </nav>

        <div className="space-y-2 border-t border-[var(--border)] p-3">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
            <span className="text-xs font-semibold text-[var(--text-soft)]">테마</span>
            <ThemeToggle compact />
          </div>
          <button
            onClick={async () => { await logout(); router.push('/login') }}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-soft)] transition-colors hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
          >
            <LogOut size={15} /> 로그아웃
          </button>
        </div>
      </aside>
    </>
  )
}

export function TopBar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const hasPlan = user?.role === 'admin' || user?.hasPlan === 1
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const homeActive = pathname === NAV_HOME.href
  const HomeIcon = NAV_HOME.icon

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-soft)]/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 lg:px-4">
        <Logo size={26} href={NAV_HOME.href} />

        {/* 데스크톱 가로 네비 */}
        <nav className="ml-3 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar lg:flex">
          <Link
            href={NAV_HOME.href}
            className={cn(
              'flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors whitespace-nowrap',
              homeActive ? 'bg-[var(--panel-2)] text-violet-700' : 'text-[var(--text-soft)] hover:text-[var(--text)]',
            )}
          >
            <HomeIcon size={14} /> 홈
          </Link>
          {hasPlan ? (
            NAV_CATEGORIES.map((cat) => <CategoryMenu key={cat.id} cat={cat} pathname={pathname} />)
          ) : (
            <Link href="/activate" className="ml-2 flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[13px] font-semibold text-violet-600 hover:bg-violet-500/15">
              <Sparkles size={13} /> 요금제 활성화하기
            </Link>
          )}
        </nav>

        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          <div className="hidden lg:block"><ThemeToggle /></div>
          <button onClick={() => setProfileOpen(true)} title="내 계정" aria-label="내 계정" className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full transition-transform hover:scale-105">
            <AvatarSvg size={30} />
          </button>
          <button onClick={() => setMobileOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-soft)] lg:hidden" aria-label="메뉴">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {mobileOpen && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-soft)] px-3 py-3 lg:hidden">
          <Link href={NAV_HOME.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--text-soft)] hover:bg-[var(--panel-2)]">
            <HomeIcon size={15} /> 홈
          </Link>
          {hasPlan ? (
            NAV_CATEGORIES.map((cat) => (
              <div key={cat.id} className="mt-1">
                <p className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
                  <span className="grid h-4 w-4 place-items-center rounded" style={{ background: `${cat.accent}1f`, color: cat.accent }}><cat.icon size={10} /></span>
                  {cat.title}
                </p>
                {cat.items.map((it) => (
                  <Link key={it.href + it.title} href={it.href} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium', it.href === pathname ? 'text-violet-700' : 'text-[var(--text-soft)] hover:bg-[var(--panel-2)]')}>
                    <it.icon size={14} /> {it.title}
                  </Link>
                ))}
              </div>
            ))
          ) : (
            <Link href="/activate" onClick={() => setMobileOpen(false)} className="mt-2 flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-sm font-semibold text-violet-600">
              <Sparkles size={14} /> 요금제 활성화하기
            </Link>
          )}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
            <span className="text-xs font-semibold text-[var(--text-soft)]">테마</span>
            <ThemeToggle compact />
          </div>
        </div>
      )}
    </header>
    {/* 프로필 패널은 backdrop-blur 헤더 밖(형제)에 렌더 — 그렇지 않으면 fixed 가 헤더 박스에 갇힘 */}
    <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
