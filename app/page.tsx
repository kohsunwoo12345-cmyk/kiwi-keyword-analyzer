import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  ShieldCheck,
  TrendingUp,
  Play,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { FEATURES } from '@/lib/features'

const STATS = [
  { value: '12,400+', label: '수집 DB / 일' },
  { value: '38%', label: '평균 전환율 상승' },
  { value: '2.7x', label: 'ROAS 개선' },
  { value: '5,200+', label: '활성 마케터' },
]

const STEPS = [
  {
    n: '01',
    title: '랜딩페이지로 DB 수집',
    desc: '노코드 빌더로 만든 랜딩페이지가 방문자를 고객 DB로 전환합니다.',
  },
  {
    n: '02',
    title: '채널·광고 성과 분석',
    desc: '유튜브·블로그·광고 데이터를 자동 수집해 무엇이 먹히는지 파악합니다.',
  },
  {
    n: '03',
    title: 'CRM으로 전환·재구매',
    desc: '수집된 DB를 세그먼트로 나누고 문자·알림톡으로 매출을 만듭니다.',
  },
  {
    n: '04',
    title: 'AI로 콘텐츠·영상 자동화',
    desc: 'AI 챗봇과 영상 생성으로 소재 제작 시간을 90% 줄입니다.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: '무료',
    period: '',
    desc: '개인 마케터의 시작',
    features: ['랜딩페이지 1개', '월 500 DB 수집', '유튜브·블로그 분석', '기본 리포트'],
    cta: '무료로 시작',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₩89,000',
    period: '/월',
    desc: '성장하는 팀을 위한 선택',
    features: [
      '랜딩페이지 무제한',
      '월 30,000 DB 수집',
      '전체 분석 + 광고 통합',
      'CRM · 알림톡 캠페인',
      'AI 챗봇 어시스턴트',
      '팀 협업 5인',
    ],
    cta: 'Pro 시작하기',
    highlight: true,
  },
  {
    name: 'Business',
    price: '문의',
    period: '',
    desc: '대행사·엔터프라이즈',
    features: ['모든 Pro 기능', 'DB 수집 무제한', 'AI 영상 제작 무제한', '전담 매니저', 'API·화이트라벨'],
    cta: '도입 문의',
    highlight: false,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-24">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[540px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[130px]" />
        <div className="pointer-events-none absolute top-40 right-0 h-[300px] w-[400px] rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>
              <Sparkles size={14} /> 올인원 마케팅 그로스 플랫폼
            </SectionTag>
          </div>

          <h1 className="mt-7 text-balance text-5xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-6xl md:text-7xl">
            마케팅의 모든 것을
            <br />
            <span className="brand-text">바이전시</span> 하나로
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            DB수집 랜딩페이지 · 유튜브/블로그 분석 · 광고 분석 · CRM · AI 영상 제작까지.
            <br className="hidden sm:block" />
            흩어진 마케팅 도구를 하나의 워크스페이스로 통합했습니다.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 animate-fade-up delay-300 sm:flex-row">
            <Button href="/dashboard" size="lg">
              무료로 시작하기 <ArrowRight size={18} />
            </Button>
            <Button href="#features" variant="soft" size="lg">
              <Play size={16} /> 기능 둘러보기
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-dim)] animate-fade-up delay-400">
            <span className="flex items-center gap-1.5">
              <Check size={15} className="text-emerald-400" /> 신용카드 불필요
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={15} className="text-emerald-400" /> 3분 만에 세팅
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={15} className="text-emerald-400" /> 언제든 해지
            </span>
          </div>

          {/* dashboard preview */}
          <div className="relative mx-auto mt-16 max-w-4xl animate-fade-up delay-500">
            <div className="glow overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
              <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-rose-400/70" />
                <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-xs text-[var(--text-dim)]">app.bivience.com/dashboard</span>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-4">
                {STATS.map((s) => (
                  <div key={s.label} className="card-2 p-4 text-left">
                    <div className="text-2xl font-bold brand-text">{s.value}</div>
                    <div className="mt-1 text-xs text-[var(--text-soft)]">{s.label}</div>
                  </div>
                ))}
                <div className="card-2 col-span-2 flex items-end gap-1.5 p-4 sm:col-span-4">
                  {[38, 52, 44, 68, 59, 74, 82, 71, 90, 84, 96, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t brand-gradient"
                      style={{ height: `${h * 0.6}px`, opacity: 0.4 + (i / 12) * 0.6 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LOGOS / TRUST ===== */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-soft)] py-8">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-[var(--text-dim)]">
            메타 · 구글 · 네이버 · 유튜브 · 카카오 데이터 통합 연동
          </p>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="relative py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <SectionTag>7가지 핵심 기능</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              하나의 플랫폼, <span className="brand-text">완결된 마케팅</span>
            </h2>
            <p className="mt-5 text-balance text-lg text-[var(--text-soft)]">
              수집부터 분석, 실행, 자동화까지. 마케팅 퍼널의 전 과정을 바이전시가 커버합니다.
            </p>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              const wide = i === 0
              return (
                <Link
                  key={f.slug}
                  href={`/dashboard/${f.slug}`}
                  className={`group card relative overflow-hidden p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 ${
                    wide ? 'sm:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div
                    className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                    style={{ background: f.accent }}
                  />
                  <div className="relative">
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg`}
                    >
                      <Icon size={22} className="text-white" />
                    </div>
                    <div className="mt-5 flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-dim)]">
                        {String(f.no).padStart(2, '0')}
                      </span>
                      <h3 className="text-lg font-semibold">{f.title}</h3>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-soft)]">{f.desc}</p>
                    <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-violet-400 opacity-0 transition-opacity group-hover:opacity-100">
                      살펴보기 <ArrowRight size={15} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="relative border-t border-[var(--border)] bg-[var(--bg-soft)] py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <SectionTag>작동 방식</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              수집 → 분석 → 전환 → 자동화
            </h2>
          </div>
          <div className="mt-16 grid gap-5 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="card relative p-7">
                <span className="text-4xl font-bold brand-text">{s.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {[
              { icon: Zap, t: '즉시 자동화', d: '반복 작업을 자동으로. 워크플로우를 한번 만들면 계속 돌아갑니다.' },
              { icon: TrendingUp, t: '데이터 기반 의사결정', d: '감이 아닌 숫자로. 모든 채널 성과를 한 화면에서 봅니다.' },
              { icon: ShieldCheck, t: '안전한 데이터 관리', d: '수집한 고객 DB를 안전하게 저장하고 규정에 맞게 관리합니다.' },
            ].map((c) => {
              const Icon = c.icon
              return (
                <div key={c.t} className="flex gap-4 rounded-2xl p-5">
                  <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h4 className="font-semibold">{c.t}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">{c.d}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <SectionTag>요금제</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              규모에 맞게 성장하세요
            </h2>
            <p className="mt-5 text-lg text-[var(--text-soft)]">무료로 시작하고 필요할 때 업그레이드하세요.</p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  p.highlight
                    ? 'border-violet-500/50 bg-gradient-to-b from-violet-500/10 to-transparent glow'
                    : 'border-[var(--border)] bg-[var(--panel)]'
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full brand-gradient px-3 py-1 text-xs font-semibold text-white">
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
                      <Check size={17} className="mt-0.5 flex-shrink-0 text-violet-400" />
                      <span className="text-[var(--text-soft)]">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  href="/dashboard"
                  variant={p.highlight ? 'primary' : 'outline'}
                  className="mt-8 w-full"
                >
                  {p.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 pb-28">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 via-[var(--panel)] to-indigo-600/10 px-8 py-16 text-center">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-violet-600/30 blur-[100px]" />
          <div className="relative">
            <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              지금 바로 <span className="brand-text">바이전시</span>를 시작하세요
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-[var(--text-soft)]">
              흩어진 마케팅 도구는 이제 그만. 하나의 플랫폼에서 수집하고 분석하고 성장하세요.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/dashboard" size="lg">
                무료로 시작하기 <ArrowRight size={18} />
              </Button>
              <Button href="#pricing" variant="soft" size="lg">
                요금제 보기
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
