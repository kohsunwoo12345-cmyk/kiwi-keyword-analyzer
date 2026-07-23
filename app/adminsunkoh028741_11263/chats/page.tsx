'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessagesSquare, Users, User, RefreshCw, X, Search, Loader2, Image as ImageIcon, Film, MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import {
  adminChatList, adminChatMessages,
  type AdminChatTeam, type AdminChatDm, type AdminChatMsg, type AdminChatConversation,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

const kst = (iso?: string) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
const kstTime = (iso?: string) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
const dayKey = (iso: string) => {
  try { const k = new Date(new Date(iso).getTime() + 9 * 3600000); return k.toISOString().slice(0, 10) } catch { return iso.slice(0, 10) }
}
const dayLabel = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) } catch { return '' }
}
const num = (n: number) => (n || 0).toLocaleString('ko-KR')

const AVATAR = ['from-violet-500 to-fuchsia-500', 'from-sky-500 to-blue-500', 'from-emerald-500 to-green-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-indigo-500 to-violet-500', 'from-cyan-500 to-sky-500', 'from-teal-500 to-emerald-500']
function avatarClass(key: string) { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0; return AVATAR[h % AVATAR.length] }
function Avatar({ name, seed, size = 34 }: { name: string; seed: string; size?: number }) {
  return <span className={`grid flex-shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarClass(seed)} font-bold text-white`} style={{ height: size, width: size, fontSize: size * 0.42 }}>{name ? name[0].toUpperCase() : '?'}</span>
}

export default function AdminChatsPage() {
  const [tab, setTab] = useState<'team' | 'dm'>('team')
  const [teams, setTeams] = useState<AdminChatTeam[]>([])
  const [dms, setDms] = useState<AdminChatDm[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const [open, setOpen] = useState<{ type: 'team' | 'dm'; id: string } | null>(null)
  const [conv, setConv] = useState<AdminChatConversation | null>(null)
  const [messages, setMessages] = useState<AdminChatMsg[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  function load() {
    setLoading(true)
    adminChatList().then((d) => { setTeams(d.teams); setDms(d.dms); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  function openConv(type: 'team' | 'dm', id: string) {
    setOpen({ type, id }); setConv(null); setMessages([]); setDetailLoading(true)
    adminChatMessages(type, id).then((d) => { setConv(d.conversation || null); setMessages(d.messages); setDetailLoading(false) })
  }

  const shownTeams = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => (t.name + ' ' + t.lastText).toLowerCase().includes(q))
  }, [teams, query])
  const shownDms = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return dms
    return dms.filter((d) => (d.name + ' ' + d.lastText).toLowerCase().includes(q))
  }, [dms, query])

  const totalTeamMsgs = teams.reduce((s, t) => s + t.msgCount, 0)
  const totalDmMsgs = dms.reduce((s, d) => s + d.msgCount, 0)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={MessagesSquare}
        eyebrow="ADMIN · 채팅"
        title="회원 채팅 기록"
        desc="회원들의 단체(팀) 채팅과 개인(1:1) 채팅 기록을 사진·영상 포함해 모두 조회합니다."
        accent={ACCENT}
        action={
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-soft)] hover:bg-[var(--panel-2)] disabled:opacity-60">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침
          </button>
        }
      />

      <div className="space-y-5 p-6 lg:p-8">
        {/* 요약 */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: '단체 채팅방', value: num(teams.length), icon: Users, c: '#7c3aed' },
            { label: '단체 메시지', value: num(totalTeamMsgs), icon: MessageCircle, c: '#6366f1' },
            { label: '개인 대화', value: num(dms.length), icon: User, c: '#0ea5e9' },
            { label: '개인 메시지', value: num(totalDmMsgs), icon: MessageCircle, c: '#22c55e' },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--text-soft)]">{s.label}</span>
                <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${s.c}18`, color: s.c }}><s.icon size={15} /></span>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        <Panel
          title={
            <div className="flex items-center gap-1.5">
              {([['team', '단체 채팅'], ['dm', '개인 채팅']] as ['team' | 'dm', string][]).map(([t, l]) => (
                <button key={t} onClick={() => setTab(t)} className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', tab === t ? 'bg-violet-600 text-white' : 'bg-[var(--panel-2)] text-[var(--text-soft)] hover:text-[var(--text)]')}>
                  {l} <span className="ml-0.5 text-xs opacity-80">{t === 'team' ? teams.length : dms.length}</span>
                </button>
              ))}
            </div>
          }
          action={
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="대화 검색" className="h-9 w-52 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] pl-8 pr-3 text-sm outline-none focus:border-violet-400" />
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-dim)]"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
          ) : tab === 'team' ? (
            shownTeams.length === 0 ? (
              <div className="py-14 text-center text-sm text-[var(--text-dim)]">단체 채팅 기록이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {shownTeams.map((t) => (
                  <button key={t.id} onClick={() => openConv('team', t.id)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-left transition hover:border-violet-300 hover:bg-[var(--panel-2)]">
                    <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white"><Users size={19} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="truncate font-bold">{t.name}</span><span className="flex-shrink-0 rounded-full bg-[var(--panel-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-dim)]">멤버 {t.memberCount}</span></div>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-dim)]">{t.lastText || '메시지 없음'}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-violet-600">{num(t.msgCount)}</p>
                      <p className="text-[10px] text-[var(--text-dim)]">{t.lastAt ? kst(t.lastAt) : '-'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : shownDms.length === 0 ? (
            <div className="py-14 text-center text-sm text-[var(--text-dim)]">개인 채팅 기록이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {shownDms.map((d) => (
                <button key={d.id} onClick={() => openConv('dm', d.id)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-left transition hover:border-violet-300 hover:bg-[var(--panel-2)]">
                  <Avatar name={d.participants[0]?.name || '?'} seed={d.id} size={44} />
                  <div className="min-w-0 flex-1">
                    <span className="truncate font-bold">{d.name}</span>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-dim)]">{d.lastText || '메시지 없음'}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-sky-600">{num(d.msgCount)}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">{d.lastAt ? kst(d.lastAt) : '-'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 상세 모달 */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(null)}>
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[var(--bg-soft)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
              <div className="flex min-w-0 items-center gap-2 font-bold">
                {open.type === 'team' ? <Users size={16} className="text-violet-600" /> : <User size={16} className="text-sky-600" />}
                <span className="truncate">{conv?.name || '대화'}</span>
                {conv?.members && <span className="flex-shrink-0 text-xs font-normal text-[var(--text-dim)]">· {conv.members.length}명</span>}
              </div>
              <button onClick={() => setOpen(null)} className="rounded-lg p-1.5 text-[var(--text-dim)] hover:bg-[var(--panel-2)]"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto bg-[var(--bg)] p-4">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-dim)]"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center text-sm text-[var(--text-dim)]">메시지가 없습니다.</div>
              ) : (
                messages.map((m, i) => {
                  const prev = messages[i - 1]
                  const showDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)
                  const grouped = !!prev && !showDay && prev.userId === m.userId
                  return (
                    <div key={m.id}>
                      {showDay && <div className="my-2 flex justify-center"><span className="rounded-full bg-[var(--panel-2)] px-3 py-1 text-[11px] font-medium text-[var(--text-dim)]">{dayLabel(m.createdAt)}</span></div>}
                      <div className={cn('flex gap-2', grouped ? 'mt-0.5' : 'mt-2.5')}>
                        {grouped ? <span className="w-[34px] flex-shrink-0" /> : <Avatar name={m.name} seed={m.userId} size={34} />}
                        <div className="min-w-0 flex-1">
                          {!grouped && (
                            <div className="mb-0.5 flex items-center gap-1.5">
                              <span className="text-[13px] font-semibold text-[var(--text)]">{m.name}</span>
                              <span className="text-[10px] text-[var(--text-dim)]">{kstTime(m.createdAt)}</span>
                            </div>
                          )}
                          {m.kind === 'image' && m.mediaUrl ? (
                            <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="inline-block overflow-hidden rounded-xl border border-[var(--border)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={m.mediaUrl} alt={m.mediaName || '사진'} className="max-h-64 max-w-[280px] cursor-pointer object-cover" />
                            </a>
                          ) : m.kind === 'video' && m.mediaUrl ? (
                            <video src={m.mediaUrl} controls playsInline className="max-h-72 max-w-[320px] rounded-xl border border-[var(--border)] bg-black" />
                          ) : (
                            <div className="inline-block max-w-[420px] whitespace-pre-wrap break-words rounded-xl rounded-tl-sm border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm leading-relaxed text-[var(--text)]">{m.text}</div>
                          )}
                          {m.text && (m.kind === 'image' || m.kind === 'video') && (
                            <div className="mt-1 inline-block max-w-[420px] whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text)]">{m.text}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-2.5 text-[11px] text-[var(--text-dim)]">
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><ImageIcon size={12} /> {messages.filter((m) => m.kind === 'image').length} 사진</span>
                <span className="inline-flex items-center gap-1"><Film size={12} /> {messages.filter((m) => m.kind === 'video').length} 영상</span>
              </span>
              <span>총 {num(messages.length)} 메시지 · 한국시간(KST)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
