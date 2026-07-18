'use client'

import { useEffect, useState } from 'react'
import { Banknote, TrendingUp, Coins, Wallet, RefreshCw, CreditCard, Crown, Users, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminRevenue, type RevenueResp } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

const DAY_OPTIONS = [7, 30, 90, 365] as const
const krw = (n: number) => '₩' + Math.round(n || 0).toLocaleString('ko-KR')
const num = (n: number) => (n || 0).toLocaleString('ko-KR')

export default function AdminRevenuePage() {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<RevenueResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminRevenue(days).then((d) => { setData(d); setLoading(false) })
  }, [days])

  const t = data?.totals
  const b = data?.breakdown
  const ai = data?.aiInternal
  const usage = data?.usage

  return (
    <div>
      <PageHeader
        icon={Banknote}
        title="매출"
        description="실입금 매출(크레딧 판매·플랜·팀 결제)과 순수익(매출 − AI 원가)을 구분해 봅니다. 포인트·문자·AI 크레딧 소비는 내부 소비(매출 중복 아님)로 별도 표시."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
          {DAY_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', days === d ? 'bg-emerald-600 text-white' : 'text-[var(--text-soft)] hover:text-[var(--text)]')}>
              {d === 365 ? '1년' : `${d}일`}
            </button>
          ))}
        </div>
        <Button variant="soft" size="sm" onClick={() => setDays((x) => x)} disabled={loading}>
          <RefreshCw size={14} /> 새로고침
        </Button>
        <span className="ml-auto text-xs text-[var(--text-dim)]">최근 {days === 365 ? '1년' : `${days}일`} 기준</span>
      </div>

      {/* 요약: 매출 vs 순수익 */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Banknote} label="총 매출 (실입금)" value={krw(t?.revenue || 0)} accent="#10b981" />
        <StatCard icon={Wallet} label="AI 원가" value={krw(t?.cost || 0)} accent="#f43f5e" />
        <StatCard icon={TrendingUp} label="순수익 (매출 − 원가)" value={krw(t?.profit || 0)} accent="#7c3aed" />
        <StatCard icon={Coins} label="이익률" value={`${t?.margin ?? 0}%`} accent="#f59e0b" />
      </div>

      {/* 매출 구성 */}
      <Reveal>
        <Panel title={<span className="flex items-center gap-2"><CreditCard size={16} className="text-emerald-500" /> 매출 구성 (실입금)</span>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BreakCard icon={CreditCard} color="#0ea5e9" label="크레딧 (카드)" krwv={b?.creditCard.krw || 0} count={b?.creditCard.count || 0} />
            <BreakCard icon={Coins} color="#f59e0b" label="크레딧 (승인)" krwv={b?.creditApproval.krw || 0} count={b?.creditApproval.count || 0} />
            <BreakCard icon={Crown} color="#8b5cf6" label="플랜 결제" krwv={b?.plan.krw || 0} count={b?.plan.count || 0} />
            <BreakCard icon={Users} color="#ec4899" label="팀 요금제" krwv={b?.team.krw || 0} count={b?.team.count || 0} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--border-soft)] pt-3 text-sm">
            <span className="text-[var(--text-soft)]">크레딧 판매 합계 <b className="text-[var(--text)]">{krw(b?.creditSales || 0)}</b></span>
            <span className="text-[var(--text-soft)]">플랜·팀 합계 <b className="text-[var(--text)]">{krw(b?.planTotal || 0)}</b></span>
          </div>
        </Panel>
      </Reveal>

      {/* 내부 소비 (매출 중복 아님) */}
      <div className="mt-5">
        <Reveal>
          <Panel title={<span className="flex items-center gap-2"><MessageSquare size={16} className="text-slate-400" /> 내부 소비 · 원가 (매출 중복 아님)</span>}>
            <p className="mb-3 text-xs text-[var(--text-dim)]">AI 생성·문자 발송은 <b>이미 구매한 크레딧을 소비</b>하는 것이라 실입금 매출에 다시 더하지 않습니다. 아래는 참고용 소비·원가 지표입니다.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <BreakCard icon={Coins} color="#64748b" label="소비된 크레딧" krwv={0} count={usage?.creditSpent || 0} unit="크레딧" hideKrw />
              <BreakCard icon={Wallet} color="#f43f5e" label="AI 실제 원가" krwv={ai?.cost || 0} count={ai?.count || 0} unit="건" />
              <BreakCard icon={TrendingUp} color="#7c3aed" label="AI 내부 마진" krwv={ai?.profit || 0} count={ai?.credits || 0} unit="크레딧" />
              <BreakCard icon={MessageSquare} color="#6366f1" label="문자 발송" krwv={0} count={usage?.smsCount || 0} unit="건" hideKrw />
            </div>
          </Panel>
        </Reveal>
      </div>

      {/* 일별 매출 (KST) */}
      <div className="mt-5">
        <Reveal>
          <Panel title="일별 매출 (KST)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-3 py-2.5 font-medium">날짜</th>
                    <th className="px-3 py-2.5 text-right font-medium">크레딧 판매</th>
                    <th className="px-3 py-2.5 text-right font-medium">플랜·팀</th>
                    <th className="px-3 py-2.5 text-right font-medium">매출 합계</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byDay || []).map((r) => (
                    <tr key={r.d} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium">{r.d}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--text-soft)]">{krw(r.credit)}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--text-soft)]">{krw(r.plan)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{krw(r.revenue)}</td>
                    </tr>
                  ))}
                  {(!data?.byDay || data.byDay.length === 0) && (
                    <tr><td colSpan={4} className="py-10 text-center text-[var(--text-dim)]">{loading ? '불러오는 중…' : '매출 내역이 없습니다.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      </div>

      {/* 최근 결제 내역 */}
      <div className="mt-5">
        <Reveal>
          <Panel title="최근 결제 내역">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-3 py-2.5 font-medium">일시 (KST)</th>
                    <th className="px-3 py-2.5 font-medium">구분</th>
                    <th className="px-3 py-2.5 font-medium">회원</th>
                    <th className="px-3 py-2.5 font-medium">상세</th>
                    <th className="px-3 py-2.5 text-right font-medium">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent || []).map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-soft)]">{kstDateTime(r.at)}</td>
                      <td className="px-3 py-2.5"><span className="rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2 py-0.5 text-xs font-medium">{r.type}</span></td>
                      <td className="px-3 py-2.5"><div className="font-medium">{r.name || '-'}</div><div className="text-xs text-[var(--text-dim)]">{r.email}</div></td>
                      <td className="px-3 py-2.5 text-[var(--text-soft)]">{r.detail}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-emerald-600">{krw(r.amount)}</td>
                    </tr>
                  ))}
                  {(!data?.recent || data.recent.length === 0) && (
                    <tr><td colSpan={5} className="py-10 text-center text-[var(--text-dim)]">{loading ? '불러오는 중…' : '결제 내역이 없습니다.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}

function BreakCard({ icon: Icon, color, label, krwv, count, unit = '건', hideKrw }: { icon: any; color: string; label: string; krwv: number; count: number; unit?: string; hideKrw?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-soft)]">
        <Icon size={15} style={{ color }} /> {label}
      </div>
      {!hideKrw && <div className="mt-1.5 text-xl font-bold tracking-tight">{krw(krwv)}</div>}
      <div className={cn('text-xs text-[var(--text-dim)]', hideKrw ? 'mt-1.5 text-xl font-bold tracking-tight text-[var(--text)]' : 'mt-0.5')}>
        {hideKrw ? `${num(count)} ${unit}` : `${num(count)} ${unit}`}
      </div>
    </div>
  )
}
