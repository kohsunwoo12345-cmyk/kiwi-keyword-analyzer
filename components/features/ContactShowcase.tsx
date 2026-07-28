'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Inbox,
  UserCheck,
  MessagesSquare,
  Rocket,
  Briefcase,
  LifeBuoy,
  Handshake,
  CreditCard,
  Mail,
  Clock,
  ArrowRight,
  Check,
} from 'lucide-react'
import { Reveal } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* journey */
  '문의 이후': { en: 'After you write in', ja: 'お問い合わせのあと', zh: '提交之后' },
  '보내고 나면 이렇게 진행됩니다': { en: 'Here’s what happens once you send it', ja: '送信後はこう進みます', zh: '送出之后是这样推进的' },
  '남겨주신 내용은 담당자가 직접 읽습니다. 어떤 순서로 연락이 가는지 미리 알려드릴게요.': {
    en: 'What you write is read by a person on our team. Here’s the order in which we’ll get back to you.',
    ja: 'いただいた内容は担当者が直接読みます。どの順番でご連絡するか、あらかじめお伝えします。',
    zh: '你留下的内容由负责人亲自阅读。这里先说明我们会按什么顺序联系你。',
  },
  '문의 접수': { en: 'Received', ja: '受付', zh: '已收到' },
  '담당자 배정': { en: 'Assigned', ja: '担当者の割り当て', zh: '分配负责人' },
  '상황 파악 · 상담': { en: 'Understanding your case', ja: '状況の把握・相談', zh: '了解情况与沟通' },
  '워크스페이스 준비': { en: 'Workspace setup', ja: 'ワークスペース準備', zh: '准备工作区' },
  '보내주신 내용이 그대로 담당 팀에 전달됩니다.': {
    en: 'What you sent goes straight to the responsible team.',
    ja: 'お送りいただいた内容がそのまま担当チームへ渡ります。',
    zh: '你提交的内容会原样转给对应团队。',
  },
  '문의 유형에 맞는 담당자가 확인합니다.': {
    en: 'Someone who handles your type of inquiry picks it up.',
    ja: 'お問い合わせの種類に合った担当者が確認します。',
    zh: '由对应类型的负责人来接手。',
  },
  '지금 쓰는 방식과 목표를 듣고 필요한 것만 정리해 드립니다.': {
    en: 'We listen to how you work today and your goals, then lay out only what you actually need.',
    ja: '今のやり方と目標を伺い、必要なものだけを整理してお渡しします。',
    zh: '先听你现在的做法和目标，再只整理你真正需要的部分。',
  },
  '계정과 워크스페이스를 열고 첫 세팅까지 함께 봅니다.': {
    en: 'We open your account and workspace and walk through the first setup together.',
    ja: 'アカウントとワークスペースを開き、初期設定まで一緒に確認します。',
    zh: '开好账号和工作区，连第一次配置也一起过一遍。',
  },
  '운영 시간': { en: 'Hours', ja: '受付時間', zh: '服务时间' },
  '평일 10:00 - 18:00': { en: 'Weekdays 10:00–18:00 (KST)', ja: '平日 10:00〜18:00', zh: '工作日 10:00–18:00' },
  '접수된 문의는 운영 시간 안에 순서대로 확인합니다.': {
    en: 'Inquiries are reviewed in order during business hours.',
    ja: '受け付けたお問い合わせは受付時間内に順番に確認します。',
    zh: '收到的咨询会在服务时间内按顺序处理。',
  },

  /* routing */
  '문의 유형': { en: 'Inquiry type', ja: 'お問い合わせの種類', zh: '咨询类型' },
  '어떤 이야기든 맞는 사람에게 갑니다': { en: 'Whatever it is, it reaches the right person', ja: 'どんな内容でも、合う担当者に届きます', zh: '不管什么事，都会送到对的人手上' },
  '아래 유형 중 하나만 골라 남겨주시면, 그에 맞는 담당자에게 바로 전달됩니다.': {
    en: 'Just pick one of the types below when you write in and it goes straight to the matching team.',
    ja: '以下の種類から一つ選んでお書きいただければ、該当する担当者へすぐ届きます。',
    zh: '在下面的类型里选一个填写，就会直接转到对应的团队。',
  },
  '도입 상담': { en: 'Getting started', ja: '導入相談', zh: '导入咨询' },
  '기술 지원': { en: 'Technical support', ja: '技術サポート', zh: '技术支持' },
  '제휴 · 파트너십': { en: 'Partnerships', ja: '提携・パートナーシップ', zh: '合作与伙伴' },
  '결제 · 청구': { en: 'Billing', ja: '決済・請求', zh: '付款与账单' },
  '플랜 선택, 팀 규모에 맞는 구성, 도입 일정이 궁금할 때': {
    en: 'When you’re weighing plans, team-fit, or a rollout schedule',
    ja: 'プラン選び、チーム規模に合う構成、導入スケジュールが気になるとき',
    zh: '在纠结选哪个套餐、怎么配团队、什么时候上线时',
  },
  '연동이 막히거나 결과가 기대와 다를 때': {
    en: 'When an integration is stuck or the output isn’t what you expected',
    ja: '連携がうまくいかない、結果が期待と違うとき',
    zh: '当集成卡住，或结果与预期不符时',
  },
  '대행사 협업, 리셀러, 공동 마케팅을 논의하고 싶을 때': {
    en: 'When you want to talk agency collaboration, reselling, or co-marketing',
    ja: '代理店との協業、リセラー、共同マーケティングを話したいとき',
    zh: '想聊代理合作、经销或联合营销时',
  },
  '세금계산서, 결제 수단, 요금 확인이 필요할 때': {
    en: 'When you need an invoice, a payment method change, or a charge explained',
    ja: '請求書、支払い方法、料金の確認が必要なとき',
    zh: '需要发票、更换支付方式或核对费用时',
  },
  '연결되는 곳': { en: 'Goes to', ja: '届く先', zh: '会转到' },
}

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ───────────────── 1. 문의 이후 진행 ───────────────── */
const JOURNEY = [
  { key: '문의 접수', icon: Inbox, color: '#2563eb', desc: '보내주신 내용이 그대로 담당 팀에 전달됩니다.' },
  { key: '담당자 배정', icon: UserCheck, color: '#6366f1', desc: '문의 유형에 맞는 담당자가 확인합니다.' },
  { key: '상황 파악 · 상담', icon: MessagesSquare, color: '#06b6d4', desc: '지금 쓰는 방식과 목표를 듣고 필요한 것만 정리해 드립니다.' },
  { key: '워크스페이스 준비', icon: Rocket, color: '#10b981', desc: '계정과 워크스페이스를 열고 첫 세팅까지 함께 봅니다.' },
]

function ContactJourney() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setStep((v) => (v + 1) % (JOURNEY.length + 1)), 1900)
    return () => clearInterval(id)
  }, [inView])

  const progress = Math.min(100, (step / (JOURNEY.length - 1)) * 100)

  return (
    <section className="relative overflow-hidden border-t border-white/10 py-24">
      <div className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[300px] w-[760px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[140px]" />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('문의 이후')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('보내고 나면 이렇게 진행됩니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('남겨주신 내용은 담당자가 직접 읽습니다. 어떤 순서로 연락이 가는지 미리 알려드릴게요.')}
          </p>
        </Reveal>

        <Reveal className="mt-12">
          <div className="relative mb-6 hidden h-1 rounded-full bg-white/[0.07] lg:block">
            <span
              className="absolute inset-y-0 left-0 rounded-full brand-gradient"
              style={{ width: `${progress}%`, transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 0 16px -3px #2563eb' }}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {JOURNEY.map((j, i) => {
              const Icon = j.icon
              const done = i < step
              const now = i === step
              return (
                <div
                  key={j.key}
                  className={cn(
                    'rounded-3xl border p-5 transition-all duration-500',
                    now ? 'border-white/25 bg-white/[0.06]' : done ? 'border-white/[0.1] bg-white/[0.03]' : 'border-white/[0.07] bg-white/[0.015]',
                  )}
                  style={{ transform: now ? 'translateY(-6px)' : 'none', boxShadow: now ? `0 28px 60px -34px ${j.color}` : undefined }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl transition-all duration-500"
                        style={{
                          background: done || now ? `${j.color}26` : 'rgba(255,255,255,0.05)',
                          color: done || now ? j.color : 'var(--text-dim)',
                          transform: now ? 'scale(1.08)' : 'none',
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      {now && <span className="animate-ping-ring absolute inset-0 rounded-xl" style={{ border: `1px solid ${j.color}` }} />}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[var(--text-dim)]">0{i + 1}</span>
                    {done && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-400">
                        <Check size={9} />
                      </span>
                    )}
                  </div>
                  <h3 className={cn('mt-4 text-[14.5px] font-semibold transition-colors', done || now ? 'text-[var(--text)]' : 'text-[var(--text-dim)]')}>
                    {t(j.key)}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--text-soft)]">{t(j.desc)}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-3.5 text-center">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-soft)]">
              <Clock size={13} className="text-blue-400" /> {t('운영 시간')} · {t('평일 10:00 - 18:00')}
            </span>
            <span className="text-[11.5px] text-[var(--text-dim)]">{t('접수된 문의는 운영 시간 안에 순서대로 확인합니다.')}</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. 문의 유형 라우팅 ───────────────── */
const ROUTES = [
  { key: '도입 상담', icon: Briefcase, color: '#2563eb', desc: '플랜 선택, 팀 규모에 맞는 구성, 도입 일정이 궁금할 때', to: 'biz@nextbygency.com' },
  { key: '기술 지원', icon: LifeBuoy, color: '#06b6d4', desc: '연동이 막히거나 결과가 기대와 다를 때', to: 'cs@nextbygency.com' },
  { key: '제휴 · 파트너십', icon: Handshake, color: '#a855f7', desc: '대행사 협업, 리셀러, 공동 마케팅을 논의하고 싶을 때', to: 'biz@nextbygency.com' },
  { key: '결제 · 청구', icon: CreditCard, color: '#10b981', desc: '세금계산서, 결제 수단, 요금 확인이 필요할 때', to: 'cs@nextbygency.com' },
]

function InquiryRouting() {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setActive((v) => (v + 1) % ROUTES.length), 2300)
    return () => clearInterval(id)
  }, [inView])

  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-white/[0.015] py-24">
      <div
        className="animate-drift-slow pointer-events-none absolute right-0 top-6 h-[300px] w-[480px] rounded-full blur-[140px]"
        style={{ background: `${ROUTES[active].color}22` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('문의 유형')}</SectionTag>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t('어떤 이야기든 맞는 사람에게 갑니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('아래 유형 중 하나만 골라 남겨주시면, 그에 맞는 담당자에게 바로 전달됩니다.')}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {ROUTES.map((r, i) => {
            const Icon = r.icon
            const on = i === active
            return (
              <Reveal key={r.key} delay={(i % 2) * 80}>
                <a
                  href={`mailto:${r.to}`}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'group flex h-full items-start gap-4 rounded-3xl border p-5 transition-all duration-500',
                    on ? 'border-white/25 bg-white/[0.06]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20',
                  )}
                  style={{ transform: on ? 'translateY(-4px)' : 'none', boxShadow: on ? `0 26px 56px -34px ${r.color}` : undefined }}
                >
                  <span className="relative">
                    <span
                      className="grid h-12 w-12 place-items-center rounded-2xl transition-all duration-500"
                      style={{ background: `${r.color}22`, color: r.color, transform: on ? 'scale(1.06)' : 'none' }}
                    >
                      <Icon size={20} />
                    </span>
                    {on && <span className="animate-ping-ring absolute inset-0 rounded-2xl" style={{ border: `1px solid ${r.color}` }} />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="text-[15px] font-semibold text-[var(--text)]">{t(r.key)}</span>
                    <span className="mt-1.5 block text-[12.5px] leading-relaxed text-[var(--text-soft)]">{t(r.desc)}</span>
                    <span className="mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: r.color }}>
                      <Mail size={12} /> {t('연결되는 곳')} · {r.to}
                      <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </span>
                </a>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function ContactShowcase() {
  return (
    <>
      <ContactJourney />
      <InquiryRouting />
    </>
  )
}
