'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { MessageCircle, Send, Paperclip, Image as ImageIcon, Film, Users, Loader2, AlertCircle, X } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState } from '@/components/dash/Kit'
import { kstDate, kstLong } from '@/lib/time'
import { isImeEnter } from '@/lib/utils'

const ACCENT = '#0ea5e9'

/** 서버(functions/api/team/upload.ts)와 같은 한도 — 올리기 전에 미리 걸러낸다 */
const MAX_IMG = 15 * 1024 * 1024
const MAX_VID = 200 * 1024 * 1024
const IMG_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']
const VID_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

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

type ChatRow = { type: 'day'; key: string; label: string } | { type: 'msg'; key: string; msg: Msg }

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

function roleLabel(role: string) {
  if (role === 'owner') return '소유자'
  if (role === 'admin') return '관리자'
  return '멤버'
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function humanSize(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`
  return `${Math.round(n / 1024)}KB`
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
  const members = useMemo(() => team?.members || [], [team])

  // 초기 로드: 내 팀 목록 + 내 정보
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/team', { credentials: 'include' }).then((res) => res.json())
        if (r.ok) {
          const ts: Team[] = r.teams || []
          setTeams(ts)
          setMeId(String(r.meId || ''))
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
          const incoming = r.messages as Msg[]
          // 서버 조회는 created_at > after 라, 같은 시각에 들어온 두 번째 메시지가
          // 영영 조회되지 않는 구멍이 있었다. 커서를 1초 뒤로 물려 겹쳐 받고
          // 중복은 아래 id 집합으로 걸러낸다.
          const newest = incoming[incoming.length - 1].created_at
          const t = Date.parse(newest)
          afterRef.current = Number.isNaN(t) ? newest : new Date(t - 1000).toISOString()

          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id))
            const fresh = incoming.filter((m) => !seen.has(m.id))
            if (!fresh.length) return prev
            return [...prev, ...fresh]
          })
        }
      } catch {
        /* 일시적 오류는 다음 폴링에서 회복된다 */
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const refreshSoon = useCallback(() => {
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

    // 올리기 전에 형식·용량을 먼저 본다 (예전엔 200MB를 다 올린 뒤 서버가 거절했다)
    const ct = (file.type || '').toLowerCase()
    const isImg = IMG_TYPES.includes(ct)
    const isVid = VID_TYPES.includes(ct)
    if (!isImg && !isVid) {
      setErr('사진(PNG·JPG·GIF·WebP·AVIF) 또는 영상(MP4·WebM·MOV)만 첨부할 수 있습니다.')
      return
    }
    if (isImg && file.size > MAX_IMG) {
      setErr(`사진은 최대 15MB까지 첨부할 수 있습니다. (선택한 파일 ${humanSize(file.size)})`)
      return
    }
    if (isVid && file.size > MAX_VID) {
      setErr(`영상은 최대 200MB까지 첨부할 수 있습니다. (선택한 파일 ${humanSize(file.size)})`)
      return
    }

    setUploading(true)
    setErr('')
    try {
      const fd = new FormData()
      fd.append('teamId', teamId)
      fd.append('file', file)
      const up = await fetch('/api/team/upload', { method: 'POST', credentials: 'include', body: fd }).then((res) => res.json())
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
        body: JSON.stringify({ action: 'send', teamId, kind: up.kind, mediaKey: up.key, mediaName: up.name, text: caption }),
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

  // 날짜가 바뀌는 첫 메시지 앞에 구분선을 넣는다
  const rows = useMemo(() => {
    const out: ChatRow[] = []
    let lastDay = ''
    for (const m of messages) {
      const day = kstDate(m.created_at)
      if (day !== lastDay) {
        // "2026년 7월 27일 (월)" 에서 연도·시각을 뺀 "7월 27일 (월)" 로 보여준다
        const label = kstLong(m.created_at).replace(/^\d{4}년 /, '').replace(/ \d{2}:\d{2}$/, '')
        out.push({ type: 'day', key: `d-${day}-${m.id}`, label })
        lastDay = day
      }
      out.push({ type: 'msg', key: m.id, msg: m })
    }
    return out
  }, [messages])

  const header = (
    <PageHeader
      icon={MessageCircle}
      eyebrow="TEAM"
      title="팀 채팅"
      desc="팀원과 실시간으로 메시지와 사진·영상을 주고받으세요."
      accent={ACCENT}
      action={
        teams.length > 1 ? (
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm font-medium outline-none focus:border-sky-500"
            aria-label="팀 선택"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        ) : undefined
      }
    />
  )

  if (loading) {
    return (
      <div className="animate-fade-in">
        {header}
        <div className="grid place-items-center gap-2 p-20 text-[var(--text-dim)]">
          <Loader2 className="animate-spin" size={26} />
          <p className="text-sm">불러오는 중…</p>
        </div>
      </div>
    )
  }

  if (!teams.length) {
    return (
      <div className="animate-fade-in">
        {header}
        <div className="p-5 pb-24 lg:p-7 lg:pb-24">
          <Card title="팀 채팅">
            <EmptyState
              icon={Users}
              title="아직 참여 중인 팀이 없습니다"
              hint="팀을 만들고 팀원을 초대하면 팀 채팅을 시작할 수 있습니다."
              action={
                <Link
                  href="/dashboard_USE17237_612/team/manage"
                  className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:brightness-105"
                >
                  <Users size={15} /> 팀 관리로 이동
                </Link>
              }
            />
          </Card>
        </div>
      </div>
    )
  }

  const busy = sending || uploading

  return (
    <div className="animate-fade-in">
      {header}

      <div className="grid gap-5 p-5 pb-24 lg:grid-cols-[260px_minmax(0,1fr)] lg:p-7 lg:pb-24">
        {/* 팀원 */}
        <Card title="팀원" desc={`${members.length}명`} bodyClassName="p-3" className="self-start">
          {members.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12.5px] text-[var(--text-dim)]">팀원이 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--panel-2)]">
                  <Avatar name={m.name} seed={m.id} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                      {m.name}
                      {m.id === meId && (
                        <span className="flex-shrink-0 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-500">나</span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-dim)]">{roleLabel(m.role)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {members.length < 2 && (
            <Link
              href="/dashboard_USE17237_612/team/manage"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] px-3 py-2.5 text-[12px] font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)]"
            >
              <Users size={13} /> 팀원 초대하기
            </Link>
          )}
        </Card>

        {/* 대화 */}
        <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-3.5">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-500">
              <MessageCircle size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold">{team?.name}</p>
              <p className="text-[11.5px] text-[var(--text-dim)]">{members.length}명 · 4초마다 새 메시지를 확인합니다</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div className="text-[var(--text-dim)]">
                  {members.length < 2 ? (
                    <>
                      <Users size={26} className="mx-auto mb-2 opacity-60" />
                      <p className="text-[13px]">팀원을 초대하면 대화를 시작할 수 있습니다</p>
                    </>
                  ) : (
                    <>
                      <MessageCircle size={26} className="mx-auto mb-2 opacity-60" />
                      <p className="text-[13px]">아직 메시지가 없습니다. 먼저 인사를 건네보세요!</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              rows.map((row) => {
                if (row.type === 'day') {
                  return (
                    <div key={row.key} className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-[var(--border)]" />
                      <span className="flex-shrink-0 rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-dim)]">
                        {row.label}
                      </span>
                      <span className="h-px flex-1 bg-[var(--border)]" />
                    </div>
                  )
                }
                const m = row.msg
                const mine = String(m.user_id) === meId
                const mediaUrl = m.media_key ? `/api/media/${m.media_key}` : ''
                const bubble = mine
                  ? 'brand-gradient rounded-br-sm text-white'
                  : 'rounded-bl-sm bg-[var(--panel-2)] text-[var(--text-soft)]'
                return (
                  <div key={row.key} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                    {!mine && <Avatar name={m.name} seed={m.user_id} />}
                    <div className={`flex max-w-[75%] flex-col ${mine ? 'items-end text-right' : 'items-start'}`}>
                      <div className={`mb-1 flex items-center gap-2 text-[11px] ${mine ? 'flex-row-reverse' : ''}`}>
                        {!mine && <span className="font-bold">{m.name}</span>}
                        <span className="text-[var(--text-dim)]">{fmtTime(m.created_at)}</span>
                      </div>

                      {m.kind === 'image' && mediaUrl ? (
                        <div className="flex flex-col gap-1.5">
                          <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mediaUrl} alt={m.media_name || '이미지'} className="max-w-[260px] cursor-pointer rounded-2xl border border-[var(--border)]" />
                          </a>
                          {m.text && <div className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${bubble}`}>{m.text}</div>}
                        </div>
                      ) : m.kind === 'video' && mediaUrl ? (
                        <div className="flex flex-col gap-1.5">
                          <video src={mediaUrl} controls preload="metadata" className="max-w-[280px] rounded-2xl border border-[var(--border)]" />
                          {m.text && <div className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${bubble}`}>{m.text}</div>}
                        </div>
                      ) : (
                        <div className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${bubble}`}>{m.text}</div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {uploading && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--panel-2)] px-3.5 py-2.5 text-[13px] text-[var(--text-soft)]">
                  <Loader2 size={15} className="animate-spin" /> 업로드 중…
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* 작성 */}
          <div className="border-t border-[var(--border)] p-3">
            {err && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/12 px-3 py-2 text-[12px] text-rose-500">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                <span className="flex-1">{err}</span>
                <button onClick={() => setErr('')} className="flex-shrink-0 rounded p-0.5 hover:bg-rose-500/20" aria-label="닫기">
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                title="사진·영상 첨부"
                aria-label="사진·영상 첨부"
                className="grid place-items-center rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 text-[var(--text-soft)] transition-colors hover:border-sky-500 hover:text-sky-500 disabled:opacity-60"
              >
                <Paperclip size={18} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isImeEnter(e)) sendText()
                }}
                disabled={busy}
                placeholder="메시지를 입력하세요…"
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 disabled:opacity-60"
              />
              <button
                onClick={sendText}
                disabled={busy || !input.trim()}
                aria-label="전송"
                className="grid place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 px-4 text-white transition-all hover:brightness-105 disabled:opacity-60"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-[11px] text-[var(--text-dim)]">
              <span className="inline-flex items-center gap-1"><ImageIcon size={12} /> 사진 15MB</span>
              <span className="inline-flex items-center gap-1"><Film size={12} /> 영상 200MB</span>
              <span>이미지·영상만 첨부할 수 있습니다</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
