'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { FEATURES } from '@/lib/features'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const M: Dict = {
  '올인원 마케팅 기능': { en: 'All-in-one marketing', ja: 'オールインワン機能', zh: '一体化营销功能' },
  '흩어진 도구 대신,': { en: 'Instead of scattered tools,', ja: '散らばったツールの代わりに、', zh: '告别零散工具，' },
  '한 화면': { en: 'one screen', ja: '一つの画面', zh: '一屏搞定' },
  '에서': { en: '', ja: 'で', zh: '' },
  '수집 · 분석 · 전환 · 자동화. 마케터의 하루에 필요한 7가지 도구를 하나의 노드 워크스페이스로 연결했습니다. 각 기능을 눌러 실제로 동작하는 데모를 지금 바로 체험해보세요.': {
    en: 'Capture, analyze, convert, automate. The 7 tools a marketer needs every day, connected in a single node workspace. Click any feature to try a live, working demo right now.',
    ja: '獲得・分析・転換・自動化。マーケターの毎日に必要な7つのツールを、一つのノードワークスペースに繋ぎました。各機能をクリックして、実際に動くデモを今すぐ体験してください。',
    zh: '获客、分析、转化、自动化。将营销人每天所需的 7 大工具连接进同一个节点工作区。点击任意功能，立即体验真实可用的演示。',
  },
  '지금 시작하기': { en: 'Get started', ja: '今すぐ始める', zh: '立即开始' },
  '요금제 보기': { en: 'View pricing', ja: '料金を見る', zh: '查看价格' },
  '자세히 보기 · 데모 체험': { en: 'Learn more · Try demo', ja: '詳しく見る · デモ体験', zh: '了解详情 · 体验演示' },
  '7가지 기능, 오늘부터 하나의 워크스페이스에서': {
    en: 'Seven tools, one workspace — starting today',
    ja: '7つの機能を、今日から一つのワークスペースで',
    zh: '七大功能，从今天起同处一个工作区',
  },
  '3분이면 세팅 완료. 지금 시작해서 흩어진 마케팅을 하나로 모으세요.': {
    en: 'Set up in 3 minutes. Start now and bring your scattered marketing together.',
    ja: '3分でセットアップ完了。今すぐ始めて、散らばったマーケティングを一つにまとめましょう。',
    zh: '3 分钟即可完成设置。立即开始，把零散的营销整合到一起。',
  },
  '도입 문의': { en: 'Contact sales', ja: '導入のお問い合わせ', zh: '咨询采购' },
}

export function FeaturesHubContent() {
  const t = useT(M)
  return (
    <div className="site-dark min-h-screen overflow-x-hidden">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-blue-700/30 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 right-0 h-[280px] w-[380px] rounded-full bg-cyan-700/22 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>{t('올인원 마케팅 기능')}</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            {t('흩어진 도구 대신,')} <span className="brand-text animate-gradient">{t('한 화면')}</span>
            {t('에서')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            {t('수집 · 분석 · 전환 · 자동화. 마케터의 하루에 필요한 7가지 도구를 하나의 노드 워크스페이스로 연결했습니다. 각 기능을 눌러 실제로 동작하는 데모를 지금 바로 체험해보세요.')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 animate-fade-up delay-300 sm:flex-row">
            <Button href="/signup" size="lg" className="group">
              {t('지금 시작하기')}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="/pricing" variant="outline" size="lg">
              {t('요금제 보기')}
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
                <Reveal key={f.slug} variant="rise" delay={i * 90}>
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

                    <div className="relative mt-7 flex items-center gap-1.5 text-sm font-semibold text-blue-300 transition-all duration-300 group-hover:gap-2.5">
                      {t('자세히 보기 · 데모 체험')}
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
            className="animate-gradient relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl shadow-blue-900/50"
            style={{ background: 'linear-gradient(120deg,#3b82f6,#2563eb,#0ea5e9,#22d3ee)' }}
          >
            <div className="animate-drift pointer-events-none absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-[90px]" />
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <LogoMark size={40} />
                </span>
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('7가지 기능, 오늘부터 하나의 워크스페이스에서')}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                {t('3분이면 세팅 완료. 지금 시작해서 흩어진 마케팅을 하나로 모으세요.')}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/signup" size="lg" className="!bg-white !text-blue-700 hover:!bg-blue-50 hover:!brightness-100">
                  {t('지금 시작하기')} <ArrowRight size={18} />
                </Button>
                <Button href="/contact" size="lg" className="!border !border-white/40 !bg-white/10 !text-white hover:!bg-white/20">
                  {t('도입 문의')}
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
