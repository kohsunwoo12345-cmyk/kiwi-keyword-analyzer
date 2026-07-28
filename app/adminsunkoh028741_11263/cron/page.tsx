'use client'

import { useEffect, useState } from 'react'
import { Timer, RefreshCw, AlertTriangle, CheckCircle2, PauseCircle, Loader2, Coins, KeyRound } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { adminCronStatus, type CronStatus } from '@/lib/auth'
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

const HEALTH: Record<string, { label: string; desc: string; cls: string; icon: typeof CheckCircle2 }> = {
  ok: { label: '정상', desc: '스케줄러가 돌고 있습니다.', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  warn: { label: '점검 필요', desc: '하루 넘게 실행 기록이 없습니다.', cls: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertTriangle },
  down: { label: '멈춤 의심', desc: '실행할 예약이 밀려 있는데 스케줄러가 집어가지 않고 있습니다.', cls: 'text-rose-600 bg-rose-50 border-rose-200', icon: AlertTriangle },
  idle: { label: '대기', desc: '켜져 있는 예약이 없습니다. 판정할 근거가 없습니다.', cls: 'text-slate-500 bg-slate-50 border-slate-200', icon: PauseCircle },
}

export default function CronPage() {
  const [d, setD] = useState<CronStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const load = () => { setLoading(true); adminCronStatus().then((r) => { setD(r); setLoading(false) }) }
  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)   // 1분마다 자동 갱신 — 지켜보는 화면이므로
    return () => clearInterval(t)
  }, [])

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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="전체 예약" value={t?.total ?? 0} />
            <Stat label="켜짐" value={t?.enabled ?? 0} />
            <Stat label="지금 실행 대기" value={t?.due ?? 0} warn={(t?.due ?? 0) > 0} />
            <Stat label={`자동 중지(${d.failLimit ?? 3}회 연속 실패)`} value={t?.autoStopped ?? 0} warn={(t?.autoStopped ?? 0) > 0} />
          </div>

          {(d.failures?.length ?? 0) > 0 && (
            <Panel title={`최근 실패 ${d.failures!.length}건`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-[var(--text-dim)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-3 py-2 text-left font-semibold">예약</th>
                      <th className="px-3 py-2 text-left font-semibold">회원</th>
                      <th className="px-3 py-2 text-left font-semibold">사유</th>
                      <th className="px-3 py-2 text-right font-semibold">연속</th>
                      <th className="px-3 py-2 text-right font-semibold">시각(KST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.failures!.map((f) => (
                      <tr key={f.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-2">
                          {f.name || '(이름 없음)'}
                          {!f.enabled && <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">중지됨</span>}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-soft)]">{f.userName || '-'}<div className="text-xs text-[var(--text-dim)]">{f.userEmail}</div></td>
                        <td className="px-3 py-2 text-rose-600">{f.lastStatus}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{f.failStreak}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">{kst(f.lastRunAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <Panel title={`예약 전체 ${d.schedules?.length ?? 0}건`}>
            {(d.schedules?.length ?? 0) === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-dim)]">등록된 예약이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-[var(--text-dim)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-3 py-2 text-left font-semibold">예약</th>
                      <th className="px-3 py-2 text-left font-semibold">회원</th>
                      <th className="px-3 py-2 text-left font-semibold">주기 · 시간대</th>
                      <th className="px-3 py-2 text-left font-semibold">모델</th>
                      <th className="px-3 py-2 text-left font-semibold">다음 실행(현지)</th>
                      <th className="px-3 py-2 text-left font-semibold">마지막 상태</th>
                      <th className="px-3 py-2 text-right font-semibold">실행</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.schedules!.map((s) => {
                      const dueNow = s.enabled && s.nextRunAt && Date.parse(s.nextRunAt) <= Date.now()
                      const failed = /^(실패|실행 불가)/.test(s.lastStatus)
                      return (
                        <tr key={s.id} className={cn('border-b border-[var(--border)] last:border-0', !s.enabled && 'opacity-60')}>
                          <td className="px-3 py-2">
                            {s.name || '(이름 없음)'}
                            {!s.enabled && (
                              <span className={cn('ml-1.5 rounded px-1.5 py-0.5 text-[10px]',
                                s.failStreak >= (d.failLimit ?? 3) ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')}>
                                {s.failStreak >= (d.failLimit ?? 3) ? '자동 중지' : '꺼짐'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-soft)]">
                            {s.userName || '-'}
                            <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
                              <span className="inline-flex items-center gap-0.5"><Coins size={11} />{s.userCredits.toLocaleString('ko-KR')}</span>
                              {/* 토큰이 없으면 크론이 회원 자격으로 호출할 수 없어 매번 실패한다 */}
                              {!s.hasToken && <span className="inline-flex items-center gap-0.5 text-rose-600"><KeyRound size={11} />토큰 없음</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[var(--text-soft)]">
                            {s.freq === 'daily' ? '매일' : `매주 ${DAYS[s.weekday]}요일`} {s.hour}:{String(s.minute).padStart(2, '0')}
                            <div className="text-xs text-[var(--text-dim)]">{s.tz}</div>
                          </td>
                          <td className="px-3 py-2 text-xs text-[var(--text-soft)]">{s.model}</td>
                          <td className={cn('px-3 py-2 tabular-nums', dueNow ? 'font-semibold text-amber-600' : 'text-[var(--text-dim)]')}>
                            {inTz(s.nextRunAt, s.tz)}{dueNow && ' · 대기 중'}
                          </td>
                          <td className={cn('px-3 py-2 text-xs', failed ? 'text-rose-600' : 'text-[var(--text-soft)]')}>
                            {s.lastStatus || '-'}
                            {s.lastRunAt && <div className="text-[var(--text-dim)]">{kst(s.lastRunAt)} KST</div>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                            {s.runs}{s.maxRuns > 0 ? ` / ${s.maxRuns}` : ''}
                          </td>
                        </tr>
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

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs text-[var(--text-dim)]">{label}</div>
      <div className={cn('mt-0.5 text-2xl font-bold tabular-nums', warn && 'text-amber-600')}>{value.toLocaleString('ko-KR')}</div>
    </div>
  )
}
