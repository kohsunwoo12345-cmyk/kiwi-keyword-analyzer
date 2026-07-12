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
import { HeroOrbit } from '@/components/HeroOrbit'
import { HeroNodeStudio } from '@/components/HeroNodeStudio'
import { Button, SectionTag } from '@/components/ui'
import { Reveal, Counter, Marquee } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { FEATURES } from '@/lib/features'

const STATS = [
  { to: 12400, suffix: '+', label: '수집 DB / 일' },
  { to: 38, suffix: '%', label: '평균 전환율 상승' },
  { to: 2.7, suffix: 'x', decimals: 1, label: 'ROAS 개선' },
  { to: 5200, suffix: '+', label: '활성 마케터' },
]

const PLATFORMS = ['NAVER', 'Meta', 'Google', 'YouTube', 'Kakao', 'Instagram', 'TikTok', 'GA4']

const STEPS = [
  { n: '01', title: '랜딩페이지로 DB 수집', desc: '노코드 빌더로 만든 랜딩페이지가 방문자를 고객 DB로 전환합니다.' },
  { n: '02', title: '채널·광고 성과 분석', desc: '유튜브·블로그·광고 데이터를 자동 수집해 무엇이 먹히는지 파악합니다.' },
  { n: '03', title: 'CRM으로 전환·재구매', desc: '수집된 DB를 세그먼트로 나누고 문자·알림톡으로 매출을 만듭니다.' },
  { n: '04', title: 'AI로 콘텐츠·영상 자동화', desc: 'AI 챗봇과 영상 생성으로 소재 제작 시간을 90% 줄입니다.' },
]

const PLANS = [
  {
    name: 'Starter', price: '무료', period: '', desc: '개인 마케터의 시작',
    features: ['랜딩페이지 1개', '월 500 DB 수집', '유튜브·블로그 분석', '기본 리포트'],
    cta: '무료로 시작', highlight: false,
  },
  {
    name: 'Pro', price: '₩89,000', period: '/월', desc: '성장하는 팀을 위한 선택',
    features: ['랜딩페이지 무제한', '월 30,000 DB 수집', '전체 분석 + 광고 통합', 'CRM · 알림톡 캠페인', 'AI 챗봇 어시스턴트', '팀 협업 5인'],
    cta: 'Pro 시작하기', highlight: true,
  },
  {
    name: 'Business', price: '문의', period: '', desc: '대행사·엔터프라이즈',
    features: ['모든 Pro 기능', 'DB 수집 무제한', 'AI 영상 제작 무제한', '전담 매니저', 'API·화이트라벨'],
    cta: '도입 문의', highlight: false,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)]">
      <Navbar />

      {/* ===== HERO (NODE STUDIO 배경) ===== */}
      <section className="relative overflow-hidden pt-40 pb-32 text-white sm:pt-44 sm:pb-40">
        {/* 배경: 노드 에디터 장면 (요소가 하나씩 떠오름) */}
        <HeroNodeStudio />

        <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <span className="animate-bob inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-violet-200 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-ring absolute inline-flex h-full w-full rounded-full bg-violet-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full brand-gradient" />
              </span>
              노드 기반 올인원 마케팅 스튜디오
            </span>
          </div>

          <h1 className="mt-7 text-balance text-5xl font-bold leading-[1.1] tracking-tight [text-shadow:0_2px_30px_rgba(0,0,0,0.5)] animate-fade-up delay-100 sm:text-6xl md:text-7xl">
            마케팅의 모든 것을
            <br />
            <span className="brand-text animate-gradient">BYGENCY</span> 하나로
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed text-slate-200 [text-shadow:0_1px_20px_rgba(0,0,0,0.6)] animate-fade-up delay-200">
            DB수집 랜딩페이지 · 유튜브/블로그 분석 · 광고 분석 · CRM · AI 영상 제작까지.
            <br className="hidden sm:block" />
            흩어진 마케팅 도구를 하나의 노드 워크스페이스로 통합했습니다.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 animate-fade-up delay-300 sm:flex-row">
            <Button href="/signup" size="lg" className="group">
              무료로 시작하기
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="#features" size="lg" className="!border !border-white/25 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20">
              <Play size={16} /> 기능 둘러보기
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-300 animate-fade-up delay-400">
            {['신용카드 불필요', '3분 만에 세팅', '언제든 해지'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check size={15} className="text-emerald-400" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 채널 오빗 (실제 로고 공전) ===== */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[#070b16] py-20 text-white">
        <div className="animate-drift pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/15 blur-[150px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-violet-200 backdrop-blur">
              하나로 연결되는 채널
            </span>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              흩어진 채널을 <span className="brand-text animate-gradient">BYGENCY</span> 중심으로
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-balance text-slate-300 lg:mx-0">
              유튜브 · 네이버 플레이스 · 카카오 · 블로그 · 인스타그램 · 뉴스까지, 주요 마케팅 채널을 한 곳에서 수집·분석·실행합니다.
            </p>
          </div>
          <HeroOrbit />
        </div>
      </section>

      {/* ===== MARQUEE TRUST ===== */}
      <section className="border-y border-[var(--border)] bg-white py-7">
        <div className="mx-auto max-w-6xl px-5">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-[var(--text-dim)]">
            주요 마케팅 채널 데이터를 한 곳에서 통합 연동
          </p>
          <Marquee
            items={PLATFORMS.map((p) => (
              <span
                key={p}
                className="text-xl font-extrabold tracking-tight text-slate-300 transition-colors hover:text-slate-500"
              >
                {p}
              </span>
            ))}
          />
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 90} className="text-center">
                <div className="text-4xl font-bold tracking-tight sm:text-5xl">
                  <span className="brand-text">
                    <Counter to={s.to} decimals={s.decimals || 0} suffix={s.suffix} />
                  </span>
                </div>
                <div className="mt-2 text-sm text-[var(--text-soft)]">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>7가지 핵심 기능</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              하나의 플랫폼, <span className="brand-text">완결된 마케팅</span>
            </h2>
            <p className="mt-5 text-balance text-lg text-[var(--text-soft)]">
              수집부터 분석, 실행, 자동화까지. 마케팅 퍼널의 전 과정을 BYGENCY가 커버합니다.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              const wide = i === 0
              return (
                <Reveal
                  key={f.slug}
                  variant="scale"
                  delay={(i % 3) * 90}
                  className={wide ? 'sm:col-span-2 lg:col-span-1' : ''}
                >
                  <Link
                    href={`/features/${f.slug}`}
                    className="group card hover-lift relative block h-full overflow-hidden p-7"
                  >
                    <div
                      className="animate-drift-slow absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-35"
                      style={{ background: f.accent }}
                    />
                    <div className="relative">
                      <div
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}
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
                      <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-violet-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                        살펴보기 <ArrowRight size={15} />
                      </div>
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="relative border-t border-[var(--border)] bg-white py-24">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>작동 방식</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              수집 → 분석 → 전환 → 자동화
            </h2>
          </Reveal>
          <div className="relative mt-16 grid gap-5 md:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-violet-200 to-transparent md:block" />
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 110}>
                <div className="card relative h-full p-7">
                  <span className="brand-text text-4xl font-bold">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {[
              { icon: Zap, t: '즉시 자동화', d: '반복 작업을 자동으로. 워크플로우를 한번 만들면 계속 돌아갑니다.' },
              { icon: TrendingUp, t: '데이터 기반 의사결정', d: '감이 아닌 숫자로. 모든 채널 성과를 한 화면에서 봅니다.' },
              { icon: ShieldCheck, t: '안전한 데이터 관리', d: '수집한 고객 DB를 안전하게 저장하고 규정에 맞게 관리합니다.' },
            ].map((c, i) => {
              const Icon = c.icon
              return (
                <Reveal key={c.t} delay={i * 100}>
                  <div className="flex gap-4 rounded-2xl bg-[var(--bg)] p-5 transition-colors hover:bg-violet-50/60">
                    <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h4 className="font-semibold">{c.t}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">{c.d}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>요금제</SectionTag>
            <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              규모에 맞게 성장하세요
            </h2>
            <p className="mt-5 text-lg text-[var(--text-soft)]">무료로 시작하고 필요할 때 업그레이드하세요.</p>
          </Reveal>

          <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 100} className={p.highlight ? 'lg:-mt-4' : ''}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                    p.highlight
                      ? 'border-violet-300 bg-gradient-to-b from-violet-50 to-white shadow-lg shadow-violet-200/50'
                      : 'border-[var(--border)] bg-white shadow-sm hover:shadow-md'
                  }`}
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
                  <Button href="/signup" variant={p.highlight ? 'primary' : 'outline'} className="mt-8 w-full">
                    {p.cta}
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 pb-28">
        <Reveal variant="scale" className="mx-auto max-w-5xl">
          <div className="animate-gradient relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl shadow-violet-300/50"
            style={{ background: 'linear-gradient(120deg,#a855f7,#7c3aed,#6366f1,#22d3ee)' }}
          >
            <div className="animate-drift pointer-events-none absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-[90px]" />
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <LogoMark size={40} />
                </span>
              </div>
              <h2 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl">
                지금 바로 BYGENCY를 시작하세요
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                흩어진 마케팅 도구는 이제 그만. 하나의 플랫폼에서 수집하고 분석하고 성장하세요.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/signup" size="lg" className="!bg-white !text-violet-700 hover:!bg-violet-50 hover:!brightness-100">
                  무료로 시작하기 <ArrowRight size={18} />
                </Button>
                <Button href="/login" size="lg" className="!border !border-white/40 !bg-white/10 !text-white hover:!bg-white/20">
                  로그인
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
