'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, RefreshCw, Send, Headset, Circle, CheckCheck, Check, Bot } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, StatCard } from '@/components/ui'
import { Reveal } from '@/components/motion'
import {
  adminSupport,
  adminSupportReply,
  type SupportConv,
  type ChatMsg,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

/* ───────── helpers ───────── */
function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 상대 시간(방금/분/시간/일) 또는 날짜 */
function fmtRelative(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function AdminSupportPage() {
  const [conversations, setConversations] = useState<SupportConv[]>([])
  const [unread, setUnread] = useState(0)
  const [listLoading, setListLoading] = useState(true)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeConv, setActiveConv] = useState<{
    conv_id: string
    name: string
    email: string
    user_id: string
  } | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [threadLoading, setThreadLoading] = useState(false)

  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const bodyRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  /* ── 목록 로드 ── */
  async function reloadList(showSpinner = false) {
    if (showSpinner) setListLoading(true)
    const r = await adminSupport()
    if (r.ok) {
      setConversations(r.conversations ?? [])
      setUnread(r.unread ?? 0)
    }
    setListLoading(false)
  }

  /* ── 스레드 로드(읽음 처리 포함) ── */
  async function loadThread(convId: string, showSpinner = true) {
    if (showSpinner) setThreadLoading(true)
    const r = await adminSupport(convId)
    setThreadLoading(false)
    if (activeIdRef.current !== convId) return
    if (r.ok) {
      setMessages(r.messages ?? [])
      if (r.conv) setActiveConv(r.conv)
    }
  }

  function selectConv(c: SupportConv) {
    setActiveId(c.conv_id)
    setActiveConv({ conv_id: c.conv_id, name: c.name, email: c.email, user_id: c.user_id })
    setMessages([])
    loadThread(c.conv_id, true).then(() => reloadList())
  }

  /* 첫 로드 + 목록 15초 폴링 */
  useEffect(() => {
    reloadList(true)
    const t = setInterval(() => reloadList(false), 15000)
    return () => clearInterval(t)
  }, [])

  /* 열린 스레드 4초 폴링 */
  useEffect(() => {
    if (!activeId) return
    const t = setInterval(() => loadThread(activeId, false), 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  /* 새 메시지 시 스크롤 하단 */
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, activeId])

  /* ── 답변 전송 ── */
  async function send() {
    const text = reply.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    setReply('')
    // 낙관적 추가
    setMessages((prev) => [...prev, { sender: 'admin', text, at: new Date().toISOString() }])
    const r = await adminSupportReply(activeId, text)
    setSending(false)
    if (!r.ok) {
      // 실패 시 복원
      setReply(text)
    }
    await loadThread(activeId, false)
    reloadList()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MessageCircle}
        eyebrow="ADMIN · 고객센터"
        title="고객센터 채팅"
        desc="고객 문의에 실시간으로 답변합니다."
        accent={ACCENT}
        action={
          <Button variant="outline" size="sm" onClick={() => reloadList(true)}>
            <RefreshCw size={15} className={cn(listLoading && 'animate-spin')} /> 새로고침
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* 요약 */}
        <Reveal>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="총 대화수" value={String(conversations.length)} icon={Headset} accent="#7c3aed" />
            <StatCard label="미읽음" value={String(unread)} icon={Circle} accent="#f43f5e" />
          </div>
        </Reveal>

        <Reveal>
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            {/* ── 왼쪽: 대화 목록 ── */}
            <Panel title="대화 목록" className="lg:max-h-[72vh] lg:overflow-hidden">
              {listLoading && conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <RefreshCw size={24} className="animate-spin text-violet-400" />
                  <p className="mt-3 text-sm text-[var(--text-dim)]">대화 목록을 불러오는 중…</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-400">
                    <MessageCircle size={22} />
                  </span>
                  <p className="mt-3 text-sm font-medium">아직 문의가 없습니다.</p>
                </div>
              ) : (
                <div className="-mx-1 max-h-[64vh] space-y-1 overflow-y-auto pr-1">
                  {conversations.map((c) => {
                    const active = c.conv_id === activeId
                    return (
                      <button
                        key={c.conv_id}
                        onClick={() => selectConv(c)}
                        className={cn(
                          'w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                          active
                            ? 'border-violet-400/60 bg-violet-50'
                            : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--panel-2)]',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-semibold">{c.name || '고객'}</span>
                          <span className="flex flex-shrink-0 items-center gap-1.5">
                            {c.unread > 0 && (
                              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                                {c.unread}
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--text-dim)]">{fmtRelative(c.last_at)}</span>
                          </span>
                        </div>
                        {c.email && (
                          <div className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]">{c.email}</div>
                        )}
                        <div className="mt-1 truncate text-xs text-[var(--text-soft)]">
                          {c.last_sender === 'admin' && <span className="text-violet-500">나: </span>}
                          {c.last_sender === 'bot' && <span className="text-amber-500">자동응답: </span>}
                          {c.last_text || '—'}
                        </div>
                        {(c.last_sender === 'admin' || c.last_sender === 'bot') && (
                          <div className="mt-0.5">
                            {(c.userUnread ?? 0) > 0 ? (
                              <span className="text-[10px] font-medium text-amber-500">고객 미확인</span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-sky-500"><CheckCheck size={10} /> 고객 읽음</span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </Panel>

            {/* ── 오른쪽: 채팅 스레드 ── */}
            <Panel className="flex min-h-[60vh] flex-col p-0 lg:max-h-[72vh]">
              {!activeId || !activeConv ? (
                <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-400">
                    <MessageCircle size={26} />
                  </span>
                  <p className="mt-4 font-semibold">왼쪽에서 대화를 선택하세요.</p>
                  <p className="mt-1 text-sm text-[var(--text-dim)]">선택하면 대화 내용이 표시됩니다.</p>
                </div>
              ) : (
                <>
                  {/* 헤더 */}
                  <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5">
                    <span
                      className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-sm font-bold"
                      style={{ background: `${ACCENT}18`, color: ACCENT }}
                    >
                      {(activeConv.name || '고객').slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{activeConv.name || '고객'}</div>
                      <div className="truncate text-xs text-[var(--text-dim)]">{activeConv.email || '이메일 없음'}</div>
                    </div>
                  </div>

                  {/* 본문 */}
                  <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-[var(--panel-2)]/40 px-5 py-4">
                    {threadLoading && messages.length === 0 ? (
                      <div className="flex items-center justify-center py-20">
                        <RefreshCw size={22} className="animate-spin text-violet-400" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="py-20 text-center text-sm text-[var(--text-dim)]">아직 메시지가 없습니다.</p>
                    ) : (
                      messages.map((m, i) => {
                        const isBot = m.sender === 'bot'
                        const ours = m.sender === 'admin' || isBot
                        return (
                          <div key={m.id || i} className={cn('flex', ours ? 'justify-end' : 'justify-start')}>
                            <div className={cn('flex max-w-[78%] flex-col', ours ? 'items-end text-right' : 'items-start text-left')}>
                              {isBot && (
                                <span className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                                  <Bot size={11} /> 자동응답
                                </span>
                              )}
                              <div
                                className={cn(
                                  'inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
                                  ours
                                    ? isBot
                                      ? 'rounded-br-sm bg-amber-500 text-white'
                                      : 'rounded-br-sm bg-violet-600 text-white'
                                    : 'rounded-bl-sm border border-[var(--border)] bg-white text-[var(--text)]',
                                )}
                              >
                                {m.text}
                              </div>
                              <div className={cn('mt-1 flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] tabular-nums', ours ? 'justify-end' : 'justify-start')}>
                                <span>{fmtDateTime(m.at)}</span>
                                {ours && (
                                  m.readUser ? (
                                    <span className="flex items-center gap-0.5 font-medium text-sky-500"><CheckCheck size={12} /> 읽음</span>
                                  ) : (
                                    <span className="flex items-center gap-0.5 text-[var(--text-dim)]"><Check size={12} /> 안읽음</span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* 입력 */}
                  <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-3">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="답변을 입력하세요…"
                      className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-violet-400"
                    />
                    <Button size="sm" onClick={send} disabled={sending || !reply.trim()}>
                      <Send size={15} /> 전송
                    </Button>
                  </div>
                </>
              )}
            </Panel>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
