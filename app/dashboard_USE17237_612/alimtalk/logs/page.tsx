'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Send, Check, X, MessageCircle, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { formatNumber } from '@/lib/utils'
import { alimtalkLogs, type MsgLogStats, type AlimtalkLogRow, type MsgTrendPoint } from '@/lib/auth'

const ACCENT = '#f59e0b'
const PALETTE = ['#f59e0b', '#22c55e', '#0ea5e9', '#7c3aed', '#ec4899', '#94a3b8']

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
function mdLabel(d: string) { const p = String(d || '').split('-'); return p.length === 3 ? `${p[1]}/${p[2]}` : d }

export default function AlimtalkLogsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MsgLogStats | null>(null)
  const [trend, setTrend] = useState<MsgTrendPoint[]>([])
  const [logs, setLogs] = useState<AlimtalkLogRow[]>([])

  useEffect(() => {
    let alive = true
    alimtalkLogs().then((d) => {
      if (!alive) return
      if (d.ok) { setStats(d.stats || null); setTrend(d.trend || []); setLogs(d.logs || []) }
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const trendData = useMemo(() => trend.map((t) => ({ name: mdLabel(t.date), 발송: t.requested, 성공: t.sent })), [trend])

  // 템플릿별 발송 집계 (실데이터)
  const byTemplate = useMemo(() => {
    const m = new Map<string, { sent: number; recipients: number; failed: number }>()
    for (const r of logs) {
      const k = r.templateId || '(템플릿 미지정)'
      const cur = m.get(k) || { sent: 0, recipients: 0, failed: 0 }
      cur.sent += r.sent; cur.recipients += r.recipients; cur.failed += r.failed
      m.set(k, cur)
    }
    return Array.from(m.entries()).map(([template, v]) => ({
      template, ...v, rate: v.recipients > 0 ? Math.round((v.sent / v.recipients) * 1000) / 10 : 0,
    })).sort((a, b) => b.recipients - a.recipients)
  }, [logs])

  const donut = useMemo(() => byTemplate.slice(0, 6).map((t, i) => ({ name: t.template, value: t.recipients, color: PALETTE[i % PALETTE.length] })), [byTemplate])
  const hasData = (stats?.batches || 0) > 0

  return (
    <div className="animate-fade-in">
      <PageHeader icon={BarChart3} eyebrow="카카오 알림톡" title="발송 통계" desc="알림톡 발송 성과와 템플릿별 발송 지표를 분석합니다." accent={ACCENT} />

      <div className="space-y-5 p-5 lg:p-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="총 발송" icon={Send} accent={ACCENT} value={formatNumber(stats?.recipients || 0)} sub={`발송 배치 ${formatNumber(stats?.batches || 0)}건`} />
          <Metric label="성공" icon={Check} accent="#22c55e" value={formatNumber(stats?.sent || 0)} sub="수신처 기준" />
          <Metric label="실패" icon={X} accent="#ef4444" value={formatNumber(stats?.failed || 0)} sub={stats?.failed ? '템플릿 승인 상태를 확인하세요' : '실패 건이 없습니다'} />
          <Metric
            label="성공률"
            icon={MessageCircle}
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
              title="아직 알림톡 발송 이력이 없습니다"
              hint="승인된 템플릿으로 알림톡을 발송하면 추이와 템플릿별 성과가 이곳에 쌓입니다."
              action={
                <a href="/dashboard_USE17237_612/alimtalk/templates" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]">
                  템플릿 먼저 등록하기
                </a>
              }
            />
          </Card>
        ) : (
          <>
            <Card title="발송 추이 (최근 7일)" desc="요청 대비 실제 성공 건수">
              <AreaTrend data={trendData} keys={['발송', '성공']} colors={[ACCENT, '#22c55e']} />
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <Card title="템플릿별 성과" desc="수신 건수 기준">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                        <th className="px-5 py-2.5 font-semibold">템플릿 코드</th>
                        <th className="px-5 py-2.5 font-semibold">발송수</th>
                        <th className="px-5 py-2.5 font-semibold">성공</th>
                        <th className="px-5 py-2.5 font-semibold">실패</th>
                        <th className="px-5 py-2.5 font-semibold">성공률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byTemplate.map((r) => (
                        <tr key={r.template} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-2)]">
                          <td className="max-w-[240px] truncate px-3 py-3 font-medium" title={r.template}>{r.template}</td>
                          <td className="px-5 py-3 text-[var(--text-soft)]">{formatNumber(r.recipients)}</td>
                          <td className="px-5 py-3 font-semibold text-emerald-600">{formatNumber(r.sent)}</td>
                          <td className="px-5 py-3 text-rose-500">{r.failed ? formatNumber(r.failed) : '—'}</td>
                          <td className="px-5 py-3 font-semibold text-sky-600">{r.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="템플릿별 발송 비중">
                <Donut data={donut} />
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {donut.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                      <span className="truncate text-[var(--text-soft)]" title={d.name}>{d.name}</span>
                      <span className="ml-auto font-semibold">{formatNumber(d.value)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="최근 발송 이력" desc={logs.length ? `${logs.length}건` : undefined} bodyClassName="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                      <th className="px-5 py-2.5 font-semibold">발송일시</th>
                      <th className="px-5 py-2.5 font-semibold">템플릿 코드</th>
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
                        <td className="max-w-[160px] truncate px-3 py-3 text-[var(--text-soft)]" title={r.templateId}>{r.templateId || '—'}</td>
                        <td className="max-w-[260px] truncate px-3 py-3 text-[var(--text-soft)]" title={r.text}>{r.text || '—'}</td>
                        <td className="px-5 py-3 font-medium">{formatNumber(r.recipients)}</td>
                        <td className="px-5 py-3 text-emerald-600">{r.sent ? formatNumber(r.sent) : '—'}</td>
                        <td className="px-5 py-3 text-rose-500">{r.failed ? formatNumber(r.failed) : '—'}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-dim)]">발송 이력이 없습니다.</td></tr>}
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
