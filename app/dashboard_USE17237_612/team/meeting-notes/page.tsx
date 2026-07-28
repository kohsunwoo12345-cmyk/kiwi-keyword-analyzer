'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Plus, Check, Users, Trash2, X, ListChecks, CalendarDays, CircleDot } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Field, Metric, Section } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { useAuth } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'
import { isImeEnter } from '@/lib/utils'

const ACCENT = '#0ea5e9'

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

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-sky-500'

export default function MeetingNotesPage() {
  const [meetings, setMeetings, ready] = useLocalStorage<Meeting[]>('bivience_meetings', SEED)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', attendees: '', content: '' })
  const [newDecision, setNewDecision] = useState('')
  const [newAction, setNewAction] = useState('')
  const { user } = useAuth()

  // 저장된 목록이 바뀌어도 선택이 유효하게 유지된다
  // (예전에는 시드 첫 항목 id로 고정돼 있어, 그 회의록을 지우면 아무것도 안 보였다)
  useEffect(() => {
    if (!ready) return
    if (meetings.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!selectedId || !meetings.some((m) => m.id === selectedId)) setSelectedId(meetings[0].id)
  }, [ready, meetings, selectedId])

  const selected = meetings.find((m) => m.id === selectedId) || null

  const stats = useMemo(() => {
    const actions = meetings.flatMap((m) => m.actions)
    const done = actions.filter((a) => a.done).length
    return {
      meetings: meetings.length,
      actions: actions.length,
      done,
      open: actions.length - done,
      decisions: meetings.reduce((s, m) => s + m.decisions.length, 0),
    }
  }, [meetings])

  function patch(id: string, fn: (m: Meeting) => Meeting) {
    setMeetings((prev) => prev.map((m) => (m.id === id ? fn(m) : m)))
  }

  function toggleAction(mId: string, aId: string) {
    patch(mId, (m) => ({ ...m, actions: m.actions.map((a) => (a.id === aId ? { ...a, done: !a.done } : a)) }))
  }

  function addAction(mId: string) {
    const text = newAction.trim()
    if (!text) return
    patch(mId, (m) => ({ ...m, actions: [...m.actions, { id: `a${Date.now()}`, text, done: false }] }))
    setNewAction('')
  }

  function removeAction(mId: string, aId: string) {
    patch(mId, (m) => ({ ...m, actions: m.actions.filter((a) => a.id !== aId) }))
  }

  function addDecision(mId: string) {
    const text = newDecision.trim()
    if (!text) return
    patch(mId, (m) => ({ ...m, decisions: [...m.decisions, text] }))
    setNewDecision('')
  }

  function removeDecision(mId: string, idx: number) {
    patch(mId, (m) => ({ ...m, decisions: m.decisions.filter((_, i) => i !== idx) }))
  }

  function removeMeeting(id: string) {
    if (!window.confirm('이 회의록을 삭제할까요? 되돌릴 수 없습니다.')) return
    setMeetings((prev) => prev.filter((m) => m.id !== id))
  }

  function createMeeting() {
    if (!form.title.trim()) return
    const id = `n${Date.now()}`
    const attendees = form.attendees.split(',').map((s) => s.trim()).filter(Boolean)
    const agenda = form.content.split('\n').map((s) => s.trim()).filter(Boolean)
    const meeting: Meeting = {
      id,
      title: form.title.trim(),
      date: kstDateTime(new Date().toISOString()), // 다른 화면과 같은 한국시간 기준
      attendees: attendees.length ? attendees : [user?.name || '나'],
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
        desc="회의 안건과 결정사항, 액션 아이템을 기록하고 추적하세요. (이 브라우저에 저장됩니다)"
        accent={ACCENT}
        action={
          <Button onClick={() => setCreating(true)} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
            <Plus size={16} /> 새 회의록
          </Button>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="회의록" icon={ClipboardList} accent="#0ea5e9" value={ready ? `${stats.meetings}건` : '—'} sub="기록된 전체 회의" />
          <Metric label="결정사항" icon={Check} accent="#22c55e" value={ready ? `${stats.decisions}건` : '—'} sub="회의에서 확정된 항목" />
          <Metric label="미완료 액션" icon={CircleDot} accent="#f59e0b" value={ready ? `${stats.open}건` : '—'} sub={stats.actions ? `전체 ${stats.actions}건 중` : '등록된 액션 없음'} />
          <Metric
            label="액션 완료율"
            icon={ListChecks}
            accent="#8b5cf6"
            value={ready ? `${stats.actions ? Math.round((stats.done / stats.actions) * 100) : 0}%` : '—'}
            sub={
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                <span
                  className="block h-full rounded-full bg-violet-500 transition-all duration-700"
                  style={{ width: `${stats.actions ? (stats.done / stats.actions) * 100 : 0}%` }}
                />
              </span>
            }
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          {/* 목록 */}
          <Card title="회의 목록" desc={`${meetings.length}건`} bodyClassName="p-3" className="self-start">
            {meetings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="회의록이 없습니다"
                hint="“새 회의록”을 눌러 첫 회의를 기록해 보세요."
                action={
                  <button
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                  >
                    <Plus size={14} /> 새 회의록
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {meetings.map((m) => {
                  const on = selectedId === m.id && !creating
                  const done = m.actions.filter((a) => a.done).length
                  return (
                    <div
                      key={m.id}
                      className={`group relative rounded-xl border p-3.5 transition-colors ${
                        on ? 'border-sky-500/50 bg-sky-500/[0.07]' : 'border-[var(--border)] hover:bg-[var(--panel-2)]'
                      }`}
                    >
                      <button
                        onClick={() => { setSelectedId(m.id); setCreating(false) }}
                        className="block w-full text-left"
                      >
                        <p className="pr-6 text-[13.5px] font-semibold leading-snug">{m.title}</p>
                        <p className="mt-1 text-[11px] tabular-nums text-[var(--text-dim)]">{m.date}</p>
                        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--text-soft)]">
                          <Users size={12} /> 참석 {m.attendees.length}명
                          <span className="ml-auto text-[var(--text-dim)]">
                            액션 {done}/{m.actions.length}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => removeMeeting(m.id)}
                        className="absolute right-2 top-2 rounded-lg p-1 text-[var(--text-dim)] opacity-0 transition hover:bg-rose-500/12 hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
                        aria-label="회의록 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* 상세 / 작성 */}
          {creating ? (
            <Card title="새 회의록 작성" desc="제목만 있어도 저장됩니다" className="self-start">
              <div className="space-y-4">
                <Field label="제목">
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="예: 8월 마케팅 전략 회의"
                    className={inputCls}
                    autoFocus
                  />
                </Field>
                <Field label="참석자" optional hint="쉼표로 구분합니다. 비우면 본인만 참석자로 기록됩니다.">
                  <input
                    value={form.attendees}
                    onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                    placeholder="김지훈, 이수민, 박현우"
                    className={inputCls}
                  />
                </Field>
                <Field label="안건" optional hint="줄바꿈으로 구분합니다. 결정사항과 액션은 저장한 뒤 상세에서 추가할 수 있습니다.">
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={5}
                    placeholder={'캠페인 성과 리뷰\n다음 분기 목표 설정'}
                    className={`${inputCls} resize-none leading-relaxed`}
                  />
                </Field>
                <div className="flex gap-2 border-t border-[var(--border-soft)] pt-4">
                  <Button onClick={createMeeting} disabled={!form.title.trim()} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
                    저장
                  </Button>
                  <Button variant="outline" onClick={() => setCreating(false)}>
                    취소
                  </Button>
                </div>
              </div>
            </Card>
          ) : selected ? (
            <Card
              title={selected.title}
              desc={`${selected.date} · 참석 ${selected.attendees.length}명`}
              className="self-start"
              action={
                <button
                  onClick={() => removeMeeting(selected.id)}
                  className="rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-rose-500/12 hover:text-rose-500"
                  aria-label="회의록 삭제"
                  title="회의록 삭제"
                >
                  <Trash2 size={15} />
                </button>
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {selected.attendees.map((a) => (
                  <span key={a} className="rounded-full border border-sky-500/30 bg-sky-500/12 px-2.5 py-0.5 text-[11.5px] font-semibold text-sky-500">
                    {a}
                  </span>
                ))}
              </div>

              <div className="mt-5">
                <Section label="안건" first>
                  <ul className="space-y-1.5">
                    {selected.agenda.map((a, i) => (
                      <li key={i} className="flex gap-2 text-[13.5px]">
                        <span className="font-bold text-sky-500">{i + 1}.</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section label={`결정사항 ${selected.decisions.length}건`}>
                  {selected.decisions.length > 0 && (
                    <ul className="mb-2 space-y-1.5">
                      {selected.decisions.map((d, i) => (
                        <li key={i} className="group flex items-start gap-2 rounded-lg bg-emerald-500/12 px-3 py-2 text-[13.5px] text-emerald-500">
                          <Check size={15} className="mt-0.5 flex-shrink-0" />
                          <span className="flex-1">{d}</span>
                          <button
                            onClick={() => removeDecision(selected.id, i)}
                            className="flex-shrink-0 rounded p-0.5 opacity-0 transition hover:bg-emerald-500/20 focus:opacity-100 group-hover:opacity-100"
                            aria-label="결정사항 삭제"
                          >
                            <X size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={newDecision}
                      onChange={(e) => setNewDecision(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isImeEnter(e)) addDecision(selected.id) }}
                      placeholder="결정된 내용을 입력하고 Enter"
                      className={inputCls}
                    />
                    <button
                      onClick={() => addDecision(selected.id)}
                      disabled={!newDecision.trim()}
                      className="flex-shrink-0 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm font-semibold transition hover:bg-[var(--panel-2)] disabled:opacity-40"
                    >
                      추가
                    </button>
                  </div>
                </Section>

                <Section label={`액션 아이템 ${selected.actions.filter((a) => a.done).length}/${selected.actions.length} 완료`}>
                  {selected.actions.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {selected.actions.map((a) => (
                        <div
                          key={a.id}
                          className="group flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 text-[13.5px] transition-colors hover:bg-[var(--panel-2)]"
                        >
                          <button onClick={() => toggleAction(selected.id, a.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span
                              className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border transition-colors ${
                                a.done ? 'border-sky-500 bg-sky-500 text-white' : 'border-[var(--border)] bg-[var(--panel-2)]'
                              }`}
                            >
                              {a.done && <Check size={13} />}
                            </span>
                            <span className={a.done ? 'text-[var(--text-dim)] line-through' : ''}>{a.text}</span>
                          </button>
                          <button
                            onClick={() => removeAction(selected.id, a.id)}
                            className="flex-shrink-0 rounded p-1 text-[var(--text-dim)] opacity-0 transition hover:bg-rose-500/12 hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
                            aria-label="액션 삭제"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isImeEnter(e)) addAction(selected.id) }}
                      placeholder="할 일과 담당자를 입력하고 Enter"
                      className={inputCls}
                    />
                    <button
                      onClick={() => addAction(selected.id)}
                      disabled={!newAction.trim()}
                      className="flex-shrink-0 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm font-semibold transition hover:bg-[var(--panel-2)] disabled:opacity-40"
                    >
                      추가
                    </button>
                  </div>
                </Section>
              </div>
            </Card>
          ) : (
            <Card title="회의 상세" className="self-start">
              <EmptyState
                icon={ClipboardList}
                title={meetings.length ? '회의록을 선택하세요' : '아직 회의록이 없습니다'}
                hint={meetings.length ? '왼쪽 목록에서 회의를 고르면 안건·결정사항·액션이 표시됩니다.' : '“새 회의록”을 눌러 첫 회의를 기록해 보세요.'}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
