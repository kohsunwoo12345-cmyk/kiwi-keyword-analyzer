'use client'

import { useState } from 'react'
import { BarChart3, Send, Check, X, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { StatCard, Panel, Badge } from '@/components/ui'
import { formatNumber } from '@/lib/utils'

const ACCENT = '#6366f1'

const trend = [
  { name: '7/06', 발송: 6200, 성공: 6080 },
  { name: '7/07', 발송: 7100, 성공: 6980 },
  { name: '7/08', 발송: 5400, 성공: 5310 },
  { name: '7/09', 발송: 8300, 성공: 8140 },
  { name: '7/10', 발송: 7600, 성공: 7480 },
  { name: '7/11', 발송: 6900, 성공: 6790 },
  { name: '7/12', 발송: 6700, 성공: 6560 },
]

const successRatio = [
  { name: '성공', value: 47340, color: '#22c55e' },
  { name: '실패', value: 860, color: '#ef4444' },
]

const typeRatio = [
  { name: 'SMS', value: 28400, color: '#6366f1' },
  { name: 'LMS', value: 16200, color: '#0ea5e9' },
  { name: 'MMS', value: 3600, color: '#f59e0b' },
]

type LogRow = {
  at: string
  type: 'SMS' | 'LMS'
  recv: number
  success: number
  fail: number
  status: '완료' | '발송중' | '예약'
}

const LOGS: LogRow[] = [
  { at: '2026-07-12 09:30', type: 'LMS', recv: 1240, success: 1218, fail: 22, status: '완료' },
  { at: '2026-07-12 11:00', type: 'SMS', recv: 3820, success: 0, fail: 0, status: '발송중' },
  { at: '2026-07-13 10:00', type: 'SMS', recv: 2160, success: 0, fail: 0, status: '예약' },
  { at: '2026-07-11 15:20', type: 'SMS', recv: 5480, success: 5390, fail: 90, status: '완료' },
  { at: '2026-07-11 09:00', type: 'LMS', recv: 940, success: 926, fail: 14, status: '완료' },
  { at: '2026-07-14 09:00', type: 'LMS', recv: 1240, success: 0, fail: 0, status: '예약' },
  { at: '2026-07-10 14:10', type: 'SMS', recv: 3200, success: 3148, fail: 52, status: '완료' },
]

const typeColor: Record<LogRow['type'], string> = {
  SMS: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  LMS: 'border-sky-200 bg-sky-50 text-sky-700',
}
const statusColor: Record<LogRow['status'], string> = {
  완료: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  발송중: 'border-amber-200 bg-amber-50 text-amber-700',
  예약: 'border-violet-200 bg-violet-50 text-violet-700',
}

const FILTERS = ['전체', '완료', '예약'] as const

export default function SmsLogsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체')

  const rows = filter === '전체' ? LOGS : LOGS.filter((r) => r.status === filter)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow="문자 (SMS)"
        title="발송 이력·통계"
        desc="문자 발송 성과와 성공/실패 이력을 한눈에 확인합니다."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 발송" value="48,200" icon={Send} accent={ACCENT} />
          <StatCard label="성공" value="47,340" icon={Check} accent="#22c55e" />
          <StatCard label="실패" value="860" icon={X} accent="#ef4444" />
          <StatCard label="성공률" value="98.2%" delta={0.4} icon={TrendingUp} accent="#0ea5e9" />
        </div>

        <Panel title="발송 추이 (최근 7일)">
          <AreaTrend data={trend} keys={['발송', '성공']} colors={['#6366f1', '#22c55e']} height={280} />
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
          </Panel>
        </div>

        <Panel
          title="발송 이력"
          action={
            <div className="flex gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f
                      ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                      : 'border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        >
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-3 py-2.5 font-medium">발송일시</th>
                  <th className="px-3 py-2.5 font-medium">유형</th>
                  <th className="px-3 py-2.5 font-medium">수신건수</th>
                  <th className="px-3 py-2.5 font-medium">성공</th>
                  <th className="px-3 py-2.5 font-medium">실패</th>
                  <th className="px-3 py-2.5 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                    <td className="px-3 py-3 text-[var(--text-soft)]">{r.at}</td>
                    <td className="px-3 py-3">
                      <Badge className={typeColor[r.type]}>{r.type}</Badge>
                    </td>
                    <td className="px-3 py-3 font-medium">{formatNumber(r.recv)}</td>
                    <td className="px-3 py-3 text-emerald-600">
                      {r.success ? formatNumber(r.success) : '—'}
                    </td>
                    <td className="px-3 py-3 text-rose-500">{r.fail ? formatNumber(r.fail) : '—'}</td>
                    <td className="px-3 py-3">
                      <Badge className={statusColor[r.status]}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-dim)]">
                      해당 상태의 이력이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
