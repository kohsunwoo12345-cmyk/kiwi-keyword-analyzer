'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  Coins,
  TrendingDown,
  Activity as ActivityIcon,
  ArrowRight,
  Sparkles,
  Clapperboard,
  BarChart3,
  Inbox,
  Send,
  FileText,
  Video,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric, Spark, BarTrend, ListRow } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { Counter } from '@/components/motion'
import { FEATURES } from '@/lib/features'
import { accountOverview, useAuth, planActive, planLabelOf, type Tx, type ActivityRow } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'

// 한국시간(KST) 고정 표기
const fmtDate = (iso: string) => kstDateTime(iso)

/** 활동 종류에 맞는 아이콘·색 — 목록만 봐도 무슨 일이 있었는지 구분된다 */
function activityLook(text: string): { icon: typeof ActivityIcon; accent: string } {
  const s = text || ''
  if (/영상|video/i.test(s)) return { icon: Video, accent: '#a855f7' }
  if (/발송|문자|알림톡|메일/i.test(s)) return { icon: Send, accent: '#0ea5e9' }
  if (/블로그|글|콘텐츠/i.test(s)) return { icon: FileText, accent: '#10b981' }
  if (/분석|리포트|지수/i.test(s)) return { icon: BarChart3, accent: '#f59e0b' }
  return { icon: ActivityIcon, accent: '#6366f1' }
}

export default function DashboardHome() {
  const { user } = useAuth()
  const [tx, setTx] = useState<Tx[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    accountOverview().then((r) => {
      setTx(r.transactions)
      setActivity(r.activity)
      setReady(true)
    })
  }, [])

  const usedCredit = useMemo(
    () => tx.filter((t) => t.kind === 'credit' && t.amount < 0).reduce((s, t) => s + -t.amount, 0),
    [tx],
  )
  const name = user?.name || '마케터'
  const hasPlan = user?.role === 'admin' || user?.hasPlan === 1
  // ⚠ 이름만 보면 안 된다 — 만료일이 지난 플랜도 이름은 그대로 남는다(planActive 주석 참고)
  const videoPlan = user?.role === 'admin' || planActive(user?.videoPlan, user?.videoPlanUntil)

  // 최근 14일 크레딧 사용 추이 (실데이터)
  const trend = useMemo(() => {
    const days: { key: string; label: string; used: number }[] = []
    const base = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(base.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ key, label: `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`, used: 0 })
    }
    for (const t of tx) {
      if (t.kind === 'credit' && t.amount < 0) {
        const day = days.find((d) => d.key === (t.created_at || '').slice(0, 10))
        if (day) day.used += -t.amount
      }
    }
    return days
  }, [tx])

  const used14 = trend.reduce((s, d) => s + d.used, 0)
  const avg14 = Math.round(used14 / 14)
  const activeDays = trend.filter((d) => d.used > 0).length
  const planLabel = user?.role === 'admin' ? 'ADMIN' : planLabelOf(user?.plan, user?.planUntil)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Sparkles}
        eyebrow="Overview"
        title={`안녕하세요, ${name}님 👋`}
        desc="내 계정의 크레딧과 활동 현황입니다."
        accent="#6366f1"
        action={
          hasPlan ? (
            <div className="flex flex-wrap gap-2">
              {videoPlan && (
                <a
                  href="/studio-nvc-prv-8b3k2/#chat"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--panel-2)]"
                >
                  <Clapperboard size={15} /> 영상 스튜디오
                </a>
              )}
              <Button href="/dashboard_USE17237_612/credits" size="sm">
                크레딧 충전 <ArrowRight size={16} />
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        {/* 플랜 미보유 → 요금제 활성화 유도 (도구는 숨김, 홈만 노출) */}
        {ready && !hasPlan && (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-bold">아직 요금제가 없습니다</h3>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  요금제를 활성화하면 마케팅 도구와 노드형 AI 영상 제작을 모두 사용할 수 있어요.
                </p>
              </div>
              <Link
                href="/activate"
                className="brand-gradient inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-[1.06]"
              >
                요금제 활성화 <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}

        {/* 지표 4종 */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="보유 크레딧"
            icon={Wallet}
            accent="#f59e0b"
            value={<Counter to={user?.credits ?? 0} />}
            sub={
              <Link href="/dashboard_USE17237_612/credits" className="inline-flex items-center gap-1 hover:text-[var(--text-soft)]">
                충전·사용 내역 <ArrowRight size={11} />
              </Link>
            }
          />
          <Metric label="보유 포인트" icon={Coins} accent="#6366f1" value={<Counter to={user?.points ?? 0} />} sub="크레딧 전환에 사용" />
          <Metric
            label="총 사용 크레딧"
            icon={TrendingDown}
            accent="#ef4444"
            value={<Counter to={usedCredit} />}
            sub={`최근 14일 ${used14.toLocaleString('ko-KR')} 사용`}
            chart={<Spark data={trend.map((d) => d.used)} accent="#ef4444" />}
          />
          <Metric
            label="현재 플랜"
            icon={Sparkles}
            accent="#0ea5e9"
            value={<span className="text-[22px]">{planLabel}</span>}
            sub={user?.planUntil ? `${kstDateTime(user.planUntil).slice(0, 10)}까지` : '요금제를 활성화하면 도구가 열립니다'}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {/* 크레딧 사용 추이 (실데이터) */}
          <Card
            title="최근 14일 크레딧 사용"
            desc={used14 > 0 ? `합계 ${used14.toLocaleString('ko-KR')} · 하루 평균 ${avg14.toLocaleString('ko-KR')} · 사용일 ${activeDays}일` : '실제 사용량이 그대로 집계됩니다'}
            className="xl:col-span-2"
            action={
              <Link
                href="/dashboard_USE17237_612/credits#history"
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]"
              >
                전체 내역 <ArrowRight size={12} />
              </Link>
            }
          >
            {used14 === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="아직 크레딧 사용 내역이 없습니다"
                hint="유튜브·블로그 분석, 문자·알림톡 발송, AI 영상 제작을 실행하면 여기에 하루 단위로 쌓입니다."
                action={
                  hasPlan ? (
                    <Link
                      href="/dashboard_USE17237_612/blog"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                    >
                      도구 둘러보기 <ArrowRight size={13} />
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <BarTrend data={trend.map((d) => ({ label: d.label, value: d.used }))} accent="#6366f1" unit=" 크레딧" />
            )}
          </Card>

          {/* 최근 활동 (실데이터) */}
          <Card title="최근 활동" desc="계정에서 일어난 일" bodyClassName="p-3">
            {ready && activity.length === 0 ? (
              <EmptyState icon={Inbox} title="활동 기록이 없습니다" hint="도구를 사용하면 실행 기록이 이곳에 남습니다." />
            ) : (
              <div className="no-scrollbar max-h-[268px] space-y-0.5 overflow-y-auto">
                {activity.slice(0, 12).map((a, i) => {
                  const look = activityLook(a.detail || a.type)
                  return (
                    <ListRow
                      key={i}
                      icon={look.icon}
                      accent={look.accent}
                      title={a.detail || a.type}
                      meta={fmtDate(a.created_at)}
                    />
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* 도구 바로가기 — 유료 플랜에서만 노출 */}
        {hasPlan && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-[14px] font-bold tracking-tight">마케팅 도구 바로가기</h3>
              <span className="text-[11.5px] text-[var(--text-dim)]">{FEATURES.length}개</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <Link
                    key={f.slug}
                    href={`/dashboard_USE17237_612/${f.slug}`}
                    className="group relative flex items-start gap-3.5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.4)]"
                  >
                    <span
                      className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-white transition-transform duration-300 group-hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${f.accent}, ${f.accent}bb)` }}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-semibold">{f.title}</span>
                        <ArrowRight
                          size={13}
                          className="-translate-x-1 flex-shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                          style={{ color: f.accent }}
                        />
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-[var(--text-soft)]">{f.desc}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
