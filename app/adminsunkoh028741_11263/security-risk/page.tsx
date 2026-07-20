'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, ShieldCheck, RefreshCw, Ban, LogIn, AlertTriangle, CheckCircle2, XCircle, Activity, Lock, UserCheck, UserX } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { adminSecurityRisk, type SecurityRisk, type RiskMember } from '@/lib/auth'
import { cn } from '@/lib/utils'

/** 회원/비회원 태그 (위협·차단·실패 IP가 우리 회원인지 식별) */
function MemberTag({ member }: { member?: RiskMember | null }) {
  if (!member) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium text-slate-500">
        <UserX size={10} /> 비회원
      </span>
    )
  }
  return (
    <span
      title={`${member.name || ''} · ${member.email || ''}${member.role === 'admin' ? ' · 관리자' : ''}`}
      className={cn('inline-flex max-w-[130px] items-center gap-0.5 truncate rounded border px-1 py-0.5 text-[10px] font-semibold', member.role === 'admin' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}
    >
      <UserCheck size={10} /> {member.name || member.email}
    </span>
  )
}

const kst = (iso: string) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
const num = (n: number) => (n || 0).toLocaleString('ko-KR')

export default function SecurityRiskPage() {
  const [data, setData] = useState<SecurityRisk | null>(null)
  const [loading, setLoading] = useState(false)
  const load = () => { setLoading(true); adminSecurityRisk().then((d) => { setData(d); setLoading(false) }) }
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv) }, [])

  const p = data?.posture
  const s = data?.signals
  const ringColor = p?.level === 'good' ? '#10b981' : p?.level === 'fair' ? '#f59e0b' : '#ef4444'
  const levelLabel = p?.level === 'good' ? '안전' : p?.level === 'fair' ? '주의' : '위험'

  return (
    <div>
      <PageHeader icon={ShieldAlert} title="해킹 위험" description="실시간 공격 신호와 보안 점검을 한눈에. 30초마다 자동 새로고침됩니다." />

      <div className="mb-4 flex justify-end">
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-soft)] hover:bg-slate-100">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침
        </button>
      </div>

      {/* 보안 태세 스코어 + 핵심 신호 */}
      <div className="mb-4 grid gap-3 lg:grid-cols-4">
        <Panel className="flex items-center gap-4 lg:col-span-1">
          <div className="relative grid h-24 w-24 flex-shrink-0 place-items-center">
            <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3.4" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke={ringColor} strokeWidth="3.4" strokeLinecap="round"
                strokeDasharray={`${((p?.score || 0) / 100) * 97.4} 97.4`} />
            </svg>
            <div className="absolute text-center">
              <div className="text-2xl font-extrabold" style={{ color: ringColor }}>{p?.score ?? '–'}</div>
              <div className="text-[10px] font-bold text-[var(--text-dim)]">{levelLabel}</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold">보안 태세 점수</div>
            <p className="mt-1 text-xs text-[var(--text-dim)]">점검 통과 기준 100점. 경고·고위험 신호가 있으면 감점됩니다.</p>
            {p && (p.warnCount > 0 || p.failCount > 0) && (
              <p className="mt-1 text-xs font-semibold text-amber-600">경고 {p.warnCount} · 실패 {p.failCount}</p>
            )}
          </div>
        </Panel>

        <SignalCard icon={LogIn} label="로그인 실패 (24h)" value={num(s?.loginFail24h || 0)} sub={`7일 ${num(s?.loginFail7d || 0)}건`} tone={(s?.loginFail24h || 0) > 50 ? 'warn' : 'ok'} />
        <SignalCard icon={Ban} label="차단된 IP" value={num(s?.blockedCount || 0)} sub={`자동 차단 ${num(s?.autoBlocked || 0)}`} tone={(s?.blockedCount || 0) > 0 ? 'warn' : 'ok'} />
        <SignalCard icon={AlertTriangle} label="고위험 요청 (24h)" value={num(s?.susHigh24h || 0)} sub={`전체 의심 ${num(s?.sus24h || 0)}`} tone={(s?.susHigh24h || 0) > 0 ? 'danger' : 'ok'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 보안 점검 체크리스트 */}
        <Panel title={<span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500" /> 보안 점검</span>}>
          <div className="space-y-1.5">
            {(data?.checks || []).map((c) => (
              <div key={c.key} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                {c.status === 'pass' ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                  : c.status === 'warn' ? <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                  : <XCircle size={16} className="mt-0.5 flex-shrink-0 text-rose-500" />}
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{c.label}</div>
                  <div className="text-xs text-[var(--text-dim)]">{c.detail}</div>
                </div>
              </div>
            ))}
            {!data?.checks?.length && <p className="py-6 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '데이터 없음'}</p>}
          </div>
        </Panel>

        {/* 적용된 하드닝 */}
        <Panel title={<span className="flex items-center gap-2"><Lock size={16} className="text-violet-500" /> 적용된 보안 강화</span>}>
          <ul className="space-y-1.5">
            {(data?.applied || []).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-violet-500" />
                <span className="text-[var(--text-soft)]">{a}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* 최근 위협 로그 */}
        <Panel title={<span className="flex items-center gap-2"><Activity size={16} className="text-rose-500" /> 최근 위협·의심 요청</span>}>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-[var(--border)] text-left text-[var(--text-dim)]">
                <th className="px-2 py-1.5 font-medium">시각(KST)</th><th className="px-2 py-1.5 font-medium">IP</th>
                <th className="px-2 py-1.5 font-medium">회원</th>
                <th className="px-2 py-1.5 font-medium">경로</th><th className="px-2 py-1.5 font-medium">등급</th></tr></thead>
              <tbody>
                {(s?.recentThreats || []).map((t, i) => (
                  <tr key={i} className="border-b border-[var(--border-soft)] last:border-0">
                    <td className="whitespace-nowrap px-2 py-1.5 text-[var(--text-dim)]">{kst(t.ts)}</td>
                    <td className="px-2 py-1.5 font-mono">{t.ip}{t.country ? ` · ${t.country}` : ''}</td>
                    <td className="px-2 py-1.5"><MemberTag member={t.member} /></td>
                    <td className="max-w-[160px] truncate px-2 py-1.5" title={t.path}>{t.method} {t.path}</td>
                    <td className="px-2 py-1.5"><span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', t.severity === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>{t.severity}</span></td>
                  </tr>
                ))}
                {!s?.recentThreats?.length && <tr><td colSpan={5} className="py-6 text-center text-[var(--text-dim)]">위협 신호 없음 (양호)</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* 로그인 실패 상위 IP + 차단 IP */}
        <Panel title={<span className="flex items-center gap-2"><Ban size={16} className="text-amber-500" /> 무차별 시도 상위 IP · 차단 목록</span>}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-dim)]">로그인 실패 상위 IP (7일)</div>
          <div className="mb-3 max-h-32 overflow-y-auto">
            {(s?.topFailIps || []).map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] py-1 text-xs last:border-0">
                <span className="flex items-center gap-1.5 truncate"><span className="font-mono">{t.ip}</span><MemberTag member={t.member} /></span>
                <span className="whitespace-nowrap text-[var(--text-dim)]">{num(t.c)}회 · {kst(t.last)}</span>
              </div>
            ))}
            {!s?.topFailIps?.length && <p className="py-3 text-center text-xs text-[var(--text-dim)]">기록 없음</p>}
          </div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-dim)]">최근 차단 IP</div>
          <div className="max-h-32 overflow-y-auto">
            {(s?.recentBlocked || []).map((b, i) => (
              <div key={i} className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] py-1 text-xs last:border-0">
                <span className="flex items-center gap-1.5 truncate"><span className="font-mono">{b.ip}</span><MemberTag member={b.member} /></span>
                <span className="whitespace-nowrap text-[var(--text-dim)]">{b.source === 'auto' ? '자동' : '수동'} · {kst(b.created_at)}</span>
              </div>
            ))}
            {!s?.recentBlocked?.length && <p className="py-3 text-center text-xs text-[var(--text-dim)]">차단된 IP 없음</p>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function SignalCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: 'ok' | 'warn' | 'danger' }) {
  const c = tone === 'danger' ? 'text-rose-600' : tone === 'warn' ? 'text-amber-600' : 'text-emerald-600'
  return (
    <Panel className="flex items-center gap-3">
      <span className={cn('grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-slate-100', c)}><Icon size={20} /></span>
      <div className="min-w-0">
        <div className="text-xs text-[var(--text-dim)]">{label}</div>
        <div className={cn('text-xl font-extrabold', c)}>{value}</div>
        <div className="text-[11px] text-[var(--text-dim)]">{sub}</div>
      </div>
    </Panel>
  )
}
