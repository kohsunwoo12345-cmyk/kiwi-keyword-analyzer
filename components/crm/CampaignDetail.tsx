'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Send, Users, Wallet, MousePointerClick, Target, ExternalLink,
  CheckCircle2, XCircle, RefreshCw, Pencil, Trash2, Ban, CalendarRange, Coins, TrendingUp, AlertCircle,
  UserCheck, UserX, Repeat, ChevronDown,
} from 'lucide-react'
import { CampaignEditor } from '@/components/crm/CampaignEditor'
import {
  STATUS_TONE, crmDetail, crmOptions, crmSend, crmDelete, crmSegments, crmMakeSegmentGroup, num, won,
  type CrmCampaign, type CrmResult, type CrmOptions, type CrmSegments, type SegmentKey,
} from '@/lib/crm'
import { cn } from '@/lib/utils'

const kst = (iso?: string | null) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return String(iso) }
}

function Stat({ label, value, sub, accent, icon: Icon }: { label: string; value: string; sub?: string; accent: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex items-center gap-1.5">
        <Icon size={12.5} strokeWidth={2.25} style={{ color: accent }} />
        <span className="truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">{label}</span>
      </div>
      <div className="mt-2 text-[22px] font-semibold leading-none tracking-[-0.025em] tabular-nums text-[var(--text)]">{value}</div>
      {sub && <div className="mt-2 truncate text-[11px] text-[var(--text-dim)]">{sub}</div>}
    </div>
  )
}
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className={cn('text-[12.5px]', strong ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-dim)]')}>{label}</span>
      <span className={cn('tabular-nums', strong ? 'text-[15px] font-semibold text-[var(--text)]' : 'text-[13px] text-[var(--text-soft)]')}>{value}</span>
    </div>
  )
}

/** 집행 상세 — 캘린더·가로 목록에서 카드를 누르면 오는 페이지 */
export function CampaignDetail({ backHref, all = false }: { backHref: string; all?: boolean }) {
  const [id, setId] = useState('')
  const [c, setC] = useState<CrmCampaign | null>(null)
  const [r, setR] = useState<CrmResult | null>(null)
  const [options, setOptions] = useState<CrmOptions | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [tab, setTab] = useState<'leads' | 'sends'>('leads')
  const [editing, setEditing] = useState(false)
  // 후속 발송 — 신청자 / 미신청자
  const [seg, setSeg] = useState<CrmSegments | null>(null)
  const [segOpen, setSegOpen] = useState<SegmentKey | ''>('')
  const [prefill, setPrefill] = useState<any>(null)

  useEffect(() => {
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    setId(sp.get('id') || '')
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const d = await crmDetail(id)
      if (!d.ok) { setErr(d.error || '불러오지 못했습니다.'); setC(null); setR(null) }
      else { setErr(''); setC(d.campaign); setR(d.result) }
      const sg = await crmSegments(id).catch(() => null)
      setSeg(sg && sg.ok ? sg : null)
    } catch { setErr('네트워크 오류') } finally { setLoading(false) }
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => { crmOptions().then((o) => { if (o.ok) setOptions(o) }).catch(() => {}) }, [])

  async function act(kind: 'send' | 'cancel') {
    if (!c) return
    if (kind === 'send' && !confirm(`"${c.name}" 을(를) 지금 발송할까요? 대상 ${num(c.group_size || 0)}명에게 포인트가 차감됩니다.`)) return
    if (kind === 'cancel' && !confirm('예약을 취소할까요?')) return
    setBusy(kind); setMsg(null)
    const res = await crmSend(c.id, kind)
    setBusy('')
    setMsg(res.ok
      ? { ok: true, text: kind === 'send' ? `${num(res.sent || 0)}건 발송했습니다. (${num(res.pointsUsed || 0)}P 차감)` : '예약을 취소했습니다.' }
      : { ok: false, text: res.error || '처리 실패' })
    load()
  }
  async function remove() {
    if (!c || !confirm('이 집행을 삭제할까요?')) return
    setBusy('delete')
    const res = await crmDelete(c.id)
    setBusy('')
    if (res.ok) window.location.href = backHref
    else setMsg({ ok: false, text: res.error || '삭제 실패' })
  }

  /** 그 무리로 타깃 그룹을 만들고 새 집행 편집기를 채워서 연다 */
  async function followUp(segment: SegmentKey) {
    if (!c) return
    setBusy('seg:' + segment); setMsg(null)
    const r = await crmMakeSegmentGroup(c.id, segment)
    setBusy('')
    if (!r.ok) { setMsg({ ok: false, text: r.error || '그룹을 만들지 못했습니다.' }); return }
    // 그룹 목록을 다시 읽어야 편집기의 선택지에 새 그룹이 뜬다
    const o = await crmOptions().catch(() => null)
    if (o?.ok) setOptions(o)
    setPrefill({
      name: r.suggestName,
      groupId: r.groupId,
      landingSlug: c.landing_slug || '',
      channel: c.channel === 'alimtalk' ? 'alimtalk' : 'sms',
      message: c.message || '',
    })
    setEditing(true)
    setMsg({ ok: true, text: `${r.segmentLabel} ${num(r.count)}명으로 타깃 그룹을 만들었습니다. 문구를 확인하고 저장하세요.` })
  }

  const tone = c ? (STATUS_TONE[c.status] || STATUS_TONE.draft) : STATUS_TONE.draft
  const editable = !!c && c.status !== 'sent' && c.status !== 'sending'

  return (
    <div className="animate-fade-in p-5 pb-24 lg:p-7 lg:pb-24">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-dim)] transition hover:text-[var(--text)]">
        <ArrowLeft size={14} /> 집행 캘린더
      </Link>

      {loading && !c && (
        <p className="mt-6 flex items-center gap-2 text-[13px] text-[var(--text-dim)]"><Loader2 size={15} className="animate-spin" /> 불러오는 중…</p>
      )}
      {err && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-500">
          <AlertCircle size={15} className="mt-px flex-shrink-0" /> {err}
        </div>
      )}

      {c && (
        <>
          {/* ── 머리말 ── */}
          <header className="mt-3 flex flex-wrap items-start gap-3 border-b border-[var(--border-soft)] pb-5">
            <span className="mt-1 h-10 w-1 flex-shrink-0 rounded-full" style={{ background: tone.dot }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)]">{c.name}</h1>
                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold', tone.cls)}>{tone.label}</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text-dim)]">
                <span className="flex items-center gap-1"><CalendarRange size={12} /> {c.run_date} 집행</span>
                <span>{c.channel === 'alimtalk' ? '카카오 알림톡' : '문자'}</span>
                {c.group_name && <span>타깃 {c.group_name} ({num(c.group_size || 0)}명)</span>}
                {c.scheduled_at && <span>예약 {kst(c.scheduled_at)}</span>}
                {c.sent_at && <span>발송 {kst(c.sent_at)}</span>}
                {all && (c.owner_name || c.owner_email) && <span>회원 {c.owner_name || c.owner_email}</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={load} aria-label="새로고침"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)]">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              </button>
              {editable && !all && (
                <>
                  <button onClick={() => setEditing(true)} data-f="edit"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12.5px] font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]">
                    <Pencil size={13} /> 수정
                  </button>
                  {c.status === 'scheduled' && (
                    <button onClick={() => act('cancel')} disabled={busy !== ''} data-f="cancel"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12.5px] font-semibold text-amber-500 transition hover:bg-amber-500/10 disabled:opacity-50">
                      <Ban size={13} /> 예약 취소
                    </button>
                  )}
                  <button onClick={() => act('send')} disabled={busy !== ''} data-f="send"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-105 disabled:opacity-50">
                    {busy === 'send' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 지금 발송
                  </button>
                  <button onClick={remove} disabled={busy !== ''} aria-label="삭제"
                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-dim)] transition hover:border-rose-500/40 hover:text-rose-500 disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </header>

          {msg && (
            <div className={cn('mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-[12.5px]',
              msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-rose-500/30 bg-rose-500/10 text-rose-500')}>
              {msg.ok ? <CheckCircle2 size={15} className="mt-px flex-shrink-0" /> : <AlertCircle size={15} className="mt-px flex-shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}
          {c.error && c.status === 'failed' && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12.5px] text-rose-500">
              <XCircle size={15} className="mt-px flex-shrink-0" /> <span>발송 실패 · {c.error}</span>
            </div>
          )}

          {r && (
            <div className="mt-5 space-y-5">
              {/* ── 지표 ── */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="발송" icon={Send} accent="#0ea5e9"
                  value={`${num(r.send.sent)}/${num(r.send.recipients)}건`}
                  sub={`성공률 ${r.send.successRate}% · 실패 ${num(r.send.failed)}건`} />
                <Stat label="랜딩 조회수" icon={MousePointerClick} accent="#8b5cf6"
                  value={`${num(r.landing.views)}회`} sub={`누적 ${num(r.landing.viewsTotal)}회`} />
                <Stat label="신청자" icon={Users} accent="#22c55e"
                  value={`${num(r.landing.leads)}명`} sub={`누적 ${num(r.landing.leadsTotal)}명`} />
                <Stat label="총 집행 금액" icon={Wallet} accent="#f59e0b"
                  value={won(r.money.totalCost)} sub={`광고 ${won(r.money.adBudget)} + 발송 ${won(r.money.sendCost)}`} />
              </div>

              {/* ── 후속 발송 — 신청자 / 미신청자 ── */}
              {seg && seg.counts.sent > 0 && (
                <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]" data-f="segments">
                  <header className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] px-5 py-3.5">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-amber-500/12 text-amber-500">
                      <Repeat size={15} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--text)]">후속 발송</h2>
                      <p className="mt-0.5 text-[11.5px] text-[var(--text-dim)]">
                        이 집행으로 문자를 받은 {num(seg.counts.sent)}명 중 신청 {num(seg.counts.applied)}명 ·
                        미신청 {num(seg.counts.notApplied)}명 (신청률 {seg.counts.applyRate}%)
                      </p>
                    </div>
                  </header>

                  <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {([
                      ['not_applied', '미신청자', seg.counts.notApplied, seg.notApplied, UserX, '#f59e0b',
                        '문자는 받았는데 아직 신청하지 않은 분들입니다. 이분들에게만 한 번 더 보냅니다.'],
                      ['applied', '신청자', seg.counts.applied, seg.applied, UserCheck, '#22c55e',
                        '이미 신청한 분들입니다. 안내·리마인드를 따로 보낼 때 씁니다.'],
                    ] as const).map(([key, label, count, list, Icon, color, hint]) => (
                      <div key={key} className="rounded-xl border border-[var(--border)] p-4" data-f={`seg-${key}`}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color }} />
                          <span className="text-[12.5px] font-semibold text-[var(--text)]">{label}</span>
                          <span className="text-[19px] font-semibold leading-none tabular-nums" style={{ color }}>{num(count)}</span>
                          <span className="text-[11.5px] text-[var(--text-dim)]">명</span>
                        </div>
                        <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--text-dim)]">{hint}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {!all && (
                            <button
                              onClick={() => followUp(key)}
                              disabled={count === 0 || busy !== ''}
                              data-f={`seg-send-${key}`}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ background: color }}
                            >
                              {busy === 'seg:' + key ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                              {label}에게 보내기
                            </button>
                          )}
                          <button onClick={() => setSegOpen(segOpen === key ? '' : key)} data-f={`seg-toggle-${key}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]">
                            명단 {segOpen === key ? '접기' : '보기'}
                            <ChevronDown size={11} className={cn('transition-transform', segOpen === key && 'rotate-180')} />
                          </button>
                        </div>
                        {segOpen === key && (
                          <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-[var(--border)]" data-f={`seg-list-${key}`}>
                            {list.length === 0 ? (
                              <p className="py-6 text-center text-[11.5px] text-[var(--text-dim)]">없습니다.</p>
                            ) : (
                              <table className="w-full text-[12px]">
                                <tbody>
                                  {list.map((m: any, i: number) => (
                                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                                      <td className="px-3 py-1.5 font-medium">{m.name || '-'}</td>
                                      <td className="px-3 py-1.5 tabular-nums text-[var(--text-soft)]">{m.phone}</td>
                                      {'appliedAt' in m && (
                                        <td className="px-3 py-1.5 text-[10.5px] text-[var(--text-dim)]">{kst(m.appliedAt)}</td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {(seg.counts.failed > 0 || seg.groups.length > 0) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border-soft)] px-5 py-3 text-[11.5px] text-[var(--text-dim)]">
                      {seg.counts.failed > 0 && (
                        <span>발송 실패 {num(seg.counts.failed)}명은 문자를 받지 못해 미신청자에서 뺐습니다.</span>
                      )}
                      {seg.groups.map((g) => (
                        <span key={g.id} className="rounded-full bg-[var(--panel-2)] px-2 py-0.5">
                          만든 그룹 · {g.name.replace(/\s*\[[^\]]*\]\s*$/, '')} ({num(g.count)}명)
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* items-start — 한쪽이 길다고 반대쪽 카드가 늘어나 빈 공간이 생기지 않게 */}
              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                {/* ── 왼쪽: 명단 ── */}
                <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
                  <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 pt-3">
                    {([['leads', `신청자 ${num(r.landing.recent.length)}`], ['sends', `발송 결과 ${num(r.sends.length)}`]] as const).map(([k, label]) => (
                      <button key={k} onClick={() => setTab(k)} data-f={`tab-${k}`}
                        className={cn('rounded-t-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors',
                          tab === k ? 'border-b-2 border-amber-500 text-[var(--text)]' : 'text-[var(--text-dim)] hover:text-[var(--text-soft)]')}>
                        {label}
                      </button>
                    ))}
                    {r.landing.url && (
                      <a href={r.landing.url} target="_blank" rel="noreferrer"
                        className="ml-auto mb-1 inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]">
                        <ExternalLink size={11} /> 랜딩 열기
                      </a>
                    )}
                  </div>

                  <div className="max-h-[420px] overflow-auto">
                    {tab === 'leads' ? (
                      r.landing.recent.length === 0 ? (
                        <p className="py-12 text-center text-[12.5px] text-[var(--text-dim)]">아직 신청자가 없습니다.</p>
                      ) : (
                        <table className="w-full text-[12.5px]" data-f="lead-table">
                          <thead className="sticky top-0 bg-[var(--panel)]">
                            <tr className="border-b border-[var(--border)] text-left text-[11px] text-[var(--text-dim)]">
                              <th className="px-4 py-2 font-semibold">이름</th>
                              <th className="px-4 py-2 font-semibold">연락처</th>
                              <th className="px-4 py-2 font-semibold">이메일</th>
                              <th className="px-4 py-2 font-semibold">신청일시</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.landing.recent.map((l, i) => (
                              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                                <td className="px-4 py-2 font-semibold">{l.name || '-'}</td>
                                <td className="px-4 py-2 tabular-nums text-[var(--text-soft)]">{l.phone || '-'}</td>
                                <td className="px-4 py-2 text-[var(--text-soft)]">{l.email || '-'}</td>
                                <td className="px-4 py-2 text-[11.5px] text-[var(--text-dim)]">{kst(l.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    ) : r.sends.length === 0 ? (
                      <p className="py-12 text-center text-[12.5px] text-[var(--text-dim)]">아직 발송하지 않았습니다.</p>
                    ) : (
                      <table className="w-full text-[12.5px]" data-f="send-table">
                        <thead className="sticky top-0 bg-[var(--panel)]">
                          <tr className="border-b border-[var(--border)] text-left text-[11px] text-[var(--text-dim)]">
                            <th className="px-4 py-2 font-semibold">이름</th>
                            <th className="px-4 py-2 font-semibold">연락처</th>
                            <th className="px-4 py-2 font-semibold">결과</th>
                            <th className="px-4 py-2 font-semibold">사유</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.sends.map((s, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0">
                              <td className="px-4 py-2 font-semibold">{s.name || '-'}</td>
                              <td className="px-4 py-2 tabular-nums text-[var(--text-soft)]">{s.phone}</td>
                              <td className="px-4 py-2">
                                {s.ok
                                  ? <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-500"><CheckCircle2 size={12} /> 성공</span>
                                  : <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-500"><XCircle size={12} /> 실패</span>}
                              </td>
                              <td className="px-4 py-2 text-[11.5px] text-[var(--text-dim)]">{s.reason || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* ── 오른쪽: 금액·전환·문구 ── */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">
                      <Coins size={12} /> 집행 금액
                    </p>
                    <div className="mt-2.5">
                      <Line label="광고 금액" value={won(r.money.adBudget)} />
                      <Line label={`발송 비용 (${num(r.send.unitPoints)}P/건)`} value={won(r.money.sendCost)} />
                      <div className="my-1.5 border-t border-[var(--border)]" />
                      <Line label="총 집행 금액" value={won(r.money.totalCost)} strong />
                      <Line label="신청 1건당 (CPA)" value={r.money.cpa ? won(r.money.cpa) : '—'} />
                      <Line label="조회 1회당" value={r.money.cpv ? `₩${r.money.cpv}` : '—'} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">
                      <TrendingUp size={12} /> 전환 단계
                    </p>
                    <div className="mt-2.5 space-y-2.5">
                      {([
                        ['발송 → 조회', r.funnel.sentToView, '#0ea5e9'],
                        ['조회 → 신청', r.funnel.viewToLead, '#8b5cf6'],
                        ['발송 → 신청', r.funnel.sentToLead, '#22c55e'],
                      ] as const).map(([label, v, color]) => (
                        <div key={label}>
                          <div className="flex items-baseline justify-between text-[12px]">
                            <span className="text-[var(--text-dim)]">{label}</span>
                            <span className="font-semibold tabular-nums text-[var(--text)]">{v}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Number(v) || 0)}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {r.landing.channels?.length > 0 && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">
                        <Target size={12} /> 유입 경로
                      </p>
                      <div className="mt-2.5 space-y-1">
                        {r.landing.channels.slice(0, 6).map((ch) => (
                          <Line key={ch.channel} label={ch.channel} value={`${num(ch.cnt)}회`} />
                        ))}
                      </div>
                    </div>
                  )}

                  {c.message && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-dim)]">발송 문구</p>
                      <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--panel-2)] p-3 text-[12.5px] leading-relaxed text-[var(--text-soft)]">
                        {c.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 후속 발송이면 새 집행(campaign=null)을 미리 채워서 연다 */}
      <CampaignEditor
        open={editing}
        onClose={() => { setEditing(false); setPrefill(null) }}
        onSaved={() => { setPrefill(null); load() }}
        options={options}
        campaign={prefill ? null : c}
        defaultDate=""
        prefill={prefill}
      />
    </div>
  )
}
