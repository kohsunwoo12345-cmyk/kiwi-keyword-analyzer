'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { Logo } from '@/components/Brand'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/#features', label: '기능' },
  { href: '/#how', label: '작동방식' },
  { href: '/#pricing', label: '요금제' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-500',
        scrolled ? 'glass border-b border-[var(--border)] shadow-sm' : 'bg-transparent',
      )}
    >
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex h-16 items-center justify-between">
          <Logo size={32} className="transition-transform duration-300 hover:scale-[1.03]" />

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
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

          <div className="hidden items-center gap-2 md:flex">
            <Button href="/login" variant="ghost" size="sm">
              로그인
            </Button>
            <Button href="/signup" size="sm" className="group">
              무료로 시작하기
              <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          </div>

          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-[var(--text-soft)] md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="메뉴"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="glass border-t border-[var(--border)] md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-5 py-4">
            {NAV.map((n) => (
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
              <Button href="/login" variant="outline" className="flex-1">
                로그인
              </Button>
              <Button href="/signup" className="flex-1">
                시작하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
