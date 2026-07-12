'use client'

import { useState } from 'react'
import { Calendar, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'

interface CalEvent {
  id: string
  day: number // 1~31
  title: string
  color: ColorKey
}

type ColorKey = 'violet' | 'sky' | 'emerald' | 'amber' | 'rose'

const COLORS: Record<ColorKey, { label: string; dot: string; pill: string }> = {
  violet: { label: '기획', dot: 'bg-violet-500', pill: 'border-violet-200 bg-violet-50 text-violet-700' },
  sky: { label: '광고', dot: 'bg-sky-500', pill: 'border-sky-200 bg-sky-50 text-sky-700' },
  emerald: { label: '콘텐츠', dot: 'bg-emerald-500', pill: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  amber: { label: '마감', dot: 'bg-amber-500', pill: 'border-amber-200 bg-amber-50 text-amber-700' },
  rose: { label: '회의', dot: 'bg-rose-500', pill: 'border-rose-200 bg-rose-50 text-rose-700' },
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const TODAY = 12
const FIRST_OFFSET = 3 // 2026년 7월 1일 = 수요일 (일=0 기준 3칸 비움)
const DAYS_IN_MONTH = 31

const SEED: CalEvent[] = [
  { id: 'e1', day: 3, title: '월간 마케팅 전략 회의', color: 'rose' },
  { id: 'e2', day: 14, title: '여름 세일 캠페인 시작', color: 'sky' },
  { id: 'e3', day: 18, title: '블로그 콘텐츠 마감', color: 'amber' },
  { id: 'e4', day: 22, title: '유튜브 숏폼 3편 업로드', color: 'emerald' },
  { id: 'e5', day: 28, title: '8월 광고 예산 기획', color: 'violet' },
]

export default function TeamCalendarPage() {
  const [events, setEvents] = useLocalStorage<CalEvent[]>('bivience_events', SEED)
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(15)
  const [color, setColor] = useState<ColorKey>('sky')

  const cells: (number | null)[] = [
    ...Array.from({ length: FIRST_OFFSET }, () => null),
    ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function eventsOn(d: number) {
    return events.filter((e) => e.day === d)
  }

  function addEvent() {
    if (!title.trim()) return
    setEvents((prev) => [
      ...prev,
      { id: 'n' + Math.random().toString(36).slice(2, 7), day, title: title.trim(), color },
    ])
    setTitle('')
  }

  const upcoming = [...events].sort((a, b) => a.day - b.day).filter((e) => e.day >= TODAY)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Calendar}
        eyebrow="팀 협업"
        title="캘린더"
        desc="팀의 캠페인 일정과 마감을 한눈에 관리하세요."
        accent="#0ea5e9"
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
        {/* Calendar grid */}
        <Panel
          title="2026년 7월"
          action={
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(COLORS) as ColorKey[]).map((k) => (
                <span
                  key={k}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${COLORS[k].pill}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${COLORS[k].dot}`} /> {COLORS[k].label}
                </span>
              ))}
            </div>
          }
        >
          <div className="grid grid-cols-7 border-b border-[var(--border-soft)] pb-2">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`text-center text-xs font-semibold ${
                  i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-[var(--text-dim)]'
                }`}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => (
              <div
                key={i}
                className={`min-h-[92px] border-b border-r border-[var(--border-soft)] p-1.5 ${
                  i % 7 === 0 ? 'border-l' : ''
                } ${i < 7 ? 'border-t' : ''}`}
              >
                {d && (
                  <>
                    <div
                      className={`mb-1 inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        d === TODAY
                          ? 'bg-sky-500 text-white'
                          : i % 7 === 0
                          ? 'text-rose-500'
                          : i % 7 === 6
                          ? 'text-sky-500'
                          : 'text-[var(--text-soft)]'
                      }`}
                    >
                      {d}
                    </div>
                    <div className="space-y-1">
                      {eventsOn(d).map((e) => (
                        <div
                          key={e.id}
                          className={`truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${COLORS[e.color].pill}`}
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* Side panel */}
        <div className="space-y-6">
          <Panel title="다가오는 일정">
            {upcoming.length === 0 ? (
              <p className="text-sm text-[var(--text-dim)]">예정된 일정이 없습니다.</p>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((e) => (
                  <div key={e.id} className="card-2 flex items-center gap-3 p-3">
                    <div className="flex flex-col items-center">
                      <span className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white ${COLORS[e.color].dot}`}>
                        {e.day}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <span className="text-xs text-[var(--text-dim)]">7월 {e.day}일</span>
                    </div>
                    <Badge className={COLORS[e.color].pill}>{COLORS[e.color].label}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="새 일정">
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                placeholder="일정 제목"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-dim)]">날짜</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                  >
                    {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        7월 {d}일
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-dim)]">분류</label>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value as ColorKey)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                  >
                    {(Object.keys(COLORS) as ColorKey[]).map((k) => (
                      <option key={k} value={k}>
                        {COLORS[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button onClick={addEvent} className="w-full !bg-gradient-to-br !from-sky-500 !to-blue-500">
                <Plus size={16} /> 일정 추가
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
