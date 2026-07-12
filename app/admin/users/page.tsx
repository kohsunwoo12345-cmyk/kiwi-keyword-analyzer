'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  UserCheck,
  UserPlus,
  Ban,
  Search,
  Eye,
  Trash2,
  X,
  Circle,
  Globe,
  Server,
  Clock,
  Shield,
  Activity,
  MessageSquare,
  LayoutTemplate,
  LogIn,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminUsers, adminAction, type User } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'
const TODAY = '2026-07-12'

// 회원별 감시용 목업(실시간 세션/활동) — id 기반, 없으면 fallback 생성
const WATCH: Record<
  string,
  { online: boolean; page: string; session: string; ip: string; device: string; browser: string; location: string }
> = {
  admin: { online: true, page: '/admin/users', session: '2시간 12분', ip: '211.234.11.4', device: 'MacBook Pro', browser: 'Chrome 126', location: '서울, KR' },
  u_seoyeon: { online: true, page: '/dashboard/landing', session: '38분', ip: '121.130.44.90', device: 'iPhone 15', browser: 'Safari 17', location: '서울, KR' },
  u_junho: { online: true, page: '/dashboard/sms/compose', session: '12분', ip: '175.223.9.201', device: 'Galaxy S24', browser: 'Samsung Internet', location: '부산, KR' },
  u_minji: { online: false, page: '/dashboard', session: '-', ip: '110.70.55.12', device: 'Windows PC', browser: 'Edge 126', location: '인천, KR' },
  u_doyoon: { online: false, page: '-', session: '-', ip: '39.115.201.7', device: 'iPad Air', browser: 'Safari 16', location: '대구, KR' },
}

function watchOf(u: User) {
  return (
    WATCH[u.id] || {
      online: false,
      page: '/dashboard',
      session: '-',
      ip: '203.0.113.' + ((u.id.length * 7) % 240),
      device: 'Windows PC',
      browser: 'Chrome 126',
      location: '서울, KR',
    }
  )
}

const ACTIVITY_LOG = [
  { icon: LogIn, label: '로그인', detail: 'Chrome · 서울, KR', time: '오늘 09:12', color: 'text-sky-600 bg-sky-50' },
  { icon: LayoutTemplate, label: '랜딩페이지 생성', detail: "'여름 프로모션 2026'", time: '오늘 09:41', color: 'text-violet-600 bg-violet-50' },
  { icon: MessageSquare, label: '문자 발송', detail: '1,240건 (전환율 6.8%)', time: '오늘 10:03', color: 'text-emerald-600 bg-emerald-50' },
  { icon: Activity, label: '플레이스 순위 조회', detail: "'강남 필라테스' 외 4건", time: '어제 18:22', color: 'text-amber-600 bg-amber-50' },
  { icon: LogIn, label: '로그인', detail: 'Safari · 서울, KR', time: '어제 08:55', color: 'text-sky-600 bg-sky-50' },
]

type Filter = 'all' | 'online' | 'offline' | 'suspended' | 'Starter' | 'Pro' | 'Business'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'online', label: '온라인' },
  { key: 'offline', label: '오프라인' },
  { key: 'suspended', label: '정지' },
  { key: 'Starter', label: 'Starter' },
  { key: 'Pro', label: 'Pro' },
  { key: 'Business', label: 'Business' },
]

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function planBadgeClass(plan: User['plan']) {
  return plan === 'Business'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : plan === 'Pro'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawerId, setDrawerId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  function reload() {
    adminUsers().then((r) => {
      setUsers(r.users)
      setLoading(false)
    })
  }
  useEffect(() => {
    reload()
  }, [])

  const online = users.filter((u) => watchOf(u).online && u.status === 'active')
  const newToday = users.filter((u) => fmtDate(u.createdAt) === TODAY)
  const suspended = users.filter((u) => u.status === 'suspended')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (q && !(u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.company.toLowerCase().includes(q)))
        return false
      const w = watchOf(u)
      switch (filter) {
        case 'online':
          return w.online && u.status === 'active'
        case 'offline':
          return !w.online || u.status === 'suspended'
        case 'suspended':
          return u.status === 'suspended'
        case 'Starter':
        case 'Pro':
        case 'Business':
          return u.plan === filter
        default:
          return true
      }
    })
  }, [users, query, filter])

  function toggleSuspend(id: string) {
    const target = users.find((u) => u.id === id)
    const next = target?.status === 'active' ? 'suspend' : 'activate'
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u)),
    )
    adminAction(next, id)
  }
  function removeUser(id: string) {
    adminAction('delete', id)
    setUsers((prev) => prev.filter((u) => u.id !== id))
    setSelected((prev) => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })
    if (drawerId === id) setDrawerId(null)
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((u) => u.id))))
  }

  const drawerUser = users.find((u) => u.id === drawerId) || null

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Users}
        eyebrow="ADMIN"
        title="회원 관리 · 실시간 모니터링"
        desc="가입 회원을 검색·필터링하고 실시간 접속 현황을 감시합니다."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* stats */}
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="전체 회원" value={String(users.length)} icon={Users} accent="#7c3aed" />
            <StatCard label="온라인 (접속중)" value={String(online.length)} icon={UserCheck} accent="#22c55e" />
            <StatCard label="신규 (오늘)" value={String(newToday.length)} icon={UserPlus} accent="#0ea5e9" />
            <StatCard label="정지 계정" value={String(suspended.length)} icon={Ban} accent="#ef4444" />
          </div>
        </Reveal>

        {/* live sessions */}
        <Reveal>
          <div id="live" className="scroll-mt-6">
          <Panel
            title={
              <span className="flex items-center gap-2">
                실시간 접속 현황
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping-ring" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {online.length}명 접속중
                </span>
              </span>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {online.map((u) => {
                const w = watchOf(u)
                return (
                  <button
                    key={u.id}
                    onClick={() => setDrawerId(u.id)}
                    className="card-2 flex items-center gap-3 p-3 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/40"
                  >
                    <div className="relative flex-shrink-0">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">
                        {u.name.slice(0, 1)}
                      </span>
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping-ring" />
                        <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {u.name}
                        <span className="text-xs font-normal text-[var(--text-dim)]">· {u.plan}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">
                        보는 중: <span className="font-medium text-violet-600">{w.page}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-dim)]">
                        <Clock size={11} /> 접속 {w.session} · {w.location}
                      </p>
                    </div>
                  </button>
                )
              })}
              {online.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm text-[var(--text-dim)]">현재 접속중인 회원이 없습니다.</p>
              )}
            </div>
          </Panel>
          </div>
        </Reveal>

        {/* search + filters + table */}
        <Reveal>
          <Panel>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름 · 이메일 · 회사 검색"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      filter === f.key
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-[var(--border)] bg-white text-[var(--text-soft)] hover:bg-slate-50',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {selected.size > 0 && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-sm text-violet-700">
                <span className="font-semibold">{selected.size}명 선택됨</span>
                <button className="ml-auto text-xs font-medium hover:underline" onClick={() => setSelected(new Set())}>
                  선택 해제
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="w-10 pb-2.5">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-[var(--border)] accent-violet-600"
                      />
                    </th>
                    <th className="pb-2.5 font-medium">회원</th>
                    <th className="pb-2.5 font-medium">회사</th>
                    <th className="pb-2.5 font-medium">플랜</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 font-medium">가입일</th>
                    <th className="pb-2.5 font-medium">최근 접속</th>
                    <th className="pb-2.5 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const w = watchOf(u)
                    const isOnline = w.online && u.status === 'active'
                    return (
                      <tr key={u.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleSelect(u.id)}
                            className="h-4 w-4 rounded border-[var(--border)] accent-violet-600"
                          />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex-shrink-0">
                              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                                {u.name.slice(0, 1)}
                              </span>
                              {isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium">
                                {u.name}
                                {u.role === 'admin' && (
                                  <span className="ml-1.5 inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                                    <Shield size={9} /> 관리자
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-[var(--text-dim)]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-[var(--text-soft)]">{u.company || '-'}</td>
                        <td className="py-3">
                          <Badge className={planBadgeClass(u.plan)}>{u.plan}</Badge>
                        </td>
                        <td className="py-3">
                          {u.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              <Circle size={7} className={cn('fill-current', isOnline && 'animate-pulse')} />
                              {isOnline ? '온라인' : '활성'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                              <Ban size={11} /> 정지
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-[var(--text-soft)]">{fmtDate(u.createdAt)}</td>
                        <td className="py-3 text-[var(--text-soft)]">{fmtDateTime(u.lastActive)}</td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDrawerId(u.id)}
                              title="상세 감시"
                              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-soft)] transition-colors hover:bg-violet-50 hover:text-violet-600"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => toggleSuspend(u.id)}
                              title={u.status === 'active' ? '정지' : '정지 해제'}
                              className={cn(
                                'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                                u.status === 'active'
                                  ? 'text-[var(--text-soft)] hover:bg-amber-50 hover:text-amber-600'
                                  : 'text-emerald-600 hover:bg-emerald-50',
                              )}
                            >
                              <Ban size={16} />
                            </button>
                            <button
                              onClick={() => removeUser(u.id)}
                              title="삭제"
                              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-soft)] transition-colors hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[var(--text-dim)]">
                        조건에 맞는 회원이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[var(--text-dim)]">
              총 {filtered.length}명 표시 · 전체 {users.length}명
            </p>
          </Panel>
        </Reveal>
      </div>

      {/* 감시 드로어 */}
      {drawerUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerId(null)} />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--border)] bg-white shadow-2xl">
            {(() => {
              const u = drawerUser
              const w = watchOf(u)
              const isOnline = w.online && u.status === 'active'
              return (
                <>
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white/90 px-5 py-4 backdrop-blur">
                    <div className="flex items-center gap-2">
                      <Eye size={16} className="text-violet-600" />
                      <h3 className="font-semibold">회원 상세 감시</h3>
                    </div>
                    <button
                      onClick={() => setDrawerId(null)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-soft)] hover:bg-slate-100"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-5 p-5">
                    {/* profile */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-bold text-white">
                          {u.name.slice(0, 1)}
                        </span>
                        {isOnline && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping-ring" />
                            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-lg font-bold">
                          {u.name}
                          <Badge className={planBadgeClass(u.plan)}>{u.plan}</Badge>
                        </p>
                        <p className="truncate text-sm text-[var(--text-soft)]">{u.email}</p>
                        <p className="text-xs text-[var(--text-dim)]">{u.company || '소속 없음'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping-ring" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          지금 활동중 · {w.page}
                        </span>
                      ) : u.status === 'suspended' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                          <Ban size={11} /> 정지된 계정
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                          <Circle size={7} className="fill-current" /> 오프라인
                        </span>
                      )}
                    </div>

                    {/* session info */}
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                        <Server size={12} /> 세션 정보
                      </p>
                      <div className="card-2 divide-y divide-[var(--border-soft)] p-0 text-sm">
                        <Row icon={Globe} label="IP 주소" value={w.ip} />
                        <Row icon={Server} label="디바이스" value={w.device} />
                        <Row icon={Activity} label="브라우저" value={w.browser} />
                        <Row icon={Globe} label="접속 지역" value={w.location} />
                        <Row icon={Clock} label="세션 시간" value={w.session} />
                        <Row icon={Clock} label="최근 접속" value={fmtDateTime(u.lastActive)} />
                      </div>
                    </div>

                    {/* usage metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      <Metric label="발송 문자" value="8,420" />
                      <Metric label="생성 랜딩" value="14" />
                      <Metric label="누적 리드" value="1,203" />
                    </div>

                    {/* activity log */}
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                        <Activity size={12} /> 활동 로그
                      </p>
                      <div className="space-y-2">
                        {ACTIVITY_LOG.map((a, i) => {
                          const Icon = a.icon
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <span className={cn('mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg', a.color)}>
                                <Icon size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{a.label}</p>
                                <p className="truncate text-xs text-[var(--text-soft)]">{a.detail}</p>
                              </div>
                              <span className="flex-shrink-0 text-[11px] text-[var(--text-dim)]">{a.time}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* actions */}
                    <div className="flex gap-2 border-t border-[var(--border)] pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleSuspend(u.id)}
                      >
                        <Ban size={15} /> {u.status === 'active' ? '계정 정지' : '정지 해제'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 !border-rose-200 !text-rose-600 hover:!bg-rose-50"
                        onClick={() => removeUser(u.id)}
                      >
                        <Trash2 size={15} /> 삭제
                      </Button>
                    </div>
                  </div>
                </>
              )
            })()}
          </aside>
        </div>
      )}
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5">
      <Icon size={14} className="flex-shrink-0 text-[var(--text-dim)]" />
      <span className="text-[var(--text-soft)]">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-2 p-3 text-center">
      <p className="text-lg font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{label}</p>
    </div>
  )
}
