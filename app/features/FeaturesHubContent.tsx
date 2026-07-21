'use client'

import Link from 'next/link'
import { ArrowRight, Check, Layers, SlidersHorizontal, Workflow, Clapperboard } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { LogoMark } from '@/components/Brand'
import { FEATURES } from '@/lib/features'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const M: Dict = {
  '노드형 AI 영상 스튜디오': { en: 'Node-based AI video studio', ja: 'ノード型AI動画スタジオ', zh: '节点式 AI 视频工作室' },
  '모션 하나하나까지,': { en: 'Every motion, precisely —', ja: 'モーションの一つひとつまで、', zh: '连每一个动作，' },
  '노드로 만드는 AI 영상': { en: 'AI video, built with nodes', ja: 'ノードで作るAI動画', zh: '用节点打造 AI 视频' },
  '모든 AI 영상 모델을 한 화면에서. ControlNet으로 카메라·포즈·모션을 하나하나 제어하고, 노드로 컷을 연결해 광고·숏폼을 완성합니다. 수집·분석·CRM 등 마케팅 도구도 여기에 하나로 이어집니다.': {
    en: 'Every AI video model on one canvas. Control camera, pose, and motion detail-by-detail with ControlNet, and connect cuts with nodes to finish ads and short-form. Capture, analytics, and CRM connect here too.',
    ja: 'すべてのAI動画モデルを一つの画面に。ControlNetでカメラ・ポーズ・モーションを一つひとつ制御し、ノードでカットをつなげて広告・ショートを完成。収集・分析・CRMもここに一つにつながります。',
    zh: '所有 AI 视频模型汇于一屏。用 ControlNet 逐一控制镜头、姿势与动作，用节点串联镜头完成广告与短视频。获客、分析与 CRM 也一并连接于此。',
  },
  '모든 AI 모델': { en: 'Every AI model', ja: 'すべてのAIモデル', zh: '所有 AI 模型' },
  'Kling · Veo · Runway · Seedance · Luma · Hailuo 등 최신 영상 모델을 한 곳에서 골라 씁니다.': {
    en: 'Pick from the latest video models — Kling, Veo, Runway, Seedance, Luma, Hailuo — all in one place.',
    ja: 'Kling・Veo・Runway・Seedance・Luma・Hailuoなど最新の動画モデルを一か所で選んで使います。',
    zh: '在同一处选用 Kling、Veo、Runway、Seedance、Luma、Hailuo 等最新视频模型。',
  },
  'ControlNet 모션 제어': { en: 'ControlNet motion control', ja: 'ControlNetモーション制御', zh: 'ControlNet 动作控制' },
  '포즈·뎁스·엣지·캐니로 인물의 동작과 카메라 움직임을 하나하나 정밀하게 지정합니다.': {
    en: 'Pin down character motion and camera movement detail-by-detail with pose, depth, edge, and canny.',
    ja: 'ポーズ・深度・エッジ・キャニーで人物の動きとカメラワークを一つひとつ精密に指定します。',
    zh: '用姿势、深度、边缘、Canny 逐一精确指定人物动作与镜头运动。',
  },
  '노드 워크플로우': { en: 'Node workflow', ja: 'ノードワークフロー', zh: '节点工作流' },
  '텍스트→영상, 이미지→영상, 영상→영상(V2V)을 노드로 연결해 컷과 장면을 자유롭게 구성합니다.': {
    en: 'Connect text-to-video, image-to-video, and video-to-video (V2V) as nodes to compose cuts and scenes freely.',
    ja: 'テキスト→動画、画像→動画、動画→動画(V2V)をノードでつなぎ、カットとシーンを自由に構成します。',
    zh: '将文本→视频、图像→视频、视频→视频(V2V)以节点连接，自由编排镜头与场景。',
  },
  '실사화 · V2V': { en: 'Live-action · V2V', ja: '実写化 · V2V', zh: '实拍化 · V2V' },
  '원본 영상을 넣어 스타일을 바꾸거나 실사처럼 변환하고, 브랜드 톤을 유지한 채 대량 제작합니다.': {
    en: 'Feed a source video to restyle or make it photoreal, and mass-produce while keeping your brand tone.',
    ja: '元動画を入れてスタイルを変えたり実写のように変換し、ブランドトーンを保ったまま大量制作します。',
    zh: '输入原始视频以更换风格或转为写实，在保持品牌调性的同时批量制作。',
  },
  '노드 스튜디오 살펴보기': { en: 'Explore the node studio', ja: 'ノードスタジオを見る', zh: '了解节点工作室' },
  '마케팅을 완성하는 도구들': { en: 'The tools that complete your marketing', ja: 'マーケティングを完成させるツール', zh: '让营销更完整的工具' },
  '영상 제작을 중심으로 수집·분석·전환까지, 각 기능을 눌러 실제 데모를 체험해보세요.': {
    en: 'Centered on video, from capture to analytics to conversion — click any feature to try a live demo.',
    ja: '動画制作を中心に収集・分析・転換まで。各機能をクリックして実際のデモを体験してください。',
    zh: '以视频制作为核心，从获客到分析到转化——点击任意功能体验真实演示。',
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
    <div className="site-dark min-h-screen overflow-x-clip">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-36 pb-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-blue-700/30 blur-[130px]" />
        <div className="animate-drift-slow pointer-events-none absolute top-24 right-0 h-[280px] w-[380px] rounded-full bg-cyan-700/22 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="flex justify-center animate-fade-up">
            <SectionTag>{t('노드형 AI 영상 스튜디오')}</SectionTag>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight animate-fade-up delay-100 sm:text-5xl md:text-6xl">
            {t('모션 하나하나까지,')} <br className="hidden sm:block" />
            <span className="brand-text animate-gradient">{t('노드로 만드는 AI 영상')}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-200">
            {t('모든 AI 영상 모델을 한 화면에서. ControlNet으로 카메라·포즈·모션을 하나하나 제어하고, 노드로 컷을 연결해 광고·숏폼을 완성합니다. 수집·분석·CRM 등 마케팅 도구도 여기에 하나로 이어집니다.')}
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

      {/* ===== 노드 스튜디오 스포트라이트 ===== */}
      <section className="pb-6">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Layers, t: '모든 AI 모델', d: 'Kling · Veo · Runway · Seedance · Luma · Hailuo 등 최신 영상 모델을 한 곳에서 골라 씁니다.', c: 'from-violet-500 to-purple-600' },
              { icon: SlidersHorizontal, t: 'ControlNet 모션 제어', d: '포즈·뎁스·엣지·캐니로 인물의 동작과 카메라 움직임을 하나하나 정밀하게 지정합니다.', c: 'from-fuchsia-500 to-pink-600' },
              { icon: Workflow, t: '노드 워크플로우', d: '텍스트→영상, 이미지→영상, 영상→영상(V2V)을 노드로 연결해 컷과 장면을 자유롭게 구성합니다.', c: 'from-sky-500 to-blue-600' },
              { icon: Clapperboard, t: '실사화 · V2V', d: '원본 영상을 넣어 스타일을 바꾸거나 실사처럼 변환하고, 브랜드 톤을 유지한 채 대량 제작합니다.', c: 'from-emerald-500 to-teal-600' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={s.t} variant="scale" delay={i * 80}>
                  <div className="card hover-lift h-full p-6">
                    <span className={cn('inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg', s.c)}>
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-4 text-base font-bold tracking-tight">{t(s.t)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{t(s.d)}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
          <Reveal delay={120} className="mt-6 text-center">
            <Button href="/studio-nvc-prv-8b3k2/" size="lg" className="group">
              {t('노드 스튜디오 살펴보기')}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ===== FEATURE GRID ===== */}
      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('마케팅을 완성하는 도구들')}</h2>
            <p className="mt-4 text-[var(--text-soft)]">{t('영상 제작을 중심으로 수집·분석·전환까지, 각 기능을 눌러 실제 데모를 체험해보세요.')}</p>
          </Reveal>
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
