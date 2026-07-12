'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  UserCircle,
  Coins,
  Wallet,
  Lock,
  Crown,
  Receipt,
  Bell,
  Activity,
  LogIn,
  KeyRound,
  Sparkles,
  ArrowUpCircle,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import {
  accountOverview,
  changePassword,
  markNotificationsRead,
  type User,
  type Tx,
  type Noti,
  type ActivityRow,
} from '@/lib/auth'

/* ---------- date helpers ---------- */
function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}
function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso || '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function relTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '방금'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}일 전`
  const mon = Math.floor(day / 30)
  if (mon < 12) return `${mon}개월 전`
  return `${Math.floor(mon / 12)}년 전`
}
function ko(n: number) {
  return n.toLocaleString('ko-KR')
}

/* ---------- plan meta ---------- */
const PLAN_META: Record<
  string,
  { badge: string; perks: string[] }
> = {
  Starter: {
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    perks: ['기본 키워드 분석', '월 10회 리포트', '이메일 지원'],
  },
  Pro: {
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    perks: ['무제한 키워드 분석', '월 100회 리포트', '우선 지원', '경쟁사 추적'],
  },
  Business: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    perks: ['모든 Pro 기능', '무제한 리포트', '전담 매니저', 'API 액세스', '팀 협업'],
  },
}

/* ---------- activity meta ---------- */
const ACT_META: Record<
  string,
  { label: string; badge: string; icon: typeof LogIn }
> = {
  login: { label: '로그인', badge: 'border-sky-200 bg-sky-50 text-sky-700', icon: LogIn },
  password: { label: '비밀번호', badge: 'border-rose-200 bg-rose-50 text-rose-700', icon: KeyRound },
  point: { label: '포인트', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: Coins },
  credit: { label: '크레딧', badge: 'border-violet-200 bg-violet-50 text-violet-700', icon: Wallet },
  plan: { label: '플랜', badge: 'border-amber-200 bg-amber-50 text-amber-700', icon: Crown },
  notify: { label: '알림', badge: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700', icon: Bell },
  signup: { label: '가입', badge: 'border-green-200 bg-green-50 text-green-700', icon: Sparkles },
}
function actMeta(type: string) {
  return (
    ACT_META[type] || {
      label: type || '활동',
      badge: 'border-slate-200 bg-slate-50 text-slate-600',
      icon: Activity,
    }
  )
}

/* ---------- transaction table ---------- */
function TxTable({ rows }: { rows: Tx[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--text-dim)]">내역이 없습니다</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
            <th className="pb-2 pr-3 font-medium">일시</th>
            <th className="pb-2 pr-3 font-medium">내용</th>
            <th className="pb-2 pr-3 text-right font-medium">증감</th>
            <th className="pb-2 text-right font-medium">잔액</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const plus = t.amount >= 0
            return (
              <tr key={i} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                <td className="py-2.5 pr-3 whitespace-nowrap text-[var(--text-soft)]">{fmtDate(t.created_at)}</td>
                <td className="py-2.5 pr-3">{t.memo || '-'}</td>
                <td
                  className={`py-2.5 pr-3 text-right font-semibold ${
                    plus ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {plus ? '+' : '-'}
                  {ko(Math.abs(t.amount))}
                </td>
                <td className="py-2.5 text-right text-[var(--text-soft)]">
                  {t.balance_after === null ? '-' : ko(t.balance_after)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [notifications, setNotifications] = useState<Noti[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])

  // password form
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwOk, setPwOk] = useState(false)
  const [pwErr, setPwErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    accountOverview().then((d) => {
      if (!alive) return
      setOk(d.ok)
      setUser(d.user || null)
      setTransactions(d.transactions)
      setNotifications(d.notifications)
      setActivity(d.activity)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  async function submitPassword(e: FormEvent) {
    e.preventDefault()
    setPwOk(false)
    setPwErr(null)
    if (!cur || !next) {
      setPwErr('비밀번호를 입력하세요.')
      return
    }
    if (next.length < 6) {
      setPwErr('새 비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (next !== confirm) {
      setPwErr('새 비밀번호가 일치하지 않습니다.')
      return
    }
    setPwBusy(true)
    const r = await changePassword(cur, next)
    setPwBusy(false)
    if (r.ok) {
      setPwOk(true)
      setCur('')
      setNext('')
      setConfirm('')
      setTimeout(() => setPwOk(false), 4000)
    } else {
      setPwErr(r.error || '비밀번호 변경에 실패했습니다.')
    }
  }

  async function readAll() {
    await markNotificationsRead()
    setNotifications((ns) => ns.map((n) => ({ ...n, read: 1 })))
  }

  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500'

  const pointTx = transactions.filter((t) => t.kind === 'point')
  const creditTx = transactions.filter((t) => t.kind === 'credit')
  const purchaseTx = transactions.filter((t) => t.kind === 'purchase')
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={UserCircle}
        eyebrow="내 계정"
        title="프로필"
        desc="계정 정보와 크레딧·포인트, 활동 내역을 관리하세요."
        accent="#7c3aed"
      />

      <div className="space-y-6 p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-[var(--text-dim)]">
            불러오는 중...
          </div>
        ) : !ok || !user ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600">
              <Lock size={26} />
            </span>
            <div>
              <p className="text-lg font-semibold">로그인이 필요합니다</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                프로필을 보려면 먼저 로그인해 주세요.
              </p>
            </div>
            <Button href="/login">로그인 하러 가기</Button>
          </div>
        ) : (
          <>
            {/* 1. 프로필 카드 */}
            <div className="card p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full brand-gradient text-2xl font-bold text-white">
                    {(user.name || '?')[0]}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight">{user.name}</h2>
                      <Badge className={PLAN_META[user.plan]?.badge || 'border-slate-200 bg-slate-50 text-slate-600'}>
                        <Crown size={12} /> {user.plan}
                      </Badge>
                      {user.role === 'admin' && (
                        <Badge className="border-slate-300 bg-slate-900 text-white">
                          <ShieldCheck size={12} /> 관리자
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-[var(--text-soft)]">{user.email}</p>
                    <p className="truncate text-sm text-[var(--text-dim)]">
                      {user.company || '회사 미등록'}
                      {user.phone ? ` · ${user.phone}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      가입일 {fmtDate(user.createdAt)}
                      {user.lastActive ? ` · 최근 활동 ${relTime(user.lastActive)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:w-80">
                  <div className="card-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-soft)]">보유 포인트</span>
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                        <Coins size={16} />
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight">
                      {ko(user.points)}
                      <span className="ml-0.5 text-base font-semibold text-[var(--text-soft)]">P</span>
                    </p>
                  </div>
                  <div className="card-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-soft)]">보유 크레딧</span>
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600">
                        <Wallet size={16} />
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight">
                      {ko(user.credits)}
                      <span className="ml-0.5 text-base font-semibold text-[var(--text-soft)]">개</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* 2. 비밀번호 변경 */}
              <Panel title={<span className="flex items-center gap-2"><Lock size={16} className="text-violet-600" /> 비밀번호 변경</span>}>
                <form onSubmit={submitPassword} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">현재 비밀번호</label>
                    <input
                      type="password"
                      value={cur}
                      onChange={(e) => setCur(e.target.value)}
                      className={inputCls}
                      placeholder="현재 비밀번호"
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">새 비밀번호</label>
                    <input
                      type="password"
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      className={inputCls}
                      placeholder="6자 이상"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={inputCls}
                      placeholder="새 비밀번호 재입력"
                      autoComplete="new-password"
                    />
                  </div>

                  {pwOk && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
                      <Check size={15} /> 비밀번호가 변경되었습니다
                    </div>
                  )}
                  {pwErr && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      <AlertCircle size={15} /> {pwErr}
                    </div>
                  )}

                  <Button type="submit" disabled={pwBusy} className="w-full">
                    {pwBusy ? '변경 중...' : '변경'}
                  </Button>
                </form>
              </Panel>

              {/* 3. 현재 플랜 */}
              <Panel title={<span className="flex items-center gap-2"><Crown size={16} className="text-amber-500" /> 현재 플랜</span>}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold tracking-tight">{user.plan}</span>
                  <Badge className={PLAN_META[user.plan]?.badge || 'border-slate-200 bg-slate-50 text-slate-600'}>
                    현재 이용 중
                  </Badge>
                </div>
                <ul className="mt-4 space-y-2">
                  {(PLAN_META[user.plan]?.perks || ['기본 기능 이용']).map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
                      <Check size={15} className="flex-shrink-0 text-emerald-600" /> {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {user.plan === 'Business' ? (
                    <p className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm text-[var(--text-soft)]">
                      최상위 플랜을 이용 중입니다. 감사합니다.
                    </p>
                  ) : (
                    <Button href="/#pricing" variant="soft" className="w-full">
                      <ArrowUpCircle size={16} /> 플랜 업그레이드
                    </Button>
                  )}
                </div>
              </Panel>
            </div>

            {/* 4. 포인트·크레딧 내역 */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title={<span className="flex items-center gap-2"><Coins size={16} className="text-emerald-600" /> 포인트 내역</span>}>
                <TxTable rows={pointTx} />
              </Panel>
              <Panel title={<span className="flex items-center gap-2"><Wallet size={16} className="text-violet-600" /> 크레딧 내역</span>}>
                <TxTable rows={creditTx} />
              </Panel>
            </div>

            {/* 5. 구매 내역 */}
            <Panel title={<span className="flex items-center gap-2"><Receipt size={16} className="text-sky-600" /> 구매 내역</span>}>
              {purchaseTx.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">구매 내역이 없습니다</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                        <th className="pb-2 pr-3 font-medium">일시</th>
                        <th className="pb-2 pr-3 font-medium">내용</th>
                        <th className="pb-2 text-right font-medium">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseTx.map((t, i) => (
                        <tr key={i} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                          <td className="py-2.5 pr-3 whitespace-nowrap text-[var(--text-soft)]">{fmtDate(t.created_at)}</td>
                          <td className="py-2.5 pr-3">{t.memo || '-'}</td>
                          <td className="py-2.5 text-right font-semibold">{ko(Math.abs(t.amount))}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* 6. 알림 */}
            <Panel
              title={<span className="flex items-center gap-2"><Bell size={16} className="text-fuchsia-600" /> 알림{unread > 0 ? ` (${unread})` : ''}</span>}
              action={
                notifications.length > 0 && unread > 0 ? (
                  <Button variant="ghost" size="sm" onClick={readAll}>
                    모두 읽음
                  </Button>
                ) : undefined
              }
            >
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">알림이 없습니다</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((n, i) => {
                    const isUnread = !n.read
                    return (
                      <li
                        key={n.id || i}
                        className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${
                          isUnread ? 'border-violet-200 bg-violet-50/50' : 'border-[var(--border-soft)] bg-white'
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                            isUnread ? 'bg-violet-500' : 'bg-slate-300'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{n.title || '알림'}</p>
                            <span className="flex-shrink-0 text-xs text-[var(--text-dim)]">{relTime(n.created_at)}</span>
                          </div>
                          {n.body && <p className="mt-0.5 text-sm text-[var(--text-soft)]">{n.body}</p>}
                          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{fmtDate(n.created_at)}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            {/* 7. 활동 로그 */}
            <Panel title={<span className="flex items-center gap-2"><Activity size={16} className="text-slate-600" /> 활동 로그</span>}>
              {activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">활동 내역이 없습니다</p>
              ) : (
                <ul className="space-y-1">
                  {activity.map((a, i) => {
                    const m = actMeta(a.type)
                    const Icon = m.icon
                    return (
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50"
                      >
                        <span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border ${m.badge}`}>
                          <Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-semibold">{m.label}</span>
                            {a.detail ? <span className="text-[var(--text-soft)]"> · {a.detail}</span> : null}
                          </p>
                        </div>
                        <span
                          className="flex-shrink-0 text-xs text-[var(--text-dim)]"
                          title={fmtDate(a.created_at)}
                        >
                          {relTime(a.created_at)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}
