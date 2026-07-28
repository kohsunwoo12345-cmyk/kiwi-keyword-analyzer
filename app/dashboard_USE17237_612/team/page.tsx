'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import {
  Users,
  Bot,
  Send,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
  CheckCircle2,
  ListTodo,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'
import { Button } from '@/components/ui'
import { EmojiText } from '@/components/Emoji'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { aiGenerate, useAuth } from '@/lib/auth'

const ACCENT = '#0ea5e9'
/** 서버가 모델 원가로 확정하는 값 — 채팅 1회당 차감된다 */
const CHAT_COST = 2

interface Task {
  id: string
  title: string
  assignee: string
  col: number // 0 할일, 1 진행중, 2 완료
  tag: string
}

const COLS = ['할 일', '진행 중', '완료']
const COL_ACCENT = ['#94a3b8', '#0ea5e9', '#22c55e']

const TAGS = ['광고', '콘텐츠', '분석', '디자인'] as const
const TAG_COLORS: Record<string, string> = {
  광고: 'bg-fuchsia-500/15 text-fuchsia-400',
  콘텐츠: 'bg-violet-500/15 text-violet-400',
  분석: 'bg-sky-500/15 text-sky-500',
  디자인: 'bg-amber-500/15 text-amber-500',
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
  /** AI 서버를 못 써서 미리 준비된 답으로 대체한 경우 */
  fallback?: boolean
}

const GREETING: Msg = {
  role: 'bot',
  text: '안녕하세요! 저는 바이전시 AI 마케팅 어시스턴트예요. 무엇을 도와드릴까요? 🤖',
}

const CHAT_SYSTEM =
  '당신은 한국 시장에 정통한 마케팅 실무 어시스턴트입니다. 질문에 곧바로 실행 가능한 답을 주고, 근거가 되는 수치나 기준을 함께 제시하세요. 불필요한 인사말은 생략하고 5문장 이내로 간결하게 답합니다.'

/** AI 서버를 못 쓸 때 대신 보여줄 답 (실제 AI 응답이 아님을 UI에 표시한다) */
function fallbackReply(q: string): string {
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
  const [tasks, setTasks, tasksReady] = useLocalStorage<Task[]>('bivience_tasks', SEED)
  const [newTask, setNewTask] = useState('')
  const [newTag, setNewTag] = useState<string>('콘텐츠')

  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)
  const { user, setUser } = useAuth()

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const stats = useMemo(() => {
    const by = [0, 1, 2].map((c) => tasks.filter((t) => t.col === c).length)
    const done = by[2]
    return { by, total: tasks.length, done, rate: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
  }, [tasks])

  function move(id: string, dir: -1 | 1) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, col: Math.max(0, Math.min(2, t.col + dir)) } : t)))
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function addTask() {
    const title = newTask.trim()
    if (!title) return
    setTasks((prev) => [
      { id: `n${Date.now()}`, title, assignee: user?.name?.slice(0, 3) || '나', col: 0, tag: newTag },
      ...prev,
    ])
    setNewTask('')
  }

  const credits = user?.credits ?? 0
  const notEnough = credits < CHAT_COST

  async function send() {
    const q = input.trim()
    if (!q || typing || notEnough) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)

    // 실제 AI 호출 — 실패하면 서버가 크레딧을 환불하고, 화면에는 대체 답변임을 밝힌다
    const r = await aiGenerate({ prompt: q, system: CHAT_SYSTEM, feature: 'AI 마케팅 상담', max_tokens: 600 })
    setTyping(false)

    if (r.ok && r.text) {
      setMessages((m) => [...m, { role: 'bot', text: r.text as string }])
      if (typeof r.credits === 'number' && user) setUser({ ...user, credits: r.credits })
    } else {
      setMessages((m) => [...m, { role: 'bot', text: fallbackReply(q), fallback: true }])
    }
  }

  const quick = ['여름 세일 광고 카피', '블로그 키워드 추천', 'ROAS 개선 방법', '숏폼 기획 도와줘']

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Users}
        eyebrow="04 · 협업"
        title="팀 협업 & AI 챗봇"
        desc="칸반 보드로 업무를 관리하고 AI 어시스턴트의 도움을 받으세요."
        accent={ACCENT}
      />

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="전체 업무" icon={ListTodo} accent="#0ea5e9" value={tasksReady ? `${stats.total}건` : '—'} sub="이 브라우저에 저장됩니다" />
          <Metric label="진행 중" icon={Loader2} accent="#6366f1" value={tasksReady ? `${stats.by[1]}건` : '—'} sub={`할 일 ${stats.by[0]}건 대기`} />
          <Metric label="완료" icon={CheckCircle2} accent="#22c55e" value={tasksReady ? `${stats.by[2]}건` : '—'} sub="완료 칸으로 옮긴 업무" />
          <Metric
            label="완료율"
            icon={Sparkles}
            accent="#f59e0b"
            value={tasksReady ? `${stats.rate}%` : '—'}
            sub={
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                <span className="block h-full rounded-full bg-amber-500 transition-all duration-700" style={{ width: `${stats.rate}%` }} />
              </span>
            }
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* 칸반 보드 */}
          <Card title="업무 보드" desc="카드의 화살표로 단계를 옮깁니다" bodyClassName="p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="새 업무 추가…"
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
              />
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-500"
                aria-label="분류"
              >
                {TAGS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Button onClick={addTask} disabled={!newTask.trim()} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
                <Plus size={16} /> 추가
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {COLS.map((col, ci) => {
                const list = tasks.filter((t) => t.col === ci)
                return (
                  <div key={col} className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-2.5">
                    <div className="mb-2.5 flex items-center gap-2 px-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: COL_ACCENT[ci] }} />
                      <span className="text-[13px] font-bold">{col}</span>
                      <span className="ml-auto rounded-full bg-[var(--panel)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-dim)]">
                        {list.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {list.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-[var(--border)] py-6 text-center text-[11.5px] text-[var(--text-dim)]">
                          비어 있습니다
                        </p>
                      ) : (
                        list.map((t) => (
                          <div key={t.id} className="group rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${TAG_COLORS[t.tag] || 'bg-[var(--panel-2)] text-[var(--text-soft)]'}`}>
                                {t.tag}
                              </span>
                              <button
                                onClick={() => removeTask(t.id)}
                                className="rounded-md p-1 text-[var(--text-dim)] opacity-0 transition hover:bg-rose-500/12 hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
                                aria-label="업무 삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <p className={`text-[13px] leading-snug ${ci === 2 ? 'text-[var(--text-dim)] line-through' : ''}`}>{t.title}</p>
                            <div className="mt-2.5 flex items-center justify-between">
                              <button
                                onClick={() => move(t.id, -1)}
                                disabled={ci === 0}
                                className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-dim)] transition hover:bg-[var(--panel-2)] hover:text-[var(--text)] disabled:opacity-20"
                                aria-label="이전 단계로"
                              >
                                <ChevronLeft size={15} />
                              </button>
                              <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--panel-2)] text-[10px] font-bold">
                                  {t.assignee[0]}
                                </span>
                                {t.assignee}
                              </span>
                              <button
                                onClick={() => move(t.id, 1)}
                                disabled={ci === 2}
                                className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-dim)] transition hover:bg-[var(--panel-2)] hover:text-[var(--text)] disabled:opacity-20"
                                aria-label="다음 단계로"
                              >
                                <ChevronRight size={15} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* AI 어시스턴트 */}
          <div className="flex h-[620px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
            <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
              <span className="brand-gradient grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl">
                <Bot size={20} className="text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold">AI 마케팅 어시스턴트</p>
                <p className="text-[11.5px] text-[var(--text-dim)]">
                  질문 1회당 {CHAT_COST} 크레딧 · 보유 {credits.toLocaleString('ko-KR')}개
                </p>
              </div>
              {messages.length > 1 && (
                <button
                  onClick={() => setMessages([GREETING])}
                  className="ml-auto flex-shrink-0 rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
                  aria-label="대화 초기화"
                  title="대화 초기화"
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </div>

            <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      m.role === 'user' ? 'brand-gradient rounded-br-sm text-white' : 'rounded-bl-sm bg-[var(--panel-2)] text-[var(--text-soft)]'
                    }`}
                  >
                    <EmojiText>{m.text}</EmojiText>
                  </div>
                  {m.fallback && (
                    <p className="mt-1 flex items-center gap-1 text-[10.5px] text-amber-500">
                      <AlertTriangle size={11} /> AI 서버에 연결할 수 없어 미리 준비된 답변입니다. 크레딧은 차감되지 않습니다.
                    </p>
                  )}
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-[var(--panel-2)] px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="animate-pulse-glow h-1.5 w-1.5 rounded-full bg-[var(--text-dim)]" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            <div className="border-t border-[var(--border)] p-3">
              {notEnough && (
                <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/12 px-2.5 py-1.5 text-[11.5px] text-amber-500">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  크레딧이 부족해 질문할 수 없습니다. ({CHAT_COST}개 필요)
                </div>
              )}
              <div className="mb-2 flex flex-wrap gap-1.5">
                {quick.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-[11.5px] text-[var(--text-soft)] transition hover:border-sky-500/50 hover:text-[var(--text)]"
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
                  placeholder={typing ? '답변을 기다리는 중…' : '메시지를 입력하세요…'}
                  disabled={typing}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-sky-500 disabled:opacity-60"
                />
                <Button onClick={send} disabled={typing || !input.trim() || notEnough} className="!px-3" aria-label="전송">
                  {typing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
