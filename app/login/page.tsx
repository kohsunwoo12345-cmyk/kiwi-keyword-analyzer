'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/Brand'
import { Button } from '@/components/ui'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { GoogleAuthButton, OrDivider } from '@/components/GoogleAuthButton'
import { login } from '@/lib/auth'

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: '구글 로그인이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.',
  google_cancelled: '구글 로그인이 취소되었습니다.',
  state: '보안 검증에 실패했습니다. 다시 시도해 주세요.',
  token: '구글 인증에 실패했습니다. 다시 시도해 주세요.',
  noemail: '구글 계정에서 이메일을 가져오지 못했습니다.',
  google: '구글 로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
  consent_required: '간편로그인도 필수 약관(이용약관·개인정보처리방침)에 동의해야 가입할 수 있습니다.',
  suspended: '정지된 계정입니다. 고객센터에 문의해 주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}

const inputBase =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] pl-11 pr-3.5 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-[var(--text-dim)]'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 구글 OAuth 콜백 오류 메시지 표시
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('error')
      if (code && OAUTH_ERRORS[code]) setError(OAUTH_ERRORS[code])
    } catch {
      /* ignore */
    }
  }, [])

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
      router.push(res.user.role === 'admin' ? '/adminsunkoh028741_11263' : '/dashboard_USE17237_612')
    })()
  }

  return (
    <main className="site-dark relative min-h-screen overflow-hidden">
      {/* ---- 배경 장식 (은은하게) ---- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-blue-700/30 blur-[120px] animate-drift"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-28 h-[32rem] w-[32rem] rounded-full bg-cyan-700/22 blur-[130px] animate-drift-slow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-sky-700/18 blur-[110px] animate-drift"
      />

      {/* ---- 좌상단 홈으로 ---- */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo size={30} wordClassName="text-white" />
        <div className="flex items-center gap-1">
          <LanguageSwitcher variant="dark" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-[var(--text-soft)] backdrop-blur transition-colors hover:border-blue-400/50 hover:text-[var(--text)]"
          >
            <ArrowLeft size={15} />
            홈으로
          </Link>
        </div>
      </div>

      {/* ---- 중앙 카드 ---- */}
      <div className="relative z-[1] grid min-h-screen place-items-center px-5 py-24">
        <div className="w-full max-w-md animate-fade-up">
          <div className="card px-7 py-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)] sm:px-9">
            <div className="flex flex-col items-center text-center">
              <Logo size={34} href={null} wordClassName="text-white" />
              <h1 className="mt-6 text-2xl font-bold tracking-tight">다시 오신 걸 환영해요</h1>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                로그인하고 오늘의 마케팅 성과를 확인하세요.
              </p>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 구글로 로그인 — 약관 동의는 로그인 이후 단계에서 진행 */}
            <div className="mt-6 space-y-4">
              <GoogleAuthButton label="구글로 로그인 (Continue with Google)" />
              <OrDivider text="또는 이메일로 로그인" />
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
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
                    className="text-xs font-medium text-blue-300 transition-colors hover:text-blue-200"
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--text-dim)] transition-colors hover:bg-white/10 hover:text-[var(--text-soft)]"
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
                  className="h-4 w-4 rounded border-[var(--border)] text-blue-600 accent-blue-600"
                />
                로그인 상태 유지
              </label>

              <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
                {loading ? '로그인 중…' : '로그인'}
                {!loading && <ArrowRight size={17} />}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--text-soft)]">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="font-semibold text-blue-300 transition-colors hover:text-blue-200"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
