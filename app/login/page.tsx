'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, AlertCircle, X, KeyRound, CheckCircle2, Loader2 } from 'lucide-react'
import { Logo } from '@/components/Brand'
import { Button } from '@/components/ui'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { GoogleAuthButton, OrDivider } from '@/components/GoogleAuthButton'
import { login, requestPasswordReset, resetPassword } from '@/lib/auth'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

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

/* 로그인·비밀번호 찾기 다국어 사전 (한국어 원문 → 번역, 없으면 한국어 폴백) */
const DICT: Dict = {
  '다시 오신 걸 환영해요': { en: 'Welcome back', ja: 'おかえりなさい', zh: '欢迎回来' },
  '로그인하고 오늘의 마케팅 성과를 확인하세요.': { en: 'Sign in and check today’s marketing performance.', ja: 'ログインして今日のマーケティング成果を確認しましょう。', zh: '登录并查看今天的营销成效。' },
  '이메일': { en: 'Email', ja: 'メール', zh: '邮箱' },
  '비밀번호': { en: 'Password', ja: 'パスワード', zh: '密码' },
  '비밀번호 찾기': { en: 'Forgot password?', ja: 'パスワードを忘れた', zh: '找回密码' },
  '로그인 상태 유지': { en: 'Keep me signed in', ja: 'ログイン状態を保持', zh: '保持登录' },
  '로그인': { en: 'Sign in', ja: 'ログイン', zh: '登录' },
  '로그인 중…': { en: 'Signing in…', ja: 'ログイン中…', zh: '登录中…' },
  '또는': { en: 'or', ja: 'または', zh: '或' },
  '구글로 로그인 (Continue with Google)': { en: 'Continue with Google', ja: 'Googleでログイン', zh: '使用 Google 登录' },
  '계정이 없으신가요?': { en: 'Don’t have an account?', ja: 'アカウントをお持ちでないですか？', zh: '还没有账号？' },
  '회원가입': { en: 'Sign up', ja: '新規登録', zh: '注册' },
  '홈으로': { en: 'Home', ja: 'ホームへ', zh: '返回首页' },
  '이메일과 비밀번호를 모두 입력해 주세요.': { en: 'Please enter both your email and password.', ja: 'メールとパスワードを入力してください。', zh: '请输入邮箱和密码。' },
  '로그인에 실패했습니다.': { en: 'Sign-in failed.', ja: 'ログインに失敗しました。', zh: '登录失败。' },
  // ── 비밀번호 찾기 모달 ──
  '비밀번호 재설정': { en: 'Reset password', ja: 'パスワード再設定', zh: '重置密码' },
  '가입하신 이메일로 6자리 인증코드를 보내드립니다.': { en: 'We’ll send a 6-digit verification code to your email.', ja: '登録メールに6桁の認証コードを送ります。', zh: '我们会向您的邮箱发送 6 位验证码。' },
  '인증코드 받기': { en: 'Send code', ja: 'コードを送る', zh: '获取验证码' },
  '발송 중…': { en: 'Sending…', ja: '送信中…', zh: '发送中…' },
  '인증코드를 이메일로 보냈습니다. 코드와 새 비밀번호를 입력하세요.': { en: 'We sent a code to your email. Enter the code and a new password.', ja: '認証コードを送りました。コードと新しいパスワードを入力してください。', zh: '验证码已发送到邮箱。请输入验证码和新密码。' },
  '인증코드 (6자리)': { en: 'Verification code (6 digits)', ja: '認証コード（6桁）', zh: '验证码（6位）' },
  '새 비밀번호 (8자 이상)': { en: 'New password (min. 8 chars)', ja: '新しいパスワード（8文字以上）', zh: '新密码（至少 8 位）' },
  '새 비밀번호 확인': { en: 'Confirm new password', ja: '新しいパスワード（確認）', zh: '确认新密码' },
  '비밀번호가 일치하지 않습니다.': { en: 'Passwords do not match.', ja: 'パスワードが一致しません。', zh: '两次密码不一致。' },
  '비밀번호 변경': { en: 'Change password', ja: 'パスワードを変更', zh: '修改密码' },
  '변경 중…': { en: 'Changing…', ja: '変更中…', zh: '修改中…' },
  '비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.': { en: 'Your password has been changed. Sign in with your new password.', ja: 'パスワードを変更しました。新しいパスワードでログインしてください。', zh: '密码已修改。请使用新密码登录。' },
  '올바른 이메일을 입력하세요.': { en: 'Please enter a valid email.', ja: '正しいメールを入力してください。', zh: '请输入有效的邮箱。' },
  '코드와 새 비밀번호를 입력하세요.': { en: 'Enter the code and a new password.', ja: 'コードと新しいパスワードを入力してください。', zh: '请输入验证码和新密码。' },
  '닫기': { en: 'Close', ja: '閉じる', zh: '关闭' },
  '이메일 재발송': { en: 'Resend email', ja: 'メール再送', zh: '重新发送' },
}

const inputBase =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] pl-11 pr-3.5 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-[var(--text-dim)]'

export default function LoginPage() {
  const router = useRouter()
  const t = useT(DICT)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

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
      setError(t('이메일과 비밀번호를 모두 입력해 주세요.'))
      return
    }
    setLoading(true)
    ;(async () => {
      const res = await login(email.trim(), password)
      if (!res.ok || !res.user) {
        setError(res.error || t('로그인에 실패했습니다.'))
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
            {t('홈으로')}
          </Link>
        </div>
      </div>

      {/* ---- 중앙 카드 ---- */}
      <div className="relative z-[1] grid min-h-screen place-items-center px-5 py-24">
        <div className="w-full max-w-md animate-fade-up">
          <div className="card px-7 py-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)] sm:px-9">
            <div className="flex flex-col items-center text-center">
              <Logo size={34} href={null} wordClassName="text-white" />
              <h1 className="mt-6 text-2xl font-bold tracking-tight">{t('다시 오신 걸 환영해요')}</h1>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                {t('로그인하고 오늘의 마케팅 성과를 확인하세요.')}
              </p>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  {t('이메일')}
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
                    {t('비밀번호')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-medium text-blue-300 transition-colors hover:text-blue-200"
                  >
                    {t('비밀번호 찾기')}
                  </button>
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
                {t('로그인 상태 유지')}
              </label>

              <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
                {loading ? t('로그인 중…') : t('로그인')}
                {!loading && <ArrowRight size={17} />}
              </Button>
            </form>

            {/* 구글로 로그인 — 하단, 약관 동의는 로그인 이후 단계에서 진행 */}
            <div className="mt-6 space-y-4">
              <OrDivider text={t('또는')} />
              <GoogleAuthButton label={t('구글로 로그인 (Continue with Google)')} />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--text-soft)]">
            {t('계정이 없으신가요?')}{' '}
            <Link
              href="/signup"
              className="font-semibold text-blue-300 transition-colors hover:text-blue-200"
            >
              {t('회원가입')}
            </Link>
          </p>
        </div>
      </div>

      {forgotOpen && <ForgotPasswordModal t={t} initialEmail={email} onClose={() => setForgotOpen(false)} />}
    </main>
  )
}

/* ───────── 비밀번호 찾기 모달 (이메일 코드 인증) ───────── */
function ForgotPasswordModal({
  t,
  initialEmail,
  onClose,
}: {
  t: (ko: string) => string
  initialEmail: string
  onClose: () => void
}) {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [next, setNext] = useState('')
  const [next2, setNext2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())

  async function sendCode() {
    setErr('')
    if (!emailValid) return setErr(t('올바른 이메일을 입력하세요.'))
    setBusy(true)
    const r = await requestPasswordReset(email.trim().toLowerCase())
    setBusy(false)
    if (r.ok) setStep('code')
    else setErr(r.error || t('올바른 이메일을 입력하세요.'))
  }

  async function doReset() {
    setErr('')
    if (code.trim().length < 4 || next.length < 8) return setErr(t('코드와 새 비밀번호를 입력하세요.'))
    if (next !== next2) return setErr(t('비밀번호가 일치하지 않습니다.'))
    setBusy(true)
    const r = await resetPassword(email.trim().toLowerCase(), code.trim(), next)
    setBusy(false)
    if (r.ok) setStep('done')
    else setErr(r.error || t('코드와 새 비밀번호를 입력하세요.'))
  }

  const boxCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-[var(--text-dim)]'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-5">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-fade-up rounded-2xl border border-white/10 bg-[#0b1120] p-7 shadow-2xl">
        <button
          onClick={onClose}
          aria-label={t('닫기')}
          className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
          {step === 'done' ? <CheckCircle2 size={22} /> : <KeyRound size={22} />}
        </div>
        <h2 className="mt-4 text-lg font-bold">{t('비밀번호 재설정')}</h2>

        {step === 'email' && (
          <>
            <p className="mt-1.5 text-sm text-[var(--text-soft)]">{t('가입하신 이메일로 6자리 인증코드를 보내드립니다.')}</p>
            <div className="mt-5 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                placeholder="you@company.com"
                className={boxCls}
                autoFocus
              />
              {err && <p className="text-xs text-rose-300">{err}</p>}
              <Button size="lg" className="w-full" disabled={busy} onClick={sendCode}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {busy ? t('발송 중…') : t('인증코드 받기')}
              </Button>
            </div>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="mt-1.5 text-sm text-[var(--text-soft)]">{t('인증코드를 이메일로 보냈습니다. 코드와 새 비밀번호를 입력하세요.')}</p>
            <div className="mt-5 space-y-3">
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder={t('인증코드 (6자리)')}
                className={boxCls + ' text-center tracking-[0.4em] font-semibold'}
                autoFocus
              />
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doReset()}
                  placeholder={t('새 비밀번호 (8자 이상)')}
                  className={boxCls + ' pr-11'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--text-dim)] hover:bg-white/10 hover:text-[var(--text-soft)]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                value={next2}
                onChange={(e) => setNext2(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doReset()}
                placeholder={t('새 비밀번호 확인')}
                className={cn(boxCls, next2 && next !== next2 && 'border-rose-400/60')}
                autoComplete="new-password"
              />
              {next2 && next !== next2 && <p className="text-xs text-rose-300">{t('비밀번호가 일치하지 않습니다.')}</p>}
              {err && <p className="text-xs text-rose-300">{err}</p>}
              <Button size="lg" className="w-full" disabled={busy} onClick={doReset}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {busy ? t('변경 중…') : t('비밀번호 변경')}
              </Button>
              <button onClick={sendCode} disabled={busy} className="w-full text-center text-xs text-blue-300 hover:text-blue-200">
                {t('이메일 재발송')}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <p className="mt-1.5 text-sm text-[var(--text-soft)]">{t('비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.')}</p>
            <Button size="lg" className="mt-5 w-full" onClick={onClose}>
              {t('로그인')}
              <ArrowRight size={16} />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
