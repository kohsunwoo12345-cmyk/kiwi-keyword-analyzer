'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Eye,
  Users,
  Activity,
  UserCheck,
  RefreshCw,
  Smartphone,
  Monitor,
  HelpCircle,
  Globe,
  Clock,
  FileText,
  Link2,
  ExternalLink,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { AreaTrend, Donut } from '@/components/dash/Charts'
import { StatCard, Panel, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { adminVisitStats, type VisitStats } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

const DEVICE_META: Record<string, { color: string; icon: typeof Smartphone }> = {
  Mobile: { color: '#7c3aed', icon: Smartphone },
  Desktop: { color: '#0ea5e9', icon: Monitor },
  Other: { color: '#94a3b8', icon: HelpCircle },
}
function deviceMeta(name: string) {
  return DEVICE_META[name] || { color: '#94a3b8', icon: HelpCircle }
}

/* ───────── helpers ───────── */
function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
/** 'YYYY-MM-DD' → 'M/D' */
function shortDay(d: string) {
  const parts = d.split('-')
  if (parts.length < 3) return d
  return `${Number(parts[1])}/${Number(parts[2])}`
}

const DAY_OPTIONS = [7, 14, 30] as const
type DayOption = (typeof DAY_OPTIONS)[number]

const EMPTY: VisitStats = { ok: false }

/* ───────── small atoms ───────── */
const THEAD_CLS = 'border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]'
const TH_CLS = 'pb-2.5 font-medium'
const TR_CLS = 'border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50'

/** 라벨 + 값 + 비율 막대 리스트 아이템 */
function BarRow({
  label,
  value,
  max,
  color = ACCENT,
  mono,
  title,
}: {
  label: string
  value: number
  max: number
  color?: string
  mono?: boolean
  title?: string
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <span className={cn('min-w-0 truncate text-sm text-[var(--text-soft)]', mono && 'font-mono text-xs')} title={title || label}>
          {label}
        </span>
        <span className="flex-shrink-0 text-sm font-semibold tabular-nums">{value.toLocaleString('ko-KR')}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-2)]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function AdminStatsPage() {
  const [days, setDays] = useState<DayOption>(14)
  const [data, setData] = useState<VisitStats>(EMPTY)
  const [loading, setLoading] = useState(true)

  function reload(d: DayOption = days) {
    setLoading(true)
    adminVisitStats(d).then((r) => {
      setData(r)
      setLoading(false)
    })
  }
  useEffect(() => {
    reload(days)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  const s = data.stats
  const byDay = data.byDay ?? []
  const byPath = data.byPath ?? []
  const byCountry = data.byCountry ?? []
  const byDevice = data.byDevice ?? []
  const byHour = data.byHour ?? []
  const byRef = data.byRef ?? []
  const recent = data.recent ?? []

  const hasData =
    !!s &&
    (s.totalPv > 0 ||
      byDay.length > 0 ||
      byPath.length > 0 ||
      byDevice.length > 0 ||
      byHour.length > 0 ||
      recent.length > 0)

  /* 일별 추이 → AreaTrend */
  const trend = useMemo(
    () => byDay.map((r) => ({ name: shortDay(r.d), 페이지뷰: r.pv, 방문자: r.uv })),
    [byDay],
  )

  /* 기기 분포 → Donut */
  const devices = useMemo(
    () => byDevice.map((r) => ({ name: r.device, value: r.n, color: deviceMeta(r.device).color })),
    [byDevice],
  )
  const deviceTotal = useMemo(() => byDevice.reduce((a, b) => a + b.n, 0), [byDevice])

  /* 시간대별 → 00~23 정규화 */
  const hours = useMemo(() => {
    const map = new Map(byHour.map((h) => [h.h, h.n]))
    const out: { h: string; n: number }[] = []
    for (let i = 0; i < 24; i++) {
      const key = String(i).padStart(2, '0')
      out.push({ h: key, n: map.get(key) ?? 0 })
    }
    return out
  }, [byHour])
  const hourMax = useMemo(() => Math.max(1, ...hours.map((h) => h.n)), [hours])

  const pathMax = useMemo(() => Math.max(1, ...byPath.map((p) => p.n)), [byPath])
  const refMax = useMemo(() => Math.max(1, ...byRef.map((r) => r.n)), [byRef])
  const countryMax = useMemo(() => Math.max(1, ...byCountry.map((c) => c.n)), [byCountry])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow="ADMIN · 통계"
        title="접속 통계 분석"
        desc="사이트 방문·페이지뷰·유입 경로를 분석합니다."
        accent={ACCENT}
        action={
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200',
                    days === d
                      ? 'brand-gradient text-white shadow-md shadow-violet-500/25'
                      : 'text-[var(--text-soft)] hover:bg-white hover:text-[var(--text)]',
                  )}
                >
                  {d}일
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* stats */}
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="총 페이지뷰" value={(<Counter to={s?.totalPv ?? 0} />) as unknown as string} icon={Eye} accent="#7c3aed" />
            <StatCard label="24시간 PV" value={(<Counter to={s?.pv24 ?? 0} />) as unknown as string} icon={Activity} accent="#0ea5e9" />
            <StatCard label="순 방문자 UV" value={(<Counter to={s?.uv ?? 0} />) as unknown as string} icon={Users} accent="#22c55e" />
            <StatCard label="24시간 UV" value={(<Counter to={s?.uv24 ?? 0} />) as unknown as string} icon={UserCheck} accent="#f59e0b" />
          </div>
        </Reveal>

        {loading && !hasData ? (
          <Reveal>
            <Panel>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <RefreshCw size={28} className="animate-spin text-violet-400" />
                <p className="mt-4 text-sm text-[var(--text-dim)]">방문 통계를 불러오는 중…</p>
              </div>
            </Panel>
          </Reveal>
        ) : !hasData ? (
          <Reveal>
            <Panel>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-400">
                  <BarChart3 size={26} />
                </span>
                <p className="mt-4 font-semibold">아직 방문 데이터가 없습니다.</p>
                <p className="mt-1 text-sm text-[var(--text-dim)]">사이트 방문이 쌓이면 표시됩니다.</p>
              </div>
            </Panel>
          </Reveal>
        ) : (
          <>
            {/* 일별 추이 + 기기 분포 */}
            <Reveal>
              <div className="grid gap-6 lg:grid-cols-3">
                <Panel title={`일별 추이 · 최근 ${data.days ?? days}일`} className="lg:col-span-2">
                  {trend.length > 0 ? (
                    <AreaTrend data={trend} keys={['페이지뷰', '방문자']} colors={['#7c3aed', '#22d3ee']} />
                  ) : (
                    <p className="py-16 text-center text-sm text-[var(--text-dim)]">추이 데이터가 없습니다.</p>
                  )}
                </Panel>

                <Panel title="기기 분포">
                  {deviceTotal > 0 ? (
                    <>
                      <Donut data={devices} />
                      <div className="mt-4 space-y-2">
                        {byDevice.map((d) => {
                          const meta = deviceMeta(d.device)
                          const Icon = meta.icon
                          const pct = deviceTotal > 0 ? Math.round((d.n / deviceTotal) * 100) : 0
                          return (
                            <div key={d.device} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2 text-[var(--text-soft)]">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
                                <Icon size={14} className="text-[var(--text-dim)]" />
                                {d.device}
                              </span>
                              <span className="font-semibold tabular-nums">
                                {d.n.toLocaleString('ko-KR')}
                                <span className="ml-1 text-xs font-normal text-[var(--text-dim)]">{pct}%</span>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="py-16 text-center text-sm text-[var(--text-dim)]">기기 데이터가 없습니다.</p>
                  )}
                </Panel>
              </div>
            </Reveal>

            {/* 시간대별 방문 */}
            <Reveal>
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <Clock size={16} className="text-violet-500" /> 시간대별 방문
                  </span>
                }
              >
                <div className="flex h-44 items-end gap-1 sm:gap-1.5">
                  {hours.map((h) => {
                    const pct = Math.round((h.n / hourMax) * 100)
                    return (
                      <div key={h.h} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="text-[10px] font-semibold text-[var(--text-dim)] opacity-0 transition-opacity group-hover:opacity-100">
                          {h.n}
                        </span>
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-violet-500 to-fuchsia-400 transition-all duration-500"
                          style={{ height: `${Math.max(h.n > 0 ? 4 : 1, pct)}%` }}
                          title={`${h.h}시 · ${h.n.toLocaleString('ko-KR')}회`}
                        />
                        <span className="text-[9px] text-[var(--text-dim)] sm:text-[10px]">
                          {Number(h.h) % 3 === 0 ? h.h : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs text-[var(--text-dim)]">시(00–23)별 페이지뷰 · 최고 {hourMax.toLocaleString('ko-KR')}회</p>
              </Panel>
            </Reveal>

            {/* 인기 페이지 + 유입 경로 + 국가별 */}
            <Reveal>
              <div className="grid gap-6 lg:grid-cols-3">
                <Panel
                  title={
                    <span className="flex items-center gap-2">
                      <FileText size={16} className="text-violet-500" /> 인기 페이지 TOP
                    </span>
                  }
                >
                  {byPath.length > 0 ? (
                    <div className="divide-y divide-[var(--border-soft)]">
                      {byPath.slice(0, 12).map((p) => (
                        <BarRow key={p.path} label={p.path || '/'} value={p.n} max={pathMax} color="#7c3aed" mono title={p.path} />
                      ))}
                    </div>
                  ) : (
                    <p className="py-10 text-center text-sm text-[var(--text-dim)]">페이지 데이터가 없습니다.</p>
                  )}
                </Panel>

                <Panel
                  title={
                    <span className="flex items-center gap-2">
                      <Link2 size={16} className="text-sky-500" /> 유입 경로
                    </span>
                  }
                >
                  {byRef.length > 0 ? (
                    <div className="divide-y divide-[var(--border-soft)]">
                      {byRef.slice(0, 12).map((r, i) => (
                        <BarRow
                          key={`${r.ref}-${i}`}
                          label={r.ref || '직접 유입'}
                          value={r.n}
                          max={refMax}
                          color="#0ea5e9"
                          title={r.ref || '직접 유입'}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-10 text-center text-sm text-[var(--text-dim)]">유입 경로 데이터가 없습니다.</p>
                  )}
                </Panel>

                <Panel
                  title={
                    <span className="flex items-center gap-2">
                      <Globe size={16} className="text-emerald-500" /> 국가별
                    </span>
                  }
                >
                  {byCountry.length > 0 ? (
                    <div className="divide-y divide-[var(--border-soft)]">
                      {byCountry.slice(0, 12).map((c, i) => (
                        <BarRow
                          key={`${c.country}-${i}`}
                          label={c.country || '미상'}
                          value={c.n}
                          max={countryMax}
                          color="#22c55e"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-10 text-center text-sm text-[var(--text-dim)]">국가 데이터가 없습니다.</p>
                  )}
                </Panel>
              </div>
            </Reveal>

            {/* 최근 방문 */}
            <Reveal>
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <ExternalLink size={16} className="text-violet-500" /> 최근 방문
                  </span>
                }
              >
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className={THEAD_CLS}>
                        <th className={TH_CLS}>시각</th>
                        <th className={TH_CLS}>경로</th>
                        <th className={TH_CLS}>국가</th>
                        <th className={TH_CLS}>기기</th>
                        <th className={TH_CLS}>유입</th>
                        <th className={TH_CLS}>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((r, i) => {
                        const meta = deviceMeta(r.device)
                        const Icon = meta.icon
                        return (
                          <tr key={i} className={TR_CLS}>
                            <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{fmtDateTime(r.created_at)}</td>
                            <td className="max-w-[220px] truncate py-2.5 font-mono text-xs text-[var(--text-soft)]" title={r.path}>
                              {r.path || '/'}
                            </td>
                            <td className="py-2.5 text-[var(--text-soft)]">{r.country || '미상'}</td>
                            <td className="py-2.5">
                              <span className="flex items-center gap-1 text-xs text-[var(--text-soft)]">
                                <Icon size={13} className="text-[var(--text-dim)]" /> {r.device || 'Other'}
                              </span>
                            </td>
                            <td className="max-w-[200px] truncate py-2.5 text-xs text-[var(--text-soft)]" title={r.ref || '직접 유입'}>
                              {r.ref || '직접 유입'}
                            </td>
                            <td className="py-2.5 font-mono text-xs">{r.ip || '-'}</td>
                          </tr>
                        )
                      })}
                      {recent.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-[var(--text-dim)]">
                            최근 방문 기록이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-[var(--text-dim)]">최근 {recent.length}건 표시</p>
              </Panel>
            </Reveal>
          </>
        )}
      </div>
    </div>
  )
}
