'use client'

import { useState } from 'react'
import { Send, MessageSquare, Clock, Users, Check, Smartphone } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { formatNumber } from '@/lib/utils'

const ACCENT = '#6366f1'

const SENDERS = ['1544-1234 (대표번호)', '02-555-7788 (강남점)', '070-8888-1212 (마케팅)']

const GROUPS = [
  { name: 'VIP고객', count: 1240 },
  { name: '신규가입', count: 3820 },
  { name: '재구매', count: 2160 },
  { name: '휴면', count: 5480 },
]

const ADDRESS_BOOK = [
  { name: 'VIP고객', count: 1240, last: '2026-07-08' },
  { name: '신규가입', count: 3820, last: '2026-07-10' },
  { name: '재구매', count: 2160, last: '2026-07-05' },
  { name: '휴면고객', count: 5480, last: '2026-06-28' },
  { name: '이벤트참여', count: 940, last: '2026-07-11' },
]

/** 한글 등 2바이트, ASCII 1바이트로 계산 */
function byteLength(str: string): number {
  let bytes = 0
  for (const ch of str) {
    bytes += ch.charCodeAt(0) > 0x7f ? 2 : 1
  }
  return bytes
}

export default function SmsSendPage() {
  const [sender, setSender] = useState(SENDERS[0])
  const [mode, setMode] = useState<'direct' | 'group'>('group')
  const [directNumbers, setDirectNumbers] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['VIP고객'])
  const [message, setMessage] = useState(
    '[바이전시] 안녕하세요 고객님! 이번 주 한정 20% 할인 쿠폰을 보내드려요. 매장 방문 시 제시해주세요.',
  )
  const [schedule, setSchedule] = useState<'now' | 'reserve'>('now')
  const [reserveAt, setReserveAt] = useState('')
  const [toast, setToast] = useState('')

  const bytes = byteLength(message)
  const isLms = bytes > 90

  const targetCount =
    mode === 'direct'
      ? directNumbers.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length
      : GROUPS.filter((g) => selectedGroups.includes(g.name)).reduce((s, g) => s + g.count, 0)

  function toggleGroup(name: string) {
    setSelectedGroups((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }

  function send() {
    const when = schedule === 'reserve' && reserveAt ? '예약' : '즉시'
    setToast(`${formatNumber(targetCount)}건 발송 ${when === '예약' ? '예약되었습니다' : '되었습니다'}`)
    setTimeout(() => setToast(''), 3200)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Send}
        eyebrow="문자 (SMS)"
        title="문자 발송"
        desc="발신번호와 대상을 선택해 SMS/LMS 문자를 즉시 또는 예약 발송합니다."
        accent={ACCENT}
        action={
          <Button onClick={send} className="!bg-gradient-to-br !from-indigo-500 !to-violet-500">
            <Send size={16} /> 발송하기
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="잔여 발송 건수" value="12,480" icon={MessageSquare} accent={ACCENT} />
          <StatCard label="이번달 발송" value="3,240" delta={12} icon={Send} accent="#22c55e" />
          <StatCard label="평균 도달률" value="98.2%" delta={0.4} icon={Check} accent="#0ea5e9" />
          <StatCard label="등록 발신번호" value="3개" icon={Users} accent="#f59e0b" />
        </div>

        {toast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-sm text-emerald-700 animate-fade-in">
            {toast}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Composer */}
          <Panel title="메시지 작성 및 발송">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">발신번호</label>
                <select
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                >
                  {SENDERS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">수신 대상</label>
                <div className="mb-2 flex gap-1.5">
                  {(['group', 'direct'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        mode === m
                          ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                          : 'border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)]'
                      }`}
                    >
                      {m === 'group' ? '그룹 선택' : '직접 입력'}
                    </button>
                  ))}
                </div>
                {mode === 'group' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {GROUPS.map((g) => (
                      <button
                        key={g.name}
                        onClick={() => toggleGroup(g.name)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedGroups.includes(g.name)
                            ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                            : 'border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)]'
                        }`}
                      >
                        {g.name} <span className="text-[var(--text-dim)]">({formatNumber(g.count)})</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={directNumbers}
                    onChange={(e) => setDirectNumbers(e.target.value)}
                    rows={3}
                    placeholder="010-1234-5678, 010-2222-3333 (쉼표 또는 줄바꿈으로 구분)"
                    className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                  />
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--text-soft)]">메시지 내용</label>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-dim)]">{bytes}바이트</span>
                    <Badge
                      className={
                        isLms
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      }
                    >
                      {isLms ? 'LMS' : 'SMS'}
                    </Badge>
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
                <p className="mt-1 text-xs text-[var(--text-dim)]">
                  90바이트 이하는 SMS, 초과 시 LMS로 발송됩니다.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">발송 시점</label>
                <div className="flex gap-1.5">
                  {(['now', 'reserve'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSchedule(s)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        schedule === s
                          ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                          : 'border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text)]'
                      }`}
                    >
                      {s === 'now' ? <Send size={13} /> : <Clock size={13} />}
                      {s === 'now' ? '즉시발송' : '예약발송'}
                    </button>
                  ))}
                </div>
                {schedule === 'reserve' && (
                  <input
                    type="datetime-local"
                    value={reserveAt}
                    onChange={(e) => setReserveAt(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-[var(--text-soft)]">
                  <Users size={15} /> 예상 발송 건수
                </span>
                <span className="font-semibold text-indigo-600">{formatNumber(targetCount)}건</span>
              </div>

              <Button
                onClick={send}
                disabled={targetCount === 0 || !message.trim()}
                className="w-full !bg-gradient-to-br !from-indigo-500 !to-violet-500"
              >
                <Send size={16} /> {schedule === 'reserve' ? '예약 발송' : '즉시 발송'}
              </Button>
            </div>
          </Panel>

          {/* Address book */}
          <Panel title="주소록 그룹">
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-3 py-2.5 font-medium">그룹명</th>
                    <th className="px-3 py-2.5 font-medium">인원수</th>
                    <th className="px-3 py-2.5 font-medium">최근발송</th>
                  </tr>
                </thead>
                <tbody>
                  {ADDRESS_BOOK.map((g) => (
                    <tr key={g.name} className="border-b border-[var(--border-soft)] hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium">{g.name}</td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{formatNumber(g.count)}명</td>
                      <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{g.last}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Preview */}
        <Panel title="발송 미리보기">
          <div className="flex justify-center py-4">
            <div className="w-full max-w-[320px] rounded-[2.2rem] border border-[var(--border)] bg-slate-50 p-3 shadow-sm">
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-300" />
              <div className="rounded-2xl bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                    <Smartphone size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">{sender.split(' ')[0]}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">
                      {isLms ? 'LMS' : 'SMS'} · 방금 전
                    </p>
                  </div>
                </div>
                <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-indigo-50 px-3.5 py-2.5 text-sm text-[var(--text)]">
                  {message || '메시지를 입력하면 이곳에 실시간으로 표시됩니다.'}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
