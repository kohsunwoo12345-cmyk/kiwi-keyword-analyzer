'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3, Users, Send, Wallet, MousePointerClick, Target, Loader2,
  CalendarRange, RefreshCw, TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { STATUS_TONE, crmSummary, kstToday, num, won, type CrmSummary } from '@/lib/crm'

const ACCENT = '#8b5cf6'

/** 그 달 1일 ~ 말일 */
function monthRange(y: number, m0: number) {
  const p = (n: number) => String(n).padStart(2, '0')
  const last = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()
  return { from: `${y}-${p(m0 + 1)}-01`, to: `${y}-${p(m0 + 1)}-${p(last)}` }
}

/**
 * 캠페인 결과.
 * 위쪽은 기간 합계, 아래 표는 집행별 성과. 한 줄을 누르면 그 집행의 상세
 * (수신자별 발송 결과 · 신청자 명단 · 유입 경로 · 전환 단계)가 열린다.
 */
export function CampaignResults({ all = false, calendarHref, detailHref }: { all?: boolean; calendarHref: string; detailHref: string }) {
  const router = useRouter()
  const today = kstToday()
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [allTime, setAllTime] = useState(false)
  const [data, setData] = useState<CrmSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const range = useMemo(() => (allTime ? {} : monthRange(ym.y, ym.m)), [ym, allTime])

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await crmSummary({ ...range, all })) } finally { setLoading(false) }
  }, [range, all])
  useEffect(() => { load() }, [load])

  const t = data?.totals
  const rows = data?.campaigns || []
  const move = (d: number) => setYm(({ y, m }) => {
    const n = new Date(Date.UTC(y, m + d, 1))
    return { y: n.getUTCFullYear(), m: n.getUTCMonth() }
  })

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow={all ? '관리자 · CRM' : '05 · CRM'}
        title="캠페인 결과"
        desc="집행별로 문자·알림톡 발송 결과와 랜딩페이지 신청자·조회수, 집행 금액을 함께 봅니다."
        accent={ACCENT}
        action={<Button href={calendarHref} variant="outline" size="sm"><CalendarRange size={14} /> 집행 캘린더</Button>}
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {/* 기간 */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setAllTime(false)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${!allTime ? 'border-violet-500/50 bg-violet-500/[0.12] text-violet-400' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--panel-2)]'}`}>
            월별
          </button>
          <button onClick={() => setAllTime(true)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${allTime ? 'border-violet-500/50 bg-violet-500/[0.12] text-violet-400' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--panel-2)]'}`}>
            전체 기간
          </button>
          {!allTime && (
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-1">
              <button onClick={() => move(-1)} className="rounded-md px-2 py-1 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]">‹</button>
              <span className="min-w-[86px] text-center text-[12.5px] font-semibold tabular-nums">{ym.y}년 {ym.m + 1}월</span>
              <button onClick={() => move(1)} className="rounded-md px-2 py-1 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]">›</button>
            </div>
          )}
          <button onClick={load} className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]" aria-label="새로고침">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="집행" icon={CalendarRange} accent="#8b5cf6"
            value={`${num(t?.campaigns || 0)}건`} sub={`발송 완료 ${num(t?.sentCampaigns || 0)}건`} />
          <Metric label="발송 성공" icon={Send} accent="#0ea5e9"
            value={`${num(t?.sent || 0)}건`} sub={`대상 ${num(t?.recipients || 0)}명 · 실패 ${num(t?.failed || 0)}건`} />
          <Metric label="신청자" icon={Users} accent="#22c55e"
            value={`${num(t?.leads || 0)}명`} sub={`조회 ${num(t?.views || 0)}회 · 전환 ${t?.convRate || 0}%`} />
          <Metric label="총 집행 금액" icon={Wallet} accent="#f59e0b"
            value={won(t?.totalCost || 0)} sub={`광고비 ${won(t?.adBudget || 0)} + 발송비 ${won(t?.sendCost || 0)}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="신청 1건당 비용 (CPA)" icon={Target} accent="#ef4444"
            value={t?.cpa ? won(t.cpa) : '—'} sub="총 집행 금액 ÷ 신청자" />
          <Metric label="조회 → 신청 전환" icon={MousePointerClick} accent="#22c55e"
            value={`${t?.convRate || 0}%`} sub={`조회 ${num(t?.views || 0)}회 → 신청 ${num(t?.leads || 0)}명`} />
          <Metric label="발송 → 신청 전환" icon={TrendingUp} accent="#0ea5e9"
            value={`${t?.sentToLead || 0}%`} sub={`발송 ${num(t?.sent || 0)}건 → 신청 ${num(t?.leads || 0)}명`} />
        </div>

        <Card title="집행별 성과" desc={`${rows.length}건 · 한 줄을 누르면 상세 페이지로 넘어갑니다`} bodyClassName="p-0">
          {rows.length === 0 ? (
            <EmptyState icon={BarChart3} title="이 기간에 집행이 없습니다" hint="집행 캘린더에서 등록하고 발송하면 결과가 여기에 모입니다."
              action={<Button href={calendarHref} size="sm" variant="outline"><CalendarRange size={14} /> 집행 캘린더</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11.5px] text-[var(--text-dim)]">
                    <th className="px-5 py-2.5 font-semibold">집행일</th>
                    <th className="px-5 py-2.5 font-semibold">집행</th>
                    {all && <th className="px-5 py-2.5 font-semibold">회원</th>}
                    <th className="px-5 py-2.5 text-right font-semibold">발송</th>
                    <th className="px-5 py-2.5 text-right font-semibold">조회수</th>
                    <th className="px-5 py-2.5 text-right font-semibold">신청자</th>
                    <th className="px-5 py-2.5 text-right font-semibold">전환율</th>
                    <th className="px-5 py-2.5 text-right font-semibold">광고비</th>
                    <th className="px-5 py-2.5 text-right font-semibold">발송비</th>
                    <th className="px-5 py-2.5 text-right font-semibold">총 집행액</th>
                    <th className="px-5 py-2.5 text-right font-semibold">CPA</th>
                    <th className="px-5 py-2.5 font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const tone = STATUS_TONE[c.status] || STATUS_TONE.draft
                    return (
                      <tr key={c.id} data-f="result-row" onClick={() => router.push(`${detailHref}?id=${encodeURIComponent(c.id)}`)}
                        className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--panel-2)]">
                        <td className="px-5 py-3 tabular-nums text-[var(--text-soft)]">{c.run_date}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-[11px] text-[var(--text-dim)]">
                            {c.channel === 'alimtalk' ? '알림톡' : '문자'}{c.landing_slug ? ` · /landing/${c.landing_slug}` : ''}
                          </p>
                        </td>
                        {all && <td className="px-5 py-3 text-[12px] text-[var(--text-soft)]">{c.owner_name || c.owner_email || '-'}</td>}
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{num(c.sent)}/{num(c.recipients)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{num(c.views)}</td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums text-emerald-500">{num(c.leads)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{c.convRate}%</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{c.adBudget ? won(c.adBudget) : '-'}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{c.sendCost ? won(c.sendCost) : '-'}</td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums">{won(c.totalCost)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{c.cpa ? won(c.cpa) : '-'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}>{tone.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border)] bg-[var(--panel-2)] text-[13px] font-bold">
                      <td className="px-5 py-3" colSpan={all ? 3 : 2}>합계</td>
                      <td className="px-5 py-3 text-right tabular-nums">{num(t?.sent || 0)}/{num(t?.recipients || 0)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{num(t?.views || 0)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-emerald-500">{num(t?.leads || 0)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{t?.convRate || 0}%</td>
                      <td className="px-5 py-3 text-right tabular-nums">{won(t?.adBudget || 0)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{won(t?.sendCost || 0)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{won(t?.totalCost || 0)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{t?.cpa ? won(t.cpa) : '-'}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </Card>
      </div>

    </div>
  )
}
