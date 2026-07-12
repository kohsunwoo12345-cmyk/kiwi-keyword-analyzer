'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Eye,
  Users,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Trophy,
  Loader2,
  AlertTriangle,
  Palette,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import { listLandings, type LandingPage } from '@/lib/auth'

const ACCENT = '#7c3aed'
const BUILDER_URL = '/dashboard_USE17237_612/landing'

const THEME_GRAD: Record<string, string> = {
  violet: 'linear-gradient(140deg, #7c3aed, #6366f1)',
  blue: 'linear-gradient(140deg, #2563eb, #06b6d4)',
  rose: 'linear-gradient(140deg, #e11d48, #f97316)',
  emerald: 'linear-gradient(140deg, #059669, #10b981)',
  dark: 'linear-gradient(140deg, #0f172a, #334155)',
}
function grad(theme: string) {
  return THEME_GRAD[theme] || THEME_GRAD.violet
}
function convRate(views: number, leads: number): number {
  if (!views) return 0
  return Math.round((leads / views) * 1000) / 10
}

export default function LandingAnalyticsPage() {
  const [pages, setPages] = useState<LandingPage[]>([])
  const [stats, setStats] = useState<{
    totalPages: number
    publishedCount: number
    totalViews: number
    totalLeads: number
    convRate: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    listLandings().then((r) => {
      if (!alive) return
      if (r.ok) {
        setPages(r.pages)
        setStats(r.stats ?? null)
      } else {
        setError(r.error || '데이터를 불러오지 못했습니다.')
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const ranked = useMemo(() => [...pages].sort((a, b) => b.leads - a.leads), [pages])
  const maxLeads = useMemo(() => Math.max(1, ...pages.map((p) => p.leads)), [pages])
  const topId = ranked.length && ranked[0].leads > 0 ? ranked[0].id : null

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow="랜딩페이지"
        title="랜딩 성과분석"
        desc="공개된 랜딩페이지의 실시간 방문·리드 수집 성과를 분석합니다."
        accent={ACCENT}
        action={
          <Button variant="outline" href={BUILDER_URL}>
            <Palette size={16} /> 빌더로 이동
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <p className="text-xs text-[var(--text-dim)]">실시간 방문·수집 데이터 기반 · 공개 페이지(/l/&lt;slug&gt;) 방문 시 자동 집계됩니다.</p>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 조회수" value={stats ? formatNumber(stats.totalViews) : '—'} icon={Eye} accent="#0ea5e9" />
          <StatCard label="총 수집 리드" value={stats ? formatNumber(stats.totalLeads) : '—'} icon={Users} accent="#f59e0b" />
          <StatCard label="평균 전환율" value={stats ? `${stats.convRate}%` : '—'} icon={TrendingUp} accent="#e11d48" />
          <StatCard label="공개 페이지" value={stats ? String(stats.publishedCount) : '—'} icon={CheckCircle2} accent="#22c55e" />
        </div>

        {loading ? (
          <Panel>
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-dim)]">
              <Loader2 size={16} className="animate-spin" /> 성과 데이터를 불러오는 중…
            </div>
          </Panel>
        ) : pages.length === 0 ? (
          <Panel>
            <div className="py-16 text-center">
              <Palette size={28} className="mx-auto mb-3 text-[var(--text-dim)] opacity-60" />
              <p className="font-semibold">아직 만든 랜딩페이지가 없습니다</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                빌더에서 첫 랜딩페이지를 만들고 공개하면 이곳에서 성과를 확인할 수 있습니다.
              </p>
              <div className="mt-5">
                <Button href={BUILDER_URL}>
                  <Palette size={16} /> 랜딩페이지 만들기
                </Button>
              </div>
            </div>
          </Panel>
        ) : (
          <>
            {/* Per-page table */}
            <Panel title="페이지별 성과 (리드 많은 순)">
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                      <th className="px-3 py-2.5 font-medium">제목</th>
                      <th className="px-3 py-2.5 font-medium">slug</th>
                      <th className="px-3 py-2.5 text-right font-medium">조회수</th>
                      <th className="px-3 py-2.5 text-right font-medium">리드수</th>
                      <th className="px-3 py-2.5 text-right font-medium">전환율</th>
                      <th className="px-3 py-2.5 font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((p) => {
                      const isTop = p.id === topId
                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            'border-b border-[var(--border-soft)] hover:bg-slate-50',
                            isTop && 'bg-amber-50/60',
                          )}
                        >
                          <td className="px-3 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-6 w-6 flex-shrink-0 rounded-md"
                                style={{ background: grad(p.theme) }}
                              />
                              <span className="max-w-[240px] truncate">{p.title}</span>
                              {isTop && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                  <Trophy size={11} /> 최고 성과
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {p.published === 1 ? (
                              <a
                                href={`/l/${p.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline"
                              >
                                <ExternalLink size={12} /> {p.slug}
                              </a>
                            ) : (
                              <span className="text-xs text-[var(--text-dim)]">{p.slug}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-[var(--text-soft)]">{formatNumber(p.views)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{formatNumber(p.leads)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                            {p.views ? `${convRate(p.views, p.leads)}%` : '—'}
                          </td>
                          <td className="px-3 py-3">
                            {p.published === 1 ? (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">공개</Badge>
                            ) : (
                              <Badge className="border-slate-200 bg-slate-50 text-slate-500">비공개</Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Leads bar comparison */}
            <Panel title="페이지별 리드 수집 비교">
              <div className="space-y-3">
                {ranked.map((p) => {
                  const pct = Math.round((p.leads / maxLeads) * 100)
                  return (
                    <div key={p.id}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ background: grad(p.theme) }}
                          />
                          <span className="max-w-[260px] truncate font-medium">{p.title}</span>
                        </span>
                        <span className="flex items-center gap-3 text-xs">
                          <span className="text-[var(--text-dim)]">조회 {formatNumber(p.views)}</span>
                          <span className="font-semibold text-[var(--text)]">리드 {formatNumber(p.leads)}</span>
                        </span>
                      </div>
                      <div className="h-7 w-full overflow-hidden rounded-lg bg-slate-100">
                        <div
                          className="flex h-full items-center justify-end rounded-lg px-2.5 text-xs font-semibold text-white transition-all duration-500"
                          style={{ width: `${Math.max(pct, p.leads > 0 ? 8 : 2)}%`, background: grad(p.theme) }}
                        >
                          {p.leads > 0 && pct >= 14 && `${p.leads}`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}
