'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessagesSquare, Search, RefreshCw, Image as ImageIcon, Film, Share2, Loader2, Users } from 'lucide-react'
import { MktCanvas, MktHeader, MktPanel, MktButton, MktStat } from '@/components/marketing/node'
import { cn } from '@/lib/utils'

// ── 타입 ──
type CommItem = {
  type: 'message' | 'share'
  id: string
  teamId: string
  teamName: string
  userId: string
  userName: string
  email: string
  kind: 'text' | 'image' | 'video' | 'workflow'
  text: string
  mediaKey?: string | null
  mediaName?: string | null
  mediaUrl?: string | null
  created_at: string
  // share 전용
  toName?: string | null
  nodeCount?: number | null
  received?: boolean
}
type TeamOpt = { id: string; name: string }
type Stats = { totalMessages: number; totalShares: number; totalTeams: number }
type ApiResp = { ok: boolean; items?: CommItem[]; teams?: TeamOpt[]; stats?: Stats; error?: string }

// ── 헬퍼 ──
const kst = (iso?: string | null) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso || '-'
  }
}

type BadgeMeta = { label: string; color: string; Icon: typeof MessagesSquare }
const badgeFor = (it: CommItem): BadgeMeta => {
  if (it.type === 'share' || it.kind === 'workflow') return { label: '노드 공유', color: '#a855f7', Icon: Share2 }
  if (it.kind === 'image') return { label: '사진', color: '#10b981', Icon: ImageIcon }
  if (it.kind === 'video') return { label: '영상', color: '#f59e0b', Icon: Film }
  return { label: '채팅', color: '#5b6cff', Icon: MessagesSquare }
}

const TYPE_TABS: { v: 'all' | 'message' | 'share'; label: string }[] = [
  { v: 'all', label: '전체' },
  { v: 'message', label: '채팅' },
  { v: 'share', label: '노드공유' },
]

export default function TeamCommsPage() {
  const [items, setItems] = useState<CommItem[]>([])
  const [teams, setTeams] = useState<TeamOpt[]>([])
  const [stats, setStats] = useState<Stats>({ totalMessages: 0, totalShares: 0, totalTeams: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // 필터 상태
  const [qInput, setQInput] = useState('') // 입력 중인 검색어
  const [q, setQ] = useState('') // 확정된 검색어
  const [teamId, setTeamId] = useState('')
  const [type, setType] = useState<'all' | 'message' | 'share'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const sp = new URLSearchParams()
      if (q.trim()) sp.set('q', q.trim())
      if (teamId) sp.set('teamId', teamId)
      if (type !== 'all') sp.set('type', type)
      const qs = sp.toString()
      const r = await fetch(`/api/admin/team-comms${qs ? `?${qs}` : ''}`, { credentials: 'include' })
      const d: ApiResp = await r.json()
      if (!d.ok) throw new Error(d.error || '불러오기 실패')
      setItems(d.items || [])
      // 팀 목록/통계는 서버가 항상 내려주면 갱신
      if (d.teams) setTeams(d.teams)
      if (d.stats) setStats(d.stats)
    } catch (e: any) {
      setErr(e?.message || '불러오는 중 오류가 발생했습니다.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [q, teamId, type])

  useEffect(() => {
    load()
  }, [load])

  const runSearch = () => setQ(qInput)

  return (
    <MktCanvas>
      <MktHeader
        icon={MessagesSquare}
        eyebrow="TEAM · COMMS"
        title="팀 연락 내역"
        desc="모든 팀의 채팅(텍스트·사진·영상)과 노드 페이지 워크플로우 공유 이력을 관리자가 그대로 열람합니다. 보낸사람·내용·팀명·이메일로 검색하고 팀/유형으로 필터링할 수 있어요."
        action={
          <MktButton onClick={load} variant="ghost">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침
          </MktButton>
        }
      />

      {/* 통계 타일 */}
      <div className="grid grid-cols-3 gap-3">
        <MktStat label="총 채팅 메시지" value={stats.totalMessages.toLocaleString()} icon={MessagesSquare} accent="#5b6cff" />
        <MktStat label="총 노드 공유" value={stats.totalShares.toLocaleString()} icon={Share2} accent="#a855f7" />
        <MktStat label="팀 수" value={stats.totalTeams.toLocaleString()} icon={Users} accent="#10b981" />
      </div>

      {/* 검색 + 필터 */}
      <MktPanel className="mt-4" title="검색 · 필터" icon={Search}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mkt-text-dim)]" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch()
                }}
                placeholder="보낸사람 이름 · 메시지 내용 · 팀명 · 이메일 검색"
                className="input w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#5b6cff]"
              />
            </div>
            <MktButton onClick={runSearch}>
              <Search size={14} /> 검색
            </MktButton>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 팀 드롭다운 */}
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="input rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#5b6cff]"
            >
              <option value="">전체 팀</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* 유형 토글 */}
            <div className="inline-flex overflow-hidden rounded-xl border border-[var(--mkt-border)]">
              {TYPE_TABS.map((t, i) => (
                <button
                  key={t.v}
                  onClick={() => setType(t.v)}
                  className={cn(
                    'px-3.5 py-2 text-sm font-semibold transition-colors',
                    i > 0 && 'border-l border-[var(--mkt-border)]',
                    type === t.v ? 'bg-[#5b6cff]/18 text-[#93c5fd]' : 'text-[var(--mkt-text-soft)] hover:bg-white/5'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <span className="ml-auto text-xs text-[var(--mkt-text-dim)]">
              {loading ? '불러오는 중…' : `${items.length.toLocaleString()}건`}
            </span>
          </div>
        </div>
      </MktPanel>

      {/* 목록 */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-[var(--mkt-text-dim)]">
            <Loader2 size={18} className="animate-spin" /> 연락 내역을 불러오는 중…
          </div>
        ) : err ? (
          <div className="rounded-xl border border-[#ff9b9b]/25 bg-[#ff9b9b]/10 px-4 py-6 text-center text-sm font-semibold text-[#ff9b9b]">
            {err}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <MessagesSquare size={30} className="text-[var(--mkt-text-dim)]" />
            <p className="text-sm font-semibold text-[var(--mkt-text-soft)]">표시할 연락 내역이 없습니다.</p>
            <p className="text-xs text-[var(--mkt-text-dim)]">검색어나 필터를 바꿔보세요.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((it) => (
              <CommRow key={`${it.type}-${it.id}`} it={it} />
            ))}
          </div>
        )}
      </div>
    </MktCanvas>
  )
}

function CommRow({ it }: { it: CommItem }) {
  const b = badgeFor(it)
  return (
    <div className="mkt-panel p-4">
      {/* 헤더: 팀 · 보낸사람 · 뱃지 · 시각 */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ background: `${b.color}22`, color: b.color }}
        >
          <b.Icon size={11} /> {b.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] font-semibold text-[var(--mkt-text-soft)]">
          <Users size={10} /> {it.teamName || '알 수 없는 팀'}
        </span>
        <span className="text-sm font-bold text-[var(--mkt-text)]">{it.userName || '알 수 없음'}</span>
        {it.email && <span className="text-xs text-[var(--mkt-text-dim)]">{it.email}</span>}
        <span className="ml-auto whitespace-nowrap text-xs tabular-nums text-[var(--mkt-text-dim)]">{kst(it.created_at)}</span>
      </div>

      {/* 본문 */}
      <div className="mt-3">
        {it.type === 'share' || it.kind === 'workflow' ? (
          <div className="rounded-xl border border-[#a855f7]/25 bg-[#a855f7]/10 px-3.5 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-[#c99bf7]">
              <Share2 size={13} /> 노드 페이지 워크플로우 공유
              {it.toName && <span className="font-semibold text-[var(--mkt-text-soft)]">→ {it.toName}</span>}
              {typeof it.nodeCount === 'number' && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--mkt-text-soft)]">
                  노드 {it.nodeCount}개
                </span>
              )}
            </div>
            {it.text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--mkt-text)]">{it.text}</p>}
          </div>
        ) : it.kind === 'image' ? (
          <div className="space-y-2">
            {it.mediaUrl && (
              <button onClick={() => window.open(it.mediaUrl!, '_blank', 'noopener')} className="block" title="원본 열기">
                <img
                  src={it.mediaUrl}
                  alt={it.mediaName || '이미지'}
                  className="max-h-[200px] cursor-zoom-in rounded-lg border border-[var(--mkt-border)] object-contain"
                />
              </button>
            )}
            {it.mediaName && <p className="text-xs text-[var(--mkt-text-dim)]">{it.mediaName}</p>}
            {it.text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--mkt-text)]">{it.text}</p>}
          </div>
        ) : it.kind === 'video' ? (
          <div className="space-y-2">
            {it.mediaUrl && (
              <video
                src={it.mediaUrl}
                controls
                className="max-h-[220px] rounded-lg border border-[var(--mkt-border)] bg-black"
              />
            )}
            {it.mediaName && <p className="text-xs text-[var(--mkt-text-dim)]">{it.mediaName}</p>}
            {it.text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--mkt-text)]">{it.text}</p>}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--mkt-text)]">{it.text || <span className="text-[var(--mkt-text-dim)]">(빈 메시지)</span>}</p>
        )}
      </div>
    </div>
  )
}
