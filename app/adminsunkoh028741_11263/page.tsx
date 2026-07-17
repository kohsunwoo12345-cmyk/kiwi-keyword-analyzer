'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Shield,
  Users,
  Activity,
  UserPlus,
  LogIn,
  CreditCard,
  Crown,
  ChevronRight,
  Download,
  KeyRound,
  Coins,
  Wallet,
  Bell,
  Phone,
  CheckCircle2,
  XCircle,
  FileText,
  Clapperboard,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { Panel, Badge, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { MemberPricing } from '@/components/admin/MemberPricing'
import {
  adminUsers,
  adminActivity,
  adminApprovals,
  adminApprovalAction,
  type User,
  type GlobalActivityRow,
  type CreditReq,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

const PLAN_COLORS: Record<string, string> = {
  '없음': '#cbd5e1',
  Plus: '#0ea5e9',
  Pro: '#7c3aed',
  Max: '#f59e0b',
}

// activity_log type → 표시 스타일
const ACT_STYLE: Record<string, { label: string; icon: any; badge: string; ring: string }> = {
  signup: { label: '가입', icon: UserPlus, badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', ring: 'from-emerald-500 to-green-500' },
  login: { label: '로그인', icon: LogIn, badge: 'border-sky-200 bg-sky-50 text-sky-700', ring: 'from-sky-500 to-cyan-500' },
  password: { label: '비밀번호', icon: KeyRound, badge: 'border-rose-200 bg-rose-50 text-rose-700', ring: 'from-rose-500 to-red-500' },
  point: { label: '포인트', icon: Coins, badge: 'border-amber-200 bg-amber-50 text-amber-700', ring: 'from-amber-500 to-orange-500' },
  credit: { label: '크레딧', icon: Wallet, badge: 'border-violet-200 bg-violet-50 text-violet-700', ring: 'from-violet-500 to-fuchsia-500' },
  plan: { label: '플랜', icon: Crown, badge: 'border-indigo-200 bg-indigo-50 text-indigo-700', ring: 'from-indigo-500 to-violet-500' },
  notify: { label: '알림', icon: Bell, badge: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700', ring: 'from-fuchsia-500 to-pink-500' },
  sender: { label: '발신번호', icon: Phone, badge: 'border-cyan-200 bg-cyan-50 text-cyan-700', ring: 'from-cyan-500 to-sky-500' },
}
function actStyle(type: string) {
  return ACT_STYLE[type] || { label: type || '활동', icon: FileText, badge: 'border-slate-200 bg-slate-50 text-slate-600', ring: 'from-slate-400 to-slate-500' }
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ago(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - +new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function planBadgeClass(plan: string) {
  return plan === 'Max'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : plan === 'Pro'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : plan === 'Plus'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}
function planLabel(plan: string) {
  return !plan || plan === '없음' ? '미가입' : plan
}

const DAY_MS = 86_400_000

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [activity, setActivity] = useState<GlobalActivityRow[]>([])
  const [creditPending, setCreditPending] = useState<CreditReq[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function loadApprovals() {
    adminApprovals().then((r) => setCreditPending(r.creditRequests.filter((c) => c.status === 'pending')))
  }
  useEffect(() => {
    adminUsers().then((r) => {
      setUsers(r.users)
      setReady(true)
    })
    adminActivity(60).then((r) => setActivity(r.activity))
    loadApprovals()
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function decideCredit(id: string, decision: 'approve' | 'reject') {
    setBusy(id + decision)
    const r = await adminApprovalAction('credit', id, decision)
    setBusy(null)
    if (r.ok) {
      setToast(decision === 'approve' ? '크레딧 충전을 승인했습니다.' : '충전 신청을 반려했습니다.')
      loadApprovals()
      adminActivity(60).then((r) => setActivity(r.activity))
    } else {
      setToast(r.error || '처리 실패')
    }
  }

  const now = Date.now()
  const total = users.length
  const todayStr = new Date().toISOString().slice(0, 10)
  const newToday = users.filter((u) => (u.createdAt || '').slice(0, 10) === todayStr).length
  const activeRecently = users.filter((u) => u.lastActive && now - +new Date(u.lastActive) < DAY_MS).length
  const paid = users.filter((u) => (u.plan && u.plan !== '없음') || (u.videoPlan && u.videoPlan !== '없음')).length

  // 마케터 플랜 분포 (도넛)
  const planDist = useMemo(() => {
    const base: Record<string, number> = { Plus: 0, Pro: 0, Max: 0 }
    for (const u of users) if (u.plan && u.plan !== '없음') base[u.plan] = (base[u.plan] || 0) + 1
    return (['Plus', 'Pro', 'Max'] as const).map((name) => ({
      name,
      value: base[name],
      color: PLAN_COLORS[name],
    }))
  }, [users])

  // AI 영상 플랜 분포 (부가 요약)
  const videoPlanDist = useMemo(() => {
    const base: Record<string, number> = { Plus: 0, Pro: 0, Max: 0 }
    for (const u of users) if (u.videoPlan && u.videoPlan !== '없음') base[u.videoPlan] = (base[u.videoPlan] || 0) + 1
    return (['Plus', 'Pro', 'Max'] as const).map((name) => ({
      name,
      value: base[name],
      color: PLAN_COLORS[name],
    }))
  }, [users])

  // 실제 가입일 기준 최근 7일 추이
  const signupTrend = useMemo(() => {
    const out: { name: string; 신규: number; 누적: number }[] = []
    const base = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(base.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const endOfDay = +new Date(key + 'T23:59:59')
      const 신규 = users.filter((u) => (u.createdAt || '').slice(0, 10) === key).length
      const 누적 = users.filter((u) => +new Date(u.createdAt) <= endOfDay).length
      out.push({ name: `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`, 신규, 누적 })
    }
    return out
  }, [users])

  const recent = useMemo(
    () => [...users].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6),
    [users],
  )

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Shield}
        eyebrow="ADMIN"
        title="관리자 대시보드"
        desc="가입 회원과 서비스 지표를 실제 데이터로 모니터링합니다."
        accent={ACCENT}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/admin/export-db?scope=marketing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
              title="마케팅 수신동의(marketing) 한 회원만 엑셀로 내려받습니다"
            >
              <Download size={15} /> 수신동의 회원
            </a>
            <a
              href="/api/admin/export-db?scope=members"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              title="전체(일반) 회원 명단을 엑셀로 내려받습니다"
            >
              <Download size={15} /> 전체 회원
            </a>
            <a
              href="/api/admin/export-db"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              title="주요 DB 테이블 전체를 하나의 엑셀(.xlsx)로 내려받습니다"
            >
              <Download size={15} /> 전체 DB
            </a>
            <Button href="/adminsunkoh028741_11263/users" size="sm">
              회원 관리 <ChevronRight size={16} />
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label="총 회원수" value={total} icon={Users} color="#7c3aed" />
            <StatBox label="오늘 가입" value={newToday} icon={UserPlus} color="#22c55e" />
            <StatBox label="최근 접속 (24h)" value={activeRecently} icon={Activity} color="#0ea5e9" live />
            <StatBox label="유료 회원" value={paid} icon={Crown} color="#f59e0b" />
          </div>
        </Reveal>

        {/* AI 영상 제작 바로가기 노드 (클링 AI 등 전 모델) */}
        <Reveal>
          <a
            href="/studio-nvc-prv-8b3k2/"
            className="group relative block overflow-hidden rounded-2xl border border-violet-300/40 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-600 p-6 text-white shadow-lg transition-all hover:shadow-2xl hover:-translate-y-0.5"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 right-24 h-32 w-32 rounded-full bg-fuchsia-300/20 blur-2xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/30">
                  <Clapperboard size={26} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold tracking-tight">AI 영상 제작 스튜디오</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                      <Sparkles size={11} /> Kling AI · 전 모델
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/85">
                    클링 AI(텍스트→영상 · 이미지→영상 · 영상→영상) 등 모든 모델로 바로 영상을 제작합니다. 크레딧은 실사용량 기준으로 자동 차감·기록됩니다.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-700 transition-transform group-hover:scale-105">
                영상 만들러 가기 <ChevronRight size={16} />
              </span>
            </div>
          </a>
        </Reveal>

        {/* 회원 목록 + 회원별 가격(AI 과금 배수) 조정 */}
        <Reveal>
          <MemberPricing />
        </Reveal>

        {/* 크레딧 충전 승인 대기 */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Wallet size={16} className="text-amber-500" /> 크레딧 충전 승인
                {creditPending.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {creditPending.length}건 대기
                  </span>
                )}
              </span>
            }
            action={
              <Button href="/adminsunkoh028741_11263/approvals" variant="ghost" size="sm">
                승인 관리 <ChevronRight size={15} />
              </Button>
            }
          >
            {creditPending.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">
                {ready ? '대기 중인 크레딧 충전 신청이 없습니다.' : '불러오는 중…'}
              </p>
            ) : (
              <div className="space-y-2">
                {creditPending.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] p-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-bold text-white">
                        {(c.name || c.email || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{c.name || '이름 없음'}</p>
                        <p className="text-xs text-[var(--text-dim)]">{c.email || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-bold text-amber-600">
                        <Coins size={14} /> {c.amount.toLocaleString()}개
                      </span>
                      {c.price > 0 && <span className="text-xs text-[var(--text-soft)]">{c.price.toLocaleString()}원</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="!bg-gradient-to-br !from-emerald-500 !to-green-500"
                        disabled={busy !== null}
                        onClick={() => decideCredit(c.id, 'approve')}
                      >
                        <CheckCircle2 size={15} /> 승인
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                        disabled={busy !== null}
                        onClick={() => decideCredit(c.id, 'reject')}
                      >
                        <XCircle size={15} /> 반려
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>

        <Reveal>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="가입자 추이 · 최근 7일 (실데이터)" className="lg:col-span-2">
              <AreaTrend data={signupTrend} keys={['신규', '누적']} colors={['#7c3aed', '#22d3ee']} />
            </Panel>
            <Panel title="마케터 플랜 분포">
              <Donut data={planDist.every((p) => p.value === 0) ? [{ name: '없음', value: 1, color: '#e2e8f0' }] : planDist} />
              <div className="mt-4 space-y-2">
                {planDist.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[var(--text-soft)]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                      {p.name}
                    </span>
                    <span className="font-semibold">{p.value.toLocaleString('ko-KR')}명</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-[var(--border-soft)] pt-3">
                <p className="mb-2 text-xs font-semibold text-[var(--text-dim)]">AI 영상 플랜</p>
                <div className="space-y-1.5">
                  {videoPlanDist.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[var(--text-soft)]">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                        {p.name}
                      </span>
                      <span className="font-semibold">{p.value.toLocaleString('ko-KR')}명</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </Reveal>

        <Reveal>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel
              className="lg:col-span-1"
              title={
                <span className="flex items-center gap-2">
                  실시간 활동 피드
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping-ring" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    LIVE
                  </span>
                </span>
              }
            >
              <div className="-mr-1 max-h-[420px] space-y-1 overflow-y-auto pr-1 no-scrollbar">
                {activity.map((a, i) => {
                  const s = actStyle(a.type)
                  const Icon = s.icon
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50">
                      <span className={cn('grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br text-white', s.ring)}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{a.name || a.email || '알 수 없음'}</span>
                          <span className={cn('ml-2 rounded border px-1.5 py-0.5 text-[10px] font-medium', s.badge)}>{s.label}</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">{a.detail || a.email || '-'}</p>
                      </div>
                      <span className="flex-shrink-0 text-[11px] text-[var(--text-dim)]">{ago(a.created_at)}</span>
                    </div>
                  )
                })}
                {ready && activity.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--text-dim)]">아직 활동 기록이 없습니다.</p>
                )}
              </div>
            </Panel>

            <Panel
              className="lg:col-span-2"
              title="최근 가입 회원"
              action={
                <Button href="/adminsunkoh028741_11263/users" variant="ghost" size="sm">
                  전체 보기 <ChevronRight size={15} />
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                      <th className="pb-2.5 font-medium">회원</th>
                      <th className="pb-2.5 font-medium">이메일</th>
                      <th className="pb-2.5 font-medium">플랜</th>
                      <th className="pb-2.5 font-medium">가입일</th>
                      <th className="pb-2.5 font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((u) => (
                      <tr key={u.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                              {u.name.slice(0, 1)}
                            </span>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-[var(--text-soft)]">{u.email}</td>
                        <td className="py-3">
                          <Badge className={planBadgeClass(u.plan)}>{planLabel(u.plan)}</Badge>
                        </td>
                        <td className="py-3 text-[var(--text-soft)]">{fmtDate(u.createdAt)}</td>
                        <td className="py-3">
                          {u.status === 'active' ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">활성</Badge>
                          ) : (
                            <Badge className="border-rose-200 bg-rose-50 text-rose-700">정지</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[var(--text-dim)]">
                          {ready ? '가입한 회원이 없습니다.' : '회원 데이터를 불러오는 중…'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </Reveal>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

function StatBox({
  label,
  value,
  icon: Icon,
  color,
  live,
}: {
  label: string
  value: number
  icon: any
  color: string
  live?: boolean
}) {
  return (
    <div className="card hover-lift p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-[var(--text-soft)]">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${color}14`, color }}>
          <Icon size={17} />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-2xl font-bold tracking-tight">
          <Counter to={value} />
        </span>
        {live && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping-ring" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            실시간
          </span>
        )}
      </div>
    </div>
  )
}
