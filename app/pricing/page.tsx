'use client'

import { useState } from 'react'
import {
  Check,
  ArrowRight,
  Sparkles,
  Video,
  LayoutTemplate,
  FileText,
  PlayCircle,
  Camera,
  MapPin,
  ShieldCheck,
  Minus,
  Plus,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    name: 'Starter',
    price: '무료',
    period: '',
    desc: '부담 없이 첫 성과를 확인하는 단계',
    features: ['랜딩페이지 1개', '월 500 DB 수집', '유튜브·블로그 분석', '기본 리포트'],
    cta: '무료로 시작',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₩89,000',
    period: '/월',
    desc: '흩어진 도구를 정리하고 성과에 집중하는 팀',
    features: [
      '랜딩페이지 무제한',
      '월 30,000 DB 수집',
      '전체 분석 + 광고 통합',
      'CRM · 알림톡 캠페인',
      'AI 챗봇 어시스턴트',
      '팀 협업 5인',
    ],
    cta: 'Pro 시작하기',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Business',
    price: '문의',
    period: '',
    desc: '규모에 맞춘 무제한과 전담 지원',
    features: ['모든 Pro 기능', 'DB 수집 무제한', 'AI 영상 제작 무제한', '전담 매니저', 'API·화이트라벨'],
    cta: '도입 문의',
    href: '/contact',
    highlight: false,
  },
]

const CREDITS = [
  { icon: Video, label: 'AI 영상 제작', cost: 5, color: 'from-fuchsia-500 to-violet-600' },
  { icon: LayoutTemplate, label: '랜딩페이지 생성', cost: 3, color: 'from-violet-500 to-indigo-600' },
  { icon: FileText, label: '블로그 글 생성', cost: 2, color: 'from-indigo-500 to-blue-600' },
  { icon: PlayCircle, label: '유튜브 분석', cost: 1, color: 'from-rose-500 to-red-600' },
  { icon: Camera, label: '인스타 콘텐츠', cost: 1, color: 'from-pink-500 to-rose-600' },
  { icon: MapPin, label: '플레이스 조회', cost: 1, color: 'from-emerald-500 to-teal-600' },
]

const FAQS = [
  {
    q: '무료 체험은 어떻게 시작하나요?',
    a: 'Starter 플랜은 신용카드 등록 없이 회원가입만으로 바로 시작합니다. 랜딩페이지 1개, 월 500건의 DB 수집, 유튜브·블로그 분석을 기간 제한 없이 무료로 써 보시고, 실제 성과가 눈에 보일 때 업그레이드를 결정하시면 됩니다.',
  },
  {
    q: '약정이 있나요? 해지하면 손해 보지 않나요?',
    a: '약정도, 위약금도 없습니다. 언제든 마이페이지에서 클릭 한 번으로 해지할 수 있고, 해지하면 다음 결제일부터 청구가 멈춥니다. 이미 결제한 기간은 끝까지 정상 이용되니 남은 날짜를 잃을 걱정은 하지 않으셔도 됩니다.',
  },
  {
    q: '결제한 뒤 마음에 들지 않으면 환불되나요?',
    a: '결제 후 서비스를 실제로 사용하지 않으셨다면 관련 법령과 환불 정책에 따라 환불을 도와드립니다. 사용 중 불편한 점이 있으면 해지 전에 먼저 알려주세요. 대부분의 문제는 담당자 상담으로 더 빠르게 해결됩니다.',
  },
  {
    q: '플랜은 나중에 바꿀 수 있나요? 지금 결정이 부담됩니다.',
    a: '지금의 선택이 끝이 아닙니다. 팀이 커지거나 수집량이 늘면 상위 플랜으로 즉시 업그레이드하고, 반대로 줄일 수도 있습니다. 작게 시작해 성과를 확인한 뒤 규모를 키우는 것이 가장 합리적인 방법입니다.',
  },
  {
    q: '크레딧은 무엇이고 어떻게 충전하나요?',
    a: 'AI 영상 제작, 랜딩페이지·블로그 생성처럼 연산이 많이 드는 기능만 크레딧으로 차감됩니다. 분석·조회 대부분은 1크레딧으로 충분해 부담이 적습니다. 크레딧은 요금제와 별도로 필요할 때만 충전하며, 신청 후 관리자 승인 시 즉시 적립됩니다.',
  },
  {
    q: '결제 수단과 세금계산서는 어떻게 되나요?',
    a: '주요 신용·체크카드와 계좌이체를 지원합니다. Business 플랜은 세금계산서 발행과 별도 계약이 가능하니 도입 문의로 연락 주시면 조건을 맞춰 안내해 드립니다.',
  },
  {
    q: '수집한 고객 데이터는 안전한가요?',
    a: '고객 DB는 암호화되어 저장되며, 계정 권한이 있는 담당자만 접근할 수 있습니다. 수집한 데이터의 소유권은 전적으로 고객사에 있으며, 해지 시 데이터 이관과 삭제 절차를 함께 안내해 드립니다.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-semibold">{q}</span>
        <span
          className={cn(
            'grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-violet-600 transition-colors',
            open ? 'bg-violet-100' : 'bg-violet-50',
          )}
        >
          {open ? <Minus size={16} /> : <Plus size={16} />}
        </span>
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 text-sm leading-relaxed text-[var(--text-soft)]">{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)]">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-violet-300/40 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 right-0 h-[280px] w-[380px] rounded-full bg-cyan-200/50 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>요금제</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            딱 필요한 만큼만 <span className="brand-text animate-gradient">쓰고</span> 성장하세요
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            여러 마케팅 도구에 매달 나가는 구독료, 정말 다 쓰고 계신가요? BYGENCY 하나로 합치면
            비용은 줄고 성과는 한곳에 모입니다. 무료로 시작해 필요할 때 올리고, 약정 없이 언제든 내려도 됩니다.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-dim)] animate-fade-up delay-300">
            {['신용카드 불필요', '3분 만에 세팅', '언제든 해지'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check size={15} className="text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLANS ===== */}
      <section className="pb-12">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 100} className={p.highlight ? 'lg:-mt-4' : ''}>
                <div
                  className={cn(
                    'relative flex h-full flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1',
                    p.highlight
                      ? 'border-violet-300 bg-gradient-to-b from-violet-50 to-white shadow-lg shadow-violet-200/50'
                      : 'border-[var(--border)] bg-white shadow-sm hover:shadow-md',
                  )}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full brand-gradient px-3 py-1 text-xs font-semibold text-white shadow">
                      가장 인기
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{p.desc}</p>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                    <span className="mb-1 text-sm text-[var(--text-dim)]">{p.period}</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check size={17} className="mt-0.5 flex-shrink-0 text-violet-600" />
                        <span className="text-[var(--text-soft)]">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    href={p.href}
                    variant={p.highlight ? 'primary' : 'outline'}
                    className="mt-8 w-full"
                  >
                    {p.cta}
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mx-auto mt-8 max-w-3xl">
            <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-5 text-sm leading-relaxed text-[var(--text-soft)]">
              <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-violet-600" />
              <p>
                <span className="font-semibold text-[var(--text)]">도구 5개 구독료 vs BYGENCY 하나.</span>{' '}
                랜딩페이지, 분석, CRM, 광고, 영상 도구를 따로 결제하면 매달 수십만 원이 흩어집니다.
                한곳에 모으면 비용은 줄고, 데이터가 끊기지 않아 성과는 오히려 선명해집니다.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== CREDITS ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>
              <Sparkles size={13} /> 크레딧 안내
            </SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              쓴 만큼만 내는 <span className="brand-text">크레딧</span> 방식
            </h2>
            <p className="mt-5 text-balance text-[var(--text-soft)]">
              왜 크레딧일까요? 매달 큰 금액을 미리 결제하고 절반도 못 쓰는 대신, AI 연산이 필요한
              순간에만 딱 그만큼 차감되기 때문입니다. 안 쓰면 남고, 필요할 때만 채우니 낭비가 없습니다.
              충전은 요금제와 별도이며, 신청 후 관리자 승인 시 즉시 적립됩니다.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CREDITS.map((c, i) => {
              const Icon = c.icon
              return (
                <Reveal key={c.label} variant="scale" delay={(i % 3) * 80}>
                  <div className="card hover-lift flex items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-3.5">
                      <span
                        className={cn(
                          'grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                          c.color,
                        )}
                      >
                        <Icon size={20} />
                      </span>
                      <span className="font-semibold">{c.label}</span>
                    </div>
                    <span className="flex items-baseline gap-1 text-violet-600">
                      <span className="text-2xl font-bold">{c.cost}</span>
                      <span className="text-xs font-medium text-[var(--text-dim)]">크레딧</span>
                    </span>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-5 text-sm text-[var(--text-soft)]">
              <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-violet-600" />
              <p>
                크레딧은 요금제 결제와 별도로 청구되며, 충전 요청은 관리자 승인 후 계정에 반영됩니다.
                유튜브·인스타·플레이스 조회는 1크레딧으로 부담 없이 사용할 수 있습니다.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="border-t border-[var(--border)] bg-white py-24">
        <div className="mx-auto max-w-3xl px-5">
          <Reveal className="text-center">
            <SectionTag>자주 묻는 질문</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              결정 전에 남은 궁금증, 여기서 풀고 가세요
            </h2>
          </Reveal>
          <div className="mt-12 space-y-3">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <FaqItem q={f.q} a={f.a} />
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <p className="text-sm text-[var(--text-soft)]">
              더 궁금한 점이 있으신가요?{' '}
              <a href="/contact" className="font-semibold text-violet-600 hover:underline">
                문의하기
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 py-24">
        <Reveal variant="scale" className="mx-auto max-w-5xl">
          <div
            className="animate-gradient relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl shadow-violet-300/50"
            style={{ background: 'linear-gradient(120deg,#a855f7,#7c3aed,#6366f1,#22d3ee)' }}
          >
            <div className="animate-drift pointer-events-none absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-[90px]" />
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <LogoMark size={40} />
                </span>
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                고민하는 지금도 비용은 흩어지고 있습니다
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                신용카드 없이 3분이면 세팅 완료. 오늘 무료로 시작해 흩어진 도구를 하나로 모으세요.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  href="/signup"
                  size="lg"
                  className="!bg-white !text-violet-700 hover:!bg-violet-50 hover:!brightness-100"
                >
                  무료로 시작하기 <ArrowRight size={18} />
                </Button>
                <Button
                  href="/contact"
                  size="lg"
                  className="!border !border-white/40 !bg-white/10 !text-white hover:!bg-white/20"
                >
                  도입 문의
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
