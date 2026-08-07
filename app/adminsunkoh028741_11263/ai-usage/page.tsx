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
  RotateCcw,
  AlertTriangle,
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
  /* 제공사 청구서는 "최근 N일" 이 아니라 청구 기간(예: 7/1~7/31)으로 끊겨 나온다.
     그 기간을 그대로 넣어야 청구서 한 줄과 우리 합계를 맞대 볼 수 있다. */
  const [range, setRange] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [data, setData] = useState<AiUsageStats>({ ok: false })
  const [loading, setLoading] = useState(true)

  function reload(d: DayOption = days, r: { from: string; to: string } = range) {
    setLoading(true)
    adminAiUsage(d, r.from || r.to ? r : undefined).then((res) => {
      setData(res)
      setLoading(false)
    })
  }
  useEffect(() => {
    reload(days, range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, range])

  const t = data.totals
  const byUser = data.byUser ?? []
  const byModel = data.byModel ?? []
  const byProvider = data.byProvider ?? []
  const recent = data.recent ?? []
  const hasData = !!t && (t.count > 0 || byUser.length > 0)

  const marginPct = useMemo(() => {
    if (!t || t.revenue <= 0) return 0
    return Math.round((t.profit / t.revenue) * 100)
  }, [t])
  const refundedCount = t?.refundedCount ?? 0
  const openCount = data.open?.count ?? 0

  function exportUsers() {
    downloadCsv(
      `AI정산_회원별_${days}일.csv`,
      ['회원', '이메일', '생성건수', '사용 모델', 'AI 비용(원)', '매출(원)', '순이익(원)', '차감 크레딧', '실패환불 건수', '실패환불 크레딧'],
      byUser.map((u) => [
        u.name || u.user_id || '게스트',
        u.email || '',
        u.count,
        u.models || '',
        Math.round(u.cost),
        Math.round(u.revenue),
        Math.round(u.profit),
        u.credits,
        u.refundedCount ?? 0,
        u.refundedCredits ?? 0,
      ]),
    )
  }
  function exportRecent() {
    downloadCsv(
      `AI정산_상세내역_${days}일.csv`,
      ['시각', '회원', '이메일', '모델', '제공사', '종류', 'AI 비용(원)', '매출(원)', '순이익(원)', '배수', '크레딧', '상태'],
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
        r.refunded ? '실패·환불(합계 제외)' : '정상',
      ]),
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Wallet}
        eyebrow="ADMIN · 정산"
        title="AI 사용 · 수익 정산"
        desc={`스튜디오 AI 생성의 실제 비용·매출·순이익을 자동 계산합니다. (판매가 = AI 원가 × 3배 · 씨댄스2.0/이미지 2.5배 · 50원=1크레딧${data.todayRate ? ` · 오늘 환율 $1=₩${Math.round(data.todayRate).toLocaleString('ko-KR')}` : ''})`}
        accent={ACCENT}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => { setRange({ from: '', to: '' }); setDays(d) }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200',
                    days === d && !range.from && !range.to
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

        {/* ── 돈이 나갔는데 결과물이 없는 자리 ──
            위 네 칸은 "성공한 생성" 만 센다. 실패해서 돌려준 건과, 아직 성공도 실패도
            확인되지 않은 채 빠져 있는 건은 여기 따로 적는다 — 합계에 섞으면 실패한 생성이
            번 돈으로 보이고, 안 적으면 있는지조차 모른다. */}
        {(refundedCount > 0 || openCount > 0) && (
          <Reveal>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <RotateCcw size={15} /> 실패 · 환불 {num(refundedCount)}건
                </div>
                <p className="mt-1 text-xs text-amber-700/80">
                  제공사가 실패로 끝내 <b>{num(t?.refundedCredits ?? 0)}크레딧</b>(약 {krw(t?.refundedKrw ?? 0)})을 회원에게 돌려준 건입니다.
                  위 매출·순이익·생성 건수에는 <b>들어 있지 않습니다</b>. 상세 내역에서 &lsquo;실패·환불&rsquo; 표시로 확인할 수 있습니다.
                </p>
              </div>
              <div className={cn(
                'rounded-2xl border p-4',
                openCount > 0 ? 'border-rose-200 bg-rose-50/60' : 'border-[var(--border)] bg-[var(--panel-2)]',
              )}>
                <div className={cn('flex items-center gap-2 text-sm font-semibold', openCount > 0 ? 'text-rose-700' : 'text-[var(--text-soft)]')}>
                  <AlertTriangle size={15} /> 결말 없는 차감 {num(openCount)}건
                </div>
                <p className={cn('mt-1 text-xs', openCount > 0 ? 'text-rose-700/80' : 'text-[var(--text-dim)]')}>
                  제출 시 <b>{num(data.open?.credits ?? 0)}크레딧</b>이 빠졌는데 1시간이 지나도록 성공·실패가 확인되지 않은 건입니다.
                  매시 35분에 도는 자동 회수(<code>/api/cron/gen-sweep</code>)가 제공사에 직접 물어보고, 실패면 그 자리에서 되돌립니다.
                  이 숫자가 줄지 않으면 회수가 안 돌고 있다는 뜻입니다.
                </p>
              </div>
            </div>
          </Reveal>
        )}

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
                        <th className={cn(TH, 'text-right')}>실패 환불</th>
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
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-dim)]')}>
                            {u.refundedCount ? (
                              <span className="text-amber-600">{num(u.refundedCount)}건 · {num(u.refundedCredits ?? 0)}C</span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </Reveal>

            {/* 제공사 청구서 대조 */}
            <Reveal>
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <Server size={16} className="text-violet-500" /> 제공사 청구서 대조
                  </span>
                }
              >
                <p className="mb-4 text-sm text-[var(--text-soft)]">
                  제공사 청구서와 같은 기간·같은 단위(USD)로 우리가 계산한 실비입니다.
                  청구서 금액과 벌어지면 그 제공사 단가표가 틀렸다는 뜻입니다.
                  <br />
                  실패로 확정돼 환불한 건은 빠져 있습니다 — 실패한 작업은 제공사도 대개 청구하지 않아,
                  넣어 두면 우리 계산이 늘 청구서보다 크게 나옵니다.
                </p>
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-[var(--text-soft)]">청구 기간</span>
                  <input
                    type="date"
                    value={range.from}
                    onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                    className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5"
                  />
                  <span className="text-[var(--text-dim)]">~</span>
                  <input
                    type="date"
                    value={range.to}
                    onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                    className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5"
                  />
                  {(range.from || range.to) && (
                    <Button variant="outline" size="sm" onClick={() => setRange({ from: '', to: '' })}>
                      기간 해제
                    </Button>
                  )}
                  <span className="text-xs text-[var(--text-dim)]">
                    {data.from ? `조회: ${data.from}${data.to ? ` ~ ${data.to}` : ' 이후'}` : ''}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className={THEAD}>
                        <th className={TH}>제공사</th>
                        <th className={cn(TH, 'text-right')}>생성</th>
                        <th className={cn(TH, 'text-right')}>우리 계산 실비(USD)</th>
                        <th className={cn(TH, 'text-right')}>실비(원)</th>
                        <th className={cn(TH, 'text-right')}>매출</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byProvider.map((p) => (
                        <tr key={p.provider} className={TR}>
                          <td className={cn(TD, 'font-medium')}>{p.provider}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{num(p.count)}</td>
                          <td className={cn(TD, 'text-right font-semibold tabular-nums')}>${p.usd.toFixed(4)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-rose-500')}>{krw(p.cost)}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{krw(p.revenue)}</td>
                        </tr>
                      ))}
                      {byProvider.length === 0 && (
                        <tr>
                          <td className={cn(TD, 'text-center text-[var(--text-dim)]')} colSpan={5}>
                            이 기간에 생성 기록이 없습니다.
                          </td>
                        </tr>
                      )}
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

            {/* 일별 환율·정산 */}
            <Reveal>
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-violet-500" /> 일별 환율·정산 (KST)
                  </span>
                }
              >
                <p className="mb-3 text-xs text-[var(--text-dim)]">
                  각 날짜에 실제 적용된 환율($1=₩)과 그날의 생성·비용·매출입니다. 환율은 생성 시점의 실시간 환율이 건별로 저장되어 자동 반영됩니다.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className={THEAD}>
                        <th className={TH}>날짜</th>
                        <th className={cn(TH, 'text-right')}>환율 ($1=₩)</th>
                        <th className={cn(TH, 'text-right')}>생성</th>
                        <th className={cn(TH, 'text-right')}>크레딧</th>
                        <th className={cn(TH, 'text-right')}>AI 비용</th>
                        <th className={cn(TH, 'text-right')}>매출</th>
                        <th className={cn(TH, 'text-right')}>순이익</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.byDay ?? []).map((d) => (
                        <tr key={d.d} className={TR}>
                          <td className={cn(TD, 'font-medium tabular-nums')}>{d.d}</td>
                          <td className={cn(TD, 'text-right tabular-nums font-semibold text-violet-500')}>
                            ₩{num(d.rate)}
                            {d.rateMin !== d.rateMax && (
                              <span className="ml-1 text-[11px] font-normal text-[var(--text-dim)]">({num(d.rateMin)}~{num(d.rateMax)})</span>
                            )}
                          </td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{num(d.count)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(d.credits)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-rose-500')}>{krw(d.cost)}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{krw(d.revenue)}</td>
                          <td className={cn(TD, 'text-right font-semibold tabular-nums text-emerald-600')}>{krw(d.profit)}</td>
                        </tr>
                      ))}
                      {(data.byDay ?? []).length === 0 && (
                        <tr><td colSpan={7} className={cn(TD, 'py-6 text-center text-[var(--text-dim)]')}>아직 생성 내역이 없습니다.</td></tr>
                      )}
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
                        <tr key={i} className={cn(TR, r.refunded && 'bg-amber-50/50')}>
                          <td className={cn(TD, 'text-[var(--text-soft)]')}>{fmtDateTime(r.created_at)}</td>
                          <td className={TD}>
                            <div className="text-xs font-medium">{r.name || '게스트'}</div>
                            <div className="text-[11px] text-[var(--text-dim)]">{r.email}</div>
                          </td>
                          <td className={cn(TD, 'max-w-[200px] truncate')} title={r.model}>
                            {r.model}
                            {r.refunded && (
                              <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                실패·환불
                              </span>
                            )}
                          </td>
                          <td className={cn(TD, 'text-xs text-[var(--text-soft)]')}>{r.kind === 'image' ? '이미지' : '영상'}</td>
                          {/* 환불 건은 위 합계에 안 들어간다 — 금액을 그대로 보여 주되 지워진 값임을 표시한다 */}
                          <td className={cn(TD, 'text-right tabular-nums text-rose-500', r.refunded && 'text-[var(--text-dim)] line-through')}>{krw(r.cost)}</td>
                          <td className={cn(TD, 'text-right tabular-nums', r.refunded && 'text-[var(--text-dim)] line-through')}>{krw(r.revenue)}</td>
                          <td className={cn(TD, 'text-right font-semibold tabular-nums text-emerald-600', r.refunded && 'font-normal text-[var(--text-dim)] line-through')}>{krw(r.profit)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]', r.refunded && 'text-[var(--text-dim)] line-through')}>{num(r.credits)}</td>
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
