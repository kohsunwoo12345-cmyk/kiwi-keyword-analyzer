'use client'

import { useMemo, useState } from 'react'
import { Megaphone, DollarSign, TrendingUp, Target, Zap, Sparkles, SearchX } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { adCampaigns, adTrend } from '@/lib/mock'
import { formatNumberFull, formatWon } from '@/lib/utils'

const ACCENT = '#d946ef'

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

const PLATFORMS = ['전체', '메타', '구글', '네이버']

/** ROAS 등급 — 색과 문구를 한 곳에서 정한다 */
function roasTone(roas: number) {
  if (roas >= 5) return { cls: 'text-emerald-500', color: '#10b981', label: '우수' }
  if (roas >= 3) return { cls: 'text-amber-500', color: '#f59e0b', label: '보통' }
  return { cls: 'text-rose-500', color: '#ef4444', label: '개선 필요' }
}

export default function AdsPage() {
  const [platform, setPlatform] = useState('전체')

  const shown = useMemo(
    () => (platform === '전체' ? adCampaigns : adCampaigns.filter((c) => c.platform === platform)),
    [platform],
  )

  /** 캠페인 데이터에서 직접 계산 — 지표끼리 서로 맞아떨어진다 */
  const totals = useMemo(() => {
    const spend = adCampaigns.reduce((s, c) => s + c.spend, 0)
    const revenue = adCampaigns.reduce((s, c) => s + c.spend * c.roas, 0)
    const conversions = adCampaigns.reduce((s, c) => s + Math.round(c.spend / c.cpa), 0)
    return {
      spend,
      revenue,
      conversions,
      // 단순 평균이 아니라 광고비로 가중한 값 — 실제 회수율과 일치한다
      roas: revenue / spend,
      cpa: Math.round(spend / Math.max(1, conversions)),
    }
  }, [])

  const maxRoas = Math.max(...adCampaigns.map((c) => c.roas))
  const best = adCampaigns.reduce((a, b) => (b.roas > a.roas ? b : a))
  const worst = adCampaigns.reduce((a, b) => (b.roas < a.roas ? b : a))

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Megaphone}
        eyebrow="06 · 광고"
        title="실제 광고 분석"
        desc="메타·구글·네이버 광고 성과를 한 곳에서 통합 분석하고 ROAS를 최적화합니다."
        accent={ACCENT}
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="총 광고비" icon={DollarSign} accent="#d946ef" value={formatWon(totals.spend)} sub={`캠페인 ${adCampaigns.length}개 합계`} />
          <Metric
            label="가중 평균 ROAS"
            icon={TrendingUp}
            accent="#22c55e"
            value={`${totals.roas.toFixed(1)}x`}
            sub={`매출 ${formatWon(Math.round(totals.revenue))} 회수`}
          />
          <Metric label="총 전환" icon={Target} accent="#0ea5e9" value={formatNumberFull(totals.conversions)} sub="캠페인별 광고비 ÷ CPA 합계" />
          <Metric label="평균 CPA" icon={Zap} accent="#f59e0b" value={`₩${formatNumberFull(totals.cpa)}`} sub="전환 1건을 만드는 데 드는 비용" />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Card
            title="광고비 대비 매출"
            desc="최근 7일 · 단위 백만원"
            className="xl:col-span-2"
            action={
              <div className="flex items-center gap-3 text-[11.5px] font-semibold">
                {[
                  { name: '광고비', color: '#d946ef' },
                  { name: '매출', color: '#22c55e' },
                ].map((s) => (
                  <span key={s.name} className="flex items-center gap-1.5 text-[var(--text-soft)]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                ))}
              </div>
            }
          >
            <AreaTrend data={adTrend} keys={['광고비', '매출']} colors={['#d946ef', '#22c55e']} />
          </Card>
          <Card title="플랫폼별 광고비 비중" desc="이번 달 집행 기준">
            <Donut data={spendSplit} />
            <div className="mt-4 space-y-2">
              {spendSplit.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-[var(--text-soft)]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-bold tabular-nums">{c.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card
          title="캠페인 성과"
          desc={`${shown.length}개 표시 중 · ROAS 막대는 최고 ${maxRoas}x 기준`}
          bodyClassName="p-0"
          action={
            <div className="flex flex-wrap gap-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                    platform === p
                      ? 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-400'
                      : 'border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--panel-2)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          {shown.length === 0 ? (
            <EmptyState icon={SearchX} title="해당 플랫폼의 캠페인이 없습니다" hint="다른 플랫폼을 선택해 보세요." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11.5px] text-[var(--text-dim)]">
                    <th className="px-5 py-2.5 font-semibold">캠페인</th>
                    <th className="px-5 py-2.5 font-semibold">플랫폼</th>
                    <th className="px-5 py-2.5 text-right font-semibold">광고비</th>
                    <th className="px-5 py-2.5 font-semibold">ROAS</th>
                    <th className="px-5 py-2.5 text-right font-semibold">CPA</th>
                    <th className="px-5 py-2.5 text-right font-semibold">CTR</th>
                    <th className="px-5 py-2.5 font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => {
                    const tone = roasTone(c.roas)
                    return (
                      <tr key={c.name} className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--panel-2)]">
                        <td className="px-5 py-3 font-semibold">{c.name}</td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: `${platformColor[c.platform]}22`, color: platformColor[c.platform] }}
                          >
                            {c.platform}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">₩{formatNumberFull(c.spend)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-10 flex-shrink-0 font-bold tabular-nums ${tone.cls}`}>{c.roas}x</span>
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--panel-2)]">
                              <span
                                className="block h-full rounded-full"
                                style={{ width: `${(c.roas / maxRoas) * 100}%`, background: tone.color }}
                              />
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">₩{formatNumberFull(c.cpa)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--text-soft)]">{c.ctr}%</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                              c.status === '운영중'
                                ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500'
                                : 'border-amber-500/30 bg-amber-500/12 text-amber-500'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="AI 예산 최적화 제안"
          desc={`최고 효율 ${best.name} (${best.roas}x) · 개선 필요 ${worst.name} (${worst.roas}x)`}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { t: '리타겟팅(메타) 예산 +20%', d: 'ROAS 8.4로 최고 효율. 증액 시 월 +1,800만 매출 예상', c: '#22c55e', tag: '증액' },
              { t: '네이버 신규가입 소재 교체', d: 'ROAS 3.1로 목표 미달. 크리에이티브 A/B 테스트 권장', c: '#f59e0b', tag: '점검' },
              { t: '구글 브랜드검색 유지', d: 'ROAS 6.8 안정적. 현재 예산 유지 추천', c: '#0ea5e9', tag: '유지' },
            ].map((r, i) => (
              <div
                key={r.t}
                className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4"
                style={{ animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both` }}
              >
                <span className="absolute inset-y-0 left-0 w-1" style={{ background: r.c }} />
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[13px] font-bold">
                    <Sparkles size={13} style={{ color: r.c }} />
                    {r.t}
                  </p>
                  <span
                    className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                    style={{ background: `${r.c}1f`, color: r.c }}
                  >
                    {r.tag}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-soft)]">{r.d}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
