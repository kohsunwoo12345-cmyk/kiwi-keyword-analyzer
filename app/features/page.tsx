import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { FEATURES } from '@/lib/features'
import { cn } from '@/lib/utils'

export const metadata = {
  title: '기능 · BYGENCY',
  description: 'DB 수집 랜딩페이지부터 유튜브·블로그 분석, CRM, 광고 분석, AI 영상 제작까지 — BYGENCY의 올인원 마케팅 기능을 한눈에.',
}

export default function FeaturesHub() {
  return (
    <div className="site-dark min-h-screen overflow-x-hidden">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-violet-700/30 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 right-0 h-[280px] w-[380px] rounded-full bg-cyan-700/22 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>올인원 마케팅 기능</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            흩어진 도구 대신, <span className="brand-text animate-gradient">한 화면</span>에서
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            수집 · 분석 · 전환 · 자동화. 마케터의 하루에 필요한 7가지 도구를 하나의 노드 워크스페이스로
            연결했습니다. 각 기능을 눌러 실제로 동작하는 데모를 지금 바로 체험해보세요.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 animate-fade-up delay-300 sm:flex-row">
            <Button href="/signup" size="lg" className="group">
              무료로 시작하기
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="/pricing" variant="outline" size="lg">
              요금제 보기
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FEATURE GRID ===== */}
      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <Reveal key={f.slug} delay={(i % 2) * 90}>
                  <Link
                    href={`/features/${f.slug}`}
                    className="group card hover-lift relative flex h-full flex-col overflow-hidden p-8"
                  >
                    <div
                      className="animate-drift-slow absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50"
                      style={{ background: f.accent }}
                    />
                    <div className="relative flex items-start gap-4">
                      <span
                        className={cn(
                          'grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110',
                          f.color,
                        )}
                        style={{ boxShadow: `0 16px 40px -12px ${f.accent}99` }}
                      >
                        <Icon size={26} className="text-white" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-dim)]">
                            {String(f.no).padStart(2, '0')}
                          </span>
                          <h2 className="text-xl font-bold tracking-tight">{f.title}</h2>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{f.desc}</p>
                      </div>
                    </div>

                    <ul className="relative mt-6 grid gap-2.5 sm:grid-cols-2">
                      {f.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-[var(--text-soft)]">
                          <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: f.accent }} />
                          {p}
                        </li>
                      ))}
                    </ul>

                    <div className="relative mt-7 flex items-center gap-1.5 text-sm font-semibold text-violet-300 transition-all duration-300 group-hover:gap-2.5">
                      자세히 보기 · 데모 체험
                      <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 py-24">
        <Reveal variant="scale" className="mx-auto max-w-5xl">
          <div
            className="animate-gradient relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl shadow-violet-900/50"
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
                7가지 기능, 오늘부터 하나의 워크스페이스에서
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                신용카드 없이 3분이면 세팅 완료. 지금 시작해서 흩어진 마케팅을 하나로 모으세요.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/signup" size="lg" className="!bg-white !text-violet-700 hover:!bg-violet-50 hover:!brightness-100">
                  무료로 시작하기 <ArrowRight size={18} />
                </Button>
                <Button href="/contact" size="lg" className="!border !border-white/40 !bg-white/10 !text-white hover:!bg-white/20">
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
