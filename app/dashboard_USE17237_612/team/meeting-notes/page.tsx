'use client'

import { useState } from 'react'
import { ClipboardList, Plus, Check, Users } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'

interface ActionItem {
  id: string
  text: string
  done: boolean
}

interface Meeting {
  id: string
  title: string
  date: string
  attendees: string[]
  agenda: string[]
  decisions: string[]
  actions: ActionItem[]
}

const SEED: Meeting[] = [
  {
    id: 'm1',
    title: '7월 주간 마케팅 회의',
    date: '2026-07-10 15:00',
    attendees: ['김지훈', '이수민', '박현우', '최민지'],
    agenda: ['여름 세일 캠페인 진행 현황 공유', '블로그 상위노출 키워드 전략', '유튜브 숏폼 발행 일정'],
    decisions: ['여름 세일 캠페인 예산 30% 증액 확정', '블로그는 주 3회 발행으로 확대'],
    actions: [
      { id: 'a1', text: '캠페인 소재 3종 제작 (지훈)', done: true },
      { id: 'a2', text: '롱테일 키워드 20개 리서치 (수민)', done: false },
      { id: 'a3', text: '숏폼 스크립트 5편 작성 (현우)', done: false },
    ],
  },
  {
    id: 'm2',
    title: '신규 브랜드 런칭 킥오프',
    date: '2026-07-06 11:00',
    attendees: ['김지훈', '최민지', '정예린'],
    agenda: ['브랜드 아이덴티티 방향성', '런칭 채널 우선순위', '초기 광고 예산 배분'],
    decisions: ['인스타그램 + 네이버 중심으로 런칭', '로고 A안 최종 채택'],
    actions: [
      { id: 'a4', text: '브랜드 가이드라인 정리 (민지)', done: true },
      { id: 'a5', text: '런칭 광고 소재 기획안 (예린)', done: false },
    ],
  },
  {
    id: 'm3',
    title: '6월 성과 리뷰 회의',
    date: '2026-07-01 14:00',
    attendees: ['김지훈', '이수민', '정예린'],
    agenda: ['6월 ROAS 및 전환율 분석', '채널별 성과 비교', '개선 액션 도출'],
    decisions: ['리타겟팅 캠페인 예산 유지', 'ROAS 낮은 신규가입 캠페인 소재 교체'],
    actions: [
      { id: 'a6', text: '6월 성과 리포트 배포 (수민)', done: true },
      { id: 'a7', text: '신규가입 캠페인 소재 교체 (예린)', done: true },
    ],
  },
]

export default function MeetingNotesPage() {
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>('bivience_meetings', SEED)
  const [selectedId, setSelectedId] = useState<string | null>(SEED[0].id)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', attendees: '', content: '' })

  const selected = meetings.find((m) => m.id === selectedId) || null

  function toggleAction(mId: string, aId: string) {
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === mId
          ? { ...m, actions: m.actions.map((a) => (a.id === aId ? { ...a, done: !a.done } : a)) }
          : m,
      ),
    )
  }

  function createMeeting() {
    if (!form.title.trim()) return
    const id = 'n' + Math.random().toString(36).slice(2, 7)
    const attendees = form.attendees
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const agenda = form.content
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const meeting: Meeting = {
      id,
      title: form.title.trim(),
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      attendees: attendees.length ? attendees : ['나'],
      agenda: agenda.length ? agenda : ['(안건 미작성)'],
      decisions: [],
      actions: [],
    }
    setMeetings((prev) => [meeting, ...prev])
    setSelectedId(id)
    setForm({ title: '', attendees: '', content: '' })
    setCreating(false)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ClipboardList}
        eyebrow="팀 협업"
        title="회의록"
        desc="회의 안건과 결정사항, 액션 아이템을 기록하고 추적하세요."
        accent="#0ea5e9"
        action={
          <Button onClick={() => setCreating(true)} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
            <Plus size={16} /> 새 회의록
          </Button>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[320px_1fr] lg:p-8">
        {/* List */}
        <div className="space-y-2.5">
          {meetings.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedId(m.id)
                setCreating(false)
              }}
              className={`card w-full p-4 text-left transition-all ${
                selectedId === m.id && !creating ? 'ring-2 ring-sky-400' : 'hover:border-sky-500/40'
              }`}
            >
              <p className="font-semibold leading-snug">{m.title}</p>
              <p className="mt-1 text-xs text-[var(--text-dim)]">{m.date}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
                <Users size={13} /> 참석 {m.attendees.length}명
                <span className="ml-auto text-[var(--text-dim)]">
                  액션 {m.actions.filter((a) => a.done).length}/{m.actions.length}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail or create form */}
        {creating ? (
          <Panel title="새 회의록 작성">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">제목</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 8월 마케팅 전략 회의"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">참석자 (쉼표로 구분)</label>
                <input
                  value={form.attendees}
                  onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                  placeholder="김지훈, 이수민, 박현우"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">안건 (줄바꿈으로 구분)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  placeholder={'캠페인 성과 리뷰\n다음 분기 목표 설정'}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createMeeting} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
                  저장
                </Button>
                <Button variant="outline" onClick={() => setCreating(false)}>
                  취소
                </Button>
              </div>
            </div>
          </Panel>
        ) : selected ? (
          <Panel>
            <div className="border-b border-[var(--border-soft)] pb-4">
              <h2 className="text-xl font-bold tracking-tight">{selected.title}</h2>
              <p className="mt-1 text-sm text-[var(--text-dim)]">{selected.date}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.attendees.map((a) => (
                  <Badge key={a} className="border-sky-500/30 bg-sky-500/12 text-sky-600">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-6">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-soft)]">안건</h3>
                <ul className="space-y-1.5">
                  {selected.agenda.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="font-semibold text-sky-500">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {selected.decisions.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--text-soft)]">결정사항</h3>
                  <ul className="space-y-1.5">
                    {selected.decisions.map((d, i) => (
                      <li key={i} className="flex gap-2 rounded-lg bg-emerald-500/12 px-3 py-2 text-sm text-emerald-600">
                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-soft)]">
                  액션 아이템 · {selected.actions.filter((a) => a.done).length}/{selected.actions.length} 완료
                </h3>
                {selected.actions.length === 0 ? (
                  <p className="text-sm text-[var(--text-dim)]">등록된 액션 아이템이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.actions.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => toggleAction(selected.id, a.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-[var(--border-soft)] px-3 py-2.5 text-left text-sm hover:bg-[var(--panel-2)]"
                      >
                        <span
                          className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border transition-colors ${
                            a.done
                              ? 'border-sky-500 bg-sky-500 text-white'
                              : 'border-[var(--border)] bg-white'
                          }`}
                        >
                          {a.done && <Check size={13} />}
                        </span>
                        <span className={a.done ? 'text-[var(--text-dim)] line-through' : ''}>{a.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </Panel>
        ) : (
          <Panel>
            <p className="py-12 text-center text-sm text-[var(--text-dim)]">회의록을 선택하세요.</p>
          </Panel>
        )}
      </div>
    </div>
  )
}
