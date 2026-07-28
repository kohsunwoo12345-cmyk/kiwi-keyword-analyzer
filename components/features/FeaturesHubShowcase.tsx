'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Users,
  BarChart3,
  Clapperboard,
  Send,
  FileSpreadsheet,
  ArrowRight,
  Target,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { Reveal } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { FEATURES } from '@/lib/features'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* pipeline */
  '마케팅 파이프라인': { en: 'Marketing pipeline', ja: 'マーケティングパイプライン', zh: '营销流水线' },
  '기능이 아니라 흐름으로 이어집니다': { en: 'Not a pile of features — one continuous flow', ja: '機能ではなく流れでつながります', zh: '连的不是功能，是一整条流程' },
  '수집한 데이터가 분석으로, 분석이 제작으로, 제작이 발송과 리포트로 그대로 넘어갑니다. 중간에 엑셀을 거칠 일이 없습니다.': {
    en: 'Collected data flows into analysis, analysis into production, production into sending and reporting. No spreadsheet stops in between.',
    ja: '集めたデータが分析へ、分析が制作へ、制作が配信とレポートへそのまま渡ります。途中でExcelを経由する必要はありません。',
    zh: '收集的数据流向分析，分析流向制作，制作流向发送与报告。中间不必再过一次 Excel。',
  },
  '수집': { en: 'Capture', ja: '収集', zh: '获客' },
  '분석': { en: 'Analyze', ja: '分析', zh: '分析' },
  '제작': { en: 'Create', ja: '制作', zh: '制作' },
  '발송': { en: 'Send', ja: '配信', zh: '发送' },
  '리포트': { en: 'Report', ja: 'レポート', zh: '报告' },
  '랜딩페이지로 방문자를 고객 DB로 붙잡습니다': { en: 'Landing pages turn visitors into leads', ja: 'ランディングページで訪問者を顧客DBに変えます', zh: '用落地页把访客变成客户数据' },
  '유튜브·블로그·광고 성과를 한 화면에서 읽습니다': { en: 'Read YouTube, blog, and ad performance on one screen', ja: 'YouTube・ブログ・広告の成果を一画面で読みます', zh: '在一屏读懂 YouTube、博客与广告成效' },
  '노드 스튜디오에서 영상과 콘텐츠를 만들어냅니다': { en: 'Node Studio turns out videos and content', ja: 'ノードスタジオで動画とコンテンツを作ります', zh: '在节点工作室里产出视频与内容' },
  '세그먼트에 맞춰 문자·알림톡이 자동으로 나갑니다': { en: 'Texts and alerts go out automatically by segment', ja: 'セグメントに合わせてSMS・トークが自動で送られます', zh: '按分群自动发出短信与通知' },
  '무엇이 매출을 만들었는지 숫자로 남습니다': { en: 'What made the revenue is left in numbers', ja: '何が売上を作ったのかが数字で残ります', zh: '是什么带来了营收，用数字留下来' },

  /* scenario */
  '시작점 고르기': { en: 'Pick a starting point', ja: '始点を選ぶ', zh: '选个起点' },
  '지금 급한 일부터 고르면 됩니다': { en: 'Start with whatever is urgent right now', ja: '今急いでいることから選べば大丈夫です', zh: '从眼下最急的事开始就行' },
  '전부 한 번에 켤 필요는 없습니다. 목표를 고르면 그 목표에 필요한 기능만 이어서 보여드립니다.': {
    en: 'You don’t have to switch everything on at once. Pick a goal and we show only the features that goal needs.',
    ja: 'すべてを一度に有効にする必要はありません。目標を選べば、その目標に必要な機能だけをつないでお見せします。',
    zh: '不必一次全开。选定目标，我们只把该目标需要的功能串给你看。',
  },
  '신규 고객 모으기': { en: 'Bring in new customers', ja: '新規顧客を集める', zh: '获取新客户' },
  '콘텐츠 대량 제작': { en: 'Produce content at volume', ja: 'コンテンツを大量制作', zh: '批量产出内容' },
  '재구매 늘리기': { en: 'Grow repeat purchases', ja: 'リピートを増やす', zh: '提升复购' },
  '광고로 데려온 방문자를 붙잡고, 어떤 채널이 실제로 전환을 만들었는지 확인합니다.': {
    en: 'Hold on to the visitors your ads brought in, and see which channel actually produced conversions.',
    ja: '広告で連れてきた訪問者を捕まえ、どのチャネルが実際に転換を生んだかを確認します。',
    zh: '留住广告带来的访客，并看清哪个渠道真正带来了转化。',
  },
  '영상과 글을 한 번에 찍어내고, 어떤 소재가 먹히는지 데이터로 고릅니다.': {
    en: 'Turn out videos and posts in batches, and let the data pick which creative lands.',
    ja: '動画と記事を一気に作り、どの素材が効くかをデータで選びます。',
    zh: '一次性产出视频和文章，用数据挑出有效的素材。',
  },
  '잠자던 고객 DB를 세그먼트로 나눠, 다시 살 만한 사람에게만 말을 겁니다.': {
    en: 'Split the sleeping customer database into segments and talk only to the people likely to buy again.',
    ja: '眠っていた顧客DBをセグメントに分け、また買ってくれそうな人にだけ声をかけます。',
    zh: '把沉睡的客户数据分群，只对可能再买的人说话。',
  },
  '이 목표에 쓰이는 기능': { en: 'Features this goal uses', ja: 'この目標で使う機能', zh: '这个目标会用到的功能' },
  '자세히 보기': { en: 'Learn more', ja: '詳しく見る', zh: '了解详情' },
}

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ───────────────── 1. 파이프라인 ───────────────── */
const STAGES = [
  { key: '수집', icon: Users, color: '#2563eb', desc: '랜딩페이지로 방문자를 고객 DB로 붙잡습니다' },
  { key: '분석', icon: BarChart3, color: '#8b5cf6', desc: '유튜브·블로그·광고 성과를 한 화면에서 읽습니다' },
  { key: '제작', icon: Clapperboard, color: '#a855f7', desc: '노드 스튜디오에서 영상과 콘텐츠를 만들어냅니다' },
  { key: '발송', icon: Send, color: '#06b6d4', desc: '세그먼트에 맞춰 문자·알림톡이 자동으로 나갑니다' },
  { key: '리포트', icon: FileSpreadsheet, color: '#10b981', desc: '무엇이 매출을 만들었는지 숫자로 남습니다' },
]

function PipelineFlow() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setActive((v) => (v + 1) % STAGES.length), 1900)
    return () => clearInterval(id)
  }, [inView])

  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[320px] w-[820px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${STAGES[active].color}20` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('마케팅 파이프라인')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('기능이 아니라 흐름으로 이어집니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('수집한 데이터가 분석으로, 분석이 제작으로, 제작이 발송과 리포트로 그대로 넘어갑니다. 중간에 엑셀을 거칠 일이 없습니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="rounded-3xl border border-white/10 bg-[#0b0d16] p-5 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] sm:p-7">
            {/* 진행 트랙 */}
            <div className="relative mb-6 h-1 rounded-full bg-white/[0.07]">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${((active + 1) / STAGES.length) * 100}%`,
                  background: `linear-gradient(90deg, #2563eb, ${STAGES[active].color})`,
                  transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: `0 0 16px -3px ${STAGES[active].color}`,
                }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {STAGES.map((s, i) => {
                const Icon = s.icon
                const done = i < active
                const now = i === active
                return (
                  <button
                    key={s.key}
                    onClick={() => setActive(i)}
                    className={cn(
                      'group relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-500',
                      now ? 'border-white/25 bg-white/[0.06]' : done ? 'border-white/[0.1] bg-white/[0.03]' : 'border-white/[0.07] bg-white/[0.015]',
                    )}
                    style={{
                      transform: now ? 'translateY(-5px)' : 'none',
                      boxShadow: now ? `0 26px 56px -34px ${s.color}` : undefined,
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="relative">
                        <span
                          className="grid h-9 w-9 place-items-center rounded-xl transition-all duration-500"
                          style={{
                            background: done || now ? `${s.color}26` : 'rgba(255,255,255,0.05)',
                            color: done || now ? s.color : 'var(--text-dim)',
                            transform: now ? 'scale(1.08)' : 'none',
                          }}
                        >
                          <Icon size={16} />
                        </span>
                        {now && <span className="animate-ping-ring absolute inset-0 rounded-xl" style={{ border: `1px solid ${s.color}` }} />}
                      </span>
                      <span className={cn('text-[13px] font-bold transition-colors', done || now ? 'text-[var(--text)]' : 'text-[var(--text-dim)]')}>
                        {t(s.key)}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-[var(--text-dim)]">0{i + 1}</span>
                    </span>
                    <span className="mt-3 text-[12px] leading-relaxed text-[var(--text-soft)]">{t(s.desc)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. 목표별 기능 조합 ───────────────── */
const GOALS = [
  {
    key: '신규 고객 모으기',
    icon: Target,
    color: '#2563eb',
    desc: '광고로 데려온 방문자를 붙잡고, 어떤 채널이 실제로 전환을 만들었는지 확인합니다.',
    slugs: ['ads', 'crm', 'blog'],
  },
  {
    key: '콘텐츠 대량 제작',
    icon: Clapperboard,
    color: '#a855f7',
    desc: '영상과 글을 한 번에 찍어내고, 어떤 소재가 먹히는지 데이터로 고릅니다.',
    slugs: ['video', 'youtube', 'team'],
  },
  {
    key: '재구매 늘리기',
    icon: Sparkles,
    color: '#10b981',
    desc: '잠자던 고객 DB를 세그먼트로 나눠, 다시 살 만한 사람에게만 말을 겁니다.',
    slugs: ['crm', 'team', 'ads'],
  },
]

function GoalPicker() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [pick, setPick] = useState(0)
  const [auto, setAuto] = useState(true)
  const goal = GOALS[pick]
  const picked = goal.slugs.map((s) => FEATURES.find((f) => f.slug === s)).filter(Boolean) as typeof FEATURES

  useEffect(() => {
    if (!auto || !inView) return
    const id = setInterval(() => setPick((v) => (v + 1) % GOALS.length), 3600)
    return () => clearInterval(id)
  }, [auto, inView])

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-24">
      <div
        className="animate-drift-slow pointer-events-none absolute right-0 top-8 h-[320px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${goal.color}22` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('시작점 고르기')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('지금 급한 일부터 고르면 됩니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('전부 한 번에 켤 필요는 없습니다. 목표를 고르면 그 목표에 필요한 기능만 이어서 보여드립니다.')}
          </p>
        </Reveal>

        {/* 목표 탭 */}
        <Reveal className="mt-10 flex flex-wrap justify-center gap-2">
          {GOALS.map((g, i) => {
            const Icon = g.icon
            const on = i === pick
            return (
              <button
                key={g.key}
                onClick={() => {
                  setPick(i)
                  setAuto(false)
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-all duration-300',
                  on ? 'text-white' : 'border-white/10 bg-white/[0.03] text-[var(--text-soft)] hover:border-white/25 hover:text-white',
                )}
                style={on ? { borderColor: g.color, background: `${g.color}22`, boxShadow: `0 10px 28px -16px ${g.color}` } : undefined}
              >
                <Icon size={15} style={{ color: on ? g.color : undefined }} />
                {t(g.key)}
              </button>
            )
          })}
        </Reveal>

        <Reveal variant="scale" className="mt-8">
          <div className="rounded-3xl border border-white/10 bg-[#0b0d16] p-5 sm:p-7">
            <p className="text-center text-[14px] leading-relaxed text-[var(--text-soft)]">{t(goal.desc)}</p>

            <p className="mt-7 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              <Workflow size={12} style={{ color: goal.color }} /> {t('이 목표에 쓰이는 기능')}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {picked.map((f, i) => {
                const Icon = f.icon
                return (
                  <Link
                    key={`${goal.key}-${f.slug}`}
                    href={`/features/${f.slug}`}
                    className="group relative flex flex-col rounded-2xl border border-white/[0.09] bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/25"
                    style={{ animation: `fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) ${i * 110}ms both` }}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn('grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white transition-transform duration-300 group-hover:scale-110', f.color)}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-[var(--text)]">{f.title}</span>
                        <span className="block truncate text-[11px] text-[var(--text-dim)]">{f.short}</span>
                      </span>
                    </span>
                    <span className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-soft)]">{f.desc}</span>
                    <span
                      className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold transition-transform duration-300 group-hover:translate-x-1"
                      style={{ color: f.accent }}
                    >
                      {t('자세히 보기')} <ArrowRight size={12} />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function FeaturesHubShowcase() {
  return (
    <>
      <PipelineFlow />
      <GoalPicker />
    </>
  )
}
