'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarRange, ChevronLeft, ChevronRight, Plus, Loader2, Coins, Users,
  MousePointerClick, Send, Wallet, BarChart3, RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { CampaignEditor } from '@/components/crm/CampaignEditor'
import {
  STATUS_TONE, crmList, crmOptions, crmSummary, kstToday, monthGrid, num, won,
  type CrmCampaign, type CrmOptions, type CrmSummary,
} from '@/lib/crm'

const ACCENT = '#f59e0b'
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

/**
 * CRM 마케팅 집행 — 캘린더.
 * 한 달을 펼쳐 놓고 날짜 칸에 집행을 얹는다. 빈 칸을 누르면 그날로 새 집행이 열린다.
 * 관리자 화면과 회원 화면이 같은 컴포넌트를 쓰고 `all` 로만 갈린다.
 */
export function CampaignCalendar({ all = false, resultsHref }: { all?: boolean; resultsHref: string }) {
  const today = kstToday()
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [rows, setRows] = useState<CrmCampaign[]>([])
  const [options, setOptions] = useState<CrmOptions | null>(null)
  const [totals, setTotals] = useState<CrmSummary['totals'] | null>(null)
  const [loading, setLoading] = useState(true)
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
      setTotals(s.ok ? s.totals : null)
    } finally { setLoading(false) }
  }, [from, to, all])

  useEffect(() => { load() }, [load])
  useEffect(() => { crmOptions().then((o) => { if (o.ok) setOptions(o) }).catch(() => {}) }, [])

  const byDate = useMemo(() => {
    const m: Record<string, CrmCampaign[]> = {}
    for (const c of rows) (m[c.run_date] ||= []).push(c)
    return m
  }, [rows])

  const move = (d: number) => setYm(({ y, m }) => {
    const n = new Date(Date.UTC(y, m + d, 1))
    return { y: n.getUTCFullYear(), m: n.getUTCMonth() }
  })

  function openNew(date: string) { setEditing(null); setPickDate(date); setEditorOpen(true) }
  function openEdit(c: CrmCampaign) { setEditing(c); setPickDate(''); setEditorOpen(true) }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={CalendarRange}
        eyebrow={all ? '관리자 · CRM' : '05 · CRM'}
        title="CRM 마케팅 집행"
        desc={all
          ? '전 회원의 마케팅 집행을 달력으로 봅니다. 집행일·랜딩·타깃·광고비·발송 결과가 한 줄에 모입니다.'
          : '집행을 달력에 올려 두고 문자·알림톡으로 알립니다. 랜딩 성과와 집행 금액이 결과 페이지에 그대로 모입니다.'}
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

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="이 달 집행" icon={CalendarRange} accent="#f59e0b"
            value={`${num(totals?.campaigns || 0)}건`} sub={`발송 완료 ${num(totals?.sentCampaigns || 0)}건`} />
          <Metric label="발송" icon={Send} accent="#0ea5e9"
            value={`${num(totals?.sent || 0)}건`} sub={`대상 ${num(totals?.recipients || 0)}명 · 실패 ${num(totals?.failed || 0)}`} />
          <Metric label="신청자" icon={Users} accent="#22c55e"
            value={`${num(totals?.leads || 0)}명`} sub={`조회 ${num(totals?.views || 0)}회 · 전환 ${totals?.convRate || 0}%`} />
          <Metric label="총 집행 금액" icon={Wallet} accent="#8b5cf6"
            value={won(totals?.totalCost || 0)}
            sub={`광고비 ${won(totals?.adBudget || 0)} + 발송비 ${won(totals?.sendCost || 0)}`} />
        </div>

        <Card
          title={`${ym.y}년 ${ym.m + 1}월`}
          desc={all ? '전 회원 집행' : '날짜를 누르면 그날로 새 집행이 열립니다'}
          bodyClassName="p-0"
          action={
            <div className="flex items-center gap-1">
              <button onClick={() => move(-1)} className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]" aria-label="이전 달">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })}
                className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]"
              >오늘</button>
              <button onClick={() => move(1)} className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]" aria-label="다음 달">
                <ChevronRight size={16} />
              </button>
              <button onClick={load} className="ml-1 rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]" aria-label="새로고침">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {WEEK.map((w, i) => (
              <div key={w} className={`px-2 py-2 text-center text-[11px] font-semibold ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-[var(--text-dim)]'}`}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((cell, i) => {
              const list = byDate[cell.date] || []
              const isToday = cell.date === today
              return (
                <div
                  key={cell.date}
                  onClick={() => !all && cell.inMonth && openNew(cell.date)}
                  className={`min-h-[104px] border-b border-r border-[var(--border)] p-1.5 transition-colors ${
                    i % 7 === 6 ? 'border-r-0' : ''
                  } ${cell.inMonth ? (all ? '' : 'cursor-pointer hover:bg-[var(--panel-2)]') : 'bg-[var(--panel-2)]/40'}`}
                >
                  <div className="flex items-center justify-between px-0.5">
                    <span className={`text-[11.5px] font-semibold tabular-nums ${
                      !cell.inMonth ? 'text-[var(--text-dim)]/50'
                        : isToday ? 'grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-white'
                        : i % 7 === 0 ? 'text-rose-400' : i % 7 === 6 ? 'text-sky-400' : 'text-[var(--text-soft)]'}`}>
                      {Number(cell.date.slice(8, 10))}
                    </span>
                    {list.length > 1 && <span className="text-[10px] tabular-nums text-[var(--text-dim)]">{list.length}</span>}
                  </div>
                  <div className="mt-1 space-y-1">
                    {list.slice(0, 3).map((c) => {
                      const tone = STATUS_TONE[c.status] || STATUS_TONE.draft
                      return (
                        <button
                          key={c.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(c) }}
                          className={`flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-medium transition hover:brightness-110 ${tone.cls}`}
                          title={`${c.name} · ${tone.label}${c.ad_budget ? ` · 광고비 ${won(c.ad_budget)}` : ''}`}
                        >
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: tone.dot }} />
                          <span className="truncate">{c.name}</span>
                        </button>
                      )
                    })}
                    {list.length > 3 && (
                      <p className="px-1 text-[10.5px] text-[var(--text-dim)]">+{list.length - 3}건 더</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="이 달 집행 목록" desc={`${rows.length}건`} bodyClassName="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="이 달에 등록된 집행이 없습니다"
              hint={all ? '회원이 집행을 등록하면 여기에 나타납니다.' : '달력의 날짜를 누르거나 오른쪽 위 새 집행으로 시작하세요.'}
              action={!all ? (
                <Button onClick={() => openNew(today)} size="sm" className="!bg-gradient-to-br !from-amber-500 !to-orange-500">
                  <Plus size={14} /> 새 집행
                </Button>
              ) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-[13px]">
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
                      <tr key={c.id} onClick={() => openEdit(c)}
                        className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--panel-2)]">
                        <td className="px-5 py-3 tabular-nums text-[var(--text-soft)]">{c.run_date}</td>
                        <td className="px-5 py-3 font-semibold">{c.name}</td>
                        {all && <td className="px-5 py-3 text-[12px] text-[var(--text-soft)]">{c.owner_name || c.owner_email || '-'}</td>}
                        <td className="px-5 py-3 text-[var(--text-soft)]">
                          {c.group_name ? `${c.group_name} (${num(c.group_size || 0)}명)` : '-'}
                        </td>
                        <td className="px-5 py-3 text-[var(--text-soft)]">{c.channel === 'alimtalk' ? '알림톡' : '문자'}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{c.ad_budget ? won(c.ad_budget) : '-'}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">
                          {c.status === 'sent' || c.status === 'failed' ? `${num(c.sent)}/${num(c.recipients)}` : '-'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}>{tone.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

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
