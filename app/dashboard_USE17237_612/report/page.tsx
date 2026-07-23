'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Wallet, Coins, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import { accountOverview, type Tx, type ActivityRow, type User } from '@/lib/auth'

const ACCENT = '#8b5cf6'

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const KIND_LABEL: Record<string, string> = { point: '포인트', credit: '크레딧', purchase: '구매' }

export default function ReportPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tx, setTx] = useState<Tx[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    accountOverview().then((r) => {
      setUser(r.user || null)
      setTx(r.transactions)
      setActivity(r.activity)
      setReady(true)
    })
  }, [])

  const stats = useMemo(() => {
    let usedCredit = 0
    let chargedCredit = 0
    let usedPoint = 0
    for (const t of tx) {
      if (t.kind === 'credit') t.amount < 0 ? (usedCredit += -t.amount) : (chargedCredit += t.amount)
      if (t.kind === 'point' && t.amount < 0) usedPoint += -t.amount
    }
    return { usedCredit, chargedCredit, usedPoint }
  }, [tx])

  // 최근 14일 크레딧 사용 추이
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
        const k = (t.created_at || '').slice(0, 10)
        const day = days.find((d) => d.key === k)
        if (day) day.used += -t.amount
      }
    }
    return days
  }, [tx])
  const maxUsed = Math.max(1, ...trend.map((d) => d.used))

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BarChart3}
        eyebrow="리포트"
        title="통합 리포트"
        desc="크레딧·포인트 사용과 활동을 한눈에 확인합니다."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="보유 크레딧" value={(<Counter to={user?.credits ?? 0} />) as unknown as string} icon={Wallet} accent="#f59e0b" />
            <StatCard label="보유 포인트" value={(<Counter to={user?.points ?? 0} />) as unknown as string} icon={Coins} accent="#7c3aed" />
            <StatCard label="총 사용 크레딧" value={(<Counter to={stats.usedCredit} />) as unknown as string} icon={TrendingDown} accent="#ef4444" />
            <StatCard label="총 충전 크레딧" value={(<Counter to={stats.chargedCredit} />) as unknown as string} icon={TrendingUp} accent="#22c55e" />
          </div>
        </Reveal>

        <Reveal>
          <Panel title="최근 14일 크레딧 사용 추이">
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
          </Panel>
        </Reveal>

        <Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="최근 거래 내역">
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--bg-soft)]">
                    <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                      <th className="pb-2 font-medium">일시</th>
                      <th className="pb-2 font-medium">종류</th>
                      <th className="pb-2 text-right font-medium">증감</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.map((t, i) => (
                      <tr key={i} className="border-b border-[var(--border-soft)] last:border-0">
                        <td className="py-2.5 text-[var(--text-soft)]">{fmtDate(t.created_at)}</td>
                        <td className="py-2.5"><Badge className="border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)]">{KIND_LABEL[t.kind] || t.kind}</Badge></td>
                        <td className={`py-2.5 text-right font-semibold ${t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {tx.length === 0 && (
                      <tr><td colSpan={3} className="py-8 text-center text-[var(--text-dim)]">{ready ? '거래 내역이 없습니다.' : '불러오는 중…'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="최근 활동">
              <div className="max-h-[360px] space-y-1 overflow-auto">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-[var(--panel-2)]">
                    <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-[var(--panel-2)] text-[var(--text-dim)]">
                      <Activity size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{a.detail || a.type}</p>
                      <p className="text-xs text-[var(--text-dim)]">{fmtDate(a.created_at)}</p>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--text-dim)]">{ready ? '활동 기록이 없습니다.' : '불러오는 중…'}</p>
                )}
              </div>
            </Panel>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
