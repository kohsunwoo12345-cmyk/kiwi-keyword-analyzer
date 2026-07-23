'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, UserPlus, Plus, Check, X, Loader2, Crown, Shield, User as UserIcon,
  Mail, Inbox, Sparkles, AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'

const ACCENT = '#0ea5e9'

type Member = { id: string; name: string; email: string; role: string }
type Team = { id: string; name: string; ownerId: string; role: string; members: Member[] }
type Invite = { id: string; teamId: string; teamName: string; fromName: string }
type TeamData = { ok: boolean; teams: Team[]; invites: Invite[]; meId: string; meName: string }

type Toast = { id: number; text: string; kind: 'ok' | 'err' | 'info' }

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-500'

function roleLabel(role: string) {
  if (role === 'owner') return '소유자'
  if (role === 'admin') return '관리자'
  return '멤버'
}
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { cls: string; Icon: typeof Crown }> = {
    owner: { cls: 'border-amber-500/30 bg-amber-500/12 text-amber-700', Icon: Crown },
    admin: { cls: 'border-sky-500/30 bg-sky-500/12 text-sky-700', Icon: Shield },
    member: { cls: 'border-[var(--border)] bg-[var(--panel-2)] text-slate-600', Icon: UserIcon },
  }
  const { cls, Icon } = map[role] || map.member
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Icon size={11} />
      {roleLabel(role)}
    </span>
  )
}

export default function TeamManagePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TeamData | null>(null)

  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [needPlan, setNeedPlan] = useState(false)

  // per-team invite input state
  const [inviteIdent, setInviteIdent] = useState<Record<string, string>>({})
  const [inviteBusy, setInviteBusy] = useState<Record<string, boolean>>({})

  // per-invite respond busy
  const [respondBusy, setRespondBusy] = useState<Record<string, boolean>>({})

  const [toasts, setToasts] = useState<Toast[]>([])
  const pushToast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/team', { credentials: 'include' })
      const d = (await res.json()) as TeamData
      if (d && d.ok) setData(d)
      return d
    } catch {
      pushToast('팀 정보를 불러오지 못했습니다.', 'err')
      return null
    }
  }, [pushToast])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await refresh()
      if (alive) setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [refresh])

  async function createTeam() {
    const name = newTeamName.trim()
    if (!name || creating) return
    setCreating(true)
    setNeedPlan(false)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.status === 402 || d?.needTeamPlan) {
        setNeedPlan(true)
        return
      }
      if (d?.ok) {
        setNewTeamName('')
        pushToast(`'${name}' 팀을 만들었습니다.`, 'ok')
        await refresh()
      } else {
        pushToast('팀을 만들지 못했습니다. 다시 시도해 주세요.', 'err')
      }
    } catch {
      pushToast('네트워크 오류로 팀을 만들지 못했습니다.', 'err')
    } finally {
      setCreating(false)
    }
  }

  async function invite(teamId: string) {
    const ident = (inviteIdent[teamId] || '').trim()
    if (!ident || inviteBusy[teamId]) return
    setInviteBusy((b) => ({ ...b, [teamId]: true }))
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', teamId, ident }),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.ok) {
        setInviteIdent((s) => ({ ...s, [teamId]: '' }))
        pushToast(`${d.invitedName || '상대방'}님을 초대했습니다.`, 'ok')
        await refresh()
        return
      }
      // errors
      if (res.status === 402 || d?.needTeamPlan) {
        setNeedPlan(true)
        pushToast('팀 초대는 팀 플랜에서 이용할 수 있습니다.', 'err')
      } else if (res.status === 404 || d?.notFound) {
        pushToast('해당 아이디의 사용자를 찾을 수 없습니다.', 'err')
      } else if (res.status === 409 || d?.seatFull) {
        pushToast('팀 좌석이 모두 찼습니다. 좌석을 추가한 뒤 다시 초대해 주세요.', 'err')
      } else {
        pushToast('초대에 실패했습니다. 다시 시도해 주세요.', 'err')
      }
    } catch {
      pushToast('네트워크 오류로 초대하지 못했습니다.', 'err')
    } finally {
      setInviteBusy((b) => ({ ...b, [teamId]: false }))
    }
  }

  async function respond(inviteId: string, accept: boolean, teamName: string) {
    if (respondBusy[inviteId]) return
    setRespondBusy((b) => ({ ...b, [inviteId]: true }))
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', inviteId, accept }),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.ok) {
        pushToast(accept ? `'${teamName}' 팀에 합류했습니다.` : '초대를 거절했습니다.', accept ? 'ok' : 'info')
        await refresh()
      } else {
        pushToast('처리하지 못했습니다. 다시 시도해 주세요.', 'err')
      }
    } catch {
      pushToast('네트워크 오류가 발생했습니다.', 'err')
    } finally {
      setRespondBusy((b) => ({ ...b, [inviteId]: false }))
    }
  }

  const teams = data?.teams || []
  const invites = data?.invites || []
  const totalMembers = teams.reduce((sum, t) => sum + (t.members?.length || 0), 0)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Users}
        eyebrow="TEAM"
        title="팀 관리·초대"
        desc="팀을 만들고 팀원을 초대하거나, 받은 초대를 관리합니다."
        accent={ACCENT}
      />

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[320px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg ${
              t.kind === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-800'
                : t.kind === 'err'
                  ? 'border-rose-500/30 bg-rose-500/12 text-rose-800'
                  : 'border-sky-500/30 bg-sky-500/12 text-sky-800'
            }`}
          >
            {t.kind === 'ok' ? <Check size={16} /> : t.kind === 'err' ? <AlertCircle size={16} /> : <Sparkles size={16} />}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-6 p-6 lg:p-8">
        {/* stat row */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-[var(--text-soft)]">
          <span className="inline-flex items-center gap-2">
            <Users size={15} className="text-sky-500" />
            내 팀 <b className="text-[var(--text)]">{teams.length}</b>개
          </span>
          <span className="inline-flex items-center gap-2">
            <UserIcon size={15} className="text-sky-500" />
            전체 팀원 <b className="text-[var(--text)]">{totalMembers}</b>명
          </span>
          <span className="inline-flex items-center gap-2">
            <Inbox size={15} className="text-sky-500" />
            받은 초대 <b className="text-[var(--text)]">{invites.length}</b>건
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-[var(--text-dim)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            불러오는 중...
          </div>
        ) : (
          <>
            {/* create team */}
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Plus size={17} className="text-sky-500" />
                <h2 className="text-base font-semibold">팀 만들기</h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className={inputCls}
                  placeholder="팀 이름을 입력하세요"
                  value={newTeamName}
                  onChange={(e) => {
                    setNewTeamName(e.target.value)
                    if (needPlan) setNeedPlan(false)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && createTeam()}
                />
                <button
                  onClick={createTeam}
                  disabled={creating || !newTeamName.trim()}
                  className="brand-gradient inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  팀 만들기
                </button>
              </div>
              {needPlan && (
                <div className="mt-3 flex flex-col gap-1 rounded-xl border border-amber-500/30 bg-amber-500/12 px-4 py-3 text-sm text-amber-800">
                  <div className="flex items-center gap-2 font-medium">
                    <Sparkles size={15} />팀 플랜이 필요합니다
                  </div>
                  <p className="text-amber-700">
                    팀 생성·초대 기능은 팀 플랜에서 이용할 수 있습니다.{' '}
                    <Link href="/dashboard_USE17237_612/team" className="font-semibold text-amber-900 underline underline-offset-2">
                      팀 플랜 안내 보기
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {/* received invites */}
            {invites.length > 0 && (
              <div className="card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Inbox size={17} className="text-sky-500" />
                  <h2 className="text-base font-semibold">받은 초대</h2>
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700">{invites.length}</span>
                </div>
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm">
                        <span className="font-semibold">{inv.teamName}</span>
                        <span className="text-[var(--text-soft)]"> 팀 초대</span>
                        <p className="mt-0.5 text-xs text-[var(--text-dim)]">{inv.fromName}님이 초대했습니다</p>
                      </div>
                      <div className="flex flex-shrink-0 gap-2">
                        <button
                          onClick={() => respond(inv.id, true, inv.teamName)}
                          disabled={respondBusy[inv.id]}
                          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                        >
                          {respondBusy[inv.id] ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}수락
                        </button>
                        <button
                          onClick={() => respond(inv.id, false, inv.teamName)}
                          disabled={respondBusy[inv.id]}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)] disabled:opacity-50"
                        >
                          <X size={13} />거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* my teams */}
            {teams.length === 0 ? (
              <div className="card p-10 text-center">
                <Users size={32} className="mx-auto mb-3 text-[var(--text-dim)]" />
                <p className="text-sm text-[var(--text-soft)]">아직 소속된 팀이 없습니다. 위에서 팀을 만들어 시작해 보세요.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {teams.map((team) => {
                  const canManage = team.role === 'owner' || team.role === 'admin'
                  return (
                    <div key={team.id} className="card p-5">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold">{team.name}</h2>
                        <RoleBadge role={team.role} />
                        <span className="ml-auto text-xs text-[var(--text-dim)]">멤버 {team.members?.length || 0}명</span>
                      </div>

                      {/* invite row */}
                      <div className="mb-4">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-soft)]">
                          <UserPlus size={13} />팀원 초대
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            className={inputCls}
                            placeholder="이메일 또는 추천인 코드"
                            value={inviteIdent[team.id] || ''}
                            onChange={(e) => setInviteIdent((s) => ({ ...s, [team.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && invite(team.id)}
                          />
                          <button
                            onClick={() => invite(team.id)}
                            disabled={inviteBusy[team.id] || !(inviteIdent[team.id] || '').trim()}
                            className="inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                          >
                            {inviteBusy[team.id] ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                            초대
                          </button>
                        </div>
                        {!canManage && (
                          <p className="mt-1 text-[11px] text-[var(--text-dim)]">멤버 권한으로도 초대할 수 있습니다.</p>
                        )}
                      </div>

                      {/* members */}
                      <div className="space-y-1.5">
                        {(team.members || []).map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--panel-2)] px-3.5 py-2.5"
                          >
                            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-sky-500/15 text-sm font-semibold text-sky-700">
                              {(m.name || m.email || '?').slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">
                                  {m.name || '이름 없음'}
                                  {m.id === data?.meId && <span className="ml-1 text-xs text-sky-600">(나)</span>}
                                </span>
                              </div>
                              <p className="truncate text-xs text-[var(--text-dim)]">{m.email}</p>
                            </div>
                            <RoleBadge role={m.role} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
