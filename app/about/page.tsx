import {
  ArrowRight,
  Database,
  Workflow,
  LayoutGrid,
  HeartHandshake,
  Target,
  Compass,
  Building2,
  MapPin,
  User,
  Mail,
} from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { LogoMark } from '@/components/Brand'

const STATS = [
  { to: 5200, suffix: '+', label: '활성 마케터' },
  { to: 12400, suffix: '+', label: '일일 수집 DB' },
  { to: 38, suffix: '%', label: '평균 전환율 상승' },
  { to: 2.7, suffix: 'x', decimals: 1, label: 'ROAS 개선' },
]

const VALUES = [
  {
    icon: Database,
    title: '데이터 기반',
    desc: '감이 아닌 숫자로 결정합니다. 모든 채널의 성과를 한 화면에서 투명하게 봅니다.',
    color: 'from-violet-500 to-indigo-600',
  },
  {
    icon: Workflow,
    title: '자동화',
    desc: '반복되는 마케팅 업무를 자동으로. 사람은 전략에, 시스템은 실행에 집중합니다.',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    icon: LayoutGrid,
    title: '올인원',
    desc: '수집·분석·CRM·콘텐츠까지 하나의 워크스페이스. 도구를 옮겨 다닐 필요가 없습니다.',
    color: 'from-fuchsia-500 to-violet-600',
  },
  {
    icon: HeartHandshake,
    title: '고객 성공',
    desc: '우리의 성공은 고객의 성장입니다. 도입 이후의 성과까지 함께 책임집니다.',
    color: 'from-cyan-500 to-teal-600',
  },
]

const COMPANY = [
  { icon: Building2, label: '회사명', value: '(주)Next Vision Company' },
  { icon: LayoutGrid, label: '서비스', value: 'BYGENCY (바이전시)' },
  { icon: MapPin, label: '소재지', value: '서울특별시' },
  { icon: User, label: '대표', value: '문의 시 안내' },
  { icon: Mail, label: '사업자등록번호', value: '문의 시 안내' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)]">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[840px] -translate-x-1/2 rounded-full bg-violet-300/40 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 left-0 h-[280px] w-[360px] rounded-full bg-indigo-200/40 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>회사소개</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            마케팅의 모든 것을 <span className="brand-text animate-gradient">하나로</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            흩어진 마케팅 도구 때문에 낭비되는 시간을 없애기 위해 BYGENCY를 만듭니다. 수집부터
            분석, 전환, 자동화까지 마케터의 하루를 하나의 워크스페이스로 연결합니다.
          </p>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="pb-8">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="card grid gap-6 p-10 sm:grid-cols-2 lg:grid-cols-4">
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
          </Reveal>
        </div>
      </section>

      {/* ===== MISSION / VISION ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal variant="left">
              <div className="card hover-lift relative h-full overflow-hidden p-9">
                <div className="animate-drift-slow absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-300/25 blur-2xl" />
                <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg">
                  <Target size={22} />
                </span>
                <h2 className="relative mt-6 text-2xl font-bold tracking-tight">우리의 미션</h2>
                <p className="relative mt-4 text-[15px] leading-relaxed text-[var(--text-soft)]">
                  마케터가 도구가 아닌 성과에 집중하도록 돕는 것. 우리는 데이터 수집, 채널 분석,
                  고객 관리, 콘텐츠 제작으로 흩어져 있던 일들을 하나로 모아 누구나 데이터 기반으로
                  성장할 수 있는 환경을 만듭니다.
                </p>
              </div>
            </Reveal>
            <Reveal variant="right" delay={100}>
              <div className="card hover-lift relative h-full overflow-hidden p-9">
                <div className="animate-drift-slow absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/25 blur-2xl" />
                <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-lg">
                  <Compass size={22} />
                </span>
                <h2 className="relative mt-6 text-2xl font-bold tracking-tight">우리의 비전</h2>
                <p className="relative mt-4 text-[15px] leading-relaxed text-[var(--text-soft)]">
                  모든 규모의 비즈니스가 대행사 없이도 전문적인 마케팅을 실행할 수 있는 세상. AI와
                  자동화로 마케팅의 진입 장벽을 낮추고, 좋은 제품이 더 많은 고객을 만나도록 돕는
                  올인원 그로스 플랫폼이 되겠습니다.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== CORE VALUES ===== */}
      <section className="border-t border-[var(--border)] bg-white py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>핵심 가치</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              우리가 일하는 <span className="brand-text">기준</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => {
              const Icon = v.icon
              return (
                <Reveal key={v.title} variant="scale" delay={i * 90}>
                  <div className="card hover-lift h-full p-7">
                    <span
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${v.color} text-white shadow-lg`}
                    >
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{v.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-soft)]">{v.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== COMPANY INFO ===== */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal variant="left">
              <SectionTag>회사 정보</SectionTag>
              <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                (주)Next Vision Company
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
                BYGENCY는 (주)Next Vision Company가 만드는 올인원 마케팅 그로스 플랫폼입니다.
                자세한 사업 관련 정보는 문의를 통해 안내해 드립니다.
              </p>
              <Button href="/contact" className="mt-7 group">
                문의하기
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Reveal>

            <Reveal variant="right" delay={100}>
              <div className="card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--panel-2)] px-6 py-4">
                  <LogoMark size={28} />
                  <span className="text-sm font-semibold text-[var(--text-soft)]">사업자 정보</span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {COMPANY.map((c) => {
                    const Icon = c.icon
                    return (
                      <li key={c.label} className="flex items-center gap-4 px-6 py-4">
                        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600">
                          <Icon size={16} />
                        </span>
                        <span className="w-28 flex-shrink-0 text-sm text-[var(--text-dim)]">{c.label}</span>
                        <span className="text-sm font-medium">{c.value}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 pb-28">
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
                함께 성장할 준비가 되셨나요?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                BYGENCY와 함께 마케팅의 모든 것을 하나로 연결하세요.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  href="/signup"
                  size="lg"
                  className="!bg-white !text-violet-700 hover:!bg-violet-50 hover:!brightness-100"
                >
                  무료로 시작하기 <ArrowRight size={18} />
                </Button>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:bg-white/20"
                >
                  요금제 보기
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
