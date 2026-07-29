'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Send, Users, Wallet, Clock, MousePointerClick } from 'lucide-react'
import { STATUS_TONE, num, won, type CrmCampaign } from '@/lib/crm'
import { cn } from '@/lib/utils'

/** 예약 시각을 "오늘 14:30 / 7월 30일 09:00" 처럼 짧게 */
function whenLabel(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const kst = new Date(d.getTime() + 9 * 3600_000)
  const now = new Date(Date.now() + 9 * 3600_000)
  const hh = String(kst.getUTCHours()).padStart(2, '0')
  const mm = String(kst.getUTCMinutes()).padStart(2, '0')
  const sameDay = kst.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
  return sameDay ? `오늘 ${hh}:${mm}` : `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${hh}:${mm}`
}

/**
 * 집행 중인 캠페인 — 가로로 쭉 이어지는 카드 목록.
 * 지금 신경 써야 하는 집행(작성중·예약·발송중)을 먼저, 그 뒤에 최근 발송분을 붙인다.
 * 카드를 누르면 그 집행의 상세 페이지로 넘어간다.
 */
export function CampaignRail({
  rows,
  activeCount,
  detailHref,
  onNew,
  canCreate,
}: {
  rows: CrmCampaign[]
  /** 아직 발송 전인 집행 수 — 헤더 숫자는 이 값이다(끝난 것까지 세면 캘린더 숫자와 어긋난다) */
  activeCount: number
  detailHref: string
  onNew?: () => void
  canCreate?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })

  const sync = () => {
    const el = ref.current
    if (!el) return
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }
  useEffect(() => {
    sync()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => { el.removeEventListener('scroll', sync); window.removeEventListener('resize', sync) }
  }, [rows.length])

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 340, behavior: 'smooth' })

  return (
    <section className="relative">
      <header className="mb-2.5 flex items-center gap-2">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--text)]">진행 중인 집행</h2>
        <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-500">
          {activeCount}
        </span>
        {rows.length > activeCount && (
          <span className="text-[11.5px] text-[var(--text-dim)]">· 완료 {rows.length - activeCount}건</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => scroll(-1)} disabled={!edge.left} aria-label="왼쪽으로"
            className="rounded-lg border border-[var(--border)] p-1 text-[var(--text-dim)] transition enabled:hover:bg-[var(--panel-2)] disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => scroll(1)} disabled={!edge.right} aria-label="오른쪽으로"
            className="rounded-lg border border-[var(--border)] p-1 text-[var(--text-dim)] transition enabled:hover:bg-[var(--panel-2)] disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      </header>

      <div className="relative">
        {/* 양끝 페이드 — 더 있다는 걸 보이게 */}
        {edge.left && <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--bg)] to-transparent" />}
        {edge.right && <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--bg)] to-transparent" />}

        <div ref={ref} data-f="rail"
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {canCreate && (
            <button onClick={onNew} data-f="rail-new"
              className="flex h-[132px] w-[168px] flex-shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--border)] text-[var(--text-dim)] transition hover:border-amber-500/60 hover:bg-amber-500/[0.04] hover:text-amber-500">
              <Plus size={20} />
              <span className="text-[12px] font-semibold">새 집행</span>
            </button>
          )}

          {rows.length === 0 && !canCreate && (
            <div className="flex h-[132px] w-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-[12.5px] text-[var(--text-dim)]">
              진행 중인 집행이 없습니다.
            </div>
          )}

          {rows.map((c) => {
            const tone = STATUS_TONE[c.status] || STATUS_TONE.draft
            const done = c.status === 'sent' || c.status === 'failed'
            return (
              <Link
                key={c.id}
                href={`${detailHref}?id=${encodeURIComponent(c.id)}`}
                data-f="rail-card"
                className="group relative flex h-[132px] w-[268px] flex-shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3.5 transition hover:-translate-y-0.5 hover:border-[var(--border-strong,var(--border))] hover:shadow-lg"
              >
                {/* 상태 색 띠 */}
                <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: tone.dot }} />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('inline-flex flex-shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold', tone.cls)}>
                      {tone.label}
                    </span>
                    <span className="truncate text-[10.5px] tabular-nums text-[var(--text-dim)]">{c.run_date}</span>
                    <span className="ml-auto flex-shrink-0 text-[10.5px] font-semibold text-[var(--text-dim)]">
                      {c.channel === 'alimtalk' ? '알림톡' : '문자'}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-[13.5px] font-semibold leading-tight text-[var(--text)]">{c.name}</p>
                  {c.owner_name && <p className="truncate text-[10.5px] text-[var(--text-dim)]">{c.owner_name}</p>}
                </div>

                <div className="space-y-1">
                  {c.scheduled_at && !done && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
                      <Clock size={11} /> {whenLabel(c.scheduled_at)} 발송 예약
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)]">
                    <span className="flex items-center gap-1">
                      {done ? <Send size={11} /> : <Users size={11} />}
                      <b className="tabular-nums text-[var(--text-soft)]">
                        {done ? `${num(c.sent)}/${num(c.recipients)}` : num(c.group_size || 0)}
                      </b>
                      {done ? '건' : '명'}
                    </span>
                    {c.ad_budget > 0 && (
                      <span className="flex items-center gap-1">
                        <Wallet size={11} /> <b className="tabular-nums text-[var(--text-soft)]">{won(c.ad_budget)}</b>
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-0.5 font-semibold text-[var(--text-dim)] transition group-hover:text-amber-500">
                      상세 <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
