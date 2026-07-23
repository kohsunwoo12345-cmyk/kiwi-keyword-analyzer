'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Crown,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Coins,
  Users,
  Download,
  Mail,
  Building2,
  CreditCard,
  Inbox,
  Database,
  MapPin,
  History,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import {
  adminApprovals,
  adminApprovalAction,
  type PlanReq,
  type SenderReq,
  type PointReq,
  type CreditReq,
  type TeamOrderReq,
  type User,
  type ContactMsg,
  type PublicLead,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

// 한국 표준시(KST, Asia/Seoul) 기준으로 표시 — 관리자 브라우저 시간대와 무관하게 항상 한국 시간.
function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce((a, p) => ((a[p.type] = p.value), a), {} as Record<string, string>)
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
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
  return plan === 'Max'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : plan === 'Pro'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : plan === 'Plus'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}
function planLabel(plan: string | null) {
  return !plan || plan === '없음' ? '미가입' : plan
}
// 플랜 트랙 (마케터 / AI 영상) 배지
function trackBadgeClass(track: string | null) {
  return track === 'video'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-violet-200 bg-violet-50 text-violet-700'
}
function trackLabel(track: string | null) {
  return track === 'video' ? 'AI 영상' : '마케터'
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  if (typeof document === 'undefined') return
  const esc = (v: string) => {
    const s = v == null ? '' : String(v)
    return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers, ...rows].map((r) => r.map(esc).join(','))
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
  const [pointRequests, setPointRequests] = useState<PointReq[]>([])
  const [creditRequests, setCreditRequests] = useState<CreditReq[]>([])
  const [teamOrders, setTeamOrders] = useState<TeamOrderReq[]>([])
  const [signups, setSignups] = useState<User[]>([])
  const [contacts, setContacts] = useState<ContactMsg[]>([])
  const [leads, setLeads] = useState<PublicLead[]>([])
  const [stats, setStats] = useState<{
    pendingPlans: number
    pendingSenders: number
    pendingPoints: number
    pendingCredits: number
    pendingTeam?: number
    totalMembers: number
    newContacts?: number
    leadsTotal?: number
  }>({
    pendingPlans: 0,
    pendingSenders: 0,
    pendingPoints: 0,
    pendingCredits: 0,
    pendingTeam: 0,
    totalMembers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [histFilter, setHistFilter] = useState<'approved' | 'rejected' | 'all'>('approved')

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
      setPointRequests(r.pointRequests)
      setCreditRequests(r.creditRequests)
      setTeamOrders(r.teamOrders || [])
      setSignups(r.signups)
      setContacts(r.contacts)
      setLeads(r.leads)
      setStats(
        r.stats ?? {
          pendingPlans: r.planRequests.filter((p) => p.status === 'pending').length,
          pendingSenders: r.senderNumbers.filter((s) => s.status === 'pending').length,
          pendingPoints: r.pointRequests.filter((p) => p.status === 'pending').length,
          pendingCredits: r.creditRequests.filter((c) => c.status === 'pending').length,
          pendingTeam: (r.teamOrders || []).filter((c) => c.status === 'pending').length,
          totalMembers: r.signups.length,
        },
      )
      setLoading(false)
    })
  }
  useEffect(() => {
    reload()
  }, [])

  async function decide(
    type: 'plan' | 'sender' | 'point' | 'credit' | 'team',
    id: string,
    decision: 'approve' | 'reject',
  ) {
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

  function ActionCell({ type, id }: { type: 'plan' | 'sender' | 'point' | 'credit' | 'team'; id: string }) {
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

  const filteredSignups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return signups
    return signups.filter((u) =>
      [u.name, u.email, u.company, u.phone || ''].some((f) => f.toLowerCase().includes(q)),
    )
  }, [signups, query])

  // 승인 내역 — 처리 완료(승인/반려)된 모든 요청을 한 곳에 모아 최근 처리순으로. 처리시각은 KST 기준.
  type HistoryRow = {
    key: string; name: string | null; email: string | null
    category: string; detail: string; status: 'approved' | 'rejected'; decidedAt: string
  }
  const approvalHistory = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = []
    for (const p of planRequests) {
      if (p.status !== 'approved' && p.status !== 'rejected') continue
      rows.push({
        key: 'plan:' + p.id, name: p.name, email: p.email, category: '플랜 변경',
        detail: `${trackLabel(p.track)} · ${planLabel(p.from_plan)} → ${planLabel(p.to_plan)}`,
        status: p.status as 'approved' | 'rejected', decidedAt: p.decided_at || p.created_at,
      })
    }
    for (const p of pointRequests) {
      if (p.status !== 'approved' && p.status !== 'rejected') continue
      rows.push({
        key: 'point:' + p.id, name: p.name, email: p.email, category: '포인트 지급',
        detail: `${p.amount.toLocaleString()}P${p.memo ? ' · ' + p.memo : ''}`,
        status: p.status as 'approved' | 'rejected', decidedAt: p.decided_at || p.created_at,
      })
    }
    for (const c of creditRequests) {
      if (c.status !== 'approved' && c.status !== 'rejected') continue
      rows.push({
        key: 'credit:' + c.id, name: c.name, email: c.email, category: '크레딧 충전',
        detail: `${c.amount.toLocaleString()}개${c.price > 0 ? ' · ' + c.price.toLocaleString() + '원' : ''}`,
        status: c.status as 'approved' | 'rejected', decidedAt: c.decided_at || c.created_at,
      })
    }
    for (const t of teamOrders) {
      if (t.status !== 'paid' && t.status !== 'failed') continue
      rows.push({
        key: 'team:' + t.id, name: t.name, email: t.email, category: '팀 요금제',
        detail: `${t.seats}좌석 · ${t.months}개월${t.amount > 0 ? ' · ' + t.amount.toLocaleString() + '원' : ''}`,
        status: t.status === 'paid' ? 'approved' : 'rejected', decidedAt: t.paid_at || t.created_at,
      })
    }
    for (const s of senderNumbers) {
      if (s.status !== 'approved' && s.status !== 'rejected') continue
      rows.push({
        key: 'sender:' + s.id, name: s.name, email: s.email, category: '발신번호',
        detail: `${s.phone}${s.label ? ' · ' + s.label : ''}`,
        status: s.status as 'approved' | 'rejected', decidedAt: s.decided_at || s.created_at,
      })
    }
    const filtered = histFilter === 'all' ? rows : rows.filter((r) => r.status === histFilter)
    return filtered.sort((a, b) => +new Date(b.decidedAt) - +new Date(a.decidedAt))
  }, [planRequests, pointRequests, creditRequests, teamOrders, senderNumbers, histFilter])

  const approvedCount = useMemo(
    () =>
      planRequests.filter((r) => r.status === 'approved').length +
      pointRequests.filter((r) => r.status === 'approved').length +
      creditRequests.filter((r) => r.status === 'approved').length +
      teamOrders.filter((r) => r.status === 'paid').length +
      senderNumbers.filter((r) => r.status === 'approved').length,
    [planRequests, pointRequests, creditRequests, teamOrders, senderNumbers],
  )

  function exportSignupsCsv() {
    const headers = [
      '이름',
      '이메일',
      '회사',
      '연락처',
      '마케터플랜',
      '영상플랜',
      '상태',
      '포인트',
      '크레딧',
      '가입일',
      '최근접속',
    ]
    const rows = filteredSignups.map((u) => [
      u.name,
      u.email,
      u.company || '',
      u.phone || '',
      planLabel(u.plan),
      planLabel(u.videoPlan),
      u.status === 'active' ? '활성' : '정지',
      String(u.points),
      String(u.credits),
      fmtDate(u.createdAt),
      u.lastActive ? fmtDate(u.lastActive) : '기록 없음',
    ])
    downloadCsv('members.csv', headers, rows)
    showToast('회원 정보를 CSV로 내보냈습니다.', 'ok')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BadgeCheck}
        eyebrow="ADMIN · 승인"
        title="승인 관리"
        desc="플랜 변경·발신번호·포인트 지급 요청을 승인/반려하고 회원가입 정보를 확인합니다."
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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
            <StatCard
              label="대기중 포인트"
              value={(<Counter to={stats.pendingPoints} />) as unknown as string}
              icon={Coins}
              accent="#f59e0b"
            />
            <StatCard
              label="대기중 크레딧"
              value={(<Counter to={stats.pendingCredits} />) as unknown as string}
              icon={Coins}
              accent="#f59e0b"
            />
            <StatCard
              label="전체 회원"
              value={(<Counter to={stats.totalMembers} />) as unknown as string}
              icon={Users}
              accent="#10b981"
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
                    <th className="pb-2.5 font-medium">트랙</th>
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
                        <Badge className={trackBadgeClass(p.track)}>{trackLabel(p.track)}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Badge className={planBadgeClass(p.from_plan)}>{planLabel(p.from_plan)}</Badge>
                          <span className="text-[var(--text-dim)]">→</span>
                          <Badge className={planBadgeClass(p.to_plan)}>{planLabel(p.to_plan)}</Badge>
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
                      <td colSpan={6} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '플랜 변경 요청이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        {/* 포인트 지급 승인 */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Coins size={16} className="text-amber-500" /> 포인트 지급 승인
                {stats.pendingPoints > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Clock size={11} /> {stats.pendingPoints} 대기
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
                    <th className="pb-2.5 font-medium">지급 포인트</th>
                    <th className="pb-2.5 font-medium">메모</th>
                    <th className="pb-2.5 font-medium">신청일</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {pointRequests.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <MemberCell name={p.name} email={p.email} />
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-amber-600">
                          {p.amount.toLocaleString()}P
                        </span>
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">{p.memo || '-'}</td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">
                        {fmtDate(p.created_at)}
                        <span className="ml-1 text-xs text-[var(--text-dim)]">· {timeAgo(p.created_at)}</span>
                      </td>
                      <td className="py-3">
                        <Badge className={statusBadgeClass(p.status)}>{statusLabel(p.status)}</Badge>
                      </td>
                      <td className="py-3">
                        {p.status === 'pending' ? (
                          <ActionCell type="point" id={p.id} />
                        ) : (
                          <div className="text-right text-xs text-[var(--text-dim)]">
                            {p.decided_at ? fmtDate(p.decided_at) : '처리 완료'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pointRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '포인트 지급 요청이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        {/* 크레딧 충전 승인 */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Coins size={16} className="text-amber-500" /> 크레딧 충전 승인
                {stats.pendingCredits > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Clock size={11} /> {stats.pendingCredits} 대기
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
                    <th className="pb-2.5 font-medium">충전 크레딧</th>
                    <th className="pb-2.5 font-medium">결제 금액</th>
                    <th className="pb-2.5 font-medium">메모</th>
                    <th className="pb-2.5 font-medium">신청일</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {creditRequests.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <MemberCell name={c.name} email={c.email} />
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-[#f59e0b]">
                          {c.amount.toLocaleString()}개
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">
                        {c.price > 0 ? c.price.toLocaleString() + '원' : '-'}
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">{c.memo || '-'}</td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">
                        {fmtDate(c.created_at)}
                        <span className="ml-1 text-xs text-[var(--text-dim)]">· {timeAgo(c.created_at)}</span>
                      </td>
                      <td className="py-3">
                        <Badge className={statusBadgeClass(c.status)}>{statusLabel(c.status)}</Badge>
                      </td>
                      <td className="py-3">
                        {c.status === 'pending' ? (
                          <ActionCell type="credit" id={c.id} />
                        ) : (
                          <div className="text-right text-xs text-[var(--text-dim)]">
                            {c.decided_at ? fmtDate(c.decided_at) : '처리 완료'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {creditRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '크레딧 충전 요청이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        {/* 팀 요금제 신청 (카드 미설정 시 승인 대기분) */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Users size={16} className="text-violet-600" /> 팀 요금제 신청
                {(stats.pendingTeam ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Clock size={11} /> {stats.pendingTeam} 대기
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
                    <th className="pb-2.5 font-medium">좌석</th>
                    <th className="pb-2.5 font-medium">개월</th>
                    <th className="pb-2.5 font-medium">결제 금액</th>
                    <th className="pb-2.5 font-medium">신청일</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {teamOrders.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                      <td className="py-3"><MemberCell name={c.name} email={c.email} /></td>
                      <td className="py-3"><span className="font-bold text-violet-600">{c.seats}좌석</span></td>
                      <td className="py-3 text-[var(--text-soft)]">{c.months}개월</td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">{c.amount.toLocaleString()}원</td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">
                        {fmtDate(c.created_at)}
                        <span className="ml-1 text-xs text-[var(--text-dim)]">· {timeAgo(c.created_at)}</span>
                      </td>
                      <td className="py-3"><Badge className={statusBadgeClass(c.status === 'paid' ? 'approved' : c.status === 'failed' ? 'rejected' : c.status)}>{c.status === 'paid' ? '활성' : c.status === 'failed' ? '반려' : statusLabel(c.status)}</Badge></td>
                      <td className="py-3">
                        {c.status === 'pending' ? (
                          <ActionCell type="team" id={c.id} />
                        ) : (
                          <div className="text-right text-xs text-[var(--text-dim)]">{c.paid_at ? fmtDate(c.paid_at) : '처리 완료'}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {teamOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '팀 요금제 신청이 없습니다.'}
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

        {/* 회원가입 정보 */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Users size={16} className="text-emerald-600" /> 회원가입 정보
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  전체 {signups.length}명
                </span>
              </span>
            }
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Mail
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="이름·이메일·회사·연락처 검색"
                    className="h-9 w-56 rounded-lg border border-[var(--border-soft)] bg-white pl-8 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={exportSignupsCsv} disabled={filteredSignups.length === 0}>
                  <Download size={15} /> CSV 내보내기
                </Button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">회원</th>
                    <th className="pb-2.5 font-medium">회사</th>
                    <th className="pb-2.5 font-medium">연락처</th>
                    <th className="pb-2.5 font-medium">플랜</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 text-right font-medium">포인트</th>
                    <th className="pb-2.5 text-right font-medium">크레딧</th>
                    <th className="pb-2.5 font-medium">가입일</th>
                    <th className="pb-2.5 font-medium">최근접속</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSignups.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <MemberCell name={u.name} email={u.email} />
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">
                        <span className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-[var(--text-dim)]" />
                          {u.company || '-'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 font-mono text-[var(--text-soft)]">
                        {u.phone || '-'}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[10px] font-medium text-[var(--text-dim)]">마케터</span>
                            <Badge className={planBadgeClass(u.plan)}>{planLabel(u.plan)}</Badge>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[10px] font-medium text-[var(--text-dim)]">영상</span>
                            <Badge className={planBadgeClass(u.videoPlan)}>{planLabel(u.videoPlan)}</Badge>
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            u.status === 'active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }
                        >
                          {u.status === 'active' ? '활성' : '정지'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap py-3 text-right font-medium text-amber-600">
                        {u.points.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap py-3 text-right text-[var(--text-soft)]">
                        <span className="inline-flex items-center gap-1">
                          <CreditCard size={13} className="text-[var(--text-dim)]" />
                          {u.credits.toLocaleString()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">{fmtDate(u.createdAt)}</td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">
                        {u.lastActive ? fmtDate(u.lastActive) : '기록 없음'}
                      </td>
                    </tr>
                  ))}
                  {filteredSignups.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-[var(--text-dim)]">
                        {loading
                          ? '불러오는 중…'
                          : query.trim()
                          ? '검색 결과가 없습니다.'
                          : '가입한 회원이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        {/* 문의 접수 (공개 문의 폼) */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Inbox size={16} className="text-sky-600" /> 문의 접수
                {(stats.newContacts ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    새 문의 {stats.newContacts}
                  </span>
                )}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">이름</th>
                    <th className="pb-2.5 font-medium">연락처</th>
                    <th className="pb-2.5 font-medium">회사</th>
                    <th className="pb-2.5 font-medium">문의 내용</th>
                    <th className="pb-2.5 font-medium">접수일</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border-soft)] last:border-0 align-top hover:bg-slate-50">
                      <td className="py-3 font-medium">{c.name || '-'}</td>
                      <td className="py-3 text-[var(--text-soft)]">
                        <div className="flex flex-col">
                          {c.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-[var(--text-dim)]" />{c.email}</span>}
                          {c.phone && <span className="flex items-center gap-1.5 font-mono"><Phone size={12} className="text-[var(--text-dim)]" />{c.phone}</span>}
                          {!c.email && !c.phone && '-'}
                        </div>
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">{c.company || '-'}</td>
                      <td className="max-w-[360px] py-3 text-[var(--text-soft)]">
                        <p className="whitespace-pre-wrap break-words">{c.message || '-'}</p>
                      </td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">
                        {fmtDate(c.created_at)}
                        <span className="ml-1 text-xs text-[var(--text-dim)]">· {timeAgo(c.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                  {contacts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '접수된 문의가 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        {/* 랜딩 DB 수집 리드 (공개 데모 폼) */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Database size={16} className="text-violet-600" /> 랜딩 DB 수집 리드
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  누적 {leads.length}건
                </span>
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">이름</th>
                    <th className="pb-2.5 font-medium">전화</th>
                    <th className="pb-2.5 font-medium">이메일</th>
                    <th className="pb-2.5 font-medium">유입 경로</th>
                    <th className="pb-2.5 font-medium">지역</th>
                    <th className="pb-2.5 font-medium">수집일</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                      <td className="py-3 font-medium">{l.name || '-'}</td>
                      <td className="whitespace-nowrap py-3 font-mono text-[var(--text-soft)]">{l.phone || '-'}</td>
                      <td className="py-3 text-[var(--text-soft)]">{l.email || '-'}</td>
                      <td className="py-3">
                        <Badge className="border-violet-200 bg-violet-50 text-violet-700">{l.source || 'landing'}</Badge>
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-[var(--text-dim)]" />{l.country || '-'}</span>
                      </td>
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">{fmtDate(l.created_at)}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '수집된 리드가 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        {/* 승인 내역 (처리 완료된 요청 모음 · 한국시간 KST) */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <History size={16} className="text-emerald-600" /> 승인 내역
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  승인 {approvedCount}건
                </span>
                <span className="text-[11px] font-normal text-[var(--text-dim)]">· 처리시각 한국 기준(KST)</span>
              </span>
            }
            action={
              <div className="flex items-center gap-1">
                {(
                  [
                    ['approved', '승인'],
                    ['rejected', '반려'],
                    ['all', '전체'],
                  ] as ['approved' | 'rejected' | 'all', string][]
                ).map(([f, l]) => (
                  <button
                    key={f}
                    onClick={() => setHistFilter(f)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                      histFilter === f
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">회원</th>
                    <th className="pb-2.5 font-medium">유형</th>
                    <th className="pb-2.5 font-medium">상세</th>
                    <th className="pb-2.5 font-medium">결과</th>
                    <th className="pb-2.5 text-right font-medium">처리 시각 (KST)</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalHistory.map((h) => (
                    <tr
                      key={h.key}
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <MemberCell name={h.name} email={h.email} />
                      </td>
                      <td className="py-3">
                        <Badge className="border-slate-200 bg-slate-50 text-slate-600">{h.category}</Badge>
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">{h.detail}</td>
                      <td className="py-3">
                        <Badge className={statusBadgeClass(h.status)}>{statusLabel(h.status)}</Badge>
                      </td>
                      <td className="whitespace-nowrap py-3 text-right text-[var(--text-soft)]">
                        {fmtDate(h.decidedAt)}
                        <span className="ml-1 text-xs text-[var(--text-dim)]">· {timeAgo(h.decidedAt)}</span>
                      </td>
                    </tr>
                  ))}
                  {approvalHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[var(--text-dim)]">
                        {loading
                          ? '불러오는 중…'
                          : histFilter === 'rejected'
                          ? '반려된 내역이 없습니다.'
                          : histFilter === 'approved'
                          ? '아직 승인된 내역이 없습니다.'
                          : '처리된 내역이 없습니다.'}
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
