'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Home,
  ChevronRight,
  Check,
  Sparkles,
  Loader2,
  Play,
  Send,
  GripVertical,
  Plus,
  Wand2,
  BarChart3,
  Bot,
  CheckCircle2,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button, SectionTag, Panel } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { cn } from '@/lib/utils'
import { FEATURES, getFeature, type Feature } from '@/lib/features'
import { collectLead } from '@/lib/auth'

/* ───────────────── per-feature marketing copy ───────────────── */
type StatChip = { to: number; suffix?: string; decimals?: number; label: string }
type Meta = { tagline: string; stats: StatChip[]; notes: string[] }

const META: Record<string, Meta> = {
  leads: {
    tagline: '떠나는 방문자를 고객 DB로 붙잡다',
    stats: [
      { to: 42, suffix: '%', label: '평균 전환율 상승' },
      { to: 12400, suffix: '+', label: '일 평균 수집 DB' },
      { to: 3, suffix: '분', label: '평균 세팅 시간' },
    ],
    notes: [
      '광고비를 들여 데려온 방문자, 대부분은 흔적 없이 떠납니다. 코딩 없이 폼을 끌어다 놓아 오늘 안에 붙잡는 랜딩페이지를 완성하세요.',
      '어느 채널에서 몇 명이 전환됐는지 실시간 대시보드로 확인하면, 돈 새는 채널을 그만두고 되는 곳에 집중할 수 있습니다.',
      '중복·오타 번호가 섞인 DB는 영업 시간을 갉아먹습니다. 자동 정제로 바로 연락할 수 있는 명단만 남깁니다.',
      '수집 즉시 CRM 파이프라인으로 넘어갑니다. 리드가 식기 전에, 가장 뜨거울 때 연락하세요.',
    ],
  },
  youtube: {
    tagline: '다음 떡상을 데이터로 예측하다',
    stats: [
      { to: 8900, suffix: '+', label: '분석된 채널' },
      { to: 87, suffix: '%', label: '떡상 예측 정확도' },
      { to: 30, suffix: '+', label: '추적 지표' },
    ],
    notes: [
      '감으로 올린 영상이 묻히는 이유는 데이터를 안 봤기 때문입니다. 구독자·조회수 추이에서 성장 변곡점을 먼저 포착하세요.',
      '영상마다 노출·클릭·시청 지속률을 뜯어보면, 어디서 이탈하는지가 보이고 다음 편집이 달라집니다.',
      '지금 뜨는 키워드를 찾아 다음 콘텐츠를 기획하세요. 유행이 지난 뒤 올리면 이미 늦습니다.',
      '경쟁 채널이 무엇으로 성장했는지 벤치마킹해, 시행착오에 쓸 몇 달을 아낍니다.',
    ],
  },
  blog: {
    tagline: '상위노출, 감이 아닌 데이터로',
    stats: [
      { to: 120000, suffix: '+', label: '분석 키워드' },
      { to: 92, suffix: '%', label: '지수 진단 정확도' },
      { to: 1.5, suffix: '초', decimals: 1, label: '평균 분석 시간' },
    ],
    notes: [
      '열심히 쓴 글이 2페이지에 묻히면 없는 글과 같습니다. 내 블로그의 현재 지수와 성장 여력을 등급으로 먼저 진단하세요.',
      '노리는 키워드가 상위노출 가능한지 확률로 알려드립니다. 승산 없는 키워드에 쏟을 시간을 아낍니다.',
      '경쟁 문서 수와 강도를 계산해, 이길 수 있는 키워드부터 공략하도록 골라줍니다.',
      '네이버 알고리즘 기준에 맞춘 개선 포인트를 리포트로 제시해, 무엇을 고칠지 바로 알 수 있습니다.',
    ],
  },
  team: {
    tagline: '흩어진 협업에 AI 속도를 더하다',
    stats: [
      { to: 5, suffix: 'x', label: '업무 처리 속도' },
      { to: 90, suffix: '%', label: '소재 제작 시간 절감' },
      { to: 24, suffix: '시간', label: 'AI 상시 대응' },
    ],
    notes: [
      '메신저와 메모장에 흩어진 업무는 결국 누군가 놓칩니다. 카드 한 곳에 모아 진행 상황을 팀 전체가 공유하세요.',
      '카피 한 줄, 기획 초안 때문에 멈추던 순간, AI 어시스턴트가 즉석에서 함께 만들어냅니다.',
      '카드마다 코멘트와 멘션으로 소통해, 회의를 잡지 않아도 맥락이 그대로 남습니다.',
      '담당자와 마감을 규칙에 따라 자동 배정해, 챙기는 데 쓰던 시간을 실행에 되돌립니다.',
    ],
  },
  crm: {
    tagline: '잠자던 DB를 매출로 깨우다',
    stats: [
      { to: 38, suffix: '%', label: '재구매율 상승' },
      { to: 2.4, suffix: 'x', decimals: 1, label: 'LTV 개선' },
      { to: 95, suffix: '%', label: '알림톡 도달률' },
    ],
    notes: [
      '어렵게 모은 DB가 엑셀에서 잠들면 매출이 되지 않습니다. 신규부터 계약까지 단계별로 관리해 흐름을 놓치지 마세요.',
      '조건에 맞는 고객을 그룹으로 묶어, 모두에게 같은 메시지를 뿌리는 대신 정밀하게 공략합니다.',
      '재구매 시점·이탈 조건이 충족되면 문자·알림톡이 자동 발송됩니다. 타이밍을 놓쳐 잃던 고객을 붙잡습니다.',
      '고객 생애가치와 전환율을 리포트로 보며, 어디에 다시 집중할지 근거로 판단합니다.',
    ],
  },
  ads: {
    tagline: '광고비 한 푼도 새지 않게',
    stats: [
      { to: 2.7, suffix: 'x', decimals: 1, label: '평균 ROAS 개선' },
      { to: 31, suffix: '%', label: 'CPA 절감' },
      { to: 3, suffix: '개', label: '통합 광고 채널' },
    ],
    notes: [
      '채널마다 흩어진 리포트를 짜 맞추다 보면 정작 손볼 타이밍을 놓칩니다. 메타·구글·네이버를 한 화면에서 모니터링하세요.',
      '광고비 대비 매출과 전환당 비용을 실시간 추적해, 밑 빠진 캠페인을 그날 바로 멈출 수 있습니다.',
      '어떤 소재가 잘 먹히는지 나란히 비교해, 되는 소재에 예산을 몰아줍니다.',
      'AI가 예산을 어디에 더 쓸지 제안해, 감으로 배분하다 새던 돈을 줄입니다.',
    ],
  },
  video: {
    tagline: '텍스트 한 줄이 영상이 되는 순간',
    stats: [
      { to: 90, suffix: '%', label: '제작 시간 절감' },
      { to: 60, suffix: '초', label: '평균 생성 시간' },
      { to: 50, suffix: '+', label: '스타일 프리셋' },
    ],
    notes: [
      '외주 견적과 촬영 일정을 잡는 동안 트렌드는 지나갑니다. 한 줄 프롬프트만 입력하면 영상이 만들어집니다.',
      '전문가급 카메라 워크를 프리셋으로 적용해, 장비도 촬영팀도 없이 완성도를 끌어올립니다.',
      '숏폼·광고용 템플릿으로 즉시 완성해, 아이디어가 식기 전에 바로 올립니다.',
      '브랜드 톤을 학습해 여러 편을 만들어도 스타일이 흔들리지 않습니다.',
    ],
  },
}

const FALLBACK_META: Meta = {
  tagline: '마케팅을 한 단계 끌어올리는 기능',
  stats: [
    { to: 5200, suffix: '+', label: '활성 마케터' },
    { to: 38, suffix: '%', label: '평균 성과 상승' },
    { to: 24, suffix: '시간', label: '상시 이용' },
  ],
  notes: [],
}

/* deterministic hash for stable demo results */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0)
}
function seeded(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000
  const frac = x - Math.floor(x)
  return min + frac * (max - min)
}

/* ───────────────── main ───────────────── */
export function FeatureDetail({ slug }: { slug: string }) {
  const feature = getFeature(slug)

  if (!feature) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[var(--bg)]">
        <Navbar />
        <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 pt-16 text-center">
          <h1 className="text-3xl font-bold">찾을 수 없습니다</h1>
          <p className="mt-3 text-[var(--text-soft)]">요청하신 기능 페이지가 존재하지 않습니다.</p>
          <Button href="/" className="mt-8">
            <Home size={16} /> 홈으로 돌아가기
          </Button>
        </div>
        <Footer />
      </div>
    )
  }

  const Icon = feature.icon
  const meta = META[slug] ?? FALLBACK_META
  const others = FEATURES.filter((f) => f.slug !== slug)

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)]">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div
          className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[880px] -translate-x-1/2 rounded-full blur-[130px]"
          style={{ background: `${feature.accent}33` }}
        />
        <div
          className="animate-drift-slow pointer-events-none absolute top-32 right-0 h-[300px] w-[400px] rounded-full blur-[120px]"
          style={{ background: `${feature.accent}22` }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg)]" />

        <div className="relative mx-auto max-w-4xl px-5 text-center">
          {/* breadcrumb */}
          <nav className="flex items-center justify-center gap-1.5 text-sm text-[var(--text-dim)] animate-fade-up">
            <Link href="/" className="transition-colors hover:text-violet-600">홈</Link>
            <ChevronRight size={14} />
            <Link href="/#features" className="transition-colors hover:text-violet-600">기능</Link>
            <ChevronRight size={14} />
            <span className="font-semibold text-[var(--text-soft)]">{feature.title}</span>
          </nav>

          {/* icon tile */}
          <div className="mt-8 flex justify-center animate-fade-up delay-100">
            <span
              className={cn(
                'animate-bob grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br shadow-lg',
                feature.color,
              )}
              style={{ boxShadow: `0 12px 40px -8px ${feature.accent}88` }}
            >
              <Icon size={30} className="text-white" />
            </span>
          </div>

          <div className="mt-6 flex justify-center animate-fade-up delay-100">
            <SectionTag>{feature.short}</SectionTag>
          </div>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.12] tracking-tight animate-fade-up delay-200 sm:text-5xl md:text-6xl">
            {feature.title}
            <br />
            <span
              className="bg-gradient-to-r bg-clip-text text-transparent animate-gradient"
              style={{ backgroundImage: `linear-gradient(120deg, ${feature.accent}, #6366f1)` }}
            >
              {meta.tagline}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-[var(--text-soft)] animate-fade-up delay-300">
            {feature.desc}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 animate-fade-up delay-300 sm:flex-row">
            <Button href="/signup" size="lg" className="group">
              무료로 시작하기
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button href="/contact" variant="outline" size="lg">
              문의하기
            </Button>
          </div>

          {/* stat chips */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3 animate-fade-up delay-400">
            {meta.stats.map((s) => (
              <div key={s.label} className="card-2 px-3 py-5 text-center">
                <div className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: feature.accent }}>
                  <Counter to={s.to} decimals={s.decimals || 0} suffix={s.suffix} />
                </div>
                <div className="mt-1.5 text-xs leading-snug text-[var(--text-soft)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CAPABILITIES ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>핵심 역량</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {feature.title}이 해내는 것들
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {feature.points.map((p, i) => (
              <Reveal key={p} delay={(i % 2) * 90}>
                <div className="card hover-lift group h-full p-6">
                  <div className="flex items-start gap-4">
                    <span
                      className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${feature.accent}18`, color: feature.accent }}
                    >
                      <Check size={20} />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{p}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
                        {meta.notes[i] ?? '수작업으로 흘려보내던 시간을 줄이고, 핵심 마케팅 워크플로우를 더 빠르고 정확하게 만들어줍니다.'}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INTERACTIVE DEMO ===== */}
      <section className="relative border-y border-[var(--border)] bg-white py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>실제 기능</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              설명보다 한 번 써보는 게 빠릅니다
            </h2>
            <p className="mt-4 text-[var(--text-soft)]">
              {slug === 'leads'
                ? '아래 폼은 실제로 동작합니다. 지금 입력하면 DB가 그대로 수집되는 걸 직접 확인하세요.'
                : '백문이 불여일견. 아래 데모로 기능의 흐름을 지금 바로 경험해보세요.'}
            </p>
          </Reveal>

          <Reveal variant="scale" className="mt-12">
            <Panel title="직접 체험해보세요" className="glow">
              <FeatureDemo slug={slug} feature={feature} />
            </Panel>
          </Reveal>
        </div>
      </section>

      {/* ===== CROSS-SELL ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionTag>더 알아보기</SectionTag>
            <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              다른 기능도 살펴보세요
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((f, i) => {
              const OIcon = f.icon
              return (
                <Reveal key={f.slug} delay={(i % 3) * 80}>
                  <Link href={`/features/${f.slug}`} className="card hover-lift group flex h-full items-center gap-4 p-5">
                    <span className={cn('grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110', f.color)}>
                      <OIcon size={20} className="text-white" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{f.title}</h3>
                      <p className="truncate text-xs text-[var(--text-dim)]">{f.short}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto flex-shrink-0 text-[var(--text-dim)] transition-all group-hover:translate-x-1 group-hover:text-violet-600" />
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA BAND ===== */}
      <section className="px-5 pb-24">
        <Reveal variant="scale" className="mx-auto max-w-5xl">
          <div
            className="animate-gradient relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-xl"
            style={{
              background: `linear-gradient(120deg, ${feature.accent}, #7c3aed, #6366f1, #22d3ee)`,
              boxShadow: `0 30px 60px -20px ${feature.accent}77`,
            }}
          >
            <div className="animate-drift pointer-events-none absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-[90px]" />
            <div className="relative">
              <div className="mb-6 flex justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <Icon size={34} className="text-white" />
                </span>
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {feature.title}, 지금 무료로 시작하세요
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-white/85">
                {meta.tagline}. BYGENCY 하나로 마케팅의 모든 과정을 연결하세요.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/signup" size="lg" className="!bg-white !text-violet-700 hover:!bg-violet-50 hover:!brightness-100">
                  무료로 시작하기 <ArrowRight size={18} />
                </Button>
                <Button href="/contact" size="lg" className="!border !border-white/40 !bg-white/10 !text-white hover:!bg-white/20">
                  문의하기
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}

/* ───────────────── demo dispatcher ───────────────── */
function FeatureDemo({ slug, feature }: { slug: string; feature: Feature }) {
  switch (slug) {
    case 'leads':
      return <LeadsDemo feature={feature} />
    case 'blog':
      return <BlogDemo feature={feature} />
    case 'youtube':
      return <YoutubeDemo feature={feature} />
    case 'video':
      return <VideoDemo feature={feature} />
    case 'crm':
      return <CrmDemo feature={feature} />
    case 'ads':
      return <AdsDemo feature={feature} />
    case 'team':
      return <TeamDemo feature={feature} />
    default:
      return <p className="text-sm text-[var(--text-soft)]">준비 중인 데모입니다.</p>
  }
}

/* small helpers */
function PreviewTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
      <Sparkles size={11} /> 미리보기
    </span>
  )
}
function fieldCls() {
  return 'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition-all placeholder:text-[var(--text-dim)] focus:border-violet-400 focus:ring-2 focus:ring-violet-200'
}

/* ───────────────── LEADS (real) ───────────────── */
function LeadsDemo({ feature }: { feature: Feature }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [total, setTotal] = useState<number | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setState('error')
      setMsg('이름과 연락처를 입력해주세요.')
      return
    }
    setState('loading')
    setMsg('')
    const res = await collectLead({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, source: 'feature-leads' })
    if (res.ok) {
      setState('ok')
      setTotal(typeof res.total === 'number' ? res.total : null)
    } else {
      setState('error')
      setMsg(res.error || 'DB 수집에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  if (state === 'ok') {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={34} />
        </span>
        <h4 className="mt-5 text-xl font-bold">DB가 수집되었습니다!</h4>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          {total !== null ? (
            <>지금까지 누적 <span className="font-bold text-emerald-600">{total.toLocaleString('ko-KR')}건</span>이 수집되었습니다.</>
          ) : (
            '정상적으로 저장되었습니다.'
          )}
        </p>
        <button
          onClick={() => { setState('idle'); setName(''); setPhone(''); setEmail('') }}
          className="mt-6 text-sm font-semibold text-violet-600 hover:underline"
        >
          다시 체험하기
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-[var(--text-soft)]">
        무료 상담을 신청하시면 담당 컨설턴트가 연락드립니다.
      </p>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">이름 *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" className={fieldCls()} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">연락처 *</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" inputMode="tel" className={fieldCls()} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">이메일 (선택)</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" className={fieldCls()} />
      </div>
      {state === 'error' && <p className="text-sm font-medium text-rose-500">{msg}</p>}
      <Button type="submit" disabled={state === 'loading'} className="w-full" size="lg">
        {state === 'loading' ? (<><Loader2 size={18} className="animate-spin" /> 수집 중...</>) : (<>무료 상담 신청하기 <ArrowRight size={18} /></>)}
      </Button>
      <p className="text-center text-xs text-[var(--text-dim)]">실제로 DB가 저장되는 라이브 폼입니다.</p>
    </form>
  )
}

/* ───────────────── BLOG ───────────────── */
function BlogDemo({ feature }: { feature: Feature }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | {
    grade: string; prob: number; competition: string; keywords: string[]
  }>(null)

  function analyze() {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      const h = hashStr(input.trim())
      const grades = ['A', 'B', 'C', 'D', 'E', 'F']
      const gi = Math.floor(seeded(h, 0, 6))
      const prob = Math.round(seeded(h + 1, 22, 96))
      const compScore = seeded(h + 2, 0, 3)
      const competition = compScore < 1 ? '낮음' : compScore < 2 ? '보통' : '높음'
      const pool = ['후기', '추천', '비교', '가격', '순위', '방법', '효과', '내돈내산', '리얼', '2026', '정리', '꿀팁']
      const kws: string[] = []
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(seeded(h + 10 + i, 0, pool.length))
        const kw = `${input.trim().split(' ')[0]} ${pool[idx]}`
        if (!kws.includes(kw)) kws.push(kw)
      }
      setResult({ grade: grades[Math.min(gi, 5)], prob, competition, keywords: kws })
      setLoading(false)
    }, 900)
  }

  const gradeColor = result
    ? result.grade <= 'B' ? '#10b981' : result.grade <= 'D' ? '#f59e0b' : '#ef4444'
    : feature.accent

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">키워드나 블로그 주소를 입력해보세요.</p>
        <PreviewTag />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && analyze()}
          placeholder="예: 강남 맛집 / blog.naver.com/..."
          className={fieldCls()}
        />
        <Button onClick={analyze} disabled={loading} className="shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 분석하기
        </Button>
      </div>

      {result && (
        <div className="animate-fade-up space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card-2 p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: gradeColor }}>{result.grade}</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">블로그 지수</div>
            </div>
            <div className="card-2 p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: feature.accent }}>{result.prob}%</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">상위노출 확률</div>
            </div>
            <div className="card-2 p-4 text-center">
              <div className="text-2xl font-bold">{result.competition}</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">경쟁 강도</div>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-soft)]">
              <span>상위노출 가능성</span><span>{result.prob}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.prob}%`, background: feature.accent }} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--text-soft)]">추천 키워드</p>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((k) => (
                <span key={k} className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: `${feature.accent}44`, color: feature.accent, background: `${feature.accent}0d` }}>
                  #{k}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────── YOUTUBE ───────────────── */
function YoutubeDemo({ feature }: { feature: Feature }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | {
    views: number; engagement: number; viral: number; time: string; bars: number[]
  }>(null)

  function analyze() {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      const h = hashStr(input.trim())
      const views = Math.round(seeded(h, 8, 240)) * 1000
      const engagement = Math.round(seeded(h + 1, 28, 92) * 10) / 10
      const viral = Math.round(seeded(h + 2, 20, 95))
      const times = ['오후 6시', '오후 8시', '오후 9시', '오전 7시', '오후 7시', '밤 10시']
      const time = times[Math.floor(seeded(h + 3, 0, times.length))]
      const bars = Array.from({ length: 7 }, (_, i) => Math.round(seeded(h + 5 + i, 25, 100)))
      setResult({ views, engagement, viral, time, bars })
      setLoading(false)
    }, 900)
  }

  const days = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">채널명이나 키워드를 입력해보세요.</p>
        <PreviewTag />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && analyze()}
          placeholder="예: 요리 브이로그 / @channel"
          className={fieldCls()}
        />
        <Button onClick={analyze} disabled={loading} className="shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />} 분석
        </Button>
      </div>

      {result && (
        <div className="animate-fade-up space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card-2 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: feature.accent }}>
                {(result.views / 10000).toFixed(1)}만
              </div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">예상 조회수</div>
            </div>
            <div className="card-2 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: feature.accent }}>{result.engagement}%</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">참여율</div>
            </div>
            <div className="card-2 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: feature.accent }}>{result.viral}%</div>
              <div className="mt-1 text-xs text-[var(--text-soft)]">떡상 확률</div>
            </div>
          </div>
          <div className="card-2 p-4">
            <p className="mb-3 text-xs font-semibold text-[var(--text-soft)]">요일별 예상 노출 지수</p>
            <div className="flex items-end gap-2" style={{ height: 96 }}>
              {result.bars.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full origin-bottom rounded-t"
                      style={{
                        height: `${b}%`,
                        background: `linear-gradient(to top, ${feature.accent}, ${feature.accent}99)`,
                        animation: `fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-dim)]">{days[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: `${feature.accent}0d`, color: feature.accent }}>
            <span className="font-semibold">추천 업로드 시간:</span> {result.time}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────── VIDEO ───────────────── */
function VideoDemo({ feature }: { feature: Feature }) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('시네마틱')
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'gen' | 'done'>('idle')

  const styles = ['시네마틱', '광고', '숏폼', '제품 소개', '감성']

  function generate() {
    if (!prompt.trim() || phase === 'gen') return
    setPhase('gen')
    setProgress(0)
    const start = Date.now()
    const timer = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - start) / 1500) * 100))
      setProgress(p)
      if (p >= 100) {
        clearInterval(timer)
        setPhase('done')
      }
    }, 60)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">만들고 싶은 영상을 설명해보세요.</p>
        <PreviewTag />
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="예: 노을 지는 해변을 걷는 여성, 청량한 음료 광고, 부드러운 카메라 무빙"
        className={cn(fieldCls(), 'resize-none')}
      />
      <div className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
              style === s ? 'text-white' : 'border-[var(--border)] bg-white text-[var(--text-soft)] hover:border-violet-300',
            )}
            style={style === s ? { background: feature.accent, borderColor: feature.accent } : undefined}
          >
            {s}
          </button>
        ))}
      </div>
      <Button onClick={generate} disabled={phase === 'gen'} className="w-full" size="lg">
        {phase === 'gen' ? (<><Loader2 size={18} className="animate-spin" /> 생성 중... {progress}%</>) : (<><Wand2 size={18} /> 영상 생성</>)}
      </Button>

      {phase === 'gen' && (
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: feature.accent }} />
        </div>
      )}

      {phase === 'done' && (
        <div className="animate-fade-up">
          <div
            className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${feature.accent}, #6366f1, #22d3ee)` }}
          >
            <div className="animate-drift pointer-events-none absolute -top-10 left-1/3 h-40 w-40 rounded-full bg-white/25 blur-3xl" />
            <button className="relative grid h-16 w-16 place-items-center rounded-full bg-white/25 backdrop-blur transition-transform hover:scale-110">
              <Play size={28} className="ml-1 text-white" fill="white" />
            </button>
            <span className="absolute bottom-3 left-3 rounded-md bg-black/30 px-2 py-1 text-xs font-medium text-white backdrop-blur">
              {style} · 00:15
            </span>
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
              <Check size={12} /> 생성 완료
            </span>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--text-dim)]">
            실제 서비스에서는 프롬프트에 맞춘 고화질 영상이 생성됩니다.
          </p>
        </div>
      )}
    </div>
  )
}

/* ───────────────── CRM ───────────────── */
type Stage = 0 | 1 | 2
type Card = { id: number; name: string; stage: Stage }
const STAGE_LABELS = ['신규', '상담', '계약']

function CrmDemo({ feature }: { feature: Feature }) {
  const [cards, setCards] = useState<Card[]>([
    { id: 1, name: '김민수', stage: 0 },
    { id: 2, name: '이서연', stage: 1 },
    { id: 3, name: '박지훈', stage: 2 },
    { id: 4, name: '최유나', stage: 1 },
  ])
  const [name, setName] = useState('')
  const [seq, setSeq] = useState(5)

  function add() {
    if (!name.trim()) return
    setCards((c) => [...c, { id: seq, name: name.trim(), stage: 0 }])
    setSeq((s) => s + 1)
    setName('')
  }
  function move(id: number, dir: -1 | 1) {
    setCards((c) => c.map((k) => (k.id === id ? { ...k, stage: Math.max(0, Math.min(2, k.stage + dir)) as Stage } : k)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">고객을 추가하고 파이프라인 단계를 옮겨보세요.</p>
        <PreviewTag />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="고객 이름 입력"
          className={fieldCls()}
        />
        <Button onClick={add} className="shrink-0"><Plus size={16} /> 신규 추가</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {STAGE_LABELS.map((label, si) => {
          const col = cards.filter((c) => c.stage === si)
          return (
            <div key={label} className="rounded-xl bg-[var(--panel-2)] p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-bold">{label}</span>
                <span className="rounded-full bg-white px-1.5 text-[10px] font-semibold text-[var(--text-dim)]">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((c) => (
                  <div key={c.id} className="group rounded-lg border border-[var(--border)] bg-white p-2.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <GripVertical size={13} className="text-slate-300" />
                      <span className="truncate text-xs font-semibold">{c.name}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        onClick={() => move(c.id, -1)}
                        disabled={c.stage === 0}
                        className="grid h-6 w-6 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30"
                        aria-label="이전 단계"
                      >
                        <ArrowLeft size={13} />
                      </button>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: feature.accent }} />
                      <button
                        onClick={() => move(c.id, 1)}
                        disabled={c.stage === 2}
                        className="grid h-6 w-6 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30"
                        aria-label="다음 단계"
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {col.length === 0 && <p className="px-1 py-3 text-center text-[10px] text-[var(--text-dim)]">비어있음</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────── ADS ───────────────── */
function AdsDemo({ feature }: { feature: Feature }) {
  const [spend, setSpend] = useState('1000000')
  const [revenue, setRevenue] = useState('3200000')
  const [conv, setConv] = useState('40')

  const s = Number(spend) || 0
  const r = Number(revenue) || 0
  const c = Number(conv) || 0
  const roas = s > 0 ? r / s : 0
  const cpa = c > 0 ? s / c : 0
  const good = roas >= 2

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">광고 지표를 입력하면 ROAS를 계산합니다.</p>
        <PreviewTag />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '광고비 (원)', val: spend, set: setSpend },
          { label: '매출 (원)', val: revenue, set: setRevenue },
          { label: '전환수', val: conv, set: setConv },
        ].map((f) => (
          <div key={f.label}>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">{f.label}</label>
            <input
              value={f.val}
              onChange={(e) => f.set(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className={cn(fieldCls(), 'px-3 py-2.5')}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card-2 p-4 text-center">
          <div className="text-3xl font-bold" style={{ color: feature.accent }}>{roas.toFixed(2)}x</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">ROAS</div>
        </div>
        <div className="card-2 p-4 text-center">
          <div className="text-3xl font-bold">{cpa > 0 ? `₩${Math.round(cpa).toLocaleString('ko-KR')}` : '-'}</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">CPA (전환당 비용)</div>
        </div>
      </div>
      <div
        className={cn(
          'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold',
          good ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
        )}
      >
        {good ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
        {good ? '양호 — 광고 효율이 좋습니다' : '개선필요 — 소재·타겟 최적화를 권장합니다'}
      </div>
    </div>
  )
}

/* ───────────────── TEAM (AI chat) ───────────────── */
type Msg = { role: 'user' | 'ai'; text: string }
const REPLIES: { keys: string[]; text: string }[] = [
  { keys: ['카피', '문구', '광고 문구', '제목'], text: '이런 카피는 어떨까요? "지금 시작하면 첫 달 무료 — 망설이는 순간에도 경쟁사는 앞서갑니다." 후킹 요소와 긴급성을 함께 담았습니다.' },
  { keys: ['인스타', '릴스', '해시태그'], text: '릴스는 첫 2초가 승부입니다. 강한 훅 → 3초 컷 편집 → 자막 필수. 해시태그는 대형 3개 + 중형 5개 + 니치 2개 조합을 추천합니다.' },
  { keys: ['타겟', '고객', '타게팅'], text: '핵심 타겟을 25~34세로 좁히고 관심사 리타겟팅부터 시작하세요. 유사 타겟(Lookalike) 1%로 확장하면 CPA를 낮출 수 있습니다.' },
  { keys: ['블로그', 'seo', '상위노출'], text: '상위노출은 검색의도 매칭이 8할입니다. 제목에 핵심 키워드를 앞쪽에 배치하고, 1500자 이상 + 이미지 5장 이상을 권장합니다.' },
  { keys: ['예산', '광고비', 'roas'], text: '초기에는 전체 예산의 20%로 A/B 테스트하고, ROAS 2배 이상 나오는 소재에 예산을 집중 배분하세요. 주 단위로 리밸런싱하는 게 핵심입니다.' },
]
const DEFAULT_REPLY = '좋은 질문이에요! 목표(인지도·전환·재구매)와 예산, 주력 채널을 알려주시면 그에 맞는 구체적인 실행 플랜을 짜드릴게요.'

function TeamDemo({ feature }: { feature: Feature }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: '안녕하세요! BYGENCY AI 마케팅 어시스턴트예요. 무엇을 도와드릴까요?' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  function pickReply(q: string): string {
    const low = q.toLowerCase()
    for (const r of REPLIES) {
      if (r.keys.some((k) => low.includes(k.toLowerCase()))) return r.text
    }
    return DEFAULT_REPLY
  }

  function send() {
    const q = input.trim()
    if (!q || typing) return
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    const reply = pickReply(q)
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'ai', text: reply }])
      setTyping(false)
    }, 800)
  }

  const suggestions = ['광고 카피 추천해줘', '인스타 릴스 전략', '예산 배분 팁']

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">AI 어시스턴트에게 마케팅을 물어보세요.</p>
        <PreviewTag />
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl bg-[var(--panel-2)] p-4">
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'ai' && (
              <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-white" style={{ background: feature.accent }}>
                <Bot size={15} />
              </span>
            )}
            <div
              className={cn(
                'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'user' ? 'rounded-br-sm bg-violet-600 text-white' : 'rounded-bl-sm border border-[var(--border)] bg-white',
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2">
            <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-white" style={{ background: feature.accent }}>
              <Bot size={15} />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[var(--border)] bg-white px-3.5 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '120ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setInput(s)}
            className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text-soft)] transition-colors hover:border-violet-300 hover:text-violet-600"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="메시지를 입력하세요..."
          className={fieldCls()}
        />
        <Button onClick={send} disabled={typing} className="shrink-0"><Send size={16} /></Button>
      </div>
    </div>
  )
}
