'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Send, Users, UserPlus, Copy, Check, ChevronLeft, Search, Loader2, MessageCircle } from 'lucide-react'
import {
  useAuth, socialOverview, dmMessages, dmSend, dmSeen, teamMessages, teamSend, addFriend,
  type SocialFriend, type SocialTeam, type SocialThread,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

/* 고퀄 채팅 말풍선 SVG (그라디언트 + 말풍선 꼬리 + 점 3개) — 플로팅 버튼 아이콘 */
function ChatBubbleIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="cd_grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="0.55" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path
        d="M24 6C13 6 4 13.4 4 22.6c0 5.3 3 10 7.8 13-.3 2.2-1.3 4.6-3 6.7-.6.7 0 1.7.9 1.5 3.9-.6 7-2.1 9.3-3.9 1.6.4 3.3.6 5 .6 11 0 20-7.4 20-16.5S35 6 24 6Z"
        fill="url(#cd_grad)"
      />
      <circle cx="16" cy="22.6" r="2.4" fill="#fff" />
      <circle cx="24" cy="22.6" r="2.4" fill="#fff" />
      <circle cx="32" cy="22.6" r="2.4" fill="#fff" />
    </svg>
  )
}

const AVATAR_COLORS = [
  'from-violet-500 to-fuchsia-500', 'from-sky-500 to-blue-500', 'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-indigo-500 to-violet-500',
  'from-cyan-500 to-sky-500', 'from-teal-500 to-emerald-500',
]
function avatarClass(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function Avatar({ name, seed, size = 40 }: { name: string; seed: string; size?: number }) {
  return (
    <span
      className={`grid flex-shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarClass(seed)} font-bold text-white`}
      style={{ height: size, width: size, fontSize: size * 0.4 }}
    >
      {name ? name[0].toUpperCase() : '?'}
    </span>
  )
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function fmtRel(iso: string) {
  const t = +new Date(iso)
  if (Number.isNaN(t)) return ''
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간`
  return `${Math.floor(h / 24)}일`
}

// 통합 메시지 표현
interface UiMsg { id: string; mine: boolean; name: string; text: string; at: string }
// 열려있는 대화
type Active = { type: 'dm'; id: string; name: string } | { type: 'team'; id: string; name: string }

export function ChatDock() {
  const { user, ready } = useAuth()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'friends' | 'chats'>('chats')

  const [meId, setMeId] = useState('')
  const [meName, setMeName] = useState('')
  const [myCode, setMyCode] = useState('')
  const [friends, setFriends] = useState<SocialFriend[]>([])
  const [teams, setTeams] = useState<SocialTeam[]>([])
  const [threads, setThreads] = useState<SocialThread[]>([])
  const [totalUnread, setTotalUnread] = useState(0)

  const [active, setActive] = useState<Active | null>(null)
  const [messages, setMessages] = useState<UiMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const [friendQuery, setFriendQuery] = useState('')
  const [addCode, setAddCode] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addMsg, setAddMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const afterRef = useRef('')
  const endRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<Active | null>(null)
  activeRef.current = active

  const loggedIn = ready && !!user

  // 개요(친구·팀·스레드·안읽음) 로드
  const loadOverview = useCallback(async () => {
    const d = await socialOverview()
    if (!d.ok) return
    setMeId(d.meId || '')
    setMeName(d.meName || '')
    setMyCode(d.myCode || '')
    setFriends(d.friends)
    setTeams(d.teams)
    setThreads(d.threads)
    setTotalUnread(d.totalUnread)
  }, [])

  // 배지용 개요 폴링 (로그인 상태에서 ~10초)
  useEffect(() => {
    if (!loggedIn) return
    loadOverview()
    const iv = setInterval(loadOverview, 10000)
    return () => clearInterval(iv)
  }, [loggedIn, loadOverview])

  // 대화 열기 → 메시지 폴링
  useEffect(() => {
    if (!active) return
    afterRef.current = ''
    setMessages([])
    setLoadingMsgs(true)
    let stopped = false

    async function poll() {
      const cur = activeRef.current
      if (!cur) return
      try {
        if (cur.type === 'dm') {
          const d = await dmMessages(cur.id, afterRef.current, true)
          if (stopped || activeRef.current?.id !== cur.id) return
          if (d.ok && d.messages.length) {
            const mid = d.meId || meId
            setMessages((prev) => {
              const seen = new Set(prev.map((m) => m.id))
              const fresh = d.messages.filter((m) => !seen.has(m.id))
              if (!fresh.length) return prev
              afterRef.current = fresh[fresh.length - 1].created_at
              return [...prev, ...fresh.map((m) => ({ id: m.id, mine: m.from_id === mid, name: cur.name, text: m.text, at: m.created_at }))]
            })
          }
        } else {
          const d = await teamMessages(cur.id, afterRef.current)
          if (stopped || activeRef.current?.id !== cur.id) return
          if (d.ok && d.messages.length) {
            const mid = d.meId || meId
            setMessages((prev) => {
              const seen = new Set(prev.map((m) => m.id))
              const fresh = d.messages.filter((m) => !seen.has(m.id))
              if (!fresh.length) return prev
              afterRef.current = fresh[fresh.length - 1].created_at
              return [...prev, ...fresh.map((m) => ({ id: m.id, mine: m.user_id === mid, name: m.name || '멤버', text: m.text, at: m.created_at }))]
            })
          }
        }
      } catch { /* ignore transient */ }
      finally { if (!stopped) setLoadingMsgs(false) }
    }

    poll()
    const iv = setInterval(poll, 4000)
    return () => { stopped = true; clearInterval(iv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.type, active?.id])

  // 새 메시지 → 하단 스크롤
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // 대화 열면 안읽음 즉시 정리(로컬 배지)
  function openConversation(a: Active) {
    setActive(a)
    if (a.type === 'dm') {
      dmSeen(a.id).catch(() => {})
      setThreads((prev) => prev.map((t) => (t.friendId === a.id ? { ...t, unread: 0 } : t)))
      setTotalUnread((n) => Math.max(0, n - (threads.find((t) => t.friendId === a.id)?.unread || 0)))
    }
  }

  async function onSend() {
    const text = input.trim()
    if (!text || sending || !active) return
    setSending(true)
    const cur = active
    // 낙관적 표시
    const tempId = 'tmp_' + Date.now()
    setMessages((prev) => [...prev, { id: tempId, mine: true, name: meName || '나', text, at: new Date().toISOString() }])
    setInput('')
    try {
      const res = cur.type === 'dm' ? await dmSend(cur.id, text) : await teamSend(cur.id, text)
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setInput(text)
        alert(res.error || '전송에 실패했습니다.')
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setInput(text)
      alert('네트워크 오류가 발생했습니다.')
    }
    setSending(false)
  }

  async function onAddFriend() {
    const code = addCode.trim()
    if (!code || addBusy) return
    setAddBusy(true); setAddMsg('')
    const r = await addFriend(code)
    setAddBusy(false)
    if (r.ok) {
      setAddMsg(r.already ? '이미 친구입니다.' : `${r.friend?.name || ''}님을 친구로 추가했어요.`)
      setAddCode('')
      loadOverview()
    } else {
      setAddMsg(r.error || '친구 추가에 실패했습니다.')
    }
  }

  function copyCode() {
    if (!myCode) return
    try {
      navigator.clipboard?.writeText(myCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  if (!loggedIn) return null

  const shownFriends = friendQuery.trim()
    ? friends.filter((f) => (f.name + ' ' + f.email).toLowerCase().includes(friendQuery.trim().toLowerCase()))
    : friends
  const threadMap = new Map(threads.map((t) => [t.friendId, t]))

  return (
    <>
      {/* 플로팅 버튼 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="채팅 열기"
          className="fixed bottom-5 right-5 z-[120] grid h-14 w-14 place-items-center rounded-full bg-[var(--bg-soft)] shadow-[0_8px_30px_rgba(59,130,246,0.35)] ring-1 ring-[var(--border)] transition-transform hover:scale-105 active:scale-95"
        >
          <ChatBubbleIcon size={34} />
          {totalUnread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-h-[20px] min-w-[20px] place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-[var(--bg-soft)]">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* 패널 */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[120] flex h-[560px] max-h-[calc(100vh-2.5rem)] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-white">
            {active ? (
              <>
                <button onClick={() => setActive(null)} className="rounded-lg p-1 hover:bg-white/15" aria-label="뒤로">
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{active.name}</p>
                  <p className="text-[11px] text-white/80">{active.type === 'team' ? '단체 채팅' : '개인 채팅'}</p>
                </div>
              </>
            ) : (
              <>
                <ChatBubbleIcon size={22} />
                <p className="flex-1 text-sm font-bold">채팅</p>
              </>
            )}
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/15" aria-label="닫기">
              <X size={19} />
            </button>
          </div>

          {/* 대화 화면 */}
          {active ? (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--bg)] p-3">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="grid h-full place-items-center text-[var(--text-dim)]"><Loader2 size={22} className="animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="grid h-full place-items-center text-center text-sm text-[var(--text-dim)]">
                    <div><MessageCircle size={26} className="mx-auto mb-2 opacity-60" /> 먼저 인사를 건네보세요!</div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn('flex gap-2', m.mine && 'flex-row-reverse')}>
                      {!m.mine && <Avatar name={m.name} seed={m.name} size={30} />}
                      <div className={cn('flex max-w-[76%] flex-col', m.mine ? 'items-end' : 'items-start')}>
                        {!m.mine && active.type === 'team' && <span className="mb-0.5 text-[11px] font-semibold text-[var(--text-soft)]">{m.name}</span>}
                        <div className="flex items-end gap-1.5">
                          {m.mine && <span className="text-[10px] text-[var(--text-dim)]">{fmtTime(m.at)}</span>}
                          <div className={cn('whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed', m.mine ? 'bg-blue-500 text-white' : 'bg-[var(--panel-2)] text-[var(--text)]')}>
                            {m.text}
                          </div>
                          {!m.mine && <span className="text-[10px] text-[var(--text-dim)]">{fmtTime(m.at)}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-soft)] p-2.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
                  placeholder="메시지 입력…"
                  className="flex-1 rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button
                  onClick={onSend}
                  disabled={sending || !input.trim()}
                  className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-blue-500 text-white transition hover:brightness-105 disabled:opacity-50"
                  aria-label="보내기"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 탭 */}
              <div className="flex border-b border-[var(--border)] bg-[var(--bg-soft)]">
                {([['chats', '채팅'], ['friends', '친구']] as ['chats' | 'friends', string][]).map(([t, l]) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn('flex-1 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors', tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]')}
                  >
                    {l}
                    {t === 'friends' && <span className="ml-1 text-xs text-[var(--text-dim)]">{friends.length}</span>}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
                {tab === 'chats' ? (
                  <div className="p-2">
                    {/* 단체 채팅(팀) */}
                    {teams.length > 0 && (
                      <>
                        <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">단체 채팅</p>
                        {teams.map((tm) => (
                          <button key={tm.id} onClick={() => openConversation({ type: 'team', id: tm.id, name: tm.name })}
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--panel-2)]">
                            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white"><Users size={18} /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[var(--text)]">{tm.name}</p>
                              <p className="truncate text-xs text-[var(--text-dim)]">멤버 {tm.memberCount}명</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {/* 개인 채팅(최근 대화) */}
                    <p className="px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">개인 채팅</p>
                    {threads.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-[var(--text-dim)]">
                        {friends.length === 0 ? '친구를 추가하면 대화를 시작할 수 있어요.' : '친구 탭에서 친구를 눌러 대화를 시작하세요.'}
                      </p>
                    ) : (
                      threads.map((th) => (
                        <button key={th.friendId} onClick={() => openConversation({ type: 'dm', id: th.friendId, name: th.name })}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--panel-2)]">
                          <Avatar name={th.name} seed={th.friendId} size={40} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-[var(--text)]">{th.name}</p>
                              <span className="flex-shrink-0 text-[10px] text-[var(--text-dim)]">{fmtRel(th.lastAt)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-[var(--text-dim)]">{th.lastFromMe ? '나: ' : ''}{th.lastText}</p>
                              {th.unread > 0 && <span className="grid min-h-[18px] min-w-[18px] flex-shrink-0 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{th.unread}</span>}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="p-3">
                    {/* 내 프로필 + 초대코드 */}
                    <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                      <Avatar name={meName} seed={meId || meName} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[var(--text)]">{meName || '나'}</p>
                        {myCode ? (
                          <button onClick={copyCode} className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-[var(--panel-2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-soft)] hover:text-[var(--text)]">
                            내 코드 {myCode} {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        ) : <p className="text-[11px] text-[var(--text-dim)]">내 계정</p>}
                      </div>
                    </div>

                    {/* 친구 추가 (코드) */}
                    <div className="mb-2 flex gap-2">
                      <input
                        value={addCode}
                        onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
                        placeholder="친구 코드로 추가"
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <button onClick={onAddFriend} disabled={addBusy || !addCode.trim()}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50">
                        {addBusy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                      </button>
                    </div>
                    {addMsg && <p className="mb-2 rounded-lg bg-[var(--panel-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)]">{addMsg}</p>}

                    {/* 검색 */}
                    {friends.length > 6 && (
                      <div className="relative mb-2">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                        <input value={friendQuery} onChange={(e) => setFriendQuery(e.target.value)} placeholder="친구 검색"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500" />
                      </div>
                    )}

                    {/* 친구 목록 */}
                    {shownFriends.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[var(--text-dim)]">
                        {friends.length === 0 ? '아직 친구가 없어요. 친구 코드로 추가해 보세요.' : '검색 결과가 없습니다.'}
                      </p>
                    ) : (
                      shownFriends.map((f) => {
                        const th = threadMap.get(f.id)
                        return (
                          <button key={f.id} onClick={() => openConversation({ type: 'dm', id: f.id, name: f.name })}
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--panel-2)]">
                            <Avatar name={f.name} seed={f.id} size={38} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[var(--text)]">{f.name}</p>
                              <p className="truncate text-xs text-[var(--text-dim)]">{f.email}</p>
                            </div>
                            {th && th.unread > 0 && <span className="grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{th.unread}</span>}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
