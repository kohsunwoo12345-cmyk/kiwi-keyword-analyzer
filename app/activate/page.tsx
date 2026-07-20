'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Megaphone,
  Clapperboard,
  Check,
  Copy,
  Landmark,
  ShieldCheck,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth, requestPlan, myPlanRequests, planConfig, type PlanTrack, type PlanConfigData } from '@/lib/auth'

/* 입금 계좌 정보 (PG 연동 전 · 계좌이체 후 승인 신청) */
const BANK = {
  bank: '국민은행',
  account: '123456-04-567890',
  holder: '(주)바이전시',
}

type PlanKey = 'Plus' | 'Pro' | 'Max'
const PLANS: PlanKey[] = ['Plus', 'Pro', 'Max']

const PRICE: Record<'marketer' | 'video', Record<PlanKey, number>> = {
  marketer: { Plus: 29000, Pro: 89000, Max: 249000 },
  video: { Plus: 49000, Pro: 149000, Max: 390000 },
}

const TRACKS: { key: PlanTrack; label: string; icon: typeof Megaphone; desc: string }[] = [
  { key: 'marketer', label: '마케터 전용', icon: Megaphone, desc: 'DB 수집·분석·문자·CRM·리포트' },
  { key: 'video', label: 'AI 영상 제작', icon: Clapperboard, desc: '노드형 스튜디오·크레딧 차감' },
]

const won = (n: number) => '₩' + n.toLocaleString('ko-KR')

export default function ActivatePage() {
  const { user, ready } = useAuth()
  const [track, setTrack] = useState<PlanTrack>('marketer')
  const [plan, setPlan] = useState<PlanKey>('Pro')
  const [months, setMonths] = useState(1) // 이용 기간(개월, 1~12)
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [reqs, setReqs] = useState<any[]>([])
  const [planCfg, setPlanCfg] = useState<PlanConfigData | null>(null)
  useEffect(() => { planConfig().then((r) => { if (r.ok && r.config) setPlanCfg(r.config) }) }, [])
  // 관리자 설정의 실효가(할인 적용) 우선, 없으면 기본 PRICE
  const priceOf = (tk: 'marketer' | 'video', pk: PlanKey): number => {
    const c = planCfg?.[tk]?.[pk]
    if (c) return Math.round((Number(c.price) || 0) * (1 - Math.max(0, Math.min(100, Number(c.discount) || 0)) / 100))
    return PRICE[tk][pk]
  }

  const loadReqs = () => myPlanRequests().then((r) => setReqs(r.requests || []))
  useEffect(() => {
    if (ready && user) loadReqs()
  }, [ready, user])

  // 쿼리스트링(track/plan)으로 넘어오면 해당 플랜을 미리 선택 → 바로 신청 가능
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const tk = q.get('track')
      const pl = q.get('plan')
      if (tk === 'video' || tk === 'marketer') setTrack(tk)
      if (pl === 'Plus' || pl === 'Pro' || pl === 'Max') setPlan(pl as PlanKey)
    } catch {}
  }, [])

  const hasPlan = !!user && (user.role === 'admin' || user.hasPlan === 1)
  const pending = reqs.find((r) => r.status === 'pending')

  const copyAccount = () => {
    navigator.clipboard?.writeText(BANK.account).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      },
      () => {},
    )
  }

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    const r = await requestPlan(track, plan, memo.trim() || undefined, months)
    setBusy(false)
    if (r.ok) {
      setMsg({ ok: true, text: '승인 신청이 접수되었습니다. 입금이 확인되면 관리자 승인 후 이용이 시작됩니다.' })
      setMemo('')
      loadReqs()
    } else {
      setMsg({ ok: false, text: r.error || '신청에 실패했습니다. 잠시 후 다시 시도해 주세요.' })
    }
  }

  // 공통 카드 스타일 (밝고 심플)
  const cardCls = 'rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* 히어로 — 밝은 단색 블루 밴드(네비 가독성 확보 + 산뜻한 느낌) */}
      <section className="bg-gradient-to-b from-blue-600 to-indigo-600 pt-28 pb-16 text-white">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            <ShieldCheck size={15} /> 요금제 활성화
          </span>
          <h1 className="mt-5 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            계좌 입금 후 승인 신청 한 번으로 시작하세요
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-blue-50/90">
            아래 계좌로 입금하신 뒤 플랜을 신청하면, 관리자 승인 즉시 마케팅 대시보드와 노드형 AI 영상 제작을 모두 이용할 수 있어요.
          </p>
        </div>
      </section>

      <section className="pb-24 pt-10">
        <div className="mx-auto max-w-5xl px-5">
          {/* 이미 활성화된 경우 */}
          {ready && hasPlan && (
            <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold">이미 요금제가 활성화되어 있습니다</h3>
              <p className="mt-2 text-sm text-slate-600">마케팅 대시보드와 영상 제작을 모두 이용할 수 있어요.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link href="/dashboard_USE17237_612" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
                  마케팅 대시보드 <ArrowRight size={15} />
                </Link>
                <a href="/studio-nvc-prv-8b3k2/" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <Clapperboard size={15} /> 노드형 영상 스튜디오
                </a>
              </div>
            </div>
          )}

          {/* 미로그인 안내 */}
          {ready && !user && (
            <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
              <p className="text-sm text-amber-800">
                요금제 신청은 로그인 후 이용할 수 있습니다.{' '}
                <Link href="/login" className="font-semibold text-blue-600 hover:underline">로그인하기</Link>
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            {/* 좌 : 입금 계좌 */}
            <div className="lg:col-span-2">
              <div className={`${cardCls} p-6`}>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Landmark size={20} />
                  </span>
                  <h3 className="text-base font-bold">입금 계좌</h3>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">은행</dt>
                    <dd className="font-semibold">{BANK.bank}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">계좌번호</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-semibold tracking-wide">{BANK.account}</span>
                      <button onClick={copyAccount} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50" title="계좌번호 복사">
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">예금주</dt>
                    <dd className="font-semibold">{BANK.holder}</dd>
                  </div>
                </dl>
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                  <p className="flex items-start gap-2">
                    <Clock size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                    입금자명은 <b className="text-slate-900">가입하신 이름</b>으로 보내주세요. 확인이 빠릅니다.
                  </p>
                  <p className="mt-2 flex items-start gap-2">
                    <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                    입금 확인 후 <b className="text-slate-900">관리자 승인 즉시</b> 두 제품 모두 열립니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 우 : 신청 폼 */}
            <div className="lg:col-span-3">
              <div className={`${cardCls} p-6`}>
                <h3 className="text-base font-bold">플랜 선택 후 승인 신청</h3>

                {/* 트랙 */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {TRACKS.map((tk) => {
                    const Icon = tk.icon
                    const on = track === tk.key
                    return (
                      <button
                        key={tk.key}
                        onClick={() => setTrack(tk.key)}
                        className={`rounded-xl border p-3.5 text-left transition ${on ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={on ? 'text-blue-600' : 'text-slate-400'} />
                          <span className="text-sm font-semibold">{tk.label}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-slate-500">{tk.desc}</p>
                      </button>
                    )
                  })}
                </div>

                {/* 플랜 */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {PLANS.map((pk) => {
                    const on = plan === pk
                    return (
                      <button
                        key={pk}
                        onClick={() => setPlan(pk)}
                        className={`rounded-xl border p-3 text-center transition ${on ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className={`text-sm font-bold ${on ? 'text-blue-700' : 'text-slate-900'}`}>{pk}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{won(priceOf(track, pk))}</div>
                      </button>
                    )
                  })}
                </div>

                {/* 이용 기간 — 드롭다운(펼침) */}
                <div className="mt-4">
                  <label htmlFor="months" className="mb-1.5 block text-xs font-semibold text-slate-500">이용 기간</label>
                  <div className="relative">
                    <select
                      id="months"
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m}개월{m === 12 ? ' (최대)' : ''}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>

                {/* 요약 */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {TRACKS.find((t) => t.key === track)?.label} · {plan}
                    </span>
                    <span className="text-slate-500">
                      {won(priceOf(track, plan))} <span className="text-xs">/월</span> × {months}개월
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-700">총 결제 금액</span>
                    <span className="text-lg font-bold text-blue-700">{won(priceOf(track, plan) * months)}</span>
                  </div>
                </div>

                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="입금자명이 가입명과 다르면 여기에 적어주세요 (선택)"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  onClick={submit}
                  disabled={busy || !user || !!pending}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {pending ? '이미 승인 대기 중입니다' : '입금했어요 · 승인 신청하기'}
                </button>

                {msg && (
                  <p className={`mt-3 text-center text-xs ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>
                )}

                {/* 신청 내역 */}
                {reqs.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <h4 className="mb-2 text-xs font-semibold text-slate-500">내 신청 내역</h4>
                    <ul className="space-y-1.5">
                      {reqs.slice(0, 5).map((r, i) => (
                        <li key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            {r.track === 'video' ? 'AI 영상' : '마케터'} · {r.to_plan}
                          </span>
                          <span
                            className={
                              r.status === 'approved'
                                ? 'font-semibold text-emerald-600'
                                : r.status === 'rejected'
                                  ? 'font-semibold text-rose-600'
                                  : 'font-semibold text-amber-600'
                            }
                          >
                            {r.status === 'approved' ? '승인됨' : r.status === 'rejected' ? '반려됨' : '승인 대기'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p className="mt-3 text-center text-xs text-slate-500">
                플랜 상세 비교는 <Link href="/pricing" className="text-blue-600 hover:underline">요금제 안내</Link>에서 확인하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
