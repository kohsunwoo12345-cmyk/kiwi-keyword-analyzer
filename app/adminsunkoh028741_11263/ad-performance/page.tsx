'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp, RefreshCw, Search, Eye, MousePointerClick, Target, Megaphone, Link2, ExternalLink, BarChart3, Bell,
} from 'lucide-react'
import { MktCanvas, MktHeader, MktPanel, MktStat, MktButton } from '@/components/marketing/node'
import { Reveal } from '@/components/motion'
import { adminAdPerformance, adminAdLandingAnalyze, type AdPerfStats, type AdLandingDetail } from '@/lib/auth'
import { kstDate } from '@/lib/time'
import { cn } from '@/lib/utils'

const ACCENT = '#2563eb'
const num = (n: number) => (n || 0).toLocaleString('ko-KR')
const pct = (n: number | null | undefined) => (n == null ? '-' : `${n}%`)

const THEAD = 'border-b border-[var(--border)] text-left text-xs text-[var(--mkt-text-dim)]'
const TH = 'px-3 py-2.5 font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 whitespace-nowrap'
const TR = 'border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--panel-2)]'

export default function AdPerformancePage() {
  const [data, setData] = useState<AdPerfStats>({ ok: false })
  const [loading, setLoading] = useState(true)
  const [urlInput, setUrlInput] = useState('')
  const [detail, setDetail] = useState<AdLandingDetail | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  function load() {
    setLoading(true)
    adminAdPerformance().then((r) => { setData(r); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  function analyze(u?: string) {
    const target = (u ?? urlInput).trim()
    if (!target) return
    setUrlInput(target)
    setAnalyzing(true); setDetail(null)
    adminAdLandingAnalyze(target).then((r) => { setDetail(r); setAnalyzing(false) })
  }

  const t = data.totals
  const landings = data.landings ?? []
  const ads = data.ads ?? []

  return (
    <MktCanvas>
      <MktHeader
        icon={TrendingUp}
        eyebrow="ADMIN · 광고"
        title="광고 성과"
        desc="우리 랜딩페이지(/f/…)의 조회수·전환율과, 알림으로 발송한 광고(랜딩 CTA) 성과를 한 곳에서 봅니다. 알림 CTA에 우리 랜딩 URL을 넣으면 자동으로 광고로 등록됩니다."
        accent={ACCENT}
        action={
          <MktButton variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
          </MktButton>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* URL 분석기 */}
        <Reveal>
          <MktPanel icon={Search} title="랜딩페이지 URL 분석">
            <div className="flex flex-wrap gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') analyze() }}
                placeholder="예) https://bygency.co/f/f-abc123  또는  /f/f-abc123"
                className="input min-w-[280px] flex-1"
              />
              <MktButton variant="solid" onClick={() => analyze()} disabled={analyzing || !urlInput.trim()}>
                {analyzing ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />} 분석
              </MktButton>
            </div>
            {detail && (
              <div className="mt-4">
                {!detail.found ? (
                  <div className="rounded-xl border border-[#7a5b17] bg-[#ffd66b]/10 px-4 py-3 text-sm text-[#b45309]">
                    {detail.reason || '우리 랜딩페이지 URL이 아닙니다.'}
                  </div>
                ) : detail.landing ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{detail.landing.title || detail.landing.slug}</span>
                      <a href={detail.landing.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[#7c3aed]/12 px-2 py-0.5 font-mono text-[11px] text-[#4f46e5] hover:underline">{detail.landing.url} <ExternalLink size={11} /></a>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-[var(--border)] p-3 text-center"><div className="text-[11px] font-semibold text-[var(--text-dim)]">조회수</div><div className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--mkt-text)]">{num(detail.landing.views)}</div></div>
                      <div className="rounded-xl border border-[var(--border)] p-3 text-center"><div className="text-[11px] font-semibold text-[var(--text-dim)]">순 방문자</div><div className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--mkt-text)]">{num(detail.landing.uniqueVisitors)}</div></div>
                      <div className="rounded-xl border border-[var(--border)] p-3 text-center"><div className="text-[11px] font-semibold text-[var(--text-dim)]">전환(신청)</div><div className="mt-0.5 text-2xl font-bold tabular-nums text-[#059669]">{num(detail.landing.conversions)}</div></div>
                      <div className="rounded-xl border border-[var(--border)] p-3 text-center"><div className="text-[11px] font-semibold text-[var(--text-dim)]">전환율</div><div className="mt-0.5 text-2xl font-bold tabular-nums text-[#6d28d9]">{pct(detail.landing.rate)}</div></div>
                    </div>
                    {(detail.byDay ?? []).length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]"><tr><th className="px-3 py-2 text-left font-semibold">날짜(KST)</th><th className="px-3 py-2 text-right font-semibold">조회</th><th className="px-3 py-2 text-right font-semibold">순 방문</th><th className="px-3 py-2 text-right font-semibold">전환</th><th className="px-3 py-2 text-right font-semibold">전환율</th></tr></thead>
                          <tbody>
                            {(detail.byDay ?? []).map((d) => (
                              <tr key={d.d} className="border-t border-[var(--border)]">
                                <td className="px-3 py-2 tabular-nums">{d.d}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{num(d.views)}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-[var(--text-soft)]">{num(d.uniq)}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-[#059669]">{num(d.conversions)}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-[#6d28d9]">{d.views > 0 ? Math.round((d.conversions / d.views) * 1000) / 10 : 0}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {(detail.linkedAds ?? []).length > 0 && (
                      <div className="text-xs text-[var(--text-dim)]">이 랜딩을 CTA로 쓰는 광고(알림): {(detail.linkedAds ?? []).map((a) => a.title).join(', ')}</div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </MktPanel>
        </Reveal>

        {/* 요약 */}
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MktStat label="랜딩페이지" value={num(t?.landings ?? 0)} icon={BarChart3} accent="#2563eb" />
            <MktStat label="랜딩 총 조회수" value={num(t?.landingViews ?? 0)} icon={Eye} accent="#0ea5e9" />
            <MktStat label="랜딩 총 전환" value={num(t?.landingConversions ?? 0)} icon={Target} accent="#22c55e" />
            <MktStat label="광고(알림) 클릭" value={num(t?.adClicks ?? 0)} icon={MousePointerClick} accent="#8b5cf6" />
          </div>
        </Reveal>

        {/* 랜딩 성과 목록 */}
        <Reveal>
          <MktPanel icon={BarChart3} title={<>랜딩페이지 성과 <span className="text-xs font-normal text-[var(--text-dim)]">(조회수·전환율)</span></>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className={THEAD}>
                    <th className={TH}>랜딩페이지</th>
                    <th className={cn(TH, 'text-right')}>조회수</th>
                    <th className={cn(TH, 'text-right')}>순 방문</th>
                    <th className={cn(TH, 'text-right')}>전환(신청)</th>
                    <th className={cn(TH, 'text-right')}>전환율</th>
                    <th className={TH}>생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {landings.length === 0 ? (
                    <tr><td colSpan={6} className={cn(TD, 'py-8 text-center text-[var(--text-dim)]')}>랜딩페이지가 없습니다.</td></tr>
                  ) : landings.map((l) => (
                    <tr key={l.id} className={cn(TR, 'cursor-pointer')} onClick={() => analyze(l.url)}>
                      <td className={TD}>
                        <div className="font-semibold">{l.title || l.slug}</div>
                        <div className="font-mono text-[11px] text-[var(--text-dim)]">{l.url}</div>
                      </td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{num(l.views)}</td>
                      <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(l.uniqueVisitors)}</td>
                      <td className={cn(TD, 'text-right tabular-nums text-[#059669]')}>{num(l.conversions)}</td>
                      <td className={cn(TD, 'text-right font-semibold tabular-nums text-[#6d28d9]')}>{pct(l.rate)}</td>
                      <td className={cn(TD, 'text-xs text-[var(--text-soft)]')}>{kstDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MktPanel>
        </Reveal>

        {/* 알림 광고 성과 */}
        <Reveal>
          <MktPanel icon={Megaphone} title={<>알림 광고 성과 <span className="text-xs font-normal text-[var(--text-dim)]">(CTA가 우리 랜딩인 알림 = 자동 광고 등록)</span></>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className={THEAD}>
                    <th className={TH}>광고(알림)</th>
                    <th className={TH}>연결 랜딩</th>
                    <th className={cn(TH, 'text-right')}>노출</th>
                    <th className={cn(TH, 'text-right')}>읽음</th>
                    <th className={cn(TH, 'text-right')}>클릭</th>
                    <th className={cn(TH, 'text-right')}>CTR</th>
                    <th className={cn(TH, 'text-right')}>랜딩 전환</th>
                    <th className={cn(TH, 'text-right')}>전환율</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.length === 0 ? (
                    <tr><td colSpan={8} className={cn(TD, 'py-8 text-center text-[var(--text-dim)]')}>CTA가 우리 랜딩인 알림이 아직 없습니다. 알림 발송 시 CTA URL에 <b>/f/…</b> 랜딩 주소를 넣으면 자동으로 광고로 등록됩니다.</td></tr>
                  ) : ads.map((a) => (
                    <tr key={a.campaignId} className={TR}>
                      <td className={TD}>
                        <div className="flex items-center gap-1.5 font-semibold"><Bell size={12} className="text-[#6d28d9]" /> {a.title}</div>
                        <div className="text-[11px] text-[var(--text-dim)]">{a.target === 'visitors' ? '접속 전체' : a.target === 'all' ? '전체 회원' : a.target === 'plan' ? '요금제별' : a.target}</div>
                      </td>
                      <td className={TD}>
                        {a.isOurLanding
                          ? <a href={a.landingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-[#6d28d9] hover:underline"><Link2 size={11} /> {a.landingUrl}</a>
                          : <span className="text-[11px] text-[var(--text-dim)]">외부/미등록</span>}
                      </td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{num(a.impressions)}</td>
                      <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(a.reads)}</td>
                      <td className={cn(TD, 'text-right tabular-nums text-[#6d28d9]')}>{a.clicks == null ? '-' : num(a.clicks)}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{pct(a.ctr)}</td>
                      <td className={cn(TD, 'text-right tabular-nums text-[#059669]')}>{num(a.landingConversions)}</td>
                      <td className={cn(TD, 'text-right font-semibold tabular-nums text-[#6d28d9]')}>{pct(a.landingRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[var(--text-dim)]">노출·읽음·클릭은 접속 전체(방문자) 알림에서 정밀 측정됩니다. 회원 대상 알림은 클릭이 별도 집계되지 않아 “-”로 표시됩니다. 랜딩 전환율 = 신청 수 / 랜딩 조회수.</p>
          </MktPanel>
        </Reveal>
      </div>
    </MktCanvas>
  )
}
