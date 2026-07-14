'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  UserPlus,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/Brand'
import { Button } from '@/components/ui'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Counter } from '@/components/motion'
import { signup } from '@/lib/auth'

const inputBase =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] pl-11 pr-3.5 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-[var(--text-dim)]'

const BENEFITS = [
  '랜딩페이지 노코드 빌더로 DB 자동 수집',
  '유튜브·블로그·광고 성과 통합 분석 대시보드',
  '문자·알림톡 CRM으로 재구매까지 자동화',
  '카드 등록 없이 14일 무료 체험',
]

const PROMO_STATS = [
  { to: 5200, suffix: '+', label: '활성 마케터' },
  { to: 38, suffix: '%', label: '평균 전환율 상승' },
  { to: 2.7, decimals: 1, suffix: 'x', label: 'ROAS 개선' },
]

function scorePassword(pw: string): number {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(3, Math.ceil(s / 2)) // 0~3
}

const STRENGTH = [
  { label: '', color: '' },
  { label: '약함', color: 'bg-rose-500 text-rose-600' },
  { label: '보통', color: 'bg-amber-500 text-amber-600' },
  { label: '강함', color: 'bg-emerald-500 text-emerald-600' },
]

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [refCode, setRefCode] = useState('')
  const [ageOk, setAgeOk] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [agreeAi, setAgreeAi] = useState(false)

  const allRequired = ageOk && agreePrivacy
  const allChecked = allRequired && agreeMarketing && agreeAi
  function toggleAll(v: boolean) {
    setAgeOk(v)
    setAgreePrivacy(v)
    setAgreeMarketing(v)
    setAgreeAi(v)
  }

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('ref')
      if (p) setRefCode(p.toUpperCase())
    } catch {
      /* ignore */
    }
  }, [])
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => scorePassword(password), [password])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '이름을 입력해 주세요.'
    if (!email.trim()) e.email = '이메일을 입력해 주세요.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = '올바른 이메일 형식이 아닙니다.'
    if (!password) e.password = '비밀번호를 입력해 주세요.'
    else if (password.length < 8) e.password = '비밀번호는 8자 이상이어야 합니다.'
    if (confirm !== password) e.confirm = '비밀번호가 일치하지 않습니다.'
    if (!ageOk) e.agree = '만 18세 이상만 가입할 수 있습니다. 필수 항목에 동의해 주세요.'
    else if (!agreePrivacy) e.agree = '필수 약관에 모두 동의해 주세요.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setFormError('')
    if (!validate()) return
    setLoading(true)
    ;(async () => {
      const res = await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        ref: refCode.trim() || undefined,
        marketingConsent: agreeMarketing,
        aiConsent: agreeAi,
      })
      if (!res.ok || !res.user) {
        setFormError(res.error || '회원가입에 실패했습니다.')
        setLoading(false)
        return
      }
      router.push(res.user.role === 'admin' ? '/adminsunkoh028741_11263' : '/dashboard_USE17237_612')
    })()
  }

  return (
    <main className="site-dark relative min-h-screen overflow-hidden">
      {/* ---- 배경 장식 ---- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 -left-32 h-[30rem] w-[30rem] rounded-full bg-blue-700/30 blur-[120px] animate-drift"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 right-1/3 h-[32rem] w-[32rem] rounded-full bg-cyan-700/20 blur-[130px] animate-drift-slow"
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

      <div className="relative z-[1] grid min-h-screen place-items-center px-5 py-24">
        <div className="grid w-full max-w-5xl items-stretch gap-8 lg:grid-cols-2">
          {/* ---- 좌: 브랜드 프로모 패널 (lg 이상) ---- */}
          <aside className="relative hidden overflow-hidden rounded-3xl brand-gradient p-9 text-white lg:flex lg:flex-col">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-white/15 blur-3xl animate-drift"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl animate-drift-slow"
            />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <LogoMark size={26} />
                </span>
                <span className="text-lg font-black tracking-[0.14em]">BYGENCY</span>
              </div>

              <div className="mt-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <Sparkles size={13} />
                  올인원 마케팅 플랫폼
                </span>
                <h2 className="mt-5 text-[1.7rem] font-bold leading-snug tracking-tight text-balance">
                  DB 수집부터 분석·CRM까지,
                  <br />한 곳에서 매출을 만듭니다.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  흩어진 마케팅 데이터를 하나로 모아 무엇이 매출을 만드는지 보여드려요. 지금 무료로
                  시작하세요.
                </p>
              </div>

              <ul className="mt-8 space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-white/90">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                      <Check size={13} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-auto grid grid-cols-3 gap-3 border-t border-white/15 pt-6">
                {PROMO_STATS.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold tracking-tight">
                      <Counter to={s.to} decimals={s.decimals ?? 0} suffix={s.suffix} />
                    </div>
                    <div className="mt-1 text-[11px] leading-tight text-white/70">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ---- 우: 회원가입 폼 ---- */}
          <div className="animate-fade-up">
            <div className="card px-7 py-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)] sm:px-9">
              <div className="lg:hidden">
                <Logo size={32} href={null} wordClassName="text-white" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight lg:mt-0">무료로 시작하기</h1>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                14일 무료 체험, 카드 등록이 필요 없어요.
              </p>

              {formError && (
                <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <Field
                  id="name"
                  label="이름"
                  icon={UserIcon}
                  value={name}
                  onChange={setName}
                  placeholder="홍길동"
                  error={errors.name}
                  autoComplete="name"
                />
                <Field
                  id="email"
                  label="이메일"
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@company.com"
                  error={errors.email}
                  autoComplete="email"
                />
                <Field
                  id="phone"
                  label="전화번호"
                  optional
                  icon={Phone}
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="010-0000-0000"
                  autoComplete="tel"
                />
                <Field
                  id="company"
                  label="회사명"
                  optional
                  icon={Building2}
                  value={company}
                  onChange={setCompany}
                  placeholder="(주)바이전시"
                  autoComplete="organization"
                />
                <Field
                  id="ref"
                  label="추천인 코드"
                  optional
                  icon={UserPlus}
                  value={refCode}
                  onChange={(v) => setRefCode(v.toUpperCase())}
                  placeholder="(선택) 예: BGXXXXXX"
                />

                {/* 비밀번호 */}
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                    />
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8자 이상 입력"
                      autoComplete="new-password"
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
                  {/* 강도 표시 */}
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex flex-1 gap-1.5">
                        {[1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={
                              'h-1.5 flex-1 rounded-full transition-colors ' +
                              (i <= strength ? STRENGTH[strength].color.split(' ')[0] : 'bg-white/12')
                            }
                          />
                        ))}
                      </div>
                      <span
                        className={
                          'text-xs font-semibold ' + STRENGTH[strength].color.split(' ')[1]
                        }
                      >
                        {STRENGTH[strength].label}
                      </span>
                    </div>
                  )}
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-rose-300">{errors.password}</p>
                  )}
                </div>

                {/* 비밀번호 확인 */}
                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                    />
                    <input
                      id="confirm"
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="비밀번호를 다시 입력"
                      autoComplete="new-password"
                      className={inputBase}
                    />
                    {confirm && confirm === password && (
                      <Check
                        size={17}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500"
                      />
                    )}
                  </div>
                  {errors.confirm && (
                    <p className="mt-1.5 text-xs text-rose-300">{errors.confirm}</p>
                  )}
                </div>

                {/* 약관 동의 */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3.5">
                  {/* 모두 동의 */}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="h-[18px] w-[18px] rounded border-[var(--border)] accent-blue-600"
                    />
                    <span>약관에 모두 동의합니다</span>
                  </label>

                  <div className="my-2.5 h-px bg-[var(--border)]" />

                  <div className="space-y-2">
                    <ConsentRow
                      checked={ageOk}
                      onChange={setAgeOk}
                      required
                      label="만 18세 이상입니다."
                    />
                    <ConsentRow
                      checked={agreePrivacy}
                      onChange={setAgreePrivacy}
                      required
                      label={
                        <>
                          <Link href="/legal/privacy" target="_blank" className="font-medium text-blue-300 hover:text-blue-200 hover:underline">
                            개인정보 수집·이용 및 처리방침
                          </Link>
                          에 동의합니다.
                        </>
                      }
                    />
                    <ConsentRow
                      checked={agreeMarketing}
                      onChange={setAgreeMarketing}
                      label="마케팅 정보 수신에 동의합니다."
                    />
                    <ConsentRow
                      checked={agreeAi}
                      onChange={setAgreeAi}
                      label={
                        <>
                          AI 품질 개선을 위한 데이터 이용에 동의합니다.{' '}
                          <Link href="/legal/privacy" target="_blank" className="text-blue-300 hover:underline">
                            (자세히)
                          </Link>
                        </>
                      }
                    />
                  </div>
                  {errors.agree && <p className="mt-2 text-xs text-rose-300">{errors.agree}</p>}
                </div>

                <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
                  {loading ? '가입 중…' : '무료로 시작하기'}
                  {!loading && <ArrowRight size={17} />}
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-[var(--text-soft)]">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="font-semibold text-blue-300 transition-colors hover:text-blue-200"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

/* ---------- 동의 항목 ---------- */
function ConsentRow({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--text-soft)] select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[var(--border)] accent-blue-600"
      />
      <span className="leading-snug">
        <span className={required ? 'text-rose-400' : 'text-[var(--text-dim)]'}>
          {required ? '(필수) ' : '(선택) '}
        </span>
        {label}
      </span>
    </label>
  )
}

/* ---------- 재사용 입력 필드 ---------- */
function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  optional,
  autoComplete,
}: {
  id: string
  label: string
  icon: typeof Mail
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  optional?: boolean
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-[var(--text-dim)]">(선택)</span>}
      </label>
      <div className="relative">
        <Icon
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
        />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={inputBase}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </div>
  )
}
