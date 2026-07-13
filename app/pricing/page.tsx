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
  Megaphone,
  Clapperboard,
  Layers,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { cn } from '@/lib/utils'

type Tier = {
  name: string
  price: string
  period: string
  desc: string
  features: string[]
  cta: string
  href: string
  highlight: boolean
}

/* ===== 마케터 전용 플랜 ===== */
const MARKETER_TIERS: Tier[] = [
  {
    name: 'Plus',
    price: '₩29,000',
    period: '/월',
    desc: '혼자 마케팅을 챙기는 1인 사업자·입문 단계',
    features: [
      '월 3,000 DB 수집',
      '유튜브·블로그 기본 분석',
      '플레이스 순위 조회',
      '문자 발송 (건별 차감)',
      '기본 리포트 대시보드',
    ],
    cta: 'Plus 시작하기',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₩89,000',
    period: '/월',
    desc: '성과에 집중하는 성장기 마케팅 팀',
    features: [
      '월 30,000 DB 수집',
      '유튜브·블로그·플레이스 전체 분석',
      'CRM · 고객 세그먼트 관리',
      '알림톡 · 문자 캠페인 자동화',
      '팀 협업 5인 · 권한 관리',
      '맞춤 리포트 · 성과 추적',
    ],
    cta: 'Pro 시작하기',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Max',
    price: '₩249,000',
    period: '/월',
    desc: '여러 브랜드를 운영하는 대행사·인하우스 실무',
    features: [
      'DB 수집 무제한',
      '마케터 전 기능 잠금 해제',
      '알림톡 · 문자 대량 발송 최적 단가',
      '팀 협업 무제한 · 워크스페이스 분리',
      'API 연동 · 데이터 내보내기',
      '전담 매니저 · 우선 기술 지원',
    ],
    cta: '도입 문의',
    href: '/contact',
    highlight: false,
  },
]

/* ===== 노드형 AI 영상 제작 플랜 (NODE STUDIO) ===== */
const VIDEO_TIERS: Tier[] = [
  {
    name: 'Plus',
    price: '₩49,000',
    period: '/월',
    desc: '숏폼 영상을 직접 만들어보는 시작 단계',
    features: [
      '월 1,500 크레딧 제공',
      '노드 에디터 기본 워크플로우',
      '기본 영상 생성 모델',
      '숏폼·광고 템플릿 제공',
      '1080p 렌더링',
    ],
    cta: 'Plus 시작하기',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₩149,000',
    period: '/월',
    desc: '콘텐츠를 대량으로 찍어내는 제작 팀',
    features: [
      '월 6,000 크레딧 제공',
      '고급 모델 (Seedance · Veo 등)',
      '워터마크 제거',
      '노드 커스텀 워크플로우 저장',
      '음성·자막 자동 생성',
      '팀 공유 · 에셋 라이브러리',
    ],
    cta: 'Pro 시작하기',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Max',
    price: '₩390,000',
    period: '/월',
    desc: '영상을 끊김 없이 쏟아내는 스튜디오·대행사',
    features: [
      '월 20,000 크레딧 (무제한급)',
      '최상위 영상·이미지 모델 전체',
      '우선 렌더 큐 · 대기 없는 처리',
      '4K 고해상도 렌더링',
      'API · 배치 렌더 자동화',
      '전담 매니저 · 우선 지원',
    ],
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
    q: '두 플랜은 어떻게 다른가요?',
    a: 'BYGENCY에는 서로 다른 두 개의 플랜 트랙이 있습니다. ‘마케터 전용’은 DB 수집·유튜브/블로그/플레이스 분석·문자·알림톡·CRM·리포트를 아우르는 마케팅 올인원 도구이고, ‘AI 영상 제작’은 NODE STUDIO 노드 에디터로 광고·숏폼 영상을 만드는 도구입니다. 목적이 다르기 때문에 각각 Plus·Pro·Max 요금제로 나뉘어 있습니다.',
  },
  {
    q: '두 플랜을 동시에 쓸 수 있나요?',
    a: '네. 두 트랙은 완전히 독립적이라 하나만 구독해도 되고, 둘 다 구독해도 됩니다. 마케터 Max와 AI 영상 Max를 동시에 구독하는 것도 가능합니다. 마케팅 데이터와 영상 제작을 한 계정에서 함께 다루고 싶다면 두 플랜을 같이 운영하시는 것을 권장합니다.',
  },
  {
    q: '약정이 있나요? 해지하면 손해 보지 않나요?',
    a: '약정도, 위약금도 없습니다. 두 플랜 모두 언제든 마이페이지에서 클릭 한 번으로 해지할 수 있고, 해지하면 다음 결제일부터 청구가 멈춥니다. 이미 결제한 기간은 끝까지 정상 이용되니 남은 날짜를 잃을 걱정은 하지 않으셔도 됩니다.',
  },
  {
    q: '플랜은 나중에 바꿀 수 있나요?',
    a: '지금의 선택이 끝이 아닙니다. 각 트랙 안에서 Plus에서 Pro, Max로 즉시 업그레이드하거나 반대로 내릴 수 있고, 필요 없어진 트랙은 그것만 따로 해지할 수 있습니다. 작게 시작해 성과를 확인한 뒤 규모를 키우는 것이 가장 합리적입니다.',
  },
  {
    q: '크레딧은 무엇이고 어떻게 충전하나요?',
    a: 'AI 영상 제작은 렌더링할 때마다 크레딧이 차감되는 방식입니다. 요금제에 매달 크레딧이 포함되며, 더 필요할 때만 별도로 충전합니다. 마케터 트랙의 분석·조회 대부분은 1크레딧으로 충분해 부담이 적습니다. 충전은 요금제와 별도이며, 신청 후 관리자 승인 시 즉시 적립됩니다.',
  },
  {
    q: '결제 수단과 세금계산서는 어떻게 되나요?',
    a: '주요 신용·체크카드와 계좌이체를 지원합니다. 두 플랜의 Max는 세금계산서 발행과 별도 계약, 대량 사용 단가 조정이 가능하니 도입 문의로 연락 주시면 조건을 맞춰 안내해 드립니다.',
  },
  {
    q: '수집한 고객 데이터와 만든 영상은 안전한가요?',
    a: '고객 DB는 암호화되어 저장되며 계정 권한이 있는 담당자만 접근할 수 있습니다. NODE STUDIO에서 생성한 영상과 에셋의 소유권은 전적으로 고객사에 있으며, 해지 시 데이터 이관과 삭제 절차를 함께 안내해 드립니다.',
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

function PlanCard({ p, i }: { p: Tier; i: number }) {
  return (
    <Reveal delay={i * 100} className={p.highlight ? 'lg:-mt-4' : ''}>
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
            인기
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
  )
}

function TrackSection({
  icon: Icon,
  tag,
  title,
  accent,
  desc,
  tiers,
}: {
  icon: typeof Megaphone
  tag: string
  title: string
  accent: string
  desc: string
  tiers: Tier[]
}) {
  return (
    <div>
      <Reveal className="mx-auto max-w-2xl text-center">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/70 px-4 py-1.5 text-sm font-semibold text-violet-700">
            <Icon size={15} /> {tag}
          </span>
        </div>
        <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {title} <span className="brand-text">{accent}</span>
        </h2>
        <p className="mt-4 text-balance text-[var(--text-soft)]">{desc}</p>
      </Reveal>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
        {tiers.map((p, i) => (
          <PlanCard key={p.name} p={p} i={i} />
        ))}
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
            두 개의 무기, <span className="brand-text animate-gradient">필요한 만큼</span> 골라 쓰세요
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            고객을 모으는 <b className="font-semibold text-[var(--text)]">마케터 전용 도구</b>와 콘텐츠를 찍어내는{' '}
            <b className="font-semibold text-[var(--text)]">노드형 AI 영상 제작</b>. 각각 Plus·Pro·Max로
            나뉘어 있어, 하나만 써도 되고 둘 다 함께 써도 됩니다. 약정 없이 언제든 올리고 내리세요.
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

      {/* ===== TRACK 1: 마케터 전용 ===== */}
      <section className="pb-6">
        <div className="mx-auto max-w-6xl px-5">
          <TrackSection
            icon={Megaphone}
            tag="마케터 전용 플랜"
            title="마케팅, 한 화면에서"
            accent="끝냅니다"
            desc="DB 수집부터 유튜브·블로그·플레이스 분석, 문자·알림톡, CRM, 리포트까지. 흩어진 마케팅 도구를 하나로 합치는 올인원 트랙입니다."
            tiers={MARKETER_TIERS}
          />
        </div>
      </section>

      {/* ===== TRACK 2: AI 영상 제작 ===== */}
      <section className="pt-14 pb-6">
        <div className="mx-auto max-w-6xl px-5">
          <TrackSection
            icon={Clapperboard}
            tag="AI 영상 제작 플랜"
            title="노드로 잇는"
            accent="AI 영상 스튜디오"
            desc="NODE STUDIO 노드 에디터에서 블록을 연결하듯 광고·숏폼 영상을 생성합니다. 크레딧 차감 방식이라, 만든 만큼만 비용이 나갑니다."
            tiers={VIDEO_TIERS}
          />
        </div>
      </section>

      {/* ===== BOTH-PLANS CALLOUT ===== */}
      <section className="pt-10 pb-12">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal variant="scale" className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-7 shadow-sm">
              <div className="animate-drift pointer-events-none absolute -top-16 -right-10 h-48 w-64 rounded-full bg-violet-200/40 blur-[80px]" />
              <div className="relative flex items-start gap-4">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl brand-gradient text-white shadow">
                  <Layers size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    두 플랜은 함께 이용할 수 있습니다
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
                    마케터 전용과 AI 영상 제작은 서로 독립적인 트랙이라 원하는 조합으로 구독하세요.
                    <span className="font-semibold text-[var(--text)]">
                      {' '}
                      마케터 Max + AI 영상 Max 동시 구독도 가능합니다.
                    </span>{' '}
                    고객을 모으고, 그 데이터로 바로 영상을 찍어내는 흐름을 한 계정에서 끝낼 수 있습니다.
                  </p>
                </div>
              </div>
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
              AI 영상은 <span className="brand-text">쓴 만큼</span> 차감되는 크레딧 방식
            </h2>
            <p className="mt-5 text-balance text-[var(--text-soft)]">
              AI 영상 제작 플랜은 렌더링할 때마다 크레딧이 차감됩니다. 매달 큰 금액을 미리 결제하고
              절반도 못 쓰는 대신, 실제로 만든 순간에만 딱 그만큼 빠져나갑니다. 요금제에 크레딧이
              포함되며, 더 필요할 때만 별도 충전하고 신청 후 관리자 승인 시 즉시 적립됩니다.
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
                마케터 트랙의 유튜브·인스타·플레이스 조회는 1크레딧으로 부담 없이 사용할 수 있습니다.
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
                마케팅과 영상, 둘 다 오늘 시작할 수 있습니다
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                신용카드 없이 3분이면 세팅 완료. 필요한 플랜 하나로 가볍게 시작하고, 언제든 다른 트랙을 더하세요.
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
