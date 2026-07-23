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
import { GoogleAuthButton, OrDivider } from '@/components/GoogleAuthButton'
import { signup } from '@/lib/auth'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  // ===== BENEFITS =====
  '랜딩페이지 노코드 빌더로 DB 자동 수집': {
    en: 'Auto-collect leads with a no-code landing page builder',
    ja: 'ノーコードのランディングページビルダーでDBを自動収集',
    zh: '通过无代码落地页构建器自动采集数据',
  },
  '유튜브·블로그·광고 성과 통합 분석 대시보드': {
    en: 'Unified analytics dashboard for YouTube, blog, and ad performance',
    ja: 'YouTube・ブログ・広告の成果を統合分析するダッシュボード',
    zh: '整合分析 YouTube、博客与广告成效的仪表板',
  },
  '문자·알림톡 CRM으로 재구매까지 자동화': {
    en: 'Automate repeat purchases with SMS and KakaoTalk CRM',
    ja: 'SMS・アラームトークCRMでリピート購入まで自動化',
    zh: '通过短信与提醒消息 CRM 实现复购自动化',
  },
  '노드형 AI 영상 스튜디오로 광고·콘텐츠 제작': {
    en: 'Create ads and content with a node-based AI video studio',
    ja: 'ノード型AI動画スタジオで広告・コンテンツを制作',
    zh: '使用节点式 AI 视频工作室制作广告与内容',
  },

  // ===== STATS =====
  '활성 마케터': { en: 'Active marketers', ja: 'アクティブなマーケター', zh: '活跃营销人员' },
  '평균 전환율 상승': { en: 'Avg. conversion lift', ja: '平均コンバージョン率の向上', zh: '平均转化率提升' },
  'ROAS 개선': { en: 'ROAS improvement', ja: 'ROASの改善', zh: 'ROAS 提升' },

  // ===== PASSWORD STRENGTH =====
  '약함': { en: 'Weak', ja: '弱い', zh: '弱' },
  '보통': { en: 'Fair', ja: '普通', zh: '中' },
  '강함': { en: 'Strong', ja: '強い', zh: '强' },

  // ===== VALIDATION / ERRORS =====
  '이름을 입력해 주세요.': { en: 'Please enter your name.', ja: 'お名前を入力してください。', zh: '请输入姓名。' },
  '이메일을 입력해 주세요.': { en: 'Please enter your email.', ja: 'メールアドレスを入力してください。', zh: '请输入邮箱。' },
  '올바른 이메일 형식이 아닙니다.': { en: 'That’s not a valid email format.', ja: '正しいメール形式ではありません。', zh: '邮箱格式不正确。' },
  '비밀번호를 입력해 주세요.': { en: 'Please enter a password.', ja: 'パスワードを入力してください。', zh: '请输入密码。' },
  '비밀번호는 8자 이상이어야 합니다.': { en: 'Password must be at least 8 characters.', ja: 'パスワードは8文字以上である必要があります。', zh: '密码至少需要 8 位。' },
  '비밀번호가 일치하지 않습니다.': { en: 'Passwords do not match.', ja: 'パスワードが一致しません。', zh: '两次密码不一致。' },
  '만 18세 이상만 가입할 수 있습니다. 필수 항목에 동의해 주세요.': {
    en: 'You must be 18 or older to sign up. Please agree to the required items.',
    ja: '18歳以上のみ登録できます。必須項目に同意してください。',
    zh: '仅限 18 岁及以上注册。请同意必填项。',
  },
  '필수 약관에 모두 동의해 주세요.': { en: 'Please agree to all required terms.', ja: 'すべての必須規約に同意してください。', zh: '请同意所有必填条款。' },
  '회원가입에 실패했습니다.': { en: 'Sign-up failed.', ja: '会員登録に失敗しました。', zh: '注册失败。' },

  // ===== HEADER / PROMO =====
  '홈으로': { en: 'Home', ja: 'ホームへ', zh: '返回首页' },
  '올인원 마케팅 플랫폼': { en: 'All-in-one marketing platform', ja: 'オールインワンマーケティングプラットフォーム', zh: '一体化营销平台' },
  'DB 수집부터 분석·CRM까지,': { en: 'From lead collection to analytics and CRM,', ja: 'DB収集から分析・CRMまで、', zh: '从数据采集到分析与 CRM，' },
  '한 곳에서 매출을 만듭니다.': { en: 'build revenue all in one place.', ja: '一つの場所で売上を生み出します。', zh: '在一处创造营收。' },
  '흩어진 마케팅 데이터를 하나로 모아 무엇이 매출을 만드는지 보여드려요. 지금 시작하세요.': {
    en: 'We bring your scattered marketing data together and show you what actually drives revenue. Get started now.',
    ja: '散らばったマーケティングデータを一つにまとめ、何が売上を生むのかをお見せします。今すぐ始めましょう。',
    zh: '将分散的营销数据汇聚一处，向您展示究竟是什么带来了营收。立即开始。',
  },

  // ===== FORM HEADINGS =====
  '지금 시작하기': { en: 'Get started now', ja: '今すぐ始める', zh: '立即开始' },
  '몇 분이면 나만의 워크스페이스가 열려요.': {
    en: 'Your own workspace opens in just a few minutes.',
    ja: '数分であなただけのワークスペースが開きます。',
    zh: '几分钟即可开启您专属的工作空间。',
  },
  '구글로 계속하기 (Continue with Google)': { en: 'Continue with Google', ja: 'Googleで続ける', zh: '使用 Google 继续' },
  '또는 이메일로 가입': { en: 'Or sign up with email', ja: 'またはメールで登録', zh: '或使用邮箱注册' },

  // ===== FIELD LABELS / PLACEHOLDERS =====
  '이름': { en: 'Name', ja: '名前', zh: '姓名' },
  '이메일': { en: 'Email', ja: 'メール', zh: '邮箱' },
  '전화번호': { en: 'Phone number', ja: '電話番号', zh: '电话号码' },
  '회사명': { en: 'Company name', ja: '会社名', zh: '公司名称' },
  '추천인 코드': { en: 'Referral code', ja: '紹介コード', zh: '推荐码' },
  '홍길동': { en: 'John Doe', ja: '山田太郎', zh: '张三' },
  '(주)바이전시': { en: 'BYGENCY Inc.', ja: 'バイジェンシー株式会社', zh: 'BYGENCY 公司' },
  '(선택) 예: BGXXXXXX': { en: '(Optional) e.g. BGXXXXXX', ja: '(任意) 例: BGXXXXXX', zh: '(选填) 例: BGXXXXXX' },
  '비밀번호': { en: 'Password', ja: 'パスワード', zh: '密码' },
  '8자 이상 입력': { en: 'Enter at least 8 characters', ja: '8文字以上で入力', zh: '请输入至少 8 位' },
  '비밀번호 숨기기': { en: 'Hide password', ja: 'パスワードを隠す', zh: '隐藏密码' },
  '비밀번호 표시': { en: 'Show password', ja: 'パスワードを表示', zh: '显示密码' },
  '비밀번호 확인': { en: 'Confirm password', ja: 'パスワードの確認', zh: '确认密码' },
  '비밀번호를 다시 입력': { en: 'Re-enter your password', ja: 'パスワードを再入力', zh: '请再次输入密码' },

  // ===== CONSENT =====
  '약관에 모두 동의합니다': { en: 'Agree to all terms', ja: 'すべての規約に同意します', zh: '同意全部条款' },
  '만 18세 이상입니다.': { en: 'I am 18 or older.', ja: '18歳以上です。', zh: '我已年满 18 岁。' },
  '이용약관': { en: 'Terms of Service', ja: '利用規約', zh: '服务条款' },
  '에 동의합니다.': { en: ' — I agree.', ja: 'に同意します。', zh: '，我同意。' },
  '개인정보 수집·이용 및 처리방침': {
    en: 'Personal Information Collection, Use, and Privacy Policy',
    ja: '個人情報の収集・利用およびプライバシーポリシー',
    zh: '个人信息收集·使用及隐私政策',
  },
  '마케팅 정보 수신에 동의합니다.': {
    en: 'I agree to receive marketing information.',
    ja: 'マーケティング情報の受信に同意します。',
    zh: '我同意接收营销信息。',
  },
  'AI 품질 개선을 위한 데이터 이용에 동의합니다.': {
    en: 'I agree to the use of data to improve AI quality.',
    ja: 'AI品質向上のためのデータ利用に同意します。',
    zh: '我同意为提升 AI 质量而使用数据。',
  },
  '(자세히)': { en: '(details)', ja: '(詳細)', zh: '(详情)' },
  '(필수) ': { en: '(Required) ', ja: '(必須) ', zh: '(必填) ' },
  '(선택) ': { en: '(Optional) ', ja: '(任意) ', zh: '(选填) ' },
  '(선택)': { en: '(Optional)', ja: '(任意)', zh: '(选填)' },

  // ===== SUBMIT / FOOTER =====
  '가입 중…': { en: 'Signing up…', ja: '登録中…', zh: '注册中…' },
  '가입하기': { en: 'Sign up', ja: '会員登録', zh: '注册' },
  '이미 계정이 있으신가요?': { en: 'Already have an account?', ja: 'すでにアカウントをお持ちですか？', zh: '已有账户？' },
  '로그인': { en: 'Log in', ja: 'ログイン', zh: '登录' },
}

const inputBase =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] pl-11 pr-3.5 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-[var(--text-dim)]'

const BENEFITS = [
  '랜딩페이지 노코드 빌더로 DB 자동 수집',
  '유튜브·블로그·광고 성과 통합 분석 대시보드',
  '문자·알림톡 CRM으로 재구매까지 자동화',
  '노드형 AI 영상 스튜디오로 광고·콘텐츠 제작',
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
  const t = useT(M)
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [refCode, setRefCode] = useState('')
  const [ageOk, setAgeOk] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [agreeAi, setAgreeAi] = useState(false)

  const allRequired = ageOk && agreeTerms && agreePrivacy
  const allChecked = allRequired && agreeMarketing && agreeAi
  function toggleAll(v: boolean) {
    setAgeOk(v)
    setAgreeTerms(v)
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
    if (!name.trim()) e.name = t('이름을 입력해 주세요.')
    if (!email.trim()) e.email = t('이메일을 입력해 주세요.')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = t('올바른 이메일 형식이 아닙니다.')
    if (!password) e.password = t('비밀번호를 입력해 주세요.')
    else if (password.length < 8) e.password = t('비밀번호는 8자 이상이어야 합니다.')
    if (confirm !== password) e.confirm = t('비밀번호가 일치하지 않습니다.')
    if (!ageOk) e.agree = t('만 18세 이상만 가입할 수 있습니다. 필수 항목에 동의해 주세요.')
    else if (!agreeTerms || !agreePrivacy) e.agree = t('필수 약관에 모두 동의해 주세요.')
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
        setFormError(res.error || t('회원가입에 실패했습니다.'))
        setLoading(false)
        return
      }
      // 가입 후 사업장 주소 입력 단계로 이동 (관리자는 제외)
      router.push(res.user.role === 'admin' ? '/adminsunkoh028741_11263' : '/complete-profile')
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
            {t('홈으로')}
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
                  {t('올인원 마케팅 플랫폼')}
                </span>
                <h2 className="mt-5 text-[1.7rem] font-bold leading-snug tracking-tight text-balance">
                  {t('DB 수집부터 분석·CRM까지,')}
                  <br />{t('한 곳에서 매출을 만듭니다.')}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  {t('흩어진 마케팅 데이터를 하나로 모아 무엇이 매출을 만드는지 보여드려요. 지금 시작하세요.')}
                </p>
              </div>

              <ul className="mt-8 space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-white/90">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                      <Check size={13} />
                    </span>
                    {t(b)}
                  </li>
                ))}
              </ul>

              <div className="mt-auto grid grid-cols-3 gap-3 border-t border-white/15 pt-6">
                {PROMO_STATS.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold tracking-tight">
                      <Counter to={s.to} decimals={s.decimals ?? 0} suffix={s.suffix} />
                    </div>
                    <div className="mt-1 text-[11px] leading-tight text-white/70">{t(s.label)}</div>
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
              <h1 className="mt-5 text-2xl font-bold tracking-tight lg:mt-0">{t('지금 시작하기')}</h1>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                {t('몇 분이면 나만의 워크스페이스가 열려요.')}
              </p>

              {formError && (
                <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 구글로 계속하기 — 약관 동의는 로그인 이후 단계에서 진행 */}
              <div className="mt-6 space-y-4">
                <GoogleAuthButton label={t('구글로 계속하기 (Continue with Google)')} refCode={refCode} />
                <OrDivider text={t('또는 이메일로 가입')} />
              </div>

              <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
                <Field
                  id="name"
                  label={t('이름')}
                  icon={UserIcon}
                  value={name}
                  onChange={setName}
                  placeholder={t('홍길동')}
                  error={errors.name}
                  autoComplete="name"
                />
                <Field
                  id="email"
                  label={t('이메일')}
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
                  label={t('전화번호')}
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
                  label={t('회사명')}
                  optional
                  icon={Building2}
                  value={company}
                  onChange={setCompany}
                  placeholder={t('(주)바이전시')}
                  autoComplete="organization"
                />
                <Field
                  id="ref"
                  label={t('추천인 코드')}
                  optional
                  icon={UserPlus}
                  value={refCode}
                  onChange={(v) => setRefCode(v.toUpperCase())}
                  placeholder={t('(선택) 예: BGXXXXXX')}
                />

                {/* 비밀번호 */}
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                    {t('비밀번호')}
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
                      placeholder={t('8자 이상 입력')}
                      autoComplete="new-password"
                      className={inputBase + ' pr-11'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? t('비밀번호 숨기기') : t('비밀번호 표시')}
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
                        {t(STRENGTH[strength].label)}
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
                    {t('비밀번호 확인')}
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
                      placeholder={t('비밀번호를 다시 입력')}
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
                    <span>{t('약관에 모두 동의합니다')}</span>
                  </label>

                  <div className="my-2.5 h-px bg-[var(--border)]" />

                  <div className="space-y-2">
                    <ConsentRow
                      checked={ageOk}
                      onChange={setAgeOk}
                      required
                      label={t('만 18세 이상입니다.')}
                    />
                    <ConsentRow
                      checked={agreeTerms}
                      onChange={setAgreeTerms}
                      required
                      label={
                        <>
                          <Link href="/legal/terms" target="_blank" className="font-medium text-blue-300 hover:text-blue-200 hover:underline">
                            {t('이용약관')}
                          </Link>
                          {t('에 동의합니다.')}
                        </>
                      }
                    />
                    <ConsentRow
                      checked={agreePrivacy}
                      onChange={setAgreePrivacy}
                      required
                      label={
                        <>
                          <Link href="/legal/privacy" target="_blank" className="font-medium text-blue-300 hover:text-blue-200 hover:underline">
                            {t('개인정보 수집·이용 및 처리방침')}
                          </Link>
                          {t('에 동의합니다.')}
                        </>
                      }
                    />
                    <ConsentRow
                      checked={agreeMarketing}
                      onChange={setAgreeMarketing}
                      label={t('마케팅 정보 수신에 동의합니다.')}
                    />
                    <ConsentRow
                      checked={agreeAi}
                      onChange={setAgreeAi}
                      label={
                        <>
                          {t('AI 품질 개선을 위한 데이터 이용에 동의합니다.')}{' '}
                          <Link href="/legal/privacy" target="_blank" className="text-blue-300 hover:underline">
                            {t('(자세히)')}
                          </Link>
                        </>
                      }
                    />
                  </div>
                  {errors.agree && <p className="mt-2 text-xs text-rose-300">{errors.agree}</p>}
                </div>

                <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
                  {loading ? t('가입 중…') : t('가입하기')}
                  {!loading && <ArrowRight size={17} />}
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-[var(--text-soft)]">
              {t('이미 계정이 있으신가요?')}{' '}
              <Link
                href="/login"
                className="font-semibold text-blue-300 transition-colors hover:text-blue-200"
              >
                {t('로그인')}
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
  const t = useT(M)
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--text-soft)] select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[var(--border)] accent-blue-600"
      />
      <span className="leading-snug">
        <span className="text-slate-400">
          {required ? t('(필수) ') : t('(선택) ')}
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
  const t = useT(M)
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-[var(--text-dim)]">{t('(선택)')}</span>}
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
