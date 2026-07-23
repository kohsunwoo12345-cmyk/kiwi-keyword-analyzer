'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, LogOut, Shield, Moon, Sun, Monitor, CreditCard, Settings } from 'lucide-react'
import { useAuth, logout } from '@/lib/auth'
import { useDashTheme } from '@/components/dash/DashThemeProvider'
import { cn } from '@/lib/utils'

// 스튜디오 노드와 동일한 프로필 아바타 SVG (그라디언트 인물 원형)
export function AvatarSvg({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="url(#bg_pfg)" />
      <circle cx="12" cy="9.4" r="3.4" fill="#fff" />
      <path d="M5.6 19.2c.8-3.2 3.3-4.9 6.4-4.9s5.6 1.7 6.4 4.9A11 11 0 0112 21a11 11 0 01-6.4-1.8z" fill="#fff" />
      <defs>
        <linearGradient id="bg_pfg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// 시스템 / 라이트 / 다크 3분할 세그먼트 컨트롤
function PanelThemeToggle() {
  const { mode, setMode } = useDashTheme()
  const opts: { key: 'system' | 'light' | 'dark'; label: string; icon: typeof Monitor }[] = [
    { key: 'system', label: '시스템', icon: Monitor },
    { key: 'light', label: '라이트', icon: Sun },
    { key: 'dark', label: '다크', icon: Moon },
  ]
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-0.5">
      {opts.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          title={label}
          aria-label={label}
          aria-pressed={mode === key}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
            mode === key
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-[var(--text-dim)] hover:text-[var(--text)]',
          )}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  )
}

/** 스튜디오 노드형 계정 슬라이드 패널 — 아바타 클릭 시 우측에서 슬라이드 */
export function AccountPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const name = user?.name || '마케터'
  const isAdmin = user?.role === 'admin'
  const sub = isAdmin ? 'ADMIN' : (!user?.plan || user.plan === '없음' ? '요금제 미가입' : `${user.plan} 플랜`)

  if (!mounted) return null
  // 사이드바(sticky=스태킹 컨텍스트) 밖 document.body 로 포털 → z-index 가 페이지 콘텐츠 위에서 정상 동작
  return createPortal(
    (
    <>
      <div
        className={cn('fixed inset-0 z-[60] bg-black/40 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
      />
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
            <span className="mt-1 inline-block rounded-md bg-blue-500/12 px-2 py-0.5 text-[11px] font-bold text-blue-600">{sub}</span>
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
            <PanelThemeToggle />
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
    ),
    document.body,
  )
}

/** 사이드바 하단용: 아바타+이름 버튼 → 클릭 시 계정 패널 오픈 */
export function AccountTrigger() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const name = user?.name || '마케터'
  const sub = user?.role === 'admin' ? 'ADMIN' : (!user?.plan || user.plan === '없음' ? '요금제 미가입' : `${user.plan} 플랜`)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="내 계정"
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-2.5 text-left transition-all hover:border-blue-300"
      >
        <AvatarSvg size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text)]">{name}님</p>
          <p className="truncate text-xs text-[var(--text-dim)]">{sub}</p>
        </div>
      </button>
      <AccountPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
