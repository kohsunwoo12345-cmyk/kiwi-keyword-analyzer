'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, CheckCircle2, XCircle, RefreshCw, Clock, Coins } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { adminApprovals, adminApprovalAction, type CreditReq } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

// 한국 표준시(KST, Asia/Seoul) — 관리자 브라우저 시간대와 무관하게 항상 한국 시간으로 표시.
function fmtKST(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce((a, x) => ((a[x.type] = x.value), a), {} as Record<string, string>)
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
}
function statusLabel(s: string) { return s === 'approved' ? '승인됨' : s === 'rejected' ? '반려됨' : '승인 대기' }
function statusClass(s: string) {
  return s === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : s === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-700'
}

export default function CreditApprovalsPage() {
  const [rows, setRows] = useState<CreditReq[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const r = await adminApprovals()
      setRows(r.creditRequests || [])
    } catch { /* noop */ } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function decide(id: string, decision: 'approve' | 'reject') {
    if (decision === 'reject' && !confirm('이 크레딧 충전 신청을 반려할까요?')) return
    setBusy(id)
    try {
      const res = await adminApprovalAction('credit', id, decision)
      if (!res.ok) { alert(res.error || '처리에 실패했습니다.'); return }
      await load()
    } finally { setBusy(null) }
  }

  const pending = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows])
  const history = useMemo(() => rows.filter((r) => r.status !== 'pending'), [rows])
  const pendingCredits = useMemo(() => pending.reduce((s, r) => s + (Number(r.amount) || 0), 0), [pending])
  const pendingWon = useMemo(() => pending.reduce((s, r) => s + (Number(r.price) || 0), 0), [pending])

  function Row({ r, actionable }: { r: CreditReq; actionable: boolean }) {
    return (
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:grid-cols-[1.1fr_1.4fr_auto] md:items-center">
        {/* 회원 정보: 아이디 / 이름 / 이메일 */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-mono text-[13px] font-semibold text-[var(--text)]">{r.user_id}</span>
            <span className="text-sm font-medium text-[var(--text)]">{r.name || '(이름 없음)'}</span>
          </div>
          <div className="truncate text-xs text-[var(--text-soft)]">{r.email || '-'}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--text-soft)]">
            <Clock className="h-3 w-3" /> 신청 {fmtKST(r.created_at)} <span className="text-[var(--text-soft)]">(KST)</span>
          </div>
        </div>
        {/* 충전 내용 */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="inline-flex items-center gap-1 text-[15px] font-bold text-violet-700">
              <Coins className="h-4 w-4" /> {Number(r.amount).toLocaleString()} 크레딧
            </span>
            {Number(r.price) > 0 && <span className="text-sm text-[var(--text-soft)]">₩{Number(r.price).toLocaleString()}</span>}
          </div>
          {r.memo && <div className="mt-0.5 truncate text-xs text-[var(--text-soft)]">메모: {r.memo}</div>}
          {r.decided_at && <div className="mt-0.5 text-[11px] text-[var(--text-soft)]">처리 {fmtKST(r.decided_at)} (KST)</div>}
        </div>
        {/* 액션 / 상태 */}
        <div className="flex items-center justify-start gap-2 md:justify-end">
          {actionable ? (
            <>
              <Button size="sm" variant="primary" disabled={busy === r.id} onClick={() => decide(r.id, 'approve')}>
                <CheckCircle2 className="h-4 w-4" /> 승인
              </Button>
              <Button size="sm" variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50" disabled={busy === r.id} onClick={() => decide(r.id, 'reject')}>
                <XCircle className="h-4 w-4" /> 반려
              </Button>
            </>
          ) : (
            <Badge className={cn(statusClass(r.status))}>{statusLabel(r.status)}</Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        icon={CreditCard}
        eyebrow="ADMIN"
        title="크레딧 충전 승인"
        desc="회원이 신청한 크레딧 충전을 확인하고 승인/반려합니다. 승인 시 즉시 크레딧이 지급됩니다."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="승인 대기" value={String(pending.length)} icon={Clock} accent="#f59e0b" />
          <StatCard label="대기 크레딧 합계" value={pendingCredits.toLocaleString()} icon={Coins} accent={ACCENT} />
          <StatCard label="대기 결제금액" value={'₩' + pendingWon.toLocaleString()} icon={CreditCard} accent="#0ea5e9" />
        </div>

        <Panel
          title={`승인 대기 (${pending.length})`}
          action={<Button size="sm" variant="outline" onClick={load}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> 새로고침</Button>}
        >
          {loading ? (
            <div className="py-10 text-center text-sm text-[var(--text-soft)]">불러오는 중…</div>
          ) : pending.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--text-soft)]">승인 대기 중인 크레딧 충전 신청이 없습니다.</div>
          ) : (
            <div className="space-y-3">{pending.map((r) => <Row key={r.id} r={r} actionable />)}</div>
          )}
        </Panel>

        {history.length > 0 && (
          <Panel title={`처리 내역 (${history.length})`}>
            <div className="space-y-3">{history.map((r) => <Row key={r.id} r={r} actionable={false} />)}</div>
          </Panel>
        )}
      </div>
    </div>
  )
}
