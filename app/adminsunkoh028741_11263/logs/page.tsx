'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ScrollText,
  RefreshCw,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Users,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal, Counter } from '@/components/motion'
import {
  adminLogs,
  type CombinedLogs,
  type GlobalActivityRow,
  type AuditRow,
  type SecLog,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#0ea5e9'

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
function statusClass(status: number) {
  if (status >= 500) return 'text-rose-600'
  if (status >= 400) return 'text-amber-600'
  return 'text-emerald-600'
}
/** 활동 유형 → 색상 배지 */
function activityTypeClass(type: string) {
  const t = (type || '').toLowerCase()
  if (t.includes('login')) return 'border-sky-200 bg-sky-50 text-sky-700'
  if (t.includes('signup')) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (t.includes('credit')) return 'border-violet-200 bg-violet-50 text-violet-700'
  if (t.includes('point')) return 'border-amber-200 bg-amber-50 text-amber-700'
  if (t.includes('plan')) return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  if (t.includes('password')) return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}
function loc(country?: string) {
  return country ? country : ''
}

/* ───────── table atoms ───────── */
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

/* ───────── tabs ───────── */
type TabKey = 'all' | 'activity' | 'audit' | 'security'
const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'all', label: '전체', icon: ScrollText },
  { key: 'activity', label: '회원 활동', icon: Users },
  { key: 'audit', label: '관리자 감사', icon: ShieldCheck },
  { key: 'security', label: '보안 접근', icon: ShieldAlert },
]

const EMPTY: CombinedLogs = {
  ok: false,
  activity: [],
  audit: [],
  security: [],
  stats: { activity24: 0, audit24: 0, security24: 0, threats24: 0 },
}

/* ───────── tables ───────── */
function ActivityTable({
  rows,
  loading,
}: {
  rows: GlobalActivityRow[]
  loading: boolean
}) {
  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className={THEAD_CLS}>
            <th className={TH_CLS}>시각</th>
            <th className={TH_CLS}>회원</th>
            <th className={TH_CLS}>유형</th>
            <th className={TH_CLS}>내용</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={i} className={TR_CLS}>
              <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">
                <span title={timeAgo(a.created_at)}>{fmtDateTime(a.created_at)}</span>
              </td>
              <td className="py-2.5">
                <div className="font-medium">{a.name || '(이름 없음)'}</div>
                <div className="text-xs text-[var(--text-dim)]">{a.email || '-'}</div>
              </td>
              <td className="py-2.5">
                <Badge className={activityTypeClass(a.type)}>{a.type}</Badge>
              </td>
              <td className="max-w-[360px] truncate py-2.5 text-[var(--text-soft)]" title={a.detail || ''}>
                {a.detail || '-'}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <EmptyRow colSpan={4} loading={loading} label="활동 기록이 없습니다." />}
        </tbody>
      </table>
    </div>
  )
}

function AuditTable({ rows, loading }: { rows: AuditRow[]; loading: boolean }) {
  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className={THEAD_CLS}>
            <th className={TH_CLS}>시각</th>
            <th className={TH_CLS}>관리자</th>
            <th className={TH_CLS}>액션</th>
            <th className={TH_CLS}>대상</th>
            <th className={TH_CLS}>심각도</th>
            <th className={TH_CLS}>IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={i} className={TR_CLS}>
              <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{fmtDateTime(a.created_at)}</td>
              <td className="py-2.5 font-medium">{a.admin_email}</td>
              <td className="py-2.5">
                <span className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-xs">
                  {a.action}
                </span>
              </td>
              <td className="max-w-[220px] truncate py-2.5 text-[var(--text-soft)]" title={a.target}>
                {a.target || '-'}
              </td>
              <td className="py-2.5">
                <Badge className={severityBadgeClass(a.severity)}>{severityLabel(a.severity)}</Badge>
              </td>
              <td className="py-2.5 font-mono text-xs">{a.ip}</td>
            </tr>
          ))}
          {rows.length === 0 && <EmptyRow colSpan={6} loading={loading} label="감사 기록이 없습니다." />}
        </tbody>
      </table>
    </div>
  )
}

function SecurityTable({ rows, loading }: { rows: SecLog[]; loading: boolean }) {
  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className={THEAD_CLS}>
            <th className={TH_CLS}>시각</th>
            <th className={TH_CLS}>IP</th>
            <th className={TH_CLS}>메서드</th>
            <th className={TH_CLS}>경로</th>
            <th className={TH_CLS}>상태</th>
            <th className={TH_CLS}>심각도</th>
            <th className={TH_CLS}>detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={i} className={TR_CLS}>
              <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">
                <span title={timeAgo(l.ts)}>{fmtDateTime(l.ts)}</span>
              </td>
              <td className="py-2.5">
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <Globe size={12} className="text-[var(--text-dim)]" />
                  {l.ip}
                </span>
                {loc(l.country) && (
                  <span className="mt-0.5 block text-xs text-[var(--text-dim)]">{loc(l.country)}</span>
                )}
              </td>
              <td className="py-2.5">
                <span className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-xs font-medium">
                  {l.method}
                </span>
              </td>
              <td className="max-w-[240px] truncate py-2.5 font-mono text-xs text-[var(--text-soft)]" title={l.path}>
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
          {rows.length === 0 && <EmptyRow colSpan={7} loading={loading} label="보안 접근 기록이 없습니다." />}
        </tbody>
      </table>
    </div>
  )
}

/* ───────── page ───────── */
export default function AdminLogsPage() {
  const [data, setData] = useState<CombinedLogs>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('all')

  function reload() {
    setLoading(true)
    adminLogs('all', 300).then((r) => {
      setData(r.ok ? r : { ...EMPTY, error: r.error })
      setLoading(false)
    })
  }
  useEffect(() => {
    reload()
  }, [])

  const activity = useMemo(() => data.activity ?? [], [data.activity])
  const audit = useMemo(() => data.audit ?? [], [data.audit])
  const security = useMemo(() => data.security ?? [], [data.security])
  const s = data.stats ?? EMPTY.stats!

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ScrollText}
        eyebrow="ADMIN · 로그"
        title="로그 기록"
        desc="회원 활동·관리자 감사·보안 접근 로그를 한 곳에서 조회합니다."
        accent={ACCENT}
        action={
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* stats */}
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="24시간 활동" value={(<Counter to={s.activity24} />) as unknown as string} icon={Activity} accent="#0ea5e9" />
            <StatCard label="관리자 감사(24h)" value={(<Counter to={s.audit24} />) as unknown as string} icon={ShieldCheck} accent="#8b5cf6" />
            <StatCard label="보안 이벤트(24h)" value={(<Counter to={s.security24} />) as unknown as string} icon={ShieldAlert} accent="#f59e0b" />
            <StatCard label="위협 감지(24h)" value={(<Counter to={s.threats24} />) as unknown as string} icon={ShieldAlert} accent="#f43f5e" />
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

        {/* ══════════ 전체 ══════════ */}
        {tab === 'all' && (
          <div className="space-y-6">
            <Reveal>
              <Panel title="회원 활동 로그">
                <ActivityTable rows={activity} loading={loading} />
                <p className="mt-3 text-xs text-[var(--text-dim)]">총 {activity.length}건</p>
              </Panel>
            </Reveal>
            <Reveal>
              <Panel title="관리자 감사 로그">
                <AuditTable rows={audit} loading={loading} />
                <p className="mt-3 text-xs text-[var(--text-dim)]">총 {audit.length}건</p>
              </Panel>
            </Reveal>
            <Reveal>
              <Panel title="보안 접근 로그">
                <SecurityTable rows={security} loading={loading} />
                <p className="mt-3 text-xs text-[var(--text-dim)]">총 {security.length}건</p>
              </Panel>
            </Reveal>
          </div>
        )}

        {/* ══════════ 회원 활동 ══════════ */}
        {tab === 'activity' && (
          <Reveal>
            <Panel title="회원 활동 로그">
              <ActivityTable rows={activity} loading={loading} />
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {activity.length}건</p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 관리자 감사 ══════════ */}
        {tab === 'audit' && (
          <Reveal>
            <Panel title="관리자 감사 로그">
              <AuditTable rows={audit} loading={loading} />
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {audit.length}건</p>
            </Panel>
          </Reveal>
        )}

        {/* ══════════ 보안 접근 ══════════ */}
        {tab === 'security' && (
          <Reveal>
            <Panel title="보안 접근 로그">
              <SecurityTable rows={security} loading={loading} />
              <p className="mt-3 text-xs text-[var(--text-dim)]">총 {security.length}건</p>
            </Panel>
          </Reveal>
        )}
      </div>
    </div>
  )
}
