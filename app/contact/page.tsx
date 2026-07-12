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

const CONTACT_INFO = [
  { icon: Mail, label: '이메일', value: 'contact@bygency.com' },
  { icon: Phone, label: '전화', value: '문의 시 안내' },
  { icon: Clock, label: '운영 시간', value: '평일 10:00 - 18:00' },
  { icon: Building2, label: '운영사', value: '(주)Next Vision Company' },
]

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] transition-colors focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('이름을 입력해주세요.')
    if (!email.trim() && !phone.trim())
      return setError('이메일 또는 전화번호 중 하나는 입력해주세요.')
    if (!message.trim()) return setError('문의 내용을 입력해주세요.')

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
      setError(r.error || '문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)]">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-16">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[440px] w-[800px] -translate-x-1/2 rounded-full bg-violet-300/40 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 right-0 h-[260px] w-[360px] rounded-full bg-cyan-200/50 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>문의</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            무엇을 도와드릴까요?
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            도입 상담, 요금제, 기능 문의까지. 남겨주시면 담당자가 빠르게 연락드리겠습니다.
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
                  <h2 className="text-lg font-semibold">연락처 안내</h2>
                  <ul className="mt-5 space-y-4">
                    {CONTACT_INFO.map((c) => {
                      const Icon = c.icon
                      return (
                        <li key={c.label} className="flex items-center gap-3.5">
                          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                            <Icon size={18} />
                          </span>
                          <div>
                            <p className="text-xs text-[var(--text-dim)]">{c.label}</p>
                            <p className="text-sm font-medium">{c.value}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="card p-7">
                  <h3 className="text-sm font-semibold text-[var(--text-soft)]">바로가기</h3>
                  <div className="mt-4 space-y-2.5">
                    <Link
                      href="/pricing"
                      className="group flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium transition-colors hover:border-violet-300 hover:bg-violet-50/50"
                    >
                      요금제 안내 보기
                      <ArrowRight
                        size={16}
                        className="text-violet-500 transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                    <Link
                      href="/features/video"
                      className="group flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium transition-colors hover:border-violet-300 hover:bg-violet-50/50"
                    >
                      기능 둘러보기
                      <ArrowRight
                        size={16}
                        className="text-violet-500 transition-transform duration-300 group-hover:translate-x-1"
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
                    <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
                      <CheckCircle2 size={36} />
                    </span>
                    <h2 className="mt-6 text-xl font-bold tracking-tight">문의가 접수되었습니다</h2>
                    <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--text-soft)]">
                      빠르게 연락드리겠습니다. 소중한 문의 감사합니다.
                    </p>
                    <button
                      onClick={() => setDone(false)}
                      className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:border-violet-300 hover:bg-violet-50/50"
                    >
                      새 문의 작성하기
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        이름 <span className="text-violet-500">*</span>
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="홍길동"
                        className={inputCls}
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">이메일</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">연락처</label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <p className="-mt-2 text-xs text-[var(--text-dim)]">
                      이메일 또는 전화번호 중 하나는 꼭 남겨주세요.
                    </p>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">회사명</label>
                      <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="(선택) 회사·팀 이름"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        문의 내용 <span className="text-violet-500">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        placeholder="어떤 점이 궁금하신가요? 도입 규모나 목표를 함께 남겨주시면 더 정확히 안내해 드립니다."
                        className={cn(inputCls, 'resize-none')}
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={sending}
                      className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/40 hover:brightness-[1.05] disabled:pointer-events-none disabled:opacity-60"
                    >
                      {sending ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> 보내는 중...
                        </>
                      ) : (
                        <>
                          문의 보내기 <Send size={17} />
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-[var(--text-dim)]">
                      제출 시 문의 처리를 위한 개인정보 이용에 동의하는 것으로 간주됩니다.
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
