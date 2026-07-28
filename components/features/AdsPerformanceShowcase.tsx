'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Wallet,
  TrendingUp,
  Trophy,
  MousePointerClick,
  Eye,
  Target,
  Sparkles,
  ArrowRight,
  ArrowUp,
  Zap,
  BarChart3,
} from 'lucide-react'
import { Reveal, Counter } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Feature } from '@/lib/features'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* dashboard */
  '통합 대시보드': { en: 'Unified dashboard', ja: '統合ダッシュボード', zh: '整合仪表盘' },
  '세 채널을 한 화면에서 동시에 지켜봅니다': { en: 'Watch all three channels on one screen at once', ja: '3チャネルを一画面で同時に見張ります', zh: '三个渠道，一屏同看' },
  '메타·구글·네이버 성과가 실시간으로 갱신됩니다. 채널별 리포트를 짜 맞추는 동안 놓치던 타이밍을 되찾으세요.': {
    en: 'Meta, Google, and Naver performance refresh in real time. Win back the timing you used to lose while stitching per-channel reports together.',
    ja: 'Meta・Google・Naverの成果がリアルタイムで更新されます。チャネルごとのレポートをつなぎ合わせる間に逃していたタイミングを取り戻しましょう。',
    zh: 'Meta、Google、Naver 的成效实时刷新。把过去拼报告时错过的时机夺回来。',
  },
  '실시간': { en: 'Live', ja: 'リアルタイム', zh: '实时' },
  '메타': { en: 'Meta', ja: 'Meta', zh: 'Meta' },
  '구글': { en: 'Google', ja: 'Google', zh: 'Google' },
  '네이버': { en: 'Naver', ja: 'Naver', zh: 'Naver' },
  '광고비': { en: 'Ad spend', ja: '広告費', zh: '广告花费' },
  '매출': { en: 'Revenue', ja: '売上', zh: '销售额' },
  '클릭': { en: 'Clicks', ja: 'クリック', zh: '点击' },
  '노출': { en: 'Impressions', ja: 'インプレッション', zh: '曝光' },
  '전환': { en: 'Conversions', ja: 'コンバージョン', zh: '转化' },
  '만': { en: '0k', ja: '万', zh: '万' },
  '최근 14일 채널별 매출': { en: 'Revenue by channel — last 14 days', ja: '直近14日のチャネル別売上', zh: '最近 14 天各渠道销售额' },
  '오늘': { en: 'Today', ja: '今日', zh: '今天' },
  '통합 ROAS': { en: 'Blended ROAS', ja: '統合ROAS', zh: '整体 ROAS' },
  '총 광고비': { en: 'Total spend', ja: '総広告費', zh: '总花费' },
  '총 매출': { en: 'Total revenue', ja: '総売上', zh: '总销售额' },
  '일': { en: 'd', ja: '日', zh: '日' },

  /* duel */
  '소재 A/B 대결': { en: 'Creative A/B duel', ja: '素材A/B対決', zh: '素材 A/B 对决' },
  '되는 소재에 예산을 몰아줍니다': { en: 'Pour the budget into the creative that works', ja: '効く素材に予算を集中させます', zh: '把预算集中到有效的素材上' },
  '같은 예산으로 두 소재를 돌려 CTR·전환율·ROAS를 나란히 비교합니다. 승자가 가려지면 예산이 자동으로 옮겨갑니다.': {
    en: 'Run two creatives on the same budget and compare CTR, conversion rate, and ROAS side by side. Once a winner emerges, the budget shifts automatically.',
    ja: '同じ予算で2つの素材を回し、CTR・転換率・ROASを並べて比較します。勝者が決まれば予算は自動で移ります。',
    zh: '用同样的预算跑两个素材，并排比较 CTR、转化率与 ROAS。分出胜负后，预算自动迁移。',
  },
  '소재 A': { en: 'Creative A', ja: '素材A', zh: '素材 A' },
  '소재 B': { en: 'Creative B', ja: '素材B', zh: '素材 B' },
  '전환율': { en: 'CVR', ja: '転換率', zh: '转化率' },
  '승': { en: 'Winner', ja: '勝', zh: '胜出' },
  '예산 80% 이동': { en: '80% of budget moved', ja: '予算80%を移動', zh: '80% 预算迁移' },
  '테스트 중': { en: 'Testing', ja: 'テスト中', zh: '测试中' },
  '인물 클로즈업 · 후기형': { en: 'Face close-up · testimonial', ja: '人物クローズアップ・レビュー型', zh: '人物特写 · 口碑型' },
  '제품 단독 · 혜택 강조': { en: 'Product only · offer-led', ja: '製品単独・特典訴求', zh: '产品单拍 · 强调优惠' },
  '도시 야경 · 브랜딩': { en: 'City night · branding', ja: '都市夜景・ブランディング', zh: '城市夜景 · 品牌向' },
  '실사용 장면 · 비교형': { en: 'In-use shot · comparison', ja: '実使用シーン・比較型', zh: '实际使用 · 对比型' },

  /* optimizer */
  'AI 예산 최적화': { en: 'AI budget optimization', ja: 'AI予算最適化', zh: 'AI 预算优化' },
  '감으로 나누던 예산을 숫자로 다시 나눕니다': { en: 'Split by numbers what you used to split by gut', ja: '勘で分けていた予算を数字で分け直します', zh: '把凭感觉分的预算，用数字重新分' },
  '채널별 한계 효율을 계산해 예산을 재배분합니다. 같은 돈으로 얼마나 더 벌 수 있는지 적용 전후로 비교해 보세요.': {
    en: 'We compute marginal efficiency per channel and reallocate the budget. Compare before and after to see how much more the same money can earn.',
    ja: 'チャネルごとの限界効率を計算して予算を再配分します。同じ金額でどれだけ多く稼げるか、適用前後で比べてみてください。',
    zh: '计算各渠道的边际效率并重新分配预算。用适用前后对比，看看同样的钱能多赚多少。',
  },
  '현재 배분': { en: 'Current split', ja: '現在の配分', zh: '当前分配' },
  'AI 제안 배분': { en: 'AI-proposed split', ja: 'AI提案の配分', zh: 'AI 建议分配' },
  '적용 전': { en: 'Before', ja: '適用前', zh: '优化前' },
  '적용 후': { en: 'After', ja: '適用後', zh: '优化后' },
  '예상 추가 매출': { en: 'Extra revenue expected', ja: '予想追加売上', zh: '预计新增营收' },
  'AI 최적화 적용': { en: 'Apply AI optimization', ja: 'AI最適化を適用', zh: '应用 AI 优化' },
  '적용 완료': { en: 'Applied', ja: '適用完了', zh: '已应用' },
  '한계 효율이 가장 높은 채널로 예산이 이동합니다': {
    en: 'Budget moves to the channel with the highest marginal efficiency',
    ja: '限界効率が最も高いチャネルへ予算が移動します',
    zh: '预算流向边际效率最高的渠道',
  },
  '만원': { en: 'K KRW', ja: '万ウォン', zh: '万韩元' },
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

/* ───────────────── 1. 통합 대시보드 ───────────────── */
const CHANNELS = [
  { id: 'meta', name: '메타', mark: 'M', color: '#0866ff', spend: 480, rev: 1560, clicks: 12400, conv: 386, roas: 3.25 },
  { id: 'google', name: '구글', mark: 'G', color: '#ea4335', spend: 620, rev: 1810, clicks: 15800, conv: 441, roas: 2.92 },
  { id: 'naver', name: '네이버', mark: 'N', color: '#03c75a', spend: 350, rev: 1290, clicks: 9100, conv: 318, roas: 3.69 },
]
const DAYS = 14

/* 14일 x 3채널 매출 — 결정적 값이라 정적 export 에서도 동일하게 렌더된다 */
const DAILY: number[][] = Array.from({ length: DAYS }, (_, d) =>
  CHANNELS.map((_c, ci) => 18 + Math.abs(Math.sin((d + ci * 2.3) / 2.1)) * 22 + d * 0.9),
)
const DAILY_MAX = Math.max(...DAILY.map((segs) => segs.reduce((a, b) => a + b, 0)))

function UnifiedDashboard({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setTick((v) => (v + 1) % 60), 1400)
    return () => clearInterval(id)
  }, [inView])

  // 결정적 실시간 변동 — 채널마다 다른 위상의 사인파
  const live = CHANNELS.map((c, i) => {
    const w = Math.sin((tick + i * 3) / 3.4)
    return {
      ...c,
      spendNow: Math.round(c.spend * (1 + w * 0.03)),
      revNow: Math.round(c.rev * (1 + w * 0.05)),
      roasNow: Math.round(c.roas * (1 + w * 0.04) * 100) / 100,
      clicksNow: Math.round(c.clicks * (1 + w * 0.04)),
    }
  })
  const totalSpend = live.reduce((a, c) => a + c.spendNow, 0)
  const totalRev = live.reduce((a, c) => a + c.revNow, 0)
  const blended = Math.round((totalRev / totalSpend) * 100) / 100

  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[340px] w-[820px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1f` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('통합 대시보드')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('세 채널을 한 화면에서 동시에 지켜봅니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('메타·구글·네이버 성과가 실시간으로 갱신됩니다. 채널별 리포트를 짜 맞추는 동안 놓치던 타이밍을 되찾으세요.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            {/* 헤더 */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Activity size={12} /> {t('통합 대시보드')}
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping-ring absolute inset-0 rounded-full bg-emerald-400" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {t('실시간')}
              </span>
            </div>

            {/* 채널 카드 */}
            <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
              {live.map((c) => (
                <div key={c.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-lg text-[13px] font-black text-white"
                      style={{ background: c.color, boxShadow: `0 8px 20px -10px ${c.color}` }}
                    >
                      {c.mark}
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--text)]">{t(c.name)}</span>
                    <span className="ml-auto text-right">
                      <span className="block text-[9.5px] text-[var(--text-dim)]">ROAS</span>
                      <span className="block text-[15px] font-extrabold tabular-nums" style={{ color: c.color }}>
                        {c.roasNow.toFixed(2)}x
                      </span>
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      [Wallet, t('광고비'), `${c.spendNow.toLocaleString('ko-KR')}${t('만원')}`],
                      [TrendingUp, t('매출'), `${c.revNow.toLocaleString('ko-KR')}${t('만원')}`],
                      [MousePointerClick, t('클릭'), c.clicksNow.toLocaleString('ko-KR')],
                      [Target, t('전환'), c.conv.toLocaleString('ko-KR')],
                    ].map(([Icon, label, v], i) => {
                      const I = Icon as typeof Wallet
                      return (
                        <div key={i} className="rounded-xl bg-white/[0.03] px-2.5 py-2">
                          <span className="flex items-center gap-1 text-[9.5px] text-[var(--text-dim)]">
                            <I size={10} /> {label as string}
                          </span>
                          <span className="mt-0.5 block truncate text-[12.5px] font-bold tabular-nums text-[var(--text)]">{v as string}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 14일 스택 바 차트 */}
            <div className="border-t border-white/[0.07] px-4 pb-5 pt-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-soft)]">
                  <BarChart3 size={12} style={{ color: feature.accent }} /> {t('최근 14일 채널별 매출')}
                </span>
                <span className="flex flex-wrap items-center gap-2.5">
                  {CHANNELS.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
                      <span className="h-2 w-2 rounded-sm" style={{ background: c.color }} />
                      {t(c.name)}
                    </span>
                  ))}
                </span>
              </div>

              <div className="flex h-36 items-end gap-1.5">
                {DAILY.map((segs, d) => {
                  const today = d === DAYS - 1
                  return (
                    <div key={d} className="flex h-full flex-1 flex-col justify-end gap-[2px]">
                      {segs.map((h, ci) => (
                        <span
                          key={ci}
                          className="w-full rounded-[3px]"
                          style={{
                            // 하루 매출 합계를 최대 매출일 기준으로 환산 → 날짜별 높이가 실제로 달라진다
                            height: inView ? `${(h / DAILY_MAX) * 88}%` : '0%',
                            background: CHANNELS[ci].color,
                            opacity: today ? 1 : 0.62,
                            transition: `height 900ms cubic-bezier(0.16,1,0.3,1) ${d * 45}ms, opacity 400ms ease`,
                            boxShadow: today ? `0 0 14px -4px ${CHANNELS[ci].color}` : undefined,
                          }}
                        />
                      ))}
                      <span className={cn('mt-1 text-center text-[8.5px] tabular-nums', today ? 'font-bold text-[var(--text-soft)]' : 'text-[var(--text-dim)]')}>
                        {today ? t('오늘') : d + 1}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 합계 */}
            <div className="grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07]">
              {[
                [t('총 광고비'), `${totalSpend.toLocaleString('ko-KR')}${t('만원')}`, 'var(--text)'],
                [t('총 매출'), `${totalRev.toLocaleString('ko-KR')}${t('만원')}`, '#34d399'],
                [t('통합 ROAS'), `${blended.toFixed(2)}x`, feature.accent],
              ].map(([k, v, color]) => (
                <div key={k as string} className="px-4 py-3.5">
                  <span className="block text-[10px] text-[var(--text-dim)]">{k as string}</span>
                  <span className="mt-0.5 block text-[17px] font-bold tabular-nums" style={{ color: color as string }}>
                    {v as string}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. 소재 A/B 대결 ───────────────── */
type Creative = { label: string; img: string; ctr: number; cvr: number; roas: number }
const MATCHES: [Creative, Creative][] = [
  [
    { label: '인물 클로즈업 · 후기형', img: '/images/showcase/hero/2.webp', ctr: 3.8, cvr: 4.6, roas: 3.9 },
    { label: '제품 단독 · 혜택 강조', img: '/images/showcase/hero/4.webp', ctr: 2.1, cvr: 3.2, roas: 2.4 },
  ],
  [
    { label: '실사용 장면 · 비교형', img: '/images/showcase/hero/11.webp', ctr: 2.6, cvr: 3.1, roas: 2.7 },
    { label: '도시 야경 · 브랜딩', img: '/images/showcase/16.webp', ctr: 3.2, cvr: 4.1, roas: 3.4 },
  ],
]

function CreativeDuel({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<'run' | 'result'>('run')

  useEffect(() => {
    if (!inView) return
    let id: ReturnType<typeof setTimeout>
    if (phase === 'run') id = setTimeout(() => setPhase('result'), 2600)
    else
      id = setTimeout(() => {
        setRound((v) => (v + 1) % MATCHES.length)
        setPhase('run')
      }, 3400)
    return () => clearTimeout(id)
  }, [phase, inView])

  const pair = MATCHES[round]
  const winner = pair[0].roas >= pair[1].roas ? 0 : 1

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-24">
      <div
        className="animate-drift-slow pointer-events-none absolute right-0 top-8 h-[340px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${feature.accent}22` }}
      />
      <div ref={ref} className="relative mx-auto max-w-5xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('소재 A/B 대결')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('되는 소재에 예산을 몰아줍니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('같은 예산으로 두 소재를 돌려 CTR·전환율·ROAS를 나란히 비교합니다. 승자가 가려지면 예산이 자동으로 옮겨갑니다.')}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {pair.map((c, i) => {
            const won = phase === 'result' && i === winner
            const lost = phase === 'result' && i !== winner
            return (
              <Reveal key={`${round}-${i}`} variant={i === 0 ? 'left' : 'right'}>
                <div
                  className={cn(
                    'relative overflow-hidden rounded-3xl border transition-all duration-700',
                    won ? 'border-white/25' : 'border-white/[0.09]',
                  )}
                  style={{
                    background: '#0b0d16',
                    opacity: lost ? 0.62 : 1,
                    transform: won ? 'translateY(-6px)' : 'none',
                    boxShadow: won ? `0 30px 70px -34px ${feature.accent}` : undefined,
                  }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.img}
                      alt={t(c.label)}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-all duration-700"
                      style={{ filter: lost ? 'grayscale(0.6) brightness(0.8)' : 'none', transform: won ? 'scale(1.04)' : 'none' }}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <span
                      className="absolute left-3 top-3 rounded-md px-2 py-1 text-[10.5px] font-black text-white"
                      style={{ background: i === 0 ? feature.accent : '#22d3ee' }}
                    >
                      {i === 0 ? t('소재 A') : t('소재 B')}
                    </span>
                    {won && (
                      <span className="animate-fade-up absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10.5px] font-black text-[#251a02]">
                        <Trophy size={11} /> {t('승')}
                      </span>
                    )}
                    <span className="absolute bottom-2.5 left-3 right-3 truncate text-[12.5px] font-semibold text-white">{t(c.label)}</span>
                  </div>

                  <div className="space-y-3 p-4">
                    {([
                      [Eye, 'CTR', c.ctr, 5],
                      [Target, t('전환율'), c.cvr, 6],
                      [TrendingUp, 'ROAS', c.roas, 5],
                    ] as const).map(([Icon, label, v, max], n) => (
                      <div key={label}>
                        <div className="flex items-center justify-between text-[11.5px]">
                          <span className="inline-flex items-center gap-1.5 text-[var(--text-dim)]">
                            <Icon size={11} /> {label}
                          </span>
                          <span className="font-bold tabular-nums text-[var(--text)]">
                            {v.toFixed(1)}
                            {label === 'ROAS' ? 'x' : '%'}
                          </span>
                        </div>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: inView ? `${(v / max) * 100}%` : '0%',
                              background: i === 0 ? `linear-gradient(90deg, ${feature.accent}, #f472b6)` : 'linear-gradient(90deg, #22d3ee, #38bdf8)',
                              transition: `width 1400ms cubic-bezier(0.16,1,0.3,1) ${n * 140}ms`,
                            }}
                          />
                        </span>
                      </div>
                    ))}

                    <div className="pt-1">
                      {won ? (
                        <span className="animate-fade-up flex items-center justify-center gap-1.5 rounded-xl bg-amber-400/15 py-2 text-[11.5px] font-bold text-amber-300">
                          <ArrowRight size={12} /> {t('예산 80% 이동')}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] py-2 text-[11.5px] font-semibold text-[var(--text-dim)]">
                          {phase === 'run' ? (
                            <>
                              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
                              {t('테스트 중')}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────── 3. AI 예산 최적화 ───────────────── */
const BUDGET = [
  { id: 'meta', name: '메타', color: '#0866ff', before: 34, after: 41 },
  { id: 'google', name: '구글', color: '#ea4335', before: 44, after: 24 },
  { id: 'naver', name: '네이버', color: '#03c75a', before: 22, after: 35 },
]

function BudgetOptimizer({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setApplied((v) => !v), 3200)
    return () => clearInterval(id)
  }, [inView])

  const roas = applied ? 3.42 : 2.14

  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1a` }}
      />
      <div ref={ref} className="relative mx-auto max-w-5xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('AI 예산 최적화')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('감으로 나누던 예산을 숫자로 다시 나눕니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('채널별 한계 효율을 계산해 예산을 재배분합니다. 같은 돈으로 얼마나 더 벌 수 있는지 적용 전후로 비교해 보세요.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Zap size={12} style={{ color: feature.accent }} /> {applied ? t('AI 제안 배분') : t('현재 배분')}
              </span>
              <span
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors duration-500"
                style={{
                  background: applied ? '#10b98118' : `${feature.accent}1f`,
                  color: applied ? '#34d399' : feature.accent,
                }}
              >
                {applied ? <Sparkles size={11} /> : <Zap size={11} />}
                {applied ? t('적용 완료') : t('AI 최적화 적용')}
              </span>
            </div>

            {/* 채널별 예산 슬라이더 */}
            <div className="space-y-5 p-5 sm:p-6">
              {BUDGET.map((b) => {
                const v = applied ? b.after : b.before
                const up = b.after > b.before
                return (
                  <div key={b.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.color }} />
                      <span className="text-[12.5px] font-semibold text-[var(--text-soft)]">{t(b.name)}</span>
                      <span className="ml-auto flex items-center gap-2">
                        {applied && (
                          <span
                            className="animate-fade-in inline-flex items-center gap-0.5 text-[10.5px] font-bold"
                            style={{ color: up ? '#34d399' : '#f87171' }}
                          >
                            <ArrowUp size={10} style={{ transform: up ? 'none' : 'rotate(180deg)' }} />
                            {Math.abs(b.after - b.before)}%p
                          </span>
                        )}
                        <span className="text-[13px] font-extrabold tabular-nums" style={{ color: b.color }}>
                          {v}%
                        </span>
                      </span>
                    </div>

                    {/* 슬라이더 트랙 */}
                    <span className="relative block h-2.5 rounded-full bg-white/[0.07]">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${v}%`,
                          background: `linear-gradient(90deg, ${b.color}bb, ${b.color})`,
                          transition: 'width 1100ms cubic-bezier(0.16,1,0.3,1)',
                          boxShadow: `0 0 16px -4px ${b.color}`,
                        }}
                      />
                      {/* 노브 */}
                      <span
                        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[#0b0d16]"
                        style={{
                          left: `${v}%`,
                          borderColor: b.color,
                          transition: 'left 1100ms cubic-bezier(0.16,1,0.3,1)',
                          boxShadow: `0 6px 16px -6px ${b.color}`,
                        }}
                      />
                    </span>
                  </div>
                )
              })}
            </div>

            {/* 전후 비교 */}
            <div className="grid grid-cols-1 divide-y divide-white/[0.07] border-t border-white/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-4">
                <span className="block text-[10px] text-[var(--text-dim)]">{applied ? t('적용 후') : t('적용 전')} ROAS</span>
                <span
                  className="mt-0.5 block text-2xl font-extrabold tabular-nums transition-colors duration-500"
                  style={{ color: applied ? '#34d399' : 'var(--text-soft)' }}
                >
                  <Counter to={roas} decimals={2} duration={900} suffix="x" />
                </span>
              </div>
              <div className="px-5 py-4">
                <span className="block text-[10px] text-[var(--text-dim)]">{t('총 광고비')}</span>
                <span className="mt-0.5 block text-2xl font-extrabold tabular-nums text-[var(--text)]">
                  1,450
                  <span className="ml-0.5 text-[12px] font-bold">{t('만원')}</span>
                </span>
              </div>
              <div className="px-5 py-4">
                <span className="block text-[10px] text-[var(--text-dim)]">{t('예상 추가 매출')}</span>
                <span className="mt-0.5 block text-2xl font-extrabold tabular-nums" style={{ color: feature.accent }}>
                  +<Counter to={applied ? 1856 : 0} duration={900} />
                  <span className="ml-0.5 text-[12px] font-bold">{t('만원')}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[11.5px] text-[var(--text-dim)]">
              <Sparkles size={12} style={{ color: feature.accent }} />
              {t('한계 효율이 가장 높은 채널로 예산이 이동합니다')}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function AdsPerformanceShowcase({ feature }: { feature: Feature }) {
  return (
    <>
      <UnifiedDashboard feature={feature} />
      <CreativeDuel feature={feature} />
      <BudgetOptimizer feature={feature} />
    </>
  )
}
