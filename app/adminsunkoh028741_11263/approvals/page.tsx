'use client'

import { useEffect, useState } from 'react'
import {
  BadgeCheck,
  Crown,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import {
  adminApprovals,
  adminApprovalAction,
  type PlanReq,
  type SenderReq,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function timeAgo(iso: string) {
  const d = +new Date(iso)
  if (Number.isNaN(d)) return ''
  const m = Math.floor((Date.now() - d) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function statusBadgeClass(status: string) {
  return status === 'approved'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'rejected'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-700'
}
function statusLabel(status: string) {
  return status === 'approved' ? '승인됨' : status === 'rejected' ? '반려됨' : '대기중'
}
function planBadgeClass(plan: string | null) {
  return plan === 'Business'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : plan === 'Pro'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}

function MemberCell({ name, email }: { name: string | null; email: string | null }) {
  const initial = (name || email || '?').slice(0, 1).toUpperCase()
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
        {initial}
      </span>
      <div className="min-w-0">
        <p className="font-medium">{name || '이름 없음'}</p>
        <p className="truncate text-xs text-[var(--text-dim)]">{email || '-'}</p>
      </div>
    </div>
  )
}

export default function AdminApprovalsPage() {
  const [planRequests, setPlanRequests] = useState<PlanReq[]>([])
  const [senderNumbers, setSenderNumbers] = useState<SenderReq[]>([])
  const [stats, setStats] = useState<{ pendingPlans: number; pendingSenders: number }>({
    pendingPlans: 0,
    pendingSenders: 0,
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)
  function showToast(msg: string, kind: 'ok' | 'err' = 'ok') {
    setToast({ msg, kind })
  }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(t)
  }, [toast])

  function reload() {
    adminApprovals().then((r) => {
      setPlanRequests(r.planRequests)
      setSenderNumbers(r.senderNumbers)
      setStats(
        r.stats ?? {
          pendingPlans: r.planRequests.filter((p) => p.status === 'pending').length,
          pendingSenders: r.senderNumbers.filter((s) => s.status === 'pending').length,
        },
      )
      setLoading(false)
    })
  }
  useEffect(() => {
    reload()
  }, [])

  async function decide(type: 'plan' | 'sender', id: string, decision: 'approve' | 'reject') {
    setBusy(`${type}:${id}:${decision}`)
    const r = await adminApprovalAction(type, id, decision)
    setBusy(null)
    if (r.ok) {
      showToast(decision === 'approve' ? '요청을 승인했습니다.' : '요청을 반려했습니다.', 'ok')
      reload()
    } else {
      showToast(r.error || '처리 중 오류가 발생했습니다.', 'err')
    }
  }

  function ActionCell({ type, id }: { type: 'plan' | 'sender'; id: string }) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="primary"
          size="sm"
          className="!bg-gradient-to-br !from-emerald-500 !to-green-500"
          disabled={busy !== null}
          onClick={() => decide(type, id, 'approve')}
        >
          <CheckCircle2 size={15} /> 승인
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
          disabled={busy !== null}
          onClick={() => decide(type, id, 'reject')}
        >
          <XCircle size={15} /> 반려
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BadgeCheck}
        eyebrow="ADMIN · 승인"
        title="승인 관리"
        desc="플랜 변경과 발신번호 등록 요청을 승인/반려합니다."
        accent={ACCENT}
        action={
          <Button variant="outline" size="sm" onClick={reload} disabled={loading || busy !== null}>
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* stats */}
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="대기중 플랜"
              value={(<Counter to={stats.pendingPlans} />) as unknown as string}
              icon={Crown}
              accent="#7c3aed"
            />
            <StatCard
              label="대기중 발신번호"
              value={(<Counter to={stats.pendingSenders} />) as unknown as string}
              icon={Phone}
              accent="#0ea5e9"
            />
          </div>
        </Reveal>

        {/* 플랜 변경 요청 */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Crown size={16} className="text-violet-600" /> 플랜 변경 요청
                {stats.pendingPlans > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Clock size={11} /> {stats.pendingPlans} 대기
                  </span>
                )}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">회원</th>
                    <th className="pb-2.5 font-medium">플랜 변경</th>
                    <th className="pb-2.5 font-medium">신청일</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {planRequests.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <MemberCell name={p.name} email={p.email} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Badge className={planBadgeClass(p.from_plan)}>{p.from_plan || '없음'}</Badge>
                          <span className="text-[var(--text-dim)]">→</span>
                          <Badge className={planBadgeClass(p.to_plan)}>{p.to_plan}</Badge>
                        </div>
                        {p.memo && <p className="mt-1 truncate text-xs text-[var(--text-dim)]">“{p.memo}”</p>}
                      </td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">
                        {fmtDate(p.created_at)}
                        <span className="ml-1 text-xs text-[var(--text-dim)]">· {timeAgo(p.created_at)}</span>
                      </td>
                      <td className="py-3">
                        <Badge className={statusBadgeClass(p.status)}>{statusLabel(p.status)}</Badge>
                      </td>
                      <td className="py-3">
                        {p.status === 'pending' ? (
                          <ActionCell type="plan" id={p.id} />
                        ) : (
                          <div className="text-right text-xs text-[var(--text-dim)]">
                            {p.decided_at ? fmtDate(p.decided_at) : '처리 완료'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {planRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '플랜 변경 요청이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        {/* 발신번호 등록 요청 */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Phone size={16} className="text-sky-600" /> 발신번호 등록 요청
                {stats.pendingSenders > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Clock size={11} /> {stats.pendingSenders} 대기
                  </span>
                )}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">회원</th>
                    <th className="pb-2.5 font-medium">번호</th>
                    <th className="pb-2.5 font-medium">라벨</th>
                    <th className="pb-2.5 font-medium">신청일</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {senderNumbers.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <MemberCell name={s.name} email={s.email} />
                      </td>
                      <td className="py-3">
                        <span className="flex items-center gap-1.5 font-mono font-medium">
                          <Phone size={13} className="text-[var(--text-dim)]" />
                          {s.phone}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">{s.label || '-'}</td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">
                        {fmtDate(s.created_at)}
                        <span className="ml-1 text-xs text-[var(--text-dim)]">· {timeAgo(s.created_at)}</span>
                      </td>
                      <td className="py-3">
                        <Badge className={statusBadgeClass(s.status)}>{statusLabel(s.status)}</Badge>
                      </td>
                      <td className="py-3">
                        {s.status === 'pending' ? (
                          <ActionCell type="sender" id={s.id} />
                        ) : (
                          <div className="text-right text-xs text-[var(--text-dim)]">
                            {s.decided_at ? fmtDate(s.decided_at) : '처리 완료'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {senderNumbers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '발신번호 등록 요청이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      </div>

      {/* toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-fade-in',
            toast.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700',
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
