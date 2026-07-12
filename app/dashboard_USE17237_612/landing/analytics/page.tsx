'use client'

import { BarChart3, Eye, MousePointerClick, Target } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { StatCard, Panel } from '@/components/ui'

const funnel = [
  { step: '방문', value: 24800, pct: 100 },
  { step: '폼 조회', value: 9240, pct: 37 },
  { step: '입력 시작', value: 4464, pct: 18 },
  { step: '제출', value: 1860, pct: 7.5 },
]

const channels = [
  { name: '네이버', value: 42, color: '#22c55e' },
  { name: '메타', value: 28, color: '#7c3aed' },
  { name: '구글', value: 19, color: '#0ea5e9' },
  { name: '유튜브', value: 11, color: '#ef4444' },
]

const devices = [
  { name: '모바일', pct: 68, color: 'from-violet-500 to-fuchsia-500' },
  { name: 'PC', pct: 26, color: 'from-sky-500 to-cyan-500' },
  { name: '태블릿', pct: 6, color: 'from-emerald-500 to-teal-500' },
]

const pages = [
  { name: '강남 임플란트 상담 이벤트', visits: 4820, cvr: 6.5, dwell: '1분 52초', bounce: 38 },
  { name: '여름 다이어트 PT 30일 챌린지', visits: 8140, cvr: 7.4, dwell: '2분 18초', bounce: 32 },
  { name: '수능 파이널 온라인 특강 신청', visits: 2960, cvr: 6.4, dwell: '1분 40초', bounce: 41 },
  { name: '신규 아파트 사전청약 안내', visits: 3510, cvr: 5.1, dwell: '1분 12초', bounce: 47 },
  { name: '가을 신학기 수강생 모집', visits: 5370, cvr: 8.2, dwell: '2분 05초', bounce: 29 },
]

const trend = [
  { name: '1주', 방문: 4200, 전환: 288 },
  { name: '2주', 방문: 5100, 전환: 362 },
  { name: '3주', 방문: 4780, 전환: 341 },
  { name: '4주', 방문: 6240, 전환: 498 },
  { name: '5주', 방문: 5920, 전환: 452 },
  { name: '6주', 방문: 7180, 전환: 601 },
]

export default function LandingAnalyticsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow="랜딩페이지"
        title="랜딩 성과분석"
        desc="퍼널 단계별 전환과 이탈을 분석해 페이지를 최적화합니다."
        accent="#7c3aed"
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 방문" value="24,800" delta={8.4} icon={Eye} accent="#7c3aed" />
          <StatCard label="폼 조회" value="9,240" delta={5.2} icon={MousePointerClick} accent="#0ea5e9" />
          <StatCard label="DB 제출" value="1,860" delta={11} icon={Target} accent="#22c55e" />
          <StatCard label="전환율" value="7.5%" delta={2.1} icon={BarChart3} accent="#f59e0b" />
        </div>

        {/* Conversion funnel */}
        <Panel title="전환 퍼널">
          <div className="space-y-3">
            {funnel.map((f, i) => {
              const drop = i === 0 ? 0 : Math.round((1 - f.value / funnel[i - 1].value) * 100)
              return (
                <div key={f.step}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{f.step}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-[var(--text-soft)]">{f.value.toLocaleString('ko-KR')}명</span>
                      <span className="font-semibold text-violet-600">{f.pct}%</span>
                      {i > 0 && (
                        <span className="text-xs font-medium text-rose-500">이탈 {drop}%</span>
                      )}
                    </span>
                  </div>
                  <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                    <div
                      className="flex h-full items-center justify-end rounded-lg brand-gradient px-3 text-xs font-semibold text-white transition-all duration-500"
                      style={{ width: `${f.pct}%` }}
                    >
                      {f.pct >= 12 && `${f.pct}%`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        {/* Channels + devices */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="유입 채널">
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_1.1fr]">
              <Donut data={channels} />
              <div className="space-y-2.5">
                {channels.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-semibold">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="디바이스 비중">
            <div className="space-y-4">
              {devices.map((d) => (
                <div key={d.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className="font-semibold text-[var(--text-soft)]">{d.pct}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-br ${d.color} transition-all duration-500`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Per-page performance */}
        <Panel title="페이지별 성과">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-3 py-2.5 font-medium">페이지명</th>
                  <th className="px-3 py-2.5 font-medium">방문</th>
                  <th className="px-3 py-2.5 font-medium">전환율</th>
                  <th className="px-3 py-2.5 font-medium">평균 체류시간</th>
                  <th className="px-3 py-2.5 font-medium">이탈률</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.name} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{p.visits.toLocaleString('ko-KR')}</td>
                    <td className="px-3 py-3 font-semibold text-emerald-600">{p.cvr}%</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{p.dwell}</td>
                    <td className="px-3 py-3">
                      <span className={p.bounce >= 45 ? 'font-semibold text-rose-500' : 'text-[var(--text-soft)]'}>
                        {p.bounce}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Trend */}
        <Panel title="유입 추이">
          <AreaTrend data={trend} keys={['방문', '전환']} colors={['#7c3aed', '#22c55e']} />
        </Panel>
      </div>
    </div>
  )
}
