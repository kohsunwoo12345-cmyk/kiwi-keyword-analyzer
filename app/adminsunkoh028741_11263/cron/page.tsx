'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Timer, RefreshCw, AlertTriangle, CheckCircle2, PauseCircle, Loader2,
  Coins, KeyRound, Search, ChevronDown, ChevronRight, ExternalLink, Play, Square,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { adminCronStatus, adminCronToggle, type CronStatus, type CronScheduleRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

// 정기 실행(크론) 현황.
//  이 시스템의 가장 큰 위험은 "돌고 있는 줄 알았는데 아무것도 안 되고 있었다" 이다.
//  Pages 에는 스케줄러가 없어 외부(Cloudflare Workers Cron Trigger)가 두드려 주는 구조라,
//  그 외부가 죽으면 아무 에러도 안 나고 그냥 조용해진다. 그걸 여기서 잡는다.

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 그 예약의 "현지 시각"으로 보여준다 — 관리자가 KST 로만 보면 왜 지금 도는지 이해할 수 없다 */
const inTz = (iso?: string, tz?: string) => {
  if (!iso) return '-'
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: tz || 'Asia/Seoul', hour12: false,
      month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return iso }
}
const kst = (iso?: string) => inTz(iso, 'Asia/Seoul')
const ago = (min?: number | null) => {
  if (min == null) return '기록 없음'
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (min < 60 * 48) return `${Math.round(min / 60)}시간 전`
  return `${Math.round(min / 1440)}일 전`
}
const when = (s: CronScheduleRow) =>
  `${s.freq === 'daily' ? '매일' : `매주 ${DAYS[s.weekday]}요일`} ${s.hour}:${String(s.minute).padStart(2, '0')}`

const HEALTH: Record<string, { label: string; desc: string; cls: string; icon: typeof CheckCircle2 }> = {
  ok: { label: '정상', desc: '스케줄러가 돌고 있습니다.', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  warn: { label: '점검 필요', desc: '하루 넘게 실행 기록이 없습니다.', cls: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertTriangle },
  down: { label: '멈춤 의심', desc: '실행할 예약이 밀려 있는데 스케줄러가 집어가지 않고 있습니다.', cls: 'text-rose-600 bg-rose-50 border-rose-200', icon: AlertTriangle },
  idle: { label: '대기', desc: '켜져 있는 예약이 없습니다. 판정할 근거가 없습니다.', cls: 'text-slate-500 bg-slate-50 border-slate-200', icon: PauseCircle },
}

/** 꺼진 이유는 대응이 다르다 — 사용자가 끈 것 / 서버가 끈 것 / 다 쓴 것 */
const STATE_BADGE: Record<string, { label: string; cls: string }> = {
  autoStopped: { label: '자동 중지', cls: 'bg-rose-100 text-rose-700' },
  exhausted: { label: '횟수 소진', cls: 'bg-slate-100 text-slate-600' },
  off: { label: '꺼짐', cls: 'bg-slate-100 text-slate-600' },
}

type Tab = 'active' | 'ended' | 'failed' | 'all'
const TABS: { v: Tab; label: string }[] = [
  { v: 'active', label: '진행 중' },
  { v: 'ended', label: '종료' },
  { v: 'failed', label: '실패' },
  { v: 'all', label: '전체' },
]

export default function CronPage() {
  const [d, setD] = useState<CronStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('active')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = () => { setLoading(true); adminCronStatus().then((r) => { setD(r); setLoading(false) }) }

  // 관리자가 직접 켜고 끈다. 켤 때는 서버가 다음 실행 시각을 다시 잡아 준다
  //  (과거 시각이 남아 있으면 켜자마자 실행돼 의도치 않게 과금된다).
  const toggle = async (s: CronScheduleRow) => {
    const on = !s.enabled
    if (on && !confirm(`"${s.name || s.id}" 예약을 다시 켤까요?\n다음 실행 시각부터 자동 생성되며 크레딧이 차감됩니다.`)) return
    setBusy(s.id); setMsg('')
    const r = await adminCronToggle(s.id, on)
    setBusy(null)
    setMsg(r.ok
      ? (on ? `"${s.name || s.id}" 재개 — 다음 실행 ${inTz(r.nextRunAt, s.tz)} (${s.tz})` : `"${s.name || s.id}" 중지됨`)
      : `실패: ${r.error || '오류'}`)
    load()
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)   // 1분마다 자동 갱신 — 지켜보는 화면이므로
    return () => clearInterval(t)
  }, [])

  const all = useMemo(() => d?.schedules ?? [], [d])
  const counts = useMemo(() => ({
    active: all.filter((s) => s.enabled).length,
    ended: all.filter((s) => !s.enabled).length,
    failed: all.filter((s) => s.failed).length,
    all: all.length,
  }), [all])

  const rows = useMemo(() => {
    const byTab = all.filter((s) =>
      tab === 'active' ? s.enabled : tab === 'ended' ? !s.enabled : tab === 'failed' ? s.failed : true)
    const k = q.trim().toLowerCase()
    if (!k) return byTab
    // 프롬프트까지 검색 대상 — "누가 무엇을 예약해 뒀는지" 찾는 화면이므로
    return byTab.filter((s) =>
      (s.name + ' ' + s.userName + ' ' + s.userEmail + ' ' + s.prompt + ' ' + s.model + ' ' + s.tz)
        .toLowerCase().includes(k))
  }, [all, tab, q])

  const t = d?.totals
  const h = HEALTH[d?.health || 'idle'] || HEALTH.idle
  const HIcon = h.icon

  return (
    <div>
      <PageHeader
        icon={Timer} eyebrow="CRON" accent="#7c3aed"
        title="정기 실행 현황"
        desc="예약 자동 생성이 실제로 돌고 있는지, 조용히 실패하는 예약은 없는지 확인합니다. 스케줄러는 Cloudflare Workers Cron Trigger 가 1분마다 호출합니다."
        action={
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-soft)] hover:bg-slate-50">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침
          </button>
        }
      />

      {!d ? (
        <div className="py-16 text-center text-sm text-[var(--text-dim)]"><Loader2 size={16} className="mx-auto mb-2 animate-spin" />불러오는 중…</div>
      ) : !d.ok ? (
        <div className="m-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{d.error || '불러오지 못했습니다.'}</div>
      ) : (
        <div className="space-y-4 p-6 lg:p-8">
          {/* 한 줄 판정 — 관리자가 제일 먼저 봐야 하는 것 */}
          <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', h.cls)}>
            <HIcon size={18} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <b>{h.label}</b> · {h.desc}
              <div className="mt-0.5 opacity-80">
                마지막 실행 {ago(d.lastRunAgeMin)}{d.lastRunAt ? ` (${kst(d.lastRunAt)} KST)` : ''}
              </div>
              {d.health === 'down' && (
                <div className="mt-1 opacity-80">
                  워커가 살아 있는지 확인: <code className="rounded bg-white/60 px-1">curl https://kiwi-keyword-analyzer.kohsunwoo12345.workers.dev/health</code>
                </div>
              )}
            </div>
          </div>

          {msg && (
            <div className={cn('rounded-lg border px-4 py-2 text-sm',
              /^실패/.test(msg) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
              {msg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="전체 예약" value={t?.total ?? 0} />
            <Stat label="켜짐" value={t?.enabled ?? 0} />
            <Stat label="지금 실행 대기" value={t?.due ?? 0} warn={(t?.due ?? 0) > 0} />
            <Stat label={`자동 중지(${d.failLimit ?? 3}회 연속 실패)`} value={t?.autoStopped ?? 0} warn={(t?.autoStopped ?? 0) > 0} />
          </div>

          <Panel
            title={
              <div className="flex flex-wrap items-center gap-1">
                {TABS.map((x) => (
                  <button
                    key={x.v} onClick={() => { setTab(x.v); setOpen(null) }}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                      tab === x.v ? 'bg-[var(--accent,#7c3aed)] text-white' : 'text-[var(--text-soft)] hover:bg-slate-100',
                    )}
                    style={tab === x.v ? { background: '#7c3aed' } : undefined}
                  >
                    {x.label}
                    <span className={cn('ml-1.5 tabular-nums', tab === x.v ? 'opacity-80' : 'text-[var(--text-dim)]')}>
                      {counts[x.v]}
                    </span>
                  </button>
                ))}
              </div>
            }
            action={
              <div className="relative w-full max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="회원·예약명·프롬프트 검색"
                  className="input w-full pl-9 text-sm"
                />
              </div>
            }
          >
            {rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-dim)]">
                {q ? '검색 결과가 없습니다.' : tab === 'active' ? '진행 중인 예약이 없습니다.'
                  : tab === 'ended' ? '종료된 예약이 없습니다.' : tab === 'failed' ? '실패한 예약이 없습니다.' : '등록된 예약이 없습니다.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-[var(--text-dim)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="w-6 px-2 py-2"></th>
                      <th className="px-3 py-2 text-left font-semibold">예약</th>
                      <th className="px-3 py-2 text-left font-semibold">회원</th>
                      <th className="px-3 py-2 text-left font-semibold">프롬프트</th>
                      <th className="px-3 py-2 text-left font-semibold">주기 · 시간대</th>
                      <th className="px-3 py-2 text-left font-semibold">다음 실행(현지)</th>
                      <th className="px-3 py-2 text-left font-semibold">마지막 상태</th>
                      <th className="px-3 py-2 text-right font-semibold">실행</th>
                      <th className="px-3 py-2 text-right font-semibold">제어</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => {
                      const dueNow = s.enabled && s.nextRunAt && Date.parse(s.nextRunAt) <= Date.now()
                      const badge = s.enabled ? null : STATE_BADGE[s.state] || STATE_BADGE.off
                      const isOpen = open === s.id
                      return (
                        <FragmentRow
                          key={s.id} s={s} isOpen={isOpen} dueNow={!!dueNow} badge={badge}
                          busy={busy === s.id}
                          onExpand={() => setOpen(isOpen ? null : s.id)}
                          onToggle={() => toggle(s)}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}

function FragmentRow({
  s, isOpen, dueNow, badge, busy, onExpand, onToggle,
}: {
  s: CronScheduleRow; isOpen: boolean; dueNow: boolean; busy: boolean
  badge: { label: string; cls: string } | null; onExpand: () => void; onToggle: () => void
}) {
  return (
    <>
      <tr
        onClick={onExpand}
        className={cn('cursor-pointer border-b border-[var(--border)] hover:bg-slate-50', !s.enabled && 'opacity-70')}
      >
        <td className="px-2 py-2 text-[var(--text-dim)]">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
        <td className="px-3 py-2">
          {s.name || '(이름 없음)'}
          {badge && <span className={cn('ml-1.5 rounded px-1.5 py-0.5 text-[10px]', badge.cls)}>{badge.label}</span>}
          <div className="text-xs text-[var(--text-dim)]">{s.model}</div>
        </td>
        <td className="px-3 py-2 text-[var(--text-soft)]">
          {s.userName || '-'}
          <div className="text-xs text-[var(--text-dim)]">{s.userEmail}</div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <span className="inline-flex items-center gap-0.5"><Coins size={11} />{s.userCredits.toLocaleString('ko-KR')}</span>
            {/* 토큰이 없으면 크론이 회원 자격으로 호출할 수 없어 매번 실패한다 */}
            {!s.hasToken && <span className="inline-flex items-center gap-0.5 text-rose-600"><KeyRound size={11} />토큰 없음</span>}
          </div>
        </td>
        <td className="max-w-[22rem] px-3 py-2 text-[var(--text-soft)]">
          <div className={cn('text-xs', !isOpen && 'line-clamp-2')}>{s.prompt || '-'}</div>
        </td>
        <td className="px-3 py-2 text-[var(--text-soft)]">
          {when(s)}
          <div className="text-xs text-[var(--text-dim)]">{s.tz}</div>
        </td>
        <td className={cn('px-3 py-2 tabular-nums', dueNow ? 'font-semibold text-amber-600' : 'text-[var(--text-dim)]')}>
          {s.enabled ? inTz(s.nextRunAt, s.tz) : '-'}{dueNow && ' · 대기 중'}
        </td>
        <td className={cn('px-3 py-2 text-xs', s.failed ? 'text-rose-600' : 'text-[var(--text-soft)]')}>
          {s.lastStatus || '-'}
          {s.lastRunAt && <div className="text-[var(--text-dim)]">{kst(s.lastRunAt)} KST</div>}
          {s.failed && s.failStreak > 0 && <div className="text-rose-500">연속 {s.failStreak}회</div>}
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
          {s.runs}{s.maxRuns > 0 ? ` / ${s.maxRuns}` : ''}
        </td>
        <td className="px-3 py-2 text-right">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            disabled={busy}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50',
              s.enabled
                ? 'border-[var(--border)] text-[var(--text-soft)] hover:bg-slate-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            )}
          >
            {busy ? <Loader2 size={12} className="animate-spin" />
              : s.enabled ? <Square size={12} /> : <Play size={12} />}
            {busy ? '처리 중' : s.enabled ? '중지' : '켜기'}
          </button>
        </td>
      </tr>

      {isOpen && (
        <tr className="border-b border-[var(--border)] bg-slate-50/60">
          <td></td>
          <td colSpan={8} className="px-3 py-3">
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-[var(--text-dim)]">프롬프트 전문</div>
                <div className="whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-white p-3 text-xs text-[var(--text-soft)]">
                  {s.prompt || '(비어 있음)'}
                </div>
              </div>
              <div className="space-y-1 text-xs text-[var(--text-soft)]">
                <Kv k="모델" v={s.model} />
                <Kv k="생성 옵션" v={`${s.seconds}초 · ${s.ratio} · ${s.res}`} />
                <Kv k="시간대" v={s.tz} />
                <Kv k="주기" v={when(s)} />
                <Kv k="다음 실행" v={s.enabled ? `${inTz(s.nextRunAt, s.tz)} (${s.tz}) · ${kst(s.nextRunAt)} KST` : '중지됨'} />
                <Kv k="마지막 실행" v={s.lastRunAt ? `${kst(s.lastRunAt)} KST` : '없음'} />
                <Kv k="마지막 상태" v={s.lastStatus || '-'} />
                {s.lastResult && (
                  <div className="flex gap-2">
                    <span className="w-20 flex-shrink-0 text-[var(--text-dim)]">마지막 결과</span>
                    <a href={s.lastResult} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 break-all text-blue-600 hover:underline">
                      {s.lastResult.slice(0, 70)}{s.lastResult.length > 70 ? '…' : ''}<ExternalLink size={11} />
                    </a>
                  </div>
                )}
                <Kv k="실행 횟수" v={`${s.runs}${s.maxRuns > 0 ? ` / ${s.maxRuns} (제한)` : ' (무제한)'}`} />
                <Kv k="연속 실패" v={String(s.failStreak)} />
                <Kv k="회원" v={`${s.userName || '-'} · ${s.userEmail} · 크레딧 ${s.userCredits.toLocaleString('ko-KR')}`} />
                <Kv k="MCP 토큰" v={s.hasToken ? '있음' : '없음 — 크론이 회원 자격으로 호출할 수 없어 매번 실패합니다'} />
                <Kv k="만든 날짜" v={s.createdAt ? kst(s.createdAt) : '-'} />
                <Kv k="예약 ID" v={s.id} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 flex-shrink-0 text-[var(--text-dim)]">{k}</span>
      <span className="break-all">{v}</span>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs text-[var(--text-dim)]">{label}</div>
      <div className={cn('mt-0.5 text-2xl font-bold tabular-nums', warn && 'text-amber-600')}>{value.toLocaleString('ko-KR')}</div>
    </div>
  )
}
