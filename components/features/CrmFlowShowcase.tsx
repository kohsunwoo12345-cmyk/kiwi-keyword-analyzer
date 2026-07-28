'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Filter,
  Users,
  Wallet,
  TrendingUp,
  MessageCircle,
  MessageSquare,
  Ticket,
  ShoppingCart,
  CheckCircle2,
  Zap,
  Clock,
  Sparkles,
  Target,
  Repeat,
} from 'lucide-react'
import { Reveal, Counter } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Feature } from '@/lib/features'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* funnel */
  '세일즈 파이프라인': { en: 'Sales pipeline', ja: 'セールスパイプライン', zh: '销售管道' },
  '엑셀에서 잠자던 DB가 매출로 흐릅니다': { en: 'Data asleep in a spreadsheet starts flowing into revenue', ja: 'Excelで眠っていたDBが売上へと流れ出します', zh: '在 Excel 里沉睡的数据开始流向销售' },
  '신규부터 계약까지 단계를 눈으로 보면, 어디서 리드가 새는지 바로 드러납니다. 각 단계의 건수와 예상 매출이 함께 집계됩니다.': {
    en: 'See the stages from new lead to closed deal and it becomes obvious where leads leak. Counts and expected revenue are tallied for every stage.',
    ja: '新規から契約まで段階を目で見れば、どこでリードが漏れているかがすぐ分かります。各段階の件数と予想売上も一緒に集計されます。',
    zh: '把从新客到成交的各阶段摆出来，就能立刻看出线索在哪里流失。每个阶段的数量与预计营收会一起统计。',
  },
  '신규': { en: 'New', ja: '新規', zh: '新客' },
  '상담': { en: 'In talks', ja: '商談', zh: '洽谈' },
  '제안': { en: 'Proposal', ja: '提案', zh: '报价' },
  '계약': { en: 'Closed', ja: '契約', zh: '成交' },
  '건': { en: '', ja: '件', zh: '个' },
  '단계 전환율': { en: 'Stage conversion', ja: '段階転換率', zh: '阶段转化率' },
  '이번 달 예상 매출': { en: 'Expected revenue this month', ja: '今月の予想売上', zh: '本月预计营收' },
  '평균 계약 금액': { en: 'Avg. deal size', ja: '平均契約金額', zh: '平均成交金额' },
  '전체 전환율': { en: 'Overall conversion', ja: '全体転換率', zh: '整体转化率' },
  '만원': { en: 'K KRW', ja: '万ウォン', zh: '万韩元' },
  '리드가 단계를 넘을 때마다 담당자에게 자동 알림이 갑니다': {
    en: 'Every time a lead moves a stage, the owner gets an automatic notification',
    ja: 'リードが段階を越えるたびに担当者へ自動通知が飛びます',
    zh: '线索每跨一个阶段，负责人就会收到自动通知',
  },

  /* segment */
  '고객 세그먼트': { en: 'Customer segments', ja: '顧客セグメント', zh: '客户分群' },
  '모두에게 뿌리는 대신, 될 사람에게만': { en: 'Not a blast to everyone — only to the ones who’ll convert', ja: '全員に配信する代わりに、響く人にだけ', zh: '不再群发所有人，只发给会转化的人' },
  '조건을 켜고 끄면 대상 고객 수가 즉시 다시 계산됩니다. 딱 맞는 사람만 골라 문자·알림톡을 보내세요.': {
    en: 'Toggle conditions and the audience size recalculates instantly. Pick exactly the right people and send them texts or alert messages.',
    ja: '条件をオン・オフすると対象顧客数が即座に再計算されます。ぴったり合う人だけを選んでSMS・通知トークを送りましょう。',
    zh: '打开或关掉条件，目标人数立即重算。只挑最合适的人发短信和通知消息。',
  },
  '전체 고객': { en: 'All customers', ja: '全顧客', zh: '全部客户' },
  '선택된 대상': { en: 'Selected audience', ja: '選択された対象', zh: '已选人群' },
  '명': { en: '', ja: '人', zh: '人' },
  '최근 30일 구매': { en: 'Purchased in last 30 days', ja: '直近30日に購入', zh: '近 30 天有购买' },
  '장바구니 이탈': { en: 'Abandoned cart', ja: 'カゴ落ち', zh: '弃购' },
  'VIP · 5회 이상 구매': { en: 'VIP · 5+ purchases', ja: 'VIP・5回以上購入', zh: 'VIP · 购买 5 次以上' },
  '90일 휴면': { en: 'Dormant 90 days', ja: '90日休眠', zh: '休眠 90 天' },
  '수도권 거주': { en: 'Seoul metro area', ja: '首都圏在住', zh: '首都圈居住' },
  '조건에 맞는 고객': { en: 'Matching customers', ja: '条件に合う顧客', zh: '符合条件的客户' },
  '조건 밖': { en: 'Filtered out', ja: '条件外', zh: '不符合' },
  '이 세그먼트로 발송': { en: 'Send to this segment', ja: 'このセグメントに配信', zh: '向该分群发送' },
  '김민수': { en: 'Minsu Kim', ja: 'キム・ミンス', zh: '金民秀' },
  '이서연': { en: 'Seoyeon Lee', ja: 'イ・ソヨン', zh: '李书妍' },
  '박지훈': { en: 'Jihoon Park', ja: 'パク・ジフン', zh: '朴智勋' },
  '최유나': { en: 'Yuna Choi', ja: 'チェ・ユナ', zh: '崔有娜' },
  '정하늘': { en: 'Haneul Jung', ja: 'チョン・ハヌル', zh: '郑天' },
  '누적 구매': { en: 'Purchases', ja: '累計購入', zh: '累计购买' },
  '회': { en: '', ja: '回', zh: '次' },

  /* automation */
  '자동 발송 시퀀스': { en: 'Automated sequence', ja: '自動配信シーケンス', zh: '自动发送序列' },
  '타이밍을 놓쳐 잃던 고객을 붙잡습니다': { en: 'Catch the customers you used to lose to bad timing', ja: 'タイミングを逃して失っていた顧客を掴みます', zh: '留住过去因错过时机而流失的客户' },
  '조건이 충족되면 정해둔 순서대로 알림톡과 문자가 자동으로 나갑니다. 사람이 기억하지 않아도 됩니다.': {
    en: 'When the condition is met, alert messages and texts go out automatically in the order you set. Nobody has to remember.',
    ja: '条件が満たされると、決めておいた順にトークとSMSが自動で送られます。人が覚えておく必要はありません。',
    zh: '条件一旦满足，通知消息和短信就按你设定的顺序自动发出。不需要谁去记着。',
  },
  '트리거': { en: 'Trigger', ja: 'トリガー', zh: '触发' },
  '장바구니에 담고 이탈': { en: 'Added to cart, then left', ja: 'カートに入れて離脱', zh: '加购后离开' },
  '1시간 후': { en: 'after 1 hour', ja: '1時間後', zh: '1 小时后' },
  '24시간 후': { en: 'after 24 hours', ja: '24時間後', zh: '24 小时后' },
  '3일 후': { en: 'after 3 days', ja: '3日後', zh: '3 天后' },
  '알림톡 발송': { en: 'Send alert message', ja: 'トーク配信', zh: '发送通知消息' },
  '문자 발송': { en: 'Send SMS', ja: 'SMS配信', zh: '发送短信' },
  '쿠폰 발송': { en: 'Send coupon', ja: 'クーポン配信', zh: '发送优惠券' },
  '구매 전환': { en: 'Purchase', ja: '購入転換', zh: '完成购买' },
  '장바구니에 담아두신 상품이 기다리고 있어요 🛒': { en: 'The item in your cart is still waiting 🛒', ja: 'カートに入れた商品が待っています 🛒', zh: '你加进购物车的商品还在等你 🛒' },
  '오늘까지만 무료배송! 지금 결제하면 내일 도착합니다': { en: 'Free shipping today only — order now, arrives tomorrow', ja: '今日だけ送料無料！今すぐ決済すれば明日到着', zh: '仅限今天免运费！现在下单明天送达' },
  '10% 할인 쿠폰이 도착했습니다 (3일 내 사용)': { en: 'A 10% off coupon arrived (use within 3 days)', ja: '10%割引クーポンが届きました（3日以内に利用）', zh: '10% 折扣券已送达（3 天内可用）' },
  '알림톡 도달률': { en: 'Alert delivery rate', ja: 'トーク到達率', zh: '通知送达率' },
  '재구매율 상승': { en: 'Repeat purchase lift', ja: 'リピート率の上昇', zh: '复购率提升' },
  '자동 발송': { en: 'Runs automatically', ja: '自動配信', zh: '自动发送' },
  '시간': { en: 'h', ja: '時間', zh: '小时' },
  '지금 발송 중': { en: 'Sending now', ja: '配信中', zh: '发送中' },
  '발송 완료': { en: 'Sent', ja: '配信完了', zh: '已发送' },
  '오후 2:14': { en: '2:14 PM', ja: '午後2:14', zh: '下午 2:14' },
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

/* ───────────────── 1. 파이프라인 퍼널 ───────────────── */
const STAGES = [
  { key: '신규', n: 1240, w: 100, color: '#f59e0b' },
  { key: '상담', n: 520, w: 68, color: '#fb923c' },
  { key: '제안', n: 214, w: 42, color: '#f97316' },
  { key: '계약', n: 96, w: 24, color: '#10b981' },
]

function PipelineFunnel({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)

  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[340px] w-[800px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1f` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('세일즈 파이프라인')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('엑셀에서 잠자던 DB가 매출로 흐릅니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('신규부터 계약까지 단계를 눈으로 보면, 어디서 리드가 새는지 바로 드러납니다. 각 단계의 건수와 예상 매출이 함께 집계됩니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            <div className="space-y-3 p-5 sm:p-7">
              {STAGES.map((s, i) => {
                const prev = STAGES[i - 1]
                const conv = prev ? Math.round((s.n / prev.n) * 100) : null
                return (
                  <div key={s.key}>
                    {conv !== null && (
                      <div className="flex items-center gap-2 py-1.5 pl-3">
                        <span className="h-4 w-px bg-white/15" />
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums"
                          style={{ background: conv >= 45 ? '#10b98118' : '#ef444418', color: conv >= 45 ? '#34d399' : '#f87171' }}
                        >
                          {conv}%
                        </span>
                        <span className="text-[10px] text-[var(--text-dim)]">{t('단계 전환율')}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <span className="w-12 flex-shrink-0 text-[12.5px] font-semibold text-[var(--text-soft)] sm:w-14">{t(s.key)}</span>
                      <span className="relative h-12 flex-1 overflow-hidden rounded-xl bg-white/[0.04] sm:h-14">
                        <span
                          className="absolute inset-y-0 left-0 flex items-center justify-end overflow-hidden rounded-xl pr-3"
                          style={{
                            width: inView ? `${s.w}%` : '0%',
                            background: `linear-gradient(90deg, ${s.color}cc, ${s.color})`,
                            boxShadow: `0 0 26px -8px ${s.color}`,
                            transition: `width 1000ms cubic-bezier(0.16,1,0.3,1) ${i * 160}ms`,
                          }}
                        >
                          {/* 단계를 타고 흐르는 리드 */}
                          {[0, 1, 2].map((d) => (
                            <span
                              key={d}
                              className="absolute h-1.5 w-1.5 rounded-full bg-white/70"
                              style={{ top: `${30 + d * 18}%`, animation: `pipeFlow ${2.6 + d * 0.5}s linear ${i * 0.3 + d * 0.7}s infinite` }}
                            />
                          ))}
                          <span className="relative text-[13px] font-bold tabular-nums text-white drop-shadow sm:text-[15px]">
                            <Counter to={s.n} />
                            {t('건')}
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 요약 */}
            <div className="grid grid-cols-1 divide-y divide-white/[0.07] border-t border-white/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                [Wallet, t('이번 달 예상 매출'), 8640, t('만원'), feature.accent],
                [Target, t('평균 계약 금액'), 90, t('만원'), '#fb923c'],
                [TrendingUp, t('전체 전환율'), 7.7, '%', '#10b981'],
              ].map(([Icon, label, v, unit, color], i) => {
                const I = Icon as typeof Wallet
                return (
                  <div key={i} className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                      <I size={12} style={{ color: color as string }} /> {label as string}
                    </span>
                    <span className="mt-1 block text-xl font-bold tabular-nums" style={{ color: color as string }}>
                      <Counter to={v as number} decimals={(v as number) % 1 === 0 ? 0 : 1} />
                      <span className="ml-0.5 text-[12px] font-semibold">{unit as string}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[11.5px] text-[var(--text-dim)]">
              <Sparkles size={12} style={{ color: feature.accent }} />
              {t('리드가 단계를 넘을 때마다 담당자에게 자동 알림이 갑니다')}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. 세그먼트 빌더 ───────────────── */
type Cond = { id: string; label: string; icon: typeof Repeat; ratio: number }
const CONDS: Cond[] = [
  { id: 'recent', label: '최근 30일 구매', icon: Repeat, ratio: 0.34 },
  { id: 'cart', label: '장바구니 이탈', icon: ShoppingCart, ratio: 0.22 },
  { id: 'vip', label: 'VIP · 5회 이상 구매', icon: Sparkles, ratio: 0.12 },
  { id: 'dormant', label: '90일 휴면', icon: Clock, ratio: 0.28 },
  { id: 'seoul', label: '수도권 거주', icon: Target, ratio: 0.61 },
]
const BASE = 12480

const CUSTOMERS = [
  { name: '김민수', buys: 7, tags: ['recent', 'vip', 'seoul'], color: '#f59e0b' },
  { name: '이서연', buys: 2, tags: ['cart', 'seoul'], color: '#a855f7' },
  { name: '박지훈', buys: 9, tags: ['recent', 'vip'], color: '#0ea5e9' },
  { name: '최유나', buys: 1, tags: ['dormant', 'seoul'], color: '#10b981' },
  { name: '정하늘', buys: 4, tags: ['cart', 'dormant'], color: '#f43f5e' },
]

function SegmentBuilder({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [on, setOn] = useState<string[]>(['recent', 'seoul'])
  const [auto, setAuto] = useState(true)
  const step = useRef(0)

  useEffect(() => {
    if (!auto || !inView) return
    const id = setInterval(() => {
      const c = CONDS[step.current % CONDS.length]
      step.current += 1
      setOn((list) => (list.includes(c.id) ? list.filter((x) => x !== c.id) : [...list, c.id]))
    }, 2600)
    return () => clearInterval(id)
  }, [auto, inView])

  // 조건은 교집합이므로 항상 대상이 줄어든다. 여러 개를 켜도 0에 수렴하지 않도록 지수를 완화.
  const ratio = CONDS.filter((c) => on.includes(c.id)).reduce((a, c) => a * Math.pow(c.ratio, 0.75), 1)
  const size = Math.max(120, Math.round(BASE * Math.min(1, ratio)))
  const pct = Math.round((size / BASE) * 100)

  function toggle(id: string) {
    setAuto(false)
    setOn((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  }

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-20">
      <div
        className="animate-drift-slow pointer-events-none absolute left-0 top-8 h-[340px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${feature.accent}20` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('고객 세그먼트')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('모두에게 뿌리는 대신, 될 사람에게만')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('조건을 켜고 끄면 대상 고객 수가 즉시 다시 계산됩니다. 딱 맞는 사람만 골라 문자·알림톡을 보내세요.')}
          </p>
        </Reveal>

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* 조건 */}
          <Reveal variant="left">
            <div className="rounded-3xl border border-white/10 bg-[#0b0d16] p-5">
              <p className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Filter size={12} style={{ color: feature.accent }} /> {t('고객 세그먼트')}
              </p>

              <div className="space-y-2.5">
                {CONDS.map((c) => {
                  const Icon = c.icon
                  const active = on.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-300',
                        active ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]',
                      )}
                    >
                      <span
                        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl transition-colors duration-300"
                        style={{
                          background: active ? `${feature.accent}26` : 'rgba(255,255,255,0.05)',
                          color: active ? feature.accent : 'var(--text-dim)',
                        }}
                      >
                        <Icon size={15} />
                      </span>
                      <span className={cn('flex-1 text-[13px] font-medium transition-colors', active ? 'text-[var(--text)]' : 'text-[var(--text-dim)]')}>
                        {t(c.label)}
                      </span>
                      {/* 토글 스위치 */}
                      <span
                        className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-300"
                        style={{ background: active ? feature.accent : 'rgba(255,255,255,0.12)' }}
                      >
                        <span
                          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-300"
                          style={{ left: 2, transform: active ? 'translateX(16px)' : 'none' }}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>

          {/* 대상 규모 + 샘플 */}
          <Reveal variant="right">
            <div className="rounded-3xl border border-white/10 bg-[#0b0d16] p-5">
              {/* 카운터 */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
                <div className="flex items-end justify-between">
                  <span>
                    <span className="block text-[11px] text-[var(--text-dim)]">{t('선택된 대상')}</span>
                    <span className="mt-0.5 block text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: feature.accent }}>
                      <Counter to={size} duration={700} />
                      <span className="ml-1 text-sm font-bold">{t('명')}</span>
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[11px] text-[var(--text-dim)]">{t('전체 고객')}</span>
                    <span className="mt-0.5 block text-[15px] font-semibold tabular-nums text-[var(--text-soft)]">
                      {BASE.toLocaleString('ko-KR')}
                      {t('명')}
                    </span>
                  </span>
                </div>
                <span className="mt-3 block h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${feature.accent}, #fb923c)`,
                      transition: 'width 700ms cubic-bezier(0.16,1,0.3,1)',
                      boxShadow: `0 0 16px -4px ${feature.accent}`,
                    }}
                  />
                </span>
                <span className="mt-1.5 block text-right text-[10.5px] tabular-nums text-[var(--text-dim)]">{pct}%</span>
              </div>

              {/* 샘플 고객 */}
              <div className="mt-4 space-y-2">
                {CUSTOMERS.map((c) => {
                  const match = on.length === 0 || on.every((id) => c.tags.includes(id))
                  return (
                    <div
                      key={c.name}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500',
                        match ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/[0.05] bg-transparent',
                      )}
                      style={{ opacity: match ? 1 : 0.32, transform: match ? 'none' : 'translateX(-6px)' }}
                    >
                      <span
                        className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}aa)` }}
                      >
                        {c.name.slice(0, 1)}
                      </span>
                      <span className="flex-1 truncate text-[12.5px] font-medium text-[var(--text)]">{t(c.name)}</span>
                      <span className="hidden text-[11px] text-[var(--text-dim)] sm:block">
                        {t('누적 구매')} {c.buys}
                        {t('회')}
                      </span>
                      <span
                        className="flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors duration-500"
                        style={{
                          background: match ? '#10b98122' : 'rgba(255,255,255,0.05)',
                          color: match ? '#34d399' : 'var(--text-dim)',
                        }}
                      >
                        {match ? t('조건에 맞는 고객') : t('조건 밖')}
                      </span>
                    </div>
                  )
                })}
              </div>

              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-[#20160a] transition-transform duration-300 hover:scale-[1.01]"
                style={{ background: `linear-gradient(120deg, ${feature.accent}, #fb923c)` }}
              >
                <MessageCircle size={15} /> {t('이 세그먼트로 발송')}
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────────── 3. 자동 발송 시퀀스 ───────────────── */
type SeqNode = { key: string; when: string; icon: typeof Zap; color: string; msg?: string }
const NODES: SeqNode[] = [
  { key: '장바구니에 담고 이탈', when: '트리거', icon: ShoppingCart, color: '#f59e0b' },
  { key: '알림톡 발송', when: '1시간 후', icon: MessageCircle, color: '#fbbf24', msg: '장바구니에 담아두신 상품이 기다리고 있어요 🛒' },
  { key: '문자 발송', when: '24시간 후', icon: MessageSquare, color: '#fb923c', msg: '오늘까지만 무료배송! 지금 결제하면 내일 도착합니다' },
  { key: '쿠폰 발송', when: '3일 후', icon: Ticket, color: '#f97316', msg: '10% 할인 쿠폰이 도착했습니다 (3일 내 사용)' },
  { key: '구매 전환', when: '', icon: CheckCircle2, color: '#10b981' },
]

function AutomationSequence({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setActive((v) => (v + 1) % (NODES.length + 1)), 2200)
    return () => clearInterval(id)
  }, [inView])

  // 활성 단계까지 도착한 메시지만 폰에 쌓인다
  const bubbles = NODES.filter((n, i) => n.msg && i <= active)

  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1a` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('자동 발송 시퀀스')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('타이밍을 놓쳐 잃던 고객을 붙잡습니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('조건이 충족되면 정해둔 순서대로 알림톡과 문자가 자동으로 나갑니다. 사람이 기억하지 않아도 됩니다.')}
          </p>
        </Reveal>

        <div className="mt-12 grid items-center gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          {/* 시퀀스 */}
          <Reveal variant="left">
            <div className="rounded-3xl border border-white/10 bg-[#0b0d16] p-5 sm:p-6">
              <div className="relative space-y-1">
                {NODES.map((n, i) => {
                  const Icon = n.icon
                  const done = i < active
                  const now = i === active
                  return (
                    <div key={n.key}>
                      {i > 0 && (
                        <div className="relative ml-[19px] h-7 w-0.5 overflow-hidden rounded bg-white/[0.08]">
                          <span
                            className="absolute inset-x-0 top-0 rounded"
                            style={{
                              height: done || now ? '100%' : '0%',
                              background: `linear-gradient(180deg, ${feature.accent}, ${n.color})`,
                              transition: 'height 700ms cubic-bezier(0.16,1,0.3,1)',
                            }}
                          />
                          {now && (
                            <span
                              className="absolute inset-x-0 h-2 rounded-full"
                              style={{ background: '#fff', animation: 'pipeFlowV 1.2s linear infinite' }}
                            />
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          'flex items-center gap-3.5 rounded-2xl border px-3.5 py-3 transition-all duration-500',
                          now ? 'border-white/25 bg-white/[0.07]' : done ? 'border-white/[0.09] bg-white/[0.03]' : 'border-white/[0.06] bg-transparent',
                        )}
                        style={{ boxShadow: now ? `0 16px 40px -24px ${n.color}` : undefined }}
                      >
                        <span className="relative">
                          <span
                            className="grid h-10 w-10 place-items-center rounded-xl transition-all duration-500"
                            style={{
                              background: done || now ? `${n.color}26` : 'rgba(255,255,255,0.05)',
                              color: done || now ? n.color : 'var(--text-dim)',
                              transform: now ? 'scale(1.08)' : 'none',
                            }}
                          >
                            <Icon size={17} />
                          </span>
                          {now && <span className="animate-ping-ring absolute inset-0 rounded-xl" style={{ border: `1px solid ${n.color}` }} />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={cn('text-[13px] font-semibold', done || now ? 'text-[var(--text)]' : 'text-[var(--text-dim)]')}>
                              {t(n.key)}
                            </span>
                            {n.when && (
                              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--text-dim)]">
                                {t(n.when)}
                              </span>
                            )}
                          </span>
                          {n.msg && (
                            <span className={cn('mt-0.5 block truncate text-[11.5px]', done || now ? 'text-[var(--text-soft)]' : 'text-[var(--text-dim)]')}>
                              {t(n.msg)}
                            </span>
                          )}
                        </span>

                        {(done || now) && (
                          <span
                            className="flex-shrink-0 rounded-md px-2 py-0.5 text-[9.5px] font-bold"
                            style={{ background: now ? `${n.color}22` : '#10b98118', color: now ? n.color : '#34d399' }}
                          >
                            {now ? t('지금 발송 중') : t('발송 완료')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 성과 */}
              <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-white/[0.07] pt-4">
                {[
                  [t('알림톡 도달률'), 95, '%', '#10b981'],
                  [t('재구매율 상승'), 38, '%', feature.accent],
                  [t('자동 발송'), 24, t('시간'), '#fb923c'],
                ].map(([label, v, unit, color], i) => (
                  <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                    <span className="block text-[10px] text-[var(--text-dim)]">{label as string}</span>
                    <span className="mt-0.5 block text-[16px] font-bold tabular-nums" style={{ color: color as string }}>
                      <Counter to={v as number} />
                      <span className="text-[11px]">{unit as string}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* 폰 목업 */}
          <Reveal variant="right">
            <div className="mx-auto w-full max-w-[280px]">
              <div className="relative rounded-[36px] border border-white/15 bg-[#05070e] p-2.5 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.95)]">
                <div className="relative overflow-hidden rounded-[28px] bg-[#0e1220]">
                  {/* 노치 */}
                  <span className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-black/70" />
                  {/* 상단바 */}
                  <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 pb-2.5 pt-7">
                    <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${feature.accent}26`, color: feature.accent }}>
                      <MessageCircle size={14} />
                    </span>
                    <span className="text-[11.5px] font-semibold text-[var(--text)]">BYGENCY</span>
                    <span className="ml-auto text-[9.5px] text-[var(--text-dim)]">{t('오후 2:14')}</span>
                  </div>

                  {/* 말풍선 */}
                  <div className="flex h-[300px] flex-col justify-end gap-2.5 px-3.5 pb-4 pt-3">
                    {bubbles.map((n, i) => (
                      <div key={n.key} className="animate-bubble-in flex items-end gap-1.5" style={{ animationDelay: `${i * 60}ms` }}>
                        <span
                          className="max-w-[86%] rounded-2xl rounded-bl-md px-3 py-2.5 text-[11.5px] leading-relaxed"
                          style={{ background: `${feature.accent}1f`, color: 'var(--text)', border: `1px solid ${feature.accent}33` }}
                        >
                          {t(n.msg!)}
                        </span>
                      </div>
                    ))}
                    {active >= NODES.length - 1 && (
                      <div className="animate-bubble-in flex justify-end">
                        <span className="inline-flex items-center gap-1.5 rounded-2xl rounded-br-md bg-emerald-500/20 px-3 py-2 text-[11.5px] font-semibold text-emerald-300">
                          <CheckCircle2 size={12} /> {t('구매 전환')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function CrmFlowShowcase({ feature }: { feature: Feature }) {
  return (
    <>
      <PipelineFunnel feature={feature} />
      <SegmentBuilder feature={feature} />
      <AutomationSequence feature={feature} />
    </>
  )
}
