'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Calculator,
  Clapperboard,
  LayoutTemplate,
  MessageSquare,
  Wallet,
  TrendingDown,
  Sparkles,
  Check,
  Users,
  Rocket,
  Building2,
  ArrowRight,
  Wand2,
} from 'lucide-react'
import Link from 'next/link'
import { Reveal, Counter } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* calculator */
  '비용 계산기': { en: 'Cost calculator', ja: 'コスト計算機', zh: '成本计算器' },
  '지금 쓰는 방식과 얼마나 차이 나는지': { en: 'See how far apart this is from what you do today', ja: '今のやり方とどれだけ差が出るか', zh: '看看和你现在的做法差多少' },
  '한 달 작업량을 옮겨보세요. 외주와 개별 툴 구독으로 나가던 비용이 하나의 구독으로 어떻게 바뀌는지 바로 계산됩니다.': {
    en: 'Drag in your monthly workload. See instantly how the money going out to agencies and separate tool subscriptions turns into a single subscription.',
    ja: 'ひと月の作業量を動かしてみてください。外注や個別ツールの購読に出ていた費用が、一つの購読でどう変わるかがすぐ計算されます。',
    zh: '拖动你每月的工作量。原本花在外包和各类工具订阅上的钱，换成一个订阅后是什么样，立刻算给你看。',
  },
  '월 영상 제작': { en: 'Videos per month', ja: '月の動画制作', zh: '每月视频制作' },
  '월 랜딩페이지 제작': { en: 'Landing pages per month', ja: '月のLP制作', zh: '每月落地页制作' },
  '월 문자·알림톡 발송': { en: 'Messages sent per month', ja: '月のSMS・トーク配信', zh: '每月短信·通知发送' },
  '편': { en: '', ja: '本', zh: '支' },
  '개': { en: '', ja: '件', zh: '个' },
  '건': { en: '', ja: '件', zh: '条' },
  '기존 방식': { en: 'The old way', ja: '従来のやり方', zh: '原来的做法' },
  '외주 제작비 · 개별 툴 구독료 합계': { en: 'Agency fees + separate tool subscriptions', ja: '外注制作費＋個別ツール購読料の合計', zh: '外包制作费＋各类工具订阅费合计' },
  'BYGENCY 구독 하나': { en: 'One BYGENCY subscription', ja: 'BYGENCY購読ひとつ', zh: '一个 BYGENCY 订阅' },
  '플랜 구독료 + 사용한 만큼의 크레딧': { en: 'Plan fee + credits for what you actually use', ja: 'プラン料金＋使った分のクレジット', zh: '套餐费＋按实际使用的额度' },
  '월 절감액': { en: 'Saved per month', ja: '月の削減額', zh: '每月节省' },
  '절감률': { en: 'Savings rate', ja: '削減率', zh: '节省比例' },
  '연간 환산': { en: 'Per year', ja: '年間換算', zh: '折合每年' },
  '원': { en: ' KRW', ja: 'ウォン', zh: '韩元' },
  '만원': { en: 'K KRW', ja: '万ウォン', zh: '万韩元' },
  '외주 단가와 툴 구독료는 업계에서 흔히 쓰이는 값을 가정한 예시입니다. 실제 비용은 조건에 따라 달라집니다.': {
    en: 'Agency rates and tool subscription fees here are illustrative assumptions based on common market values. Your actual costs will vary.',
    ja: '外注単価やツール購読料は、業界でよく使われる値を仮定した例です。実際の費用は条件により異なります。',
    zh: '此处的外包单价与工具订阅费为按常见市场值设定的示例假设。实际费用因条件而异。',
  },

  /* finder */
  '플랜 찾기': { en: 'Find your plan', ja: 'プラン診断', zh: '选套餐' },
  '세 가지만 고르면 플랜이 정해집니다': { en: 'Pick three things and your plan is decided', ja: '3つ選ぶだけでプランが決まります', zh: '选三项，套餐就定了' },
  '팀 규모와 제작량, 필요한 기능을 고르면 지금 상황에 맞는 플랜을 골라드립니다.': {
    en: 'Choose your team size, output volume, and must-have features, and we pick the plan that fits where you are now.',
    ja: 'チーム規模と制作量、必要な機能を選べば、今の状況に合ったプランをお選びします。',
    zh: '选好团队规模、产出量和必备功能，我们就挑出适合你当下的套餐。',
  },
  '팀 규모': { en: 'Team size', ja: 'チーム規模', zh: '团队规模' },
  '혼자': { en: 'Just me', ja: '一人', zh: '一个人' },
  '2~5인': { en: '2–5 people', ja: '2〜5人', zh: '2~5 人' },
  '6인 이상': { en: '6+ people', ja: '6人以上', zh: '6 人以上' },
  '월 콘텐츠 제작량': { en: 'Monthly output', ja: '月の制作量', zh: '每月产出' },
  '가볍게': { en: 'Light', ja: '軽め', zh: '轻量' },
  '꾸준히': { en: 'Steady', ja: 'コンスタント', zh: '稳定' },
  '쏟아내듯': { en: 'Heavy', ja: '大量', zh: '大量' },
  '꼭 필요한 것': { en: 'Must-have', ja: '必須の機能', zh: '必备功能' },
  '기본 분석': { en: 'Core analytics', ja: '基本分析', zh: '基础分析' },
  '자동화·CRM': { en: 'Automation & CRM', ja: '自動化・CRM', zh: '自动化与 CRM' },
  '전담 지원·API': { en: 'Dedicated support & API', ja: '専任サポート・API', zh: '专属支持与 API' },
  '추천 플랜': { en: 'Recommended plan', ja: 'おすすめプラン', zh: '推荐套餐' },
  '이 플랜을 고른 이유': { en: 'Why this plan', ja: 'このプランを選んだ理由', zh: '为什么是这个套餐' },
  '혼자서도 시작 부담이 없는 가격입니다': { en: 'Priced so starting solo feels easy', ja: '一人でも始めやすい価格です', zh: '一个人起步也没负担的价格' },
  '팀 협업과 자동화가 함께 열립니다': { en: 'Team collaboration and automation both unlock', ja: 'チーム協業と自動化が一緒に開きます', zh: '团队协作与自动化一并解锁' },
  '무제한 협업과 전담 지원이 붙습니다': { en: 'Unlimited collaboration with dedicated support', ja: '無制限の協業と専任サポートが付きます', zh: '无限协作＋专属支持' },
  '제작량이 늘어도 크레딧이 모자라지 않습니다': { en: 'Credits keep up as your output grows', ja: '制作量が増えてもクレジットが足りなくなりません', zh: '产出增加也不会缺额度' },
  '지금 시작하기': { en: 'Get started', ja: '今すぐ始める', zh: '立即开始' },
  '마케터 전용': { en: 'For marketers', ja: 'マーケター向け', zh: '营销人套餐' },
  'AI 영상 제작': { en: 'AI video', ja: 'AI動画制作', zh: 'AI 视频制作' },
  '/월': { en: '/mo', ja: '/月', zh: '/月' },
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

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

/* ───────────────── 1. 비용 절감 계산기 ───────────────── */
/* 단가는 모두 '가정치' — 화면 하단에 명시한다 (단위: 원) */
const UNIT = {
  video: { legacy: 250_000, ours: 15_000 }, // 숏폼 영상 1편: 외주 vs 크레딧 환산
  landing: { legacy: 500_000, ours: 12_000 }, // 랜딩 1개
  message: { legacy: 22, ours: 14 }, // 문자 1건
}
const PLAN_FEE = 149_000 // 예시 기준 플랜 구독료
const LEGACY_TOOLS = 180_000 // 개별 툴 구독료 합계 가정

function SavingsCalculator() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [video, setVideo] = useState(8)
  const [landing, setLanding] = useState(2)
  const [message, setMessage] = useState(6000)

  const legacy = video * UNIT.video.legacy + landing * UNIT.landing.legacy + message * UNIT.message.legacy + LEGACY_TOOLS
  const ours = PLAN_FEE + video * UNIT.video.ours + landing * UNIT.landing.ours + message * UNIT.message.ours
  const save = Math.max(0, legacy - ours)
  const rate = legacy > 0 ? Math.round((save / legacy) * 100) : 0
  const oursWidth = legacy > 0 ? Math.max(6, Math.round((ours / legacy) * 100)) : 100

  const rows = [
    { key: '월 영상 제작', icon: Clapperboard, v: video, set: setVideo, min: 0, max: 60, step: 1, unit: '편', color: '#8b5cf6' },
    { key: '월 랜딩페이지 제작', icon: LayoutTemplate, v: landing, set: setLanding, min: 0, max: 20, step: 1, unit: '개', color: '#2563eb' },
    { key: '월 문자·알림톡 발송', icon: MessageSquare, v: message, set: setMessage, min: 0, max: 50000, step: 1000, unit: '건', color: '#06b6d4' },
  ] as const

  return (
    <section className="relative overflow-hidden py-24">
      <div className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[340px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[140px]" />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('비용 계산기')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('지금 쓰는 방식과 얼마나 차이 나는지')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('한 달 작업량을 옮겨보세요. 외주와 개별 툴 구독으로 나가던 비용이 하나의 구독으로 어떻게 바뀌는지 바로 계산됩니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              {/* 입력 */}
              <div className="border-b border-white/[0.07] p-5 sm:p-6 lg:border-b-0 lg:border-r">
                <p className="mb-5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                  <Calculator size={12} className="text-blue-400" /> {t('비용 계산기')}
                </p>

                <div className="space-y-6">
                  {rows.map((r) => {
                    const Icon = r.icon
                    return (
                      <div key={r.key}>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-soft)]">
                            <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${r.color}22`, color: r.color }}>
                              <Icon size={13} />
                            </span>
                            {t(r.key)}
                          </span>
                          <span className="text-[14px] font-bold tabular-nums" style={{ color: r.color }}>
                            {r.v.toLocaleString('ko-KR')}
                            <span className="ml-0.5 text-[11px]">{t(r.unit)}</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min={r.min}
                          max={r.max}
                          step={r.step}
                          value={r.v}
                          onChange={(e) => r.set(Number(e.target.value))}
                          aria-label={t(r.key)}
                          className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 outline-none"
                          style={{ accentColor: r.color }}
                        />
                      </div>
                    )
                  })}
                </div>

                <p className="mt-6 border-t border-white/[0.07] pt-4 text-[10.5px] leading-relaxed text-[var(--text-dim)]">
                  {t('외주 단가와 툴 구독료는 업계에서 흔히 쓰이는 값을 가정한 예시입니다. 실제 비용은 조건에 따라 달라집니다.')}
                </p>
              </div>

              {/* 결과 */}
              <div className="p-5 sm:p-6">
                {/* 기존 방식 */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[var(--text-soft)]">{t('기존 방식')}</span>
                    <span className="text-[17px] font-extrabold tabular-nums text-[var(--text)]">
                      {won(legacy)}
                      <span className="ml-0.5 text-[11px] font-bold">{t('원')}</span>
                    </span>
                  </div>
                  <span className="mt-2.5 block h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-400"
                      style={{ width: inView ? '100%' : '0%', transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)' }}
                    />
                  </span>
                  <span className="mt-2 block text-[10.5px] text-[var(--text-dim)]">{t('외주 제작비 · 개별 툴 구독료 합계')}</span>
                </div>

                {/* BYGENCY */}
                <div className="mt-3 rounded-2xl border border-blue-400/25 bg-blue-500/[0.07] p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-200">
                      <Sparkles size={12} /> {t('BYGENCY 구독 하나')}
                    </span>
                    <span className="text-[17px] font-extrabold tabular-nums text-blue-300">
                      {won(ours)}
                      <span className="ml-0.5 text-[11px] font-bold">{t('원')}</span>
                    </span>
                  </div>
                  <span className="mt-2.5 block h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full brand-gradient"
                      style={{
                        width: inView ? `${oursWidth}%` : '0%',
                        transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)',
                        boxShadow: '0 0 18px -4px #2563eb',
                      }}
                    />
                  </span>
                  <span className="mt-2 block text-[10.5px] text-[var(--text-dim)]">{t('플랜 구독료 + 사용한 만큼의 크레딧')}</span>
                </div>

                {/* 절감 */}
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {[
                    [TrendingDown, t('월 절감액'), `${won(save)}`, t('원'), '#22c55e'],
                    [Wallet, t('절감률'), `${rate}`, '%', '#38bdf8'],
                    [Sparkles, t('연간 환산'), `${won(save * 12)}`, t('원'), '#a855f7'],
                  ].map(([Icon, label, v, unit, color], i) => {
                    const I = Icon as typeof Wallet
                    return (
                      <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3">
                        <span className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
                          <I size={10} style={{ color: color as string }} /> {label as string}
                        </span>
                        <span className="mt-1 block truncate text-[15px] font-extrabold tabular-nums" style={{ color: color as string }}>
                          {v as string}
                          <span className="ml-0.5 text-[10px] font-bold">{unit as string}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. 플랜 찾기 ───────────────── */
type Choice = 0 | 1 | 2
const QUESTIONS = [
  { key: '팀 규모', icon: Users, options: ['혼자', '2~5인', '6인 이상'] },
  { key: '월 콘텐츠 제작량', icon: Clapperboard, options: ['가볍게', '꾸준히', '쏟아내듯'] },
  { key: '꼭 필요한 것', icon: Wand2, options: ['기본 분석', '자동화·CRM', '전담 지원·API'] },
] as const

const PLANS = [
  {
    id: 'plus',
    name: 'Plus',
    icon: Rocket,
    marketer: '₩29,000',
    video: '₩49,000',
    color: '#38bdf8',
    reasons: ['혼자서도 시작 부담이 없는 가격입니다', '기본 분석'],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Sparkles,
    marketer: '₩89,000',
    video: '₩149,000',
    color: '#2563eb',
    reasons: ['팀 협업과 자동화가 함께 열립니다', '제작량이 늘어도 크레딧이 모자라지 않습니다'],
  },
  {
    id: 'max',
    name: 'Max',
    icon: Building2,
    marketer: '₩249,000',
    video: '₩390,000',
    color: '#a855f7',
    reasons: ['무제한 협업과 전담 지원이 붙습니다', '전담 지원·API'],
  },
]

function PlanFinder() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [answers, setAnswers] = useState<Choice[]>([0, 1, 0])
  const [auto, setAuto] = useState(true)
  const step = useRef(0)

  // 사용자가 만지기 전까지는 스스로 골라 보여준다
  useEffect(() => {
    if (!auto || !inView) return
    const id = setInterval(() => {
      const q = step.current % QUESTIONS.length
      step.current += 1
      setAnswers((a) => {
        const next = [...a]
        next[q] = ((a[q] + 1) % 3) as Choice
        return next
      })
    }, 2100)
    return () => clearInterval(id)
  }, [auto, inView])

  const score = answers.reduce<number>((a, b) => a + b, 0) // 0~6
  const picked = score <= 1 ? 0 : score <= 4 ? 1 : 2
  const plan = PLANS[picked]

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-24">
      <div
        className="animate-drift-slow pointer-events-none absolute right-0 top-8 h-[340px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${plan.color}22` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('플랜 찾기')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('세 가지만 고르면 플랜이 정해집니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('팀 규모와 제작량, 필요한 기능을 고르면 지금 상황에 맞는 플랜을 골라드립니다.')}
          </p>
        </Reveal>

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* 질문 */}
          <Reveal variant="left">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-[#0b0d16] p-5 sm:p-6">
              {QUESTIONS.map((q, qi) => {
                const Icon = q.icon
                return (
                  <div key={q.key}>
                    <span className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-[var(--text-soft)]">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] text-[var(--text-dim)]">
                        <Icon size={13} />
                      </span>
                      {t(q.key)}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {q.options.map((o, oi) => {
                        const on = answers[qi] === oi
                        return (
                          <button
                            key={o}
                            onClick={() => {
                              setAuto(false)
                              setAnswers((a) => {
                                const next = [...a]
                                next[qi] = oi as Choice
                                return next
                              })
                            }}
                            className={cn(
                              'rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition-all duration-300',
                              on ? 'text-white' : 'border-white/[0.08] bg-white/[0.02] text-[var(--text-dim)] hover:border-white/20 hover:text-white',
                            )}
                            style={on ? { borderColor: plan.color, background: `${plan.color}22`, boxShadow: `0 10px 26px -18px ${plan.color}` } : undefined}
                          >
                            {t(o)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Reveal>

          {/* 추천 결과 */}
          <Reveal variant="right">
            <div
              className="relative overflow-hidden rounded-3xl border p-6 transition-all duration-700"
              style={{
                borderColor: `${plan.color}55`,
                background: `linear-gradient(160deg, ${plan.color}1a, #0b0d16 60%)`,
                boxShadow: `0 30px 80px -40px ${plan.color}`,
              }}
            >
              <span
                className="animate-drift pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-[70px]"
                style={{ background: `${plan.color}55` }}
              />
              <div className="relative">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{t('추천 플랜')}</span>

                <div className="mt-3 flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-500"
                    style={{ background: `${plan.color}26`, color: plan.color }}
                  >
                    <plan.icon size={22} />
                  </span>
                  <span>
                    <span className="block text-2xl font-extrabold tracking-tight text-[var(--text)]">{plan.name}</span>
                    <span className="block text-[11.5px] text-[var(--text-dim)]">BYGENCY</span>
                  </span>
                </div>

                {/* 두 트랙 가격 */}
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {[
                    [t('마케터 전용'), plan.marketer],
                    [t('AI 영상 제작'), plan.video],
                  ].map(([label, price]) => (
                    <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                      <span className="block text-[10px] text-[var(--text-dim)]">{label}</span>
                      <span className="mt-0.5 block text-[16px] font-extrabold tabular-nums text-[var(--text)]">
                        {price}
                        <span className="ml-0.5 text-[10px] font-semibold text-[var(--text-dim)]">{t('/월')}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* 이유 */}
                <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{t('이 플랜을 고른 이유')}</p>
                <div className="mt-2.5 space-y-2">
                  {plan.reasons.map((r, i) => (
                    <div
                      key={r}
                      className="flex items-start gap-2.5 text-[12.5px] leading-snug text-[var(--text-soft)]"
                      style={{ animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 90}ms both` }}
                    >
                      <span className="mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full" style={{ background: plan.color }}>
                        <Check size={10} className="text-white" />
                      </span>
                      {t(r)}
                    </div>
                  ))}
                </div>

                <Link
                  href="/signup"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white transition-transform duration-300 hover:scale-[1.02]"
                  style={{ background: `linear-gradient(120deg, ${plan.color}, #2563eb)` }}
                >
                  {t('지금 시작하기')} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function PricingShowcase() {
  return (
    <>
      <SavingsCalculator />
      <PlanFinder />
    </>
  )
}
