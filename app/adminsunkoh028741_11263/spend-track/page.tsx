'use client'

/* 제공사 실제 사용액 추적 — 추정이 아니라 '제공사 잔액이 실제로 줄어든 만큼' 을 본다.
   잔액은 생성이 일어날 때마다 자동으로 기록되므로(30분 쿨다운) 따로 할 일이 없다.
   잔액 API 를 제공하지 않는 제공사는 자동 추적이 불가능하다 — 그 사실도 숨기지 않고 표시한다. */

import { useCallback, useEffect, useState } from 'react'
import { Wallet, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Info } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

type Daily = { date: string; balance: number; usedUnits: number | null; recharged: boolean; usedUsd: number | null; estUsd: number }
type Prov = {
  id: string; name: string; unit: string; usdPerUnit: number | null; hasKey: boolean; snapshots: number
  latest: { date: string; balance: number } | null
  daily: Daily[]; totalRealUsd: number; totalEstUsd: number; gapPct: number | null
}

const usd = (n: number | null) => (n == null ? '—' : '$' + n.toFixed(4))
const num = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })

export default function SpendTrackPage() {
  const [data, setData] = useState<{ providers: Prov[]; note?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [days, setDays] = useState(14)

  const load = useCallback(async (snap = false) => {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/spend-track?days=${days}${snap ? '&snap=1' : ''}`, { credentials: 'include', cache: 'no-store' })
      setData(await r.json())
    } catch { setData(null) }
    setBusy(false)
  }, [days])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader
        icon={Wallet}
        eyebrow="AI 정산"
        title="제공사 실제 사용액"
        desc="제공사 잔액이 실제로 줄어든 금액과, 우리가 기록한 추정 원가를 나란히 비교합니다. 잔액은 생성이 일어날 때마다 자동으로 기록됩니다."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', days === d ? 'bg-violet-600 text-white' : 'text-[var(--text-soft)]')}>
              최근 {d}일
            </button>
          ))}
        </div>
        <Button variant="soft" size="sm" onClick={() => load()} disabled={busy}>
          <RefreshCw size={14} className={cn(busy && 'animate-spin')} /> 새로고침
        </Button>
        <Button size="sm" onClick={() => load(true)} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />} 지금 잔액 기록
        </Button>
      </div>

      {!data ? (
        <Panel><p className="py-16 text-center text-sm text-[var(--text-dim)]">{busy ? '불러오는 중…' : '불러오지 못했습니다.'}</p></Panel>
      ) : (
        <div className="space-y-5">
          {data.providers.map((p) => (
            <Panel
              key={p.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {p.name}
                  {!p.hasKey && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600">API 키 없음</span>}
                  {p.latest && <span className="text-xs font-normal text-[var(--text-dim)]">현재 잔액 {num(p.latest.balance)} {p.unit}</span>}
                </span>
              }
            >
              {p.daily.length < 1 ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">
                  {p.hasKey
                    ? `잔액 기록이 아직 ${p.snapshots}건입니다. 하루 이상 쌓이면 사용액이 계산됩니다.`
                    : 'API 키가 없어 잔액을 읽을 수 없습니다.'}
                </p>
              ) : (
                <>
                  <div className="mb-3 grid gap-3 sm:grid-cols-3">
                    <Stat label="실제 사용액" value={usd(p.totalRealUsd)} strong />
                    <Stat label="우리 기록(추정)" value={usd(p.totalEstUsd)} />
                    <Stat
                      label="차이"
                      value={p.gapPct == null ? '—' : `${p.gapPct > 0 ? '+' : ''}${p.gapPct}%`}
                      tone={p.gapPct == null ? undefined : Math.abs(p.gapPct) <= 10 ? 'good' : 'warn'}
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-soft)] text-[11px] text-[var(--text-dim)]">
                          <th className="py-2 text-left">날짜</th>
                          <th className="py-2 text-right">잔액</th>
                          <th className="py-2 text-right">실제 사용</th>
                          <th className="py-2 text-right">우리 기록</th>
                          <th className="py-2 text-right">차이</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...p.daily].reverse().map((d) => {
                          const gap = d.usedUsd == null || d.estUsd === 0 ? null : ((d.usedUsd - d.estUsd) / d.estUsd) * 100
                          return (
                            <tr key={d.date} className="border-b border-[var(--border-soft)] last:border-0">
                              <td className="py-2">{d.date}</td>
                              <td className="py-2 text-right tabular-nums">{num(d.balance)} <span className="text-[var(--text-dim)]">{p.unit}</span></td>
                              <td className="py-2 text-right tabular-nums font-semibold">
                                {d.recharged ? <span className="text-[var(--text-dim)]">충전한 날</span> : `${num(d.usedUnits || 0)} ${p.unit}${d.usedUsd != null ? ` · ${usd(d.usedUsd)}` : ''}`}
                              </td>
                              <td className="py-2 text-right tabular-nums text-[var(--text-soft)]">{usd(d.estUsd)}</td>
                              <td className={cn('py-2 text-right tabular-nums font-semibold',
                                gap == null ? 'text-[var(--text-dim)]' : Math.abs(gap) <= 10 ? 'text-emerald-600' : 'text-amber-600')}>
                                {gap == null ? '—' : (
                                  <span className="inline-flex items-center gap-1">
                                    {gap > 1 ? <TrendingUp size={13} /> : gap < -1 ? <TrendingDown size={13} /> : <Minus size={13} />}
                                    {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Panel>
          ))}

          <Panel title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> 자동 추적이 안 되는 제공사</span>}>
            <p className="text-sm leading-relaxed text-[var(--text-soft)]">
              씨댄스 · Kling · Hailuo · Veo · GPT Image · Flux · fal 은 <b>잔액을 알려주는 API가 없습니다.</b>
              이 제공사들의 실제 금액은 각 콘솔의 청구서로만 확인할 수 있습니다.
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--text-dim)]">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              차이가 ±10%를 넘으면 단가표가 실제와 어긋나 있다는 뜻입니다. 알려주시면 단가를 실제에 맞게 보정하겠습니다.
            </p>
          </Panel>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'good' | 'warn' }) {
  return (
    <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-3',
      tone === 'good' && 'border-emerald-500/40', tone === 'warn' && 'border-amber-500/40')}>
      <div className="text-[11px] text-[var(--text-dim)]">{label}</div>
      <div className={cn('mt-0.5 tabular-nums', strong ? 'text-xl font-bold' : 'text-lg font-semibold',
        tone === 'good' && 'text-emerald-600', tone === 'warn' && 'text-amber-600')}>{value}</div>
    </div>
  )
}
