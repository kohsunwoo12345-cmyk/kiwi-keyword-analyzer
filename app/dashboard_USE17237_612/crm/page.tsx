'use client'

import { useState } from 'react'
import { Contact, Users, DollarSign, Repeat, Send, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { BarSeries } from '@/components/dash/Charts'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { crmStages, crmCustomers } from '@/lib/mock'
import { formatNumber } from '@/lib/utils'

const tagColor: Record<string, string> = {
  VIP: 'border-violet-500/30 bg-violet-500/12 text-violet-600',
  신규: 'border-sky-500/30 bg-sky-500/12 text-sky-600',
  재구매: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600',
  휴면: 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)]',
}

const ltv = [
  { name: 'VIP', 매출: 320 },
  { name: '재구매', 매출: 180 },
  { name: '신규', 매출: 64 },
  { name: '휴면', 매출: 22 },
]

const SEGMENTS = ['전체', 'VIP', '신규', '재구매', '휴면']
const CHANNELS = ['문자(SMS)', '카카오 알림톡', '이메일']

export default function CrmPage() {
  const [segment, setSegment] = useState('전체')
  const [channel, setChannel] = useState(CHANNELS[1])
  const [message, setMessage] = useState('[바이전시] 안녕하세요 고객님! 이번 주 한정 20% 할인 쿠폰을 보내드려요 🎁')
  const [sent, setSent] = useState('')

  const targetCount =
    segment === '전체'
      ? crmCustomers.length
      : crmCustomers.filter((c) => c.tag === segment).length

  function sendCampaign() {
    setSent(`${channel} 캠페인이 ${segment} 세그먼트 ${targetCount * 248}명에게 발송 예약되었습니다 ✓`)
    setTimeout(() => setSent(''), 3000)
  }

  const totalValue = crmCustomers.reduce((s, c) => s + c.value, 0)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Contact}
        eyebrow="05 · CRM"
        title="고객관리 CRM 마케팅"
        desc="수집한 DB를 파이프라인으로 관리하고 캠페인으로 전환시킵니다."
        accent="#f59e0b"
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 고객" value="8,940" delta={5.1} icon={Users} accent="#f59e0b" />
          <StatCard label="이번달 계약" value="98건" delta={12} icon={DollarSign} accent="#22c55e" />
          <StatCard label="재구매율" value="34.2%" delta={3.8} icon={Repeat} accent="#7c3aed" />
          <StatCard label="누적 매출" value={`₩${formatNumber(totalValue)}`} delta={9.4} icon={DollarSign} accent="#0ea5e9" />
        </div>

        {/* Pipeline */}
        <Panel title="세일즈 파이프라인">
          <div className="grid gap-3 sm:grid-cols-4">
            {crmStages.map((s, i) => (
              <div key={s.stage} className="card-2 relative overflow-hidden p-4">
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: s.color }}
                />
                <p className="text-sm text-[var(--text-soft)]">{s.stage}</p>
                <p className="mt-1 text-2xl font-bold">{formatNumber(s.count)}</p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">
                  {i < crmStages.length - 1
                    ? `전환율 ${Math.round((crmStages[i + 1].count / s.count) * 100)}%`
                    : '완료'}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Panel title="고객 목록">
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-3 py-2.5 font-medium">고객</th>
                    <th className="px-3 py-2.5 font-medium">태그</th>
                    <th className="px-3 py-2.5 font-medium">단계</th>
                    <th className="px-3 py-2.5 font-medium">누적금액</th>
                    <th className="px-3 py-2.5 font-medium">최근접촉</th>
                  </tr>
                </thead>
                <tbody>
                  {crmCustomers.map((c) => (
                    <tr key={c.email} className="border-b border-[var(--border-soft)] transition-colors hover:bg-[var(--panel-2)]">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-full brand-gradient text-xs font-bold text-white">
                            {c.name[0]}
                          </span>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-[var(--text-dim)]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={tagColor[c.tag]}>{c.tag}</Badge>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{c.stage}</td>
                      <td className="px-3 py-3 font-semibold">
                        {c.value ? `₩${formatNumber(c.value)}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{c.last}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Campaign composer */}
          <Panel title="캠페인 발송">
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">대상 세그먼트</label>
                <div className="flex flex-wrap gap-1.5">
                  {SEGMENTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSegment(s)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        segment === s
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-600'
                          : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">발송 채널</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                >
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">메시지 내용</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-[var(--text-soft)]">
                  <MessageSquare size={15} /> 예상 발송
                </span>
                <span className="font-semibold text-amber-600">{formatNumber(targetCount * 248)}명</span>
              </div>

              <Button onClick={sendCampaign} className="w-full !bg-gradient-to-br !from-amber-500 !to-orange-500">
                <Send size={16} /> 캠페인 발송
              </Button>

              {sent && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-3 py-2.5 text-sm font-medium text-emerald-600 animate-fade-in">
                  {sent}
                </div>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="세그먼트별 LTV (백만원)">
          <BarSeries data={ltv} dataKey="매출" color="#f59e0b" />
        </Panel>
      </div>
    </div>
  )
}
