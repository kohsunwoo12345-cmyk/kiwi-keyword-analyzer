'use client'

import { useMemo, useRef, useState } from 'react'
import { StickyNote, Plus, Trash2, Search, Palette } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { useAuth } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'

const ACCENT = '#0ea5e9'

interface Note {
  id: string
  text: string
  color: number
  author: string
  time: string
}

/** 반투명 틴트라 라이트/다크 어느 쪽에서도 글자가 묻히지 않는다 */
const PALETTE = [
  { name: '노랑', bg: 'bg-amber-500/12', border: 'border-amber-500/30', tape: 'bg-amber-500/40', dot: '#f59e0b' },
  { name: '빨강', bg: 'bg-rose-500/12', border: 'border-rose-500/30', tape: 'bg-rose-500/40', dot: '#f43f5e' },
  { name: '파랑', bg: 'bg-sky-500/12', border: 'border-sky-500/30', tape: 'bg-sky-500/40', dot: '#0ea5e9' },
  { name: '초록', bg: 'bg-emerald-500/12', border: 'border-emerald-500/30', tape: 'bg-emerald-500/40', dot: '#10b981' },
  { name: '보라', bg: 'bg-violet-500/12', border: 'border-violet-500/30', tape: 'bg-violet-500/40', dot: '#8b5cf6' },
]

/** 한국시간 "M/D HH:mm" — 다른 화면과 시간 기준을 맞춘다 */
function stamp(): string {
  const [date, time] = kstDateTime(new Date().toISOString()).split(' ')
  const [, mo, dd] = date.split('-')
  return `${Number(mo)}/${Number(dd)} ${time}`
}

const SEED: Note[] = [
  { id: 'n1', text: '여름 세일 배너 CTA 문구 "지금 아니면 손해!"로 통일하기', color: 0, author: '이수민', time: '7/11 14:20' },
  { id: 'n2', text: '네이버 검색광고 키워드 입찰가 월요일 오전에 재조정', color: 2, author: '정예린', time: '7/11 16:05' },
  { id: 'n3', text: '유튜브 썸네일 A/B 테스트 결과 → 얼굴 클로즈업이 CTR 34% 높음', color: 3, author: '박현우', time: '7/10 11:40' },
  { id: 'n4', text: '인플루언서 협업 리스트 업데이트 필요 (뷰티 5명 컨택 완료)', color: 1, author: '최민지', time: '7/10 09:15' },
  { id: 'n5', text: '8월 콘텐츠 캘린더 초안 금요일까지 공유하기 📅', color: 4, author: '김지훈', time: '7/09 17:30' },
]

export default function TeamNotesPage() {
  const [notes, setNotes] = useLocalStorage<Note[]>('bivience_notes', SEED)
  const [nextColor, setNextColor] = useState(1)
  const [query, setQuery] = useState('')
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const { user } = useAuth()
  /** 새로 만든 메모에 바로 커서를 두기 위한 표시 */
  const focusId = useRef<string | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => n.text.toLowerCase().includes(q) || n.author.toLowerCase().includes(q))
  }, [notes, query])

  function addNote() {
    const color = nextColor % PALETTE.length
    setNextColor((c) => c + 1)
    const id = `x${Date.now()}`
    focusId.current = id
    setQuery('') // 검색 중이면 방금 만든 메모가 안 보이므로 초기화한다
    setNotes((prev) => [{ id, text: '', color, author: user?.name?.slice(0, 4) || '나', time: stamp() }, ...prev])
  }

  function updateText(id: string, text: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)))
  }

  function setColor(id: string, color: number) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)))
    setPickerFor(null)
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  const empty = notes.filter((n) => !n.text.trim()).length

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={StickyNote}
        eyebrow="팀 협업"
        title="메모"
        desc="팀의 아이디어와 할 일을 포스트잇처럼 붙여두세요. (이 브라우저에 저장됩니다)"
        accent={ACCENT}
        action={
          <Button onClick={addNote} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
            <Plus size={16} /> 새 메모
          </Button>
        }
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <Card
          title="메모 보드"
          desc={
            query
              ? `${shown.length}개 표시 중 / 전체 ${notes.length}개`
              : `${notes.length}개${empty ? ` · 내용이 빈 메모 ${empty}개` : ''}`
          }
          action={
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="내용·작성자 검색"
                className="w-40 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] py-1.5 pl-8 pr-2.5 text-[12px] outline-none transition-colors focus:border-sky-500 sm:w-52"
              />
            </div>
          }
        >
          {shown.length === 0 ? (
            <EmptyState
              icon={StickyNote}
              title={notes.length === 0 ? '메모가 없습니다' : '검색 결과가 없습니다'}
              hint={notes.length === 0 ? '“새 메모”를 눌러 아이디어를 붙여두세요.' : '다른 검색어를 입력해 보세요.'}
              action={
                notes.length === 0 ? (
                  <button
                    onClick={addNote}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                  >
                    <Plus size={14} /> 새 메모
                  </button>
                ) : (
                  <button
                    onClick={() => setQuery('')}
                    className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-[var(--panel-2)]"
                  >
                    검색어 지우기
                  </button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((n, i) => {
                const p = PALETTE[n.color] || PALETTE[0]
                return (
                  <div
                    key={n.id}
                    className={`group relative flex min-h-[190px] flex-col rounded-xl border p-4 transition-transform hover:-translate-y-0.5 ${p.bg} ${p.border}`}
                    style={{ animation: `fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(i, 11) * 40}ms both` }}
                  >
                    <span className={`absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rounded-sm ${p.tape}`} />

                    <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        onClick={() => setPickerFor((v) => (v === n.id ? null : n.id))}
                        className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-dim)] transition hover:bg-[var(--panel)] hover:text-[var(--text)]"
                        aria-label="색 바꾸기"
                      >
                        <Palette size={14} />
                      </button>
                      <button
                        onClick={() => removeNote(n.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-dim)] transition hover:bg-rose-500/15 hover:text-rose-500"
                        aria-label="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {pickerFor === n.id && (
                      <div className="absolute right-2 top-10 z-10 flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1.5 shadow-lg">
                        {PALETTE.map((c, ci) => (
                          <button
                            key={c.name}
                            onClick={() => setColor(n.id, ci)}
                            className={`h-5 w-5 rounded-full transition hover:scale-110 ${n.color === ci ? 'ring-2 ring-offset-1 ring-offset-[var(--panel)]' : ''}`}
                            style={{ background: c.dot, boxShadow: n.color === ci ? `0 0 0 2px ${c.dot}` : undefined }}
                            aria-label={c.name}
                            title={c.name}
                          />
                        ))}
                      </div>
                    )}

                    <textarea
                      value={n.text}
                      onChange={(e) => updateText(n.id, e.target.value)}
                      placeholder="메모를 입력하세요…"
                      autoFocus={focusId.current === n.id}
                      className="mt-3 flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
                    />

                    <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[11px] text-[var(--text-dim)]">
                      <span className="truncate font-semibold text-[var(--text-soft)]">{n.author}</span>
                      <span className="flex-shrink-0 tabular-nums">{n.time}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
