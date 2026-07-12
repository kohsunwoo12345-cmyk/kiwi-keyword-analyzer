'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, AlertCircle, Info } from 'lucide-react'
import { Logo } from '@/components/Brand'
import { Button } from '@/components/ui'
import { login } from '@/lib/auth'

const inputBase =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] pl-11 pr-3.5 py-3 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 placeholder:text-[var(--text-dim)]'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.')
      return
    }
    setLoading(true)
    ;(async () => {
      const res = await login(email.trim(), password)
      if (!res.ok || !res.user) {
        setError(res.error || '로그인에 실패했습니다.')
        setLoading(false)
        return
      }
      router.push(res.user.role === 'admin' ? '/admin' : '/dashboard')
    })()
  }

  function fillDemo() {
    setEmail('kohsunwoo12345@gmail.com')
    setPassword('Bygency!2026')
    setError('')
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)]">
      {/* ---- 배경 장식 (은은하게) ---- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-violet-400/25 blur-[120px] animate-drift"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-28 h-[32rem] w-[32rem] rounded-full bg-cyan-300/25 blur-[130px] animate-drift-slow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-fuchsia-300/15 blur-[110px] animate-drift"
      />

      {/* ---- 좌상단 홈으로 ---- */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo size={30} />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/70 px-3.5 py-2 text-sm font-medium text-[var(--text-soft)] backdrop-blur transition-colors hover:border-violet-300 hover:text-[var(--text)]"
        >
          <ArrowLeft size={15} />
          홈으로
        </Link>
      </div>

      {/* ---- 중앙 카드 ---- */}
      <div className="relative z-[1] grid min-h-screen place-items-center px-5 py-24">
        <div className="w-full max-w-md animate-fade-up">
          <div className="card px-7 py-8 shadow-[0_24px_70px_-24px_rgba(20,22,31,0.22)] sm:px-9">
            <div className="flex flex-col items-center text-center">
              <Logo size={34} href={null} />
              <h1 className="mt-6 text-2xl font-bold tracking-tight">다시 오신 걸 환영해요</h1>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                로그인하고 오늘의 마케팅 성과를 확인하세요.
              </p>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  이메일
                </label>
                <div className="relative">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={inputBase}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium">
                    비밀번호
                  </label>
                  <Link
                    href="/login"
                    className="text-xs font-medium text-violet-600 transition-colors hover:text-violet-700"
                  >
                    비밀번호 찾기
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                  />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputBase + ' pr-11'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--text-dim)] transition-colors hover:bg-slate-100 hover:text-[var(--text-soft)]"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-soft)] select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-violet-600 accent-violet-600"
                />
                로그인 상태 유지
              </label>

              <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
                {loading ? '로그인 중…' : '로그인'}
                {!loading && <ArrowRight size={17} />}
              </Button>
            </form>

            {/* ---- 관리자 안내 ---- */}
            <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-3.5 text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-violet-700">
                <Info size={15} />
                관리자 계정
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-[13px] leading-relaxed text-[var(--text-soft)]">
                  <div>
                    아이디{' '}
                    <span className="font-medium text-[var(--text)]">kohsunwoo12345@gmail.com</span>
                  </div>
                  <div>
                    비밀번호 <span className="font-medium text-[var(--text)]">Bygency!2026</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="shrink-0 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                >
                  자동 입력
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--text-soft)]">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="font-semibold text-violet-600 transition-colors hover:text-violet-700"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
