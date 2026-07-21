'use client'

import { useEffect, useRef, useState } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { LANGS, useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * 언어 선택 드롭다운.
 * variant='dark'  → 다크 네비/페이지용 (기본)
 * variant='light' → 밝은 배경용
 */
export function LanguageSwitcher({
  variant = 'dark',
  className,
}: {
  variant?: 'dark' | 'light'
  className?: string
}) {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGS.find((l) => l.code === lang) || LANGS[0]

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const dark = variant === 'dark'

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="언어 선택 / Language"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
          dark
            ? 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
            : 'text-[var(--text-soft)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]',
        )}
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{current.native}</span>
        <ChevronDown size={13} className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-40 overflow-y-auto rounded-xl border p-1 shadow-xl',
            dark
              ? 'border-white/10 bg-[#0b1120]/95 backdrop-blur-xl'
              : 'border-[var(--border)] bg-white',
          )}
        >
          {LANGS.map((l) => {
            const active = l.code === lang
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? dark
                      ? 'bg-white/[0.08] font-semibold text-white'
                      : 'bg-blue-50 font-semibold text-blue-700'
                    : dark
                      ? 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      : 'text-[var(--text-soft)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]',
                )}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="flex-1 text-left">{l.native}</span>
                {active && <Check size={14} className={dark ? 'text-blue-300' : 'text-blue-600'} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
