'use client'

import { useEffect, useState, useCallback } from 'react'
import { History, Search, X, Activity, Coins, Crown, Users, Share2, Sparkles, LogIn, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button, Badge } from '@/components/ui'
import { adminUserActivity, type UserActivityUser, type ActivityEvent } from '@/lib/auth'
import { kstDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

const num = (n: number) => (n || 0).toLocaleString('ko-KR')

const CAT_META: Record<string, { icon: any; color: string; label: string }> = {
  activity: { icon: Activity, color: '#0ea5e9', label: '활동' },
  tx: { icon: Coins, color: '#f59e0b', label: '크레딧/포인트' },
  share: { icon: Share2, color: '#8b5cf6', label: '워크플로 공유' },
  team: { icon: Users, color: '#ec4899', label: '팀' },
  gen: { icon: Sparkles, color: '#10b981', label: 'AI 생성' },
}

export default function AdminUserActivityPage() {
  const [users, setUsers] = useState<UserActivityUser[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<UserActivityUser | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    adminUserActivity().then((r) => { if (r.ok) setUsers(r.users || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])

  const ql = q.trim().toLowerCase()
  const filtered = ql ? users.filter((u) => (u.name || '').toLowerCase().includes(ql) || (u.email || '').toLowerCase().includes(ql)) : users

  return (
    <div>
      <PageHeader
        icon={History}
        title="사용자 활동 기록"
        description="등록 사용자별 워크플로 공유·팀·AI 생성·크레딧 등 모든 활동을 한국시간(KST)으로 상세 기록합니다. 회원을 클릭하면 전체 타임라인을 봅니다."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5">
          <Search size={15} className="text-[var(--text-dim)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·이메일 검색" className="w-56 bg-transparent text-sm outline-none" />
        </div>
        <Button variant="soft" size="sm" onClick={load} disabled={loading}><RefreshCw size={14} /> 새로고침</Button>
        <span className="ml-auto text-xs text-[var(--text-dim)]">등록 회원 {num(users.length)}명</span>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                <th className="px-3 py-2.5 font-medium">회원</th>
                <th className="px-3 py-2.5 font-medium">플랜</th>
                <th className="px-3 py-2.5 text-right font-medium">크레딧</th>
                <th className="px-3 py-2.5 text-right font-medium">활동</th>
                <th className="px-3 py-2.5 text-right font-medium">생성</th>
                <th className="px-3 py-2.5 text-right font-medium">공유(보냄/받음)</th>
                <th className="px-3 py-2.5 font-medium">가입일 (KST)</th>
                <th className="px-3 py-2.5 font-medium">최근 활동</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} onClick={() => setSel(u)} className="cursor-pointer border-b border-[var(--border-soft)] last:border-0 hover:bg-violet-50/40">
                  <td className="px-3 py-2.5"><div className="font-medium">{u.name || '-'}</div><div className="text-xs text-[var(--text-dim)]">{u.email}</div></td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {u.plan !== '없음' && <Badge className="border-violet-200 bg-violet-50 text-violet-700">마케터 {u.plan}</Badge>}
                      {u.videoPlan !== '없음' && <Badge className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700">영상 {u.videoPlan}</Badge>}
                      {u.teamPlan === 1 && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">팀</Badge>}
                      {u.plan === '없음' && u.videoPlan === '없음' && u.teamPlan !== 1 && <span className="text-xs text-[var(--text-dim)]">미가입</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">{num(u.credits)}</td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-soft)]">{num(u.activityCount)}</td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-soft)]">{num(u.genCount)}</td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-soft)]">{num(u.sharesSent)} / {num(u.sharesRecv)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-soft)]">{u.createdAt ? kstDateTime(u.createdAt) : '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-soft)]">{u.lastActive ? kstDateTime(u.lastActive) : '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-[var(--text-dim)]">{loading ? '불러오는 중…' : '회원이 없습니다.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {sel && <TimelineDrawer user={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function TimelineDrawer({ user, onClose }: { user: UserActivityUser; onClose: () => void }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    adminUserActivity(user.id).then((r) => { if (r.ok) setEvents(r.events || []); setLoading(false) })
  }, [user.id])

  const cats = ['', 'share', 'gen', 'tx', 'team', 'activity']
  const shown = filter ? events.filter((e) => e.cat === filter) : events

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col bg-[var(--panel)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-base font-bold">{user.name || '-'}</div>
            <div className="truncate text-xs text-[var(--text-dim)]">{user.email}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-soft)] hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-[var(--border-soft)] px-5 py-3">
          {cats.map((c) => (
            <button key={c || 'all'} onClick={() => setFilter(c)}
              className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors', filter === c ? 'bg-violet-600 text-white' : 'bg-[var(--panel-2)] text-[var(--text-soft)] hover:text-[var(--text)]')}>
              {c === '' ? '전체' : CAT_META[c]?.label || c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-[var(--text-dim)]">불러오는 중…</p>
          ) : shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-dim)]">활동 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2.5">
              {shown.map((e, i) => {
                const m = CAT_META[e.cat] || { icon: LogIn, color: '#64748b', label: e.cat }
                const Icon = m.icon
                return (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: m.color + '1a', color: m.color }}>
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1 border-b border-[var(--border-soft)] pb-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{e.title}</span>
                        {e.amount != null && e.amount !== 0 && (
                          <span className={cn('flex-shrink-0 text-xs font-bold', e.amount > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {e.amount > 0 ? '+' : ''}{num(e.amount)} {e.unit || ''}
                          </span>
                        )}
                      </div>
                      {e.detail && <div className="mt-0.5 break-words text-xs text-[var(--text-soft)]">{e.detail}</div>}
                      <div className="mt-0.5 text-[11px] text-[var(--text-dim)]">{kstDateTime(e.at)}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
