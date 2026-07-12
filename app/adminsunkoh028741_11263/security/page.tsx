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
  ListChecks,
  KeyRound,
  Users,
  LogOut,
  ScrollText,
  Download,
  Flag,
  Smartphone,
  Bell,
  Search,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  MapPin,
  Monitor,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import {
  adminSecurity,
  adminSecurityAction,
  type SecurityBundle,
  type BlockedIp,
  type WhitelistIp,
  type SecLog,
  type LoginFail,
  type SessionRow,
  type AuditRow,
  type ExportRow,
  type ReportRow,
  type InstallRow,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#ef4444'

const INPUT_CLS =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3.5 py-2.5 text-sm outline-none focus:border-violet-500'

/* ───────── helpers ───────── */
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
function reportStatusClass(status: string) {
  return status === 'open'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : status === 'hidden'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : status === 'restored'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}
function reportStatusLabel(status: string) {
  return status === 'open'
    ? '대기'
    : status === 'hidden'
    ? '숨김'
    : status === 'restored'
    ? '복원'
    : status === 'ignored'
    ? '무시'
    : status
}
function fmtBytes(bytes: number) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}
/** UA → 짧은 기기 문자열 */
function deviceOf(ua: string) {
  if (!ua) return '-'
  const u = ua.toLowerCase()
  let os = ''
  if (u.includes('iphone')) os = 'iPhone'
  else if (u.includes('ipad')) os = 'iPad'
  else if (u.includes('android')) os = 'Android'
  else if (u.includes('windows')) os = 'Windows'
  else if (u.includes('mac os') || u.includes('macintosh')) os = 'macOS'
  else if (u.includes('linux')) os = 'Linux'
  let br = ''
  if (u.includes('edg/')) br = 'Edge'
  else if (u.includes('opr/') || u.includes('opera')) br = 'Opera'
  else if (u.includes('samsungbrowser')) br = 'Samsung'
  else if (u.includes('chrome/') && !u.includes('edg/')) br = 'Chrome'
  else if (u.includes('firefox')) br = 'Firefox'
  else if (u.includes('safari') && !u.includes('chrome')) br = 'Safari'
  if (os && br) return `${os} · ${br}`
  return os || br || '-'
}
function loc(country?: string, city?: string) {
  const parts = [country, city].filter(Boolean)
  return parts.length ? parts.join(' · ') : ''
}

/** CSV 다운로드 + 내보내기 감사 기록 */
async function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return { ok: false, error: '브라우저 환경이 아닙니다.' }
  const esc = (v: string) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const csv = '﻿' + lines
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return adminSecurityAction('export-log', { filename, kind: 'csv', rows: rows.length, bytes: blob.size })
}

/* ───────── small UI atoms ───────── */
const TH_CLS = 'pb-2.5 font-medium'
const THEAD_CLS = 'border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]'
const TR_CLS = 'border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50'

function EmptyRow({ colSpan, loading, label }: { colSpan: number; loading: boolean; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-[var(--text-dim)]">
        {loading ? '불러오는 중…' : label}
      </td>
    </tr>
  )
}

function MonoIp({ ip }: { ip: string }) {
  return (
    <span className="flex items-center gap-2 font-mono text-xs font-medium">
      <Globe size={13} className="text-[var(--text-dim)]" />
      {ip}
    </span>
  )
}

type TabKey =
  | 'block'
  | 'whitelist'
  | 'anomaly'
  | 'login'
  | 'sessions'
  | 'lookup'
  | 'audit'
  | 'exports'
  | 'reports'
  | 'apps'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'block', label: 'IP 차단', icon: Ban },
  { key: 'whitelist', label: '화이트리스트', icon: ListChecks },
  { key: 'anomaly', label: '이상행동 감지', icon: Activity },
  { key: 'login', label: '로그인 실패', icon: KeyRound },
  { key: 'sessions', label: '활성 세션', icon: Users },
  { key: 'lookup', label: 'IP 조회', icon: Search },
  { key: 'audit', label: '감사 로그', icon: ScrollText },
  { key: 'exports', label: '내보내기 감사', icon: Download },
  { key: 'reports', label: '신고 관리', icon: Flag },
  { key: 'apps', label: '앱·푸시', icon: Smartphone },
]

const EMPTY_BUNDLE: SecurityBundle = {
  ok: false,
  settings: { whitelistMode: false },
  blocked: [],
  whitelist: [],
  logs: [],
  loginFailures: [],
  sessions: [],
  audit: [],
  exports: [],
  reports: [],
  installs: [],
  stats: {
    blockedCount: 0,
    whitelistCount: 0,
    events24: 0,
    threats24: 0,
    loginFails24: 0,
    activeSessions: 0,
    pendingReports: 0,
    installsTotal: 0,
    pushAllowed: 0,
  },
}

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityBundle>(EMPTY_BUNDLE)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<TabKey>('block')

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
      setData(r)
      setLoading(false)
    })
  }
  useEffect(() => {
    reload()
  }, [])

  /** 액션 래퍼: busy → await → toast → reload */
  async function run(
    fn: () => Promise<{ ok: boolean; error?: string; sent?: number }>,
    okMsg: string | ((r: { sent?: number }) => string),
    errMsg = '작업에 실패했습니다.',
  ) {
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (r.ok) {
      showToast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'ok')
      reload()
    } else {
      showToast(r.error || errMsg, 'err')
    }
    return r
  }

  function confirmed(msg: string) {
    return typeof window === 'undefined' ? true : window.confirm(msg)
  }

  /* ── IP 차단 tab ── */
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function submitBlock() {
    const trimmed = ip.trim()
    if (!trimmed) return showToast('차단할 IP를 입력하세요.', 'err')
    const r = await run(
      () => adminSecurityAction('block', { ip: trimmed, reason: reason.trim() || undefined }),
      `${trimmed} 차단 완료`,
      '차단에 실패했습니다.',
    )
    if (r.ok) {
      setIp('')
      setReason('')
    }
  }
  function toggleSel(target: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(target)) next.delete(target)
      else next.add(target)
      return next
    })
  }

  /* ── 화이트리스트 tab ── */
  const [wlIp, setWlIp] = useState('')
  const [wlLabel, setWlLabel] = useState('')
  async function submitWhitelist() {
    const trimmed = wlIp.trim()
    if (!trimmed) return showToast('허용할 IP를 입력하세요.', 'err')
    const r = await run(
      () => adminSecurityAction('whitelist-add', { ip: trimmed, label: wlLabel.trim() || undefined }),
      `${trimmed} 화이트리스트 추가`,
    )
    if (r.ok) {
      setWlIp('')
      setWlLabel('')
    }
  }

  /* ── 이상행동 tab ── */
  const [sevFilter, setSevFilter] = useState<'all' | 'high' | 'warn' | 'info'>('all')
  const [logSearch, setLogSearch] = useState('')
  const sortedLogs = useMemo(
    () => [...data.logs].sort((a, b) => +new Date(b.ts) - +new Date(a.ts)),
    [data.logs],
  )
  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    return sortedLogs.filter((l) => {
      if (sevFilter !== 'all' && l.severity !== sevFilter) return false
      if (q && !l.ip.toLowerCase().includes(q)) return false
      return true
    })
  }, [sortedLogs, sevFilter, logSearch])

  /* ── IP 조회 tab ── */
  const [lookup, setLookup] = useState('')
  const [lookupQ, setLookupQ] = useState('')
  const lookupResult = useMemo(() => {
    const q = lookupQ.trim()
    if (!q) return null
    const logs = data.logs.filter((l) => l.ip === q)
    const sessions = data.sessions.filter((s) => s.ip === q)
    const blocked = data.blocked.filter((b) => b.ip === q)
    const loginFailures = data.loginFailures.filter((f) => f.ip === q)
    const installs = data.installs.filter((i) => i.ip === q)
    const meta = { country: '', city: '' }
    for (const src of [...logs, ...blocked, ...installs] as { country?: string; city?: string }[]) {
      if (!meta.country && src.country) meta.country = src.country
      if (!meta.city && src.city) meta.city = src.city
    }
    const members = new Set<string>()
    for (const s of sessions) if (s.email) members.add(s.email)
    for (const i of installs) if (i.user_email) members.add(i.user_email)
    return {
      q,
      logs,
      sessions,
      blocked,
      loginFailures,
      installs,
      meta,
      members: [...members],
      events: logs.length,
    }
  }, [lookupQ, data])

  /* ── 앱·푸시 tab ── */
  const [pushTitle, setPushTitle] = useState('')
  const [pushBody, setPushBody] = useState('')
  async function sendPush() {
    const t = pushTitle.trim()
    const b = pushBody.trim()
    if (!t || !b) return showToast('제목과 내용을 입력하세요.', 'err')
    const r = await run(
      () => adminSecurityAction('push-send', { title: t, body: b }),
      (res) => `${res.sent ?? 0}명에게 발송`,
      '푸시 발송에 실패했습니다.',
    )
    if (r.ok) {
      setPushTitle('')
      setPushBody('')
    }
  }

  const s = data.stats

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ShieldAlert}
        eyebrow="ADMIN · 보안"
        title="보안 센터"
        desc="접근 제한 · IP 차단 · 위협 감지 · 세션 · 감사 로그를 통합 관리합니다."
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="차단 IP" value={(<Counter to={s.blockedCount} />) as unknown as string} icon={Ban} accent="#ef4444" />
            <StatCard label="화이트리스트" value={(<Counter to={s.whitelistCount} />) as unknown as string} icon={ListChecks} accent="#10b981" />
            <StatCard label="24h 위협" value={(<Counter to={s.threats24} />) as unknown as string} icon={ShieldAlert} accent="#f43f5e" />
            <StatCard label="로그인 실패 24h" value={(<Counter to={s.loginFails24} />) as unknown as string} icon={KeyRound} accent="#f59e0b" />
            <StatCard label="활성 세션" value={(<Counter to={s.activeSessions} />) as unknown as string} icon={Users} accent="#8b5cf6" />
            <StatCard label="신고 대기" value={(<Counter to={s.pendingReports} />) as unknown as string} icon={Flag} accent="#f97316" />
            <StatCard label="앱 설치" value={(<Counter to={s.installsTotal} />) as unknown as string} icon={Smartphone} accent="#0ea5e9" />
            <StatCard label="푸시 허용" value={(<Counter to={s.pushAllowed} />) as unknown as string} icon={Bell} accent="#6366f1" />
          </div>
        </Reveal>

        {/* tab bar */}
        <Reveal>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-2">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200',
                    active
                      ? 'brand-gradient text-white shadow-md shadow-violet-500/25'
                      : 'text-[var(--text-soft)] hover:bg-white hover:text-[var(--text)]',
                  )}
                >
                  <Icon size={15} /> {t.label}
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* ══════════ IP 차단 ══════════ */}
        {tab === 'block' && (
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
                  className="!bg-gradient-to-br !from-rose-500 !to-red-500 !shadow-rose-500/25 sm:flex-shrink-0"
                  disabled={busy}
                  onClick={submitBlock}
                >
                  <Ban size={15} /> 차단
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--text-dim)]">선택 {selected.size}건</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="!border-emerald-200 !text-emerald-600 hover:!bg-emerald-50"
                  disabled={busy || selected.size === 0}
                  onClick={() =>
                    run(() => adminSecurityAction('unblock-many', { ips: [...selected] }), '선택 IP 해제 완료').then(() =>
                      setSelected(new Set()),
                    )
                  }
                >
                  <ShieldCheck size={15} /> 선택 해제
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                  disabled={busy || data.blocked.length === 0}
                  onClick={() => {
                    if (!confirmed('차단된 IP를 모두 해제하시겠습니까?')) return
                    run(() => adminSecurityAction('unblock-all'), '전체 해제 완료').then(() => setSelected(new Set()))
                  }}
                >
                  <Unlock size={15} /> 전체 해제
                </Button>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className={THEAD_CLS}>
                      <th className="w-8 pb-2.5" />
                      <th className={TH_CLS}>IP</th>
                      <th className={TH_CLS}>사유</th>
                      <th className={TH_CLS}>유형</th>
                      <th className={TH_CLS}>차단일시</th>
                      <th className={cn(TH_CLS, 'text-right')}>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blocked.map((b: BlockedIp) => (
                      <tr key={b.ip} className={TR_CLS}>
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(b.ip)}
                            onChange={() => toggleSel(b.ip)}
                            className="h-4 w-4 accent-rose-500"
                          />
                        </td>
                        <td className="py-3">
                          <MonoIp ip={b.ip} />
                          {loc(b.country, b.city) && (
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-dim)]">
                              <MapPin size={11} /> {loc(b.country, b.city)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-[var(--text-soft)]">{b.reason || '-'}</td>
                        <td className="py-3">
                          <Badge className={sourceBadgeClass(b.source)}>{b.source === 'auto' ? 'auto' : 'manual'}</Badge>
                        </td>
                        <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">{fmtDateTime(b.created_at)}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="!border-emerald-200 !text-emerald-600 hover:!bg-emerald-50"
                              disabled={busy}
                              onClick={() => run(() => adminSecurityAction('unblock', { ip: b.ip }), `${b.ip} 해제 완료`)}
                            >
                              <ShieldCheck size={15} /> 해제
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="!text-rose-600 hover:!bg-rose-50"
                              disabled={busy}
                              onClick={() => {
                                if (!confirmed(`${b.ip} 기록을 완전 삭제하시겠습니까?`)) return
                                run(() => adminSecurityAction('delete-ip', { ip: b.ip }), `${b.ip} 삭제 완료`)
                              }}
                            >
                              <Trash2 size={15} /> 삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.blocked.length === 0 && <EmptyRow colSpan={6} loading={loading} label="차단된 IP가 없습니다." />}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {data.blocked.length}건</p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 화이트리스트 ══════════ */}
        {tab === 'whitelist' && (
          <div className="space-y-6">
            <Reveal>
              <div
                className={cn(
                  'card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between',
                  data.settings.whitelistMode && 'ring-1 ring-rose-300',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl',
                      data.settings.whitelistMode ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {data.settings.whitelistMode ? <Lock size={20} /> : <Unlock size={20} />}
                  </span>
                  <div>
                    <p className="font-semibold">화이트리스트 모드</p>
                    <p className="mt-0.5 text-sm text-[var(--text-soft)]">
                      켜면 허용 IP만 사이트 접근 가능합니다. 신중하게 사용하세요.
                    </p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={data.settings.whitelistMode}
                  disabled={busy}
                  onClick={() => {
                    const next = !data.settings.whitelistMode
                    if (next && !confirmed('화이트리스트 모드를 켜면 허용 IP 외 모든 접근이 차단됩니다. 계속할까요?')) return
                    run(
                      () => adminSecurityAction('whitelist-mode', { enabled: next }),
                      next ? '화이트리스트 모드 ON' : '화이트리스트 모드 OFF',
                    )
                  }}
                  className={cn(
                    'relative h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50',
                    data.settings.whitelistMode ? 'bg-rose-500' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                      data.settings.whitelistMode ? 'left-1 translate-x-5' : 'left-1',
                    )}
                  />
                </button>
              </div>
            </Reveal>

            <Reveal>
              <Panel title="허용 IP 추가">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <input
                    value={wlIp}
                    onChange={(e) => setWlIp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitWhitelist()}
                    placeholder="허용 IP"
                    className={cn(INPUT_CLS, 'sm:max-w-xs')}
                  />
                  <input
                    value={wlLabel}
                    onChange={(e) => setWlLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitWhitelist()}
                    placeholder="라벨 (선택)"
                    className={INPUT_CLS}
                  />
                  <Button variant="primary" size="md" className="sm:flex-shrink-0" disabled={busy} onClick={submitWhitelist}>
                    <ListChecks size={15} /> 추가
                  </Button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className={THEAD_CLS}>
                        <th className={TH_CLS}>IP</th>
                        <th className={TH_CLS}>라벨</th>
                        <th className={TH_CLS}>등록일시</th>
                        <th className={cn(TH_CLS, 'text-right')}>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.whitelist.map((w: WhitelistIp) => (
                        <tr key={w.ip} className={TR_CLS}>
                          <td className="py-3">
                            <MonoIp ip={w.ip} />
                          </td>
                          <td className="py-3 text-[var(--text-soft)]">{w.label || '-'}</td>
                          <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">{fmtDateTime(w.created_at)}</td>
                          <td className="py-3">
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="!text-rose-600 hover:!bg-rose-50"
                                disabled={busy}
                                onClick={() => run(() => adminSecurityAction('whitelist-remove', { ip: w.ip }), `${w.ip} 제거 완료`)}
                              >
                                <XCircle size={15} /> 해제
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {data.whitelist.length === 0 && (
                        <EmptyRow colSpan={4} loading={loading} label="허용 IP가 없습니다." />
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </Reveal>
          </div>
        )}

        {/* ══════════ 이상행동 감지 ══════════ */}
        {tab === 'anomaly' && (
          <Reveal>
            <Panel
              title="이상행동 감지"
              action={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || filteredLogs.length === 0}
                    onClick={() =>
                      downloadCsv(
                        `security-logs-${Date.now()}.csv`,
                        ['시각', 'IP', '국가', '도시', '메서드', '경로', '상태', '심각도', 'detail'],
                        filteredLogs.map((l) => [
                          fmtDateTime(l.ts),
                          l.ip,
                          l.country || '',
                          l.city || '',
                          l.method,
                          l.path,
                          String(l.status),
                          severityLabel(l.severity),
                          l.detail || '',
                        ]),
                      ).then((r) => showToast(r.ok ? 'CSV 내보내기 완료' : r.error || '내보내기 실패', r.ok ? 'ok' : 'err'))
                    }
                  >
                    <Download size={15} /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                    disabled={busy || data.logs.length === 0}
                    onClick={() => {
                      if (!confirmed('보안 로그를 모두 비우시겠습니까? 되돌릴 수 없습니다.')) return
                      run(() => adminSecurityAction('clear-logs'), '보안 로그를 비웠습니다.')
                    }}
                  >
                    <Trash2 size={15} /> 로그 비우기
                  </Button>
                </div>
              }
            >
              <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="flex gap-1.5">
                  {(['all', 'high', 'warn', 'info'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setSevFilter(k)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                        sevFilter === k
                          ? 'border-violet-300 bg-violet-50 text-violet-700'
                          : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-50',
                      )}
                    >
                      {k === 'all' ? '전체' : severityLabel(k)}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="IP 검색"
                    className={cn(INPUT_CLS, 'pl-9')}
                  />
                </div>
              </div>

              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[940px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className={THEAD_CLS}>
                      <th className={TH_CLS}>시각</th>
                      <th className={TH_CLS}>IP</th>
                      <th className={TH_CLS}>국가/도시</th>
                      <th className={TH_CLS}>메서드</th>
                      <th className={TH_CLS}>경로</th>
                      <th className={TH_CLS}>상태</th>
                      <th className={TH_CLS}>심각도</th>
                      <th className={TH_CLS}>detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((l: SecLog, i) => (
                      <tr key={i} className={TR_CLS}>
                        <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">
                          <span title={timeAgo(l.ts)}>{fmtDateTime(l.ts)}</span>
                        </td>
                        <td className="py-2.5 font-mono text-xs">{l.ip}</td>
                        <td className="whitespace-nowrap py-2.5 text-xs text-[var(--text-soft)]">{loc(l.country, l.city) || '-'}</td>
                        <td className="py-2.5">
                          <span className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-xs font-medium">
                            {l.method}
                          </span>
                        </td>
                        <td className="max-w-[220px] truncate py-2.5 font-mono text-xs text-[var(--text-soft)]" title={l.path}>
                          {l.path}
                        </td>
                        <td className={cn('py-2.5 font-mono text-xs font-semibold', statusClass(l.status))}>{l.status}</td>
                        <td className="py-2.5">
                          <Badge className={severityBadgeClass(l.severity)}>{severityLabel(l.severity)}</Badge>
                        </td>
                        <td className="max-w-[260px] truncate py-2.5 text-[var(--text-soft)]" title={l.detail}>
                          {l.detail || '-'}
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <EmptyRow colSpan={8} loading={loading} label="해당 조건의 로그가 없습니다." />
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">
                최신순 · {filteredLogs.length}건 표시 (전체 {data.logs.length}건)
              </p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 로그인 실패 ══════════ */}
        {tab === 'login' && (
          <Reveal>
            <Panel
              title="로그인 실패"
              action={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || data.loginFailures.length === 0}
                    onClick={() =>
                      downloadCsv(
                        `login-failures-${Date.now()}.csv`,
                        ['시각', '이메일', 'IP', '국가', 'UA'],
                        data.loginFailures.map((f) => [fmtDateTime(f.created_at), f.email, f.ip, f.country || '', f.ua || '']),
                      ).then((r) => showToast(r.ok ? 'CSV 내보내기 완료' : r.error || '내보내기 실패', r.ok ? 'ok' : 'err'))
                    }
                  >
                    <Download size={15} /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                    disabled={busy || data.loginFailures.length === 0}
                    onClick={() => {
                      if (!confirmed('로그인 실패 기록을 모두 비우시겠습니까?')) return
                      run(() => adminSecurityAction('clear-login-failures'), '실패 기록을 비웠습니다.')
                    }}
                  >
                    <Trash2 size={15} /> 실패기록 비우기
                  </Button>
                </div>
              }
            >
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
                <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                <span>동일 IP에서 15분 내 8회 초과 로그인 실패 시 해당 IP가 자동 차단됩니다.</span>
              </div>

              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className={THEAD_CLS}>
                      <th className={TH_CLS}>시각</th>
                      <th className={TH_CLS}>이메일</th>
                      <th className={TH_CLS}>IP</th>
                      <th className={TH_CLS}>국가</th>
                      <th className={TH_CLS}>UA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.loginFailures.map((f: LoginFail, i) => (
                      <tr key={i} className={TR_CLS}>
                        <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{fmtDateTime(f.created_at)}</td>
                        <td className="py-2.5 font-medium">{f.email || '-'}</td>
                        <td className="py-2.5 font-mono text-xs">{f.ip}</td>
                        <td className="py-2.5 text-[var(--text-soft)]">{f.country || '-'}</td>
                        <td className="max-w-[280px] truncate py-2.5 text-xs text-[var(--text-dim)]" title={f.ua}>
                          {f.ua || '-'}
                        </td>
                      </tr>
                    ))}
                    {data.loginFailures.length === 0 && (
                      <EmptyRow colSpan={5} loading={loading} label="로그인 실패 기록이 없습니다." />
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {data.loginFailures.length}건</p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 활성 세션 ══════════ */}
        {tab === 'sessions' && (
          <Reveal>
            <Panel
              title="활성 세션"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                  disabled={busy || data.sessions.length === 0}
                  onClick={() => {
                    if (!confirmed('모든 사용자를 강제 로그아웃하시겠습니까?')) return
                    run(() => adminSecurityAction('force-logout-all'), '전체 강제 로그아웃 완료')
                  }}
                >
                  <LogOut size={15} /> 전체 강제 로그아웃
                </Button>
              }
            >
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className={THEAD_CLS}>
                      <th className={TH_CLS}>회원</th>
                      <th className={TH_CLS}>권한</th>
                      <th className={TH_CLS}>IP</th>
                      <th className={TH_CLS}>국가</th>
                      <th className={TH_CLS}>기기</th>
                      <th className={TH_CLS}>로그인</th>
                      <th className={TH_CLS}>만료</th>
                      <th className={cn(TH_CLS, 'text-right')}>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((se: SessionRow) => (
                      <tr key={se.token} className={TR_CLS}>
                        <td className="py-2.5">
                          <div className="font-medium">{se.name || '(이름 없음)'}</div>
                          <div className="text-xs text-[var(--text-dim)]">{se.email || '-'}</div>
                        </td>
                        <td className="py-2.5">
                          <Badge
                            className={
                              se.role === 'admin'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }
                          >
                            {se.role || 'user'}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-mono text-xs">{se.ip}</td>
                        <td className="py-2.5 text-[var(--text-soft)]">{se.country || '-'}</td>
                        <td className="whitespace-nowrap py-2.5 text-xs text-[var(--text-soft)]">
                          <span className="flex items-center gap-1">
                            <Monitor size={12} className="text-[var(--text-dim)]" /> {deviceOf(se.ua)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-2.5 text-xs text-[var(--text-soft)]">{fmtDateTime(se.created_at)}</td>
                        <td className="whitespace-nowrap py-2.5 text-xs text-[var(--text-dim)]">{fmtDateTime(se.expires_at)}</td>
                        <td className="py-2.5">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="!text-rose-600 hover:!bg-rose-50"
                              disabled={busy}
                              onClick={() => run(() => adminSecurityAction('force-logout', { token: se.fullToken }), '세션 종료 완료')}
                            >
                              <LogOut size={15} /> 강제 종료
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.sessions.length === 0 && (
                      <EmptyRow colSpan={8} loading={loading} label="활성 세션이 없습니다." />
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {data.sessions.length}개 세션</p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ IP 조회 ══════════ */}
        {tab === 'lookup' && (
          <Reveal>
            <Panel title="IP 조회">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setLookupQ(lookup.trim())}
                    placeholder="조회할 IP (예: 203.0.113.5)"
                    className={cn(INPUT_CLS, 'pl-9')}
                  />
                </div>
                <Button variant="primary" size="md" className="sm:flex-shrink-0" onClick={() => setLookupQ(lookup.trim())}>
                  <Search size={15} /> 조회
                </Button>
              </div>

              {!lookupResult && (
                <p className="mt-6 text-center text-sm text-[var(--text-dim)]">
                  IP를 입력해 접속 이력 · 세션 · 차단 · 로그인 실패 · 앱 설치를 확인하세요.
                </p>
              )}

              {lookupResult && (
                <div className="mt-5 space-y-5">
                  {/* summary */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-[var(--text-dim)]" />
                      <span className="font-mono font-semibold">{lookupResult.q}</span>
                      {lookupResult.blocked.length > 0 && (
                        <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                          <Ban size={12} /> 차단됨
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-[var(--text-dim)]">국가/도시</p>
                        <p className="font-medium">{loc(lookupResult.meta.country, lookupResult.meta.city) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-dim)]">보안 이벤트</p>
                        <p className="font-medium">{lookupResult.events}건</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-dim)]">접속 회원</p>
                        <p className="truncate font-medium" title={lookupResult.members.join(', ')}>
                          {lookupResult.members.length ? lookupResult.members.join(', ') : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-dim)]">세션 · 실패 · 설치</p>
                        <p className="font-medium">
                          {lookupResult.sessions.length} · {lookupResult.loginFailures.length} · {lookupResult.installs.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* logs for this IP */}
                  <div className="overflow-x-auto">
                    <p className="mb-2 text-sm font-semibold">보안 이벤트 ({lookupResult.logs.length})</p>
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className={THEAD_CLS}>
                          <th className={TH_CLS}>시각</th>
                          <th className={TH_CLS}>메서드</th>
                          <th className={TH_CLS}>경로</th>
                          <th className={TH_CLS}>상태</th>
                          <th className={TH_CLS}>심각도</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lookupResult.logs
                          .slice()
                          .sort((a, b) => +new Date(b.ts) - +new Date(a.ts))
                          .slice(0, 50)
                          .map((l, i) => (
                            <tr key={i} className={TR_CLS}>
                              <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{fmtDateTime(l.ts)}</td>
                              <td className="py-2.5 font-mono text-xs">{l.method}</td>
                              <td className="max-w-[240px] truncate py-2.5 font-mono text-xs text-[var(--text-soft)]" title={l.path}>
                                {l.path}
                              </td>
                              <td className={cn('py-2.5 font-mono text-xs font-semibold', statusClass(l.status))}>{l.status}</td>
                              <td className="py-2.5">
                                <Badge className={severityBadgeClass(l.severity)}>{severityLabel(l.severity)}</Badge>
                              </td>
                            </tr>
                          ))}
                        {lookupResult.logs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[var(--text-dim)]">
                              이 IP의 보안 이벤트가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {lookupResult.blocked.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                      disabled={busy}
                      onClick={() => run(() => adminSecurityAction('block', { ip: lookupResult.q }), `${lookupResult.q} 차단 완료`)}
                    >
                      <Ban size={15} /> 이 IP 차단
                    </Button>
                  )}
                </div>
              )}
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 감사 로그 ══════════ */}
        {tab === 'audit' && (
          <Reveal>
            <Panel
              title="감사 로그"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || data.audit.length === 0}
                  onClick={() =>
                    downloadCsv(
                      `audit-log-${Date.now()}.csv`,
                      ['시각', '관리자', 'action', 'target', 'detail', '심각도', 'IP'],
                      data.audit.map((a) => [
                        fmtDateTime(a.created_at),
                        a.admin_email,
                        a.action,
                        a.target,
                        a.detail || '',
                        severityLabel(a.severity),
                        a.ip,
                      ]),
                    ).then((r) => showToast(r.ok ? 'CSV 내보내기 완료' : r.error || '내보내기 실패', r.ok ? 'ok' : 'err'))
                  }
                >
                  <Download size={15} /> CSV 내보내기
                </Button>
              }
            >
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className={THEAD_CLS}>
                      <th className={TH_CLS}>시각</th>
                      <th className={TH_CLS}>관리자</th>
                      <th className={TH_CLS}>action</th>
                      <th className={TH_CLS}>target</th>
                      <th className={TH_CLS}>detail</th>
                      <th className={TH_CLS}>심각도</th>
                      <th className={TH_CLS}>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.audit.map((a: AuditRow, i) => (
                      <tr key={i} className={TR_CLS}>
                        <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{fmtDateTime(a.created_at)}</td>
                        <td className="py-2.5 font-medium">{a.admin_email}</td>
                        <td className="py-2.5">
                          <span className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-xs">
                            {a.action}
                          </span>
                        </td>
                        <td className="max-w-[180px] truncate py-2.5 text-[var(--text-soft)]" title={a.target}>
                          {a.target || '-'}
                        </td>
                        <td className="max-w-[220px] truncate py-2.5 text-[var(--text-soft)]" title={a.detail}>
                          {a.detail || '-'}
                        </td>
                        <td className="py-2.5">
                          <Badge className={severityBadgeClass(a.severity)}>{severityLabel(a.severity)}</Badge>
                        </td>
                        <td className="py-2.5 font-mono text-xs">{a.ip}</td>
                      </tr>
                    ))}
                    {data.audit.length === 0 && <EmptyRow colSpan={7} loading={loading} label="감사 로그가 없습니다." />}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {data.audit.length}건</p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 내보내기 감사 ══════════ */}
        {tab === 'exports' && (
          <Reveal>
            <Panel title="내보내기 감사">
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className={THEAD_CLS}>
                      <th className={TH_CLS}>시각</th>
                      <th className={TH_CLS}>관리자</th>
                      <th className={TH_CLS}>파일명</th>
                      <th className={TH_CLS}>종류</th>
                      <th className={TH_CLS}>행수</th>
                      <th className={TH_CLS}>용량</th>
                      <th className={TH_CLS}>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.exports.map((e: ExportRow, i) => (
                      <tr key={i} className={TR_CLS}>
                        <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{fmtDateTime(e.created_at)}</td>
                        <td className="py-2.5 font-medium">{e.admin_email}</td>
                        <td className="max-w-[240px] truncate py-2.5 font-mono text-xs text-[var(--text-soft)]" title={e.filename}>
                          {e.filename}
                        </td>
                        <td className="py-2.5">
                          <Badge className="border-sky-200 bg-sky-50 text-sky-700">{e.kind}</Badge>
                        </td>
                        <td className="py-2.5 text-[var(--text-soft)]">{e.rows.toLocaleString('ko-KR')}</td>
                        <td className="py-2.5 text-[var(--text-soft)]">{fmtBytes(e.bytes)}</td>
                        <td className="py-2.5 font-mono text-xs">{e.ip}</td>
                      </tr>
                    ))}
                    {data.exports.length === 0 && <EmptyRow colSpan={7} loading={loading} label="내보내기 기록이 없습니다." />}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {data.exports.length}건</p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 신고 관리 ══════════ */}
        {tab === 'reports' && (
          <Reveal>
            <Panel title="신고 관리">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className={THEAD_CLS}>
                      <th className={TH_CLS}>시각</th>
                      <th className={TH_CLS}>신고자</th>
                      <th className={TH_CLS}>대상</th>
                      <th className={TH_CLS}>사유</th>
                      <th className={TH_CLS}>상태</th>
                      <th className={cn(TH_CLS, 'text-right')}>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reports.map((rp: ReportRow) => (
                      <tr key={rp.id} className={TR_CLS}>
                        <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">{fmtDateTime(rp.created_at)}</td>
                        <td className="py-3">{rp.reporter_email || '(익명)'}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Badge className="border-slate-200 bg-slate-50 text-slate-600">{rp.target_type}</Badge>
                            <span className="max-w-[200px] truncate text-[var(--text-soft)]" title={rp.target_desc}>
                              {rp.target_desc || rp.target_id}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-[220px] truncate py-3 text-[var(--text-soft)]" title={rp.reason}>
                          {rp.reason || '-'}
                        </td>
                        <td className="py-3">
                          <Badge className={reportStatusClass(rp.status)}>{reportStatusLabel(rp.status)}</Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            {rp.status === 'open' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                                  disabled={busy}
                                  onClick={() =>
                                    run(() => adminSecurityAction('report-action', { id: rp.id, status: 'hidden' }), '숨김 처리 완료')
                                  }
                                >
                                  <EyeOff size={15} /> 숨김
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    run(() => adminSecurityAction('report-action', { id: rp.id, status: 'ignored' }), '무시 처리 완료')
                                  }
                                >
                                  <XCircle size={15} /> 무시
                                </Button>
                              </>
                            )}
                            {rp.status === 'hidden' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="!border-emerald-200 !text-emerald-600 hover:!bg-emerald-50"
                                disabled={busy}
                                onClick={() =>
                                  run(() => adminSecurityAction('report-action', { id: rp.id, status: 'restored' }), '복원 완료')
                                }
                              >
                                <Eye size={15} /> 복원
                              </Button>
                            )}
                            {(rp.status === 'ignored' || rp.status === 'restored') && (
                              <span className="text-xs text-[var(--text-dim)]">처리됨</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.reports.length === 0 && <EmptyRow colSpan={6} loading={loading} label="신고가 없습니다." />}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {data.reports.length}건 · 대기 {s.pendingReports}건</p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 앱·푸시 ══════════ */}
        {tab === 'apps' && (
          <div className="space-y-6">
            <Reveal>
              <Panel title="푸시 발송">
                <div className="space-y-2.5">
                  <input
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="푸시 제목"
                    className={INPUT_CLS}
                  />
                  <textarea
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    placeholder="푸시 내용"
                    rows={3}
                    className={cn(INPUT_CLS, 'resize-none')}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--text-dim)]">
                      설치 {s.installsTotal} · 푸시 허용 {s.pushAllowed}
                    </p>
                    <Button variant="primary" size="md" disabled={busy} onClick={sendPush}>
                      <Bell size={15} /> 발송
                    </Button>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <Reveal>
              <Panel title="앱 설치 현황">
                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className={THEAD_CLS}>
                        <th className={TH_CLS}>시각</th>
                        <th className={TH_CLS}>회원</th>
                        <th className={TH_CLS}>플랫폼</th>
                        <th className={TH_CLS}>푸시허용</th>
                        <th className={TH_CLS}>IP</th>
                        <th className={TH_CLS}>국가/도시</th>
                        <th className={TH_CLS}>기기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.installs.map((it: InstallRow) => (
                        <tr key={it.id} className={TR_CLS}>
                          <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{fmtDateTime(it.created_at)}</td>
                          <td className="py-2.5 font-medium">{it.user_email || '(비회원)'}</td>
                          <td className="py-2.5">
                            <Badge className="border-slate-200 bg-slate-50 text-slate-600">{it.platform || '-'}</Badge>
                          </td>
                          <td className="py-2.5">
                            {it.allowed ? (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                <CheckCircle2 size={12} /> 허용
                              </Badge>
                            ) : (
                              <Badge className="border-slate-200 bg-slate-50 text-slate-500">
                                <XCircle size={12} /> 거부
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 font-mono text-xs">{it.ip}</td>
                          <td className="whitespace-nowrap py-2.5 text-xs text-[var(--text-soft)]">{loc(it.country, it.city) || '-'}</td>
                          <td className="whitespace-nowrap py-2.5 text-xs text-[var(--text-soft)]">
                            <span className="flex items-center gap-1">
                              <Monitor size={12} className="text-[var(--text-dim)]" /> {deviceOf(it.ua)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {data.installs.length === 0 && <EmptyRow colSpan={7} loading={loading} label="앱 설치 기록이 없습니다." />}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-[var(--text-dim)]">총 {data.installs.length}건</p>
              </Panel>
            </Reveal>
          </div>
        )}
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
