'use client'

import { useEffect, useMemo, useState } from 'react'
import { LineChart, RefreshCw, Eye, Users, Percent, FileText, TrendingUp, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { funnelAnalytics, type FunnelAnalytics } from '@/lib/auth'
import { cn } from '@/lib/utils'

const num = (n: number) => (n || 0).toLocaleString('ko-KR')
const kst = (iso?: string) => { if (!iso) return '-'; try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso } }
const mask = (p: string) => (p ? p.replace(/(\d{2,3})\d{3,4}(\d{4})/, '$1****$2') : '-')

export default function FunnelAnalyticsPage() {
  const [data, setData] = useState<FunnelAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(14)

  const load = (d = days) => { setLoading(true); funnelAnalytics(d).then((r) => { setData(r); setLoading(false) }) }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const t = data?.totals
  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily || []).map((d) => d.count)), [data])

  return (
    <div>
      <PageHeader icon={LineChart} eyebrow="ANALYTICS" title="퍼널 분석" desc="랜딩페이지별 조회수·신청수·전환율과 일별 신청 추이, 최근 신청자를 한눈에. 모든 시각은 한국시간(KST) 기준입니다." />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => { setDays(d); load(d) }} className={cn('rounded-lg border px-3 py-1.5 text-sm font-semibold', days === d ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50')}>{d}일</button>
          ))}
        </div>
        <button onClick={() => load()} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-soft)] hover:bg-slate-50"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침</button>
      </div>

      {/* KPI */}
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Kpi icon={FileText} label="랜딩페이지" value={num(t?.pages || 0)} />
        <Kpi icon={Eye} label="총 조회수" value={num(t?.views || 0)} />
        <Kpi icon={Users} label="총 신청수" value={num(t?.applicants || 0)} accent="text-emerald-600" />
        <Kpi icon={Percent} label="전환율" value={(t?.conv || 0) + '%'} accent="text-indigo-600" />
      </div>

      {/* 일별 추이 */}
      <Panel title={<span className="inline-flex items-center gap-2"><TrendingUp size={16} /> 일별 신청 추이 ({days}일)</span>} className="mb-4">
        <div className="flex h-44 items-stretch gap-1.5">
          {(data?.daily || []).map((d) => (
            <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end">
              <div className="mb-1 text-[10px] font-bold text-[var(--text-dim)] opacity-0 group-hover:opacity-100">{d.count}</div>
              <div className="w-full rounded-t bg-indigo-500 transition-all hover:bg-indigo-600" style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }} />
              <div className="mt-1 text-[9px] text-[var(--text-dim)]">{d.date.slice(5)}</div>
            </div>
          ))}
          {(!data?.daily || data.daily.length === 0) && <div className="w-full py-12 text-center text-sm text-[var(--text-dim)]">데이터가 없습니다.</div>}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        {/* 페이지별 성과 */}
        <Panel title="랜딩페이지별 성과">
          {(data?.pages || []).length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '랜딩페이지가 없습니다. 퍼널 빌더에서 먼저 만들어 보세요.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--text-dim)]"><tr className="border-b border-[var(--border)]">
                  <th className="px-2 py-2 text-left font-semibold">페이지</th><th className="px-2 py-2 text-left font-semibold">그룹</th>
                  <th className="px-2 py-2 text-right font-semibold">조회</th><th className="px-2 py-2 text-right font-semibold">신청</th>
                  <th className="px-2 py-2 text-right font-semibold">전환율</th><th className="px-2 py-2"></th>
                </tr></thead>
                <tbody>
                  {(data?.pages || []).map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)] hover:bg-slate-50">
                      <td className="px-2 py-2.5 font-semibold">{p.title}</td>
                      <td className="px-2 py-2.5 text-[var(--text-dim)]">{p.groupName}</td>
                      <td className="px-2 py-2.5 text-right">{num(p.views)}</td>
                      <td className="px-2 py-2.5 text-right font-bold text-emerald-600">{num(p.applicants)}</td>
                      <td className="px-2 py-2.5 text-right">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', p.conv >= 20 ? 'bg-emerald-50 text-emerald-700' : p.conv >= 5 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>{p.conv}%</span>
                      </td>
                      <td className="px-2 py-2.5 text-right"><a href={p.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-500"><ExternalLink size={14} /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(data?.byGroup || []).length > 1 && (
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <div className="mb-2 text-xs font-bold text-[var(--text-dim)]">퍼널 그룹별 집계</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(data?.byGroup || []).map((g) => (
                  <div key={g.name} className="rounded-lg border border-[var(--border)] p-2.5 text-xs">
                    <div className="font-bold">{g.name}</div>
                    <div className="mt-1 flex items-center gap-3 text-[var(--text-dim)]"><span>페이지 {g.pages}</span><span>조회 {num(g.views)}</span><span className="text-emerald-600">신청 {num(g.applicants)}</span><span className="ml-auto font-bold text-indigo-600">{g.conv}%</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* 최근 신청자 */}
        <Panel title="최근 신청자">
          {(data?.recent || []).length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--text-dim)]">아직 신청자가 없습니다.</div>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {(data?.recent || []).map((r, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{r.name || '(이름없음)'}</span>
                    <span className="text-[var(--text-dim)]">{kst(r.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[var(--text-dim)]">
                    {r.phone && <span>{mask(r.phone)}</span>}
                    {r.email && <span className="truncate">{r.email}</span>}
                  </div>
                  <div className="mt-0.5 text-[10px] text-indigo-500">{r.pageTitle}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, accent }: { icon: typeof Eye; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/60 p-4">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-500"><Icon size={20} /></span>
      <div><div className={cn('text-2xl font-extrabold leading-none', accent)}>{value}</div><div className="mt-1 text-xs font-semibold text-[var(--text-dim)]">{label}</div></div>
    </div>
  )
}
