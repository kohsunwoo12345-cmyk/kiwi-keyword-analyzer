'use client'

import { useState, type FormEvent } from 'react'
import {
  Mail,
  Phone,
  Clock,
  Building2,
  Send,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SectionTag } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { sendContact } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  // CONTACT_INFO labels
  '비즈니스 문의': { en: 'Business Inquiries', ja: 'ビジネスに関するお問い合わせ', zh: '商务咨询' },
  '공식 문의 메일': { en: 'Official Support Email', ja: '公式お問い合わせメール', zh: '官方咨询邮箱' },
  '운영 시간': { en: 'Business Hours', ja: '営業時間', zh: '运营时间' },
  '운영사': { en: 'Operating Company', ja: '運営会社', zh: '运营公司' },
  '평일 10:00 - 18:00': { en: 'Weekdays 10:00 - 18:00', ja: '平日 10:00〜18:00', zh: '工作日 10:00 - 18:00' },

  // Hero
  '문의': { en: 'Contact', ja: 'お問い合わせ', zh: '联系我们' },
  '혼자 고민하지 말고, 물어보세요': {
    en: 'Don’t figure it out alone—just ask',
    ja: '一人で悩まず、お気軽にご相談ください',
    zh: '别再独自纠结，直接问我们吧',
  },
  '우리 팀에 맞을지, 어떤 플랜이 좋을지 혼자 재보느라 시간을 흘려보내지 마세요. 상황만 남겨주시면 담당자가 직접 확인하고, 꼭 필요한 답만 정리해 연락드리겠습니다.':
    {
      en: 'Don’t waste time wondering on your own whether it fits your team or which plan is best. Just tell us your situation—our team will review it personally and get back to you with exactly the answers you need.',
      ja: 'チームに合うのか、どのプランが良いのかを一人で見極めようとして時間を無駄にしないでください。状況をお知らせいただければ、担当者が直接確認し、本当に必要な回答だけをまとめてご連絡します。',
      zh: '不必独自琢磨它是否适合您的团队、哪个方案更合适而白白浪费时间。只要留下您的情况，我们的负责人会亲自查看，并整理出您真正需要的答复与您联系。',
    },

  // Info card
  '연락처 안내': { en: 'Contact Information', ja: 'お問い合わせ先', zh: '联系方式' },
  '영업 시간 내 접수된 문의는 담당자가 직접 확인합니다. 편한 채널로 연락 주세요.': {
    en: 'Inquiries received during business hours are reviewed personally by our team. Reach out through whichever channel works best for you.',
    ja: '営業時間内に届いたお問い合わせは、担当者が直接確認いたします。ご都合の良いチャネルでご連絡ください。',
    zh: '在营业时间内收到的咨询将由负责人亲自查看。请通过您方便的渠道与我们联系。',
  },

  // Shortcuts
  '바로가기': { en: 'Quick Links', ja: 'ショートカット', zh: '快捷入口' },
  '요금제 안내 보기': { en: 'View Pricing Plans', ja: '料金プランを見る', zh: '查看价格方案' },
  '기능 둘러보기': { en: 'Explore Features', ja: '機能を見る', zh: '浏览功能' },

  // Form labels
  '이름': { en: 'Name', ja: 'お名前', zh: '姓名' },
  '이메일': { en: 'Email', ja: 'メールアドレス', zh: '邮箱' },
  '연락처': { en: 'Phone', ja: '電話番号', zh: '联系电话' },
  '회사명': { en: 'Company', ja: '会社名', zh: '公司名称' },
  '문의 내용': { en: 'Message', ja: 'お問い合わせ内容', zh: '咨询内容' },

  // Placeholders
  '홍길동': { en: 'John Doe', ja: '山田 太郎', zh: '张三' },
  'you@company.com': { en: 'you@company.com', ja: 'you@company.com', zh: 'you@company.com' },
  '010-0000-0000': { en: '010-0000-0000', ja: '010-0000-0000', zh: '010-0000-0000' },
  '(선택) 회사·팀 이름': {
    en: '(Optional) Company or team name',
    ja: '（任意）会社・チーム名',
    zh: '（选填）公司或团队名称',
  },
  '어떤 점이 궁금하신가요? 도입 규모나 목표를 함께 남겨주시면 더 정확히 안내해 드립니다.': {
    en: 'What would you like to know? Share your rollout scale or goals and we’ll give you more precise guidance.',
    ja: '何が気になっていますか？導入規模や目標も一緒にお知らせいただくと、より的確にご案内できます。',
    zh: '您想了解些什么？如果一并留下使用规模或目标，我们能为您提供更精准的说明。',
  },

  // Helper text
  '이메일 또는 전화번호 중 하나는 꼭 남겨주세요.': {
    en: 'Please leave at least one—either an email or a phone number.',
    ja: 'メールアドレスか電話番号のいずれかは必ずご記入ください。',
    zh: '请务必留下邮箱或电话号码中的任意一项。',
  },

  // Validation / errors
  '이름을 입력해주세요.': {
    en: 'Please enter your name.',
    ja: 'お名前を入力してください。',
    zh: '请输入您的姓名。',
  },
  '이메일 또는 전화번호 중 하나는 입력해주세요.': {
    en: 'Please enter either an email or a phone number.',
    ja: 'メールアドレスか電話番号のいずれかを入力してください。',
    zh: '请输入邮箱或电话号码中的任意一项。',
  },
  '문의 내용을 입력해주세요.': {
    en: 'Please enter your message.',
    ja: 'お問い合わせ内容を入力してください。',
    zh: '请输入咨询内容。',
  },
  '문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.': {
    en: 'Failed to submit your inquiry. Please try again shortly.',
    ja: 'お問い合わせの送信に失敗しました。しばらくしてからもう一度お試しください。',
    zh: '咨询提交失败，请稍后再试。',
  },

  // Success state
  '문의가 접수되었습니다': {
    en: 'Your inquiry has been received',
    ja: 'お問い合わせを受け付けました',
    zh: '您的咨询已收到',
  },
  '담당자가 내용을 확인하고 영업일 기준으로 순차 연락드립니다. 먼저 시작해 보고 싶다면, 기다리는 동안 무료로 둘러보셔도 좋습니다.':
    {
      en: 'Our team will review your message and get back to you in order on business days. If you’d like to get started right away, feel free to explore for free while you wait.',
      ja: '担当者が内容を確認し、営業日順に順次ご連絡いたします。すぐに始めてみたい方は、お待ちの間に無料でご覧いただくこともできます。',
      zh: '负责人会查看您的内容，并按工作日顺序依次与您联系。如果您想先行体验，等待期间也欢迎免费浏览。',
    },
  '새 문의 작성하기': {
    en: 'Write a new inquiry',
    ja: '新しいお問い合わせを作成',
    zh: '撰写新咨询',
  },

  // Submit button
  '보내는 중...': { en: 'Sending...', ja: '送信中...', zh: '发送中...' },
  '문의 보내기': { en: 'Send Inquiry', ja: 'お問い合わせを送信', zh: '发送咨询' },

  // Consent note
  '제출 시 문의 처리를 위한 개인정보 이용에 동의하는 것으로 간주됩니다.': {
    en: 'By submitting, you are considered to consent to the use of your personal information for processing this inquiry.',
    ja: '送信をもって、お問い合わせ対応のための個人情報の利用に同意したものとみなされます。',
    zh: '提交即视为您同意为处理此咨询而使用您的个人信息。',
  },
}

const CONTACT_INFO = [
  { icon: Mail, label: '비즈니스 문의', value: 'biz@nextbygency.com', href: 'mailto:biz@nextbygency.com' },
  { icon: Mail, label: '공식 문의 메일', value: 'cs@nextbygency.com', href: 'mailto:cs@nextbygency.com' },
  { icon: Clock, label: '운영 시간', value: '평일 10:00 - 18:00' },
  { icon: Building2, label: '운영사', value: '(주)넥스트 바이전시' },
]

const inputCls =
  'w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] transition-colors focus:border-blue-400/70 focus:outline-none focus:ring-4 focus:ring-blue-500/15'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const t = useT(M)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError(t('이름을 입력해주세요.'))
    if (!email.trim() && !phone.trim())
      return setError(t('이메일 또는 전화번호 중 하나는 입력해주세요.'))
    if (!message.trim()) return setError(t('문의 내용을 입력해주세요.'))

    setSending(true)
    const r = await sendContact({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      message: message.trim(),
    })
    setSending(false)

    if (r.ok) {
      setDone(true)
      setName('')
      setEmail('')
      setPhone('')
      setCompany('')
      setMessage('')
    } else {
      setError(r.error || t('문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.'))
    }
  }

  return (
    <div className="site-dark min-h-screen overflow-x-clip">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[440px] w-[800px] -translate-x-1/2 rounded-full bg-blue-700/30 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 right-0 h-[260px] w-[360px] rounded-full bg-cyan-700/25 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>{t('문의')}</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            {t('혼자 고민하지 말고, 물어보세요')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            {t(
              '우리 팀에 맞을지, 어떤 플랜이 좋을지 혼자 재보느라 시간을 흘려보내지 마세요. 상황만 남겨주시면 담당자가 직접 확인하고, 꼭 필요한 답만 정리해 연락드리겠습니다.',
            )}
          </p>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            {/* LEFT — info */}
            <Reveal variant="left">
              <div className="flex h-full flex-col gap-6">
                <div className="card p-7">
                  <h2 className="text-lg font-semibold">{t('연락처 안내')}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
                    {t('영업 시간 내 접수된 문의는 담당자가 직접 확인합니다. 편한 채널로 연락 주세요.')}
                  </p>
                  <ul className="mt-5 space-y-4">
                    {CONTACT_INFO.map((c) => {
                      const Icon = c.icon
                      return (
                        <li key={c.label} className="flex items-center gap-3.5">
                          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-blue-500/12 text-blue-300">
                            <Icon size={18} />
                          </span>
                          <div>
                            <p className="text-xs text-[var(--text-dim)]">{t(c.label)}</p>
                            {'href' in c && c.href ? (
                              <a href={c.href} className="text-sm font-medium text-blue-300 hover:text-blue-200 hover:underline">
                                {c.value}
                              </a>
                            ) : (
                              <p className="text-sm font-medium">{t(c.value)}</p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="card p-7">
                  <h3 className="text-sm font-semibold text-[var(--text-soft)]">{t('바로가기')}</h3>
                  <div className="mt-4 space-y-2.5">
                    <Link
                      href="/pricing"
                      className="group flex items-center justify-between rounded-xl border border-white/12 px-4 py-3 text-sm font-medium transition-colors hover:border-blue-400/50 hover:bg-white/[0.04]"
                    >
                      {t('요금제 안내 보기')}
                      <ArrowRight
                        size={16}
                        className="text-blue-500 transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                    <Link
                      href="/features/video"
                      className="group flex items-center justify-between rounded-xl border border-white/12 px-4 py-3 text-sm font-medium transition-colors hover:border-blue-400/50 hover:bg-white/[0.04]"
                    >
                      {t('기능 둘러보기')}
                      <ArrowRight
                        size={16}
                        className="text-blue-500 transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* RIGHT — form */}
            <Reveal variant="right" delay={100}>
              <div className="card glow p-7 sm:p-9">
                {done ? (
                  <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                    <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-400">
                      <CheckCircle2 size={36} />
                    </span>
                    <h2 className="mt-6 text-xl font-bold tracking-tight">{t('문의가 접수되었습니다')}</h2>
                    <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--text-soft)]">
                      {t(
                        '담당자가 내용을 확인하고 영업일 기준으로 순차 연락드립니다. 먼저 시작해 보고 싶다면, 기다리는 동안 무료로 둘러보셔도 좋습니다.',
                      )}
                    </p>
                    <button
                      onClick={() => setDone(false)}
                      className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold transition-colors hover:border-blue-400/50 hover:bg-white/[0.08]"
                    >
                      {t('새 문의 작성하기')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        {t('이름')} <span className="text-blue-500">*</span>
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('홍길동')}
                        className={inputCls}
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">{t('이메일')}</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t('you@company.com')}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">{t('연락처')}</label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t('010-0000-0000')}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <p className="-mt-2 text-xs text-[var(--text-dim)]">
                      {t('이메일 또는 전화번호 중 하나는 꼭 남겨주세요.')}
                    </p>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">{t('회사명')}</label>
                      <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder={t('(선택) 회사·팀 이름')}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        {t('문의 내용')} <span className="text-blue-500">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        placeholder={t('어떤 점이 궁금하신가요? 도입 규모나 목표를 함께 남겨주시면 더 정확히 안내해 드립니다.')}
                        className={cn(inputCls, 'resize-none')}
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={sending}
                      className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-blue-500/40 hover:brightness-[1.05] disabled:pointer-events-none disabled:opacity-60"
                    >
                      {sending ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> {t('보내는 중...')}
                        </>
                      ) : (
                        <>
                          {t('문의 보내기')} <Send size={17} />
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-[var(--text-dim)]">
                      {t('제출 시 문의 처리를 위한 개인정보 이용에 동의하는 것으로 간주됩니다.')}
                    </p>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
