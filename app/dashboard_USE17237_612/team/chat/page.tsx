'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { MessageCircle, Send, Paperclip, Image as ImageIcon, Film, Users, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'

interface Member {
  id: string
  name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
  ownerId: string
  role: string
  members: Member[]
}

interface Msg {
  id: string
  user_id: string
  name: string
  text: string
  kind: 'text' | 'image' | 'video'
  media_key: string | null
  media_name: string | null
  created_at: string
}

const AVATAR_COLORS = [
  'from-violet-500 to-fuchsia-500',
  'from-sky-500 to-blue-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-violet-500',
  'from-cyan-500 to-sky-500',
  'from-teal-500 to-emerald-500',
]

function avatarClass(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function Avatar({ name, seed, size = 36 }: { name: string; seed: string; size?: number }) {
  return (
    <span
      className={`grid flex-shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarClass(seed)} font-semibold text-white`}
      style={{ height: size, width: size, fontSize: size * 0.4 }}
    >
      {name ? name[0] : '?'}
    </span>
  )
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function TeamChatPage() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [meId, setMeId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const afterRef = useRef('')
  const pollRef = useRef<() => void>(() => {})
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const team = teams.find((t) => t.id === teamId)
  const members = team?.members || []

  // 초기 로드: 내 팀 목록 + 내 정보
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/team', { credentials: 'include' }).then((res) => res.json())
        if (r.ok) {
          const ts: Team[] = r.teams || []
          setTeams(ts)
          setMeId(r.meId || '')
          if (ts.length) setTeamId(ts[0].id)
        }
      } catch {
        /* ignore */
      }
      setLoading(false)
    })()
  }, [])

  // 선택된 팀의 메시지 폴링 (~4초)
  useEffect(() => {
    if (!teamId) return
    afterRef.current = ''
    setMessages([])
    let stopped = false

    async function poll() {
      try {
        const r = await fetch(
          `/api/team?messages=${encodeURIComponent(teamId)}&after=${encodeURIComponent(afterRef.current)}`,
          { credentials: 'include' },
        ).then((res) => res.json())
        if (stopped) return
        if (r.ok && Array.isArray(r.messages) && r.messages.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id))
            const fresh = (r.messages as Msg[]).filter((m) => !seen.has(m.id))
            if (!fresh.length) return prev
            afterRef.current = fresh[fresh.length - 1].created_at
            return [...prev, ...fresh]
          })
        }
      } catch {
        /* ignore transient errors */
      }
    }

    pollRef.current = poll
    poll()
    const iv = setInterval(poll, 4000)
    return () => {
      stopped = true
      clearInterval(iv)
    }
  }, [teamId])

  // 새 메시지마다 하단으로 스크롤
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const refreshSoon = useCallback(() => {
    // 전송 직후 바로 반영
    setTimeout(() => pollRef.current(), 150)
  }, [])

  async function sendText() {
    const text = input.trim()
    if (!text || sending || uploading || !teamId) return
    setSending(true)
    setErr('')
    try {
      const r = await fetch('/api/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', teamId, text }),
      }).then((res) => res.json())
      if (r.ok) {
        setInput('')
        refreshSoon()
      } else {
        setErr(r.error || '메시지 전송에 실패했습니다.')
      }
    } catch {
      setErr('네트워크 오류가 발생했습니다.')
    }
    setSending(false)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !teamId) return
    setUploading(true)
    setErr('')
    try {
      const fd = new FormData()
      fd.append('teamId', teamId)
      fd.append('file', file)
      const up = await fetch('/api/team/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      }).then((res) => res.json())
      if (!up.ok) {
        setErr(up.error || '파일 업로드에 실패했습니다.')
        setUploading(false)
        return
      }
      const caption = input.trim()
      const r = await fetch('/api/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          teamId,
          kind: up.kind,
          mediaKey: up.key,
          mediaName: up.name,
          text: caption,
        }),
      }).then((res) => res.json())
      if (r.ok) {
        setInput('')
        refreshSoon()
      } else {
        setErr(r.error || '전송에 실패했습니다.')
      }
    } catch {
      setErr('업로드 중 오류가 발생했습니다.')
    }
    setUploading(false)
  }

  // ── 로딩 ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          icon={MessageCircle}
          eyebrow="TEAM"
          title="팀 채팅"
          desc="팀원과 실시간으로 메시지와 사진·영상을 주고받으세요."
          accent="#0ea5e9"
        />
        <div className="grid place-items-center p-20 text-[var(--text-dim)]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      </div>
    )
  }

  // ── 팀 없음 ─────────────────────────────────────────────
  if (!teams.length) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          icon={MessageCircle}
          eyebrow="TEAM"
          title="팀 채팅"
          desc="팀원과 실시간으로 메시지와 사진·영상을 주고받으세요."
          accent="#0ea5e9"
        />
        <div className="p-6 lg:p-8">
          <div className="card grid place-items-center gap-4 p-12 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-50 text-sky-500">
              <Users size={30} />
            </span>
            <div>
              <p className="text-lg font-semibold">아직 참여 중인 팀이 없어요</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                팀을 만들고 팀원을 초대하면 팀 채팅을 시작할 수 있어요.
              </p>
            </div>
            <Link
              href="/dashboard_USE17237_612/team/manage"
              className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-105"
            >
              <Users size={16} /> 팀 관리로 이동
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const busy = sending || uploading

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MessageCircle}
        eyebrow="TEAM"
        title="팀 채팅"
        desc="팀원과 실시간으로 메시지와 사진·영상을 주고받으세요."
        accent="#0ea5e9"
        action={
          teams.length > 1 ? (
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm font-medium outline-none focus:border-sky-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[260px_1fr] lg:p-8">
        {/* 사이드바: 팀원 목록 */}
        <div className="space-y-6">
          <div className="card p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              <Users size={13} /> 팀원 · {members.length}명
            </p>
            {members.length === 0 ? (
              <p className="text-sm text-[var(--text-dim)]">팀원이 없습니다.</p>
            ) : (
              <div className="space-y-2.5">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <Avatar name={m.name} seed={m.id} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {m.name}
                        {m.id === meId && <span className="ml-1 text-xs text-sky-500">(나)</span>}
                      </p>
                      <p className="truncate text-xs text-[var(--text-dim)]">{m.role || '멤버'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 채팅 영역 */}
        <div className="card flex h-[640px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
            <MessageCircle size={18} className="text-sky-500" />
            <div>
              <p className="font-semibold">{team?.name}</p>
              <p className="text-xs text-[var(--text-dim)]">{members.length}명 · 팀 채팅</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {members.length < 2 && messages.length === 0 && (
              <div className="grid h-full place-items-center text-center">
                <div className="text-[var(--text-dim)]">
                  <Users size={28} className="mx-auto mb-2 opacity-60" />
                  <p className="text-sm">팀원을 초대하면 대화를 시작할 수 있어요</p>
                </div>
              </div>
            )}

            {members.length >= 2 && messages.length === 0 && (
              <div className="grid h-full place-items-center text-center">
                <div className="text-[var(--text-dim)]">
                  <MessageCircle size={28} className="mx-auto mb-2 opacity-60" />
                  <p className="text-sm">아직 메시지가 없어요. 먼저 인사를 건네보세요!</p>
                </div>
              </div>
            )}

            {messages.map((m) => {
              const mine = m.user_id === meId
              const mediaUrl = m.media_key ? '/api/media/' + m.media_key : ''
              return (
                <div key={m.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                  {!mine && <Avatar name={m.name} seed={m.user_id} />}
                  <div className={`flex max-w-[75%] flex-col ${mine ? 'items-end text-right' : 'items-start'}`}>
                    <div className={`mb-1 flex items-center gap-2 text-xs ${mine ? 'flex-row-reverse' : ''}`}>
                      {!mine && <span className="font-semibold">{m.name}</span>}
                      <span className="text-[var(--text-dim)]">{fmtTime(m.created_at)}</span>
                    </div>

                    {m.kind === 'image' && mediaUrl ? (
                      <div className="flex flex-col gap-1.5">
                        <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaUrl}
                            alt={m.media_name || '이미지'}
                            className="max-w-[260px] cursor-pointer rounded-2xl border border-[var(--border)]"
                          />
                        </a>
                        {m.text && (
                          <div
                            className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                              mine ? 'brand-gradient text-white' : 'bg-[var(--panel-2)] text-[var(--text-soft)]'
                            }`}
                          >
                            {m.text}
                          </div>
                        )}
                      </div>
                    ) : m.kind === 'video' && mediaUrl ? (
                      <div className="flex flex-col gap-1.5">
                        <video
                          src={mediaUrl}
                          controls
                          className="max-w-[280px] rounded-2xl border border-[var(--border)]"
                        />
                        {m.text && (
                          <div
                            className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                              mine ? 'brand-gradient text-white' : 'bg-[var(--panel-2)] text-[var(--text-soft)]'
                            }`}
                          >
                            {m.text}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          mine ? 'brand-gradient text-white' : 'bg-[var(--panel-2)] text-[var(--text-soft)]'
                        }`}
                      >
                        {m.text}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {uploading && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--panel-2)] px-3.5 py-2.5 text-sm text-[var(--text-soft)]">
                  <Loader2 size={15} className="animate-spin" /> 업로드 중…
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* 작성 영역 */}
          <div className="border-t border-[var(--border)] p-3">
            {err && (
              <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{err}</p>
            )}
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                onChange={onFile}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                title="사진·영상 첨부"
                className="grid place-items-center rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-[var(--text-soft)] transition-colors hover:border-sky-500 hover:text-sky-500 disabled:opacity-60"
              >
                <Paperclip size={18} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendText()}
                disabled={busy}
                placeholder="메시지를 입력하세요…"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 disabled:opacity-60"
              />
              <button
                onClick={sendText}
                disabled={busy || !input.trim()}
                className="grid place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 px-4 text-white transition-all hover:brightness-105 disabled:opacity-60"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="mt-2 flex items-center gap-2 pl-1 text-[11px] text-[var(--text-dim)]">
              <ImageIcon size={12} /> 사진 15MB
              <Film size={12} className="ml-1" /> 영상 200MB까지 · 이미지·영상만 첨부할 수 있어요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
