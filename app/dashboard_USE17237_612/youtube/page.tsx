'use client'

import { useMemo, useState } from 'react'
import {
  PlaySquare,
  Search,
  Users,
  Eye,
  TrendingUp,
  Flame,
  Hash,
  Lightbulb,
  Swords,
  BarChart3,
  ThumbsUp,
  MessageSquare,
  Play,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, BarSeries } from '@/components/dash/Charts'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { formatNumber } from '@/lib/utils'

const RED = '#ef4444'

const TABS = [
  { id: 'home', label: '대시보드', icon: BarChart3 },
  { id: 'channel', label: '채널 검색', icon: Search },
  { id: 'detail', label: '채널 상세 분석', icon: Users },
  { id: 'video', label: '영상 분석', icon: PlaySquare },
  { id: 'kwvol', label: '키워드 검색량', icon: Hash },
  { id: 'kwins', label: '키워드 인사이트', icon: Lightbulb },
  { id: 'trend', label: '인기 동영상', icon: TrendingUp },
  { id: 'compete', label: '경쟁 채널 비교', icon: Swords },
] as const

type TabId = (typeof TABS)[number]['id']

const CHANNELS = [
  { name: '마케팅탐구소', handle: '@marketing_lab', subs: 482000, views: 12400000, videos: 312, avg: 397000, eng: 8.4, growth: 12.4 },
  { name: '브랜드랩TV', handle: '@brandlab', subs: 237000, views: 6800000, videos: 198, avg: 172000, eng: 6.1, growth: 8.1 },
  { name: '숏폼공장', handle: '@shortform', subs: 1120000, views: 48200000, videos: 890, avg: 542000, eng: 11.2, growth: 24.7 },
  { name: '커머스노트', handle: '@commerce_note', subs: 158000, views: 4100000, videos: 264, avg: 121000, eng: 5.5, growth: 4.2 },
]

const VIDEOS = [
  { title: '전환율 3배 올린 랜딩페이지 공식', ch: '마케팅탐구소', views: 284000, likes: 12400, comments: 842, date: '3일 전', viral: 92 },
  { title: '요즘 뜨는 숏폼 훅 5가지', ch: '숏폼공장', views: 512000, likes: 31200, comments: 1840, date: '5일 전', viral: 96 },
  { title: '광고비 아끼는 타겟팅 전략', ch: '브랜드랩TV', views: 148000, likes: 6700, comments: 421, date: '1주 전', viral: 74 },
  { title: 'AI로 영상 10배 빨리 만들기', ch: '마케팅탐구소', views: 396000, likes: 18900, comments: 1120, date: '4일 전', viral: 88 },
  { title: '네이버 블로그 상위노출 근황', ch: '커머스노트', views: 92000, likes: 3100, comments: 214, date: '2일 전', viral: 61 },
  { title: '인스타 릴스 알고리즘 완전정복', ch: '숏폼공장', views: 634000, likes: 42000, comments: 2310, date: '6일 전', viral: 97 },
]

const KEYWORDS = [
  { kw: '숏폼 편집', vol: 74000, comp: '낮음', cpc: 320, rel: ['숏폼 편집 앱', '릴스 편집', '캡컷 편집'], viral: 94 },
  { kw: '릴스 알고리즘', vol: 52000, comp: '보통', cpc: 480, rel: ['릴스 도달', '릴스 떡상', '릴스 조회수'], viral: 88 },
  { kw: 'AI 영상 제작', vol: 38000, comp: '낮음', cpc: 640, rel: ['AI 영상 툴', '텍스트 영상', 'AI 광고 영상'], viral: 91 },
  { kw: '유튜브 썸네일', vol: 121000, comp: '높음', cpc: 210, rel: ['썸네일 제작', '썸네일 크기', '썸네일 무료'], viral: 67 },
  { kw: '브랜디드 콘텐츠', vol: 18000, comp: '낮음', cpc: 890, rel: ['브랜드 협찬', 'PPL', '광고 영상'], viral: 79 },
]

const growthData = [
  { name: '1월', 구독자: 40, 조회수: 120 },
  { name: '2월', 구독자: 42, 조회수: 138 },
  { name: '3월', 구독자: 45, 조회수: 156 },
  { name: '4월', 구독자: 51, 조회수: 188 },
  { name: '5월', 구독자: 58, 조회수: 224 },
  { name: '6월', 구독자: 64, 조회수: 268 },
  { name: '7월', 구독자: 72, 조회수: 312 },
]

function compBadge(comp: string) {
  if (comp === '낮음') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (comp === '보통') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

function ViralBar({ score }: { score: number }) {
  const color = score >= 90 ? '#ef4444' : score >= 75 ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{score}</span>
    </div>
  )
}

function ChThumb({ name }: { name: string }) {
  return (
    <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-sm font-bold text-white">
      {name[0]}
    </span>
  )
}

export default function YoutubePage() {
  const [tab, setTab] = useState<TabId>('home')
  const [channelQ, setChannelQ] = useState('')
  const [videoQ, setVideoQ] = useState('')
  const [kw, setKw] = useState('숏폼 편집')
  const [selectedKw, setSelectedKw] = useState(KEYWORDS[0])

  const channelResults = useMemo(
    () => CHANNELS.filter((c) => c.name.includes(channelQ) || c.handle.includes(channelQ)),
    [channelQ],
  )
  const videoResults = useMemo(
    () => VIDEOS.filter((v) => v.title.includes(videoQ) || v.ch.includes(videoQ)),
    [videoQ],
  )

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={PlaySquare}
        eyebrow="유튜브 분석"
        title="유튜브 채널 분석"
        desc="채널·영상·키워드 성과를 분석하고 떡상 콘텐츠 전략을 도출합니다."
        accent={RED}
      />

      {/* tabs */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-white/80 px-4 backdrop-blur lg:px-8">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-[var(--text-soft)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={15} /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-6 p-6 lg:p-8">
        {/* ===== 대시보드 ===== */}
        {tab === 'home' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="구독자" value="48.2만" delta={12.4} icon={Users} accent={RED} />
              <StatCard label="총 조회수" value="1,240만" delta={8.7} icon={Eye} accent="#f59e0b" />
              <StatCard label="평균 조회수" value="39.7만" delta={15.1} icon={TrendingUp} accent="#22c55e" />
              <StatCard label="떡상 지수" value="92 / 100" delta={6} icon={Flame} accent={RED} />
            </div>
            <Panel title="채널 성장 추이 (구독자 만명 · 조회수 만회)">
              <AreaTrend data={growthData} keys={['구독자', '조회수']} colors={['#ef4444', '#f59e0b']} />
            </Panel>
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="이번주 떡상 영상">
                <div className="space-y-2.5">
                  {VIDEOS.slice(0, 4).map((v) => (
                    <div key={v.title} className="card-2 flex items-center gap-3 p-3">
                      <span className="grid h-9 w-14 flex-shrink-0 place-items-center rounded bg-slate-100 text-[var(--text-dim)]">
                        <Play size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{v.title}</p>
                        <p className="text-xs text-[var(--text-dim)]">{v.ch} · 조회 {formatNumber(v.views)}</p>
                      </div>
                      <ViralBar score={v.viral} />
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="떡상 키워드 TOP 5">
                <div className="space-y-2.5">
                  {KEYWORDS.map((k) => (
                    <div key={k.kw} className="card-2 flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium">{k.kw}</p>
                        <p className="text-xs text-[var(--text-dim)]">월 검색 {formatNumber(k.vol)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={compBadge(k.comp)}>{k.comp}</Badge>
                        <span className="flex items-center gap-1 text-sm font-bold text-red-600">
                          <Flame size={14} /> {k.viral}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}

        {/* ===== 채널 검색 ===== */}
        {tab === 'channel' && (
          <>
            <SearchBar value={channelQ} onChange={setChannelQ} placeholder="채널명 또는 @핸들 검색" />
            <Panel title={`검색 결과 (${channelResults.length})`}>
              <div className="space-y-2.5">
                {channelResults.map((c) => (
                  <div key={c.name} className="card-2 flex items-center gap-3 p-3.5">
                    <ChThumb name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-[var(--text-dim)]">{c.handle}</p>
                    </div>
                    <div className="hidden gap-6 sm:flex">
                      <MiniStat label="구독자" value={formatNumber(c.subs)} />
                      <MiniStat label="영상" value={`${c.videos}`} />
                      <MiniStat label="평균 조회" value={formatNumber(c.avg)} />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setTab('detail')}>
                      상세 분석
                    </Button>
                  </div>
                ))}
                {channelResults.length === 0 && <Empty />}
              </div>
            </Panel>
          </>
        )}

        {/* ===== 채널 상세 분석 ===== */}
        {tab === 'detail' && (
          <>
            <Panel>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <ChThumb name="마케팅탐구소" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold">마케팅탐구소</h3>
                  <p className="text-sm text-[var(--text-dim)]">@marketing_lab · 마케팅 · 광고</p>
                </div>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <TrendingUp size={12} /> 성장 +12.4%
                </Badge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <BoxStat label="구독자" value="48.2만" />
                <BoxStat label="총 조회수" value="1,240만" />
                <BoxStat label="업로드 영상" value="312" />
                <BoxStat label="평균 조회수" value="39.7만" />
                <BoxStat label="평균 참여율" value="8.4%" />
              </div>
            </Panel>
            <Panel title="구독자·조회수 추이">
              <AreaTrend data={growthData} keys={['구독자', '조회수']} colors={['#ef4444', '#f59e0b']} />
            </Panel>
            <Panel title="최근 업로드 영상">
              <VideoTable rows={VIDEOS.filter((v) => v.ch === '마케팅탐구소')} />
            </Panel>
          </>
        )}

        {/* ===== 영상 분석 ===== */}
        {tab === 'video' && (
          <>
            <SearchBar value={videoQ} onChange={setVideoQ} placeholder="영상 제목 또는 채널 검색" />
            <Panel title={`영상 (${videoResults.length})`}>
              <VideoTable rows={videoResults} />
            </Panel>
          </>
        )}

        {/* ===== 키워드 검색량 ===== */}
        {tab === 'kwvol' && (
          <>
            <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  value={kw}
                  onChange={(e) => setKw(e.target.value)}
                  placeholder="키워드 입력"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] py-2.5 pl-11 pr-3 text-sm outline-none focus:border-red-500"
                />
              </div>
              <Button className="!bg-gradient-to-br !from-red-500 !to-rose-500">
                <Search size={16} /> 검색량 조회
              </Button>
            </div>
            <Panel title="키워드 검색량 분석">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                      <th className="px-3 py-2.5 font-medium">키워드</th>
                      <th className="px-3 py-2.5 font-medium">월 검색량</th>
                      <th className="px-3 py-2.5 font-medium">경쟁도</th>
                      <th className="px-3 py-2.5 font-medium">예상 CPC</th>
                      <th className="px-3 py-2.5 font-medium">떡상지수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KEYWORDS.map((k) => (
                      <tr key={k.kw} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                        <td className="px-3 py-3 font-medium">{k.kw}</td>
                        <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(k.vol)}</td>
                        <td className="px-3 py-3"><Badge className={compBadge(k.comp)}>{k.comp}</Badge></td>
                        <td className="px-3 py-3 text-[var(--text-soft)]">₩{k.cpc}</td>
                        <td className="px-3 py-3"><ViralBar score={k.viral} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}

        {/* ===== 키워드 인사이트 ===== */}
        {tab === 'kwins' && (
          <>
            <div className="flex flex-wrap gap-2">
              {KEYWORDS.map((k) => (
                <button
                  key={k.kw}
                  onClick={() => setSelectedKw(k)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedKw.kw === k.kw
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : 'border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)]'
                  }`}
                >
                  {k.kw}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <BoxStat label="월 검색량" value={formatNumber(selectedKw.vol)} />
              <BoxStat label="경쟁도" value={selectedKw.comp} />
              <BoxStat label="떡상지수" value={`${selectedKw.viral}/100`} />
            </div>
            <Panel title={`"${selectedKw.kw}" 관련 키워드`}>
              <div className="flex flex-wrap gap-2">
                {selectedKw.rel.map((r) => (
                  <span key={r} className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-sm text-[var(--text-soft)]">
                    <Hash size={12} className="mr-1 inline text-red-500" />{r}
                  </span>
                ))}
              </div>
            </Panel>
            <Panel title="이 키워드로 뜬 영상">
              <VideoTable rows={VIDEOS.slice(0, 3)} />
            </Panel>
          </>
        )}

        {/* ===== 인기 동영상 ===== */}
        {tab === 'trend' && (
          <Panel title="실시간 인기 동영상 (마케팅 카테고리)">
            <VideoTable rows={[...VIDEOS].sort((a, b) => b.views - a.views)} rank />
          </Panel>
        )}

        {/* ===== 경쟁 채널 비교 ===== */}
        {tab === 'compete' && (
          <>
            <Panel title="경쟁 채널 지표 비교">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                      <th className="px-3 py-2.5 font-medium">채널</th>
                      <th className="px-3 py-2.5 font-medium">구독자</th>
                      <th className="px-3 py-2.5 font-medium">총 조회수</th>
                      <th className="px-3 py-2.5 font-medium">영상수</th>
                      <th className="px-3 py-2.5 font-medium">평균 조회</th>
                      <th className="px-3 py-2.5 font-medium">참여율</th>
                      <th className="px-3 py-2.5 font-medium">성장률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHANNELS.map((c) => (
                      <tr key={c.name} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <ChThumb name={c.name} />
                            <span className="font-medium">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(c.subs)}</td>
                        <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(c.views)}</td>
                        <td className="px-3 py-3 text-[var(--text-soft)]">{c.videos}</td>
                        <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(c.avg)}</td>
                        <td className="px-3 py-3 text-[var(--text-soft)]">{c.eng}%</td>
                        <td className="px-3 py-3">
                          <span className="font-semibold text-emerald-600">+{c.growth}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="구독자 규모 비교 (만명)">
              <BarSeries
                data={CHANNELS.map((c) => ({ name: c.name, 구독자: Math.round(c.subs / 10000) }))}
                dataKey="구독자"
                color={RED}
              />
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] py-2.5 pl-11 pr-3 text-sm outline-none focus:border-red-500"
        />
      </div>
      <Button className="!bg-gradient-to-br !from-red-500 !to-rose-500">
        <Search size={16} /> 검색
      </Button>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-xs text-[var(--text-dim)]">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function BoxStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-2 p-4 text-center">
      <p className="text-xs text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  )
}

function Empty() {
  return <div className="py-10 text-center text-sm text-[var(--text-dim)]">검색 결과가 없습니다.</div>
}

function VideoTable({ rows, rank }: { rows: typeof VIDEOS; rank?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
            {rank && <th className="px-3 py-2.5 font-medium">#</th>}
            <th className="px-3 py-2.5 font-medium">영상</th>
            <th className="px-3 py-2.5 font-medium">조회수</th>
            <th className="px-3 py-2.5 font-medium">좋아요</th>
            <th className="px-3 py-2.5 font-medium">댓글</th>
            <th className="px-3 py-2.5 font-medium">업로드</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v, i) => (
            <tr key={v.title} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
              {rank && (
                <td className="px-3 py-3">
                  <span className={`grid h-6 w-6 place-items-center rounded text-xs font-bold ${i < 3 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-[var(--text-soft)]'}`}>
                    {i + 1}
                  </span>
                </td>
              )}
              <td className="px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-14 flex-shrink-0 place-items-center rounded bg-slate-100 text-[var(--text-dim)]">
                    <Play size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{v.title}</p>
                    <p className="text-xs text-[var(--text-dim)]">{v.ch}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(v.views)}</td>
              <td className="px-3 py-3 text-[var(--text-soft)]">
                <span className="flex items-center gap-1"><ThumbsUp size={12} />{formatNumber(v.likes)}</span>
              </td>
              <td className="px-3 py-3 text-[var(--text-soft)]">
                <span className="flex items-center gap-1"><MessageSquare size={12} />{formatNumber(v.comments)}</span>
              </td>
              <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{v.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
