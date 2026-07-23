'use client'

import { useState } from 'react'
import { StickyNote, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Button } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'

interface Note {
  id: string
  text: string
  color: number
  author: string
  time: string
}

const PALETTE = [
  { bg: 'bg-amber-500/12', border: 'border-amber-200', tape: 'bg-amber-200' },
  { bg: 'bg-rose-500/12', border: 'border-rose-200', tape: 'bg-rose-200' },
  { bg: 'bg-sky-500/12', border: 'border-sky-200', tape: 'bg-sky-200' },
  { bg: 'bg-emerald-500/12', border: 'border-emerald-200', tape: 'bg-emerald-200' },
  { bg: 'bg-violet-500/12', border: 'border-violet-200', tape: 'bg-violet-200' },
]

function now() {
  const d = new Date()
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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

  function addNote() {
    const color = nextColor % PALETTE.length
    setNextColor((c) => c + 1)
    setNotes((prev) => [
      { id: 'x' + Math.random().toString(36).slice(2, 7), text: '', color, author: '나', time: now() },
      ...prev,
    ])
  }

  function updateText(id: string, text: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)))
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={StickyNote}
        eyebrow="팀 협업"
        title="메모"
        desc="팀의 아이디어와 할 일을 포스트잇처럼 붙여두세요."
        accent="#0ea5e9"
        action={
          <Button onClick={addNote} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
            <Plus size={16} /> 새 메모
          </Button>
        }
      />

      <div className="p-6 lg:p-8">
        {notes.length === 0 ? (
          <div className="card py-16 text-center text-sm text-[var(--text-dim)]">
            메모가 없습니다. "새 메모"를 눌러 추가하세요.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {notes.map((n) => {
              const p = PALETTE[n.color]
              return (
                <div
                  key={n.id}
                  className={`group relative flex min-h-[190px] flex-col rounded-xl border ${p.bg} ${p.border} p-4 shadow-sm transition-transform hover:-translate-y-0.5`}
                >
                  <span className={`absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rounded-sm ${p.tape} opacity-70`} />
                  <button
                    onClick={() => removeNote(n.id)}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-[var(--text-dim)] opacity-0 transition-opacity hover:bg-white/60 hover:text-rose-500 group-hover:opacity-100"
                    aria-label="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                  <textarea
                    value={n.text}
                    onChange={(e) => updateText(n.id, e.target.value)}
                    placeholder="메모를 입력하세요..."
                    className="mt-3 flex-1 resize-none bg-transparent text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2 text-[11px] text-slate-500">
                    <span className="font-medium">{n.author}</span>
                    <span>{n.time}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
