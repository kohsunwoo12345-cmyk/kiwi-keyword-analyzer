'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarRange, ChevronLeft, ChevronRight, Plus, Loader2, Coins,
  BarChart3, RefreshCw, LayoutGrid, List,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Button } from '@/components/ui'
import { CampaignEditor } from '@/components/crm/CampaignEditor'
import { CampaignRail } from '@/components/crm/CampaignRail'
import { PerformancePanel } from '@/components/crm/PerformancePanel'
import {
  STATUS_TONE, crmList, crmOptions, crmSummary, kstToday, monthGrid, num, won,
  type CrmCampaign, type CrmOptions, type CrmSummary,
} from '@/lib/crm'
import { cn } from '@/lib/utils'

const ACCENT = '#f59e0b'
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

/** 지금 신경 써야 하는 집행이 앞으로 오게 — 발송중 > 예약 > 작성중 > 최근 발송 */
const RANK: Record<string, number> = { sending: 0, scheduled: 1, draft: 2, failed: 3, sent: 4, canceled: 5 }

/**
 * CRM 마케팅 집행 화면.
 *
 * 위에서부터
 *  1) 진행 중인 집행을 가로로 쭉 (카드를 누르면 상세 페이지)
 *  2) 한 달 캘린더 — 날짜 칸을 누르면 그날로 새 집행
 *  3) 종합 성과 — 기본은 접혀 있고 누르면 아래로 펼쳐진다
 *
 * 회원 화면과 관리자 화면이 같은 컴포넌트를 쓰고 `all` 로만 갈린다.
 */
export function CampaignCalendar({
  all = false,
  resultsHref,
  detailHref,
}: {
  all?: boolean
  resultsHref: string
  detailHref: string
}) {
  const router = useRouter()
  const today = kstToday()
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [rows, setRows] = useState<CrmCampaign[]>([])
  const [options, setOptions] = useState<CrmOptions | null>(null)
  const [summary, setSummary] = useState<CrmSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  // 좁은 화면에서는 달력 칸이 눌려 집행 이름이 한 글자로 잘린다 — 목록으로 시작한다
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 720) setView('list')
  }, [])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CrmCampaign | null>(null)
  const [pickDate, setPickDate] = useState('')

  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym])
  const from = grid[0].date
  const to = grid[grid.length - 1].date

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [l, s] = await Promise.all([crmList({ from, to, all }), crmSummary({ from, to, all })])
      setRows(l.ok ? l.campaigns : [])
      setSummary(s.ok ? s : null)
    } finally { setLoading(false) }
  }, [from, to, all])

  useEffect(() => { load() }, [load])
  useEffect(() => { crmOptions().then((o) => { if (o.ok) setOptions(o) }).catch(() => {}) }, [])

  const byDate = useMemo(() => {
    const m: Record<string, CrmCampaign[]> = {}
    for (const c of rows) (m[c.run_date] ||= []).push(c)
    return m
  }, [rows])

  // 가로 목록 — 진행 중(발송 전)이 먼저, 그다음 최근 발송분
  const rail = useMemo(
    () => [...rows].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || a.run_date.localeCompare(b.run_date)),
    [rows],
  )
  const activeCount = rail.filter((c) => c.status === 'draft' || c.status === 'scheduled' || c.status === 'sending').length

  const move = (d: number) => setYm(({ y, m }) => {
    const n = new Date(Date.UTC(y, m + d, 1))
    return { y: n.getUTCFullYear(), m: n.getUTCMonth() }
  })
  const openNew = (date: string) => { setEditing(null); setPickDate(date); setEditorOpen(true) }
  const goDetail = (id: string) => router.push(`${detailHref}?id=${encodeURIComponent(id)}`)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={CalendarRange}
        eyebrow={all ? '관리자 · CRM' : '05 · CRM'}
        title="CRM 마케팅 집행"
        desc={all
          ? '전 회원의 마케팅 집행입니다. 진행 중인 집행을 먼저 보고, 캘린더로 일정을 확인한 뒤 아래에서 성과를 펼쳐 보세요.'
          : '진행 중인 집행을 위에서 한눈에 보고, 캘린더로 일정을 잡고, 아래에서 성과를 펼쳐 봅니다.'}
        accent={ACCENT}
        action={
          <div className="flex items-center gap-2">
            <Button href={resultsHref} variant="outline" size="sm"><BarChart3 size={14} /> 집행 결과</Button>
            {!all && (
              <Button onClick={() => openNew(today)} size="sm" className="!bg-gradient-to-br !from-amber-500 !to-orange-500">
                <Plus size={14} /> 새 집행
              </Button>
            )}
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[1440px] space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {/* ── 1) 진행 중인 집행 (가로) ── */}
        <CampaignRail rows={rail} activeCount={activeCount} detailHref={detailHref} canCreate={!all} onNew={() => openNew(today)} />

        {/* ── 2) 캘린더 / 목록 ── */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
          <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border-soft)] px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                {ym.y}년 {ym.m + 1}월
              </h2>
              <p className="mt-0.5 text-[11.5px] text-[var(--text-dim)]">
                집행 {num(rows.length)}건 · 진행 중 {num(activeCount)}건
                {!all && view === 'calendar' && ' · 날짜를 누르면 그날로 새 집행이 열립니다'}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* 보기 전환 */}
              <div className="flex rounded-lg border border-[var(--border)] p-0.5">
                {([['calendar', LayoutGrid, '캘린더'], ['list', List, '목록']] as const).map(([k, Icon, label]) => (
                  <button key={k} onClick={() => setView(k)} title={label} data-f={`view-${k}`}
                    className={cn('rounded-md px-2 py-1 transition-colors',
                      view === k ? 'bg-[var(--panel-2)] text-[var(--text)]' : 'text-[var(--text-dim)] hover:text-[var(--text-soft)]')}>
                    <Icon size={14} />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => move(-1)} aria-label="이전 달"
                  className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]"><ChevronLeft size={16} /></button>
                <button onClick={() => setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })}
                  className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]">오늘</button>
                <button onClick={() => move(1)} aria-label="다음 달"
                  className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]"><ChevronRight size={16} /></button>
                <button onClick={load} aria-label="새로고침"
                  className="ml-1 rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                </button>
              </div>
            </div>
          </header>

          {view === 'calendar' ? (
            <>
              <div className="grid grid-cols-7 border-b border-[var(--border)]">
                {WEEK.map((w, i) => (
                  <div key={w} className={cn('px-2 py-2 text-center text-[11px] font-semibold',
                    i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-[var(--text-dim)]')}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7" data-f="calendar">
                {grid.map((cell, i) => {
                  const list = byDate[cell.date] || []
                  const isToday = cell.date === today
                  return (
                    <div
                      key={cell.date}
                      onClick={() => !all && cell.inMonth && openNew(cell.date)}
                      className={cn(
                        'min-h-[76px] border-b border-r border-[var(--border)] p-1 transition-colors sm:min-h-[112px] sm:p-1.5',
                        i % 7 === 6 && 'border-r-0',
                        i >= 35 && 'border-b-0',
                        cell.inMonth ? (all ? '' : 'cursor-pointer hover:bg-[var(--panel-2)]') : 'bg-[var(--panel-2)]/40',
                      )}
                    >
                      <div className="flex items-center justify-between px-0.5">
                        <span className={cn('text-[11.5px] font-semibold tabular-nums',
                          !cell.inMonth ? 'text-[var(--text-dim)]/50'
                            : isToday ? 'grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-white'
                            : i % 7 === 0 ? 'text-rose-400' : i % 7 === 6 ? 'text-sky-400' : 'text-[var(--text-soft)]')}>
                          {Number(cell.date.slice(8, 10))}
                        </span>
                        {list.length > 2 && <span className="text-[10px] tabular-nums text-[var(--text-dim)]">{list.length}</span>}
                      </div>
                      <div className="mt-1 space-y-1">
                        {list.slice(0, 2).map((c) => {
                          const tone = STATUS_TONE[c.status] || STATUS_TONE.draft
                          return (
                            <button
                              key={c.id}
                              data-f="cal-chip"
                              onClick={(e) => { e.stopPropagation(); goDetail(c.id) }}
                              className={cn('flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-medium transition hover:brightness-110', tone.cls)}
                              title={`${c.name} · ${tone.label}${c.ad_budget ? ` · 광고비 ${won(c.ad_budget)}` : ''}`}
                            >
                              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: tone.dot }} />
                              <span className="truncate">{c.name}</span>
                            </button>
                          )
                        })}
                        {list.length > 2 && (
                          <button onClick={(e) => { e.stopPropagation(); setView('list') }}
                            className="px-1 text-[10.5px] text-[var(--text-dim)] hover:text-amber-500">+{list.length - 2}건 더</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">
              이 달에 등록된 집행이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-[13px]" data-f="list-table">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11.5px] text-[var(--text-dim)]">
                    <th className="px-5 py-2.5 font-semibold">집행일</th>
                    <th className="px-5 py-2.5 font-semibold">이름</th>
                    {all && <th className="px-5 py-2.5 font-semibold">회원</th>}
                    <th className="px-5 py-2.5 font-semibold">타깃</th>
                    <th className="px-5 py-2.5 font-semibold">채널</th>
                    <th className="px-5 py-2.5 text-right font-semibold">광고비</th>
                    <th className="px-5 py-2.5 text-right font-semibold">발송</th>
                    <th className="px-5 py-2.5 font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const tone = STATUS_TONE[c.status] || STATUS_TONE.draft
                    return (
                      <tr key={c.id} data-f="list-row" onClick={() => goDetail(c.id)}
                        className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--panel-2)]">
                        <td className="px-5 py-3 tabular-nums text-[var(--text-soft)]">{c.run_date}</td>
                        <td className="px-5 py-3 font-semibold">{c.name}</td>
                        {all && <td className="px-5 py-3 text-[12px] text-[var(--text-soft)]">{c.owner_name || c.owner_email || '-'}</td>}
                        <td className="px-5 py-3 text-[var(--text-soft)]">{c.group_name ? `${c.group_name} (${num(c.group_size || 0)}명)` : '-'}</td>
                        <td className="px-5 py-3 text-[var(--text-soft)]">{c.channel === 'alimtalk' ? '알림톡' : '문자'}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{c.ad_budget ? won(c.ad_budget) : '-'}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">
                          {c.status === 'sent' || c.status === 'failed' ? `${num(c.sent)}/${num(c.recipients)}` : '-'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold', tone.cls)}>{tone.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 3) 종합 성과 (드롭다운) ── */}
        <PerformancePanel summary={summary} detailHref={detailHref} resultsHref={resultsHref} all={all} />

        {!all && options && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-[12.5px]">
            <span className="flex items-center gap-1.5 font-semibold text-[var(--text-soft)]">
              <Coins size={13} className="text-amber-500" /> 발송 단가
            </span>
            {(['sms', 'lms', 'alimtalk'] as const).map((k) => (
              <span key={k} className="text-[var(--text-soft)]">
                {options.rateLabels?.[k] || k} <b className="tabular-nums text-[var(--text)]">{num(options.rates?.[k] || 0)}P</b>
              </span>
            ))}
            <span className="ml-auto text-[var(--text-soft)]">
              보유 포인트 <b className="tabular-nums text-amber-500">{num(options.points)}P</b>
            </span>
          </div>
        )}
      </div>

      <CampaignEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
        options={options}
        campaign={editing}
        defaultDate={pickDate}
      />
    </div>
  )
}
