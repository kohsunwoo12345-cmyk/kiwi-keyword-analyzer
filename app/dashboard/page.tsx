'use client'

import Link from 'next/link'
import { Database, TrendingUp, Users, DollarSign, ArrowRight, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut, BarSeries } from '@/components/dash/Charts'
import { StatCard, Panel, Button } from '@/components/ui'
import { FEATURES } from '@/lib/features'
import { trafficTrend, revenueTrend, channelSplit } from '@/lib/mock'

export default function DashboardHome() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Sparkles}
        eyebrow="Overview"
        title="안녕하세요, 마케터님 👋"
        desc="오늘의 마케팅 성과를 한눈에 확인하세요."
        action={
          <Button href="/dashboard/leads" size="sm">
            새 랜딩페이지 <ArrowRight size={16} />
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="오늘 수집 DB" value="1,284" delta={18} icon={Database} accent="#7c3aed" />
          <StatCard label="전환율" value="7.6%" delta={3.2} icon={TrendingUp} accent="#22c55e" />
          <StatCard label="활성 고객" value="8,940" delta={5.1} icon={Users} accent="#0ea5e9" />
          <StatCard label="이번달 매출" value="₩9,640만" delta={12.4} icon={DollarSign} accent="#f59e0b" />
        </div>

        {/* charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="방문 & 전환 추이" className="lg:col-span-2">
            <AreaTrend
              data={trafficTrend}
              keys={['방문', '전환']}
              colors={['#7c3aed', '#22d3ee']}
            />
          </Panel>
          <Panel title="채널별 유입">
            <Donut data={channelSplit} />
            <div className="mt-4 space-y-2">
              {channelSplit.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[var(--text-soft)]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-semibold">{c.value}%</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="월별 매출 (백만원)" className="lg:col-span-2">
            <BarSeries data={revenueTrend} dataKey="매출" color="#7c3aed" />
          </Panel>
          <Panel title="AI 인사이트">
            <div className="space-y-3">
              {[
                { t: '리타겟팅 캠페인 ROAS 8.4 — 예산 증액 추천', c: '#22c55e' },
                { t: '"AI 영상 제작" 키워드 급상승 중', c: '#7c3aed' },
                { t: '휴면 고객 1,240명 — 재활성 캠페인 제안', c: '#f59e0b' },
              ].map((i) => (
                <div key={i.t} className="card-2 flex gap-3 p-3">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: i.c }} />
                  <p className="text-sm text-[var(--text-soft)]">{i.t}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* feature quick links */}
        <div>
          <h3 className="mb-4 font-semibold">바로가기</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <Link
                  key={f.slug}
                  href={`/dashboard/${f.slug}`}
                  className="group card p-5 transition-all hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.color}`}
                  >
                    <Icon size={18} className="text-white" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold">{f.title}</h4>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--text-soft)]">{f.desc}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
