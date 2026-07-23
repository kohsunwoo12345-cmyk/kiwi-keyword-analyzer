'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Trash2,
  Globe,
  Lock,
  UserRound,
  Share2,
  Copy,
  Check,
  X,
  Contact,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'

const ACCENT = '#0ea5e9'

type ColorKey = 'violet' | 'sky' | 'emerald' | 'amber' | 'rose'
type Visibility = 'team' | 'private' | 'user'

const COLORS: Record<ColorKey, { label: string; dot: string; pill: string }> = {
  violet: { label: '기획', dot: 'bg-violet-500', pill: 'border-violet-500/30 bg-violet-500/12 text-violet-600' },
  sky: { label: '광고', dot: 'bg-sky-500', pill: 'border-sky-500/30 bg-sky-500/12 text-sky-600' },
  emerald: { label: '콘텐츠', dot: 'bg-emerald-500', pill: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600' },
  amber: { label: '마감', dot: 'bg-amber-500', pill: 'border-amber-500/30 bg-amber-500/12 text-amber-600' },
  rose: { label: '회의', dot: 'bg-rose-500', pill: 'border-rose-500/30 bg-rose-500/12 text-rose-600' },
}

const VIS: Record<Visibility, { label: string; badge: string; cls: string; icon: typeof Globe }> = {
  team: { label: '공유(전체)', badge: '공유(전체)', cls: 'border-sky-500/30 bg-sky-500/12 text-sky-600', icon: Globe },
  private: { label: '나만', badge: '나만', cls: 'border-[var(--border)] bg-[var(--panel-2)] text-slate-600', icon: Lock },
  user: { label: '개별공유', badge: '개별공유', cls: 'border-amber-500/30 bg-amber-500/12 text-amber-600', icon: UserRound },
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MANAGE_HREF = '/dashboard_USE17237_612/team/manage'

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
interface CalEvent {
  id: string
  owner_id: string
  owner_name: string
  d: string
  title: string
  color: ColorKey
  memo: string
  visibility: Visibility
  target_user_id: string | null
  target_group_id: string | null
  target_group_name: string | null
  created_at: string
}
interface Board {
  id: string
  name: string
  owner_id: string
  created_at: string
}

function ymStr(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`
}
function todayISO() {
  const p = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }) // YYYY-MM-DD
  return p
}

export default function TeamCalendarPage() {
  const now = new Date()
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [meId, setMeId] = useState('')
  const [teamId, setTeamId] = useState('')

  // calendars (boards) — 워크플로 상단 탭처럼 여러 캘린더
  const [boards, setBoards] = useState<Board[]>([])
  const [boardId, setBoardId] = useState('')
  const [newBoardName, setNewBoardName] = useState('')
  const [addingBoard, setAddingBoard] = useState(false)
  const [boardBusy, setBoardBusy] = useState(false)

  // share
  const [shareUrl, setShareUrl] = useState('')
  const [shareName, setShareName] = useState('')
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // target groups (엑셀 DB 타깃 그룹)
  const [groups, setGroups] = useState<{ id: string; name: string; count: number }[]>([])

  // form state
  const [fDate, setFDate] = useState(todayISO())
  const [fTitle, setFTitle] = useState('')
  const [fColor, setFColor] = useState<ColorKey>('sky')
  const [fMemo, setFMemo] = useState('')
  const [fVis, setFVis] = useState<Visibility>('team')
  const [fTarget, setFTarget] = useState('')
  const [fGroup, setFGroup] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const monthKey = ymStr(ym.y, ym.m)
  const team = useMemo(() => teams.find((t) => t.id === teamId) || null, [teams, teamId])
  const otherMembers = useMemo(
    () => (team ? team.members.filter((m) => m.id !== meId) : []),
    [team, meId],
  )

  // 1) load my teams
  useEffect(() => {
    let alive = true
    fetch('/api/team', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        if (d.ok) {
          setTeams(d.teams || [])
          setMeId(d.meId || '')
          if ((d.teams || []).length) setTeamId(d.teams[0].id)
        }
        setLoadingTeams(false)
      })
      .catch(() => alive && setLoadingTeams(false))
    return () => {
      alive = false
    }
  }, [])

  // 2) load boards (calendars) for the selected team
  const loadBoards = useCallback(() => {
    if (!teamId) return
    fetch(`/api/team?boards=${encodeURIComponent(teamId)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const bs: Board[] = d.boards || []
          setBoards(bs)
          setBoardId((prev) => (bs.some((b) => b.id === prev) ? prev : bs[0]?.id || ''))
        }
      })
      .catch(() => {})
  }, [teamId])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  // load my target groups (엑셀 DB 그룹)
  useEffect(() => {
    fetch('/api/groups', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setGroups(d.groups || []) })
      .catch(() => {})
  }, [])

  // 3) load events for selected team + board + month
  const loadEvents = useCallback(() => {
    if (!teamId || !boardId) return
    setLoadingEvents(true)
    fetch(`/api/team?calendar=${encodeURIComponent(teamId)}&board=${encodeURIComponent(boardId)}&month=${monthKey}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setEvents(d.events || [])
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false))
  }, [teamId, boardId, monthKey])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  async function addBoard() {
    const name = newBoardName.trim()
    if (!name || !teamId) return
    setBoardBusy(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'board_add', teamId, name }),
      })
      const d = await res.json()
      if (d.ok) { setNewBoardName(''); setAddingBoard(false); loadBoards(); setBoardId(d.id) }
      else setErr(d.error || '캘린더 생성 실패')
    } catch { setErr('네트워크 오류') } finally { setBoardBusy(false) }
  }

  async function delBoard(id: string) {
    if (boards.length <= 1) { setErr('마지막 캘린더는 삭제할 수 없습니다.'); return }
    if (!confirm('이 캘린더와 안의 모든 일정을 삭제할까요?')) return
    setBoardBusy(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'board_del', boardId: id }),
      })
      const d = await res.json()
      if (d.ok) loadBoards()
      else setErr(d.error || '삭제 실패')
    } catch { setErr('네트워크 오류') } finally { setBoardBusy(false) }
  }

  async function shareBoard() {
    if (!boardId) return
    setSharing(true); setCopied(false)
    try {
      const res = await fetch('/api/team', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cal_share', boardId }),
      })
      const d = await res.json()
      if (d.ok) { setShareUrl(d.url); setShareName(d.name || '') }
      else setErr(d.error || '공유 링크 생성 실패')
    } catch { setErr('네트워크 오류') } finally { setSharing(false) }
  }

  async function copyShare() {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* noop */ }
  }

  // keep target member valid when team/members change
  useEffect(() => {
    if (fVis === 'user' && fTarget && !otherMembers.some((m) => m.id === fTarget)) setFTarget('')
  }, [otherMembers, fVis, fTarget])

  function shiftMonth(dir: -1 | 1) {
    setYm((p) => {
      let m = p.m + dir
      let y = p.y
      if (m < 1) { m = 12; y-- }
      if (m > 12) { m = 1; y++ }
      return { y, m }
    })
  }

  function goToday() {
    const n = new Date()
    setYm({ y: n.getFullYear(), m: n.getMonth() + 1 })
  }

  // calendar grid
  const firstOffset = new Date(ym.y, ym.m - 1, 1).getDay()
  const daysInMonth = new Date(ym.y, ym.m, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const iso = todayISO()
  const dayStr = (d: number) => `${monthKey}-${String(d).padStart(2, '0')}`
  function eventsOn(d: number) {
    const key = dayStr(d)
    return events.filter((e) => e.d === key)
  }

  async function addEvent() {
    setErr('')
    if (!teamId) return
    if (!fTitle.trim()) { setErr('제목을 입력하세요.'); return }
    if (!fDate) { setErr('날짜를 선택하세요.'); return }
    if (fVis === 'user' && !fTarget) { setErr('공유할 팀원을 선택하세요.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cal_add',
          teamId,
          boardId,
          d: fDate,
          title: fTitle.trim(),
          color: fColor,
          memo: fMemo.trim() || undefined,
          visibility: fVis,
          targetUserId: fVis === 'user' ? fTarget : undefined,
          targetGroupId: fGroup || undefined,
        }),
      })
      const d = await res.json()
      if (!d.ok) { setErr(d.error || '일정 추가에 실패했습니다.'); return }
      setFTitle('')
      setFMemo('')
      loadEvents()
    } catch {
      setErr('네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function delEvent(eventId: string) {
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cal_del', eventId }),
      })
      const d = await res.json()
      if (d.ok) loadEvents()
    } catch {
      /* noop */
    }
  }

  const monthEvents = useMemo(
    () => [...events].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)),
    [events],
  )

  // ---------- render ----------
  if (loadingTeams) {
    return (
      <div className="animate-fade-in">
        <PageHeader icon={Calendar} eyebrow="TEAM" title="집행 캘린더" desc="팀의 마케팅 집행 일정을 함께 관리하세요." accent={ACCENT} />
        <div className="flex items-center justify-center py-24 text-[var(--text-dim)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중...
        </div>
      </div>
    )
  }

  if (!teams.length) {
    return (
      <div className="animate-fade-in">
        <PageHeader icon={Calendar} eyebrow="TEAM" title="집행 캘린더" desc="팀의 마케팅 집행 일정을 함께 관리하세요." accent={ACCENT} />
        <div className="p-6 lg:p-8">
          <div className="card flex flex-col items-center justify-center gap-4 p-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: `${ACCENT}18`, color: ACCENT }}>
              <Users size={26} />
            </span>
            <div>
              <p className="text-lg font-semibold">아직 소속된 팀이 없습니다</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">먼저 팀을 만들거나 초대를 수락하세요.</p>
            </div>
            <Button href={MANAGE_HREF} className="!bg-gradient-to-br !from-sky-500 !to-blue-500">
              <Users size={16} /> 팀 관리로 이동
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Calendar}
        eyebrow="TEAM"
        title="집행 캘린더"
        desc="팀의 마케팅 집행 일정과 마감을 한눈에 관리하세요."
        accent={ACCENT}
        action={
          teams.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTeamId(t.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    t.id === teamId
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)] hover:border-sky-400'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {/* Calendar tabs (workflow-style) + share */}
      <div className="flex flex-wrap items-center gap-2 px-6 pt-4 lg:px-8">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {boards.map((bd) => (
            <div
              key={bd.id}
              className={`group flex items-center gap-1 rounded-t-lg border-b-2 px-3 py-1.5 text-sm font-semibold transition-colors ${
                bd.id === boardId
                  ? 'border-sky-500 bg-[var(--panel-2)] text-sky-600'
                  : 'border-transparent text-[var(--text-soft)] hover:bg-[var(--panel-2)]'
              }`}
            >
              <button onClick={() => setBoardId(bd.id)} className="max-w-[160px] truncate">
                {bd.name}
              </button>
              {boards.length > 1 && bd.id === boardId && (
                <button
                  onClick={() => delBoard(bd.id)}
                  disabled={boardBusy}
                  className="ml-0.5 grid h-4 w-4 place-items-center rounded text-[var(--text-dim)] hover:text-rose-500"
                  aria-label="캘린더 삭제"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          {addingBoard ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addBoard(); if (e.key === 'Escape') { setAddingBoard(false); setNewBoardName('') } }}
                placeholder="캘린더 이름"
                className="w-32 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1 text-sm outline-none focus:border-sky-500"
              />
              <button onClick={addBoard} disabled={boardBusy || !newBoardName.trim()} className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500 text-white disabled:opacity-50">
                {boardBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
              </button>
            </span>
          ) : (
            <button
              onClick={() => setAddingBoard(true)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-dim)] hover:border-sky-400 hover:text-sky-500"
            >
              <Plus size={13} /> 새 캘린더
            </button>
          )}
        </div>
        <button
          onClick={shareBoard}
          disabled={sharing || !boardId}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:brightness-105 disabled:opacity-60"
        >
          {sharing ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />} 공유 링크
        </button>
      </div>

      {/* Share link modal */}
      {shareUrl && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShareUrl('')}
        >
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/15 text-sky-500"><Share2 size={17} /></span>
              <div>
                <p className="font-semibold">캘린더 공유 링크</p>
                <p className="text-xs text-[var(--text-dim)]">{shareName || '집행 캘린더'} · 팀 전체 공유 일정만 표시됩니다</p>
              </div>
            </div>
            <p className="mb-3 mt-2 text-xs text-[var(--text-soft)]">
              누구나 이 링크로 열람할 수 있는 <b>읽기 전용</b> 페이지입니다. 카카오톡·메신저·SNS에 공유하면 미리보기(OG) 카드가 표시됩니다.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none"
              />
              <button
                onClick={copyShare}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 px-3.5 py-2.5 text-sm font-semibold text-white"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <div className="mt-4 flex justify-between">
              <a href={shareUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-sky-500 hover:underline">
                새 탭에서 열기 →
              </a>
              <button onClick={() => setShareUrl('')} className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">닫기</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
        {/* Calendar grid */}
        <Panel
          title={
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftMonth(-1)}
                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
                aria-label="이전 달"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[110px] text-center">{ym.y}년 {ym.m}월</span>
              <button
                onClick={() => shiftMonth(1)}
                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
                aria-label="다음 달"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goToday}
                className="ml-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-soft)] hover:border-sky-400"
              >
                오늘
              </button>
              {loadingEvents && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-dim)]" />}
            </div>
          }
          action={
            <div className="hidden flex-wrap gap-1.5 sm:flex">
              {(Object.keys(COLORS) as ColorKey[]).map((k) => (
                <span
                  key={k}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${COLORS[k].pill}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${COLORS[k].dot}`} /> {COLORS[k].label}
                </span>
              ))}
            </div>
          }
        >
          <div className="grid grid-cols-7 border-b border-[var(--border-soft)] pb-2">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`text-center text-xs font-semibold ${
                  i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-[var(--text-dim)]'
                }`}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => (
              <div
                key={i}
                className={`min-h-[92px] border-b border-r border-[var(--border-soft)] p-1.5 ${
                  i % 7 === 0 ? 'border-l' : ''
                } ${i < 7 ? 'border-t' : ''}`}
              >
                {d && (
                  <>
                    <div
                      className={`mb-1 inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        dayStr(d) === iso
                          ? 'bg-sky-500 text-white'
                          : i % 7 === 0
                          ? 'text-rose-500'
                          : i % 7 === 6
                          ? 'text-sky-500'
                          : 'text-[var(--text-soft)]'
                      }`}
                    >
                      {d}
                    </div>
                    <div className="space-y-1">
                      {eventsOn(d).map((e) => (
                        <div
                          key={e.id}
                          className={`group flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${COLORS[e.color]?.pill || COLORS.sky.pill}`}
                          title={`${e.title}${e.memo ? '\n' + e.memo : ''}\n· ${e.owner_name} / ${VIS[e.visibility]?.label || ''}`}
                        >
                          <span className="truncate">{e.title}</span>
                          {e.owner_id === meId && (
                            <button
                              onClick={() => delEvent(e.id)}
                              className="ml-auto hidden shrink-0 text-current/70 hover:text-rose-600 group-hover:block"
                              aria-label="일정 삭제"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* Side panel */}
        <div className="space-y-6">
          <Panel title="새 집행 일정">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">날짜</label>
                <input
                  type="date"
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">제목</label>
                <input
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                  placeholder="예: 여름 세일 광고 집행"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">색상 (분류)</label>
                <select
                  value={fColor}
                  onChange={(e) => setFColor(e.target.value as ColorKey)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                >
                  {(Object.keys(COLORS) as ColorKey[]).map((k) => (
                    <option key={k} value={k}>
                      {COLORS[k].label} ({k})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">메모 (선택)</label>
                <textarea
                  value={fMemo}
                  onChange={(e) => setFMemo(e.target.value)}
                  rows={2}
                  placeholder="세부 내용이나 링크"
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">공유 범위</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['team', 'private', 'user'] as Visibility[]).map((v) => {
                    const Icon = VIS[v].icon
                    const on = fVis === v
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFVis(v)}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-colors ${
                          on
                            ? 'border-sky-500 bg-sky-500/12 text-sky-600'
                            : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-soft)] hover:border-sky-400'
                        }`}
                      >
                        <Icon size={15} />
                        {v === 'team' ? '팀 전체' : v === 'private' ? '나만 보기' : '특정 팀원'}
                      </button>
                    )
                  })}
                </div>
              </div>
              {fVis === 'user' && (
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-dim)]">공유할 팀원</label>
                  <select
                    value={fTarget}
                    onChange={(e) => setFTarget(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="">— 팀원 선택 —</option>
                    {otherMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                  {otherMembers.length === 0 && (
                    <p className="mt-1 text-[11px] text-[var(--text-dim)]">공유할 팀원이 없습니다. 팀원을 초대하세요.</p>
                  )}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-[var(--text-dim)]">타깃 그룹 (엑셀 DB · 선택)</label>
                <select
                  value={fGroup}
                  onChange={(e) => setFGroup(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                >
                  <option value="">— 그룹 없음 —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.count}명)</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                  이 일정의 발송 대상 그룹입니다. 문자·알림톡 발송 시 같은 그룹을 선택할 수 있어요.
                  {' '}<a href="/dashboard_USE17237_612/team/groups" className="text-sky-500 hover:underline">그룹 만들기 →</a>
                </p>
              </div>
              {err && <p className="text-xs text-rose-500">{err}</p>}
              <Button
                onClick={addEvent}
                disabled={saving}
                className="w-full !bg-gradient-to-br !from-sky-500 !to-blue-500"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 일정 추가
              </Button>
            </div>
          </Panel>

          <Panel title="공유 범위 안내">
            <div className="space-y-2">
              {(['team', 'private', 'user'] as Visibility[]).map((v) => {
                const Icon = VIS[v].icon
                return (
                  <div key={v} className="flex items-center gap-2 text-xs text-[var(--text-soft)]">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${VIS[v].cls}`}>
                      <Icon size={11} /> {VIS[v].badge}
                    </span>
                    <span className="text-[var(--text-dim)]">
                      {v === 'team' ? '팀원 모두에게 보입니다' : v === 'private' ? '나에게만 보입니다' : '지정한 팀원과 나에게만'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel title={`${ym.m}월 일정 (${monthEvents.length})`}>
            {monthEvents.length === 0 ? (
              <p className="text-sm text-[var(--text-dim)]">이 달에 등록된 일정이 없습니다.</p>
            ) : (
              <div className="space-y-2.5">
                {monthEvents.map((e) => {
                  const Icon = VIS[e.visibility]?.icon || Globe
                  const dd = Number(e.d.split('-')[2])
                  return (
                    <div key={e.id} className="card-2 flex items-center gap-3 p-3">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white ${COLORS[e.color]?.dot || COLORS.sky.dot}`}
                      >
                        {dd}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-[var(--text-dim)]">{e.owner_name}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${VIS[e.visibility]?.cls || ''}`}>
                            <Icon size={9} /> {VIS[e.visibility]?.badge}
                          </span>
                          {e.target_group_name && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                              <Contact size={9} /> {e.target_group_name}
                            </span>
                          )}
                        </div>
                      </div>
                      {e.owner_id === meId && (
                        <button
                          onClick={() => delEvent(e.id)}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--text-dim)] hover:bg-rose-500/12 hover:text-rose-500"
                          aria-label="일정 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
