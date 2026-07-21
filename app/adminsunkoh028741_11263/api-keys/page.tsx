'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound, RefreshCw, Download, Coins, Users, Activity, ShieldCheck, User,
  Cpu, Video, Image as ImageIcon, Gauge,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminApiKeys, type ApiKeysStats } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#2563eb'
const DAY_OPTIONS = [7, 30, 90, 365] as const
type DayOption = (typeof DAY_OPTIONS)[number]

const num = (n: number) => (n || 0).toLocaleString('ko-KR')
const cr = (n: number) => (Math.round((n || 0) * 10) / 10).toLocaleString('ko-KR')

function fmtDateTime(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function fmtDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

const THEAD = 'border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]'
const TH = 'px-3 py-2.5 font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 whitespace-nowrap'
const TR = 'border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50'

function StatusPill({ status }: { status: string }) {
  const ok = status === 'active' || status === 'ok'
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
      ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500',
    )}>
      {status === 'active' ? '활성' : status === 'revoked' ? '폐기' : status === 'ok' ? '성공' : status === 'failed' ? '실패' : status || '-'}
    </span>
  )
}

export default function AdminApiKeysPage() {
  const [days, setDays] = useState<DayOption>(90)
  const [data, setData] = useState<ApiKeysStats>({ ok: false })
  const [loading, setLoading] = useState(true)

  function reload(d: DayOption = days) {
    setLoading(true)
    adminApiKeys(d).then((r) => { setData(r); setLoading(false) })
  }
  useEffect(() => {
    reload(days)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  const t = data.totals
  const keys = data.keys ?? []
  const byUser = data.byUser ?? []
  const calls = data.calls ?? []
  const catalog = data.catalog ?? []
  const rate = data.rate
  const hasData = !!t && (keys.length > 0 || (t.calls ?? 0) > 0)

  const activeKeys = useMemo(() => keys.filter((k) => k.status === 'active'), [keys])

  function exportKeys() {
    downloadCsv(
      `API키_발급목록_${days}일.csv`,
      ['키 이름', '회원', '이메일', '마스킹', '상태', '호출수', '마지막 사용', '발급일'],
      keys.map((k) => [k.name, k.userName || k.userId, k.userEmail, k.masked, k.status, k.callCount, fmtDateTime(k.lastUsedAt), fmtDate(k.createdAt)]),
    )
  }
  function exportCalls() {
    downloadCsv(
      `API키_호출내역_${days}일.csv`,
      ['시각', '회원', '이메일', '모델', '제공사', '종류', '크레딧', '상태', '오류'],
      calls.map((c) => [fmtDateTime(c.createdAt), c.userName || c.userId, c.userEmail, c.model, c.provider, c.kind, c.credits, c.status, c.error]),
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={KeyRound}
        eyebrow="ADMIN · API"
        title="회원 API 키 · 호출 현황"
        desc="노드형 AI 영상 플랜 회원이 발급한 API 키, 호출 기록, 사용된 크레딧을 확인합니다. (키 1개로 이미지·영상 모든 모델 호출 · 회원당 최대 20개)"
        accent={ACCENT}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200',
                    days === d ? 'text-white shadow-md' : 'text-[var(--text-soft)] hover:bg-white hover:text-[var(--text)]',
                  )}
                  style={days === d ? { background: ACCENT } : undefined}
                >
                  {d === 365 ? '1년' : `${d}일`}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
            </Button>
            <Button size="sm" onClick={exportKeys} disabled={keys.length === 0}>
              <Download size={15} /> 엑셀(키 목록)
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="활성 API 키" value={num(t?.activeKeys ?? 0)} icon={KeyRound} accent="#2563eb" />
            <StatCard label="키 보유 회원" value={num(t?.users ?? 0)} icon={Users} accent="#0ea5e9" />
            <StatCard label={`호출 (${days}일)`} value={num(t?.calls ?? 0)} icon={Activity} accent="#8b5cf6" />
            <StatCard label={`사용 크레딧 (${days}일)`} value={cr(t?.credits ?? 0)} icon={Coins} accent="#22c55e" />
          </div>
        </Reveal>

        {/* 제공 API·모델 카탈로그 — 이 API로 호출 가능한 모델 */}
        <Reveal>
          <Panel
            title={<span className="flex items-center gap-2"><Cpu size={16} className="text-blue-500" /> 제공 API · 모델 <span className="text-xs font-normal text-[var(--text-dim)]">(API 키 1개로 호출 가능 · 총 {data.catalogCount ?? 0}종)</span></span>}
          >
            {catalog.length === 0 ? (
              <p className="py-4 text-sm text-[var(--text-dim)]">모델 목록을 불러오는 중…</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {catalog.map((g) => (
                  <div key={g.provider} className="rounded-xl border border-[var(--border-soft)] bg-[var(--panel-2)] p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        {g.kind === 'image' ? <ImageIcon size={14} className="text-blue-500" /> : <Video size={14} className="text-blue-500" />}
                        {g.label}
                      </span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-600">{g.provider}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.models.map((m) => (
                        <span key={m} className="rounded-md border border-[var(--border-soft)] bg-white px-2 py-1 text-[11px] text-[var(--text-soft)]">{m}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {rate && (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--panel-2)] px-4 py-3 text-xs text-[var(--text-soft)]">
                <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]"><Gauge size={14} className="text-blue-500" /> 남용 방지 한도</span>
                <span>생성 <b className="text-[var(--text)]">{rate.postMin}</b>/분 · <b className="text-[var(--text)]">{rate.postHour}</b>/시간 · <b className="text-[var(--text)]">{rate.postDay}</b>/일</span>
                <span>동시 진행 <b className="text-[var(--text)]">{rate.concurrent}</b>건</span>
                <span>상태조회 <b className="text-[var(--text)]">{rate.getMin}</b>/분</span>
                <span className="text-[var(--text-dim)]">초과 시 HTTP 429 (계정 합산 · 다중 키 우회 불가)</span>
              </div>
            )}
          </Panel>
        </Reveal>

        {loading && !hasData ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw size={28} className="animate-spin text-blue-400" />
              <p className="mt-4 text-sm text-[var(--text-dim)]">API 사용 데이터를 불러오는 중…</p>
            </div>
          </Panel>
        ) : !hasData ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-400">
                <KeyRound size={26} />
              </span>
              <p className="mt-4 font-semibold">아직 발급된 API 키가 없습니다.</p>
              <p className="mt-1 text-sm text-[var(--text-dim)]">회원이 스튜디오 프로필 → API 연결에서 키를 만들면 여기에 집계됩니다.</p>
            </div>
          </Panel>
        ) : (
          <>
            {/* 회원별 사용 */}
            <Reveal>
              <Panel
                title={<span className="flex items-center gap-2"><User size={16} className="text-blue-500" /> 회원별 API 사용</span>}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className={THEAD}>
                        <th className={TH}>회원</th>
                        <th className={cn(TH, 'text-right')}>총 호출</th>
                        <th className={cn(TH, 'text-right')}>성공</th>
                        <th className={cn(TH, 'text-right')}>실패</th>
                        <th className={cn(TH, 'text-right')}>사용 크레딧</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byUser.map((u) => (
                        <tr key={u.userId} className={TR}>
                          <td className={TD}>
                            <div className="font-semibold">{u.userName || u.userId || '게스트'}</div>
                            <div className="text-xs text-[var(--text-dim)]">{u.userEmail}</div>
                          </td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{num(u.calls)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-emerald-600')}>{num(u.okCalls)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-rose-500')}>{num(u.failCalls)}</td>
                          <td className={cn(TD, 'text-right font-semibold tabular-nums')}>{cr(u.credits)}</td>
                        </tr>
                      ))}
                      {byUser.length === 0 && (
                        <tr><td colSpan={5} className={cn(TD, 'py-6 text-center text-[var(--text-dim)]')}>기간 내 호출 내역이 없습니다.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </Reveal>

            {/* 발급된 키 목록 */}
            <Reveal>
              <Panel
                title={<span className="flex items-center gap-2"><KeyRound size={16} className="text-blue-500" /> 발급된 API 키 <span className="text-xs font-normal text-[var(--text-dim)]">(활성 {activeKeys.length} · 전체 {keys.length})</span></span>}
                action={
                  <button onClick={exportKeys} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-blue-300 hover:text-blue-600">
                    <Download size={13} /> 엑셀 다운로드
                  </button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className={THEAD}>
                        <th className={TH}>키 이름</th>
                        <th className={TH}>회원</th>
                        <th className={TH}>키(마스킹)</th>
                        <th className={TH}>상태</th>
                        <th className={cn(TH, 'text-right')}>호출수</th>
                        <th className={TH}>마지막 사용</th>
                        <th className={TH}>발급일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((k) => (
                        <tr key={k.id} className={TR}>
                          <td className={cn(TD, 'font-medium')}>{k.name || '-'}</td>
                          <td className={TD}>
                            <div className="text-xs font-medium">{k.userName || k.userId || '게스트'}</div>
                            <div className="text-[11px] text-[var(--text-dim)]">{k.userEmail}</div>
                          </td>
                          <td className={cn(TD, 'font-mono text-xs text-[var(--text-soft)]')}>{k.masked}</td>
                          <td className={TD}><StatusPill status={k.status} /></td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{num(k.callCount)}</td>
                          <td className={cn(TD, 'text-xs text-[var(--text-soft)]')}>{fmtDateTime(k.lastUsedAt)}</td>
                          <td className={cn(TD, 'text-xs text-[var(--text-soft)]')}>{fmtDate(k.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </Reveal>

            {/* 호출 로그 */}
            <Reveal>
              <Panel
                title={<span className="flex items-center gap-2"><Activity size={16} className="text-blue-500" /> 최근 호출 기록</span>}
                action={
                  <button onClick={exportCalls} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-blue-300 hover:text-blue-600">
                    <Download size={13} /> 엑셀 다운로드
                  </button>
                }
              >
                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className={THEAD}>
                        <th className={TH}>시각</th>
                        <th className={TH}>회원</th>
                        <th className={TH}>모델</th>
                        <th className={TH}>제공사</th>
                        <th className={TH}>종류</th>
                        <th className={cn(TH, 'text-right')}>크레딧</th>
                        <th className={TH}>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calls.map((c, i) => (
                        <tr key={i} className={TR}>
                          <td className={cn(TD, 'text-[var(--text-soft)]')}>{fmtDateTime(c.createdAt)}</td>
                          <td className={TD}>
                            <div className="text-xs font-medium">{c.userName || c.userId || '게스트'}</div>
                            <div className="text-[11px] text-[var(--text-dim)]">{c.userEmail}</div>
                          </td>
                          <td className={cn(TD, 'max-w-[220px] truncate')} title={c.model}>{c.model || '-'}</td>
                          <td className={cn(TD, 'text-xs text-[var(--text-soft)]')}>{c.provider || '-'}</td>
                          <td className={cn(TD, 'text-xs text-[var(--text-soft)]')}>{c.kind === 'image' ? '이미지' : c.kind === 'video' ? '영상' : c.kind || '-'}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{c.status === 'ok' ? cr(c.credits) : '-'}</td>
                          <td className={TD}>
                            <StatusPill status={c.status} />
                            {c.status !== 'ok' && c.error && (
                              <div className="mt-0.5 max-w-[200px] truncate text-[11px] text-rose-400" title={c.error}>{c.error}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {calls.length === 0 && (
                        <tr><td colSpan={7} className={cn(TD, 'py-6 text-center text-[var(--text-dim)]')}>기간 내 호출 기록이 없습니다.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
                  <ShieldCheck size={13} className="text-emerald-500" /> 크레딧은 스튜디오(UI) 사용과 동일하게 차감되며, 성공한 호출만 과금됩니다.
                </p>
              </Panel>
            </Reveal>
          </>
        )}
      </div>
    </div>
  )
}
