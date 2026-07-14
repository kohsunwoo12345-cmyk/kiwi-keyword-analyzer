'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, ArrowUpRight } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { cn } from '@/lib/utils'

export const LEGAL_DOCS = [
  { href: '/legal/terms', label: '이용약관' },
  { href: '/legal/privacy', label: '개인정보처리방침' },
  { href: '/legal/cookies', label: '쿠키정책' },
  { href: '/legal/dpa', label: '개인정보처리위탁 특약' },
  { href: '/legal/regional', label: '지역별 적용 부속서' },
]

export function LegalShell({
  title,
  effective,
  children,
}: {
  title: string
  effective?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <div className="site-dark min-h-screen overflow-x-hidden">
      <Navbar />

      {/* header */}
      <section className="relative overflow-hidden border-b border-white/10 pt-36 pb-14 text-white">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[900px] -translate-x-1/2 rounded-full bg-blue-700/20 blur-[130px]" />
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-20 mask-fade-b" />
        <div className="relative mx-auto max-w-4xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-blue-200 backdrop-blur">
            <FileText size={13} /> 법적 고지 · Legal
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          {effective && (
            <p className="mt-4 text-sm text-slate-400">
              시행일: <span className="font-medium text-slate-200">{effective}</span>
            </p>
          )}
        </div>
      </section>

      {/* body */}
      <section className="relative py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[210px_1fr]">
          {/* side nav */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              문서 목록
            </p>
            <nav className="flex flex-col gap-1">
              {LEGAL_DOCS.map((d) => {
                const active = pathname === d.href
                return (
                  <Link
                    key={d.href}
                    href={d.href}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'brand-gradient font-semibold text-white shadow-sm'
                        : 'text-[var(--text-soft)] hover:bg-white/[0.05] hover:text-[var(--text)]',
                    )}
                  >
                    {d.label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-xs leading-relaxed text-[var(--text-soft)]">
              문의: 개인정보 보호책임자
              <br />
              <a href="mailto:kohheejun3394@gmail.com" className="font-medium text-blue-300 hover:underline">
                kohheejun3394@gmail.com
              </a>
            </div>
          </aside>

          {/* article */}
          <article className="min-w-0">
            <div className="card p-6 sm:p-9">
              <div className="legal-prose">{children}</div>
            </div>

            {/* other docs */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {LEGAL_DOCS.filter((d) => d.href !== pathname).map((d) => (
                <Link
                  key={d.href}
                  href={d.href}
                  className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-[var(--text-soft)] transition-colors hover:border-blue-400/40 hover:text-[var(--text)]"
                >
                  {d.label}
                  <ArrowUpRight size={16} className="text-blue-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      <Footer />
    </div>
  )
}
