'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  UserPlus,
  Search,
  RefreshCw,
  Download,
  Users,
  BadgeCheck,
  XCircle,
  Share2,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminReferrals, type AdminReferrals, type ReferralRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'

const num = (n: number) => (n || 0).toLocaleString('ko-KR')

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 결제된 플랜들을 사람이 읽을 수 있는 문자열로 조합 */
function planText(r: ReferralRow) {
  const parts: string[] = []
  if (r.plan && r.plan !== '없음') parts.push('마케터 ' + r.plan)
  if (r.videoPlan && r.videoPlan !== '없음') parts.push('영상 ' + r.videoPlan)
  return parts.join(' · ')
}

/** CSV(UTF-8 BOM) 다운로드 — Excel 에서 한글 정상 표시 */
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const THEAD = 'border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]'
const TH = 'px-3 py-2.5 font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 whitespace-nowrap'
const TR = 'border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50'

export default function AdminReferralsPage() {
  const [q, setQ] = useState('')
  const [data, setData] = useState<AdminReferrals>({ ok: false })
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reload = useCallback((query: string) => {
    setLoading(true)
    adminReferrals(query).then((r) => {
      setData(r)
      setLoading(false)
    })
  }, [])

  // 최초 로드
  useEffect(() => {
    reload('')
  }, [reload])

  // 검색어 디바운스 (~400ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => reload(q), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const totals = data.totals
  const rows = data.rows ?? []
  const hasData = rows.length > 0

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    reload(q)
  }

  const exportRows = useMemo(
    () => () => {
      downloadCsv(
        '가입추천조회.csv',
        ['회원', '이메일', '가입일', '추천인 코드', '추천인', '친구', '추천한 수', '결제 상태', '결제 플랜', '크레딧'],
        rows.map((r) => [
          r.name || '',
          r.email || '',
          fmtDate(r.createdAt),
          r.referralCode || '-',
          r.referredByName || '직접가입',
          r.friendCount,
          r.referredCount,
          r.paid ? '결제완료' : '미결제',
          planText(r),
          r.credits,
        ]),
      )
    },
    [rows],
  )

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={UserPlus}
        eyebrow="ADMIN · 가입/추천"
        title="가입 · 추천 조회"
        desc="회원별 가입 정보, 추천인, 친구, 결제(플랜) 여부를 조회합니다."
        accent={ACCENT}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={onSubmit} className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="이름·이메일·코드·추천인 검색"
                className="w-56 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[var(--text-dim)] focus:border-violet-300"
              />
            </form>
            <Button variant="outline" size="sm" onClick={() => reload(q)} disabled={loading}>
              <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
            </Button>
            <Button size="sm" onClick={exportRows} disabled={rows.length === 0}>
              <Download size={15} /> 엑셀 다운로드
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* 요약 */}
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="전체 회원" value={num(totals?.members ?? 0)} icon={Users} accent="#7c3aed" />
            <StatCard label="결제 회원" value={num(totals?.paid ?? 0)} icon={BadgeCheck} accent="#22c55e" />
            <StatCard label="미결제" value={num(totals?.unpaid ?? 0)} icon={XCircle} accent="#ef4444" />
            <StatCard label="추천 가입" value={num(totals?.referred ?? 0)} icon={Share2} accent="#0ea5e9" />
          </div>
        </Reveal>

        {loading && !hasData ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw size={28} className="animate-spin text-violet-400" />
              <p className="mt-4 text-sm text-[var(--text-dim)]">회원 데이터를 불러오는 중…</p>
            </div>
          </Panel>
        ) : !hasData ? (
          <Panel>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-400">
                <UserPlus size={26} />
              </span>
              <p className="mt-4 font-semibold">
                {q ? '검색 결과가 없습니다.' : '아직 가입한 회원이 없습니다.'}
              </p>
              <p className="mt-1 text-sm text-[var(--text-dim)]">
                {q ? '다른 검색어로 다시 시도해 주세요.' : '회원이 가입하면 이곳에 집계됩니다.'}
              </p>
            </div>
          </Panel>
        ) : (
          <Reveal>
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-violet-500" /> 회원 조회
                </span>
              }
              action={
                <button
                  onClick={exportRows}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-violet-300 hover:text-violet-600"
                >
                  <Download size={13} /> 엑셀 다운로드
                </button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className={THEAD}>
                      <th className={TH}>회원</th>
                      <th className={TH}>가입일</th>
                      <th className={TH}>추천인 코드</th>
                      <th className={TH}>추천인</th>
                      <th className={cn(TH, 'text-right')}>친구</th>
                      <th className={cn(TH, 'text-right')}>추천한 수</th>
                      <th className={TH}>결제 상태</th>
                      <th className={cn(TH, 'text-right')}>크레딧</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const plans = planText(r)
                      return (
                        <tr key={r.id} className={TR}>
                          <td className={TD}>
                            <div className="font-semibold">{r.name || '이름없음'}</div>
                            <div className="text-xs text-[var(--text-dim)]">{r.email}</div>
                          </td>
                          <td className={cn(TD, 'text-[var(--text-soft)]')}>{fmtDate(r.createdAt)}</td>
                          <td className={cn(TD, 'font-mono text-xs')}>{r.referralCode || '-'}</td>
                          <td className={TD}>
                            {r.referredByName ? (
                              <span className="font-medium">{r.referredByName}</span>
                            ) : (
                              <span className="text-xs text-[var(--text-dim)]">직접가입</span>
                            )}
                          </td>
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(r.friendCount)}</td>
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(r.referredCount)}</td>
                          <td className={TD}>
                            {r.paid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                                <BadgeCheck size={13} /> 결제완료
                                {plans && <span className="font-normal text-emerald-500">· {plans}</span>}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-500">
                                <XCircle size={13} /> 미결제
                              </span>
                            )}
                          </td>
                          <td className={cn(TD, 'text-right tabular-nums text-[var(--text-soft)]')}>{num(r.credits)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-dim)]">전체 {num(rows.length)}명 표시</p>
            </Panel>
          </Reveal>
        )}
      </div>
    </div>
  )
}
