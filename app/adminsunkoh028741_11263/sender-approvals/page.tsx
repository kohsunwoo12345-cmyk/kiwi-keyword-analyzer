'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Phone, RefreshCw, Check, X, Trash2, Loader2, FileText, Eye, AlertTriangle, Search } from 'lucide-react'
import { MktCanvas, MktHeader, MktPanel } from '@/components/marketing/node'
import { adminSenders, adminSenderAction, type AdminSender } from '@/lib/auth'
import { cn } from '@/lib/utils'

const kst = (iso?: string | null) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso || '-' }
}
const fmtPhone = (p: string) => (p || '').replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3')

const TABS: { key: string; label: string }[] = [
  { key: 'pending', label: '승인 대기' },
  { key: 'draft', label: '서류 준비중' },
  { key: 'approved', label: '승인 완료' },
  { key: 'rejected', label: '반려' },
  { key: 'all', label: '전체' },
]

export default function SenderApprovalsPage() {
  const [rows, setRows] = useState<AdminSender[]>([])
  const [count, setCount] = useState<any>({})
  const [envSender, setEnvSender] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    setLoading(true)
    const r = await adminSenders()
    setRows(r.senders || [])
    setCount(r.count || {})
    setEnvSender(r.envSender || null)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const list = useMemo(() => {
    const kw = q.trim().replace(/[^0-9a-zA-Z가-힣@.]/g, '')
    return rows.filter((s) => {
      if (tab !== 'all' && s.status !== tab) return false
      if (!kw) return true
      return [s.phone, s.ownerName, s.ownerEmail, s.holderName, s.bizNo, s.label].some((v) => String(v || '').includes(kw))
    })
  }, [rows, tab, q])

  async function act(action: 'approve' | 'reject' | 'delete', s: AdminSender) {
    let reason = ''
    if (action === 'reject') {
      const r = prompt(`반려 사유를 입력하세요. (회원에게 그대로 전달됩니다)\n${fmtPhone(s.phone)} · ${s.ownerName}`, '제출 서류가 흐릿해 명의 확인이 어렵습니다.')
      if (r === null) return
      reason = r.trim() || '제출 서류가 확인되지 않았습니다.'
    }
    if (action === 'delete' && !confirm('이 신청과 첨부 서류를 모두 삭제할까요?')) return
    setBusy(s.id); setMsg(null)
    const r = await adminSenderAction(action, s.id, reason)
    setBusy('')
    setMsg(r.ok
      ? { ok: true, text: action === 'approve' ? '승인했습니다.' : action === 'reject' ? '반려 처리했습니다.' : '삭제했습니다.' }
      : { ok: false, text: r.error || '처리 실패' })
    load()
  }

  return (
    <MktCanvas>
      <MktHeader
        icon={ShieldCheck}
        eyebrow="SENDER APPROVAL"
        title="발신번호 승인"
        desc="회원이 제출한 발신번호 사전등록 신청을 심사합니다. 전기통신사업법상 명의 증빙 서류(통신서비스 이용증명원·사업자등록증·신분증 등)가 모두 첨부되어야 승인할 수 있으며, 서류가 하나라도 빠지면 승인 버튼이 열리지 않습니다."
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        {[
          { k: 'pending', label: '승인 대기', tone: 'text-[#b45309]' },
          { k: 'draft', label: '서류 준비중', tone: 'text-[var(--mkt-text-dim)]' },
          { k: 'approved', label: '승인 완료', tone: 'text-[#059669]' },
          { k: 'rejected', label: '반려', tone: 'text-[#e11d48]' },
        ].map((c) => (
          <button key={c.k} onClick={() => setTab(c.k)}
            className={cn('rounded-xl border px-4 py-3 text-left transition-colors',
              tab === c.k ? 'border-[#6366f1]/50 bg-[#6366f1]/8' : 'border-[var(--border)] hover:bg-[var(--panel-2)]')}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--mkt-text-dim)]">{c.label}</div>
            <div className={cn('mt-1 text-2xl font-bold tabular-nums', c.tone)}>{Number(count?.[c.k] || 0)}</div>
          </button>
        ))}
      </div>

      <MktPanel
        icon={Phone}
        title="신청 목록"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--mkt-text-dim)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="번호·회원·상호" className="input w-40 !pl-7 !py-1.5 text-xs" />
            </div>
            <select value={tab} onChange={(e) => setTab(e.target.value)} className="input !py-1.5 text-xs">
              {TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <button onClick={load} className="text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /></button>
          </div>
        }
      >
        {envSender && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-[#10b981]/15 px-2.5 py-1 text-xs font-semibold text-[#059669]">
            <ShieldCheck size={12} /> 시스템 기본 발신번호: {fmtPhone(envSender)}
          </div>
        )}
        {msg && (
          <div className={cn('mb-3 rounded-lg px-3 py-2 text-sm font-semibold',
            msg.ok ? 'bg-[#10b981]/12 text-[#059669]' : 'bg-[#ff9b9b]/12 text-[#e11d48]')}>{msg.text}</div>
        )}

        {list.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--mkt-text-dim)]">{loading ? '불러오는 중…' : '해당하는 신청이 없습니다.'}</div>
        ) : (
          <div className="space-y-2.5">
            {list.map((s) => {
              const docs = s.docs || []
              const missing = s.missing || []
              return (
                <div key={s.id} className="rounded-xl border border-[var(--border)] p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold tabular-nums">{fmtPhone(s.phone)}</span>
                    {s.label && <span className="text-xs text-[var(--mkt-text-dim)]">{s.label}</span>}
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold',
                      s.status === 'approved' ? 'bg-[#10b981]/15 text-[#059669]'
                        : s.status === 'pending' ? 'bg-[#ffd66b]/15 text-[#b45309]'
                        : s.status === 'rejected' ? 'bg-[#ff9b9b]/15 text-[#e11d48]'
                        : 'bg-[var(--panel-2)] text-[var(--mkt-text-dim)]')}>
                      {s.statusLabel || s.status}
                    </span>
                    {s.thirdParty && <span className="rounded-full bg-[#6366f1]/12 px-2 py-0.5 text-[10px] font-bold text-[#6366f1]">타인 명의</span>}
                    <span className="ml-auto text-[11px] text-[var(--mkt-text-dim)]">
                      신청 {kst(s.createdAt)}{s.submittedAt ? ` · 제출 ${kst(s.submittedAt)}` : ''}{s.decidedAt ? ` · 처리 ${kst(s.decidedAt)}` : ''}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--mkt-text-dim)]">
                    <span>회원 <b className="text-[var(--mkt-text-soft)]">{s.ownerName}</b>{s.ownerEmail ? ` (${s.ownerEmail})` : ''}</span>
                    <span>명의 <b className="text-[var(--mkt-text-soft)]">{s.holderName || '-'}</b> · {s.applicantTypeLabel || '-'}</span>
                    {s.bizNo && <span>사업자번호 {s.bizNo}</span>}
                  </div>

                  {/* 첨부 서류 — 심사자가 바로 열어볼 수 있게 */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {docs.length === 0 && <span className="text-[11.5px] text-[var(--mkt-text-dim)]">첨부된 서류가 없습니다.</span>}
                    {docs.map((d) => (
                      <a key={d.id} href={d.url} target="_blank" rel="noreferrer"
                        className="group flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1.5 hover:border-[#6366f1]/50">
                        {d.contentType.startsWith('image/')
                          ? <img src={d.url} alt={d.label} className="h-9 w-9 rounded-md border border-[var(--border)] object-cover" />
                          : <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--panel)] text-[var(--mkt-text-dim)]"><FileText size={14} /></span>}
                        <span className="text-[11.5px]">
                          <b className="block text-[var(--mkt-text-soft)]">{d.label}</b>
                          <span className="text-[10.5px] text-[var(--mkt-text-dim)]">{d.fileName || '첨부'}</span>
                        </span>
                        <Eye size={12} className="text-[var(--mkt-text-dim)] group-hover:text-[#6366f1]" />
                      </a>
                    ))}
                  </div>

                  {missing.length > 0 && (
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-[#ff9b9b]/10 px-2.5 py-1.5 text-[11.5px] font-medium text-[#e11d48]">
                      <AlertTriangle size={13} className="mt-px flex-shrink-0" />
                      <span>미첨부 서류: {missing.map((m) => m.label).join(', ')} — 서류가 모두 제출돼야 승인할 수 있습니다.</span>
                    </div>
                  )}
                  {s.status === 'rejected' && s.rejectReason && (
                    <div className="mt-2.5 rounded-lg bg-[var(--panel-2)] px-2.5 py-1.5 text-[11.5px] text-[var(--mkt-text-dim)]">
                      반려 사유 · {s.rejectReason}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
                    <button
                      data-act="approve"
                      onClick={() => act('approve', s)}
                      disabled={!s.canApprove || busy === s.id || s.status === 'approved'}
                      className="mkt-btn"
                    >
                      {busy === s.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} 승인
                    </button>
                    <button data-act="reject" onClick={() => act('reject', s)} disabled={busy === s.id || s.status === 'rejected'}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[#b45309] hover:bg-[var(--panel-2)] disabled:opacity-40">
                      <X size={13} /> 반려
                    </button>
                    {!s.canApprove && s.status !== 'approved' && (
                      <span className="text-[11px] text-[var(--mkt-text-dim)]">필수 서류가 모두 첨부되면 승인할 수 있습니다.</span>
                    )}
                    <button data-act="delete" onClick={() => act('delete', s)} disabled={busy === s.id}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--mkt-text-dim)] hover:border-[#e11d48]/40 hover:text-[#e11d48] disabled:opacity-40">
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MktPanel>
    </MktCanvas>
  )
}
