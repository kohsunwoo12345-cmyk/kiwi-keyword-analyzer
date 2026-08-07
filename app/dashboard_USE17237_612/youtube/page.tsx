'use client'

/* 유튜브 채널 분석
 *
 * ⚠ 여기엔 원래 <iframe src="/tools/youtube?embed=1"> 이 있었다. 그 파일은 이 저장소에
 *   한 번도 있던 적이 없다(git 이력 확인) — 메뉴를 눌러도 빈 화면이었다.
 *   뒷단(/api/youtube/analyze · trending)은 이미 다 있다.
 *
 * ⚠ 분석은 1 크레딧이 나간다. 누르기 전에 그 사실을 보이게 둔다.
 *   유튜브 API 는 하루 할당량이 정해져 있어서, 실패하면 크레딧을 되돌려준다(서버가 환불).
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PlaySquare, Search, Loader2, Users, Eye, ThumbsUp, MessageSquare, TrendingUp, AlertCircle, Flame, Calendar } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric, inputCls } from '@/components/dash/Kit'
import { BarSeries } from '@/components/dash/Charts'
import { Button, Badge } from '@/components/ui'
import { formatNumber, cn } from '@/lib/utils'
import { analyzeYoutube, youtubeTrending, type YtAnalysis, type YtTrendingVideo } from '@/lib/auth'

const ACCENT = '#ef4444'

function fmtDate(iso?: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit' }) } catch { return String(iso) }
}
/** 1,234,567 → 123만 — 구독자·조회수는 자릿수보다 규모가 먼저 읽혀야 한다 */
function compact(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString('ko-KR')}만`
  return formatNumber(n)
}

export default function YoutubePage() {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<YtAnalysis | null>(null)

  const [trend, setTrend] = useState<YtTrendingVideo[]>([])
  const [trendErr, setTrendErr] = useState('')
  const [trendLoading, setTrendLoading] = useState(true)

  useEffect(() => {
    let alive = true
    youtubeTrending().then((d) => {
      if (!alive) return
      setTrend(d.videos.slice(0, 12))
      setTrendErr(d.ok ? '' : d.error || '인기 급상승을 불러오지 못했습니다.')
      setTrendLoading(false)
    })
    return () => { alive = false }
  }, [])

  async function run(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q || busy) return
    setBusy(true); setRes(null)
    setRes(await analyzeYoutube(q))
    setBusy(false)
  }

  const ch = res?.channel
  const m = res?.metrics
  const videos = res?.videos || []

  /** 최근 영상 조회수 — 어떤 영상이 터졌는지 한눈에 */
  const viewBars = useMemo(
    () => videos.slice().reverse().map((v, i) => ({ name: `${i + 1}`, 조회수: v.viewCount, title: v.title })),
    [videos],
  )
  const best = useMemo(() => videos.slice().sort((a, b) => b.viewCount - a.viewCount)[0], [videos])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={PlaySquare}
        eyebrow="유튜브 분석"
        title="유튜브 채널 분석"
        desc="채널의 구독자·조회수·참여율과 최근 영상 성과를 실제 데이터로 확인합니다."
        accent={ACCENT}
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <Card title="채널 찾기" desc="채널명 · @핸들 · 채널 ID 아무거나">
          <form onSubmit={run} className="flex flex-col gap-2.5 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 침착맨 · @chimchakman · UCUj6rrhMTR9pipbAWBAMvUQ"
              className={cn(inputCls, 'flex-1')}
            />
            <Button type="submit" disabled={!query.trim() || busy} className="justify-center sm:w-auto">
              {busy ? <><Loader2 size={16} className="animate-spin" /> 분석 중…</> : <><Search size={16} /> 분석하기</>}
            </Button>
          </form>
          <p className="mt-2.5 text-[11.5px] text-[var(--text-dim)]">
            분석 1회에 크레딧 1개가 나갑니다. 채널을 못 찾거나 유튜브가 응답하지 않으면 자동으로 되돌려 드립니다.
          </p>
        </Card>

        {res && !res.ok && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12.5px] text-rose-500">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{res.error || '분석에 실패했습니다.'}</p>
              {res.refunded && <p className="mt-0.5 text-rose-500/85">차감된 크레딧은 되돌려 드렸습니다.</p>}
            </div>
          </div>
        )}

        {ch && (
          <>
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {ch.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ch.thumbnail} alt="" className="h-16 w-16 flex-shrink-0 rounded-full object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[17px] font-semibold tracking-[-0.02em]">{ch.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--text-soft)]">{ch.description || '채널 소개가 없습니다.'}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--text-dim)]">
                    <span className="inline-flex items-center gap-1"><Calendar size={12} /> {fmtDate(ch.publishedAt)} 개설</span>
                    {ch.country && <span>{ch.country}</span>}
                    <a href={`https://www.youtube.com/channel/${ch.id}`} target="_blank" rel="noreferrer" className="font-semibold text-red-400 hover:underline">유튜브에서 보기</a>
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="구독자" icon={Users} accent={ACCENT} value={compact(ch.subscriberCount)} sub={`${formatNumber(ch.subscriberCount)}명`} />
              <Metric label="총 조회수" icon={Eye} accent="#f59e0b" value={compact(ch.viewCount)} sub={`영상 ${formatNumber(ch.videoCount)}개`} />
              <Metric label="영상당 평균 조회" icon={TrendingUp} accent="#0ea5e9" value={compact(m?.avgViews || 0)} sub="최근 12개 기준" />
              <Metric
                label="참여율"
                icon={ThumbsUp}
                accent="#22c55e"
                value={`${m?.engagementRate ?? 0}%`}
                sub={<span className="block h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (m?.engagementRate || 0) * 10)}%` }} /></span>}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="평균 좋아요" icon={ThumbsUp} accent="#22c55e" value={formatNumber(m?.avgLikes || 0)} sub="최근 12개 평균" />
              <Metric label="평균 댓글" icon={MessageSquare} accent="#8b5cf6" value={formatNumber(m?.avgComments || 0)} sub="최근 12개 평균" />
              <Metric label="월 업로드" icon={Calendar} accent="#0ea5e9" value={`${m?.uploadsPerMonth ?? 0}개`} sub="최근 영상 간격으로 계산" />
            </div>

            {viewBars.length > 0 && (
              <Card title="최근 영상 조회수" desc="왼쪽이 오래된 영상, 오른쪽이 최신">
                <BarSeries data={viewBars} dataKey="조회수" color={ACCENT} height={260} />
                {best && (
                  <p className="mt-3 text-[12px] text-[var(--text-soft)]">
                    가장 많이 본 영상 — <span className="font-semibold">{best.title}</span> ({compact(best.viewCount)}회)
                  </p>
                )}
              </Card>
            )}

            {videos.length > 0 && (
              <Card title="최근 영상" desc={`${videos.length}개`} bodyClassName="p-0">
                <div className="divide-y divide-[var(--border-soft)]">
                  {videos.map((v) => (
                    <a
                      key={v.id}
                      href={`https://www.youtube.com/watch?v=${v.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--panel-2)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.thumbnail} alt="" className="h-11 w-20 flex-shrink-0 rounded-lg object-cover" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{v.title}</p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--text-dim)]">{fmtDate(v.publishedAt)}</p>
                      </div>
                      <div className="flex flex-shrink-0 gap-3 text-[11.5px] tabular-nums text-[var(--text-soft)]">
                        <span className="inline-flex items-center gap-1"><Eye size={12} /> {compact(v.viewCount)}</span>
                        <span className="hidden items-center gap-1 sm:inline-flex"><ThumbsUp size={12} /> {compact(v.likeCount)}</span>
                        <span className="hidden items-center gap-1 sm:inline-flex"><MessageSquare size={12} /> {compact(v.commentCount)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {!res && (
          <Card title="지금 인기 급상승" desc="한국 · 유튜브 실시간" bodyClassName={trend.length ? 'p-0' : undefined}>
            {trendLoading ? (
              <div className="flex items-center justify-center py-16 text-[var(--text-dim)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중…</div>
            ) : trendErr ? (
              <EmptyState icon={Flame} title="인기 급상승을 불러오지 못했습니다" hint={trendErr} />
            ) : trend.length === 0 ? (
              <EmptyState icon={Flame} title="표시할 영상이 없습니다" />
            ) : (
              <div className="divide-y divide-[var(--border-soft)]">
                {trend.map((v, i) => (
                  <a
                    key={v.id}
                    href={`https://www.youtube.com/watch?v=${v.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--panel-2)]"
                  >
                    <span className="w-5 flex-shrink-0 text-center text-[13px] font-semibold tabular-nums text-[var(--text-dim)]">{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.thumbnail} alt="" className="h-11 w-20 flex-shrink-0 rounded-lg object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{v.title}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-dim)]">{v.channelTitle}</p>
                    </div>
                    <Badge className="hidden flex-shrink-0 border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)] sm:inline-flex">
                      <Eye size={11} /> {compact(Number(v.viewCount) || 0)}
                    </Badge>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setQuery(v.channelTitle) }}
                      className="hidden flex-shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-soft)] transition-colors hover:bg-[var(--panel)] lg:block"
                    >
                      이 채널 분석
                    </button>
                  </a>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
