'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Send, Check, X, TrendingUp, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { Badge } from '@/components/ui'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { formatNumber } from '@/lib/utils'
import { smsLogs, type MsgLogStats, type SmsLogRow, type MsgTrendPoint } from '@/lib/auth'

const ACCENT = '#6366f1'

const typeColor: Record<string, string> = {
  SMS: 'border-indigo-500/30 bg-indigo-500/12 text-indigo-400',
  LMS: 'border-sky-500/30 bg-sky-500/12 text-sky-400',
  MMS: 'border-amber-500/30 bg-amber-500/12 text-amber-400',
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

      <div className="space-y-5 p-5 lg:p-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="총 발송" icon={Send} accent={ACCENT} value={formatNumber(stats?.recipients || 0)} sub={`발송 배치 ${formatNumber(stats?.batches || 0)}건`} />
          <Metric label="성공" icon={Check} accent="#22c55e" value={formatNumber(stats?.sent || 0)} sub="수신처 기준" />
          <Metric label="실패" icon={X} accent="#ef4444" value={formatNumber(stats?.failed || 0)} sub={stats?.failed ? '번호·잔액을 확인하세요' : '실패 건이 없습니다'} />
          <Metric
            label="성공률"
            icon={TrendingUp}
            accent="#0ea5e9"
            value={`${stats?.successRate ?? 0}%`}
            sub={
              <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                <span className="block h-full rounded-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, stats?.successRate ?? 0)}%` }} />
              </span>
            }
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-[var(--text-dim)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" />불러오는 중...</div>
        ) : !hasData ? (
          <Card title="발송 추이 (최근 7일)">
            <EmptyState
              icon={Send}
              title="아직 문자 발송 이력이 없습니다"
              hint="문자를 발송하면 성공·실패 건수와 추이가 이곳에 실제 데이터로 쌓입니다."
              action={
                <a href="/dashboard_USE17237_612/sms" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]">
                  문자 발송하러 가기
                </a>
              }
            />
          </Card>
        ) : (
          <>
            <Card title="발송 추이 (최근 7일)" desc="요청 대비 실제 성공 건수">
              <AreaTrend data={trendData} keys={['발송', '성공']} colors={['#6366f1', '#22c55e']} height={280} />
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="성공/실패 비율">
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
              </Card>

              <Card title="발송 유형 비중" desc="SMS · LMS · MMS">
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
                ) : <EmptyState icon={BarChart3} title="유형 데이터가 없습니다" />}
              </Card>
            </div>

            <Card title="발송 이력" desc={logs.length ? `${logs.length}건` : undefined} bodyClassName="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                      <th className="px-5 py-2.5 font-semibold">발송일시</th>
                      <th className="px-5 py-2.5 font-semibold">유형</th>
                      <th className="px-5 py-2.5 font-semibold">내용</th>
                      <th className="px-5 py-2.5 font-semibold">수신건수</th>
                      <th className="px-5 py-2.5 font-semibold">성공</th>
                      <th className="px-5 py-2.5 font-semibold">실패</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-2)]">
                        <td className="whitespace-nowrap px-5 py-3 text-[var(--text-soft)]">{fmtDate(r.createdAt)}</td>
                        <td className="px-5 py-3"><Badge className={typeColor[r.type] || typeColor.SMS}>{r.type}</Badge></td>
                        <td className="max-w-[280px] truncate px-5 py-3 text-[var(--text-soft)]" title={r.text}>{r.text || '—'}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums">{formatNumber(r.recipients)}</td>
                        <td className="px-5 py-3 tabular-nums text-emerald-500">{r.sent ? formatNumber(r.sent) : '—'}</td>
                        <td className="px-5 py-3 tabular-nums text-rose-500">{r.failed ? formatNumber(r.failed) : '—'}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-[var(--text-dim)]">발송 이력이 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
