'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Globe,
  Activity,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import {
  adminSecurity,
  adminSecurityAction,
  type BlockedIp,
  type SecLog,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#ef4444'

const INPUT_CLS =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500'

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function timeAgo(iso: string) {
  const d = +new Date(iso)
  if (Number.isNaN(d)) return ''
  const m = Math.floor((Date.now() - d) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function severityBadgeClass(sev: string) {
  return sev === 'high'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : sev === 'warn'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}
function severityLabel(sev: string) {
  return sev === 'high' ? '위협' : sev === 'warn' ? '경고' : '정보'
}
function sourceBadgeClass(source: string | null) {
  return source === 'auto'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : 'border-violet-200 bg-violet-50 text-violet-700'
}
function statusClass(status: number) {
  if (status >= 500) return 'text-rose-600'
  if (status >= 400) return 'text-amber-600'
  return 'text-emerald-600'
}

export default function AdminSecurityPage() {
  const [blocked, setBlocked] = useState<BlockedIp[]>([])
  const [logs, setLogs] = useState<SecLog[]>([])
  const [stats, setStats] = useState<{ blockedCount: number; events24: number; threats24: number }>({
    blockedCount: 0,
    events24: 0,
    threats24: 0,
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')

  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)
  function showToast(msg: string, kind: 'ok' | 'err' = 'ok') {
    setToast({ msg, kind })
  }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(t)
  }, [toast])

  function reload() {
    adminSecurity().then((r) => {
      setBlocked(r.blocked)
      setLogs(r.logs)
      setStats(r.stats ?? { blockedCount: r.blocked.length, events24: r.logs.length, threats24: 0 })
      setLoading(false)
    })
  }
  useEffect(() => {
    reload()
  }, [])

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => +new Date(b.ts) - +new Date(a.ts)),
    [logs],
  )

  async function submitBlock() {
    const trimmed = ip.trim()
    if (!trimmed) {
      showToast('차단할 IP를 입력하세요.', 'err')
      return
    }
    setBusy(true)
    const r = await adminSecurityAction('block', { ip: trimmed, reason: reason.trim() || undefined })
    setBusy(false)
    if (r.ok) {
      showToast(`${trimmed} 차단 완료`, 'ok')
      setIp('')
      setReason('')
      reload()
    } else {
      showToast(r.error || '차단에 실패했습니다.', 'err')
    }
  }

  async function unblock(target: string) {
    setBusy(true)
    const r = await adminSecurityAction('unblock', { ip: target })
    setBusy(false)
    if (r.ok) {
      showToast(`${target} 차단 해제 완료`, 'ok')
      reload()
    } else {
      showToast(r.error || '해제에 실패했습니다.', 'err')
    }
  }

  async function clearLogs() {
    if (typeof window !== 'undefined' && !window.confirm('보안 로그를 모두 비우시겠습니까? 되돌릴 수 없습니다.')) return
    setBusy(true)
    const r = await adminSecurityAction('clear-logs')
    setBusy(false)
    if (r.ok) {
      showToast('보안 로그를 비웠습니다.', 'ok')
      reload()
    } else {
      showToast(r.error || '로그 비우기에 실패했습니다.', 'err')
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ShieldAlert}
        eyebrow="ADMIN · 보안"
        title="보안 대시보드"
        desc="IP 차단과 접근·위협 로그를 관리합니다."
        accent={ACCENT}
        action={
          <Button variant="outline" size="sm" onClick={reload} disabled={loading || busy}>
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* stats */}
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="차단 IP"
              value={(<Counter to={stats.blockedCount} />) as unknown as string}
              icon={Ban}
              accent="#ef4444"
            />
            <StatCard
              label="24시간 이벤트"
              value={(<Counter to={stats.events24} />) as unknown as string}
              icon={Activity}
              accent="#0ea5e9"
            />
            <StatCard
              label="24시간 위협"
              value={(<Counter to={stats.threats24} />) as unknown as string}
              icon={ShieldAlert}
              accent="#f43f5e"
            />
          </div>
        </Reveal>

        {/* IP 차단 */}
        <Reveal>
          <Panel title="IP 차단">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitBlock()}
                placeholder="차단할 IP (예: 203.0.113.5)"
                className={cn(INPUT_CLS, 'sm:max-w-xs')}
              />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitBlock()}
                placeholder="사유 (선택)"
                className={INPUT_CLS}
              />
              <Button
                variant="primary"
                size="md"
                className="!bg-gradient-to-br !from-rose-500 !to-red-500 sm:flex-shrink-0"
                disabled={busy}
                onClick={submitBlock}
              >
                <Ban size={15} /> 차단
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">IP</th>
                    <th className="pb-2.5 font-medium">사유</th>
                    <th className="pb-2.5 font-medium">유형</th>
                    <th className="pb-2.5 font-medium">차단일시</th>
                    <th className="pb-2.5 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {blocked.map((b) => (
                    <tr
                      key={b.ip}
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <span className="flex items-center gap-2 font-mono font-medium">
                          <Globe size={14} className="text-[var(--text-dim)]" />
                          {b.ip}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">{b.reason || '-'}</td>
                      <td className="py-3">
                        <Badge className={sourceBadgeClass(b.source)}>
                          {b.source === 'auto' ? 'auto' : 'manual'}
                        </Badge>
                      </td>
                      <td className="py-3 text-[var(--text-soft)]">{fmtDateTime(b.created_at)}</td>
                      <td className="py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="!border-emerald-200 !text-emerald-600 hover:!bg-emerald-50"
                            disabled={busy}
                            onClick={() => unblock(b.ip)}
                          >
                            <ShieldCheck size={15} /> 해제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {blocked.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '차단된 IP가 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>

        {/* 보안 로그 */}
        <Reveal>
          <Panel
            title="보안 로그"
            action={
              <Button
                variant="outline"
                size="sm"
                className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                disabled={busy || sortedLogs.length === 0}
                onClick={clearLogs}
              >
                <Trash2 size={15} /> 로그 비우기
              </Button>
            }
          >
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">시각</th>
                    <th className="pb-2.5 font-medium">IP</th>
                    <th className="pb-2.5 font-medium">메서드</th>
                    <th className="pb-2.5 font-medium">경로</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 font-medium">심각도</th>
                    <th className="pb-2.5 font-medium">detail</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.map((l, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">
                        <span title={timeAgo(l.ts)}>{fmtDateTime(l.ts)}</span>
                      </td>
                      <td className="py-2.5 font-mono text-xs">{l.ip}</td>
                      <td className="py-2.5">
                        <span className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-xs font-medium">
                          {l.method}
                        </span>
                      </td>
                      <td className="max-w-[240px] truncate py-2.5 font-mono text-xs text-[var(--text-soft)]">
                        {l.path}
                      </td>
                      <td className={cn('py-2.5 font-mono text-xs font-semibold', statusClass(l.status))}>
                        {l.status}
                      </td>
                      <td className="py-2.5">
                        <Badge className={severityBadgeClass(l.severity)}>{severityLabel(l.severity)}</Badge>
                      </td>
                      <td className="max-w-[280px] truncate py-2.5 text-[var(--text-soft)]" title={l.detail}>
                        {l.detail || '-'}
                      </td>
                    </tr>
                  ))}
                  {sortedLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '보안 로그가 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {sortedLogs.length > 0 && (
              <p className="mt-3 text-xs text-[var(--text-dim)]">최신순 · 총 {sortedLogs.length}건</p>
            )}
          </Panel>
        </Reveal>
      </div>

      {/* toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-fade-in',
            toast.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700',
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
