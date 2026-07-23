'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Send, Check, X, TrendingUp, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { StatCard, Panel, Badge } from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import { smsLogs, type MsgLogStats, type SmsLogRow, type MsgTrendPoint } from '@/lib/auth'

const ACCENT = '#6366f1'

const typeColor: Record<string, string> = {
  SMS: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  LMS: 'border-sky-200 bg-sky-500/12 text-sky-700',
  MMS: 'border-amber-200 bg-amber-500/12 text-amber-700',
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
function mdLabel(d: string) { const p = String(d || '').split('-'); return p.length === 3 ? `${p[1]}/${p[2]}` : d }

export default function SmsLogsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MsgLogStats | null>(null)
  const [byType, setByType] = useState<{ type: string; count: number }[]>([])
  const [trend, setTrend] = useState<MsgTrendPoint[]>([])
  const [logs, setLogs] = useState<SmsLogRow[]>([])

  useEffect(() => {
    let alive = true
    smsLogs().then((d) => {
      if (!alive) return
      if (d.ok) { setStats(d.stats || null); setByType(d.byType || []); setTrend(d.trend || []); setLogs(d.logs || []) }
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const trendData = useMemo(() => trend.map((t) => ({ name: mdLabel(t.date), 발송: t.requested, 성공: t.sent })), [trend])
  const successRatio = useMemo(() => [
    { name: '성공', value: stats?.sent || 0, color: '#22c55e' },
    { name: '실패', value: stats?.failed || 0, color: '#ef4444' },
  ], [stats])
  const typeRatio = useMemo(() => {
    const palette: Record<string, string> = { SMS: '#6366f1', LMS: '#0ea5e9', MMS: '#f59e0b' }
    return byType.filter((t) => t.count > 0).map((t) => ({ name: t.type, value: t.count, color: palette[t.type] || '#94a3b8' }))
  }, [byType])

  const hasData = (stats?.batches || 0) > 0

  return (
    <div className="animate-fade-in">
      <PageHeader icon={BarChart3} eyebrow="문자 (SMS)" title="발송 이력·통계" desc="문자 발송 성과와 성공/실패 이력을 한눈에 확인합니다." accent={ACCENT} />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 발송" value={formatNumber(stats?.recipients || 0)} icon={Send} accent={ACCENT} />
          <StatCard label="성공" value={formatNumber(stats?.sent || 0)} icon={Check} accent="#22c55e" />
          <StatCard label="실패" value={formatNumber(stats?.failed || 0)} icon={X} accent="#ef4444" />
          <StatCard label="성공률" value={`${stats?.successRate ?? 0}%`} icon={TrendingUp} accent="#0ea5e9" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-[var(--text-dim)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" />불러오는 중...</div>
        ) : !hasData ? (
          <Panel title="발송 추이 (최근 7일)">
            <div className="py-16 text-center text-sm text-[var(--text-dim)]">아직 문자 발송 이력이 없습니다. 문자를 발송하면 이곳에 실제 통계가 표시됩니다.</div>
          </Panel>
        ) : (
          <>
            <Panel title="발송 추이 (최근 7일)">
              <AreaTrend data={trendData} keys={['발송', '성공']} colors={['#6366f1', '#22c55e']} height={280} />
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="성공/실패 비율">
                <Donut data={successRatio} />
                <div className="mt-3 flex justify-center gap-4">
                  {successRatio.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-[var(--text-soft)]">{d.name}</span>
                      <span className="font-semibold">{formatNumber(d.value)}</span>
                    </span>
                  ))}
                </div>
              </Panel>

              <Panel title="발송 유형 비중">
                {typeRatio.length ? (
                  <>
                    <Donut data={typeRatio} />
                    <div className="mt-3 flex flex-wrap justify-center gap-4">
                      {typeRatio.map((d) => (
                        <span key={d.name} className="flex items-center gap-1.5 text-sm">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-[var(--text-soft)]">{d.name}</span>
                          <span className="font-semibold">{formatNumber(d.value)}</span>
                        </span>
                      ))}
                    </div>
                  </>
                ) : <div className="py-12 text-center text-sm text-[var(--text-dim)]">데이터 없음</div>}
              </Panel>
            </div>

            <Panel title="발송 이력">
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                      <th className="px-3 py-2.5 font-medium">발송일시</th>
                      <th className="px-3 py-2.5 font-medium">유형</th>
                      <th className="px-3 py-2.5 font-medium">내용</th>
                      <th className="px-3 py-2.5 font-medium">수신건수</th>
                      <th className="px-3 py-2.5 font-medium">성공</th>
                      <th className="px-3 py-2.5 font-medium">실패</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border-soft)] hover:bg-[var(--panel-2)]">
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--text-soft)]">{fmtDate(r.createdAt)}</td>
                        <td className="px-3 py-3"><Badge className={typeColor[r.type] || typeColor.SMS}>{r.type}</Badge></td>
                        <td className="max-w-[280px] truncate px-3 py-3 text-[var(--text-soft)]" title={r.text}>{r.text || '—'}</td>
                        <td className="px-3 py-3 font-medium">{formatNumber(r.recipients)}</td>
                        <td className="px-3 py-3 text-emerald-600">{r.sent ? formatNumber(r.sent) : '—'}</td>
                        <td className="px-3 py-3 text-rose-500">{r.failed ? formatNumber(r.failed) : '—'}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-dim)]">발송 이력이 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}
