'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3, Users, Send, Wallet, MousePointerClick, Target, Loader2, X,
  CalendarRange, ExternalLink, CheckCircle2, XCircle, RefreshCw, TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { Button, Overlay } from '@/components/ui'
import {
  STATUS_TONE, crmDetail, crmSummary, kstToday, num, won,
  type CrmCampaign, type CrmResult, type CrmSummary,
} from '@/lib/crm'

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
export function CampaignResults({ all = false, calendarHref }: { all?: boolean; calendarHref: string }) {
  const today = kstToday()
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [allTime, setAllTime] = useState(false)
  const [data, setData] = useState<CrmSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState('')

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

        <Card title="집행별 성과" desc={`${rows.length}건 · 한 줄을 누르면 상세가 열립니다`} bodyClassName="p-0">
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
                      <tr key={c.id} onClick={() => setOpenId(c.id)}
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

      {openId && <ResultDetail id={openId} onClose={() => setOpenId('')} />}
    </div>
  )
}

/* ───────── 집행 상세 ───────── */

function ResultDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [c, setC] = useState<CrmCampaign | null>(null)
  const [r, setR] = useState<CrmResult | null>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'leads' | 'sends'>('leads')

  useEffect(() => {
    let alive = true
    crmDetail(id).then((d) => {
      if (!alive) return
      if (!d.ok) { setErr(d.error || '불러오지 못했습니다.'); return }
      setC(d.campaign); setR(d.result)
    }).catch(() => setErr('네트워크 오류'))
    return () => { alive = false }
  }, [id])

  const tone = c ? (STATUS_TONE[c.status] || STATUS_TONE.draft) : STATUS_TONE.draft

  return (
    <Overlay variant="slide" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ml-auto flex h-full w-full max-w-[720px] flex-col bg-[var(--panel)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">집행 결과</p>
            <h2 className="mt-0.5 flex items-center gap-2 truncate text-[16px] font-semibold">
              {c?.name || '…'}
              {c && <span className={`inline-flex flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}>{tone.label}</span>}
            </h2>
            {c && <p className="mt-0.5 text-[12px] text-[var(--text-dim)]">{c.run_date} 집행{c.group_name ? ` · ${c.group_name}` : ''}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]" aria-label="닫기"><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {err && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-500">{err}</p>}
          {!r && !err && <p className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]"><Loader2 size={15} className="animate-spin" /> 불러오는 중…</p>}

          {r && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Box label="발송" main={`${num(r.send.sent)} / ${num(r.send.recipients)}건`}
                  sub={`성공률 ${r.send.successRate}% · 실패 ${num(r.send.failed)}건`} accent="#0ea5e9" />
                <Box label="발송 비용" main={won(r.money.sendCost)}
                  sub={`${num(r.send.unitPoints)}P/건 · ${r.send.msgKind || '-'}`} accent="#f59e0b" />
                <Box label="랜딩 조회수" main={`${num(r.landing.views)}회`}
                  sub={`전체 누적 ${num(r.landing.viewsTotal)}회`} accent="#8b5cf6" />
                <Box label="신청자" main={`${num(r.landing.leads)}명`}
                  sub={`전체 누적 ${num(r.landing.leadsTotal)}명`} accent="#22c55e" />
              </div>

              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">집행 금액</p>
                <div className="mt-2.5 space-y-1.5 text-[13px]">
                  <Line label="광고 금액" value={won(r.money.adBudget)} />
                  <Line label="발송 비용" value={won(r.money.sendCost)} />
                  <div className="my-1 border-t border-[var(--border)]" />
                  <Line label="총 집행 금액" value={won(r.money.totalCost)} strong />
                  <Line label="신청 1건당 (CPA)" value={r.money.cpa ? won(r.money.cpa) : '—'} />
                  <Line label="조회 1회당" value={r.money.cpv ? `₩${r.money.cpv}` : '—'} />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">전환 단계</p>
                <div className="mt-3 space-y-2.5">
                  {[
                    { label: '발송', v: r.send.sent, pct: 100, color: '#0ea5e9' },
                    { label: '랜딩 조회', v: r.landing.views, pct: r.funnel.sentToView, color: '#8b5cf6' },
                    { label: '신청', v: r.landing.leads, pct: r.funnel.sentToLead, color: '#22c55e' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="w-16 flex-shrink-0 text-[12px] font-semibold text-[var(--text-soft)]">{s.label}</span>
                      <div className="h-7 flex-1 overflow-hidden rounded-lg bg-[var(--panel-2)]">
                        <div className="flex h-full items-center rounded-lg px-2.5 text-[11.5px] font-bold text-white"
                          style={{ width: `${Math.max(8, Math.min(100, s.pct))}%`, background: s.color }}>
                          {num(s.v)}
                        </div>
                      </div>
                      <span className="w-12 flex-shrink-0 text-right text-[11.5px] tabular-nums text-[var(--text-dim)]">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {r.landing.channels.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">유입 경로</p>
                  <div className="mt-2.5 space-y-1.5 text-[13px]">
                    {r.landing.channels.map((ch) => <Line key={ch.channel} label={ch.channel} value={`${num(ch.cnt)}회`} />)}
                  </div>
                </div>
              )}

              {r.landing.slug && (
                <a href={r.landing.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-sky-500 hover:underline">
                  <ExternalLink size={13} /> 랜딩페이지 열기 ({r.landing.url})
                </a>
              )}

              {/* 명단 */}
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <div className="flex border-b border-[var(--border)]">
                  {([['leads', `신청자 ${num(r.landing.recent.length)}`], ['sends', `발송 결과 ${num(r.sends.length)}`]] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setTab(k)}
                      className={`flex-1 px-4 py-2.5 text-[12.5px] font-semibold transition ${tab === k ? 'bg-[var(--panel-2)] text-[var(--text)]' : 'text-[var(--text-dim)] hover:bg-[var(--panel-2)]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {tab === 'leads' ? (
                    r.landing.recent.length === 0 ? <p className="p-5 text-center text-[12.5px] text-[var(--text-dim)]">아직 신청자가 없습니다.</p> : (
                      <table className="w-full text-[12.5px]">
                        <tbody>
                          {r.landing.recent.map((s, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0">
                              <td className="px-4 py-2.5 font-semibold">{s.name || '-'}</td>
                              <td className="px-4 py-2.5 tabular-nums text-[var(--text-soft)]">{s.phone || '-'}</td>
                              <td className="px-4 py-2.5 text-[var(--text-soft)]">{s.email || '-'}</td>
                              <td className="px-4 py-2.5 text-right text-[11px] text-[var(--text-dim)]">{String(s.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  ) : (
                    r.sends.length === 0 ? <p className="p-5 text-center text-[12.5px] text-[var(--text-dim)]">아직 발송하지 않았습니다.</p> : (
                      <table className="w-full text-[12.5px]">
                        <tbody>
                          {r.sends.map((s, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0">
                              <td className="w-8 px-4 py-2.5">
                                {s.ok ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-rose-500" />}
                              </td>
                              <td className="px-2 py-2.5 font-semibold">{s.name || '-'}</td>
                              <td className="px-2 py-2.5 tabular-nums text-[var(--text-soft)]">{s.phone}</td>
                              <td className="px-4 py-2.5 text-right text-[11px] text-[var(--text-dim)]">{s.ok ? '성공' : (s.reason || '실패')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}
                </div>
              </div>

              {c?.message && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">발송 문구</p>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-soft)]">{c.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  )
}

function Box({ label, main, sub, accent }: { label: string; main: string; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--text-dim)]">{label}</p>
      <p className="mt-1.5 text-[20px] font-bold tabular-nums" style={{ color: accent }}>{main}</p>
      <p className="mt-0.5 text-[11.5px] text-[var(--text-dim)]">{sub}</p>
    </div>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-soft)]">{label}</span>
      <span className={`tabular-nums ${strong ? 'text-[15px] font-bold text-amber-500' : 'font-semibold'}`}>{value}</span>
    </div>
  )
}
