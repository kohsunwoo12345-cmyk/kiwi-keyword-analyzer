'use client'

import { BarChart3, Eye, Bookmark, Send, Heart, MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, BarSeries, Donut } from '@/components/dash/Charts'
import { StatCard, Panel } from '@/components/ui'
import { formatNumber } from '@/lib/utils'

const ACCENT = '#ec4899'

const perfTrend = [
  { name: '1월', 도달: 82, 참여: 28 },
  { name: '2월', 도달: 96, 참여: 34 },
  { name: '3월', 도달: 108, 참여: 41 },
  { name: '4월', 도달: 121, 참여: 46 },
  { name: '5월', 도달: 130, 참여: 52 },
  { name: '6월', 도달: 137, 참여: 58 },
  { name: '7월', 도달: 142, 참여: 63 },
]

const genderData = [
  { name: '여성', value: 72, color: '#ec4899' },
  { name: '남성', value: 26, color: '#a855f7' },
  { name: '기타', value: 2, color: '#f59e0b' },
]

const ageData = [
  { label: '18-24', pct: 34 },
  { label: '25-34', pct: 41 },
  { label: '35-44', pct: 18 },
  { label: '45+', pct: 7 },
]

const weekdayData = [
  { name: '월', 참여: 42 },
  { name: '화', 참여: 51 },
  { name: '수', 참여: 68 },
  { name: '목', 참여: 74 },
  { name: '금', 참여: 88 },
  { name: '토', 참여: 96 },
  { name: '일', 참여: 79 },
]

const postPerf = [
  { cap: '여름 신상 컬렉션', gradient: 'from-pink-400 to-rose-500', reach: 184000, likes: 3120, comments: 214, saves: 890, er: 8.2 },
  { cap: '베스트셀러 TOP5', gradient: 'from-fuchsia-400 to-purple-500', reach: 152000, likes: 2760, comments: 167, saves: 720, er: 7.4 },
  { cap: '고객 후기 모음', gradient: 'from-rose-400 to-orange-400', reach: 138000, likes: 2410, comments: 128, saves: 610, er: 6.9 },
  { cap: '주말 특가 이벤트', gradient: 'from-violet-400 to-fuchsia-500', reach: 121000, likes: 2020, comments: 105, saves: 540, er: 6.3 },
  { cap: '매장 비하인드', gradient: 'from-amber-400 to-pink-500', reach: 98000, likes: 1560, comments: 73, saves: 380, er: 5.5 },
  { cap: '오늘의 코디', gradient: 'from-sky-400 to-indigo-500', reach: 84000, likes: 1290, comments: 58, saves: 310, er: 4.9 },
]

export default function InstagramInsightsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow="인스타그램"
        title="인사이트 분석"
        desc="도달·참여 지표와 팔로워 인구통계, 게시물별 성과를 심층 분석합니다."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="도달" value="142만" delta={12} icon={Eye} accent="#ec4899" />
          <StatCard label="노출" value="198만" delta={9.4} icon={BarChart3} accent="#a855f7" />
          <StatCard label="저장" value="8,400" delta={15.2} icon={Bookmark} accent="#f59e0b" />
          <StatCard label="공유" value="3,200" delta={6.8} icon={Send} accent="#8b5cf6" />
        </div>

        {/* Performance trend */}
        <Panel title="성과 추이 (도달 만회 · 참여 만건)">
          <AreaTrend data={perfTrend} keys={['도달', '참여']} colors={['#ec4899', '#a855f7']} />
        </Panel>

        {/* Demographics */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="팔로워 성별">
            <Donut data={genderData} />
            <div className="mt-3 flex flex-wrap justify-center gap-4">
              {genderData.map((g) => (
                <div key={g.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                  <span className="text-[var(--text-soft)]">{g.name}</span>
                  <span className="font-semibold">{g.value}%</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="연령대 분포">
            <div className="space-y-4 py-2">
              {ageData.map((a) => (
                <div key={a.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-[var(--text-soft)]">{a.label}</span>
                    <span className="font-semibold text-fuchsia-600">{a.pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500"
                      style={{ width: `${a.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Post performance table */}
        <Panel title="게시물별 성과">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-3 py-2.5 font-medium">게시물</th>
                  <th className="px-3 py-2.5 font-medium">도달</th>
                  <th className="px-3 py-2.5 font-medium">좋아요</th>
                  <th className="px-3 py-2.5 font-medium">댓글</th>
                  <th className="px-3 py-2.5 font-medium">저장</th>
                  <th className="px-3 py-2.5 font-medium">참여율</th>
                </tr>
              </thead>
              <tbody>
                {postPerf.map((p) => (
                  <tr key={p.cap} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-9 w-9 flex-shrink-0 rounded-lg bg-gradient-to-br ${p.gradient}`} />
                        <span className="font-medium">{p.cap}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(p.reach)}</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">
                      <span className="flex items-center gap-1"><Heart size={13} className="text-rose-400" /> {formatNumber(p.likes)}</span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">
                      <span className="flex items-center gap-1"><MessageCircle size={13} className="text-sky-400" /> {p.comments}</span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">
                      <span className="flex items-center gap-1"><Bookmark size={13} className="text-amber-400" /> {p.saves}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-fuchsia-600">{p.er}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Weekday engagement */}
        <Panel title="요일별 참여">
          <BarSeries data={weekdayData} dataKey="참여" color="#ec4899" height={220} />
        </Panel>
      </div>
    </div>
  )
}
