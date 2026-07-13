'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  Coins,
  CreditCard,
  KeyRound,
  Send,
  Bell,
  Receipt,
  Phone,
  Mail,
  Building2,
  Megaphone,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import {
  adminUsers,
  adminAction,
  adminUserDetail,
  notifyBroadcast,
  type User,
  type Tx,
  type Noti,
  type ActivityRow,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'
const TODAY = new Date().toISOString().slice(0, 10)
const ONLINE_WINDOW_MS = 5 * 60 * 1000 // 최근 5분 내 활동 = 접속중

function timeAgo(iso: string | null) {
  if (!iso) return '기록 없음'
  const diff = Date.now() - +new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

// 실제 lastActive 기반 접속 상태 (별도 추적 인프라 없이 D1 데이터로 판정)
function watchOf(u: User) {
  const online = !!u.lastActive && Date.now() - +new Date(u.lastActive) < ONLINE_WINDOW_MS
  return { online, lastSeen: timeAgo(u.lastActive) }
}

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
function planLabel(plan: User['plan']) {
  return plan === '없음' || !plan ? '미가입' : plan
}
function fmtNum(n: number) {
  return n.toLocaleString('ko-KR')
}
function txKindLabel(kind: Tx['kind']) {
  return kind === 'point' ? '포인트' : kind === 'credit' ? '크레딧' : '구매'
}
function txKindBadgeClass(kind: Tx['kind']) {
  return kind === 'point'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : kind === 'credit'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

const INPUT_CLS =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-violet-500'

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

  // ---- 드로어 상세 (실데이터) ----
  type Detail = { activity: ActivityRow[]; transactions: Tx[]; notifications: Noti[] }
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)

  // 관리 폼 상태
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [planSel, setPlanSel] = useState<User['plan']>('Starter')
  const [newPw, setNewPw] = useState('')
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyBody, setNotifyBody] = useState('')
  const [notifySms, setNotifySms] = useState(false)
  const [notifyPhone, setNotifyPhone] = useState('')

  // 알림 발송 (일괄) 폼 상태
  type BcTarget = 'user' | 'plan' | 'multi' | 'all'
  const [bcTarget, setBcTarget] = useState<BcTarget>('multi')
  const [bcUserId, setBcUserId] = useState('')
  const [bcUserQuery, setBcUserQuery] = useState('')
  const [bcPlan, setBcPlan] = useState<string>('없음')
  const [bcTitle, setBcTitle] = useState('')
  const [bcBody, setBcBody] = useState('')
  const [bcSms, setBcSms] = useState(false)
  const [bcSending, setBcSending] = useState(false)

  function showToast(msg: string, kind: 'ok' | 'err' = 'ok') {
    setToast({ msg, kind })
  }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(t)
  }, [toast])

  function applyDetail(d: Awaited<ReturnType<typeof adminUserDetail>>) {
    if (!d.ok) return
    setDetail({ activity: d.activity, transactions: d.transactions, notifications: d.notifications })
    if (d.user) {
      const fresh = d.user
      setUsers((prev) => prev.map((u) => (u.id === fresh.id ? fresh : u)))
    }
  }
  function reloadDetail() {
    if (!drawerId) return
    setDetailLoading(true)
    adminUserDetail(drawerId).then((d) => {
      applyDetail(d)
      setDetailLoading(false)
    })
  }

  // 드로어 열릴 때 상세 로드 + 폼 초기화
  useEffect(() => {
    if (!drawerId) {
      setDetail(null)
      return
    }
    setDetail(null)
    setDetailLoading(true)
    adminUserDetail(drawerId).then((d) => {
      applyDetail(d)
      setDetailLoading(false)
    })
    const cur = users.find((u) => u.id === drawerId)
    setAmount('')
    setMemo('')
    setNewPw('')
    setNotifyTitle('')
    setNotifyBody('')
    setNotifySms(false)
    setPlanSel(cur?.plan ?? 'Starter')
    setNotifyPhone(cur?.phone ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerId])

  async function runAction(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
    onOk?: () => void,
  ) {
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (r.ok) {
      showToast(okMsg, 'ok')
      onOk?.()
      reloadDetail()
      reload()
    } else {
      showToast(r.error || '처리 중 오류가 발생했습니다.', 'err')
    }
    return r
  }

  function submitTx(kind: 'points' | 'credits') {
    if (!drawerId) return
    const amt = Number(amount)
    if (!amount.trim() || Number.isNaN(amt) || amt === 0) {
      showToast('0이 아닌 금액을 입력하세요.', 'err')
      return
    }
    const unit = kind === 'points' ? '포인트' : '크레딧'
    runAction(
      () => adminAction(kind, drawerId, { amount: amt, memo: memo.trim() || undefined }),
      `${fmtNum(Math.abs(amt))}${kind === 'points' ? 'P' : '개'} ${unit} ${amt > 0 ? '지급' : '차감'} 완료`,
      () => {
        setAmount('')
        setMemo('')
      },
    )
  }
  function submitPlan() {
    if (!drawerId) return
    runAction(() => adminAction('plan', drawerId, { plan: planSel }), `플랜이 ${planSel}(으)로 변경되었습니다`)
  }
  function submitPassword() {
    if (!drawerId) return
    if (newPw.length < 8) {
      showToast('비밀번호는 8자 이상이어야 합니다.', 'err')
      return
    }
    runAction(() => adminAction('password', drawerId, { password: newPw }), '비밀번호가 변경되었습니다', () =>
      setNewPw(''),
    )
  }
  function submitNotify() {
    if (!drawerId) return
    if (!notifyBody.trim()) {
      showToast('발송할 내용을 입력하세요.', 'err')
      return
    }
    if (notifySms && !notifyPhone.trim()) {
      showToast('문자 발송할 전화번호를 입력하세요.', 'err')
      return
    }
    setBusy(true)
    adminAction('notify', drawerId, {
      title: notifyTitle.trim() || undefined,
      body: notifyBody.trim(),
      sms: notifySms,
      phone: notifyPhone.trim() || undefined,
    }).then((r) => {
      setBusy(false)
      if (r.ok) {
        let msg = '대시보드 알림이 저장되었습니다.'
        if (notifySms) {
          msg += r.sms?.sent ? ' 문자 발송됨.' : ` 문자 미발송${r.sms?.reason ? ': ' + r.sms.reason : ''}.`
        }
        showToast(msg, 'ok')
        setNotifyTitle('')
        setNotifyBody('')
        reloadDetail()
        reload()
      } else {
        showToast(r.error || '발송에 실패했습니다.', 'err')
      }
    })
  }
  function confirmRemove(id: string) {
    if (typeof window !== 'undefined' && !window.confirm('정말 이 회원을 강제 탈퇴시키겠습니까? 되돌릴 수 없습니다.'))
      return
    removeUser(id)
    showToast('회원이 탈퇴 처리되었습니다.', 'ok')
  }

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

  // ---- 알림 발송 (일괄) 파생값 ----
  const bcUserOptions = useMemo(() => {
    const q = bcUserQuery.trim().toLowerCase()
    return users.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, bcUserQuery])
  const bcPlanCount = useMemo(() => users.filter((u) => (u.plan || '없음') === bcPlan).length, [users, bcPlan])
  const bcCount =
    bcTarget === 'user'
      ? bcUserId
        ? 1
        : 0
      : bcTarget === 'plan'
      ? bcPlanCount
      : bcTarget === 'multi'
      ? selected.size
      : users.length
  const bcDisabled =
    bcSending ||
    !bcBody.trim() ||
    (bcTarget === 'user' && !bcUserId) ||
    (bcTarget === 'multi' && selected.size === 0)

  async function submitBroadcast() {
    if (!bcBody.trim()) {
      showToast('발송할 내용을 입력하세요.', 'err')
      return
    }
    if (bcTarget === 'user' && !bcUserId) {
      showToast('발송할 회원을 선택하세요.', 'err')
      return
    }
    if (bcTarget === 'multi' && selected.size === 0) {
      showToast('표에서 회원을 체크해 선택하세요.', 'err')
      return
    }
    setBcSending(true)
    const r = await notifyBroadcast({
      target: bcTarget,
      userId: bcTarget === 'user' ? bcUserId : undefined,
      plan: bcTarget === 'plan' ? bcPlan : undefined,
      userIds: bcTarget === 'multi' ? Array.from(selected) : undefined,
      title: bcTitle.trim(),
      body: bcBody.trim(),
      sms: bcSms,
    })
    setBcSending(false)
    if (r.ok) {
      showToast(`${r.sent ?? bcCount}명에게 발송 완료${r.smsSent ? ` · 문자 ${r.smsSent}건` : ''}`, 'ok')
      setBcTitle('')
      setBcBody('')
      if (bcTarget === 'multi') setSelected(new Set())
      reload()
    } else {
      showToast(r.error || '발송에 실패했습니다.', 'err')
    }
  }

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

        {/* 알림 발송 (일괄) */}
        <Reveal>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Megaphone size={16} className="text-violet-600" /> 알림 발송
              </span>
            }
          >
            <div className="grid gap-5 lg:grid-cols-2">
              {/* 좌: 대상 + 입력 */}
              <div className="space-y-4">
                <div>
                  <SectionLabel icon={Users}>발송 대상</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { key: 'user', label: '개인별' },
                      { key: 'plan', label: '플랜별' },
                      { key: 'multi', label: '다중 선택' },
                      { key: 'all', label: '전체' },
                    ] as { key: BcTarget; label: string }[]).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setBcTarget(t.key)}
                        className={cn(
                          'rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors',
                          bcTarget === t.key
                            ? 'border-violet-300 bg-violet-50 text-violet-700'
                            : 'border-[var(--border)] bg-white text-[var(--text-soft)] hover:bg-slate-50',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* 대상별 세부 선택 */}
                  <div className="mt-3">
                    {bcTarget === 'user' && (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                          <input
                            value={bcUserQuery}
                            onChange={(e) => setBcUserQuery(e.target.value)}
                            placeholder="이름 · 이메일로 회원 검색"
                            className={cn(INPUT_CLS, 'pl-9')}
                          />
                        </div>
                        <select value={bcUserId} onChange={(e) => setBcUserId(e.target.value)} className={INPUT_CLS}>
                          <option value="">회원을 선택하세요</option>
                          {bcUserOptions.slice(0, 200).map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} · {u.email} ({planLabel(u.plan)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {bcTarget === 'plan' && (
                      <select value={bcPlan} onChange={(e) => setBcPlan(e.target.value)} className={INPUT_CLS}>
                        <option value="없음">미가입 (없음)</option>
                        <option value="Starter">Starter</option>
                        <option value="Pro">Pro</option>
                        <option value="Business">Business</option>
                      </select>
                    )}
                    {bcTarget === 'multi' && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                        {selected.size > 0 ? (
                          <span className="font-semibold text-violet-700">선택한 {selected.size}명</span>
                        ) : (
                          <span className="text-[var(--text-dim)]">아래 표에서 회원을 체크해 선택하세요.</span>
                        )}
                      </div>
                    )}
                    {bcTarget === 'all' && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                        <span className="font-semibold text-violet-700">전체 회원 {users.length}명</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <SectionLabel icon={Send}>내용</SectionLabel>
                  <div className="space-y-2">
                    <input
                      value={bcTitle}
                      onChange={(e) => setBcTitle(e.target.value)}
                      placeholder="제목"
                      className={INPUT_CLS}
                    />
                    <textarea
                      value={bcBody}
                      onChange={(e) => setBcBody(e.target.value)}
                      placeholder="발송할 내용을 입력하세요."
                      rows={4}
                      className={cn(INPUT_CLS, 'resize-none')}
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
                      <input
                        type="checkbox"
                        checked={bcSms}
                        onChange={(e) => setBcSms(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--border)] accent-violet-600"
                      />
                      문자(SMS)도 함께 발송
                    </label>
                    {bcSms && (
                      <p className="text-[11px] text-[var(--text-dim)]">※ 발신번호 승인 · SOLAPI 설정이 필요합니다.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 우: 미리보기 + 발송 */}
              <div className="space-y-4">
                <div>
                  <SectionLabel icon={Bell}>미리보기</SectionLabel>
                  <div className="card-2 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                        <Bell size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{bcTitle.trim() || '제목 없음'}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--text-soft)]">
                          {bcBody.trim() || '내용 미리보기가 여기에 표시됩니다.'}
                        </p>
                        {bcSms && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                            <Phone size={9} /> 문자 동시 발송
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                  이 알림은 <span className="font-bold">{bcCount}명</span>에게 발송됩니다.
                  {bcTarget === 'multi' && selected.size === 0 && (
                    <span className="mt-1 block text-xs font-normal text-violet-600">
                      표에서 회원을 체크하면 발송할 수 있습니다.
                    </span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  disabled={bcDisabled}
                  onClick={submitBroadcast}
                >
                  <Send size={16} /> {bcSending ? '발송 중…' : '발송하기'}
                </Button>
              </div>
            </div>
          </Panel>
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
                        <span className="text-xs font-normal text-[var(--text-dim)]">· {planLabel(u.plan)}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">{u.email}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600">
                        <Clock size={11} /> 최근 활동 {w.lastSeen}
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
                          <Badge className={planBadgeClass(u.plan)}>{planLabel(u.plan)}</Badge>
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
                        <td className="py-3 text-[var(--text-soft)]">{u.lastActive ? fmtDateTime(u.lastActive) : '기록 없음'}</td>
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
                          <Badge className={planBadgeClass(u.plan)}>{planLabel(u.plan)}</Badge>
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
                          지금 활동중 · {w.lastSeen}
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

                    {/* account info (실데이터) */}
                    <div>
                      <SectionLabel icon={Server}>계정 정보</SectionLabel>
                      <div className="card-2 divide-y divide-[var(--border-soft)] p-0 text-sm">
                        <Row icon={Mail} label="이메일" value={u.email} />
                        <Row icon={Building2} label="회사" value={u.company || '소속 없음'} />
                        <Row icon={Phone} label="전화" value={u.phone || '미등록'} />
                        <Row icon={Shield} label="권한" value={u.role === 'admin' ? '관리자' : '일반 회원'} />
                        <Row icon={Activity} label="상태" value={u.status === 'active' ? '활성' : '정지'} />
                        <Row icon={Clock} label="가입일" value={fmtDateTime(u.createdAt)} />
                        <Row icon={Clock} label="최근 접속" value={u.lastActive ? fmtDateTime(u.lastActive) : '기록 없음'} />
                      </div>
                    </div>

                    {/* 포인트 · 크레딧 */}
                    <div>
                      <SectionLabel icon={Coins}>포인트 · 크레딧</SectionLabel>
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <Metric label="보유 포인트" value={`${fmtNum(u.points)}P`} />
                        <Metric label="보유 크레딧" value={`${fmtNum(u.credits)}개`} />
                      </div>
                      <div className="card-2 space-y-2 p-3">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="금액 (음수 입력 시 차감)"
                          className={INPUT_CLS}
                        />
                        <input
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          placeholder="메모 (선택)"
                          className={INPUT_CLS}
                        />
                        <div className="flex gap-2">
                          <Button variant="soft" size="sm" className="flex-1" disabled={busy} onClick={() => submitTx('points')}>
                            <Coins size={15} /> 포인트 지급
                          </Button>
                          <Button variant="soft" size="sm" className="flex-1" disabled={busy} onClick={() => submitTx('credits')}>
                            <CreditCard size={15} /> 크레딧 지급
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 플랜 변경 */}
                    <div>
                      <SectionLabel icon={Server}>플랜 변경</SectionLabel>
                      <div className="flex gap-2">
                        <select
                          value={planSel}
                          onChange={(e) => setPlanSel(e.target.value as User['plan'])}
                          className={INPUT_CLS}
                        >
                          <option value="없음">미가입</option>
                          <option value="Starter">Starter</option>
                          <option value="Pro">Pro</option>
                          <option value="Business">Business</option>
                        </select>
                        <Button variant="outline" size="sm" disabled={busy || planSel === u.plan} onClick={submitPlan}>
                          변경
                        </Button>
                      </div>
                    </div>

                    {/* 비밀번호 변경 */}
                    <div>
                      <SectionLabel icon={KeyRound}>비밀번호 변경</SectionLabel>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="새 비밀번호 (8자 이상)"
                          className={INPUT_CLS}
                          autoComplete="new-password"
                        />
                        <Button variant="outline" size="sm" disabled={busy} onClick={submitPassword}>
                          재설정
                        </Button>
                      </div>
                    </div>

                    {/* 안내 발송 */}
                    <div>
                      <SectionLabel icon={Send}>안내 발송 (알림 · 문자)</SectionLabel>
                      <div className="card-2 space-y-2 p-3">
                        <input
                          value={notifyTitle}
                          onChange={(e) => setNotifyTitle(e.target.value)}
                          placeholder="제목 (선택)"
                          className={INPUT_CLS}
                        />
                        <textarea
                          value={notifyBody}
                          onChange={(e) => setNotifyBody(e.target.value)}
                          placeholder="안내 내용을 입력하세요."
                          rows={3}
                          className={cn(INPUT_CLS, 'resize-none')}
                        />
                        <label className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
                          <input
                            type="checkbox"
                            checked={notifySms}
                            onChange={(e) => setNotifySms(e.target.checked)}
                            className="h-4 w-4 rounded border-[var(--border)] accent-violet-600"
                          />
                          문자도 발송 (Solapi)
                        </label>
                        {notifySms && (
                          <input
                            value={notifyPhone}
                            onChange={(e) => setNotifyPhone(e.target.value)}
                            placeholder="수신 전화번호"
                            className={INPUT_CLS}
                          />
                        )}
                        <Button variant="primary" size="sm" className="w-full" disabled={busy} onClick={submitNotify}>
                          <Send size={15} /> 발송
                        </Button>
                      </div>
                    </div>

                    {/* 거래 내역 (실데이터) */}
                    <div>
                      <SectionLabel icon={Receipt}>거래 내역</SectionLabel>
                      {detailLoading && !detail ? (
                        <p className="py-4 text-center text-xs text-[var(--text-dim)]">불러오는 중…</p>
                      ) : detail && detail.transactions.length > 0 ? (
                        <div className="card-2 overflow-x-auto p-0">
                          <table className="w-full min-w-[360px] text-xs">
                            <thead>
                              <tr className="border-b border-[var(--border-soft)] text-left text-[var(--text-dim)]">
                                <th className="px-3 py-2 font-medium">일시</th>
                                <th className="px-3 py-2 font-medium">종류</th>
                                <th className="px-3 py-2 text-right font-medium">증감</th>
                                <th className="px-3 py-2 text-right font-medium">잔액</th>
                                <th className="px-3 py-2 font-medium">메모</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.transactions.map((t, i) => (
                                <tr key={i} className="border-b border-[var(--border-soft)] last:border-0">
                                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-soft)]">{fmtDateTime(t.created_at)}</td>
                                  <td className="px-3 py-2">
                                    <Badge className={txKindBadgeClass(t.kind)}>{txKindLabel(t.kind)}</Badge>
                                  </td>
                                  <td
                                    className={cn(
                                      'px-3 py-2 text-right font-semibold',
                                      t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600',
                                    )}
                                  >
                                    {t.amount >= 0 ? '+' : '−'}
                                    {fmtNum(Math.abs(t.amount))}
                                  </td>
                                  <td className="px-3 py-2 text-right text-[var(--text-soft)]">
                                    {t.balance_after != null ? fmtNum(t.balance_after) : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-[var(--text-soft)]">{t.memo || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="py-4 text-center text-xs text-[var(--text-dim)]">거래 내역이 없습니다.</p>
                      )}
                    </div>

                    {/* 알림 내역 (실데이터) */}
                    <div>
                      <SectionLabel icon={Bell}>알림 내역</SectionLabel>
                      {detail && detail.notifications.length > 0 ? (
                        <div className="space-y-2">
                          {detail.notifications.map((n, i) => (
                            <div key={n.id ?? i} className="card-2 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium">{n.title || '알림'}</p>
                                <span className="flex-shrink-0 text-[11px] text-[var(--text-dim)]">{timeAgo(n.created_at)}</span>
                              </div>
                              {n.body && <p className="mt-0.5 text-xs text-[var(--text-soft)]">{n.body}</p>}
                              <div className="mt-1.5">
                                {n.read ? (
                                  <span className="text-[10px] text-[var(--text-dim)]">읽음</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                                    안읽음
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-4 text-center text-xs text-[var(--text-dim)]">알림 내역이 없습니다.</p>
                      )}
                    </div>

                    {/* 활동 로그 (실데이터) */}
                    <div>
                      <SectionLabel icon={Activity}>활동 로그</SectionLabel>
                      {detail && detail.activity.length > 0 ? (
                        <div className="space-y-2">
                          {detail.activity.map((a, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600">
                                <LogIn size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {a.type}
                                </span>
                                {a.detail && <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">{a.detail}</p>}
                              </div>
                              <span className="flex-shrink-0 text-[11px] text-[var(--text-dim)]">{timeAgo(a.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-4 text-center text-xs text-[var(--text-dim)]">활동 기록이 없습니다.</p>
                      )}
                    </div>

                    {/* 계정 상태 관리 + 강제 탈퇴 */}
                    <div className="flex gap-2 border-t border-[var(--border)] pt-4">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleSuspend(u.id)}>
                        <Ban size={15} /> {u.status === 'active' ? '계정 정지' : '정지 해제'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 !border-rose-200 !text-rose-600 hover:!bg-rose-50"
                        onClick={() => confirmRemove(u.id)}
                      >
                        <Trash2 size={15} /> 강제 탈퇴
                      </Button>
                    </div>
                  </div>
                </>
              )
            })()}
          </aside>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-fade-in',
            toast.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700',
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ icon: Icon, children }: { icon: typeof Globe; children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
      <Icon size={12} /> {children}
    </p>
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
