'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, RefreshCw, Search, Download, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Zap, Hand, Megaphone, Cog } from 'lucide-react'
import { MktCanvas, MktHeader, MktPanel } from '@/components/marketing/node'
import { cn } from '@/lib/utils'

const ADMIN_BASE = '/adminsunkoh028741_11263'
const kst = (iso?: string) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

const TRIGGERS = [
  { key: 'all', label: '전체', icon: BellRing, tone: 'text-[var(--mkt-text)]' },
  { key: 'auto', label: '자동 발송', icon: Zap, tone: 'text-[#6366f1]' },
  { key: 'manual', label: '수동 발송', icon: Hand, tone: 'text-[#0ea5e9]' },
  { key: 'campaign', label: '캠페인', icon: Megaphone, tone: 'text-[#f59e0b]' },
  { key: 'system', label: '시스템', icon: Cog, tone: 'text-[var(--mkt-text-dim)]' },
]
const KINDS = [
  { key: 'all', label: '전체 채널' },
  { key: 'sms', label: '문자(SMS)' },
  { key: 'lms', label: '문자(LMS)' },
  { key: 'alimtalk', label: '카카오 알림톡' },
  { key: 'email', label: '이메일' },
  { key: 'app', label: '앱 알림' },
]

interface Row {
  // 서버가 내려주는 이름 그대로 쓴다 — userId 로 잘못 읽어 "이 회원 신청 DB" 버튼이 안 나왔다
  id: string; user_id: string; trigger: string; triggerLabel: string; event: string
  kind: string; kindLabel: string; recipient: string; recipient_name: string
  subject: string; content: string; ok: boolean; reason: string; points: number
  landing_slug: string; landing_title: string; owner: string; owner_email: string; created_at: string
}

export default function NotifyLogPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [counts, setCounts] = useState<Record<string, { total: number; ok: number; points: number }>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [loading, setLoading] = useState(true)
  const [trigger, setTrigger] = useState('all')
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<Row | null>(null)

  const params = useCallback((extra: Record<string, string> = {}) => {
    const p = new URLSearchParams()
    if (trigger !== 'all') p.set('trigger', trigger)
    if (kind !== 'all') p.set('kind', kind)
    if (q.trim()) p.set('q', q.trim())
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    for (const k in extra) p.set(k, extra[k])
    return p
  }, [trigger, kind, q, from, to])

  const load = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/notify-log?${params({ page: String(pg) }).toString()}`, { credentials: 'include', cache: 'no-store' })
      const d = await r.json()
      if (d.ok) { setRows(d.rows || []); setTotal(d.total || 0); setCounts(d.counts || {}); setPageSize(d.pageSize || 100) }
    } catch { /* 무시 */ }
    setLoading(false)
  }, [params, page])

  useEffect(() => { setPage(1); load(1) }, [trigger, kind]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <MktCanvas>
      <MktHeader
        icon={BellRing}
        eyebrow="NOTIFY LOG"
        title="알림 발송 내역"
        desc="회원에게 나간 모든 알림을 한 곳에서 봅니다. 신청자가 들어왔을 때 자동으로 나간 알림은 '자동 발송'으로 기록되며, 직접 보낸 문자·알림톡은 '수동 발송', CRM 집행은 '캠페인'으로 구분됩니다."
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        {TRIGGERS.map((t) => {
          const c = t.key === 'all'
            ? Object.values(counts).reduce((s, v) => ({ total: s.total + v.total, ok: s.ok + v.ok, points: s.points + v.points }), { total: 0, ok: 0, points: 0 })
            : counts[t.key] || { total: 0, ok: 0, points: 0 }
          return (
            <button key={t.key} onClick={() => setTrigger(t.key)} data-f={`tab-${t.key}`}
              className={cn('rounded-xl border px-4 py-3 text-left transition-colors',
                trigger === t.key ? 'border-[#6366f1]/50 bg-[#6366f1]/8' : 'border-[var(--border)] hover:bg-[var(--panel-2)]')}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--mkt-text-dim)]">
                <t.icon size={12} /> {t.label}
              </div>
              <div className={cn('mt-1 text-2xl font-bold tabular-nums', t.tone)}>{c.total.toLocaleString()}</div>
              <div className="text-[10.5px] text-[var(--mkt-text-dim)]">성공 {c.ok.toLocaleString()} · {c.points.toLocaleString()}P</div>
            </button>
          )
        })}
      </div>

      <MktPanel
        icon={BellRing}
        title={`발송 내역 (${total.toLocaleString()}건)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="input !py-1.5 text-xs" data-f="kind">
              {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input !py-1.5 text-xs" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input !py-1.5 text-xs" />
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--mkt-text-dim)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(1) } }}
                placeholder="수신·회원·내용" className="input w-40 !pl-7 !py-1.5 text-xs" data-f="q" />
            </div>
            <button onClick={() => { setPage(1); load(1) }} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]">검색</button>
            <a href={`/api/admin/notify-log?${params({ format: 'csv' }).toString()}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]" data-f="dl-csv">
              <Download size={12} /> CSV
            </a>
            <a href={`/api/admin/notify-log?${params({ format: 'xlsx' }).toString()}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]">
              <Download size={12} /> 엑셀
            </a>
            <button onClick={() => load(page)} className="text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]">
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            </button>
          </div>
        }
      >
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--mkt-text-dim)]">{loading ? '불러오는 중…' : '해당하는 발송 내역이 없습니다.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--mkt-text-soft)]">
                  <th className="py-2 font-semibold">일시</th>
                  <th className="py-2 font-semibold">구분</th>
                  <th className="py-2 font-semibold">채널</th>
                  <th className="py-2 font-semibold">회원</th>
                  <th className="py-2 font-semibold">수신</th>
                  <th className="py-2 font-semibold">랜딩페이지</th>
                  <th className="py-2 font-semibold">내용</th>
                  <th className="py-2 text-right font-semibold">P</th>
                  <th className="py-2 font-semibold">결과</th>
                </tr>
              </thead>
              <tbody data-f="rows">
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-2)]">
                    <td className="whitespace-nowrap py-2 text-[11.5px] text-[var(--mkt-text-dim)]">{kst(r.created_at)}</td>
                    <td className="py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold',
                        r.trigger === 'auto' ? 'bg-[#6366f1]/12 text-[#6366f1]'
                          : r.trigger === 'campaign' ? 'bg-[#ffd66b]/15 text-[#b45309]'
                          : r.trigger === 'manual' ? 'bg-[#0ea5e9]/12 text-[#0284c7]'
                          : 'bg-[var(--panel-2)] text-[var(--mkt-text-dim)]')}>{r.triggerLabel}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 text-[11.5px]">{r.kindLabel}</td>
                    <td className="py-2 text-[11.5px]">
                      <span className="font-semibold">{r.owner || '-'}</span>
                      {r.owner_email && <span className="ml-1 text-[10.5px] text-[var(--mkt-text-dim)]">{r.owner_email}</span>}
                    </td>
                    <td className="whitespace-nowrap py-2 text-[11.5px] tabular-nums">
                      {r.recipient || '-'}
                      {r.recipient_name && <span className="ml-1 text-[10.5px] text-[var(--mkt-text-dim)]">{r.recipient_name}</span>}
                    </td>
                    <td className="max-w-[140px] truncate py-2 text-[11.5px] text-[var(--mkt-text-dim)]">{r.landing_title || '-'}</td>
                    <td className="max-w-[240px] truncate py-2 text-[11.5px]">{r.subject ? `[${r.subject}] ` : ''}{r.content}</td>
                    <td className="py-2 text-right tabular-nums text-[11.5px]">{r.points ? r.points.toLocaleString() : '-'}</td>
                    <td className="py-2">
                      {r.ok
                        ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669]"><CheckCircle2 size={12} /> 성공</span>
                        : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#e11d48]" title={r.reason}><XCircle size={12} /> 실패</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > pageSize && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-[var(--border)] px-2 py-1 disabled:opacity-40"><ChevronLeft size={14} /></button>
            <span className="tabular-nums text-[var(--mkt-text-dim)]">{page} / {lastPage}</span>
            <button disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[var(--border)] px-2 py-1 disabled:opacity-40"><ChevronRight size={14} /></button>
          </div>
        )}
      </MktPanel>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-[15px] font-bold">{open.triggerLabel} · {open.kindLabel}</h3>
            <dl className="space-y-1.5 text-[12.5px]">
              {[
                ['일시', kst(open.created_at)],
                ['회원', `${open.owner || '-'} ${open.owner_email || ''}`],
                ['수신', `${open.recipient || '-'} ${open.recipient_name || ''}`],
                ['랜딩페이지', open.landing_title ? `${open.landing_title} (${open.landing_slug})` : '-'],
                ['이벤트', open.event || '-'],
                ['제목', open.subject || '-'],
                ['차감 포인트', open.points ? `${open.points.toLocaleString()}P` : '-'],
                ['결과', open.ok ? '성공' : `실패 — ${open.reason || '사유 없음'}`],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-20 flex-shrink-0 text-[var(--mkt-text-dim)]">{k}</dt>
                  <dd className="min-w-0 flex-1 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-[12.5px] leading-relaxed">
              {open.content || '(내용 없음)'}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              {open.user_id && (
                <a href={`${ADMIN_BASE}/leads?userId=${encodeURIComponent(open.user_id)}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]">이 회원 신청 DB</a>
              )}
              <button onClick={() => setOpen(null)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]">닫기</button>
            </div>
          </div>
        </div>
      )}
    </MktCanvas>
  )
}
