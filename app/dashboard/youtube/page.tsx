'use client'

import { useState } from 'react'
import { PlaySquare, Search, TrendingUp, Users, Eye, Flame } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend } from '@/components/dash/Charts'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { ytChannels, ytVideos, ytKeywords } from '@/lib/mock'
import { formatNumber } from '@/lib/utils'

const growthData = [
  { name: '1월', 구독자: 40, 조회수: 120 },
  { name: '2월', 구독자: 42, 조회수: 138 },
  { name: '3월', 구독자: 45, 조회수: 156 },
  { name: '4월', 구독자: 51, 조회수: 188 },
  { name: '5월', 구독자: 58, 조회수: 224 },
  { name: '6월', 구독자: 64, 조회수: 268 },
  { name: '7월', 구독자: 72, 조회수: 312 },
]

function ViralBar({ score }: { score: number }) {
  const color = score >= 90 ? '#ef4444' : score >= 75 ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

export default function YoutubePage() {
  const [channel, setChannel] = useState('마케팅탐구소')

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={PlaySquare}
        eyebrow="02 · 유튜브"
        title="유튜브 분석"
        desc="채널·영상·키워드 성과를 분석하고 떡상 콘텐츠 전략을 도출합니다."
        accent="#ef4444"
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* search */}
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="채널명 또는 URL 입력"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] py-2.5 pl-11 pr-3 text-sm outline-none focus:border-red-500"
            />
          </div>
          <Button className="!bg-gradient-to-br !from-red-500 !to-rose-500">
            <Search size={16} /> 분석하기
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="구독자" value="48.2만" delta={12.4} icon={Users} accent="#ef4444" />
          <StatCard label="총 조회수" value="1,240만" delta={8.7} icon={Eye} accent="#f59e0b" />
          <StatCard label="평균 조회수" value="39.7만" delta={15.1} icon={TrendingUp} accent="#22c55e" />
          <StatCard label="떡상 지수" value="92 / 100" delta={6} icon={Flame} accent="#ef4444" />
        </div>

        <Panel title="채널 성장 추이 (구독자 만명 · 조회수 만회)">
          <AreaTrend data={growthData} keys={['구독자', '조회수']} colors={['#ef4444', '#f59e0b']} />
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Panel title="영상별 성과">
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-3 py-2.5 font-medium">영상</th>
                    <th className="px-3 py-2.5 font-medium">조회수</th>
                    <th className="px-3 py-2.5 font-medium">CTR</th>
                    <th className="px-3 py-2.5 font-medium">떡상지수</th>
                  </tr>
                </thead>
                <tbody>
                  {ytVideos.map((v) => (
                    <tr key={v.title} className="border-b border-[var(--border-soft)] hover:bg-white/[0.02]">
                      <td className="px-3 py-3 font-medium">{v.title}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(v.views)}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{v.ctr}%</td>
                      <td className="px-3 py-3">
                        <ViralBar score={v.viral} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="떡상 키워드">
            <div className="space-y-2.5">
              {ytKeywords.map((k) => (
                <div key={k.kw} className="card-2 flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{k.kw}</p>
                    <p className="text-xs text-[var(--text-dim)]">월 검색 {formatNumber(k.vol)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        k.comp === '낮음'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : k.comp === '보통'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      }
                    >
                      {k.comp}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm font-bold text-red-400">
                      <Flame size={14} /> {k.viral}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="경쟁 채널 벤치마킹">
          <div className="grid gap-4 sm:grid-cols-3">
            {ytChannels.map((c) => (
              <div key={c.name} className="card-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{c.name}</p>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <TrendingUp size={13} /> {c.growth}%
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-dim)]">구독자</p>
                    <p className="font-semibold">{c.subs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-dim)]">조회수</p>
                    <p className="font-semibold">{c.views}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
