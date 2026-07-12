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
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { Panel, Badge, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { adminUsers, type User } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

const PLAN_COLORS: Record<User['plan'], string> = {
  Starter: '#94a3b8',
  Pro: '#7c3aed',
  Business: '#0ea5e9',
}

const FEED_STYLE = {
  가입: { icon: UserPlus, badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', ring: 'from-emerald-500 to-green-500' },
  로그인: { icon: LogIn, badge: 'border-sky-200 bg-sky-50 text-sky-700', ring: 'from-sky-500 to-cyan-500' },
  결제: { icon: CreditCard, badge: 'border-amber-200 bg-amber-50 text-amber-700', ring: 'from-amber-500 to-orange-500' },
} as const

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

function planBadgeClass(plan: User['plan']) {
  return plan === 'Business'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : plan === 'Pro'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}

const DAY_MS = 86_400_000

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    adminUsers().then((r) => {
      setUsers(r.users)
      setReady(true)
    })
  }, [])

  const now = Date.now()
  const total = users.length
  const todayStr = new Date().toISOString().slice(0, 10)
  const newToday = users.filter((u) => (u.createdAt || '').slice(0, 10) === todayStr).length
  const activeRecently = users.filter((u) => u.lastActive && now - +new Date(u.lastActive) < DAY_MS).length
  const paid = users.filter((u) => u.plan === 'Pro' || u.plan === 'Business').length

  const planDist = useMemo(() => {
    const base: Record<string, number> = { Starter: 0, Pro: 0, Business: 0 }
    for (const u of users) base[u.plan] = (base[u.plan] || 0) + 1
    return (['Starter', 'Pro', 'Business'] as const).map((name) => ({
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

  // 실제 활동 피드: 가입(createdAt) + 로그인(lastActive)
  const feed = useMemo(() => {
    const events: { kind: keyof typeof FEED_STYLE; name: string; detail: string; t: number }[] = []
    for (const u of users) {
      if (u.createdAt) events.push({ kind: '가입', name: u.name, detail: `${u.email} · 신규 가입`, t: +new Date(u.createdAt) })
      if (u.lastActive && u.lastActive !== u.createdAt)
        events.push({ kind: '로그인', name: u.name, detail: `${u.plan} 플랜 · 로그인`, t: +new Date(u.lastActive) })
    }
    return events.sort((a, b) => b.t - a.t).slice(0, 10)
  }, [users])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Shield}
        eyebrow="ADMIN"
        title="관리자 대시보드"
        desc="가입 회원과 서비스 지표를 실제 데이터로 모니터링합니다."
        accent={ACCENT}
        action={
          <Button href="/admin/users" size="sm">
            회원 관리 <ChevronRight size={16} />
          </Button>
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

        <Reveal>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="가입자 추이 · 최근 7일 (실데이터)" className="lg:col-span-2">
              <AreaTrend data={signupTrend} keys={['신규', '누적']} colors={['#7c3aed', '#22d3ee']} />
            </Panel>
            <Panel title="플랜 분포">
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
                {feed.map((f, i) => {
                  const s = FEED_STYLE[f.kind]
                  const Icon = s.icon
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50">
                      <span className={cn('grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br text-white', s.ring)}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{f.name}</span>
                          <span className={cn('ml-2 rounded border px-1.5 py-0.5 text-[10px] font-medium', s.badge)}>{f.kind}</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">{f.detail}</p>
                      </div>
                      <span className="flex-shrink-0 text-[11px] text-[var(--text-dim)]">{ago(new Date(f.t).toISOString())}</span>
                    </div>
                  )
                })}
                {ready && feed.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--text-dim)]">아직 활동 기록이 없습니다.</p>
                )}
              </div>
            </Panel>

            <Panel
              className="lg:col-span-2"
              title="최근 가입 회원"
              action={
                <Button href="/admin/users" variant="ghost" size="sm">
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
                          <Badge className={planBadgeClass(u.plan)}>{u.plan}</Badge>
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
