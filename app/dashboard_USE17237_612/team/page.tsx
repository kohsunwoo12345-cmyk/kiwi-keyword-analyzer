'use client'

import { useRef, useState, useEffect } from 'react'
import { Users, Bot, Send, Plus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'
import { useLocalStorage } from '@/lib/useLocalStorage'

interface Task {
  id: string
  title: string
  assignee: string
  col: number // 0 할일, 1 진행중, 2 완료
  tag: string
}

const COLS = ['할 일', '진행 중', '완료']
const TAG_COLORS: Record<string, string> = {
  광고: 'bg-fuchsia-100 text-fuchsia-700',
  콘텐츠: 'bg-violet-100 text-violet-700',
  분석: 'bg-sky-100 text-sky-700',
  디자인: 'bg-amber-100 text-amber-700',
}

const SEED: Task[] = [
  { id: 't1', title: '7월 메타 광고 소재 3종 제작', assignee: '지훈', col: 0, tag: '광고' },
  { id: 't2', title: '블로그 상위노출 키워드 리서치', assignee: '수민', col: 0, tag: '분석' },
  { id: 't3', title: '유튜브 숏폼 스크립트 작성', assignee: '현우', col: 1, tag: '콘텐츠' },
  { id: 't4', title: '랜딩페이지 A/B 테스트 세팅', assignee: '지훈', col: 1, tag: '분석' },
  { id: 't5', title: '6월 광고 성과 리포트', assignee: '수민', col: 2, tag: '분석' },
  { id: 't6', title: '신규 브랜드 로고 시안', assignee: '민지', col: 2, tag: '디자인' },
]

interface Msg {
  role: 'user' | 'bot'
  text: string
}

function aiReply(q: string): string {
  const t = q.toLowerCase()
  if (t.includes('카피') || t.includes('문구') || t.includes('광고'))
    return '광고 카피 3안을 제안드려요:\n1. "3분이면 끝, 지금 바로 시작하세요"\n2. "이미 5,200명의 마케터가 선택했습니다"\n3. "광고비는 그대로, 매출은 2.7배로"\n\n타겟과 톤을 알려주시면 더 정교하게 다듬어 드릴게요.'
  if (t.includes('키워드') || t.includes('블로그') || t.includes('seo'))
    return '상위노출을 노린다면 검색량 대비 문서수가 낮은 롱테일 키워드가 유리합니다. "마케팅 자동화 툴 추천"처럼 구매 의도가 담긴 3~4어절 키워드를 주 2회 발행해 보세요. 블로그 분석 탭에서 진단도 가능합니다.'
  if (t.includes('영상') || t.includes('숏폼') || t.includes('릴스'))
    return '숏폼은 첫 2초 훅이 전부입니다. "이거 모르면 손해예요" 같은 궁금증 유발 훅 → 문제 제기 → 해결 → CTA 구조를 추천해요. AI 영상 제작 탭에서 프롬프트만 넣어 바로 만들어 볼 수 있습니다.'
  if (t.includes('roas') || t.includes('광고비') || t.includes('예산'))
    return '현재 리타겟팅 캠페인 ROAS가 8.4로 가장 높습니다. 예산을 여기에 20% 재배분하고, ROAS 3.1인 네이버 신규가입 캠페인은 소재를 교체해 보시길 권합니다.'
  return '네, 도와드릴게요! 마케팅 카피, 키워드 전략, 영상 기획, 광고 최적화 등 무엇이든 물어보세요. 예: "여름 세일 인스타 광고 카피 만들어줘"'
}

export default function TeamPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('bivience_tasks', SEED)
  const [newTask, setNewTask] = useState('')
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'bot', text: '안녕하세요! 저는 바이전시 AI 마케팅 어시스턴트예요. 무엇을 도와드릴까요? 🤖' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  function move(id: string, dir: -1 | 1) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, col: Math.max(0, Math.min(2, t.col + dir)) } : t)),
    )
  }

  function addTask() {
    if (!newTask.trim()) return
    setTasks((prev) => [
      { id: 'n' + Math.random().toString(36).slice(2, 7), title: newTask, assignee: '나', col: 0, tag: '콘텐츠' },
      ...prev,
    ])
    setNewTask('')
  }

  function send() {
    if (!input.trim()) return
    const q = input
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages((m) => [...m, { role: 'bot', text: aiReply(q) }])
    }, 700)
  }

  const quick = ['여름 세일 광고 카피', '블로그 키워드 추천', 'ROAS 개선 방법', '숏폼 기획 도와줘']

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Users}
        eyebrow="04 · 협업"
        title="팀 협업 & AI 챗봇"
        desc="칸반 보드로 업무를 관리하고 AI 어시스턴트의 도움을 받으세요."
        accent="#0ea5e9"
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_400px] lg:p-8">
        {/* Kanban */}
        <div>
          <div className="mb-4 flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="새 업무 추가..."
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 text-sm outline-none focus:border-sky-500"
            />
            <Button onClick={addTask} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
              <Plus size={16} /> 추가
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {COLS.map((col, ci) => (
              <div key={col} className="card p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{col}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-[var(--text-dim)]">
                    {tasks.filter((t) => t.col === ci).length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {tasks
                    .filter((t) => t.col === ci)
                    .map((t) => (
                      <div key={t.id} className="card-2 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              TAG_COLORS[t.tag] || 'bg-slate-100 text-[var(--text-soft)]'
                            }`}
                          >
                            {t.tag}
                          </span>
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold">
                            {t.assignee[0]}
                          </span>
                        </div>
                        <p className="text-sm leading-snug">{t.title}</p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <button
                            onClick={() => move(t.id, -1)}
                            disabled={ci === 0}
                            className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-dim)] hover:bg-slate-100 hover:text-[var(--text)] disabled:opacity-20"
                          >
                            <ChevronLeft size={15} />
                          </button>
                          <span className="text-[11px] text-[var(--text-dim)]">{t.assignee}</span>
                          <button
                            onClick={() => move(t.id, 1)}
                            disabled={ci === 2}
                            className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-dim)] hover:bg-slate-100 hover:text-[var(--text)] disabled:opacity-20"
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Chatbot */}
        <div className="card flex h-[600px] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl brand-gradient">
              <Bot size={20} className="text-white" />
            </span>
            <div>
              <p className="font-semibold">AI 마케팅 어시스턴트</p>
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 온라인
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'brand-gradient text-white'
                      : 'bg-[var(--panel-2)] text-[var(--text-soft)]'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl bg-[var(--panel-2)] px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-[var(--text-dim)]"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          <div className="border-t border-[var(--border)] p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quick.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                  }}
                  className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-xs text-[var(--text-soft)] hover:border-violet-500/50 hover:text-[var(--text)]"
                >
                  <Sparkles size={11} /> {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <Button onClick={send} className="!px-3">
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
