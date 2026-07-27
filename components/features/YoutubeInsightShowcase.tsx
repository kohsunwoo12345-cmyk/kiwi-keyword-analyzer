'use client'

import { useEffect, useRef, useState } from 'react'
import {
  TrendingUp,
  Users,
  Eye,
  Clock,
  Flame,
  Trophy,
  Play,
  Target,
  Image as ImageIcon,
  Type,
  CalendarClock,
  Search,
  ArrowUp,
  Sparkles,
} from 'lucide-react'
import { Reveal, Counter, Marquee } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Feature } from '@/lib/features'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* growth */
  '채널 성장 리포트': { en: 'Channel growth report', ja: 'チャンネル成長レポート', zh: '频道成长报告' },
  '성장 변곡점은 그래프에 먼저 나타납니다': { en: 'The growth inflection shows up on the chart first', ja: '成長の変曲点はグラフに先に現れます', zh: '增长拐点最先出现在图表上' },
  '구독자·조회수·시청시간을 한 화면에 겹쳐 보면, 어떤 영상이 채널을 밀어 올렸는지가 눈에 보입니다.': {
    en: 'Overlay subscribers, views, and watch time on one screen and you can literally see which video pushed the channel up.',
    ja: '登録者・再生数・視聴時間を一画面に重ねると、どの動画がチャンネルを押し上げたのかが目に見えます。',
    zh: '把订阅、播放和观看时长叠在同一屏上，就能看出是哪支视频把频道推了上去。',
  },
  '구독자': { en: 'Subscribers', ja: '登録者', zh: '订阅数' },
  '조회수': { en: 'Views', ja: '再生数', zh: '播放量' },
  '시청시간': { en: 'Watch time', ja: '視聴時間', zh: '观看时长' },
  '최근 24주': { en: 'Last 24 weeks', ja: '直近24週', zh: '最近 24 周' },
  '성장 변곡점': { en: 'Growth inflection', ja: '成長の変曲点', zh: '增长拐点' },
  '숏폼 전환 이후 상승 시작': { en: 'Lift began after switching to short-form', ja: 'ショート転換以降に上昇開始', zh: '转做短视频后开始拉升' },
  '주차': { en: 'wk', ja: '週', zh: '周' },
  '전주 대비': { en: 'vs. last week', ja: '前週比', zh: '较上周' },
  '평균 시청 지속률': { en: 'Avg. retention', ja: '平均視聴維持率', zh: '平均观看留存' },
  '총 시청시간': { en: 'Total watch time', ja: '総視聴時間', zh: '总观看时长' },
  '시간': { en: 'hrs', ja: '時間', zh: '小时' },
  '명': { en: '', ja: '人', zh: '人' },
  '회': { en: '', ja: '回', zh: '次' },

  /* viral score */
  '떡상 예측': { en: 'Viral prediction', ja: 'バズ予測', zh: '爆款预测' },
  '올리기 전에 터질지 먼저 계산합니다': { en: 'We calculate whether it will blow up before you post', ja: '投稿する前に伸びるかどうかを先に計算します', zh: '发布之前，先算出它会不会爆' },
  '썸네일·제목·업로드 시간·키워드 경쟁도를 뜯어 떡상 확률을 점수로 냅니다. 낮게 나오면 무엇을 고칠지도 함께 알려줍니다.': {
    en: 'We break down thumbnail, title, upload timing, and keyword competition into a viral score — and when it comes out low, we tell you what to fix.',
    ja: 'サムネイル・タイトル・投稿時間・キーワード競合度を分解してバズ確率をスコア化します。低ければ何を直すべきかも示します。',
    zh: '拆解封面、标题、发布时间与关键词竞争度，算出爆款分数；分数偏低时还会告诉你该改什么。',
  },
  '떡상 확률': { en: 'Viral odds', ja: 'バズる確率', zh: '爆款概率' },
  '썸네일 후킹력': { en: 'Thumbnail hook', ja: 'サムネの引き', zh: '封面吸引力' },
  '제목 검색 매칭': { en: 'Title–search match', ja: 'タイトルと検索の一致', zh: '标题搜索匹配' },
  '업로드 타이밍': { en: 'Upload timing', ja: '投稿タイミング', zh: '发布时机' },
  '키워드 경쟁도': { en: 'Keyword competition', ja: 'キーワード競合度', zh: '关键词竞争' },
  '지금 올리세요 — 터질 확률이 높습니다': { en: 'Post it now — high odds it takes off', ja: '今投稿を — 伸びる確率が高いです', zh: '现在就发 — 起量概率很高' },
  '썸네일만 바꿔도 점수가 올라갑니다': { en: 'Just changing the thumbnail lifts the score', ja: 'サムネを変えるだけでスコアが上がります', zh: '仅换封面就能提升分数' },
  '경쟁이 셉니다 — 키워드를 좁히세요': { en: 'Competition is heavy — narrow the keyword', ja: '競合が強い — キーワードを絞りましょう', zh: '竞争激烈 — 收窄关键词' },
  '분석 중인 영상': { en: 'Video being analyzed', ja: '分析中の動画', zh: '正在分析的视频' },
  '혼자 떠난 3박 4일 캠핑 브이로그': { en: 'A solo 4-day camping vlog', ja: '一人で行く3泊4日キャンプVlog', zh: '独自出发的四天三夜露营 Vlog' },
  '가을 데일리룩 5가지 코디 추천': { en: '5 daily fall outfit ideas', ja: '秋のデイリールック5コーデ', zh: '秋季日常穿搭 5 套推荐' },
  '신제품 앰플 3주 사용 후기': { en: '3 weeks with the new ampoule — honest review', ja: '新作アンプル3週間使用レビュー', zh: '新品安瓶三周使用测评' },

  /* race */
  '경쟁 채널 벤치마킹': { en: 'Competitor benchmarking', ja: '競合チャンネルのベンチマーク', zh: '竞品频道对标' },
  '경쟁 채널이 지금 어디까지 왔는지': { en: 'See exactly how far competitors have come', ja: '競合チャンネルが今どこまで来たか', zh: '看清竞品频道现在跑到哪了' },
  '같은 주제를 다루는 채널들의 구독자 추이를 나란히 세워 추적합니다. 누가 치고 올라오는지 순위가 실시간으로 바뀝니다.': {
    en: 'Track subscriber trends of channels covering the same topic side by side. The ranking shifts in real time as someone surges.',
    ja: '同じテーマを扱うチャンネルの登録者推移を並べて追跡します。誰が伸びているか、順位がリアルタイムで入れ替わります。',
    zh: '并排追踪同题材频道的订阅走势。谁在猛冲，排名实时变化。',
  },
  '내 채널': { en: 'My channel', ja: '自分のチャンネル', zh: '我的频道' },
  '데일리 하루': { en: 'Daily Haru', ja: 'デイリーハル', zh: 'Daily Haru' },
  '브이로그 정석': { en: 'Vlog Basics', ja: 'Vlogの定石', zh: 'Vlog 教科书' },
  '여행노트 소소': { en: 'Soso Travel Notes', ja: '旅ノートそそ', zh: '旅行笔记 Soso' },
  '캠핑생활': { en: 'Camping Life', ja: 'キャンプ生活', zh: '露营生活' },
  '주간 성장률': { en: 'Weekly growth', ja: '週間成長率', zh: '周增长率' },
  '만': { en: '0k', ja: '万', zh: '万' },
  '떡상 키워드': { en: 'Trending keywords', ja: 'バズキーワード', zh: '爆款关键词' },
  '지금 검색량이 튀고 있는 키워드': { en: 'Keywords spiking in search right now', ja: '今検索量が跳ねているキーワード', zh: '此刻搜索量正在飙升的关键词' },
}

/* ───────────────── 채널 성장 데이터 ───────────────── */
type SeriesKey = 'subs' | 'views' | 'watch'
const SERIES: { key: SeriesKey; label: string; icon: typeof Users; color: string; unit: string; total: number; decimals?: number; delta: number }[] = [
  { key: 'subs', label: '구독자', icon: Users, color: '#ef4444', unit: '명', total: 124000, delta: 18.4 },
  { key: 'views', label: '조회수', icon: Eye, color: '#f97316', unit: '회', total: 3820000, delta: 42.1 },
  { key: 'watch', label: '시청시간', icon: Clock, color: '#f43f5e', unit: '시간', total: 96400, delta: 27.6 },
]

/* 24주 — 14주차(숏폼 전환) 이후 기울기가 꺾여 올라간다 */
const DATA: Record<SeriesKey, number[]> = {
  subs: [12, 13, 14, 14, 16, 17, 18, 20, 21, 23, 24, 26, 28, 31, 38, 46, 55, 63, 74, 84, 95, 104, 114, 124],
  views: [8, 9, 11, 10, 13, 14, 16, 15, 19, 22, 21, 26, 29, 34, 48, 63, 79, 92, 112, 138, 176, 231, 305, 382],
  watch: [10, 11, 12, 12, 14, 15, 15, 17, 18, 20, 21, 23, 25, 28, 34, 41, 48, 54, 62, 70, 78, 85, 91, 96],
}
const INFLECTION = 14

/* 부드러운 곡선 패스 (Catmull-Rom → 베지어) */
function smoothPath(values: number[], w: number, h: number, pad = 6) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - pad - ((v - min) / span) * (h - pad * 2),
  ])
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return { d, pts }
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

/* ───────────────── 1. 성장 곡선 ───────────────── */
function GrowthChart({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [tab, setTab] = useState<SeriesKey>('subs')
  const [auto, setAuto] = useState(true)
  const [drawn, setDrawn] = useState(false)
  const s = SERIES.find((x) => x.key === tab)!
  const W = 640
  const H = 230
  const { d, pts } = smoothPath(DATA[tab], W, H)
  const area = `${d} L ${W} ${H} L 0 ${H} Z`
  const inflect = pts[INFLECTION]
  const last = pts[pts.length - 1]

  // 진입 시 · 탭 변경 시 선을 다시 그린다
  useEffect(() => {
    if (!inView) return
    setDrawn(false)
    const id = setTimeout(() => setDrawn(true), 60)
    return () => clearTimeout(id)
  }, [inView, tab])

  useEffect(() => {
    if (!auto || !inView) return
    const id = setInterval(() => {
      setTab((k) => SERIES[(SERIES.findIndex((x) => x.key === k) + 1) % SERIES.length].key)
    }, 5200)
    return () => clearInterval(id)
  }, [auto, inView])

  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[360px] w-[820px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${s.color}1f` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('채널 성장 리포트')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t('성장 변곡점은 그래프에 먼저 나타납니다')}
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('구독자·조회수·시청시간을 한 화면에 겹쳐 보면, 어떤 영상이 채널을 밀어 올렸는지가 눈에 보입니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            {/* 탭 */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              {SERIES.map((x) => {
                const Icon = x.icon
                const on = x.key === tab
                return (
                  <button
                    key={x.key}
                    onClick={() => {
                      setTab(x.key)
                      setAuto(false)
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300',
                      on ? 'text-white' : 'text-[var(--text-dim)] hover:bg-white/[0.05] hover:text-white',
                    )}
                    style={on ? { background: `${x.color}26`, boxShadow: `inset 0 0 0 1px ${x.color}66` } : undefined}
                  >
                    <Icon size={13} style={{ color: on ? x.color : undefined }} />
                    {t(x.label)}
                  </button>
                )
              })}
              <span className="ml-auto text-[11px] text-[var(--text-dim)]">{t('최근 24주')}</span>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_240px]">
              {/* 차트 */}
              <div className="relative px-3 pb-3 pt-6 sm:px-5">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id={`yt-fill-${tab}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity="0.45" />
                      <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* 가로 그리드 */}
                  {[0, 1, 2, 3].map((i) => (
                    <line key={i} x1="0" y1={(H / 3) * i} x2={W} y2={(H / 3) * i} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                  ))}

                  {/* 변곡점 이후 구간 강조 */}
                  <rect
                    x={inflect[0]}
                    y={0}
                    width={W - inflect[0]}
                    height={H}
                    fill={s.color}
                    opacity={drawn ? 0.06 : 0}
                    style={{ transition: 'opacity 900ms ease 700ms' }}
                  />

                  {/* 면적 */}
                  <path d={area} fill={`url(#yt-fill-${tab})`} opacity={drawn ? 1 : 0} style={{ transition: 'opacity 900ms ease 350ms' }} />

                  {/* 선 — 진입 시 왼쪽부터 그려진다 */}
                  <path
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    pathLength={1}
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: drawn ? 0 : 1,
                      transition: 'stroke-dashoffset 1500ms cubic-bezier(0.16, 1, 0.3, 1)',
                      filter: `drop-shadow(0 0 10px ${s.color}88)`,
                    }}
                  />

                  {/* 변곡점 마커 */}
                  <g opacity={drawn ? 1 : 0} style={{ transition: 'opacity 500ms ease 1200ms' }}>
                    <line x1={inflect[0]} y1={0} x2={inflect[0]} y2={H} stroke={s.color} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                    <circle cx={inflect[0]} cy={inflect[1]} r="5" fill="#0b0d16" stroke={s.color} strokeWidth="2.5" />
                  </g>

                  {/* 최신 지점 */}
                  <g opacity={drawn ? 1 : 0} style={{ transition: 'opacity 500ms ease 1400ms' }}>
                    <circle cx={last[0]} cy={last[1]} r="10" fill={s.color} opacity="0.18" style={{ animation: 'pulse 2.2s ease-in-out infinite' }} />
                    <circle cx={last[0]} cy={last[1]} r="4.5" fill={s.color} />
                  </g>
                </svg>

                {/* 변곡점 말풍선 */}
                <div
                  className="pointer-events-none absolute top-1 hidden -translate-x-1/2 sm:block"
                  style={{
                    left: `calc(${(INFLECTION / 23) * 100}% )`,
                    opacity: drawn ? 1 : 0,
                    transition: 'opacity 600ms ease 1300ms',
                  }}
                >
                  <span
                    className="whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur"
                    style={{ borderColor: `${s.color}55`, background: `${s.color}1a`, color: '#fff' }}
                  >
                    <span className="mr-1" style={{ color: s.color }}>
                      ▲ {t('성장 변곡점')}
                    </span>
                    {t('숏폼 전환 이후 상승 시작')}
                  </span>
                </div>

                {/* x축 */}
                <div className="mt-1 flex justify-between px-1 text-[9px] tabular-nums text-[var(--text-dim)]">
                  {[1, 5, 9, 13, 17, 21, 24].map((n) => (
                    <span key={n}>
                      {n}
                      {t('주차')}
                    </span>
                  ))}
                </div>
              </div>

              {/* 요약 지표 */}
              <div className="grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07] lg:grid-cols-1 lg:divide-x-0 lg:divide-y lg:border-l lg:border-t-0">
                {SERIES.map((x) => {
                  const Icon = x.icon
                  const on = x.key === tab
                  return (
                    <button
                      key={x.key}
                      onClick={() => {
                        setTab(x.key)
                        setAuto(false)
                      }}
                      className={cn('px-4 py-4 text-left transition-colors duration-300', on ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]')}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                        <Icon size={12} style={{ color: x.color }} /> {t(x.label)}
                      </span>
                      <span className="mt-1.5 block text-xl font-bold tracking-tight sm:text-2xl" style={{ color: on ? x.color : 'var(--text)' }}>
                        <Counter to={x.total} />
                      </span>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-400">
                        <ArrowUp size={11} /> {x.delta}%
                        <span className="ml-1 font-normal text-[var(--text-dim)]">{t('전주 대비')}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. 떡상 예측 게이지 ───────────────── */
type Candidate = {
  title: string
  img: string
  score: number
  verdict: string
  factors: { key: string; icon: typeof ImageIcon; v: number }[]
}
const CANDIDATES: Candidate[] = [
  {
    title: '혼자 떠난 3박 4일 캠핑 브이로그',
    img: '/images/showcase/hero/8.webp',
    score: 87,
    verdict: '지금 올리세요 — 터질 확률이 높습니다',
    factors: [
      { key: '썸네일 후킹력', icon: ImageIcon, v: 92 },
      { key: '제목 검색 매칭', icon: Type, v: 88 },
      { key: '업로드 타이밍', icon: CalendarClock, v: 84 },
      { key: '키워드 경쟁도', icon: Search, v: 78 },
    ],
  },
  {
    title: '가을 데일리룩 5가지 코디 추천',
    img: '/images/showcase/hero/11.webp',
    score: 64,
    verdict: '썸네일만 바꿔도 점수가 올라갑니다',
    factors: [
      { key: '썸네일 후킹력', icon: ImageIcon, v: 48 },
      { key: '제목 검색 매칭', icon: Type, v: 72 },
      { key: '업로드 타이밍', icon: CalendarClock, v: 69 },
      { key: '키워드 경쟁도', icon: Search, v: 66 },
    ],
  },
  {
    title: '신제품 앰플 3주 사용 후기',
    img: '/images/showcase/hero/4.webp',
    score: 41,
    verdict: '경쟁이 셉니다 — 키워드를 좁히세요',
    factors: [
      { key: '썸네일 후킹력', icon: ImageIcon, v: 58 },
      { key: '제목 검색 매칭', icon: Type, v: 44 },
      { key: '업로드 타이밍', icon: CalendarClock, v: 52 },
      { key: '키워드 경쟁도', icon: Search, v: 21 },
    ],
  },
]

function ViralGauge({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)
  const c = CANDIDATES[i]
  const R = 76
  const C = 2 * Math.PI * R
  const tone = c.score >= 75 ? '#22c55e' : c.score >= 55 ? '#f59e0b' : '#ef4444'

  useEffect(() => {
    if (!auto || !inView) return
    const id = setInterval(() => setI((v) => (v + 1) % CANDIDATES.length), 4600)
    return () => clearInterval(id)
  }, [auto, inView])

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-20">
      <div
        className="animate-drift-slow pointer-events-none absolute right-0 top-10 h-[340px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${tone}1f` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('떡상 예측')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('올리기 전에 터질지 먼저 계산합니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('썸네일·제목·업로드 시간·키워드 경쟁도를 뜯어 떡상 확률을 점수로 냅니다. 낮게 나오면 무엇을 고칠지도 함께 알려줍니다.')}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* 게이지 */}
          <Reveal variant="left">
            <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] px-6 py-10">
              <div
                className="vs-glow pointer-events-none absolute inset-x-10 top-6 h-40 rounded-full blur-[70px]"
                style={{ background: `${tone}44` }}
              />
              <div className="relative">
                <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
                  <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" />
                  <circle
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke={tone}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={inView ? C * (1 - c.score / 100) : C}
                    style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(0.16,1,0.3,1), stroke 600ms ease', filter: `drop-shadow(0 0 12px ${tone}aa)` }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-content-center text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-dim)]">{t('떡상 확률')}</span>
                  <span className="mt-1 block text-5xl font-extrabold tabular-nums tracking-tight" style={{ color: tone }}>
                    <Counter to={c.score} suffix="%" duration={1100} />
                  </span>
                </div>
              </div>

              <p
                className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-center text-[13px] font-semibold"
                style={{ background: `${tone}1a`, color: tone }}
              >
                <Flame size={14} /> {t(c.verdict)}
              </p>

              {/* 후보 인디케이터 */}
              <div className="mt-5 flex gap-1.5">
                {CANDIDATES.map((_, n) => (
                  <button
                    key={n}
                    aria-label={`${n + 1}`}
                    onClick={() => {
                      setI(n)
                      setAuto(false)
                    }}
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: n === i ? 28 : 10, background: n === i ? tone : 'rgba(255,255,255,0.18)' }}
                  />
                ))}
              </div>
            </div>
          </Reveal>

          {/* 분석 대상 + 요인 */}
          <Reveal variant="right">
            <div className="flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-[#0b0d16] p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{t('분석 중인 영상')}</p>

              {/* 썸네일 카드 */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08]">
                <div className="relative aspect-video">
                  {CANDIDATES.map((x, n) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={x.img}
                      src={x.img}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        'absolute inset-0 h-full w-full object-cover transition-all duration-700',
                        n === i ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
                      )}
                    />
                  ))}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur">
                      <Play size={17} className="ml-0.5 text-white" fill="white" />
                    </span>
                  </span>
                  <span className="absolute bottom-2.5 left-3 right-3 truncate text-[13px] font-semibold text-white">{t(c.title)}</span>
                </div>
              </div>

              {/* 요인 바 */}
              <div className="mt-1 space-y-3">
                {c.factors.map((f, n) => {
                  const Icon = f.icon
                  const bad = f.v < 55
                  return (
                    <div key={f.key}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="inline-flex items-center gap-1.5 text-[var(--text-soft)]">
                          <Icon size={12} style={{ color: bad ? '#ef4444' : feature.accent }} /> {t(f.key)}
                        </span>
                        <span className={cn('font-bold tabular-nums', bad ? 'text-rose-400' : 'text-[var(--text)]')}>{f.v}</span>
                      </div>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: inView ? `${f.v}%` : '0%',
                            background: bad ? 'linear-gradient(90deg,#ef4444,#f97316)' : `linear-gradient(90deg,${feature.accent},#f59e0b)`,
                            transition: `width 900ms cubic-bezier(0.16,1,0.3,1) ${n * 90}ms`,
                          }}
                        />
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-auto flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[11.5px] text-[var(--text-soft)]">
                <Target size={13} style={{ color: feature.accent }} />
                {t('썸네일·제목·업로드 시간·키워드 경쟁도를 뜯어 떡상 확률을 점수로 냅니다. 낮게 나오면 무엇을 고칠지도 함께 알려줍니다.')}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────────── 3. 경쟁 채널 레이스 ───────────────── */
const CHANNELS = [
  { id: 'me', name: '내 채널', color: '#ef4444', start: 12.4, rate: 1.35, mine: true },
  { id: 'a', name: '데일리 하루', color: '#f59e0b', start: 21.8, rate: 0.42 },
  { id: 'b', name: '브이로그 정석', color: '#22d3ee', start: 18.6, rate: 0.66 },
  { id: 'c', name: '여행노트 소소', color: '#a855f7', start: 15.2, rate: 0.28 },
  { id: 'd', name: '캠핑생활', color: '#34d399', start: 9.7, rate: 0.94 },
]
const ROW_H = 56

function ChannelRace({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setStep((v) => (v >= 26 ? 0 : v + 1)), 700)
    return () => clearInterval(id)
  }, [inView])

  // 결정적(deterministic) 성장 — 매 스텝 살짝 출렁이며 오른다
  const rows = CHANNELS.map((c, n) => {
    const wobble = Math.sin((step + n * 2) / 2.4) * 0.18
    const value = c.start + c.rate * step + wobble
    return { ...c, value }
  })
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  const max = sorted[0].value

  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1f` }}
      />
      <div ref={ref} className="relative mx-auto max-w-5xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('경쟁 채널 벤치마킹')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('경쟁 채널이 지금 어디까지 왔는지')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('같은 주제를 다루는 채널들의 구독자 추이를 나란히 세워 추적합니다. 누가 치고 올라오는지 순위가 실시간으로 바뀝니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] p-5 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Trophy size={12} /> {t('구독자')}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--text-dim)]">
                {String(step + 1).padStart(2, '0')} / 27 {t('주차')}
              </span>
            </div>

            <div className="relative" style={{ height: ROW_H * CHANNELS.length }}>
              {rows.map((c) => {
                const rank = sorted.findIndex((x) => x.id === c.id)
                const pct = (c.value / max) * 100
                return (
                  <div
                    key={c.id}
                    className="absolute inset-x-0 flex items-center gap-3"
                    style={{
                      height: ROW_H,
                      transform: `translateY(${rank * ROW_H}px)`,
                      transition: 'transform 650ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <span
                      className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg text-[11px] font-bold tabular-nums"
                      style={{ background: rank === 0 ? `${c.color}2e` : 'rgba(255,255,255,0.05)', color: rank === 0 ? c.color : 'var(--text-dim)' }}
                    >
                      {rank + 1}
                    </span>
                    <span
                      className={cn(
                        'w-24 flex-shrink-0 truncate text-[12.5px] font-semibold sm:w-32',
                        c.mine ? 'text-[var(--text)]' : 'text-[var(--text-soft)]',
                      )}
                    >
                      {t(c.name)}
                      {c.mine && (
                        <span className="ml-1.5 rounded px-1 py-0.5 text-[9px] font-bold" style={{ background: `${c.color}26`, color: c.color }}>
                          ME
                        </span>
                      )}
                    </span>
                    <span className="relative h-7 flex-1 overflow-hidden rounded-lg bg-white/[0.04]">
                      <span
                        className="block h-full rounded-lg"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${c.color}cc, ${c.color})`,
                          boxShadow: `0 0 18px -4px ${c.color}`,
                          transition: 'width 650ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </span>
                    <span className="w-16 flex-shrink-0 text-right text-[12.5px] font-bold tabular-nums" style={{ color: c.color }}>
                      {c.value.toFixed(1)}
                      {t('만')}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-4">
              {[
                [Users, t('내 채널'), `${rows[0].value.toFixed(1)}${t('만')}`],
                [TrendingUp, t('주간 성장률'), '+13.5%'],
                [Eye, t('평균 시청 지속률'), '61.2%'],
                [Clock, t('총 시청시간'), `9.6만${t('시간')}`],
              ].map(([Icon, k, v], n) => {
                const I = Icon as typeof Users
                return (
                  <div key={n} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                    <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)]">
                      <I size={11} style={{ color: feature.accent }} /> {k as string}
                    </span>
                    <span className="mt-1 block text-[15px] font-bold tabular-nums text-[var(--text)]">{v as string}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>

        {/* 떡상 키워드 티커 */}
        <Reveal className="mt-8">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-dim)]">
            <Sparkles size={12} style={{ color: feature.accent }} /> {t('지금 검색량이 튀고 있는 키워드')}
          </p>
          <Marquee
            items={[
              ['혼캠 브이로그', 312],
              ['가을 데일리룩', 268],
              ['차박 캠핑 준비물', 214],
              ['국내 여행 코스', 196],
              ['미니멀 룸투어', 173],
              ['감성 카페 투어', 158],
              ['앰플 사용 후기', 141],
              ['캠핑 장비 추천', 127],
            ].map(([kw, up]) => (
              <span
                key={kw as string}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold"
                style={{ borderColor: `${feature.accent}3d`, background: `${feature.accent}12`, color: 'var(--text)' }}
              >
                #{kw as string}
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-400">
                  <ArrowUp size={11} />
                  {up as number}%
                </span>
              </span>
            ))}
          />
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function YoutubeInsightShowcase({ feature }: { feature: Feature }) {
  return (
    <>
      <GrowthChart feature={feature} />
      <ViralGauge feature={feature} />
      <ChannelRace feature={feature} />
    </>
  )
}
