'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  X, Send, Users, UserPlus, Copy, Check, ChevronLeft, Search, Loader2, MessageCircle,
  Settings, Camera, Pencil, Plus,
} from 'lucide-react'
import {
  useAuth, socialOverview, dmMessages, dmSend, dmSeen, teamMessages, teamSend, addFriend,
  setChatProfile, setFriendAlias, uploadChatAvatar, uploadDmMedia, uploadTeamMedia,
  type SocialFriend, type SocialTeam, type SocialThread, type SocialPartner, type ChatMediaOpts,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

/* 고퀄 채팅 말풍선 SVG (그라디언트 + 말풍선 꼬리 + 점 3개) */
function ChatBubbleIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="cd_grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" /><stop offset="0.55" stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M24 6C13 6 4 13.4 4 22.6c0 5.3 3 10 7.8 13-.3 2.2-1.3 4.6-3 6.7-.6.7 0 1.7.9 1.5 3.9-.6 7-2.1 9.3-3.9 1.6.4 3.3.6 5 .6 11 0 20-7.4 20-16.5S35 6 24 6Z" fill="url(#cd_grad)" />
      <circle cx="16" cy="22.6" r="2.4" fill="#fff" /><circle cx="24" cy="22.6" r="2.4" fill="#fff" /><circle cx="32" cy="22.6" r="2.4" fill="#fff" />
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
function Avatar({ name, seed, size = 40, src }: { name: string; seed: string; size?: number; src?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="flex-shrink-0 rounded-full border border-black/5 object-cover" style={{ height: size, width: size }} />
  }
  return (
    <span className={`grid flex-shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarClass(seed)} font-bold text-white`}
      style={{ height: size, width: size, fontSize: size * 0.4 }}>
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
function dayLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  } catch { return '' }
}
function dayKey(iso: string) {
  try {
    const d = new Date(iso); const k = new Date(d.getTime() + 9 * 3600000)
    return k.toISOString().slice(0, 10)
  } catch { return iso.slice(0, 10) }
}

// 프로필 사진을 256px 정사각형 JPEG 로 축소(중앙 크롭)
async function toAvatarBlob(file: File): Promise<{ blob: Blob; type: string }> {
  try {
    const bmp = await createImageBitmap(file)
    const S = 256
    const side = Math.min(bmp.width, bmp.height)
    const sx = (bmp.width - side) / 2, sy = (bmp.height - side) / 2
    const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('ctx')
    ctx.drawImage(bmp, sx, sy, side, side, 0, 0, S, S)
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.86))
    if (!blob) throw new Error('encode')
    return { blob, type: 'image/jpeg' }
  } catch {
    return { blob: file, type: /^image\//i.test(file.type) ? file.type : 'image/jpeg' }
  }
}

// 통합 메시지 표현
interface UiMsg { id: string; mine: boolean; name: string; text: string; at: string; unread?: boolean; avatar?: string; kind?: string; mediaUrl?: string; mediaName?: string }
type Active = { type: 'dm'; id: string; name: string } | { type: 'team'; id: string; name: string }
type View = 'list' | 'chat' | 'settings' | 'profile'

export function ChatDock() {
  const { user, ready } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('list')
  const [tab, setTab] = useState<'friends' | 'chats'>('chats')

  const [meId, setMeId] = useState('')
  const [meName, setMeName] = useState('')
  const [myCode, setMyCode] = useState('')
  const [myAvatar, setMyAvatar] = useState('')
  const [myStatus, setMyStatus] = useState('')
  const [friends, setFriends] = useState<SocialFriend[]>([])
  const [teams, setTeams] = useState<SocialTeam[]>([])
  const [threads, setThreads] = useState<SocialThread[]>([])
  const [totalUnread, setTotalUnread] = useState(0)

  const [active, setActive] = useState<Active | null>(null)
  const [partner, setPartner] = useState<SocialPartner | null>(null)
  const [messages, setMessages] = useState<UiMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const [friendQuery, setFriendQuery] = useState('')
  const [addCode, setAddCode] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addMsg, setAddMsg] = useState('')
  const [copied, setCopied] = useState(false)

  // 설정(내 프로필) 폼
  const [pfAvatar, setPfAvatar] = useState('')
  const [pfStatus, setPfStatus] = useState('')
  const [pfSaving, setPfSaving] = useState(false)
  const [pfUploading, setPfUploading] = useState(false)
  const [pfMsg, setPfMsg] = useState('')
  const avatarFileRef = useRef<HTMLInputElement>(null)

  // 친구 프로필/별명
  const [aliasInput, setAliasInput] = useState('')
  const [aliasSaving, setAliasSaving] = useState(false)

  const afterRef = useRef('')
  const lastIdRef = useRef('')
  const endRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<Active | null>(null)
  activeRef.current = active

  const loggedIn = ready && !!user

  const loadOverview = useCallback(async () => {
    const d = await socialOverview()
    if (!d.ok) return
    setMeId(d.meId || ''); setMeName(d.meName || ''); setMyCode(d.myCode || '')
    setMyAvatar(d.myAvatar || ''); setMyStatus(d.myStatus || '')
    setFriends(d.friends); setTeams(d.teams); setThreads(d.threads); setTotalUnread(d.totalUnread)
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    loadOverview()
    const iv = setInterval(loadOverview, 10000)
    return () => clearInterval(iv)
  }, [loggedIn, loadOverview])

  // 대화 폴링 — DM 은 전체 재조회(읽음표시 라이브), 팀은 증분
  useEffect(() => {
    if (!active) return
    afterRef.current = ''; lastIdRef.current = ''
    setMessages([]); setLoadingMsgs(true)
    let stopped = false

    async function poll() {
      const cur = activeRef.current
      if (!cur) return
      try {
        if (cur.type === 'dm') {
          const d = await dmMessages(cur.id, '', true)
          if (stopped || activeRef.current?.id !== cur.id) return
          if (d.partner) setPartner(d.partner)
          if (d.ok) {
            const mid = d.meId || meId
            setMessages(d.messages.map((m) => ({
              id: m.id, mine: m.from_id === mid, name: cur.name, text: m.text, at: m.created_at,
              unread: m.from_id === mid && m.read_to === 0,
              kind: m.kind || 'text', mediaUrl: m.media_key ? '/api/media/' + m.media_key : '', mediaName: m.media_name || '',
            })))
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
              return [...prev, ...fresh.map((m) => ({
                id: m.id, mine: m.user_id === mid, name: m.name || '멤버', text: m.text, at: m.created_at,
                kind: m.kind || 'text', mediaUrl: m.media_key ? '/api/media/' + m.media_key : '', mediaName: m.media_name || '',
              }))]
            })
          }
        }
      } catch { /* ignore */ }
      finally { if (!stopped) setLoadingMsgs(false) }
    }
    poll()
    const iv = setInterval(poll, 4000)
    return () => { stopped = true; clearInterval(iv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.type, active?.id])

  // 최신 메시지가 바뀔 때만 하단 스크롤
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last && last.id !== lastIdRef.current) {
      lastIdRef.current = last.id
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  function openConversation(a: Active, p?: SocialPartner | null) {
    setActive(a); setView('chat'); setPartner(p || null)
    if (a.type === 'dm') {
      dmSeen(a.id).catch(() => {})
      const unread = threads.find((t) => t.friendId === a.id)?.unread || 0
      setThreads((prev) => prev.map((t) => (t.friendId === a.id ? { ...t, unread: 0 } : t)))
      setTotalUnread((n) => Math.max(0, n - unread))
    }
  }

  function backToList() { setActive(null); setPartner(null); setView('list') }

  async function onSend() {
    const text = input.trim()
    if (!text || sending || !active) return
    setSending(true)
    const cur = active
    const tempId = 'tmp_' + Date.now()
    setMessages((prev) => [...prev, { id: tempId, mine: true, name: meName || '나', text, at: new Date().toISOString(), unread: cur.type === 'dm' }])
    setInput('')
    try {
      const res = cur.type === 'dm' ? await dmSend(cur.id, text) : await teamSend(cur.id, text)
      if (res.ok) { if (res.id) setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: res.id! } : m))) }
      else { setMessages((prev) => prev.filter((m) => m.id !== tempId)); setInput(text); alert(res.error || '전송에 실패했습니다.') }
    } catch { setMessages((prev) => prev.filter((m) => m.id !== tempId)); setInput(text); alert('네트워크 오류가 발생했습니다.') }
    setSending(false)
  }

  // 사진·영상 첨부 (개인/단체 공용)
  async function onAttach(file: File) {
    const cur = active
    if (!cur || uploading) return
    setUploading(true)
    try {
      const up = cur.type === 'dm' ? await uploadDmMedia(cur.id, file) : await uploadTeamMedia(cur.id, file)
      if (!up.ok || !up.key || !up.kind) { alert(up.error || '업로드에 실패했습니다.'); setUploading(false); return }
      const caption = input.trim()
      const media: ChatMediaOpts = { kind: up.kind, mediaKey: up.key, mediaName: up.name }
      const tempId = 'tmp_' + Date.now()
      setMessages((prev) => [...prev, {
        id: tempId, mine: true, name: meName || '나', text: caption, at: new Date().toISOString(),
        unread: cur.type === 'dm', kind: up.kind, mediaUrl: '/api/media/' + up.key, mediaName: up.name || '',
      }])
      setInput('')
      const res = cur.type === 'dm' ? await dmSend(cur.id, caption, media) : await teamSend(cur.id, caption, media)
      if (res.ok) { if (res.id) setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: res.id! } : m))) }
      else { setMessages((prev) => prev.filter((m) => m.id !== tempId)); alert(res.error || '전송에 실패했습니다.') }
    } catch { alert('업로드 중 오류가 발생했습니다.') }
    setUploading(false)
  }

  async function onAddFriend() {
    const code = addCode.trim()
    if (!code || addBusy) return
    setAddBusy(true); setAddMsg('')
    const r = await addFriend(code)
    setAddBusy(false)
    if (r.ok) { setAddMsg(r.already ? '이미 친구입니다.' : `${r.friend?.name || ''}님을 친구로 추가했어요.`); setAddCode(''); loadOverview() }
    else setAddMsg(r.error || '친구 추가에 실패했습니다.')
  }

  function copyCode() {
    if (!myCode) return
    try { navigator.clipboard?.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  // 설정 화면 열기
  function openSettings() { setPfAvatar(myAvatar); setPfStatus(myStatus); setPfMsg(''); setView('settings') }
  async function onAvatarPick(file: File) {
    setPfUploading(true); setPfMsg('')
    const enc = await toAvatarBlob(file)
    const r = await uploadChatAvatar(enc.blob, enc.type)
    setPfUploading(false)
    if (r.ok && r.url) setPfAvatar(r.url)
    else setPfMsg(r.error || '사진 업로드에 실패했어요.')
  }
  async function onSaveProfile() {
    setPfSaving(true); setPfMsg('')
    const r = await setChatProfile(pfAvatar, pfStatus)
    setPfSaving(false)
    if (r.ok) { setMyAvatar(pfAvatar); setMyStatus(pfStatus); setPfMsg('저장되었습니다.'); loadOverview(); setTimeout(() => setView('list'), 500) }
    else setPfMsg(r.error || '저장에 실패했어요.')
  }

  // 친구 프로필 열기(별명 편집)
  function openProfile() {
    if (!active || active.type !== 'dm') return
    setAliasInput(partner?.alias || '')
    setView('profile')
  }
  async function onSaveAlias() {
    if (!active || active.type !== 'dm') return
    setAliasSaving(true)
    const r = await setFriendAlias(active.id, aliasInput.trim())
    setAliasSaving(false)
    if (r.ok) {
      const nn = r.nickname || ''
      const display = nn || partner?.name || active.name
      setActive({ ...active, name: display })
      setPartner((p) => (p ? { ...p, alias: nn } : p))
      setFriends((prev) => prev.map((f) => (f.id === active.id ? { ...f, alias: nn, name: nn || f.realName || f.name } : f)))
      setThreads((prev) => prev.map((t) => (t.friendId === active.id ? { ...t, alias: nn, name: nn || t.realName || t.name } : t)))
      setView('chat')
    } else alert(r.error || '별명 저장에 실패했어요.')
  }

  if (!loggedIn) return null

  const shownFriends = friendQuery.trim()
    ? friends.filter((f) => ((f.name || '') + ' ' + (f.realName || '') + ' ' + f.email).toLowerCase().includes(friendQuery.trim().toLowerCase()))
    : friends
  const threadMap = new Map(threads.map((t) => [t.friendId, t]))
  const headerAvatar = partner?.avatar || (active ? threadMap.get(active.id)?.avatar : '') || ''

  return (
    <>
      {!open && (
        <button onClick={() => { setOpen(true); setView('list') }} aria-label="채팅 열기"
          className="fixed bottom-5 right-5 z-[120] grid h-14 w-14 place-items-center rounded-full bg-[var(--bg-soft)] shadow-[0_8px_30px_rgba(59,130,246,0.35)] ring-1 ring-[var(--border)] transition-transform hover:scale-105 active:scale-95">
          <ChatBubbleIcon size={34} />
          {totalUnread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-h-[20px] min-w-[20px] place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-[var(--bg-soft)]">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[120] flex h-[600px] max-h-[calc(100vh-2.5rem)] w-[384px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 px-3.5 py-3 text-white">
            {view === 'chat' && active ? (
              <>
                <button onClick={backToList} className="rounded-lg p-1 hover:bg-white/15" aria-label="뒤로"><ChevronLeft size={20} /></button>
                <button onClick={openProfile} disabled={active.type !== 'dm'} className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default">
                  {active.type === 'dm'
                    ? <Avatar name={active.name} seed={active.id} size={30} src={headerAvatar} />
                    : <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-white/20"><Users size={16} /></span>}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{active.name}</p>
                    <p className="truncate text-[11px] text-white/80">{active.type === 'team' ? '단체 채팅' : (partner?.status || '개인 채팅')}</p>
                  </div>
                </button>
              </>
            ) : view === 'settings' ? (
              <><button onClick={() => setView('list')} className="rounded-lg p-1 hover:bg-white/15" aria-label="뒤로"><ChevronLeft size={20} /></button><p className="flex-1 text-sm font-bold">프로필 설정</p></>
            ) : view === 'profile' ? (
              <><button onClick={() => setView('chat')} className="rounded-lg p-1 hover:bg-white/15" aria-label="뒤로"><ChevronLeft size={20} /></button><p className="flex-1 text-sm font-bold">친구 정보</p></>
            ) : (
              <>
                <ChatBubbleIcon size={22} />
                <p className="flex-1 text-sm font-bold">채팅</p>
                <button onClick={openSettings} className="rounded-lg p-1 hover:bg-white/15" aria-label="프로필 설정"><Settings size={18} /></button>
              </>
            )}
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/15" aria-label="닫기"><X size={19} /></button>
          </div>

          {/* 본문 */}
          {view === 'chat' && active ? (
            <ChatView
              messages={messages} loading={loadingMsgs} isTeam={active.type === 'team'}
              input={input} setInput={setInput} onSend={onSend} sending={sending} endRef={endRef}
              onAttach={onAttach} uploading={uploading}
            />
          ) : view === 'settings' ? (
            <div className="flex-1 overflow-y-auto bg-[var(--bg)] p-5">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar name={meName} seed={meId || meName} size={92} src={pfAvatar} />
                  <button onClick={() => avatarFileRef.current?.click()} disabled={pfUploading}
                    className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-blue-500 text-white shadow ring-2 ring-[var(--bg)] hover:brightness-105 disabled:opacity-60" aria-label="사진 변경">
                    {pfUploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                  </button>
                  <input ref={avatarFileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) onAvatarPick(f) }} />
                </div>
                {pfAvatar && <button onClick={() => setPfAvatar('')} className="text-xs text-[var(--text-dim)] underline">기본 이미지로</button>}
              </div>
              <div className="mt-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">이름</label>
                  <input value={meName} disabled className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text-dim)]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">상태 메시지</label>
                  <input value={pfStatus} onChange={(e) => setPfStatus(e.target.value)} maxLength={120} placeholder="상태 메시지를 입력하세요"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                {myCode && (
                  <button onClick={copyCode} className="inline-flex items-center gap-1 rounded-lg bg-[var(--panel-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:text-[var(--text)]">
                    내 친구코드 {myCode} {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                )}
                {pfMsg && <p className="rounded-lg bg-[var(--panel-2)] px-3 py-2 text-xs font-medium text-[var(--text-soft)]">{pfMsg}</p>}
                <button onClick={onSaveProfile} disabled={pfSaving || pfUploading}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                  {pfSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 저장
                </button>
              </div>
            </div>
          ) : view === 'profile' && active ? (
            <div className="flex-1 overflow-y-auto bg-[var(--bg)] p-5">
              <div className="flex flex-col items-center gap-2 pt-2">
                <Avatar name={partner?.name || active.name} seed={active.id} size={92} src={partner?.avatar} />
                <p className="mt-1 text-lg font-bold text-[var(--text)]">{active.name}</p>
                {partner?.alias && <p className="text-xs text-[var(--text-dim)]">본명 {partner?.name}</p>}
                {partner?.status && <p className="mt-0.5 text-sm text-[var(--text-soft)]">{partner.status}</p>}
                {partner?.email && <p className="mt-0.5 text-xs text-[var(--text-dim)]">{partner.email}</p>}
              </div>
              <div className="mt-5">
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-[var(--text-dim)]"><Pencil size={12} /> 별명 (나에게만 보여요)</label>
                <div className="flex gap-2">
                  <input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} maxLength={40}
                    placeholder={partner?.name || '별명 입력'} onKeyDown={(e) => e.key === 'Enter' && onSaveAlias()}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  <button onClick={onSaveAlias} disabled={aliasSaving}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                    {aliasSaving ? <Loader2 size={15} className="animate-spin" /> : '저장'}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-dim)]">비우고 저장하면 별명이 해제됩니다.</p>
              </div>
              <button onClick={() => setView('chat')}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-soft)] hover:bg-[var(--panel-2)]">
                <MessageCircle size={16} /> 대화로 돌아가기
              </button>
            </div>
          ) : (
            <>
              {/* 탭 */}
              <div className="flex border-b border-[var(--border)] bg-[var(--bg-soft)]">
                {([['chats', '채팅'], ['friends', '친구']] as ['chats' | 'friends', string][]).map(([t, l]) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={cn('flex-1 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors', tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]')}>
                    {l}{t === 'friends' && <span className="ml-1 text-xs text-[var(--text-dim)]">{friends.length}</span>}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
                {tab === 'chats' ? (
                  <div className="p-2">
                    {teams.length > 0 && (
                      <>
                        <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">단체 채팅</p>
                        {teams.map((tm) => (
                          <button key={tm.id} onClick={() => openConversation({ type: 'team', id: tm.id, name: tm.name })}
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--panel-2)]">
                            <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white"><Users size={19} /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[var(--text)]">{tm.name}</p>
                              <p className="truncate text-xs text-[var(--text-dim)]">멤버 {tm.memberCount}명</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    <p className="px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">개인 채팅</p>
                    {threads.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-[var(--text-dim)]">
                        {friends.length === 0 ? '친구를 추가하면 대화를 시작할 수 있어요.' : '친구 탭에서 친구를 눌러 대화를 시작하세요.'}
                      </p>
                    ) : threads.map((th) => (
                      <button key={th.friendId} onClick={() => openConversation({ type: 'dm', id: th.friendId, name: th.name })}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--panel-2)]">
                        <Avatar name={th.name} seed={th.friendId} size={44} src={th.avatar} />
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
                    ))}
                  </div>
                ) : (
                  <div className="p-3">
                    {/* 내 프로필 카드 */}
                    <button onClick={openSettings} className="mb-3 flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-left transition hover:border-blue-300">
                      <Avatar name={meName} seed={meId || meName} size={46} src={myAvatar} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[var(--text)]">{meName || '나'}</p>
                        <p className="truncate text-xs text-[var(--text-dim)]">{myStatus || '상태 메시지를 설정해보세요'}</p>
                      </div>
                      <Settings size={16} className="flex-shrink-0 text-[var(--text-dim)]" />
                    </button>

                    <div className="mb-2 flex gap-2">
                      <input value={addCode} onChange={(e) => setAddCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
                        placeholder="친구 코드로 추가" className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-blue-500" />
                      <button onClick={onAddFriend} disabled={addBusy || !addCode.trim()}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50">
                        {addBusy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                      </button>
                    </div>
                    {addMsg && <p className="mb-2 rounded-lg bg-[var(--panel-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)]">{addMsg}</p>}

                    {friends.length > 6 && (
                      <div className="relative mb-2">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                        <input value={friendQuery} onChange={(e) => setFriendQuery(e.target.value)} placeholder="친구 검색"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500" />
                      </div>
                    )}

                    <p className="px-1 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">친구 {friends.length}</p>
                    {shownFriends.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[var(--text-dim)]">
                        {friends.length === 0 ? '아직 친구가 없어요. 친구 코드로 추가해 보세요.' : '검색 결과가 없습니다.'}
                      </p>
                    ) : shownFriends.map((f) => {
                      const th = threadMap.get(f.id)
                      return (
                        <button key={f.id} onClick={() => openConversation({ type: 'dm', id: f.id, name: f.name })}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--panel-2)]">
                          <Avatar name={f.name} seed={f.id} size={40} src={f.avatar} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--text)]">{f.name}</p>
                            <p className="truncate text-xs text-[var(--text-dim)]">{f.status || f.email}</p>
                          </div>
                          {th && th.unread > 0 && <span className="grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{th.unread}</span>}
                        </button>
                      )
                    })}
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

/* 채팅 말풍선 안쪽 — 텍스트/사진/영상 */
function Bubble({ m }: { m: UiMsg }) {
  const hasCaption = !!m.text
  if (m.kind === 'image' && m.mediaUrl) {
    return (
      <div className={cn('flex flex-col gap-1', m.mine ? 'items-end' : 'items-start')}>
        <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.mediaUrl} alt={m.mediaName || '사진'} className="max-h-56 max-w-[220px] cursor-pointer object-cover" />
        </a>
        {hasCaption && <span className={cn('whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm', m.mine ? 'bg-blue-500 text-white' : 'border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)]')}>{m.text}</span>}
      </div>
    )
  }
  if (m.kind === 'video' && m.mediaUrl) {
    return (
      <div className={cn('flex flex-col gap-1', m.mine ? 'items-end' : 'items-start')}>
        <video src={m.mediaUrl} controls playsInline className="max-h-60 max-w-[240px] rounded-2xl border border-[var(--border)] bg-black" />
        {hasCaption && <span className={cn('whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm', m.mine ? 'bg-blue-500 text-white' : 'border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)]')}>{m.text}</span>}
      </div>
    )
  }
  return (
    <div className={cn('whitespace-pre-wrap break-words px-3 py-2 text-sm leading-relaxed shadow-sm',
      m.mine ? 'rounded-2xl rounded-tr-md bg-blue-500 text-white' : 'rounded-2xl rounded-tl-md border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text)]')}>
      {m.text}
    </div>
  )
}

/* 대화 화면 — 날짜 구분선 + 연속 메시지 그룹핑 + 읽음 표시 + 사진/영상 첨부 */
function ChatView({
  messages, loading, isTeam, input, setInput, onSend, sending, endRef, onAttach, uploading,
}: {
  messages: UiMsg[]; loading: boolean; isTeam: boolean
  input: string; setInput: (v: string) => void; onSend: () => void; sending: boolean
  endRef: React.RefObject<HTMLDivElement>
  onAttach: (f: File) => void; uploading: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const busy = sending || uploading
  return (
    <>
      <div className="flex-1 space-y-1 overflow-y-auto bg-[var(--bg)] p-3">
        {loading && messages.length === 0 ? (
          <div className="grid h-full place-items-center text-[var(--text-dim)]"><Loader2 size={22} className="animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-[var(--text-dim)]">
            <div><MessageCircle size={26} className="mx-auto mb-2 opacity-60" /> 먼저 인사를 건네보세요!</div>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const showDay = !prev || dayKey(prev.at) !== dayKey(m.at)
            const grouped = !!prev && !showDay && prev.mine === m.mine && (isTeam ? prev.name === m.name : true)
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-2 flex items-center justify-center">
                    <span className="rounded-full bg-[var(--panel-2)] px-3 py-1 text-[11px] font-medium text-[var(--text-dim)]">{dayLabel(m.at)}</span>
                  </div>
                )}
                <div className={cn('flex gap-2', m.mine ? 'flex-row-reverse' : '', grouped ? 'mt-0.5' : 'mt-2')}>
                  {!m.mine && (grouped ? <span className="w-[30px] flex-shrink-0" /> : <Avatar name={m.name} seed={m.name} size={30} />)}
                  <div className={cn('flex max-w-[78%] flex-col', m.mine ? 'items-end' : 'items-start')}>
                    {!m.mine && !grouped && isTeam && <span className="mb-0.5 pl-1 text-[11px] font-semibold text-[var(--text-soft)]">{m.name}</span>}
                    <div className={cn('flex items-end gap-1', m.mine ? 'flex-row' : 'flex-row-reverse')}>
                      <div className="flex flex-col items-end leading-none">
                        {m.mine && m.unread && <span className="mb-0.5 text-[10px] font-bold text-amber-500">1</span>}
                        <span className="text-[10px] text-[var(--text-dim)]">{fmtTime(m.at)}</span>
                      </div>
                      <Bubble m={m} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-soft)] p-2.5">
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) onAttach(f) }} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} title="사진·영상 첨부"
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)] transition hover:border-blue-500 hover:text-blue-500 disabled:opacity-50" aria-label="첨부">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
        </button>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          placeholder="메시지 입력…" className="flex-1 rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-sm outline-none focus:border-blue-500" />
        <button onClick={onSend} disabled={busy || !input.trim()}
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-blue-500 text-white transition hover:brightness-105 disabled:opacity-50" aria-label="보내기">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </>
  )
}
