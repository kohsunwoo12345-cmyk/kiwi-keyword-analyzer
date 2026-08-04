'use client'
import '@/app/styles/features-showcase.css'

import { useEffect, useRef, useState } from 'react'
import {
  LayoutTemplate,
  BarChart3,
  Contact,
  MessageSquare,
  Clapperboard,
  FileSpreadsheet,
  Sunrise,
  Send,
  MoonStar,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Reveal } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* map */
  '하나로 연결': { en: 'Connected into one', ja: '一つに接続', zh: '连成一体' },
  '흩어져 있던 도구가 한가운데로 모입니다': { en: 'Scattered tools converge into one center', ja: '散らばっていたツールが真ん中に集まります', zh: '散落的工具汇向同一个中心' },
  '탭을 옮겨 다닐 때마다 데이터도 맥락도 끊겼습니다. BYGENCY는 여섯 갈래로 흩어져 있던 일을 하나의 워크스페이스로 이어 붙입니다.': {
    en: 'Every tab switch broke both the data and the context. BYGENCY stitches work that used to run in six directions into a single workspace.',
    ja: 'タブを移るたびにデータも文脈も途切れていました。BYGENCYは6方向に散らばっていた仕事を一つのワークスペースにつなぎ合わせます。',
    zh: '每切换一个标签页，数据和上下文都断掉。BYGENCY 把原本分散在六个方向的工作缝进同一个工作区。',
  },
  '랜딩페이지': { en: 'Landing pages', ja: 'ランディングページ', zh: '落地页' },
  '채널 분석': { en: 'Channel analytics', ja: 'チャネル分析', zh: '渠道分析' },
  '고객 CRM': { en: 'Customer CRM', ja: '顧客CRM', zh: '客户 CRM' },
  '문자·알림톡': { en: 'SMS & alerts', ja: 'SMS・通知トーク', zh: '短信与通知' },
  'AI 영상': { en: 'AI video', ja: 'AI動画', zh: 'AI 视频' },
  '통합 리포트': { en: 'Unified reports', ja: '統合レポート', zh: '整合报告' },
  '하나의 워크스페이스': { en: 'One workspace', ja: '一つのワークスペース', zh: '一个工作区' },
  '데이터가 끊기지 않고 흐릅니다': { en: 'Data flows without a break', ja: 'データが途切れずに流れます', zh: '数据不中断地流动' },

  /* day */
  '마케터의 하루': { en: 'A marketer’s day', ja: 'マーケターの一日', zh: '营销人的一天' },
  '하루가 이렇게 달라집니다': { en: 'This is how the day changes', ja: '一日がこう変わります', zh: '一天会变成这样' },
  '도구 사이를 오가느라 흘려보내던 시간을 되돌려 놓으면, 하루의 모양이 이렇게 바뀝니다.': {
    en: 'Give back the hours lost shuttling between tools and the shape of your day changes like this.',
    ja: 'ツールの間を行き来して流していた時間を取り戻すと、一日の形はこう変わります。',
    zh: '把在工具之间来回奔波流失的时间还回来，一天的样子就变成这样。',
  },
  '오전 9시': { en: '9 AM', ja: '午前9時', zh: '上午 9 点' },
  '오전 11시': { en: '11 AM', ja: '午前11時', zh: '上午 11 点' },
  '오후 2시': { en: '2 PM', ja: '午後2時', zh: '下午 2 点' },
  '오후 6시': { en: '6 PM', ja: '午後6時', zh: '下午 6 点' },
  '어젯밤 성과를 한 화면에서 확인': { en: 'Check last night’s results on one screen', ja: '昨夜の成果を一画面で確認', zh: '在一屏上查看昨夜的成效' },
  '채널별 리포트를 열 필요 없이 통합 대시보드 하나로 끝납니다.': {
    en: 'No opening reports channel by channel — one unified dashboard is enough.',
    ja: 'チャネルごとにレポートを開く必要はなく、統合ダッシュボード一つで終わります。',
    zh: '不用一个个渠道打开报告，一个整合仪表盘就够了。',
  },
  '오늘 올릴 영상 두 편 제작': { en: 'Make the two videos going up today', ja: '今日出す動画2本を制作', zh: '做完今天要发的两支视频' },
  '외주 일정을 잡는 대신 노드 스튜디오에서 바로 뽑습니다.': {
    en: 'Instead of booking an agency, pull them straight out of Node Studio.',
    ja: '外注のスケジュールを組む代わりに、ノードスタジオで直接作ります。',
    zh: '不必排外包档期，直接在节点工作室里产出。',
  },
  '세그먼트 골라 캠페인 발송': { en: 'Pick a segment and send the campaign', ja: 'セグメントを選んでキャンペーン配信', zh: '选好分群，发出活动' },
  '조건에 맞는 고객만 골라 알림톡이 자동으로 나갑니다.': {
    en: 'Only the customers who match go out an automatic alert message.',
    ja: '条件に合う顧客だけを選んで、通知トークが自動で送られます。',
    zh: '只挑符合条件的客户，通知消息自动发出。',
  },
  '리포트는 이미 만들어져 있습니다': { en: 'The report is already written', ja: 'レポートはもう出来ています', zh: '报告已经生成好了' },
  '숫자를 옮겨 붙이던 시간에 다음 전략을 고민합니다.': {
    en: 'The time once spent copying numbers now goes to the next strategy.',
    ja: '数字を貼り付けていた時間を、次の戦略を考える時間にします。',
    zh: '过去搬数字的时间，现在用来想下一步策略。',
  },
  '자동화됨': { en: 'Automated', ja: '自動化', zh: '已自动化' },
  '진행 중': { en: 'In progress', ja: '進行中', zh: '进行中' },
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

/* ───────────────── 1. 통합 연결 맵 ───────────────── */
const TOOLS = [
  { key: '랜딩페이지', icon: LayoutTemplate, color: '#2563eb' },
  { key: '채널 분석', icon: BarChart3, color: '#8b5cf6' },
  { key: '고객 CRM', icon: Contact, color: '#f59e0b' },
  { key: '문자·알림톡', icon: MessageSquare, color: '#06b6d4' },
  { key: 'AI 영상', icon: Clapperboard, color: '#a855f7' },
  { key: '통합 리포트', icon: FileSpreadsheet, color: '#10b981' },
]
/* 중심(50%,50%) 기준 배치 — 좌우 3개씩 */
const POS = [
  { x: 12, y: 16 },
  { x: 12, y: 50 },
  { x: 12, y: 84 },
  { x: 88, y: 16 },
  { x: 88, y: 50 },
  { x: 88, y: 84 },
]

function ConnectionMap() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setActive((v) => (v + 1) % TOOLS.length), 1500)
    return () => clearInterval(id)
  }, [inView])

  return (
    <section className="relative overflow-hidden py-24">
      <div className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[340px] w-[780px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[140px]" />
      <div ref={ref} className="relative mx-auto max-w-5xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('하나로 연결')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('흩어져 있던 도구가 한가운데로 모입니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('탭을 옮겨 다닐 때마다 데이터도 맥락도 끊겼습니다. BYGENCY는 여섯 갈래로 흩어져 있던 일을 하나의 워크스페이스로 이어 붙입니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] p-4 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] sm:p-6">
            <div className="relative mx-auto h-[420px] w-full max-w-3xl sm:h-[380px]">
              {/* 연결선 */}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                {POS.map((p, i) => (
                  <line
                    key={i}
                    x1={p.x}
                    y1={p.y}
                    x2="50"
                    y2="50"
                    stroke={i === active ? TOOLS[i].color : 'rgba(255,255,255,0.12)'}
                    strokeWidth={i === active ? 0.7 : 0.35}
                    strokeDasharray="2 2"
                    className={i === active ? 'vs-flow' : undefined}
                    style={{ transition: 'stroke 500ms ease, stroke-width 500ms ease' }}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>

              {/* 중심 코어 */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <span className="animate-drift absolute -inset-8 rounded-full bg-blue-500/25 blur-2xl" />
                  <span className="relative grid h-24 w-24 place-items-center rounded-3xl border border-white/15 bg-[#0d1120] shadow-[0_20px_50px_-20px_rgba(37,99,235,0.9)] sm:h-28 sm:w-28">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl brand-gradient sm:h-12 sm:w-12">
                      <Layers size={22} className="text-white" />
                    </span>
                  </span>
                  <span className="animate-ping-ring absolute inset-0 rounded-3xl border border-blue-400/60" />
                </div>
                <p className="mt-3 text-center text-[12px] font-bold text-[var(--text)]">{t('하나의 워크스페이스')}</p>
                <p className="mt-0.5 text-center text-[10.5px] text-[var(--text-dim)]">{t('데이터가 끊기지 않고 흐릅니다')}</p>
              </div>

              {/* 도구 노드 */}
              {TOOLS.map((tool, i) => {
                const Icon = tool.icon
                const on = i === active
                const p = POS[i]
                return (
                  <div
                    key={tool.key}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <div
                      className={cn(
                        'flex w-[124px] flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 transition-all duration-500 sm:w-[136px]',
                        on ? 'border-white/25 bg-white/[0.07]' : 'border-white/[0.08] bg-white/[0.02]',
                      )}
                      style={{
                        transform: on ? 'scale(1.06)' : 'none',
                        boxShadow: on ? `0 18px 44px -24px ${tool.color}` : undefined,
                      }}
                    >
                      <span
                        className="grid h-9 w-9 place-items-center rounded-xl transition-colors duration-500"
                        style={{ background: on ? `${tool.color}30` : 'rgba(255,255,255,0.05)', color: on ? tool.color : 'var(--text-dim)' }}
                      >
                        <Icon size={16} />
                      </span>
                      <span className={cn('text-center text-[11px] font-semibold transition-colors', on ? 'text-[var(--text)]' : 'text-[var(--text-dim)]')}>
                        {t(tool.key)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. 마케터의 하루 ───────────────── */
const DAY = [
  { time: '오전 9시', icon: Sunrise, title: '어젯밤 성과를 한 화면에서 확인', desc: '채널별 리포트를 열 필요 없이 통합 대시보드 하나로 끝납니다.', color: '#f59e0b' },
  { time: '오전 11시', icon: Clapperboard, title: '오늘 올릴 영상 두 편 제작', desc: '외주 일정을 잡는 대신 노드 스튜디오에서 바로 뽑습니다.', color: '#a855f7' },
  { time: '오후 2시', icon: Send, title: '세그먼트 골라 캠페인 발송', desc: '조건에 맞는 고객만 골라 알림톡이 자동으로 나갑니다.', color: '#06b6d4' },
  { time: '오후 6시', icon: MoonStar, title: '리포트는 이미 만들어져 있습니다', desc: '숫자를 옮겨 붙이던 시간에 다음 전략을 고민합니다.', color: '#10b981' },
]

function MarketerDay() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setStep((v) => (v + 1) % (DAY.length + 1)), 2000)
    return () => clearInterval(id)
  }, [inView])

  const progress = Math.min(100, (step / (DAY.length - 1)) * 100)

  return (
    <section className="relative overflow-hidden py-24">
      <div className="animate-drift-slow pointer-events-none absolute left-1/2 top-0 h-[300px] w-[720px] -translate-x-1/2 rounded-full bg-blue-600/12 blur-[140px]" />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('마케터의 하루')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('하루가 이렇게 달라집니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('도구 사이를 오가느라 흘려보내던 시간을 되돌려 놓으면, 하루의 모양이 이렇게 바뀝니다.')}
          </p>
        </Reveal>

        <Reveal className="mt-12">
          {/* 진행선 */}
          <div className="relative mb-6 hidden h-1 rounded-full bg-white/[0.07] lg:block">
            <span
              className="absolute inset-y-0 left-0 rounded-full brand-gradient"
              style={{ width: `${progress}%`, transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 0 16px -3px #2563eb' }}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {DAY.map((d, i) => {
              const Icon = d.icon
              const done = i < step
              const now = i === step
              return (
                <div
                  key={d.time}
                  className={cn(
                    'relative flex flex-col rounded-3xl border p-5 transition-all duration-500',
                    now ? 'border-white/25 bg-white/[0.06]' : done ? 'border-white/[0.1] bg-white/[0.03]' : 'border-white/[0.07] bg-white/[0.015]',
                  )}
                  style={{
                    transform: now ? 'translateY(-6px)' : 'none',
                    boxShadow: now ? `0 28px 60px -34px ${d.color}` : undefined,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl transition-all duration-500"
                        style={{
                          background: done || now ? `${d.color}26` : 'rgba(255,255,255,0.05)',
                          color: done || now ? d.color : 'var(--text-dim)',
                          transform: now ? 'scale(1.08)' : 'none',
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      {now && <span className="animate-ping-ring absolute inset-0 rounded-xl" style={{ border: `1px solid ${d.color}` }} />}
                    </span>
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: done || now ? d.color : 'var(--text-dim)' }}>
                      {t(d.time)}
                    </span>
                    {(done || now) && (
                      <span
                        className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold"
                        style={{ background: now ? `${d.color}22` : '#10b98118', color: now ? d.color : '#34d399' }}
                      >
                        {now ? (
                          <>
                            <Sparkles size={9} /> {t('진행 중')}
                          </>
                        ) : (
                          <>
                            <Check size={9} /> {t('자동화됨')}
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <h3 className={cn('mt-4 text-[14.5px] font-semibold leading-snug transition-colors', done || now ? 'text-[var(--text)]' : 'text-[var(--text-dim)]')}>
                    {t(d.title)}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--text-soft)]">{t(d.desc)}</p>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function AboutShowcase() {
  return (
    <>
      <ConnectionMap />
      <MarketerDay />
    </>
  )
}
