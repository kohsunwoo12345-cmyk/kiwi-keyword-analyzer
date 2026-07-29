'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, TrendingUp, Send, Users, Wallet, Target, MousePointerClick, BarChart3 } from 'lucide-react'
import { STATUS_TONE, num, won, type CrmSummary } from '@/lib/crm'
import { cn } from '@/lib/utils'

function Stat({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string; sub?: string; accent: string; icon: any
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3">
      <div className="flex items-center gap-1.5">
        <Icon size={12} strokeWidth={2.25} style={{ color: accent }} />
        <span className="truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">{label}</span>
      </div>
      <div className="mt-1.5 text-[19px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--text)]">{value}</div>
      {sub && <div className="mt-1.5 truncate text-[10.5px] text-[var(--text-dim)]">{sub}</div>}
    </div>
  )
}

/**
 * 종합 성과 — 접었다 펴는 서랍.
 * 평소엔 한 줄 요약만 보이고, 누르면 아래로 펼쳐져 집행별 성과표까지 보여준다.
 * (캘린더가 화면을 다 쓰도록 성과는 기본으로 접어 둔다)
 */
export function PerformancePanel({
  summary,
  detailHref,
  resultsHref,
  all,
  defaultOpen = false,
}: {
  summary: CrmSummary | null
  detailHref: string
  resultsHref: string
  all?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const t = summary?.totals
  const rows = summary?.campaigns || []

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
      <button
        onClick={() => setOpen((v) => !v)}
        data-f="perf-toggle"
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--panel-2)]"
      >
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-violet-500/12 text-violet-500">
          <TrendingUp size={15} />
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--text)]">종합 성과</span>
          <span className="mt-0.5 block truncate text-[11.5px] text-[var(--text-dim)]">
            {t
              ? `집행 ${num(t.campaigns)}건 · 발송 ${num(t.sent)}건 · 신청자 ${num(t.leads)}명 · 총 ${won(t.totalCost)}`
              : '불러오는 중…'}
          </span>
        </span>
        <span className="ml-auto flex flex-shrink-0 items-center gap-2 text-[11.5px] font-semibold text-[var(--text-dim)]">
          {open ? '접기' : '펼치기'}
          <ChevronDown size={16} className={cn('transition-transform duration-200', open && 'rotate-180')} />
        </span>
      </button>

      {/* 아래로 펼쳐지는 영역 */}
      <div
        data-f="perf-body"
        className={cn('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--border-soft)] p-5">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="집행" icon={BarChart3} accent="#f59e0b"
                value={`${num(t?.campaigns || 0)}건`} sub={`발송 완료 ${num(t?.sentCampaigns || 0)}건`} />
              <Stat label="발송" icon={Send} accent="#0ea5e9"
                value={`${num(t?.sent || 0)}건`} sub={`대상 ${num(t?.recipients || 0)}명 · 실패 ${num(t?.failed || 0)}건`} />
              <Stat label="신청자" icon={Users} accent="#22c55e"
                value={`${num(t?.leads || 0)}명`} sub={`조회 ${num(t?.views || 0)}회 · 전환 ${t?.convRate || 0}%`} />
              <Stat label="총 집행 금액" icon={Wallet} accent="#8b5cf6"
                value={won(t?.totalCost || 0)} sub={`광고 ${won(t?.adBudget || 0)} + 발송 ${won(t?.sendCost || 0)}`} />
            </div>

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
              <Stat label="신청 1건당(CPA)" icon={Target} accent="#ef4444" value={t?.cpa ? won(t.cpa) : '—'} />
              <Stat label="발송 → 신청" icon={MousePointerClick} accent="#6366f1" value={`${t?.sentToLead || 0}%`} />
              <Stat label="조회 → 신청" icon={TrendingUp} accent="#14b8a6" value={`${t?.convRate || 0}%`} />
            </div>

            {rows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[820px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-left text-[11px] text-[var(--text-dim)]">
                      <th className="px-4 py-2.5 font-semibold">집행</th>
                      {all && <th className="px-4 py-2.5 font-semibold">회원</th>}
                      <th className="px-4 py-2.5 text-right font-semibold">발송</th>
                      <th className="px-4 py-2.5 text-right font-semibold">조회</th>
                      <th className="px-4 py-2.5 text-right font-semibold">신청</th>
                      <th className="px-4 py-2.5 text-right font-semibold">전환</th>
                      <th className="px-4 py-2.5 text-right font-semibold">집행 금액</th>
                      <th className="px-4 py-2.5 text-right font-semibold">CPA</th>
                    </tr>
                  </thead>
                  <tbody data-f="perf-rows">
                    {rows.map((c) => {
                      const tone = STATUS_TONE[c.status] || STATUS_TONE.draft
                      return (
                        <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-2)]">
                          <td className="px-4 py-2.5">
                            <Link href={`${detailHref}?id=${encodeURIComponent(c.id)}`} className="group flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: tone.dot }} />
                              <span className="truncate font-semibold text-[var(--text)] group-hover:text-amber-500">{c.name}</span>
                              <span className="flex-shrink-0 text-[10.5px] tabular-nums text-[var(--text-dim)]">{c.run_date}</span>
                            </Link>
                          </td>
                          {all && <td className="px-4 py-2.5 text-[11.5px] text-[var(--text-soft)]">{c.owner_name || c.owner_email || '-'}</td>}
                          <td className="px-4 py-2.5 text-right tabular-nums">{num(c.sent)}/{num(c.recipients)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{num(c.views)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-emerald-500">{num(c.leads)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-soft)]">{c.convRate || 0}%</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-soft)]">{won(c.totalCost)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-soft)]">{c.cpa ? won(c.cpa) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <Link href={resultsHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]">
                <BarChart3 size={13} /> 기간별 성과 자세히 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
