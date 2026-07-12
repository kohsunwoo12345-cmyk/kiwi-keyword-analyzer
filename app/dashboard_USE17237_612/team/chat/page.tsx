'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Users } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'

interface Msg {
  id: string
  author: string
  mine: boolean
  text: string
  time: string
}

const CHANNELS = [
  { id: 'general', name: '일반', desc: '팀 전체 공지' },
  { id: 'marketing', name: '마케팅', desc: '캠페인 전략' },
  { id: 'design', name: '디자인', desc: '소재 & 시안' },
  { id: 'ads', name: '광고', desc: '성과 & 예산' },
]

const MEMBERS = [
  { name: '김지훈', role: '팀장', status: 'online' as const },
  { name: '이수민', role: '콘텐츠', status: 'online' as const },
  { name: '박현우', role: '영상', status: 'online' as const },
  { name: '최민지', role: '디자인', status: 'away' as const },
  { name: '정예린', role: '광고', status: 'offline' as const },
]

const AVATAR_COLORS: Record<string, string> = {
  김지훈: 'from-violet-500 to-fuchsia-500',
  이수민: 'from-sky-500 to-blue-500',
  박현우: 'from-emerald-500 to-green-500',
  최민지: 'from-amber-500 to-orange-500',
  정예린: 'from-rose-500 to-pink-500',
}

function avatarClass(name: string) {
  return AVATAR_COLORS[name] || 'from-slate-400 to-slate-500'
}

const SEED: Record<string, Msg[]> = {
  general: [
    { id: 'g1', author: '김지훈', mine: false, text: '다들 좋은 아침입니다! 오늘 오후 3시 주간 회의 잊지 마세요 🙌', time: '09:02' },
    { id: 'g2', author: '이수민', mine: false, text: '넵 회의록 미리 공유해둘게요~', time: '09:05' },
    { id: 'g3', author: '나', mine: true, text: '어젠다에 7월 캠페인 성과 항목 추가해주세요!', time: '09:07' },
  ],
  marketing: [
    { id: 'm1', author: '이수민', mine: false, text: '여름 세일 캠페인 카피 초안 나왔어요. 검토 부탁드려요!', time: '10:12' },
    { id: 'm2', author: '나', mine: true, text: '"지금 아니면 손해" 훅 좋네요. 타겟은 20대 여성으로 갈까요?', time: '10:15' },
    { id: 'm3', author: '박현우', mine: false, text: '릴스용 숏폼도 같이 준비하면 시너지 날 것 같아요', time: '10:18' },
  ],
  design: [
    { id: 'd1', author: '최민지', mine: false, text: '배너 시안 3종 업로드했습니다. A안이 브랜드 톤에 제일 맞는 것 같아요', time: '11:30' },
    { id: 'd2', author: '나', mine: true, text: 'A안 좋습니다! CTA 버튼만 조금 더 크게 갈 수 있을까요?', time: '11:33' },
  ],
  ads: [
    { id: 'a1', author: '정예린', mine: false, text: '리타겟팅 캠페인 ROAS 8.4 찍었어요 🎉 예산 증액 제안드립니다', time: '14:20' },
    { id: 'a2', author: '나', mine: true, text: '오 대박이네요. 네이버 신규가입 캠페인 예산 일부 옮기죠', time: '14:22' },
  ],
}

const REPLIES: Record<string, { author: string; text: string }[]> = {
  general: [
    { author: '이수민', text: '반영했습니다! 회의 때 뵐게요 😄' },
    { author: '김지훈', text: '좋아요, 확인했습니다 👍' },
  ],
  marketing: [
    { author: '이수민', text: '넵 20대 여성 타겟으로 소재 다듬어볼게요!' },
    { author: '박현우', text: '숏폼 스크립트 오늘 안으로 공유드릴게요' },
  ],
  design: [
    { author: '최민지', text: 'CTA 사이즈 키워서 다시 올릴게요! 잠시만요' },
  ],
  ads: [
    { author: '정예린', text: '바로 예산 재배분 세팅하겠습니다 💪' },
  ],
}

function now() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className={`grid flex-shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarClass(name)} font-semibold text-white`}
      style={{ height: size, width: size, fontSize: size * 0.4 }}
    >
      {name === '나' ? '나' : name[0]}
    </span>
  )
}

export default function TeamChatPage() {
  const [active, setActive] = useState('general')
  const [store, setStore] = useState<Record<string, Msg[]>>(SEED)
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const messages = store[active]

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    if (!input.trim()) return
    const ch = active
    const text = input.trim()
    setStore((prev) => ({
      ...prev,
      [ch]: [...prev[ch], { id: 'u' + Math.random().toString(36).slice(2, 7), author: '나', mine: true, text, time: now() }],
    }))
    setInput('')
    const pool = REPLIES[ch]
    const reply = pool[Math.floor(Math.random() * pool.length)]
    setTimeout(() => {
      setStore((prev) => ({
        ...prev,
        [ch]: [...prev[ch], { id: 'r' + Math.random().toString(36).slice(2, 7), author: reply.author, mine: false, text: reply.text, time: now() }],
      }))
    }, 1100)
  }

  const statusColor = { online: 'bg-emerald-500', away: 'bg-amber-500', offline: 'bg-slate-300' }
  const statusLabel = { online: '온라인', away: '자리비움', offline: '오프라인' }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MessageCircle}
        eyebrow="팀 협업"
        title="팀 채팅"
        desc="채널별로 팀원과 실시간으로 소통하세요."
        accent="#0ea5e9"
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[260px_1fr] lg:p-8">
        {/* Sidebar: channels + members */}
        <div className="space-y-6">
          <div className="card p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              <MessageCircle size={13} /> 채널
            </p>
            <div className="space-y-1">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active === c.id
                      ? 'bg-sky-50 font-semibold text-sky-700'
                      : 'text-[var(--text-soft)] hover:bg-slate-50'
                  }`}
                >
                  <span className={active === c.id ? 'text-sky-500' : 'text-[var(--text-dim)]'}>#</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              <Users size={13} /> 멤버 · {MEMBERS.filter((m) => m.status === 'online').length}명 접속
            </p>
            <div className="space-y-2.5">
              {MEMBERS.map((m) => (
                <div key={m.name} className="flex items-center gap-2.5">
                  <div className="relative">
                    <Avatar name={m.name} size={32} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${statusColor[m.status]}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-[var(--text-dim)]">{m.role}</p>
                  </div>
                  <span className="text-[11px] text-[var(--text-dim)]">{statusLabel[m.status]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="card flex h-[640px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
            <span className="text-lg font-bold text-sky-500">#</span>
            <div>
              <p className="font-semibold">{CHANNELS.find((c) => c.id === active)?.name}</p>
              <p className="text-xs text-[var(--text-dim)]">{CHANNELS.find((c) => c.id === active)?.desc}</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.mine ? 'flex-row-reverse' : ''}`}>
                <Avatar name={m.author} />
                <div className={`max-w-[70%] ${m.mine ? 'items-end text-right' : ''} flex flex-col`}>
                  <div className={`mb-1 flex items-center gap-2 text-xs ${m.mine ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold">{m.author}</span>
                    <span className="text-[var(--text-dim)]">{m.time}</span>
                  </div>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.mine
                        ? 'brand-gradient text-white'
                        : 'bg-[var(--panel-2)] text-[var(--text-soft)]'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[var(--border)] p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={`#${CHANNELS.find((c) => c.id === active)?.name} 에 메시지 보내기...`}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
              />
              <button
                onClick={send}
                className="grid place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 px-4 text-white transition-all hover:brightness-105"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
