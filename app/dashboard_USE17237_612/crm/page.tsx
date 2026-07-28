'use client'

import { useMemo, useState } from 'react'
import { Contact, Users, DollarSign, Repeat, Send, MessageSquare, Search, UserX, Check, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { crmStages, crmCustomers } from '@/lib/mock'
import { formatNumber, formatNumberFull, formatWon } from '@/lib/utils'

const ACCENT = '#f59e0b'

const tagColor: Record<string, string> = {
  VIP: 'border-violet-500/30 bg-violet-500/12 text-violet-400',
  신규: 'border-sky-500/30 bg-sky-500/12 text-sky-500',
  재구매: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-500',
  휴면: 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)]',
}

/** 세그먼트별 LTV (백만원) */
const LTV = [
  { name: 'VIP', value: 320, color: '#8b5cf6' },
  { name: '재구매', value: 180, color: '#10b981' },
  { name: '신규', value: 64, color: '#0ea5e9' },
  { name: '휴면', value: 22, color: '#94a3b8' },
]

const SEGMENTS = ['전체', 'VIP', '신규', '재구매', '휴면']
const CHANNELS = ['문자(SMS)', '카카오 알림톡', '이메일']
/** 세그먼트 1건이 실제 DB에서 대표하는 고객 수 (샘플 목록 → 실제 규모 환산) */
const SCALE = 248

/** 통신사 기준 바이트 수 — 한글 2바이트 */
function byteLength(s: string): number {
  let n = 0
  for (const ch of s) n += ch.charCodeAt(0) > 0x7f ? 2 : 1
  return n
}

export default function CrmPage() {
  const [segment, setSegment] = useState('전체')
  const [channel, setChannel] = useState(CHANNELS[1])
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('[바이전시] 안녕하세요 고객님! 이번 주 한정 20% 할인 쿠폰을 보내드려요 🎁')
  const [sent, setSent] = useState('')

  /** 세그먼트 + 검색어를 함께 적용 — 고른 대상이 표에서 바로 보인다 */
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return crmCustomers.filter((c) => {
      if (segment !== '전체' && c.tag !== segment) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.stage.includes(q)
    })
  }, [segment, query])

  const targetCount = useMemo(
    () => (segment === '전체' ? crmCustomers.length : crmCustomers.filter((c) => c.tag === segment).length),
    [segment],
  )
  const reach = targetCount * SCALE

  const bytes = byteLength(message)
  const isSms = channel === '문자(SMS)'
  const overSms = isSms && bytes > 90
  const canSend = reach > 0 && message.trim().length > 0

  function sendCampaign() {
    if (!canSend) return
    setSent(`${channel} 캠페인이 ${segment} 세그먼트 ${formatNumber(reach)}명에게 발송 예약되었습니다`)
    setTimeout(() => setSent(''), 3200)
  }

  const totalValue = crmCustomers.reduce((s, c) => s + c.value, 0)
  const maxLtv = Math.max(...LTV.map((l) => l.value))
  const topStage = crmStages[0].count

  const inputCls =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-amber-500'

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Contact}
        eyebrow="05 · CRM"
        title="고객관리 CRM 마케팅"
        desc="수집한 DB를 파이프라인으로 관리하고 캠페인으로 전환시킵니다."
        accent={ACCENT}
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="총 고객" icon={Users} accent="#f59e0b" value="8,940" sub="전월 대비 +5.1%" />
          <Metric label="이번달 계약" icon={DollarSign} accent="#22c55e" value="98건" sub="전월 대비 +12%" />
          <Metric label="재구매율" icon={Repeat} accent="#8b5cf6" value="34.2%" sub="전월 대비 +3.8%p" />
          <Metric label="누적 매출" icon={TrendingUp} accent="#0ea5e9" value={formatWon(totalValue)} sub="샘플 고객 기준 합계" />
        </div>

        {/* 파이프라인 — 단계 폭이 줄어드는 게 보이는 퍼널 */}
        <Card title="세일즈 파이프라인" desc={`리드 ${formatNumber(topStage)}명 → 계약 ${formatNumber(crmStages[crmStages.length - 1].count)}건`}>
          <div className="space-y-2.5">
            {crmStages.map((s, i) => {
              const width = Math.max(14, (s.count / topStage) * 100)
              const next = crmStages[i + 1]
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="w-10 flex-shrink-0 text-[12px] font-semibold text-[var(--text-soft)]">{s.stage}</span>
                  <div className="relative h-11 flex-1 overflow-hidden rounded-xl bg-[var(--panel-2)]">
                    <div
                      className="flex h-full items-center justify-between rounded-xl px-3.5 text-white"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${s.color}, ${s.color}bb)`,
                        animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both`,
                      }}
                    >
                      <span className="text-[15px] font-extrabold tabular-nums">{formatNumber(s.count)}</span>
                    </div>
                  </div>
                  <span className="w-[104px] flex-shrink-0 whitespace-nowrap text-right text-[11.5px] text-[var(--text-dim)]">
                    {next ? `다음 전환 ${Math.round((next.count / s.count) * 100)}%` : '전환 완료'}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Card
            title="고객 목록"
            desc={`${shown.length}명 표시 중${segment !== '전체' ? ` · ${segment}` : ''}`}
            bodyClassName="p-0"
            action={
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름·이메일 검색"
                  className="w-40 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] py-1.5 pl-8 pr-2.5 text-[12px] outline-none transition-colors focus:border-amber-500 sm:w-48"
                />
              </div>
            }
          >
            {shown.length === 0 ? (
              <EmptyState
                icon={UserX}
                title="조건에 맞는 고객이 없습니다"
                hint="검색어를 지우거나 다른 세그먼트를 선택해 보세요."
                action={
                  <button
                    onClick={() => { setQuery(''); setSegment('전체') }}
                    className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                  >
                    조건 초기화
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[11.5px] text-[var(--text-dim)]">
                      <th className="px-5 py-2.5 font-semibold">고객</th>
                      <th className="px-5 py-2.5 font-semibold">태그</th>
                      <th className="px-5 py-2.5 font-semibold">단계</th>
                      <th className="px-5 py-2.5 text-right font-semibold">누적금액</th>
                      <th className="px-5 py-2.5 text-right font-semibold">최근접촉</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((c) => (
                      <tr key={c.email} className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--panel-2)]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="brand-gradient grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-xs font-bold text-white">
                              {c.name[0]}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{c.name}</p>
                              <p className="truncate text-[11px] text-[var(--text-dim)]">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tagColor[c.tag]}`}>{c.tag}</span>
                        </td>
                        <td className="px-5 py-3 text-[var(--text-soft)]">{c.stage}</td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums">{c.value ? `₩${formatNumberFull(c.value)}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-[11.5px] text-[var(--text-dim)]">{c.last}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* 캠페인 발송 */}
          <Card title="캠페인 발송" desc="세그먼트를 고르면 목록도 함께 걸러집니다">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">대상 세그먼트</label>
                <div className="flex flex-wrap gap-1.5">
                  {SEGMENTS.map((s) => {
                    const n = s === '전체' ? crmCustomers.length : crmCustomers.filter((c) => c.tag === s).length
                    return (
                      <button
                        key={s}
                        onClick={() => setSegment(s)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          segment === s
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-500'
                            : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]'
                        }`}
                      >
                        {s} <span className="text-[10px] opacity-70">{n}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">발송 채널</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-end justify-between">
                  <label className="text-xs font-medium text-[var(--text-soft)]">메시지 내용</label>
                  {isSms && (
                    <span className="text-[11px] tabular-nums text-[var(--text-dim)]">
                      <span className={overSms ? 'font-bold text-rose-500' : ''}>{bytes}</span>/90 byte
                    </span>
                  )}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className={`${inputCls} resize-none leading-relaxed`}
                />
                {overSms && (
                  <p className="mt-1.5 text-[11px] font-medium text-rose-500">
                    90byte를 넘어 LMS로 발송됩니다. 건당 요금이 올라갑니다.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-[var(--text-soft)]">
                  <MessageSquare size={15} /> 예상 발송
                </span>
                <span className="font-bold tabular-nums text-amber-500">{formatNumber(reach)}명</span>
              </div>

              <Button onClick={sendCampaign} disabled={!canSend} className="w-full justify-center !bg-gradient-to-br !from-amber-500 !to-orange-500">
                <Send size={16} /> 캠페인 발송
              </Button>

              {sent && (
                <div className="animate-fade-in flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-3.5 py-2.5 text-[13px] font-medium text-emerald-500">
                  <Check size={15} className="mt-0.5 flex-shrink-0" /> {sent}
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card title="세그먼트별 LTV" desc="고객 1인당 생애 매출 (단위: 백만원)">
          <div className="space-y-3">
            {LTV.map((l, i) => (
              <div key={l.name} className="flex items-center gap-3">
                <span className="w-14 flex-shrink-0 text-[12.5px] font-semibold text-[var(--text-soft)]">{l.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(l.value / maxLtv) * 100}%`,
                      background: `linear-gradient(90deg, ${l.color}, ${l.color}99)`,
                      animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both`,
                    }}
                  />
                </div>
                <span className="w-[72px] flex-shrink-0 whitespace-nowrap text-right text-[13px] font-bold tabular-nums">{l.value}백만</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
