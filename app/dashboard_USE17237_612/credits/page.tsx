'use client'

import { useEffect, useState } from 'react'
import {
  Coins,
  Wallet,
  CreditCard,
  Check,
  AlertCircle,
  Clock,
  Zap,
  Sparkles,
  TrendingDown,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Badge, Button } from '@/components/ui'
import { Counter } from '@/components/motion'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { cn } from '@/lib/utils'
import {
  useAuth,
  accountOverview,
  requestCredit,
  myCreditRequests,
  preparePayment,
  confirmPayment,
  CREDIT_PACKAGES,
  CREDIT_COSTS,
  type Tx,
} from '@/lib/auth'

/* ---------- Toss Payments SDK loader (static-export safe) ---------- */
function loadTossSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'))
    if ((window as any).TossPayments) return resolve((window as any).TossPayments)
    const s = document.createElement('script')
    s.src = 'https://js.tosspayments.com/v1/payment'
    s.onload = () => resolve((window as any).TossPayments)
    s.onerror = () => reject(new Error('Toss SDK 로드 실패'))
    document.head.appendChild(s)
  })
}

const CREDITS_PATH = '/dashboard_USE17237_612/credits'

/* ---------- date helper ---------- */
function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}
function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso || '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function ko(n: number) {
  return n.toLocaleString('ko-KR')
}

/* ---------- request status meta ---------- */
const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: '대기중', badge: 'border-amber-500/30 bg-amber-500/12 text-amber-600' },
  approved: { label: '승인됨', badge: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600' },
  rejected: { label: '반려됨', badge: 'border-rose-500/30 bg-rose-500/12 text-rose-600' },
}
function statusMeta(s: string) {
  return STATUS_META[s] || { label: s || '-', badge: 'border-[var(--border)] bg-[var(--panel-2)] text-slate-600' }
}

interface CreditReqRow {
  amount: number
  price: number
  memo: string | null
  status: string
  created_at: string
  decided_at: string | null
}

export default function CreditsPage() {
  const { user, ready, setUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [requests, setRequests] = useState<CreditReqRow[]>([])

  // charge selection: package index or 'custom'
  const [selected, setSelected] = useState<number | 'custom'>(1)
  const [customCredits, setCustomCredits] = useState('')
  // 이 회원에게 적용되는 크레딧 단가(원/크레딧) — 관리자 설정(전역/회원별) 반영
  const [rate, setRate] = useState(65)
  useEffect(() => {
    fetch('/api/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json()).then((d) => { if (d && d.creditPriceKrw > 0) setRate(d.creditPriceKrw) }).catch(() => {})
  }, [])

  const [busy, setBusy] = useState(false)
  const [okMsg, setOkMsg] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  // card (Toss) real-time payment
  const [cardBusy, setCardBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [paySuccess, setPaySuccess] = useState<number | null>(null)
  const [payInfo, setPayInfo] = useState<string | null>(null)
  const [payErr, setPayErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    accountOverview().then((d) => {
      if (!alive) return
      setTransactions(d.transactions)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  async function loadRequests() {
    const r = await myCreditRequests()
    if (r.ok) setRequests(r.requests || [])
  }
  useEffect(() => {
    loadRequests()
  }, [])

  // Handle return from Toss (successUrl / failUrl append query params)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const paymentKey = params.get('paymentKey')
    const orderId = params.get('orderId')
    const amount = params.get('amount')

    if (paymentKey && orderId && amount) {
      setConfirming(true)
      setPayErr(null)
      setPayInfo(null)
      confirmPayment({ paymentKey, orderId, amount: Number(amount) }).then((r) => {
        setConfirming(false)
        if (r.ok) {
          setPaySuccess(r.credits ?? null)
          if (r.user) setUser(r.user)
          loadRequests()
          accountOverview().then((d) => setTransactions(d.transactions))
        } else {
          setPayErr(r.error || '결제 승인에 실패했습니다.')
        }
        window.history.replaceState({}, '', CREDITS_PATH)
      })
      return
    }

    if (params.get('tossfail') === '1') {
      setPayErr(params.get('message') || '카드 결제가 취소되었거나 실패했습니다.')
      window.history.replaceState({}, '', CREDITS_PATH)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500'

  const creditTx = transactions.filter((t) => t.kind === 'credit')

  // 이번 달 사용 크레딧 (차감 = amount < 0)
  const now = new Date()
  const monthUsed = creditTx.reduce((sum, t) => {
    if (t.amount >= 0) return sum
    const d = new Date(t.created_at)
    if (isNaN(d.getTime())) return sum
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      return sum + Math.abs(t.amount)
    }
    return sum
  }, 0)

  // resolve current selection into credits + price
  function resolveSelection(): { credits: number; price: number } {
    if (selected === 'custom') {
      const c = Math.floor(Number(customCredits.replace(/[^0-9]/g, '')))
      return { credits: c, price: 0 }
    }
    const pkg = CREDIT_PACKAGES[selected]
    return { credits: pkg.credits, price: pkg.credits * rate }
  }

  async function submitCharge() {
    setOkMsg(false)
    setErrMsg(null)
    const { credits, price } = resolveSelection()
    if (!credits || credits <= 0) {
      setErrMsg('충전할 크레딧 수량을 입력하세요.')
      return
    }
    setBusy(true)
    const r = await requestCredit(credits, price || undefined)
    setBusy(false)
    if (r.ok) {
      setOkMsg(true)
      setCustomCredits('')
      loadRequests()
      setTimeout(() => setOkMsg(false), 6000)
    } else {
      setErrMsg(r.error || '충전 신청에 실패했습니다.')
    }
  }

  // 카드 즉시 충전 (Toss) — real-time payment
  async function payWithCard() {
    setPaySuccess(null)
    setPayInfo(null)
    setPayErr(null)
    const { credits, price } = resolveSelection()
    if (!credits || credits <= 0) {
      setPayErr('충전할 크레딧 수량을 입력하세요.')
      return
    }
    setCardBusy(true)
    const p = await preparePayment(credits)
    if (!p.ok) {
      setCardBusy(false)
      setPayErr(p.error || '결제 준비에 실패했습니다.')
      return
    }

    // No client key configured → gracefully fall back to approval flow
    if (!p.clientKey) {
      const r = await requestCredit(credits, price || undefined)
      setCardBusy(false)
      if (r.ok) {
        setPayInfo('카드 결제가 아직 설정되지 않았습니다. 승인 충전으로 진행합니다.')
        loadRequests()
      } else {
        setPayErr(r.error || '충전 신청에 실패했습니다.')
      }
      return
    }

    // Real Toss card payment → redirects to Toss checkout
    try {
      const TossPayments = await loadTossSdk()
      const toss = TossPayments(p.clientKey)
      await toss.requestPayment('카드', {
        amount: p.amount,
        orderId: p.orderId,
        orderName: p.orderName,
        customerName: p.customerName,
        customerEmail: p.customerEmail,
        successUrl: window.location.origin + CREDITS_PATH + '?tosssuccess=1',
        failUrl: window.location.origin + CREDITS_PATH + '?tossfail=1',
      })
    } catch (e: any) {
      setCardBusy(false)
      setPayErr(e?.message || '카드 결제를 시작할 수 없습니다.')
    }
  }

  const badgeStyle = (badge?: string) =>
    badge === '추천'
      ? 'border-violet-500/30 bg-violet-500/12 text-violet-600'
      : 'border-amber-500/30 bg-amber-500/12 text-amber-600'

  const creditIn = creditTx.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)
  const creditOut = creditTx.filter((t) => t.amount < 0).reduce((a, t) => a + -t.amount, 0)
  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Coins}
        eyebrow="크레딧"
        title="크레딧 충전"
        desc="충전하고, 어디에 얼마나 썼는지 한 화면에서 확인합니다."
        accent="#f59e0b"
        action={
          <a
            href="#buy"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:brightness-105"
          >
            <CreditCard size={15} /> 충전하기
          </a>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {/* 1. 지표 */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="보유 크레딧"
            icon={Wallet}
            accent="#f59e0b"
            value={ready && user ? <Counter to={user.credits} /> : '—'}
            sub={`크레딧 단가 ${ko(rate)}원`}
          />
          <Metric label="보유 포인트" icon={Coins} accent="#10b981" value={ready && user ? `${ko(user.points)}P` : '—'} sub="크레딧 전환에 사용" />
          <Metric
            label="이번 달 사용"
            icon={TrendingDown}
            accent="#f43f5e"
            value={loading ? '—' : ko(monthUsed)}
            sub={`전체 사용 ${ko(creditOut)} · 충전 ${ko(creditIn)}`}
          />
          <Metric
            label="대기 중인 신청"
            icon={Clock}
            accent="#6366f1"
            value={pending ? `${pending}건` : '없음'}
            sub={pending ? '관리자 승인 후 지급됩니다' : '카드 결제는 즉시 지급됩니다'}
          />
        </div>

        {/* 2. 충전 */}
        <div id="buy" className="scroll-mt-24" />
        <Card
          title="충전 패키지"
          desc={`선택한 수량 × ${ko(rate)}원으로 결제됩니다`}
          action={
            <span className="hidden text-[11.5px] text-[var(--text-dim)] sm:block">한 번에 하나의 신청만 대기할 수 있습니다</span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CREDIT_PACKAGES.map((pkg, i) => {
              const active = selected === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={cn(
                    'relative flex flex-col rounded-2xl border p-4 text-left transition-all',
                    active
                      ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/40'
                      : 'border-[var(--border)] hover:border-amber-500/40 hover:bg-[var(--panel-2)]',
                  )}
                >
                  {pkg.badge && (
                    <span className={cn('absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-semibold', badgeStyle(pkg.badge))}>
                      {pkg.badge}
                    </span>
                  )}
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
                    <Coins size={17} />
                  </span>
                  <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
                    {ko(pkg.credits)}
                    <span className="ml-1 text-sm font-semibold text-[var(--text-soft)]">크레딧</span>
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-soft)] tabular-nums">{(pkg.credits * rate).toLocaleString()}원</p>
                  <span className={cn('mt-2 inline-flex items-center gap-1 text-xs font-semibold', active ? 'text-amber-500' : 'text-transparent')}>
                    <Check size={13} /> 선택됨
                  </span>
                </button>
              )
            })}

            {/* 직접 입력 */}
            <button
              type="button"
              onClick={() => setSelected('custom')}
              className={cn(
                'relative flex flex-col rounded-2xl border p-4 text-left transition-all',
                selected === 'custom'
                  ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/40'
                  : 'border-dashed border-[var(--border)] hover:border-amber-500/40 hover:bg-[var(--panel-2)]',
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--panel-2)] text-[var(--text-dim)]">
                <Plus size={17} />
              </span>
              <p className="mt-3 text-sm font-semibold">직접 입력</p>
              <input
                value={customCredits}
                onChange={(e) => {
                  setCustomCredits(e.target.value)
                  setSelected('custom')
                }}
                onClick={(e) => e.stopPropagation()}
                className={cn(inputCls, 'mt-2')}
                placeholder="예: 30"
                inputMode="numeric"
              />
              <p className="mt-1.5 text-xs tabular-nums text-[var(--text-dim)]">
                {customCredits ? `${(Math.max(0, Math.floor(Number(customCredits.replace(/[^0-9]/g, '')))) * rate).toLocaleString()}원` : '수량을 입력하세요'}
              </p>
            </button>
          </div>

          {/* 결제 방식 */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
                  <Zap size={17} />
                </span>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    카드로 즉시 충전
                    <span className="rounded-full border border-amber-500/30 bg-[var(--panel)] px-1.5 py-0.5 text-[10px] font-bold text-amber-500">Toss</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-dim)]">결제 즉시 크레딧이 지급됩니다.</p>
                </div>
              </div>
              <Button onClick={payWithCard} disabled={cardBusy || confirming} className="mt-3 w-full justify-center">
                <CreditCard size={16} /> {cardBusy ? '결제창 여는 중...' : confirming ? '결제 확인 중...' : '카드로 결제하기'}
              </Button>
            </div>

            <div className="flex flex-col rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--panel-2)] text-[var(--text-dim)]">
                  <Clock size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold">충전 신청 (관리자 승인)</p>
                  <p className="mt-0.5 text-xs text-[var(--text-dim)]">신청 후 승인되면 지급됩니다.</p>
                </div>
              </div>
              <Button onClick={submitCharge} disabled={busy} variant="outline" className="mt-3 w-full justify-center">
                <Sparkles size={16} /> {busy ? '신청 중...' : '충전 신청'}
              </Button>
            </div>
          </div>

          {/* 상태 메시지 */}
          <div className="mt-4 space-y-2 empty:mt-0">
            {okMsg && <Msg tone="ok">충전 신청이 접수되었습니다. 관리자 승인 후 크레딧이 지급됩니다.</Msg>}
            {errMsg && <Msg tone="err">{errMsg}</Msg>}
            {confirming && <Msg tone="warn">결제를 확인하는 중입니다...</Msg>}
            {paySuccess !== null && <Msg tone="ok">{ko(paySuccess)} 크레딧이 충전되었습니다.</Msg>}
            {payInfo && <Msg tone="warn">{payInfo}</Msg>}
            {payErr && <Msg tone="err">{payErr}</Msg>}
          </div>
        </Card>

        {/* 3. 사용 단가 */}
        <Card title="크레딧 사용 안내" desc="기능 1회 실행에 필요한 크레딧">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(CREDIT_COSTS).map(([key, c]) => (
              <div key={key} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3.5 py-3">
                <span className="truncate text-[13px] font-medium">{c.label}</span>
                <span className="inline-flex flex-shrink-0 items-center gap-1 text-[13px] font-bold tabular-nums text-amber-500">
                  <Coins size={14} /> {c.cost}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
            <AlertCircle size={13} /> 크레딧이 부족하면 기능 사용이 제한됩니다.
          </p>
        </Card>

        {/* 4. 충전 신청 내역 */}
        <section id="history" className="scroll-mt-24">
          <Card title="충전 신청 내역" desc={requests.length ? `${requests.length}건` : undefined} bodyClassName="p-0">
            {requests.length === 0 ? (
              <EmptyState icon={Clock} title="충전 신청 내역이 없습니다" hint="위에서 패키지를 고르고 충전 신청 또는 카드 결제를 진행하세요." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                      <th className="px-5 py-2.5 font-semibold">신청일</th>
                      <th className="px-5 py-2.5 text-right font-semibold">크레딧</th>
                      <th className="px-5 py-2.5 text-right font-semibold">금액</th>
                      <th className="px-5 py-2.5 text-right font-semibold">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r, i) => {
                      const m = statusMeta(r.status)
                      return (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-2)]">
                          <td className="whitespace-nowrap px-5 py-3 text-[var(--text-soft)]">{fmtDate(r.created_at)}</td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums">{ko(r.amount)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{r.price ? `${r.price.toLocaleString()}원` : '-'}</td>
                          <td className="px-5 py-3 text-right">
                            <Badge className={m.badge}>{m.label}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        {/* 5. 크레딧 사용 내역 */}
        <Card
          title="크레딧 사용 내역"
          desc={creditTx.length ? `충전 ${ko(creditIn)} · 사용 ${ko(creditOut)}` : undefined}
          bodyClassName="p-0"
          action={
            <Button href="/dashboard_USE17237_612/profile" variant="ghost" size="sm">
              전체 계정 내역 <ArrowRight size={15} />
            </Button>
          }
        >
          {loading ? (
            <p className="py-10 text-center text-sm text-[var(--text-dim)]">불러오는 중...</p>
          ) : creditTx.length === 0 ? (
            <EmptyState icon={Wallet} title="크레딧 사용 내역이 없습니다" hint="도구를 실행하면 차감 내역이 이곳에 쌓입니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11.5px] uppercase tracking-wide text-[var(--text-dim)]">
                    <th className="px-5 py-2.5 font-semibold">일시</th>
                    <th className="px-5 py-2.5 font-semibold">내용</th>
                    <th className="px-5 py-2.5 text-right font-semibold">증감</th>
                    <th className="px-5 py-2.5 text-right font-semibold">잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {creditTx.map((t, i) => {
                    const plus = t.amount >= 0
                    return (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-2)]">
                        <td className="whitespace-nowrap px-5 py-3 text-[var(--text-soft)]">{fmtDate(t.created_at)}</td>
                        <td className="px-5 py-3">{t.memo || '-'}</td>
                        <td className={cn('px-5 py-3 text-right font-semibold tabular-nums', plus ? 'text-emerald-500' : 'text-rose-500')}>
                          {plus ? '+' : '-'}
                          {ko(Math.abs(t.amount))}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">
                          {t.balance_after == null ? '-' : ko(t.balance_after)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

/** 상태 메시지 한 줄 — 성공·경고·오류 */
function Msg({ tone, children }: { tone: 'ok' | 'warn' | 'err'; children: React.ReactNode }) {
  const map = {
    ok: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500',
    warn: 'border-amber-500/30 bg-amber-500/12 text-amber-500',
    err: 'border-rose-500/30 bg-rose-500/12 text-rose-500',
  } as const
  const Icon = tone === 'err' ? AlertCircle : tone === 'warn' ? Clock : Check
  return (
    <div className={cn('flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm', map[tone])}>
      <Icon size={15} className="flex-shrink-0" /> {children}
    </div>
  )
}
