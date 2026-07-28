'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, UserPlus, Plus, Check, X, Loader2, Crown, Shield, User as UserIcon,
  Mail, Inbox, Sparkles, AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Card, EmptyState, Metric } from '@/components/dash/Kit'

const ACCENT = '#0ea5e9'

type Member = { id: string; name: string; email: string; role: string }
type Team = { id: string; name: string; ownerId: string; role: string; members: Member[] }
type Invite = { id: string; teamId: string; teamName: string; fromName: string }
type TeamData = { ok: boolean; teams: Team[]; invites: Invite[]; meId: string; meName: string }

type Toast = { id: number; text: string; kind: 'ok' | 'err' | 'info' }

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-500'

const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, member: 2 }

function roleLabel(role: string) {
  if (role === 'owner') return '소유자'
  if (role === 'admin') return '관리자'
  return '멤버'
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { cls: string; Icon: typeof Crown }> = {
    owner: { cls: 'border-amber-500/30 bg-amber-500/12 text-amber-500', Icon: Crown },
    admin: { cls: 'border-sky-500/30 bg-sky-500/12 text-sky-500', Icon: Shield },
    member: { cls: 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-dim)]', Icon: UserIcon },
  }
  const { cls, Icon } = map[role] || map.member
  return (
    <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
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

  // 팀별 초대 입력 상태
  const [inviteIdent, setInviteIdent] = useState<Record<string, string>>({})
  const [inviteBusy, setInviteBusy] = useState<Record<string, boolean>>({})
  /** 팀별 마지막 오류 — 좌석 수·중복 여부 같은 서버 메시지를 입력창 아래에 그대로 남긴다 */
  const [inviteErr, setInviteErr] = useState<Record<string, string>>({})

  const [respondBusy, setRespondBusy] = useState<Record<string, boolean>>({})

  const [toasts, setToasts] = useState<Toast[]>([])
  const pushToast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
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
        // 서버가 알려준 이유를 그대로 보여준다 (이름 길이·중복 등)
        pushToast(d?.error || '팀을 만들지 못했습니다. 다시 시도해 주세요.', 'err')
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
    setInviteErr((s) => ({ ...s, [teamId]: '' }))
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
      // 서버 메시지가 훨씬 구체적이다 ("좌석이 부족합니다 (5좌석)", "이미 초대를 보냈습니다" 등)
      const msg = d?.error || '초대에 실패했습니다. 다시 시도해 주세요.'
      setInviteErr((s) => ({ ...s, [teamId]: msg }))
      if (res.status === 402 || d?.needTeamPlan) setNeedPlan(true)
      pushToast(msg, 'err')
    } catch {
      const msg = '네트워크 오류로 초대하지 못했습니다.'
      setInviteErr((s) => ({ ...s, [teamId]: msg }))
      pushToast(msg, 'err')
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
        pushToast(d?.error || '처리하지 못했습니다. 다시 시도해 주세요.', 'err')
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
  const ownedTeams = useMemo(() => teams.filter((t) => t.role === 'owner').length, [teams])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Users}
        eyebrow="TEAM"
        title="팀 관리·초대"
        desc="팀을 만들고 팀원을 초대하거나, 받은 초대를 관리합니다."
        accent={ACCENT}
      />

      {/* 알림 — 떠 있는 채팅 버튼 위로 띄운다 */}
      <div className="pointer-events-none fixed bottom-24 right-6 z-50 flex w-[320px] max-w-[calc(100vw-3rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-in pointer-events-auto flex items-start gap-2 rounded-xl border bg-[var(--panel)] px-3.5 py-2.5 text-[13px] shadow-xl ${
              t.kind === 'ok'
                ? 'border-emerald-500/40 text-emerald-500'
                : t.kind === 'err'
                  ? 'border-rose-500/40 text-rose-500'
                  : 'border-sky-500/40 text-sky-500'
            }`}
          >
            {t.kind === 'ok' ? <Check size={15} className="mt-0.5 flex-shrink-0" /> : t.kind === 'err' ? <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> : <Sparkles size={15} className="mt-0.5 flex-shrink-0" />}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-5 p-5 pb-24 lg:p-7 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="내 팀" icon={Users} accent="#0ea5e9" value={loading ? '—' : `${teams.length}개`} sub={ownedTeams ? `내가 만든 팀 ${ownedTeams}개` : '초대로 합류한 팀'} />
          <Metric label="전체 팀원" icon={UserIcon} accent="#6366f1" value={loading ? '—' : `${totalMembers}명`} sub="모든 팀의 멤버 합계" />
          <Metric label="받은 초대" icon={Inbox} accent="#f59e0b" value={loading ? '—' : `${invites.length}건`} sub={invites.length ? '아래에서 수락/거절할 수 있습니다' : '대기 중인 초대 없음'} />
        </div>

        {loading ? (
          <Card title="팀 목록">
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-dim)]">
              <Loader2 className="h-5 w-5 animate-spin" /> 불러오는 중…
            </div>
          </Card>
        ) : (
          <>
            {/* 팀 만들기 */}
            <Card title="팀 만들기" desc="팀 요금제가 활성화된 계정만 팀을 만들 수 있습니다">
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
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/12 px-4 py-3 text-[13px] text-amber-500">
                  <div className="flex items-center gap-2 font-bold">
                    <Sparkles size={15} /> 팀 플랜이 필요합니다
                  </div>
                  <p className="mt-1 text-amber-500/90">
                    팀 생성·초대는 팀 좌석이 포함된 요금제에서 이용할 수 있습니다.{' '}
                    <Link href="/pricing" className="font-bold underline underline-offset-2">
                      요금제 살펴보기
                    </Link>
                  </p>
                </div>
              )}
            </Card>

            {/* 받은 초대 */}
            {invites.length > 0 && (
              <Card title="받은 초대" desc={`${invites.length}건 · 수락하면 바로 팀에 합류합니다`}>
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 text-sm">
                        <span className="font-bold">{inv.teamName}</span>
                        <span className="text-[var(--text-soft)]"> 팀 초대</span>
                        <p className="mt-0.5 text-[11.5px] text-[var(--text-dim)]">{inv.fromName}님이 초대했습니다</p>
                      </div>
                      <div className="flex flex-shrink-0 gap-2">
                        <button
                          onClick={() => respond(inv.id, true, inv.teamName)}
                          disabled={respondBusy[inv.id]}
                          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
                        >
                          {respondBusy[inv.id] ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} 수락
                        </button>
                        <button
                          onClick={() => respond(inv.id, false, inv.teamName)}
                          disabled={respondBusy[inv.id]}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--text-soft)] transition hover:bg-[var(--panel-2)] disabled:opacity-50"
                        >
                          <X size={13} /> 거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 내 팀 */}
            {teams.length === 0 ? (
              <Card title="내 팀">
                <EmptyState
                  icon={Users}
                  title="아직 소속된 팀이 없습니다"
                  hint="위에서 팀을 만들거나, 팀원에게 초대를 받으면 이곳에 표시됩니다."
                />
              </Card>
            ) : (
              <div className="space-y-5">
                {teams.map((team) => {
                  const members = [...(team.members || [])].sort(
                    (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9),
                  )
                  const err = inviteErr[team.id]
                  return (
                    <Card
                      key={team.id}
                      title={
                        <span className="flex items-center gap-2">
                          {team.name}
                          <RoleBadge role={team.role} />
                        </span>
                      }
                      desc={`멤버 ${members.length}명`}
                    >
                      <div className="mb-4">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-soft)]">
                          <UserPlus size={13} /> 팀원 초대
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            className={inputCls}
                            placeholder="이메일 또는 추천인 코드"
                            value={inviteIdent[team.id] || ''}
                            onChange={(e) => {
                              setInviteIdent((s) => ({ ...s, [team.id]: e.target.value }))
                              if (err) setInviteErr((s) => ({ ...s, [team.id]: '' }))
                            }}
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
                        {err ? (
                          <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-medium text-rose-500">
                            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            {err}
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-[var(--text-dim)]">
                            팀 멤버라면 누구나 초대할 수 있습니다. 좌석은 팀 소유자의 요금제를 따릅니다.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5"
                          >
                            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-sky-500/15 text-sm font-bold text-sky-500">
                              {(m.name || m.email || '?').slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-[13.5px] font-semibold">{m.name || '이름 없음'}</span>
                                {m.id === data?.meId && (
                                  <span className="flex-shrink-0 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-500">나</span>
                                )}
                              </span>
                              <p className="truncate text-[11.5px] text-[var(--text-dim)]">{m.email}</p>
                            </div>
                            <RoleBadge role={m.role} />
                          </div>
                        ))}
                      </div>
                    </Card>
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
