'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Wallet, Coins, TrendingDown, Activity as ActivityIcon, ArrowRight, Sparkles, Clapperboard } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'
import { Counter } from '@/components/motion'
import { FEATURES } from '@/lib/features'
import { accountOverview, useAuth, type Tx, type ActivityRow } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'

// 한국시간(KST) 고정 표기
const fmtDate = (iso: string) => kstDateTime(iso)

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
  const maxUsed = Math.max(1, ...trend.map((d) => d.used))

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Sparkles}
        eyebrow="Overview"
        title={`안녕하세요, ${name}님 👋`}
        desc="내 계정의 실제 크레딧·활동 현황입니다."
        action={
          hasPlan ? (
            <Button href="/dashboard_USE17237_612/credits" size="sm">
              크레딧 충전 <ArrowRight size={16} />
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* 플랜 미보유 → 요금제 활성화 유도 (도구는 숨김, 홈만 노출) */}
        {ready && !hasPlan && (
          <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-bold">아직 요금제가 없습니다</h3>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                요금제를 활성화하면 마케팅 도구와 노드형 AI 영상 제작을 모두 사용할 수 있어요.
              </p>
            </div>
            <Link
              href="/activate"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              요금제 활성화 <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {/* 노드형 영상 스튜디오 바로가기 — AI 영상 플랜 구독자(또는 관리자)에게만 노출 */}
        {(user?.role === 'admin' || (!!user?.videoPlan && user.videoPlan !== '없음')) && (
          <a
            href="/studio-nvc-prv-8b3k2/"
            className="card group flex items-center justify-between gap-4 p-5 transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                <Clapperboard size={22} />
              </span>
              <div>
                <h3 className="text-sm font-bold">노드형 AI 영상 스튜디오</h3>
                <p className="mt-0.5 text-xs text-[var(--text-soft)]">블록을 연결하듯 광고·숏폼 영상을 생성하세요.</p>
              </div>
            </div>
            <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition group-hover:bg-blue-700">
              영상 스튜디오 열기 <ArrowRight size={15} />
            </span>
          </a>
        )}

        {/* 실데이터 스탯 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="보유 크레딧" value={(<Counter to={user?.credits ?? 0} />) as unknown as string} icon={Wallet} accent="#f59e0b" />
          <StatCard label="보유 포인트" value={(<Counter to={user?.points ?? 0} />) as unknown as string} icon={Coins} accent="#2563eb" />
          <StatCard label="총 사용 크레딧" value={(<Counter to={usedCredit} />) as unknown as string} icon={TrendingDown} accent="#ef4444" />
          <StatCard label="현재 플랜" value={!user?.plan || user.plan === '없음' ? '미가입' : user.plan} icon={Sparkles} accent="#0ea5e9" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 크레딧 사용 추이 (실데이터) */}
          <Panel title="최근 14일 크레딧 사용 (실데이터)" className="lg:col-span-2">
            {usedCredit === 0 ? (
              <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-[var(--text-soft)]">아직 크레딧 사용 내역이 없습니다.</p>
                <p className="text-xs text-[var(--text-dim)]">유튜브·블로그 분석, 문자·이메일 발송 등 도구를 사용하면 여기에 실제 사용량이 기록됩니다.</p>
              </div>
            ) : (
              <div className="flex items-end gap-1.5 pt-4" style={{ height: 180 }}>
                {trend.map((d, i) => (
                  <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full origin-bottom rounded-t brand-gradient"
                        style={{ height: `${(d.used / maxUsed) * 100}%`, minHeight: d.used > 0 ? 4 : 0, animation: `fadeInUp 0.5s ease ${i * 0.03}s both` }}
                        title={`${d.used} 크레딧`}
                      />
                    </div>
                    <span className="text-[9px] text-[var(--text-dim)]">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* 최근 활동 (실데이터) */}
          <Panel title="최근 활동 (실데이터)">
            <div className="max-h-[220px] space-y-1 overflow-y-auto no-scrollbar">
              {activity.slice(0, 12).map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-slate-50">
                  <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-slate-100 text-[var(--text-dim)]">
                    <ActivityIcon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{a.detail || a.type}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">{fmtDate(a.created_at)}</p>
                  </div>
                </div>
              ))}
              {ready && activity.length === 0 && (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">활동 기록이 없습니다.</p>
              )}
            </div>
          </Panel>
        </div>

        {/* feature quick links — 유료 플랜에서만 노출 */}
        {hasPlan && (
          <div>
            <h3 className="mb-4 font-semibold">마케팅 도구 바로가기</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <Link key={f.slug} href={`/dashboard_USE17237_612/${f.slug}`} className="group card hover-lift p-5">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.color}`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold">{f.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-soft)]">{f.desc}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
