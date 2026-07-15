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
  Phone,
  MessageSquare,
  Clock,
  Megaphone,
  Video,
  UserPlus,
  Copy,
  Users,
  Gift,
  Link2,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import {
  accountOverview,
  changePassword,
  markNotificationsRead,
  requestPlan,
  myPlanRequests,
  type PlanTrack,
  mySenders,
  registerSender,
  requestPoint,
  myPointRequests,
  requestCredit,
  myCreditRequests,
  CREDIT_PACKAGES,
  accountReferral,
  addFriend,
  deleteAccount,
  logout,
  type User,
  type Tx,
  type Noti,
  type ActivityRow,
  type MySender,
  type RefUser,
  type ReferralInfo,
} from '@/lib/auth'

/* ---------- date helpers (KST 고정) ---------- */
import { kstDateTime, relAgo } from '@/lib/time'
function fmtDate(iso: string): string {
  return kstDateTime(iso)
}
function relTime(iso: string): string {
  return relAgo(iso)
}
function ko(n: number) {
  return n.toLocaleString('ko-KR')
}

/* ---------- plan meta ---------- */
const PLAN_META: Record<
  string,
  { badge: string; perks: string[] }
> = {
  '없음': {
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
    perks: ['가입된 플랜이 없습니다', '플랜에 가입하고 더 많은 기능을 이용하세요'],
  },
  Plus: {
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    perks: ['기본 기능 이용', '월 표준 사용량', '이메일 지원'],
  },
  Pro: {
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    perks: ['확장 사용량', '우선 지원', '고급 기능 이용'],
  },
  Max: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    perks: ['모든 Pro 기능', '최대 사용량', '전담 매니저', '최우선 지원'],
  },
}

/* ---------- request/sender status meta ---------- */
const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: '대기', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  approved: { label: '승인', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  rejected: { label: '거절', badge: 'border-rose-200 bg-rose-50 text-rose-700' },
}
function statusMeta(s: string) {
  return STATUS_META[s] || { label: s || '-', badge: 'border-slate-200 bg-slate-50 text-slate-600' }
}

const ALL_PLANS = ['Plus', 'Pro', 'Max'] as const
type PlanTier = (typeof ALL_PLANS)[number]

const TRACK_META: Record<PlanTrack, { label: string; short: string; icon: typeof Megaphone; badge: string }> = {
  marketer: { label: '마케터 전용', short: '마케터', icon: Megaphone, badge: 'border-violet-200 bg-violet-50 text-violet-700' },
  video: { label: 'AI 영상 제작', short: '영상', icon: Video, badge: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' },
}

function trackMeta(t: string) {
  return TRACK_META[t as PlanTrack] || { label: t || '-', short: t || '-', icon: Megaphone, badge: 'border-slate-200 bg-slate-50 text-slate-600' }
}

function planLabel(plan: string) {
  return plan === '없음' || !plan ? '미가입' : plan
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

/* ---------- referral user list ---------- */
function RefUserList({ rows, empty }: { rows: RefUser[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--text-dim)]">{empty}</p>
  }
  return (
    <ul className="space-y-2">
      {rows.map((u) => (
        <li
          key={u.id}
          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] px-3.5 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{u.name}</p>
            <p className="truncate text-xs text-[var(--text-dim)]">{u.email}</p>
          </div>
          {u.paid ? (
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">결제완료</Badge>
          ) : (
            <Badge className="border-slate-200 bg-slate-50 text-slate-500">미결제</Badge>
          )}
        </li>
      ))}
    </ul>
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

  // 계정 삭제 (아주 작게 노출)
  const [delOpen, setDelOpen] = useState(false)
  const [delPw, setDelPw] = useState('')
  const [delEmail, setDelEmail] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState<string | null>(null)

  // plan request (two tracks)
  const [planTrack, setPlanTrack] = useState<PlanTrack>('marketer')
  const [toPlan, setToPlan] = useState<PlanTier>('Plus')
  const [planMemo, setPlanMemo] = useState('')
  const [planBusy, setPlanBusy] = useState(false)
  const [planOk, setPlanOk] = useState(false)
  const [planErr, setPlanErr] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [planReqs, setPlanReqs] = useState<
    { track: string; from_plan: string; to_plan: string; status: string; created_at: string; decided_at: string | null }[]
  >([])

  // sender registration
  const [senderPhone, setSenderPhone] = useState('')
  const [senderLabel, setSenderLabel] = useState('')
  const [senderBusy, setSenderBusy] = useState(false)
  const [senderOk, setSenderOk] = useState(false)
  const [senderErr, setSenderErr] = useState<string | null>(null)
  const [senders, setSenders] = useState<MySender[]>([])

  // point request
  const [pointAmount, setPointAmount] = useState('')
  const [pointMemo, setPointMemo] = useState('')
  const [pointBusy, setPointBusy] = useState(false)
  const [pointOk, setPointOk] = useState(false)
  const [pointErr, setPointErr] = useState<string | null>(null)
  const [pointReqs, setPointReqs] = useState<
    { amount: number; memo: string | null; status: string; created_at: string; decided_at: string | null }[]
  >([])

  // credit request
  const [creditAmount, setCreditAmount] = useState('')
  const [creditPrice, setCreditPrice] = useState(0)
  const [creditMemo, setCreditMemo] = useState('')
  const [creditBusy, setCreditBusy] = useState(false)
  const [creditOk, setCreditOk] = useState(false)
  const [creditErr, setCreditErr] = useState<string | null>(null)
  const [creditReqs, setCreditReqs] = useState<
    { amount: number; price: number; memo: string | null; status: string; created_at: string; decided_at: string | null }[]
  >([])

  // referral
  const [ref, setRef] = useState<ReferralInfo | null>(null)
  const [refLoading, setRefLoading] = useState(true)
  const [copied, setCopied] = useState<'code' | 'link' | ''>('')
  const [friendCode, setFriendCode] = useState('')
  const [friendBusy, setFriendBusy] = useState(false)
  const [friendMsg, setFriendMsg] = useState<{ ok: boolean; text: string } | null>(null)

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

  async function loadPlanReqs() {
    const r = await myPlanRequests()
    if (r.ok) setPlanReqs(r.requests || [])
  }
  async function loadSenders() {
    const r = await mySenders()
    if (r.ok) setSenders(r.senders || [])
  }
  async function loadPointReqs() {
    const r = await myPointRequests()
    if (r.ok) setPointReqs(r.requests || [])
  }
  async function loadCreditReqs() {
    const r = await myCreditRequests()
    if (r.ok) setCreditReqs(r.requests || [])
  }

  async function loadReferral() {
    setRefLoading(true)
    const r = await accountReferral()
    setRef(r)
    setRefLoading(false)
  }

  useEffect(() => {
    loadPlanReqs()
    loadSenders()
    loadPointReqs()
    loadCreditReqs()
    loadReferral()
  }, [])

  async function copyText(text: string, which: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  async function submitFriend(e: FormEvent) {
    e.preventDefault()
    setFriendMsg(null)
    const code = friendCode.trim()
    if (!code) {
      setFriendMsg({ ok: false, text: '추천인 코드를 입력하세요.' })
      return
    }
    setFriendBusy(true)
    const r = await addFriend(code)
    setFriendBusy(false)
    if (r.ok) {
      setFriendCode('')
      setFriendMsg({ ok: true, text: `${r.friend?.name || '회원'}님을 친구로 추가했어요` })
      loadReferral()
      setTimeout(() => setFriendMsg(null), 5000)
    } else {
      setFriendMsg({ ok: false, text: r.error || '친구 추가에 실패했습니다.' })
    }
  }

  async function submitPlan(e: FormEvent) {
    e.preventDefault()
    setPlanOk(false)
    setPlanErr(null)
    setPlanBusy(true)
    const r = await requestPlan(planTrack, toPlan, planMemo.trim() || undefined)
    setPlanBusy(false)
    if (r.ok) {
      setPlanOk(true)
      setPlanMemo('')
      setToast(`${trackMeta(planTrack).label} ${toPlan} 플랜 신청이 접수되었습니다.`)
      loadPlanReqs()
      setTimeout(() => setPlanOk(false), 5000)
      setTimeout(() => setToast(''), 5000)
    } else {
      setPlanErr(r.error || '신청에 실패했습니다.')
    }
  }

  async function submitSender(e: FormEvent) {
    e.preventDefault()
    setSenderOk(false)
    setSenderErr(null)
    if (!senderPhone.trim()) {
      setSenderErr('전화번호를 입력하세요.')
      return
    }
    setSenderBusy(true)
    const r = await registerSender(senderPhone.trim(), senderLabel.trim() || undefined)
    setSenderBusy(false)
    if (r.ok) {
      setSenderOk(true)
      setSenderPhone('')
      setSenderLabel('')
      loadSenders()
      setTimeout(() => setSenderOk(false), 5000)
    } else {
      setSenderErr(r.error || '등록에 실패했습니다.')
    }
  }

  async function submitPoint(e: FormEvent) {
    e.preventDefault()
    setPointOk(false)
    setPointErr(null)
    const amt = Math.floor(Number(pointAmount.replace(/[^0-9]/g, '')))
    if (!amt || amt <= 0) {
      setPointErr('신청할 포인트 수량을 입력하세요.')
      return
    }
    setPointBusy(true)
    const r = await requestPoint(amt, pointMemo.trim() || undefined)
    setPointBusy(false)
    if (r.ok) {
      setPointOk(true)
      setPointAmount('')
      setPointMemo('')
      loadPointReqs()
      setTimeout(() => setPointOk(false), 5000)
    } else {
      setPointErr(r.error || '신청에 실패했습니다.')
    }
  }

  async function submitCredit(e: FormEvent) {
    e.preventDefault()
    setCreditOk(false)
    setCreditErr(null)
    const amt = Math.floor(Number(creditAmount.replace(/[^0-9]/g, '')))
    if (!amt || amt <= 0) {
      setCreditErr('충전할 크레딧 수량을 입력하세요.')
      return
    }
    setCreditBusy(true)
    const r = await requestCredit(amt, creditPrice || undefined, creditMemo.trim() || undefined)
    setCreditBusy(false)
    if (r.ok) {
      setCreditOk(true)
      setCreditAmount('')
      setCreditPrice(0)
      setCreditMemo('')
      loadCreditReqs()
      setTimeout(() => setCreditOk(false), 5000)
    } else {
      setCreditErr(r.error || '신청에 실패했습니다.')
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault()
    setPwOk(false)
    setPwErr(null)
    const socialNoPw = !!user?.provider && user.provider !== 'email' && !user.passwordSet
    if ((!socialNoPw && !cur) || !next) {
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

  async function submitDelete(e: FormEvent) {
    e.preventDefault()
    setDelErr(null)
    const socialNoPw = !!user?.provider && user.provider !== 'email' && !user.passwordSet
    if (socialNoPw) {
      if (delEmail.trim().toLowerCase() !== (user?.email || '').toLowerCase()) {
        setDelErr('확인을 위해 계정 이메일 주소를 정확히 입력해 주세요.')
        return
      }
    } else if (!delPw) {
      setDelErr('계정 삭제를 위해 비밀번호를 입력해 주세요.')
      return
    }
    if (!window.confirm('정말로 계정을 삭제하시겠어요? 이 작업은 되돌릴 수 없으며 모든 데이터가 삭제됩니다.')) return
    setDelBusy(true)
    const r = await deleteAccount(socialNoPw ? { confirmEmail: delEmail.trim() } : { password: delPw })
    setDelBusy(false)
    if (r.ok) {
      await logout()
      window.location.href = '/'
    } else {
      setDelErr(r.error || '계정 삭제에 실패했습니다.')
    }
  }

  async function readAll() {
    await markNotificationsRead()
    setNotifications((ns) => ns.map((n) => ({ ...n, read: 1 })))
  }

  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500'

  const socialNoPw = !!user?.provider && user.provider !== 'email' && !user.passwordSet
  const curTier = planTrack === 'marketer' ? (user?.plan ?? '없음') : (user?.videoPlan ?? '없음')
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
                        <Crown size={12} /> {planLabel(user.plan)}
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

            {/* 1.5 추천인 · 친구 */}
            <Panel title={<span className="flex items-center gap-2"><Gift size={16} className="text-fuchsia-600" /> 추천인 · 친구</span>}>
              {refLoading ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">불러오는 중...</p>
              ) : !ref || !ref.ok ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">
                  {ref?.error || '추천인 정보를 불러오지 못했습니다.'}
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* 내 추천인 코드 */}
                    <div className="card-2 p-5">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-soft)]">
                        <Gift size={14} className="text-fuchsia-600" /> 내 추천인 코드
                      </p>
                      <p className="mt-2 select-all font-mono text-3xl font-bold tracking-widest">
                        {ref.code || '-'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          onClick={() => copyText(ref.code || '', 'code')}
                          disabled={!ref.code}
                        >
                          {copied === 'code' ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 복사</>}
                        </Button>
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          onClick={() => copyText(`https://bygency.co/signup?ref=${ref.code || ''}`, 'link')}
                          disabled={!ref.code}
                        >
                          {copied === 'link' ? <><Check size={14} /> 복사됨</> : <><Link2 size={14} /> 초대 링크 복사</>}
                        </Button>
                      </div>
                      {ref.referredByName ? (
                        <p className="mt-4 text-sm text-[var(--text-soft)]">
                          추천인: <span className="font-medium text-[var(--text)]">{ref.referredByName}</span>
                        </p>
                      ) : null}
                    </div>

                    {/* 친구 추가 */}
                    <div className="card-2 p-5">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-soft)]">
                        <UserPlus size={14} className="text-violet-600" /> 친구 추가
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-soft)]">
                        친구의 추천인 코드를 입력하면 친구로 추가돼요.
                      </p>
                      <form onSubmit={submitFriend} className="mt-3 flex gap-2">
                        <input
                          value={friendCode}
                          onChange={(e) => setFriendCode(e.target.value)}
                          className={inputCls}
                          placeholder="추천인 코드 입력"
                        />
                        <Button type="submit" disabled={friendBusy} className="flex-shrink-0">
                          {friendBusy ? '추가 중...' : <><UserPlus size={15} /> 추가</>}
                        </Button>
                      </form>
                      {friendMsg && (
                        <div
                          className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                            friendMsg.ok
                              ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {friendMsg.ok ? <Check size={15} /> : <AlertCircle size={15} />} {friendMsg.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 목록 */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-dim)]">
                        <Users size={13} /> 내 친구 목록 ({ref.friendCount ?? ref.friends?.length ?? 0})
                      </p>
                      <RefUserList rows={ref.friends || []} empty="아직 친구가 없어요" />
                    </div>
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-dim)]">
                        <Gift size={13} /> 내가 추천한 회원 ({ref.referredCount ?? ref.referred?.length ?? 0})
                      </p>
                      <RefUserList rows={ref.referred || []} empty="아직 추천한 회원이 없어요" />
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* 2. 비밀번호 변경 (간편로그인 계정은 최초 설정) */}
              <Panel title={<span className="flex items-center gap-2"><Lock size={16} className="text-violet-600" /> {socialNoPw ? '비밀번호 설정' : '비밀번호 변경'}</span>}>
                <form onSubmit={submitPassword} className="space-y-3">
                  {socialNoPw ? (
                    <p className="rounded-xl border border-[var(--border-soft)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm text-[var(--text-soft)]">
                      간편로그인({user.provider === 'google' ? '구글' : user.provider}) 계정이에요. 비밀번호를 설정하면 이메일+비밀번호로도 로그인할 수 있어요.
                    </p>
                  ) : (
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
                  )}
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
                    {pwBusy ? '처리 중...' : socialNoPw ? '비밀번호 설정' : '변경'}
                  </Button>
                </form>
              </Panel>

              {/* 3. 현재 플랜 (2트랙) */}
              <Panel title={<span className="flex items-center gap-2"><Crown size={16} className="text-amber-500" /> 현재 플랜</span>}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['marketer', 'video'] as PlanTrack[]).map((t) => {
                    const tm = TRACK_META[t]
                    const TIcon = tm.icon
                    const plan = t === 'marketer' ? user.plan : user.videoPlan
                    return (
                      <div key={t} className="card-2 flex flex-col gap-2 p-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-soft)]">
                          <TIcon size={14} /> {tm.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold tracking-tight">{planLabel(plan)}</span>
                          <Badge className={PLAN_META[plan]?.badge || 'border-slate-200 bg-slate-50 text-slate-600'}>
                            <Crown size={12} /> {planLabel(plan)}
                          </Badge>
                        </div>
                        <ul className="mt-1 space-y-1.5">
                          {(PLAN_META[plan]?.perks || ['기본 기능 이용']).map((p) => (
                            <li key={p} className="flex items-center gap-2 text-xs text-[var(--text-soft)]">
                              <Check size={13} className="flex-shrink-0 text-emerald-600" /> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
                {user.videoPlan === 'Max' && (
                  <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3.5 py-2.5 text-xs text-fuchsia-700">
                    <Video size={14} className="flex-shrink-0" /> AI 영상 Max 가입자는 홈에서 노드 스튜디오로 자동 이동합니다.
                  </p>
                )}
                <div className="mt-4">
                  <Button href="/#pricing" variant="soft" className="w-full">
                    <ArrowUpCircle size={16} /> 요금제 안내 보기
                  </Button>
                </div>
              </Panel>
            </div>

            {/* 3.5 플랜 업그레이드 신청 & 발신번호 등록 */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* A) 플랜 신청 (2트랙) */}
              <Panel title={<span className="flex items-center gap-2"><ArrowUpCircle size={16} className="text-violet-600" /> 플랜 신청</span>}>
                <form onSubmit={submitPlan} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">플랜 종류</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['marketer', 'video'] as PlanTrack[]).map((t) => {
                        const tm = TRACK_META[t]
                        const TIcon = tm.icon
                        const active = planTrack === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setPlanTrack(t)}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                              active
                                ? 'border-violet-300 bg-violet-50 text-violet-700'
                                : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)] hover:border-violet-300'
                            }`}
                          >
                            <TIcon size={15} /> {tm.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                    <span className="text-[var(--text-soft)]">현재 {TRACK_META[planTrack].label}</span>
                    <Badge className={PLAN_META[curTier]?.badge || 'border-slate-200 bg-slate-50 text-slate-600'}>
                      <Crown size={12} /> {planLabel(curTier)}
                    </Badge>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">신청 등급</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ALL_PLANS.map((p) => {
                        const active = toPlan === p
                        const isCurrent = curTier === p
                        return (
                          <button
                            key={p}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => setToPlan(p)}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                              isCurrent
                                ? 'cursor-not-allowed border-[var(--border-soft)] bg-slate-50 text-[var(--text-dim)]'
                                : active
                                ? 'border-violet-300 bg-violet-50 text-violet-700'
                                : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)] hover:border-violet-300'
                            }`}
                          >
                            {p}
                            {isCurrent ? <span className="ml-1 text-[10px] font-normal">(현재)</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">
                      메모 <span className="text-[var(--text-dim)]">(선택)</span>
                    </label>
                    <input
                      value={planMemo}
                      onChange={(e) => setPlanMemo(e.target.value)}
                      className={inputCls}
                      placeholder="요청 사항을 남겨주세요"
                    />
                  </div>

                  {planOk && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
                      <Check size={15} /> 신청이 접수되었습니다. 관리자 승인 후 반영됩니다.
                    </div>
                  )}
                  {planErr && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      <AlertCircle size={15} /> {planErr}
                    </div>
                  )}

                  <Button type="submit" disabled={planBusy || curTier === toPlan} className="w-full">
                    {planBusy ? '신청 중...' : curTier === toPlan ? '이미 이용 중인 등급입니다' : '신청'}
                  </Button>
                </form>

                {toast && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700 animate-fade-in">
                    <Check size={15} /> {toast}
                  </div>
                )}

                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-dim)]">
                    <Clock size={13} /> 신청 내역
                  </p>
                  {planReqs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--text-dim)]">신청 내역이 없습니다</p>
                  ) : (
                    <ul className="space-y-2">
                      {planReqs.map((r, i) => {
                        const m = statusMeta(r.status)
                        const tm = trackMeta(r.track)
                        return (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Badge className={tm.badge}>{tm.short}</Badge>
                                <p className="text-sm font-medium">
                                  {planLabel(r.from_plan)} → {planLabel(r.to_plan)}
                                </p>
                              </div>
                              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{fmtDate(r.created_at)}</p>
                            </div>
                            <Badge className={m.badge}>{m.label}</Badge>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </Panel>

              {/* B) 발신번호 등록 */}
              <Panel title={<span className="flex items-center gap-2"><MessageSquare size={16} className="text-sky-600" /> 발신번호 등록</span>}>
                <p className="mb-3 rounded-xl border border-[var(--border-soft)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm text-[var(--text-soft)]">
                  문자 발송에 사용할 발신번호를 등록하면 관리자 승인 후 사용할 수 있어요.
                </p>
                <form onSubmit={submitSender} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">전화번호</label>
                    <div className="relative">
                      <Phone
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                      />
                      <input
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className={inputCls + ' pl-10'}
                        placeholder="010-0000-0000"
                        inputMode="tel"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">
                      라벨 <span className="text-[var(--text-dim)]">(선택)</span>
                    </label>
                    <input
                      value={senderLabel}
                      onChange={(e) => setSenderLabel(e.target.value)}
                      className={inputCls}
                      placeholder="예: 대표번호, 마케팅팀"
                    />
                  </div>

                  {senderOk && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
                      <Check size={15} /> 발신번호가 접수되었습니다. 관리자 승인 후 사용할 수 있어요.
                    </div>
                  )}
                  {senderErr && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      <AlertCircle size={15} /> {senderErr}
                    </div>
                  )}

                  <Button type="submit" disabled={senderBusy} className="w-full">
                    {senderBusy ? '등록 중...' : '등록 신청'}
                  </Button>
                </form>

                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-dim)]">
                    <Phone size={13} /> 등록 목록
                  </p>
                  {senders.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--text-dim)]">등록된 발신번호가 없습니다</p>
                  ) : (
                    <ul className="space-y-2">
                      {senders.map((s) => {
                        const m = statusMeta(s.status)
                        return (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {s.phone}
                                {s.label ? <span className="ml-1.5 text-[var(--text-soft)]">· {s.label}</span> : null}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{fmtDate(s.created_at)}</p>
                            </div>
                            <Badge className={m.badge}>{m.label}</Badge>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </Panel>
            </div>

            {/* 3.6 포인트 지급 신청 */}
            <Panel title={<span className="flex items-center gap-2"><Coins size={16} className="text-amber-500" /> 포인트 지급 신청</span>}>
              <p className="mb-3 rounded-xl border border-[var(--border-soft)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm text-[var(--text-soft)]">
                필요한 포인트를 신청하면 관리자 승인 후 지급됩니다. (현재 보유: <b className="text-amber-600">{ko(user.points)}P</b>)
              </p>
              <div className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={submitPoint} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">신청 포인트</label>
                    <input
                      value={pointAmount}
                      onChange={(e) => setPointAmount(e.target.value)}
                      className={inputCls}
                      placeholder="예: 10000"
                      inputMode="numeric"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[1000, 5000, 10000, 50000, 100000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setPointAmount(String(v))}
                          className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-soft)] transition-colors hover:border-amber-300 hover:text-amber-600"
                        >
                          +{ko(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">
                      메모 <span className="text-[var(--text-dim)]">(선택)</span>
                    </label>
                    <input
                      value={pointMemo}
                      onChange={(e) => setPointMemo(e.target.value)}
                      className={inputCls}
                      placeholder="신청 사유를 남겨주세요"
                    />
                  </div>

                  {pointOk && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
                      <Check size={15} /> 신청이 접수되었습니다. 관리자 승인 후 지급됩니다.
                    </div>
                  )}
                  {pointErr && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      <AlertCircle size={15} /> {pointErr}
                    </div>
                  )}

                  <Button type="submit" disabled={pointBusy} className="w-full">
                    {pointBusy ? '신청 중...' : '포인트 신청'}
                  </Button>
                </form>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-dim)]">
                    <Clock size={13} /> 신청 내역
                  </p>
                  {pointReqs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--text-dim)]">신청 내역이 없습니다</p>
                  ) : (
                    <ul className="space-y-2">
                      {pointReqs.map((r, i) => {
                        const m = statusMeta(r.status)
                        return (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{ko(r.amount)}P</p>
                              <p className="mt-0.5 text-xs text-[var(--text-dim)]">
                                {fmtDate(r.created_at)}
                                {r.memo ? <span className="ml-1">· {r.memo}</span> : null}
                              </p>
                            </div>
                            <Badge className={m.badge}>{m.label}</Badge>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </Panel>

            {/* 3.7 크레딧 충전 신청 */}
            <Panel title={<span className="flex items-center gap-2"><Coins size={16} className="text-amber-500" /> 크레딧 충전 신청</span>}>
              <p className="mb-3 rounded-xl border border-[var(--border-soft)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm text-[var(--text-soft)]">
                필요한 크레딧을 신청하면 관리자 승인 후 충전됩니다. (현재 보유: <b className="text-amber-600">{ko(user.credits)}개</b>)
              </p>
              <div className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={submitCredit} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">패키지 선택</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CREDIT_PACKAGES.map((pkg) => {
                        const active = creditAmount === String(pkg.credits) && creditPrice === pkg.price
                        return (
                          <button
                            key={pkg.credits}
                            type="button"
                            onClick={() => {
                              setCreditAmount(String(pkg.credits))
                              setCreditPrice(pkg.price)
                            }}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? 'border-amber-300 bg-amber-50 text-amber-600'
                                : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)] hover:border-amber-300 hover:text-amber-600'
                            }`}
                          >
                            +{ko(pkg.credits)} / {pkg.price.toLocaleString()}원
                            {pkg.badge ? <span className="ml-1 text-[10px] text-amber-500">{pkg.badge}</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">신청 크레딧</label>
                    <input
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      className={inputCls}
                      placeholder="예: 50"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-soft)]">
                      메모 <span className="text-[var(--text-dim)]">(선택)</span>
                    </label>
                    <input
                      value={creditMemo}
                      onChange={(e) => setCreditMemo(e.target.value)}
                      className={inputCls}
                      placeholder="신청 사유를 남겨주세요"
                    />
                  </div>

                  {creditOk && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700">
                      <Check size={15} /> 신청이 접수되었습니다. 관리자 승인 후 충전됩니다.
                    </div>
                  )}
                  {creditErr && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      <AlertCircle size={15} /> {creditErr}
                    </div>
                  )}

                  <Button type="submit" disabled={creditBusy} className="w-full">
                    {creditBusy ? '신청 중...' : '충전 신청'}
                  </Button>
                </form>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-dim)]">
                    <Clock size={13} /> 신청 내역
                  </p>
                  {creditReqs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--text-dim)]">신청 내역이 없습니다</p>
                  ) : (
                    <ul className="space-y-2">
                      {creditReqs.map((r, i) => {
                        const m = statusMeta(r.status)
                        return (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {ko(r.amount)}개
                                {r.price > 0 ? <span className="ml-1.5 text-[var(--text-soft)]">· {r.price.toLocaleString()}원</span> : null}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--text-dim)]">
                                {fmtDate(r.created_at)}
                                {r.memo ? <span className="ml-1">· {r.memo}</span> : null}
                              </p>
                            </div>
                            <Badge className={m.badge}>{m.label}</Badge>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </Panel>

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

            {/* 8. 계정 삭제 — 아주 작게 노출 */}
            <div className="pt-2 pb-4 text-center">
              {!delOpen ? (
                <button
                  onClick={() => { setDelOpen(true); setDelErr(null) }}
                  className="text-[11px] text-[var(--text-dim)] underline decoration-dotted underline-offset-2 transition-colors hover:text-rose-400"
                >
                  계정 삭제
                </button>
              ) : (
                <div className="mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50/40 p-4 text-left">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-600">
                    <Trash2 size={14} /> 계정 삭제
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    계정을 삭제하면 모든 데이터가 영구히 삭제되며 되돌릴 수 없습니다.
                    {socialNoPw ? ' 확인을 위해 계정 이메일 주소를 입력해 주세요.' : ' 확인을 위해 비밀번호를 입력해 주세요.'}
                  </p>
                  <form onSubmit={submitDelete} className="mt-3 space-y-2">
                    {socialNoPw ? (
                      <input
                        type="email"
                        value={delEmail}
                        onChange={(e) => setDelEmail(e.target.value)}
                        className={inputCls}
                        placeholder={user.email}
                        autoComplete="off"
                      />
                    ) : (
                      <input
                        type="password"
                        value={delPw}
                        onChange={(e) => setDelPw(e.target.value)}
                        className={inputCls}
                        placeholder="비밀번호 입력"
                        autoComplete="current-password"
                      />
                    )}
                    {delErr && (
                      <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <AlertCircle size={13} /> {delErr}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setDelOpen(false); setDelPw(''); setDelEmail(''); setDelErr(null) }}
                        className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:bg-slate-50"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={delBusy}
                        className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                      >
                        {delBusy ? '삭제 중...' : '영구 삭제'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
