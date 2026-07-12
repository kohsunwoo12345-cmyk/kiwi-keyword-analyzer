'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Shield,
  Users,
  UserCheck,
  Activity,
  DollarSign,
  UserPlus,
  LogIn,
  CreditCard,
  LayoutTemplate,
  ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { adminUsers, type User } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

// 가입자 추이 (최근 7일 신규/누적)
const SIGNUP_TREND = [
  { name: '7/06', 신규: 24, 누적: 2698 },
  { name: '7/07', 신규: 31, 누적: 2729 },
  { name: '7/08', 신규: 27, 누적: 2756 },
  { name: '7/09', 신규: 42, 누적: 2798 },
  { name: '7/10', 신규: 35, 누적: 2833 },
  { name: '7/11', 신규: 29, 누적: 2862 },
  { name: '7/12', 신규: 38, 누적: 2900 },
]

const PLAN_COLORS: Record<User['plan'], string> = {
  Starter: '#94a3b8',
  Pro: '#7c3aed',
  Business: '#0ea5e9',
}

type FeedItem = {
  id: number
  kind: '가입' | '로그인' | '결제' | '랜딩'
  name: string
  detail: string
  ago: string
}

const FEED_SEED: FeedItem[] = [
  { id: 1, kind: '결제', name: '박민지', detail: 'Pro 플랜 월 결제 (₩49,000)', ago: '방금 전' },
  { id: 2, kind: '가입', name: '정하늘', detail: '이메일로 신규 가입', ago: '2분 전' },
  { id: 3, kind: '랜딩', name: '이준호', detail: "'여름 프로모션' 랜딩페이지 생성", ago: '5분 전' },
  { id: 4, kind: '로그인', name: '김서연', detail: 'Chrome · Seoul, KR 접속', ago: '8분 전' },
  { id: 5, kind: '결제', name: '오세훈', detail: 'Business 플랜 연 결제 (₩1,188,000)', ago: '14분 전' },
  { id: 6, kind: '가입', name: '한지우', detail: '구글 계정으로 신규 가입', ago: '21분 전' },
  { id: 7, kind: '랜딩', name: '최유나', detail: "'신메뉴 출시' 랜딩페이지 발행", ago: '27분 전' },
  { id: 8, kind: '로그인', name: '강태현', detail: 'Safari · Busan, KR 접속', ago: '33분 전' },
]

const FEED_STYLE: Record<
  FeedItem['kind'],
  { icon: typeof UserPlus; badge: string; ring: string }
> = {
  가입: { icon: UserPlus, badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', ring: 'from-emerald-500 to-green-500' },
  로그인: { icon: LogIn, badge: 'border-sky-200 bg-sky-50 text-sky-700', ring: 'from-sky-500 to-cyan-500' },
  결제: { icon: CreditCard, badge: 'border-amber-200 bg-amber-50 text-amber-700', ring: 'from-amber-500 to-orange-500' },
  랜딩: { icon: LayoutTemplate, badge: 'border-violet-200 bg-violet-50 text-violet-700', ring: 'from-violet-500 to-indigo-500' },
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function planBadgeClass(plan: User['plan']) {
  return plan === 'Business'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : plan === 'Pro'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  useEffect(() => {
    adminUsers().then((r) => setUsers(r.users))
  }, [])

  // 총 회원수: 실제 사용자 수 + 시드 보정(현실감)
  const totalMembers = 2842 + users.length

  const planDist = useMemo(() => {
    const base = { Starter: 1524, Pro: 986, Business: 332 }
    for (const u of users) base[u.plan] = (base[u.plan] || 0) + 1
    return (['Starter', 'Pro', 'Business'] as const).map((name) => ({
      name,
      value: base[name],
      color: PLAN_COLORS[name],
    }))
  }, [users])

  const recent = useMemo(
    () =>
      [...users]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 6),
    [users],
  )

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Shield}
        eyebrow="ADMIN"
        title="관리자 대시보드"
        desc="회원 현황과 서비스 지표를 실시간으로 모니터링합니다."
        accent={ACCENT}
        action={
          <Button href="/admin/users" size="sm">
            회원 관리 <ChevronRight size={16} />
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* stats */}
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card hover-lift p-5">
              <div className="flex items-start justify-between">
                <span className="text-sm text-[var(--text-soft)]">총 회원수</span>
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: '#7c3aed14', color: '#7c3aed' }}>
                  <Users size={17} />
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight">
                  <Counter to={totalMembers} />
                </span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">+6.2%</span>
              </div>
            </div>

            <div className="card hover-lift p-5">
              <div className="flex items-start justify-between">
                <span className="text-sm text-[var(--text-soft)]">오늘 가입</span>
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: '#22c55e14', color: '#22c55e' }}>
                  <UserPlus size={17} />
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight">
                  <Counter to={38} />
                </span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">+31%</span>
              </div>
            </div>

            <div className="card hover-lift p-5">
              <div className="flex items-start justify-between">
                <span className="text-sm text-[var(--text-soft)]">활성 세션</span>
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: '#0ea5e914', color: '#0ea5e9' }}>
                  <Activity size={17} />
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight">
                  <Counter to={124} />
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping-ring" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  실시간
                </span>
              </div>
            </div>

            <div className="card hover-lift p-5">
              <div className="flex items-start justify-between">
                <span className="text-sm text-[var(--text-soft)]">이번달 매출</span>
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: '#f59e0b14', color: '#f59e0b' }}>
                  <DollarSign size={17} />
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight">
                  <Counter to={3240} prefix="₩" suffix="만" />
                </span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">+12.4%</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* charts */}
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="가입자 추이 · 최근 7일" className="lg:col-span-2">
              <AreaTrend
                data={SIGNUP_TREND}
                keys={['신규', '누적']}
                colors={['#7c3aed', '#22d3ee']}
              />
            </Panel>
            <Panel title="플랜 분포">
              <Donut data={planDist} />
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

        {/* live feed + recent members */}
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
                {FEED_SEED.map((f) => {
                  const s = FEED_STYLE[f.kind]
                  const Icon = s.icon
                  return (
                    <div key={f.id} className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50">
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
                      <span className="flex-shrink-0 text-[11px] text-[var(--text-dim)]">{f.ago}</span>
                    </div>
                  )
                })}
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
                          회원 데이터를 불러오는 중…
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
