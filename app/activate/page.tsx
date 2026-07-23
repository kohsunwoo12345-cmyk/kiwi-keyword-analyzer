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
import { useAuth, requestPlan, myPlanRequests, planConfig, validateCouponCode, type PlanTrack, type PlanConfigData } from '@/lib/auth'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  // ===== TRACKS =====
  '마케터 전용': { en: 'For marketers', ja: 'マーケター専用', zh: '营销专属' },
  'DB 수집·분석·문자·CRM·리포트': { en: 'Lead collection · analysis · SMS · CRM · reports', ja: 'DB収集・分析・SMS・CRM・レポート', zh: '数据采集·分析·短信·CRM·报表' },
  'AI 영상 제작': { en: 'AI video production', ja: 'AI動画制作', zh: 'AI 视频制作' },
  '노드형 스튜디오·크레딧 차감': { en: 'Node-based studio · credit-based', ja: 'ノード型スタジオ・クレジット消費', zh: '节点式工作室·积分扣除' },

  // ===== STATUS / TOAST MESSAGES =====
  '쿠폰 코드를 입력하세요.': { en: 'Please enter a coupon code.', ja: 'クーポンコードを入力してください。', zh: '请输入优惠券代码。' },
  '사용할 수 없는 쿠폰입니다.': { en: 'This coupon cannot be used.', ja: 'ご利用いただけないクーポンです。', zh: '此优惠券无法使用。' },
  '승인 신청이 접수되었습니다. 입금이 확인되면 관리자 승인 후 이용이 시작됩니다.': { en: 'Your approval request has been received. Once payment is confirmed, service begins after admin approval.', ja: '承認申請を受け付けました。入金が確認され次第、管理者の承認後にご利用が開始されます。', zh: '您的申请已受理。确认到账后，经管理员批准即可开始使用。' },
  '신청에 실패했습니다. 잠시 후 다시 시도해 주세요.': { en: 'Request failed. Please try again shortly.', ja: '申請に失敗しました。しばらくしてから再度お試しください。', zh: '申请失败。请稍后重试。' },

  // ===== HERO =====
  '요금제 활성화': { en: 'Activate plan', ja: 'プランの有効化', zh: '激活套餐' },
  '계좌 입금 후 승인 신청 한 번으로 시작하세요': { en: 'Get started with a single approval request after a bank transfer', ja: '口座振込後、承認申請一つで始めましょう', zh: '银行转账后，一次申请审批即可开始' },
  '아래 계좌로 입금하신 뒤 플랜을 신청하면, 관리자 승인 즉시 마케팅 대시보드와 노드형 AI 영상 제작을 모두 이용할 수 있어요.': { en: 'Transfer to the account below and request a plan — the moment an admin approves, you can use both the marketing dashboard and node-based AI video production.', ja: '下記口座にお振込後にプランを申請いただくと、管理者の承認後すぐにマーケティングダッシュボードとノード型AI動画制作の両方をご利用いただけます。', zh: '向以下账户转账后申请套餐，管理员批准后即可同时使用营销仪表板和节点式 AI 视频制作。' },

  // ===== ALREADY ACTIVE =====
  '이미 요금제가 활성화되어 있습니다': { en: 'Your plan is already active', ja: 'すでにプランが有効です', zh: '您的套餐已激活' },
  '마케팅 대시보드와 영상 제작을 모두 이용할 수 있어요.': { en: 'You can use both the marketing dashboard and video production.', ja: 'マーケティングダッシュボードと動画制作の両方をご利用いただけます。', zh: '您可以同时使用营销仪表板和视频制作。' },
  '마케팅 대시보드': { en: 'Marketing dashboard', ja: 'マーケティングダッシュボード', zh: '营销仪表板' },
  '노드형 영상 스튜디오': { en: 'Node-based video studio', ja: 'ノード型動画スタジオ', zh: '节点式视频工作室' },

  // ===== NOT LOGGED IN =====
  '요금제 신청은 로그인 후 이용할 수 있습니다.': { en: 'You must log in to request a plan.', ja: 'プランの申請はログイン後にご利用いただけます。', zh: '登录后方可申请套餐。' },
  '로그인하기': { en: 'Log in', ja: 'ログイン', zh: '登录' },

  // ===== TRANSFER ACCOUNT =====
  '입금 계좌': { en: 'Transfer account', ja: '振込口座', zh: '汇款账户' },
  '은행': { en: 'Bank', ja: '銀行', zh: '银行' },
  '계좌번호': { en: 'Account number', ja: '口座番号', zh: '账号' },
  '계좌번호 복사': { en: 'Copy account number', ja: '口座番号をコピー', zh: '复制账号' },
  '예금주': { en: 'Account holder', ja: '口座名義', zh: '开户名' },
  '입금자명은': { en: 'Please send under', ja: 'お振込は', zh: '请使用' },
  '가입하신 이름': { en: 'your registered name', ja: 'ご登録のお名前', zh: '您注册时的姓名' },
  '으로 보내주세요. 확인이 빠릅니다.': { en: ' — we’ll confirm it faster.', ja: 'でお願いします。確認がスムーズです。', zh: '汇款，确认更快。' },
  '입금 확인 후': { en: 'After payment is confirmed,', ja: '入金確認後、', zh: '确认到账后，' },
  '관리자 승인 즉시': { en: 'immediately upon admin approval', ja: '管理者の承認後すぐに', zh: '管理员批准后即刻' },
  '두 제품 모두 열립니다.': { en: 'both products unlock.', ja: '両方の製品が開きます。', zh: '两款产品全部开通。' },

  // ===== REQUEST FORM =====
  '플랜 선택 후 승인 신청': { en: 'Select a plan and request approval', ja: 'プランを選択して承認申請', zh: '选择套餐并申请批准' },
  '이용 기간': { en: 'Subscription period', ja: '利用期間', zh: '使用期限' },
  '개월': { en: ' months', ja: 'ヶ月', zh: '个月' },
  ' (최대)': { en: ' (max)', ja: '（最大）', zh: '（最大）' },
  '쿠폰 · 할인코드 (선택)': { en: 'Coupon · discount code (optional)', ja: 'クーポン・割引コード（任意）', zh: '优惠券·折扣码（可选）' },
  '할인코드 입력': { en: 'Enter discount code', ja: '割引コードを入力', zh: '输入折扣码' },
  '확인 중…': { en: 'Checking…', ja: '確認中…', zh: '验证中…' },
  '적용': { en: 'Apply', ja: '適用', zh: '应用' },
  '적용됨': { en: 'applied', ja: '適用', zh: '已应用' },
  '/월': { en: '/mo', ja: '/月', zh: '/月' },
  '정가': { en: 'List price', ja: '定価', zh: '原价' },
  '쿠폰 할인': { en: 'Coupon discount', ja: 'クーポン割引', zh: '优惠券折扣' },
  '총 결제 금액': { en: 'Total payment', ja: 'お支払い総額', zh: '应付总额' },
  '입금자명이 가입명과 다르면 여기에 적어주세요 (선택)': { en: 'If the depositor name differs from your account name, note it here (optional)', ja: '振込名義がご登録名と異なる場合はこちらにご記入ください（任意）', zh: '如汇款人姓名与注册名不同，请在此填写（可选）' },
  '이미 승인 대기 중입니다': { en: 'Already awaiting approval', ja: 'すでに承認待ちです', zh: '已在等待批准' },
  '입금했어요 · 승인 신청하기': { en: 'I’ve paid · Request approval', ja: '入金しました · 承認を申請', zh: '已付款 · 申请批准' },

  // ===== REQUEST HISTORY =====
  '내 신청 내역': { en: 'My requests', ja: '申請履歴', zh: '我的申请记录' },
  'AI 영상': { en: 'AI video', ja: 'AI動画', zh: 'AI 视频' },
  '마케터': { en: 'Marketer', ja: 'マーケター', zh: '营销人员' },
  '승인됨': { en: 'Approved', ja: '承認済み', zh: '已批准' },
  '반려됨': { en: 'Rejected', ja: '却下', zh: '已拒绝' },
  '승인 대기': { en: 'Pending', ja: '承認待ち', zh: '待批准' },

  // ===== FOOTER LINK =====
  '플랜 상세 비교는': { en: 'For a detailed plan comparison, see', ja: 'プランの詳細比較は', zh: '套餐详细对比请查看' },
  '요금제 안내': { en: 'Plan guide', ja: '料金プランのご案内', zh: '套餐说明' },
  '에서 확인하세요.': { en: '.', ja: 'をご覧ください。', zh: '。' },
}

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
  const t = useT(M)
  const { user, ready } = useAuth()
  const [track, setTrack] = useState<PlanTrack>('marketer')
  const [plan, setPlan] = useState<PlanKey>('Pro')
  const [months, setMonths] = useState(1) // 이용 기간(개월, 1~12)
  const [memo, setMemo] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponInfo, setCouponInfo] = useState<{ discount: number; final: number; label: string } | null>(null)
  const [couponErr, setCouponErr] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)
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

  // 트랙·플랜·개월이 바뀌면 이전 쿠폰 적용은 무효(재적용 필요)
  useEffect(() => { setCouponInfo(null); setCouponErr('') }, [track, plan, months])

  const applyCoupon = async () => {
    if (!coupon.trim()) { setCouponErr(t('쿠폰 코드를 입력하세요.')); return }
    setCouponBusy(true); setCouponErr('')
    const r = await validateCouponCode({ code: coupon.trim(), track, plan, months })
    setCouponBusy(false)
    if (r.ok) { setCouponInfo({ discount: r.discount || 0, final: r.final ?? 0, label: r.label || '' }); setCouponErr('') }
    else { setCouponInfo(null); setCouponErr(r.error || t('사용할 수 없는 쿠폰입니다.')) }
  }

  const baseTotal = priceOf(track, plan) * months
  const finalTotal = couponInfo ? couponInfo.final : baseTotal

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    const r = await requestPlan(track, plan, memo.trim() || undefined, months, couponInfo ? coupon.trim() : undefined)
    setBusy(false)
    if (r.ok) {
      setMsg({ ok: true, text: t('승인 신청이 접수되었습니다. 입금이 확인되면 관리자 승인 후 이용이 시작됩니다.') })
      setMemo('')
      loadReqs()
    } else {
      setMsg({ ok: false, text: r.error || t('신청에 실패했습니다. 잠시 후 다시 시도해 주세요.') })
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
            <ShieldCheck size={15} /> {t('요금제 활성화')}
          </span>
          <h1 className="mt-5 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('계좌 입금 후 승인 신청 한 번으로 시작하세요')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-blue-50/90">
            {t('아래 계좌로 입금하신 뒤 플랜을 신청하면, 관리자 승인 즉시 마케팅 대시보드와 노드형 AI 영상 제작을 모두 이용할 수 있어요.')}
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
              <h3 className="text-lg font-bold">{t('이미 요금제가 활성화되어 있습니다')}</h3>
              <p className="mt-2 text-sm text-slate-600">{t('마케팅 대시보드와 영상 제작을 모두 이용할 수 있어요.')}</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link href="/dashboard_USE17237_612" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
                  {t('마케팅 대시보드')} <ArrowRight size={15} />
                </Link>
                <a href="/studio-nvc-prv-8b3k2/" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <Clapperboard size={15} /> {t('노드형 영상 스튜디오')}
                </a>
              </div>
            </div>
          )}

          {/* 미로그인 안내 */}
          {ready && !user && (
            <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
              <p className="text-sm text-amber-800">
                {t('요금제 신청은 로그인 후 이용할 수 있습니다.')}{' '}
                <Link href="/login" className="font-semibold text-blue-600 hover:underline">{t('로그인하기')}</Link>
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
                  <h3 className="text-base font-bold">{t('입금 계좌')}</h3>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">{t('은행')}</dt>
                    <dd className="font-semibold">{BANK.bank}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">{t('계좌번호')}</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-semibold tracking-wide">{BANK.account}</span>
                      <button onClick={copyAccount} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50" title={t('계좌번호 복사')}>
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">{t('예금주')}</dt>
                    <dd className="font-semibold">{BANK.holder}</dd>
                  </div>
                </dl>
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                  <p className="flex items-start gap-2">
                    <Clock size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                    {t('입금자명은')} <b className="text-slate-900">{t('가입하신 이름')}</b>{t('으로 보내주세요. 확인이 빠릅니다.')}
                  </p>
                  <p className="mt-2 flex items-start gap-2">
                    <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                    {t('입금 확인 후')} <b className="text-slate-900">{t('관리자 승인 즉시')}</b> {t('두 제품 모두 열립니다.')}
                  </p>
                </div>
              </div>
            </div>

            {/* 우 : 신청 폼 */}
            <div className="lg:col-span-3">
              <div className={`${cardCls} p-6`}>
                <h3 className="text-base font-bold">{t('플랜 선택 후 승인 신청')}</h3>

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
                          <span className="text-sm font-semibold">{t(tk.label)}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-slate-500">{t(tk.desc)}</p>
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
                  <label htmlFor="months" className="mb-1.5 block text-xs font-semibold text-slate-500">{t('이용 기간')}</label>
                  <div className="relative">
                    <select
                      id="months"
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m}{t('개월')}{m === 12 ? t(' (최대)') : ''}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>

                {/* 쿠폰 · 할인코드 */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">{t('쿠폰 · 할인코드 (선택)')}</label>
                  <div className="flex gap-2">
                    <input
                      value={coupon}
                      onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponInfo(null); setCouponErr('') }}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      placeholder={t('할인코드 입력')}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm uppercase tracking-wider outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponBusy || !coupon.trim()}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {couponBusy ? t('확인 중…') : t('적용')}
                    </button>
                  </div>
                  {couponInfo && <p className="mt-1.5 text-xs font-semibold text-emerald-600">✓ {couponInfo.label} {t('적용됨')} (−{won(couponInfo.discount)})</p>}
                  {couponErr && <p className="mt-1.5 text-xs text-rose-500">{couponErr}</p>}
                </div>

                {/* 요약 */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {t(TRACKS.find((x) => x.key === track)?.label ?? '')} · {plan}
                    </span>
                    <span className="text-slate-500">
                      {won(priceOf(track, plan))} <span className="text-xs">{t('/월')}</span> × {months}{t('개월')}
                    </span>
                  </div>
                  {couponInfo && (
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{t('정가')}</span>
                      <span className="text-slate-400 line-through">{won(baseTotal)}</span>
                    </div>
                  )}
                  {couponInfo && (
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-pink-600">{t('쿠폰 할인')} ({couponInfo.label})</span>
                      <span className="font-semibold text-pink-600">−{won(couponInfo.discount)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-700">{t('총 결제 금액')}</span>
                    <span className="text-lg font-bold text-blue-700">{won(finalTotal)}</span>
                  </div>
                </div>

                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder={t('입금자명이 가입명과 다르면 여기에 적어주세요 (선택)')}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  onClick={submit}
                  disabled={busy || !user || !!pending}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {pending ? t('이미 승인 대기 중입니다') : t('입금했어요 · 승인 신청하기')}
                </button>

                {msg && (
                  <p className={`mt-3 text-center text-xs ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>
                )}

                {/* 신청 내역 */}
                {reqs.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <h4 className="mb-2 text-xs font-semibold text-slate-500">{t('내 신청 내역')}</h4>
                    <ul className="space-y-1.5">
                      {reqs.slice(0, 5).map((r, i) => (
                        <li key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            {r.track === 'video' ? t('AI 영상') : t('마케터')} · {r.to_plan}
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
                            {r.status === 'approved' ? t('승인됨') : r.status === 'rejected' ? t('반려됨') : t('승인 대기')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p className="mt-3 text-center text-xs text-slate-500">
                {t('플랜 상세 비교는')} <Link href="/pricing" className="text-blue-600 hover:underline">{t('요금제 안내')}</Link>{t('에서 확인하세요.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
