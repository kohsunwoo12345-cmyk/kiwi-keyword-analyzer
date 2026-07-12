'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X, ArrowRight, ChevronDown, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui'
import { Logo } from '@/components/Brand'
import { MegaNodeStudio } from '@/components/MegaNodeStudio'
import { FEATURES } from '@/lib/features'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/pricing', label: '요금제' },
  { href: '/about', label: '회사소개' },
  { href: '/contact', label: '문의' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [mega, setMega] = useState(false)
  const [mOpenFeatures, setMOpenFeatures] = useState(false)
  const { user, ready } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const loggedIn = ready && !!user

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-500',
        scrolled || mega ? 'glass border-b border-[var(--border)] shadow-sm' : 'bg-transparent',
      )}
    >
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex h-16 items-center justify-between">
          <Logo size={32} className="transition-transform duration-300 hover:scale-[1.03]" />

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <div
              className="relative"
              onMouseEnter={() => setMega(true)}
              onMouseLeave={() => setMega(false)}
            >
              <button
                className={cn(
                  'group flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  mega ? 'text-[var(--text)]' : 'text-[var(--text-soft)] hover:text-[var(--text)]',
                )}
              >
                제품
                <ChevronDown size={15} className={cn('transition-transform duration-300', mega && 'rotate-180')} />
              </button>
            </div>
            {LINKS.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="group relative rounded-lg px-3.5 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:text-[var(--text)]"
              >
                {n.label}
                <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full brand-gradient transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          {/* desktop CTA */}
          <div className="hidden items-center gap-2 md:flex">
            {loggedIn ? (
              <Button href="/dashboard_USE17237_612" size="sm" className="group">
                <LayoutDashboard size={15} /> 대시보드
                <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            ) : (
              <>
                <Button href="/login" variant="ghost" size="sm">
                  로그인
                </Button>
                <Button href="/signup" size="sm" className="group">
                  무료로 시작하기
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </Button>
              </>
            )}
          </div>

          {/* mobile toggle */}
          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-[var(--text-soft)] md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="메뉴"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ===== MEGA MENU (desktop) ===== */}
      <div
        className={cn(
          'absolute inset-x-0 top-full hidden origin-top md:block',
          mega ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          'transition-opacity duration-200',
        )}
        onMouseEnter={() => setMega(true)}
        onMouseLeave={() => setMega(false)}
      >
        <div className="glass border-b border-[var(--border)] shadow-xl">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[1fr_300px]">
            <div>
              <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                올인원 마케팅 기능
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {FEATURES.map((f) => {
                  const Icon = f.icon
                  return (
                    <Link
                      key={f.slug}
                      href={`/features/${f.slug}`}
                      onClick={() => setMega(false)}
                      className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-white"
                    >
                      <span
                        className={cn(
                          'grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-110',
                          f.color,
                        )}
                      >
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          {f.title}
                          <ArrowRight
                            size={13}
                            className="-translate-x-1 text-violet-500 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                          />
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-soft)]">{f.desc}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* promo: NODE STUDIO 애니메이션 */}
            <MegaNodeStudio onNavigate={() => setMega(false)} />
          </div>
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      {open && (
        <div className="glass max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-[var(--border)] md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-5 py-4">
            <button
              onClick={() => setMOpenFeatures((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-soft)] hover:bg-slate-100 hover:text-[var(--text)]"
            >
              제품
              <ChevronDown size={16} className={cn('transition-transform', mOpenFeatures && 'rotate-180')} />
            </button>
            {mOpenFeatures && (
              <div className="space-y-0.5 pb-1 pl-2">
                {FEATURES.map((f) => {
                  const Icon = f.icon
                  return (
                    <Link
                      key={f.slug}
                      href={`/features/${f.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-soft)] hover:bg-slate-100 hover:text-[var(--text)]"
                    >
                      <span className={cn('grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white', f.color)}>
                        <Icon size={15} />
                      </span>
                      {f.title}
                    </Link>
                  )
                })}
              </div>
            )}
            {LINKS.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-soft)] hover:bg-slate-100 hover:text-[var(--text)]"
              >
                {n.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {loggedIn ? (
                <Button href="/dashboard_USE17237_612" className="flex-1">
                  <LayoutDashboard size={15} /> 대시보드로 이동
                </Button>
              ) : (
                <>
                  <Button href="/login" variant="outline" className="flex-1">
                    로그인
                  </Button>
                  <Button href="/signup" className="flex-1">
                    시작하기
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
