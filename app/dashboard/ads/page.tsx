'use client'

import { Megaphone, DollarSign, TrendingUp, Target, Zap } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { StatCard, Panel, Badge } from '@/components/ui'
import { adCampaigns, adTrend } from '@/lib/mock'
import { formatNumber } from '@/lib/utils'

const platformColor: Record<string, string> = {
  메타: '#3b82f6',
  구글: '#f59e0b',
  네이버: '#22c55e',
}

const spendSplit = [
  { name: '메타', value: 44, color: '#3b82f6' },
  { name: '구글', value: 26, color: '#f59e0b' },
  { name: '네이버', value: 30, color: '#22c55e' },
]

export default function AdsPage() {
  const totalSpend = adCampaigns.reduce((s, c) => s + c.spend, 0)
  const avgRoas = (adCampaigns.reduce((s, c) => s + c.roas, 0) / adCampaigns.length).toFixed(1)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Megaphone}
        eyebrow="06 · 광고"
        title="실제 광고 분석"
        desc="메타·구글·네이버 광고 성과를 한 곳에서 통합 분석하고 ROAS를 최적화합니다."
        accent="#d946ef"
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 광고비" value={`₩${formatNumber(totalSpend)}`} delta={-4.2} icon={DollarSign} accent="#d946ef" />
          <StatCard label="평균 ROAS" value={`${avgRoas}x`} delta={11.4} icon={TrendingUp} accent="#22c55e" />
          <StatCard label="총 전환" value="1,842" delta={8.1} icon={Target} accent="#0ea5e9" />
          <StatCard label="평균 CPA" value="₩7,150" delta={-6.8} icon={Zap} accent="#f59e0b" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="광고비 대비 매출 (백만원)" className="lg:col-span-2">
            <AreaTrend data={adTrend} keys={['광고비', '매출']} colors={['#d946ef', '#22c55e']} />
          </Panel>
          <Panel title="플랫폼별 광고비 비중">
            <Donut data={spendSplit} />
            <div className="mt-4 space-y-2">
              {spendSplit.map((c) => (
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

        <Panel title="캠페인 성과">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-3 py-2.5 font-medium">캠페인</th>
                  <th className="px-3 py-2.5 font-medium">플랫폼</th>
                  <th className="px-3 py-2.5 font-medium">광고비</th>
                  <th className="px-3 py-2.5 font-medium">ROAS</th>
                  <th className="px-3 py-2.5 font-medium">CPA</th>
                  <th className="px-3 py-2.5 font-medium">CTR</th>
                  <th className="px-3 py-2.5 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {adCampaigns.map((c) => (
                  <tr key={c.name} className="border-b border-[var(--border-soft)] hover:bg-white/[0.02]">
                    <td className="px-3 py-3 font-medium">{c.name}</td>
                    <td className="px-3 py-3">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{ background: `${platformColor[c.platform]}22`, color: platformColor[c.platform] }}
                      >
                        {c.platform}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">₩{formatNumber(c.spend)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`font-bold ${
                          c.roas >= 5 ? 'text-emerald-400' : c.roas >= 3 ? 'text-amber-400' : 'text-rose-400'
                        }`}
                      >
                        {c.roas}x
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">₩{formatNumber(c.cpa)}</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{c.ctr}%</td>
                    <td className="px-3 py-3">
                      <Badge
                        className={
                          c.status === '운영중'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="AI 예산 최적화 제안">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { t: '리타겟팅(메타) 예산 +20%', d: 'ROAS 8.4로 최고 효율. 증액 시 월 +1,800만 매출 예상', c: '#22c55e' },
              { t: '네이버 신규가입 소재 교체', d: 'ROAS 3.1로 목표 미달. 크리에이티브 A/B 테스트 권장', c: '#f59e0b' },
              { t: '구글 브랜드검색 유지', d: 'ROAS 6.8 안정적. 현재 예산 유지 추천', c: '#0ea5e9' },
            ].map((r) => (
              <div key={r.t} className="card-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: r.c }} />
                  <p className="text-sm font-semibold">{r.t}</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-soft)]">{r.d}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
