'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  RefreshCw,
  Download,
  TrendingUp,
  Coins,
  Server,
  Sparkles,
  Film,
  Image as ImageIcon,
  User,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminAiUsage, type AiUsageStats } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'
const DAY_OPTIONS = [7, 30, 90, 365] as const
type DayOption = (typeof DAY_OPTIONS)[number]

const krw = (n: number) => '₩' + Math.round(n || 0).toLocaleString('ko-KR')
const num = (n: number) => (n || 0).toLocaleString('ko-KR')

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** CSV(UTF-8 BOM) 다운로드 — Excel 에서 한글 정상 표시 */
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const THEAD = 'border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]'
const TH = 'px-3 py-2.5 font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 whitespace-nowrap'
const TR = 'border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50'

export default function AdminAiUsagePage() {
  const [days, setDays] = useState<DayOption>(30)
  const [data, setData] = useState<AiUsageStats>({ ok: false })
  const [loading, setLoading] = useState(true)

  function reload(d: DayOption = days) {
    setLoading(true)
    adminAiUsage(d).then((r) => {
      setData(r)
      setLoading(false)
    })
  }
  useEffect(() => {
    reload(days)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  const t = data.totals
  const byUser = data.byUser ?? []
  const byModel = data.byModel ?? []
  const recent = data.recent ?? []
  const hasData = !!t && (t.count > 0 || byUser.length > 0)

  const marginPct = useMemo(() => {
    if (!t || t.revenue <= 0) return 0
    return Math.round((t.profit / t.revenue) * 100)
  }, [t])

  function exportUsers() {
    downloadCsv(
      `AI정산_회원별_${days}일.csv`,
      ['회원', '이메일', '생성건수', '사용 모델', 'AI 비용(원)', '매출(원)', '순이익(원)', '차감 크레딧'],
      byUser.map((u) => [
        u.name || u.user_id || '게스트',
        u.email || '',
        u.count,
        u.models || '',
        Math.round(u.cost),
        Math.round(u.revenue),
        Math.round(u.profit),
        u.credits,
      ]),
    )
  }
  function exportRecent() {
    downloadCsv(
      `AI정산_상세내역_${days}일.csv`,
      ['시각', '회원', '이메일', '모델', '제공사', '종류', 'AI 비용(원)', '매출(원)', '순이익(원)', '배수', '크레딧'],
      recent.map((r) => [
        fmtDateTime(r.created_at),
        r.name || '게스트',
        r.email || '',
        r.model,
        r.provider,
        r.kind === 'image' ? '이미지' : '영상',
        Math.round(r.cost),
        Math.round(r.revenue),
        Math.round(r.profit),
        r.markup ? `${r.markup}x` : '',
        r.credits,
      ]),
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Wallet}
        eyebrow="ADMIN · 정산"
        title="AI 사용 · 수익 정산"
        desc="스튜디오 AI 생성의 실제 비용·매출·순이익을 자동 계산합니다. (판매가 = AI 원가 × 3배 · 씨댄스2.0/이미지 2.5배 · 50원=1크레딧)"
        accent={ACCENT}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200',
                    days === d
                      ? 'brand-gradient text-white shadow-md shadow-violet-500/25'
                      : 'text-[var(--text-soft)] hover:bg-white hover:text-[var(--text)]',
                  )}
                >
                  {d === 365 ? '1년' : `${d}일`}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
            </Button>
            <Button size="sm" onClick={exportUsers} disabled={byUser.length === 0}>
              <Download size={15} /> 엑셀(회원별)
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* 요약 */}
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="총 매출 (크레딧 판매)" value={krw(t?.revenue ?? 0)} icon={Coins} accent="#7c3aed" />
            <StatCard label="총 AI 비용 (원가)" value={krw(t?.cost ?? 0)} icon={Server} accent="#ef4444" />
            <StatCard label="순이익" value={krw(t?.profit ?? 0)} delta={marginPct} icon={TrendingUp} accent="#22c55e" />
            <StatCard label="생성 건수" value={num(t?.count ?? 0)} icon={Sparkles} accent="#0ea5e9" />
          </div>
        </Reveal>

        {loading && !hasData ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw size={28} className="animate-spin text-violet-400" />
              <p className="mt-4 text-sm text-[var(--text-dim)]">정산 데이터를 불러오는 중…</p>
            </div>
          </Panel>
        ) : !hasData ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-400">
                <Wallet size={26} />
              </span>
              <p className="mt-4 font-semibold">아직 AI 생성 사용 내역이 없습니다.</p>
              <p className="mt-1 text-sm text-[var(--text-dim)]">스튜디오에서 생성이 발생하면 사용자별로 집계됩니다.</p>
            </div>
          </Panel>
        ) : (
          <>
            {/* 회원별 정산 */}
            <Reveal>
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <User size={16} className="text-violet-500" /> 회원별 정산
                  </span>
                }
                action={
                  <button
                    onClick={exportUsers}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-violet-300 hover:text-violet-600"
                  >
                    <Download size={13} /> 엑셀 다운로드
                  </button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className={THEAD}>
                        <th className={TH}>회원</th>
                        <th className={cn(TH, 'text-right')}>생성</th>
                        <th className={TH}>사용 모델</th>
                        <th className={cn(TH, 'text-right')}>AI 비용</th>
                        <th className={cn(TH, 'text-right')}>매출</th>
                        <th className={cn(TH, 'text-right')}>순이익</th>
                        <th className={cn(TH, 'text-right')}>크레딧</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byUser.map((u) => (
                        <tr key={u.user_id || u.email} className={TR}>
                          <td className={TD}>
                            <div className="font-semibold">{u.name || u.user_id || '게스트'}</div>
                            <div className="text-xs text-[var(--text-dim)]">{u.email}</div>
                          </td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{num(u.count)}</td>
                          <td className={cn(TD, 'max-w-[280px] truncate text-xs text-[var(--text-soft)]')} title={u.models}>
                            {u.models}
                          </td>
                          <td className={cn(TD, 'text-right tabular-nums text-rose-500')}>{krw(u.cost)}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{krw(u.revenue)}</td>
                          <td className={cn(TD, 'text-right font-semibold tabular-nums text-emerald-600')}>{krw(u.profit)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(u.credits)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </Reveal>

            {/* 모델별 정산 */}
            <Reveal>
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <Film size={16} className="text-violet-500" /> 모델별 정산
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className={THEAD}>
                        <th className={TH}>모델</th>
                        <th className={TH}>종류</th>
                        <th className={cn(TH, 'text-right')}>배수</th>
                        <th className={cn(TH, 'text-right')}>생성</th>
                        <th className={cn(TH, 'text-right')}>AI 비용</th>
                        <th className={cn(TH, 'text-right')}>매출</th>
                        <th className={cn(TH, 'text-right')}>순이익</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byModel.map((m) => (
                        <tr key={m.model} className={TR}>
                          <td className={cn(TD, 'font-medium')}>{m.model}</td>
                          <td className={TD}>
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-soft)]">
                              {m.kind === 'image' ? <ImageIcon size={13} /> : <Film size={13} />}
                              {m.kind === 'image' ? '이미지' : '영상'}
                            </span>
                          </td>
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{m.markup ? `${m.markup}x` : '-'}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{num(m.count)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-rose-500')}>{krw(m.cost)}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{krw(m.revenue)}</td>
                          <td className={cn(TD, 'text-right font-semibold tabular-nums text-emerald-600')}>{krw(m.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </Reveal>

            {/* 상세 내역 */}
            <Reveal>
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-500" /> 최근 상세 내역
                  </span>
                }
                action={
                  <button
                    onClick={exportRecent}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-violet-300 hover:text-violet-600"
                  >
                    <Download size={13} /> 엑셀 다운로드
                  </button>
                }
              >
                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full min-w-[880px] text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className={THEAD}>
                        <th className={TH}>시각</th>
                        <th className={TH}>회원</th>
                        <th className={TH}>모델</th>
                        <th className={TH}>종류</th>
                        <th className={cn(TH, 'text-right')}>AI 비용</th>
                        <th className={cn(TH, 'text-right')}>매출</th>
                        <th className={cn(TH, 'text-right')}>순이익</th>
                        <th className={cn(TH, 'text-right')}>크레딧</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((r, i) => (
                        <tr key={i} className={TR}>
                          <td className={cn(TD, 'text-[var(--text-soft)]')}>{fmtDateTime(r.created_at)}</td>
                          <td className={TD}>
                            <div className="text-xs font-medium">{r.name || '게스트'}</div>
                            <div className="text-[11px] text-[var(--text-dim)]">{r.email}</div>
                          </td>
                          <td className={cn(TD, 'max-w-[200px] truncate')} title={r.model}>{r.model}</td>
                          <td className={cn(TD, 'text-xs text-[var(--text-soft)]')}>{r.kind === 'image' ? '이미지' : '영상'}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-rose-500')}>{krw(r.cost)}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{krw(r.revenue)}</td>
                          <td className={cn(TD, 'text-right font-semibold tabular-nums text-emerald-600')}>{krw(r.profit)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(r.credits)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-[var(--text-dim)]">최근 {recent.length}건 표시 · 전체 회원별 합계는 위 표/엑셀에서 확인</p>
              </Panel>
            </Reveal>
          </>
        )}
      </div>
    </div>
  )
}
