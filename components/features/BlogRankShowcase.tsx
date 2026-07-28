'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Gauge,
  Search,
  TrendingUp,
  Trophy,
  Check,
  Layers,
  FileText,
  Clock,
  Repeat,
  Sparkles,
  ArrowUp,
  Grid3x3,
  Target,
} from 'lucide-react'
import { Reveal, Counter } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Feature } from '@/lib/features'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* grade */
  '블로그 지수 진단': { en: 'Blog index diagnosis', ja: 'ブログ指数の診断', zh: '博客指数诊断' },
  '내 블로그가 지금 몇 등급인지부터': { en: 'Start with the grade your blog is at right now', ja: 'まずは自分のブログが今何等級かから', zh: '先看清你的博客现在是几级' },
  'C-Rank와 D.I.A 기준으로 블로그 체력을 등급으로 환산합니다. 어느 항목이 발목을 잡는지까지 한 화면에서 보입니다.': {
    en: 'We convert your blog’s strength into a grade based on C-Rank and D.I.A criteria — and show which item is holding you back, all on one screen.',
    ja: 'C-RankとD.I.Aの基準でブログ体力を等級に換算します。どの項目が足を引っ張っているかまで一画面で分かります。',
    zh: '按 C-Rank 与 D.I.A 标准把博客实力换算成等级，连哪一项在拖后腿都在同一屏上看得见。',
  },
  '블로그 지수': { en: 'Blog index', ja: 'ブログ指数', zh: '博客指数' },
  '등급': { en: 'Grade', ja: '等級', zh: '等级' },
  '성장 여력': { en: 'Growth headroom', ja: '成長余力', zh: '成长空间' },
  '맥락·주제 집중도 (C-Rank)': { en: 'Topic focus (C-Rank)', ja: '文脈・テーマ集中度 (C-Rank)', zh: '主题聚焦度 (C-Rank)' },
  '경험·의도 충족 (D.I.A)': { en: 'Experience & intent (D.I.A)', ja: '経験・意図の充足 (D.I.A)', zh: '经验与意图满足 (D.I.A)' },
  '포스팅 주기 일관성': { en: 'Posting consistency', ja: '投稿頻度の一貫性', zh: '发布节奏一致性' },
  '평균 체류시간': { en: 'Avg. time on page', ja: '平均滞在時間', zh: '平均停留时长' },
  '주제를 좁히면 두 등급까지 오릅니다': { en: 'Narrow your topic and you can climb two grades', ja: 'テーマを絞れば2等級まで上がります', zh: '收窄主题，最多能升两级' },
  '상위노출 후보 — 지금 공략하세요': { en: 'Ranking candidate — go after it now', ja: '上位表示候補 — 今攻めましょう', zh: '上首页候选 — 现在就攻' },
  '체류시간부터 손봐야 합니다': { en: 'Fix time on page first', ja: 'まず滞在時間を改善しましょう', zh: '先从停留时长下手' },
  '진단 중인 블로그': { en: 'Blog being diagnosed', ja: '診断中のブログ', zh: '正在诊断的博客' },
  '맛집 기록 블로그': { en: 'Restaurant log blog', ja: 'グルメ記録ブログ', zh: '美食记录博客' },
  '여행 에세이 블로그': { en: 'Travel essay blog', ja: '旅エッセイブログ', zh: '旅行随笔博客' },
  '이제 막 시작한 블로그': { en: 'A brand-new blog', ja: '始めたばかりのブログ', zh: '刚起步的博客' },
  '개 항목 분석': { en: ' items analyzed', ja: '項目を分析', zh: ' 项分析' },

  /* serp */
  '상위노출 시뮬레이터': { en: 'Ranking simulator', ja: '上位表示シミュレーター', zh: '排名模拟器' },
  '고치는 순서대로 순위가 올라갑니다': { en: 'Fix them in order and the rank climbs', ja: '直した順に順位が上がります', zh: '按顺序修改，排名就往上走' },
  '알고리즘이 보는 항목을 하나씩 개선하면 검색결과에서 내 글이 어디까지 올라가는지 미리 시뮬레이션합니다.': {
    en: 'Improve the items the algorithm looks at one by one, and simulate in advance how far your post climbs in the search results.',
    ja: 'アルゴリズムが見る項目を一つずつ改善すると、検索結果で自分の記事がどこまで上がるかを事前にシミュレーションします。',
    zh: '逐项改进算法关注的因素，提前模拟你的文章能在搜索结果里爬到多高。',
  },
  '검색 키워드': { en: 'Search keyword', ja: '検索キーワード', zh: '搜索关键词' },
  '강남 맛집 추천': { en: 'best restaurants in Gangnam', ja: '江南 グルメ おすすめ', zh: '江南美食推荐' },
  '현재 순위': { en: 'Current rank', ja: '現在の順位', zh: '当前排名' },
  '위': { en: '', ja: '位', zh: '名' },
  '내 글': { en: 'My post', ja: '自分の記事', zh: '我的文章' },
  '1페이지 노출 성공': { en: 'Page-one ranking achieved', ja: '1ページ目に表示', zh: '成功进入首页' },
  '적용한 개선 항목': { en: 'Improvements applied', ja: '適用した改善項目', zh: '已应用的改进项' },
  '제목 앞쪽에 핵심 키워드 배치': { en: 'Core keyword placed early in the title', ja: 'タイトル前方にコアキーワード配置', zh: '核心关键词放到标题靠前' },
  '본문 1,500자 이상으로 확장': { en: 'Body expanded past 1,500 characters', ja: '本文を1,500文字以上に拡張', zh: '正文扩充到 1,500 字以上' },
  '직접 찍은 이미지 5장 추가': { en: 'Added 5 original photos', ja: '自分で撮った画像を5枚追加', zh: '新增 5 张自己拍的图' },
  '연관 글 내부 링크 연결': { en: 'Linked related posts internally', ja: '関連記事の内部リンクを設定', zh: '连接相关文章内链' },
  '체류시간 1분 30초 개선': { en: 'Time on page up by 1m 30s', ja: '滞在時間を1分30秒改善', zh: '停留时长提升 1 分 30 秒' },
  'C-Rank 주제 집중도 반영': { en: 'C-Rank topic focus reflected', ja: 'C-Rankのテーマ集中度に反映', zh: '体现 C-Rank 主题聚焦度' },
  '강남 맛집 BEST 10 총정리': { en: 'Gangnam restaurants — the BEST 10 roundup', ja: '江南グルメBEST10まとめ', zh: '江南美食 BEST 10 总整理' },
  '강남역 데이트 코스 맛집': { en: 'Date-course restaurants near Gangnam Station', ja: '江南駅デートコースのグルメ', zh: '江南站约会路线美食' },
  '현지인이 가는 강남 밥집': { en: 'Where locals actually eat in Gangnam', ja: '地元民が行く江南の食堂', zh: '本地人常去的江南饭馆' },
  '강남 회식 장소 추천 모음': { en: 'Gangnam group-dinner spots', ja: '江南の会食スポットまとめ', zh: '江南聚餐地点推荐合集' },
  '강남 혼밥 가능한 식당': { en: 'Solo-dining friendly spots in Gangnam', ja: '江南で一人ご飯できる店', zh: '江南可以一个人吃的餐厅' },
  '강남 브런치 카페 리스트': { en: 'Gangnam brunch cafés', ja: '江南のブランチカフェ一覧', zh: '江南早午餐咖啡店清单' },
  '강남 맛집 — 직접 다녀온 12곳 솔직 후기': { en: 'Gangnam eats — honest reviews of 12 places I visited', ja: '江南グルメ — 実際に行った12軒の正直レビュー', zh: '江南美食 — 亲自去过 12 家的真实测评' },

  /* heatmap */
  '경쟁 강도 분석': { en: 'Competition analysis', ja: '競合強度の分析', zh: '竞争强度分析' },
  '이길 수 있는 키워드부터 고릅니다': { en: 'Pick the keywords you can actually win', ja: '勝てるキーワードから選びます', zh: '先挑你能赢的关键词' },
  '주차별 경쟁 문서 수와 강도를 색으로 펼쳐 봅니다. 진한 칸은 피하고, 옅은 칸을 노리면 됩니다.': {
    en: 'Weekly competing-document counts and intensity, laid out in color. Avoid the dark cells and aim for the light ones.',
    ja: '週ごとの競合文書数と強度を色で展開します。濃いマスは避け、薄いマスを狙えば大丈夫です。',
    zh: '把每周竞争文档数与强度铺成色块。避开深色格，瞄准浅色格即可。',
  },
  '경쟁 강도': { en: 'Competition', ja: '競合強度', zh: '竞争强度' },
  '낮음': { en: 'Low', ja: '低い', zh: '低' },
  '높음': { en: 'High', ja: '高い', zh: '高' },
  '승산 있는 키워드': { en: 'Winnable keywords', ja: '勝ち目のあるキーワード', zh: '有胜算的关键词' },
  '상위노출 확률': { en: 'Ranking odds', ja: '上位表示の確率', zh: '上首页概率' },
  '월 검색량': { en: 'Monthly searches', ja: '月間検索数', zh: '月搜索量' },
  '주': { en: 'wk', ja: '週', zh: '周' },
  '강남 맛집': { en: 'Gangnam eats', ja: '江南 グルメ', zh: '江南美食' },
  '강남 혼밥': { en: 'Gangnam solo dining', ja: '江南 一人ご飯', zh: '江南独食' },
  '강남 브런치': { en: 'Gangnam brunch', ja: '江南 ブランチ', zh: '江南早午餐' },
  '강남 회식': { en: 'Gangnam group dinner', ja: '江南 会食', zh: '江南聚餐' },
  '강남 데이트': { en: 'Gangnam date spots', ja: '江南 デート', zh: '江南约会' },
  '강남 디저트': { en: 'Gangnam desserts', ja: '江南 デザート', zh: '江南甜点' },
  '피해야 할 키워드': { en: 'Avoid', ja: '避けるべき', zh: '应避开' },
  '경쟁 보통': { en: 'Medium', ja: '普通', zh: '一般' },
  '노려볼 키워드': { en: 'Target', ja: '狙える', zh: '可攻' },
  '개': { en: '', ja: '件', zh: '个' },
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

/* ───────────────── 1. 블로그 지수 등급 ───────────────── */
const GRADES = ['F', 'E', 'D', 'C', 'B', 'A'] as const

type Sample = {
  name: string
  grade: number // GRADES index
  score: number
  headroom: number
  note: string
  metrics: { key: string; icon: typeof Layers; v: number }[]
}

const SAMPLES: Sample[] = [
  {
    name: '맛집 기록 블로그',
    grade: 4,
    score: 82,
    headroom: 18,
    note: '상위노출 후보 — 지금 공략하세요',
    metrics: [
      { key: '맥락·주제 집중도 (C-Rank)', icon: Layers, v: 88 },
      { key: '경험·의도 충족 (D.I.A)', icon: FileText, v: 84 },
      { key: '포스팅 주기 일관성', icon: Repeat, v: 76 },
      { key: '평균 체류시간', icon: Clock, v: 79 },
    ],
  },
  {
    name: '여행 에세이 블로그',
    grade: 3,
    score: 61,
    headroom: 39,
    note: '주제를 좁히면 두 등급까지 오릅니다',
    metrics: [
      { key: '맥락·주제 집중도 (C-Rank)', icon: Layers, v: 44 },
      { key: '경험·의도 충족 (D.I.A)', icon: FileText, v: 72 },
      { key: '포스팅 주기 일관성', icon: Repeat, v: 63 },
      { key: '평균 체류시간', icon: Clock, v: 66 },
    ],
  },
  {
    name: '이제 막 시작한 블로그',
    grade: 1,
    score: 34,
    headroom: 66,
    note: '체류시간부터 손봐야 합니다',
    metrics: [
      { key: '맥락·주제 집중도 (C-Rank)', icon: Layers, v: 38 },
      { key: '경험·의도 충족 (D.I.A)', icon: FileText, v: 41 },
      { key: '포스팅 주기 일관성', icon: Repeat, v: 29 },
      { key: '평균 체류시간', icon: Clock, v: 22 },
    ],
  },
]

function BlogGrade({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)
  const s = SAMPLES[i]
  const tone = s.score >= 75 ? '#10b981' : s.score >= 50 ? '#f59e0b' : '#ef4444'
  const R = 74
  const C = 2 * Math.PI * R

  useEffect(() => {
    if (!auto || !inView) return
    const id = setInterval(() => setI((v) => (v + 1) % SAMPLES.length), 4800)
    return () => clearInterval(id)
  }, [auto, inView])

  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[340px] w-[760px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${tone}1f` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('블로그 지수 진단')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('내 블로그가 지금 몇 등급인지부터')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('C-Rank와 D.I.A 기준으로 블로그 체력을 등급으로 환산합니다. 어느 항목이 발목을 잡는지까지 한 화면에서 보입니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            {/* 상단 — 진단 대상 선택 */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{t('진단 중인 블로그')}</span>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {SAMPLES.map((x, n) => (
                  <button
                    key={x.name}
                    onClick={() => {
                      setI(n)
                      setAuto(false)
                    }}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-all duration-300',
                      n === i ? 'text-white' : 'text-[var(--text-dim)] hover:bg-white/[0.05] hover:text-white',
                    )}
                    style={n === i ? { background: `${tone}26`, boxShadow: `inset 0 0 0 1px ${tone}66` } : undefined}
                  >
                    {t(x.name)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
              {/* 등급 다이얼 */}
              <div className="relative flex flex-col items-center border-b border-white/[0.07] px-6 py-8 lg:border-b-0 lg:border-r">
                <div className="relative">
                  <svg width="196" height="196" viewBox="0 0 196 196" className="-rotate-90">
                    <circle cx="98" cy="98" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="13" />
                    <circle
                      cx="98"
                      cy="98"
                      r={R}
                      fill="none"
                      stroke={tone}
                      strokeWidth="13"
                      strokeLinecap="round"
                      strokeDasharray={C}
                      strokeDashoffset={inView ? C * (1 - s.score / 100) : C}
                      style={{
                        transition: 'stroke-dashoffset 1100ms cubic-bezier(0.16,1,0.3,1), stroke 500ms ease',
                        filter: `drop-shadow(0 0 12px ${tone}aa)`,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-content-center text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-dim)]">{t('블로그 지수')}</span>
                    <span className="mt-0.5 block text-6xl font-extrabold leading-none tracking-tight" style={{ color: tone }}>
                      {GRADES[s.grade]}
                    </span>
                    <span className="mt-1 block text-[12px] font-semibold tabular-nums text-[var(--text-soft)]">
                      <Counter to={s.score} duration={1100} suffix="점" />
                    </span>
                  </div>
                </div>

                {/* 등급 스케일 */}
                <div className="mt-7 w-full">
                  <div className="relative flex justify-between">
                    {GRADES.map((g, n) => (
                      <span
                        key={g}
                        className={cn(
                          'z-10 grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold transition-all duration-500',
                          n === s.grade ? 'scale-110 text-white' : 'text-[var(--text-dim)]',
                        )}
                        style={n === s.grade ? { background: tone, boxShadow: `0 6px 18px -6px ${tone}` } : { background: 'rgba(255,255,255,0.05)' }}
                      >
                        {g}
                      </span>
                    ))}
                    <span className="absolute inset-x-3.5 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-white/[0.07]" />
                  </div>
                  <p className="mt-4 text-center text-[12px] leading-relaxed" style={{ color: tone }}>
                    {t(s.note)}
                  </p>
                </div>
              </div>

              {/* 세부 지표 */}
              <div className="p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                    <Gauge size={12} /> 4{t('개 항목 분석')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: `${feature.accent}18`, color: feature.accent }}>
                    <TrendingUp size={11} /> {t('성장 여력')} {s.headroom}%
                  </span>
                </div>

                <div className="space-y-5">
                  {s.metrics.map((m, n) => {
                    const Icon = m.icon
                    const weak = m.v < 50
                    return (
                      <div key={m.key}>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="inline-flex items-center gap-2 text-[var(--text-soft)]">
                            <span
                              className="grid h-7 w-7 place-items-center rounded-lg"
                              style={{ background: weak ? '#ef444418' : `${feature.accent}18`, color: weak ? '#ef4444' : feature.accent }}
                            >
                              <Icon size={13} />
                            </span>
                            {t(m.key)}
                          </span>
                          <span className={cn('font-bold tabular-nums', weak ? 'text-rose-400' : 'text-[var(--text)]')}>{m.v}</span>
                        </div>
                        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: inView ? `${m.v}%` : '0%',
                              background: weak ? 'linear-gradient(90deg,#ef4444,#f97316)' : `linear-gradient(90deg,${feature.accent},#22d3ee)`,
                              transition: `width 950ms cubic-bezier(0.16,1,0.3,1) ${n * 90}ms`,
                              boxShadow: weak ? '0 0 14px -4px #ef4444' : `0 0 14px -4px ${feature.accent}`,
                            }}
                          />
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

/* ───────────────── 2. 상위노출 시뮬레이터 ───────────────── */
const RIVALS = [
  { id: 'r1', title: '강남 맛집 BEST 10 총정리', blog: '미식노트', color: '#64748b' },
  { id: 'r2', title: '강남역 데이트 코스 맛집', blog: '데이트로그', color: '#64748b' },
  { id: 'r3', title: '현지인이 가는 강남 밥집', blog: '서울식탁', color: '#64748b' },
  { id: 'r4', title: '강남 회식 장소 추천 모음', blog: '회식대장', color: '#64748b' },
  { id: 'r5', title: '강남 혼밥 가능한 식당', blog: '혼밥일기', color: '#64748b' },
  { id: 'r6', title: '강남 브런치 카페 리스트', blog: '브런치맵', color: '#64748b' },
]
const MY_POST = { id: 'me', title: '강남 맛집 — 직접 다녀온 12곳 솔직 후기', blog: '내 블로그' }
const MY_RANKS = [7, 6, 4, 3, 2, 1, 1]
const FIXES = [
  '제목 앞쪽에 핵심 키워드 배치',
  '본문 1,500자 이상으로 확장',
  '직접 찍은 이미지 5장 추가',
  '연관 글 내부 링크 연결',
  '체류시간 1분 30초 개선',
  'C-Rank 주제 집중도 반영',
]
const SERP_ROW_H = 64

function SerpSimulator({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setStep((v) => (v >= MY_RANKS.length + 1 ? 0 : v + 1)), 1900)
    return () => clearInterval(id)
  }, [inView])

  const phase = Math.min(step, MY_RANKS.length - 1)
  const myRank = MY_RANKS[phase]
  const done = myRank === 1

  // 내 글이 끼어든 자리를 비우고 나머지를 차례로 채운다
  const rows: { id: string; title: string; blog: string; rank: number; me?: boolean }[] = []
  let cursor = 1
  for (const r of RIVALS) {
    if (cursor === myRank) cursor++
    rows.push({ ...r, rank: cursor })
    cursor++
  }
  rows.push({ ...MY_POST, rank: myRank, me: true })

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-24">
      <div
        className="animate-drift-slow pointer-events-none absolute left-0 top-10 h-[340px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${feature.accent}20` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('상위노출 시뮬레이터')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('고치는 순서대로 순위가 올라갑니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('알고리즘이 보는 항목을 하나씩 개선하면 검색결과에서 내 글이 어디까지 올라가는지 미리 시뮬레이션합니다.')}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* 검색결과 */}
          <Reveal variant="left">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
              {/* 검색창 */}
              <div className="flex items-center gap-2.5 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${feature.accent}1f`, color: feature.accent }}>
                  <Search size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[9px] uppercase tracking-widest text-[var(--text-dim)]">{t('검색 키워드')}</span>
                  <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{t('강남 맛집 추천')}</span>
                </div>
                <span
                  className="flex-shrink-0 rounded-lg px-3 py-1.5 text-center transition-colors duration-500"
                  style={{ background: done ? '#10b98122' : 'rgba(255,255,255,0.05)' }}
                >
                  <span className="block text-[9px] text-[var(--text-dim)]">{t('현재 순위')}</span>
                  <span className="block text-base font-extrabold tabular-nums leading-tight" style={{ color: done ? '#10b981' : feature.accent }}>
                    {myRank}
                    {t('위')}
                  </span>
                </span>
              </div>

              {/* 결과 리스트 */}
              <div className="relative px-3 py-3" style={{ height: SERP_ROW_H * 7 + 8 }}>
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      'absolute inset-x-3 flex items-center gap-3 rounded-xl border px-3.5',
                      r.me ? 'z-10' : 'border-transparent',
                    )}
                    style={{
                      height: SERP_ROW_H - 8,
                      transform: `translateY(${(r.rank - 1) * SERP_ROW_H}px)`,
                      transition: 'transform 750ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 500ms ease, background 500ms ease',
                      background: r.me ? `${feature.accent}14` : 'transparent',
                      borderColor: r.me ? `${feature.accent}66` : 'transparent',
                      boxShadow: r.me ? `0 12px 34px -20px ${feature.accent}` : undefined,
                    }}
                  >
                    <span
                      className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[12px] font-bold tabular-nums transition-colors duration-500"
                      style={{
                        background: r.me ? feature.accent : 'rgba(255,255,255,0.05)',
                        color: r.me ? '#fff' : 'var(--text-dim)',
                      }}
                    >
                      {r.rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-[13px] font-semibold', r.me ? 'text-[var(--text)]' : 'text-[var(--text-soft)]')}>
                        {t(r.title)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--text-dim)]">blog.naver.com · {r.blog}</span>
                    </span>
                    {r.me && (
                      <span
                        className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: feature.accent, color: '#04120c' }}
                      >
                        {t('내 글')}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {done && (
                <div
                  className="animate-fade-up flex items-center justify-center gap-2 border-t border-white/[0.07] px-4 py-3 text-[13px] font-semibold"
                  style={{ background: '#10b98114', color: '#10b981' }}
                >
                  <Trophy size={14} /> {t('1페이지 노출 성공')}
                </div>
              )}
            </div>
          </Reveal>

          {/* 개선 체크리스트 */}
          <Reveal variant="right">
            <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#0b0d16] p-5">
              <p className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Sparkles size={12} style={{ color: feature.accent }} /> {t('적용한 개선 항목')}
              </p>

              <div className="space-y-2.5">
                {FIXES.map((f, n) => {
                  const on = n < phase + 1
                  return (
                    <div
                      key={f}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-500',
                        on ? 'border-white/15 bg-white/[0.05]' : 'border-white/[0.06] bg-white/[0.015]',
                      )}
                    >
                      <span
                        className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full transition-all duration-500"
                        style={{
                          background: on ? feature.accent : 'rgba(255,255,255,0.06)',
                          transform: on ? 'scale(1)' : 'scale(0.85)',
                        }}
                      >
                        <Check size={13} className={on ? 'text-[#04120c]' : 'text-[var(--text-dim)]'} />
                      </span>
                      <span className={cn('text-[12.5px] leading-snug transition-colors duration-500', on ? 'text-[var(--text)]' : 'text-[var(--text-dim)]')}>
                        {t(f)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 진행 바 */}
              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-dim)]">
                  <span>{t('상위노출 확률')}</span>
                  <span className="font-bold tabular-nums" style={{ color: feature.accent }}>
                    {Math.round(28 + (phase / (MY_RANKS.length - 1)) * 66)}%
                  </span>
                </div>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${28 + (phase / (MY_RANKS.length - 1)) * 66}%`,
                      background: `linear-gradient(90deg, ${feature.accent}, #22d3ee)`,
                      transition: 'width 750ms cubic-bezier(0.16,1,0.3,1)',
                      boxShadow: `0 0 16px -4px ${feature.accent}`,
                    }}
                  />
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────────── 3. 경쟁 강도 히트맵 ───────────────── */
const KEYWORDS = [
  { kw: '강남 맛집', vol: '74,000', odds: 32, base: 0.86 },
  { kw: '강남 혼밥', vol: '12,400', odds: 78, base: 0.34 },
  { kw: '강남 브런치', vol: '18,900', odds: 66, base: 0.46 },
  { kw: '강남 회식', vol: '9,800', odds: 71, base: 0.4 },
  { kw: '강남 데이트', vol: '41,000', odds: 41, base: 0.72 },
  { kw: '강남 디저트', vol: '7,600', odds: 84, base: 0.28 },
]
const WEEKS = 10

/** 경쟁 강도(0~1) → 열지도 색. 옅은 초록(노려볼 만함) → 앰버 → 빨강(포화) */
function heatColor(v: number) {
  if (v < 0.42) return `rgba(16,185,129,${0.2 + v * 1.1})`
  if (v < 0.7) return `rgba(245,158,11,${0.3 + (v - 0.42) * 1.4})`
  return `rgba(239,68,68,${0.34 + (v - 0.7) * 1.2})`
}

function CompetitionHeatmap({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [scan, setScan] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setScan((v) => (v + 1) % WEEKS), 620)
    return () => clearInterval(id)
  }, [inView])

  const sorted = [...KEYWORDS].sort((a, b) => b.odds - a.odds).slice(0, 4)

  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1a` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('경쟁 강도 분석')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('이길 수 있는 키워드부터 고릅니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('주차별 경쟁 문서 수와 강도를 색으로 펼쳐 봅니다. 진한 칸은 피하고, 옅은 칸을 노리면 됩니다.')}
          </p>
        </Reveal>

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* 히트맵 */}
          <Reveal variant="left">
            <div className="h-full rounded-3xl border border-white/10 bg-[#0b0d16] p-5 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
              <div className="mb-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                  <Grid3x3 size={12} /> {t('경쟁 강도')}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)]">
                  {t('낮음')}
                  <span className="h-2 w-20 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.35), #10b981, #f59e0b, #ef4444)' }} />
                  {t('높음')}
                </span>
              </div>

              <div className="space-y-1.5">
                {KEYWORDS.map((k, r) => (
                  <div key={k.kw} className="flex items-center gap-2">
                    <span className="w-20 flex-shrink-0 truncate text-[11.5px] font-medium text-[var(--text-soft)] sm:w-24">{t(k.kw)}</span>
                    <div className="flex flex-1 gap-1">
                      {Array.from({ length: WEEKS }, (_, c) => {
                        // 결정적 변동 — 키워드마다 다른 위상의 사인파
                        const v = Math.min(1, Math.max(0.08, k.base + Math.sin((c + r * 1.7) / 1.9) * 0.16))
                        const hot = v > 0.7
                        const on = c === scan
                        return (
                          <span
                            key={c}
                            className="h-9 flex-1 rounded-md transition-all duration-500"
                            style={{
                              background: heatColor(v),
                              opacity: inView ? 1 : 0,
                              transform: on ? 'scaleY(1.18)' : 'scaleY(1)',
                              boxShadow: on ? `0 0 16px -4px ${hot ? '#ef4444' : feature.accent}` : undefined,
                              transitionDelay: inView ? `${(r * WEEKS + c) * 12}ms` : '0ms',
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-1 pl-[88px] sm:pl-[104px]">
                {Array.from({ length: WEEKS }, (_, c) => (
                  <span key={c} className="flex-1 text-center text-[9px] tabular-nums text-[var(--text-dim)]">
                    {c + 1}
                    {t('주')}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-white/[0.07] pt-4">
                {([
                  ['#ef4444', t('피해야 할 키워드'), KEYWORDS.filter((k) => k.base > 0.7).length],
                  ['#f59e0b', t('경쟁 보통'), KEYWORDS.filter((k) => k.base > 0.42 && k.base <= 0.7).length],
                  [feature.accent, t('노려볼 키워드'), KEYWORDS.filter((k) => k.base <= 0.42).length],
                ] as const).map(([c, label, v]) => (
                  <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)]">
                      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                      {label}
                    </span>
                    <span className="mt-1 block text-[15px] font-bold tabular-nums text-[var(--text)]">
                      {v}
                      {t('개')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* 승산 있는 키워드 */}
          <Reveal variant="right">
            <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#0b0d16] p-5">
              <p className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Target size={12} style={{ color: feature.accent }} /> {t('승산 있는 키워드')}
              </p>

              <div className="space-y-3">
                {sorted.map((k, n) => (
                  <div key={k.kw} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
                        <span
                          className="grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold"
                          style={{ background: `${feature.accent}22`, color: feature.accent }}
                        >
                          {n + 1}
                        </span>
                        #{t(k.kw)}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums" style={{ color: feature.accent }}>
                        <ArrowUp size={11} />
                        {k.odds}%
                      </span>
                    </div>
                    <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: inView ? `${k.odds}%` : '0%',
                          background: `linear-gradient(90deg, ${feature.accent}, #22d3ee)`,
                          transition: `width 900ms cubic-bezier(0.16,1,0.3,1) ${n * 110}ms`,
                        }}
                      />
                    </span>
                    <div className="mt-2 flex items-center justify-between text-[10.5px] text-[var(--text-dim)]">
                      <span>{t('상위노출 확률')}</span>
                      <span>
                        {t('월 검색량')} {k.vol}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function BlogRankShowcase({ feature }: { feature: Feature }) {
  return (
    <>
      <BlogGrade feature={feature} />
      <SerpSimulator feature={feature} />
      <CompetitionHeatmap feature={feature} />
    </>
  )
}
