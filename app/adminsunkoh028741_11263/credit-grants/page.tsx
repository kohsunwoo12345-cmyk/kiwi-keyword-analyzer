'use client'

import { useEffect, useState } from 'react'
import {
  Coins, RefreshCw, Download, Zap, Hand, Layers, User, Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminCreditGrants, type CreditGrantsStats } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

const ACCENT = '#2563eb'
const DAY_OPTIONS = [7, 30, 90, 365] as const
type DayOption = (typeof DAY_OPTIONS)[number]
const TYPE_OPTIONS: { key: 'all' | 'auto' | 'manual'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'auto', label: '자동 지급' },
  { key: 'manual', label: '수동 지급' },
]

const num = (n: number) => (n || 0).toLocaleString('ko-KR')
const cr = (n: number) => (Math.round((n || 0) * 10) / 10).toLocaleString('ko-KR')
// 모든 시간은 한국시간(KST) 고정
const fmtDateTime = (iso: string) => kstDateTime(iso)

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

const THEAD = 'border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]'
const TH = 'px-3 py-2.5 font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 whitespace-nowrap'
const TR = 'border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50'

function TypePill({ auto, category }: { auto: boolean; category: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
      auto ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600',
    )}>
      {auto ? <Zap size={11} /> : <Hand size={11} />}{category}
    </span>
  )
}

export default function AdminCreditGrantsPage() {
  const [days, setDays] = useState<DayOption>(90)
  const [type, setType] = useState<'all' | 'auto' | 'manual'>('all')
  const [data, setData] = useState<CreditGrantsStats>({ ok: false })
  const [loading, setLoading] = useState(true)

  function reload(d: DayOption = days, tp: 'all' | 'auto' | 'manual' = type) {
    setLoading(true)
    adminCreditGrants(d, tp).then((r) => { setData(r); setLoading(false) })
  }
  useEffect(() => {
    reload(days, type)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, type])

  const t = data.totals
  const rows = data.rows ?? []
  const byCategory = data.byCategory ?? []
  const hasData = !!t && (t.count > 0)

  function exportCsv() {
    downloadCsv(
      `크레딧지급내역_${type}_${days}일.csv`,
      ['시각', '구분', '분류', '회원', '이메일', '지급 크레딧', '지급 후 잔액', '메모'],
      rows.map((r) => [fmtDateTime(r.createdAt), r.auto ? '자동' : '수동', r.category, r.userName || r.userId, r.userEmail, r.amount, r.balanceAfter ?? '', r.memo]),
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Coins}
        eyebrow="ADMIN · 크레딧"
        title="크레딧 지급 내역"
        desc="플랜 시작 시 자동 지급된 크레딧과 관리자가 수동 지급한 크레딧을 모두 확인합니다. (플랜 가입 즉시 설정된 지급 크레딧이 자동 적립됩니다)"
        accent={ACCENT}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
              {TYPE_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setType(o.key)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200',
                    type === o.key ? 'text-white shadow-md' : 'text-[var(--text-soft)] hover:bg-white hover:text-[var(--text)]',
                  )}
                  style={type === o.key ? { background: ACCENT } : undefined}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200',
                    days === d ? 'text-white shadow-md' : 'text-[var(--text-soft)] hover:bg-white hover:text-[var(--text)]',
                  )}
                  style={days === d ? { background: ACCENT } : undefined}
                >
                  {d === 365 ? '1년' : `${d}일`}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download size={15} /> 엑셀
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={`총 지급 크레딧 (${days}일)`} value={cr(t?.total ?? 0)} icon={Coins} accent="#2563eb" />
            <StatCard label="자동 지급 (플랜·추천·이벤트)" value={cr(t?.autoTotal ?? 0)} icon={Zap} accent="#0ea5e9" />
            <StatCard label="수동 지급 (관리자·충전)" value={cr(t?.manualTotal ?? 0)} icon={Hand} accent="#f59e0b" />
            <StatCard label="지급 건수" value={num(t?.count ?? 0)} icon={Sparkles} accent="#22c55e" />
          </div>
        </Reveal>

        {/* 분류별 집계 */}
        <Reveal>
          <Panel title={<span className="flex items-center gap-2"><Layers size={16} className="text-blue-500" /> 분류별 지급 집계</span>}>
            {byCategory.length === 0 ? (
              <p className="py-4 text-sm text-[var(--text-dim)]">지급 내역이 없습니다.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byCategory.map((c) => (
                  <div key={c.category} className="rounded-xl border border-[var(--border-soft)] bg-[var(--panel-2)] p-3.5">
                    <div className="mb-1.5"><TypePill auto={c.auto} category={c.category} /></div>
                    <div className="text-lg font-bold tabular-nums">{cr(c.credits)} <span className="text-xs font-normal text-[var(--text-dim)]">크레딧</span></div>
                    <div className="text-xs text-[var(--text-dim)]">{num(c.count)}건</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>

        {loading && !hasData ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw size={28} className="animate-spin text-blue-400" />
              <p className="mt-4 text-sm text-[var(--text-dim)]">지급 내역을 불러오는 중…</p>
            </div>
          </Panel>
        ) : !hasData ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-400">
                <Coins size={26} />
              </span>
              <p className="mt-4 font-semibold">해당 기간에 크레딧 지급 내역이 없습니다.</p>
              <p className="mt-1 text-sm text-[var(--text-dim)]">플랜 가입·관리자 지급이 발생하면 여기에 자동으로 기록됩니다.</p>
            </div>
          </Panel>
        ) : (
          <Reveal>
            <Panel
              title={<span className="flex items-center gap-2"><User size={16} className="text-blue-500" /> 지급 상세 내역 <span className="text-xs font-normal text-[var(--text-dim)]">({num(rows.length)}건)</span></span>}
              action={
                <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-blue-300 hover:text-blue-600">
                  <Download size={13} /> 엑셀 다운로드
                </button>
              }
            >
              <div className="max-h-[620px] overflow-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className={THEAD}>
                      <th className={TH}>시각 (KST)</th>
                      <th className={TH}>구분</th>
                      <th className={TH}>회원</th>
                      <th className={cn(TH, 'text-right')}>지급 크레딧</th>
                      <th className={cn(TH, 'text-right')}>지급 후 잔액</th>
                      <th className={TH}>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className={TR}>
                        <td className={cn(TD, 'text-[var(--text-soft)]')}>{fmtDateTime(r.createdAt)}</td>
                        <td className={TD}><TypePill auto={r.auto} category={r.category} /></td>
                        <td className={TD}>
                          <div className="text-xs font-medium">{r.userName || r.userId || '게스트'}</div>
                          <div className="text-[11px] text-[var(--text-dim)]">{r.userEmail}</div>
                        </td>
                        <td className={cn(TD, 'text-right font-semibold tabular-nums text-emerald-600')}>+{cr(r.amount)}</td>
                        <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{r.balanceAfter == null ? '-' : cr(r.balanceAfter)}</td>
                        <td className={cn(TD, 'max-w-[320px] truncate text-xs text-[var(--text-soft)]')} title={r.memo}>{r.memo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">최근 {num(rows.length)}건 표시 · <b className="text-blue-500">자동</b>=플랜 가입·추천 리워드·이벤트, <b className="text-amber-500">수동</b>=관리자 직접 지급·크레딧 충전 승인</p>
            </Panel>
          </Reveal>
        )}
      </div>
    </div>
  )
}
