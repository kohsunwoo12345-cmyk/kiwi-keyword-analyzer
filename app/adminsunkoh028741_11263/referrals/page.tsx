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
import { kstDate, kstLong, relKST } from '@/lib/time'

const ACCENT = '#7c3aed'

const num = (n: number) => (n || 0).toLocaleString('ko-KR')

// 모든 시간 표기는 한국시간(KST) 고정
const fmtDate = (iso: string) => kstDate(iso)
const fmtKST = (iso: string) => kstLong(iso)
const relKo = (iso: string) => relKST(iso)

const REL_TONE: Record<string, string> = {
  today: 'bg-emerald-50 text-emerald-600',
  recent: 'bg-sky-50 text-sky-600',
  month: 'bg-violet-50 text-violet-600',
  old: 'bg-slate-100 text-slate-500',
}

/** 로그인/가입 방식 뱃지 */
function providerMeta(p?: string): { label: string; cls: string } {
  switch ((p || 'email').toLowerCase()) {
    case 'google':
      return { label: '구글 로그인', cls: 'border border-slate-200 bg-white text-slate-700' }
    case 'kakao':
      return { label: '카카오 로그인', cls: 'bg-[#FEE500] text-[#3C1E1E]' }
    default:
      return { label: '일반 로그인', cls: 'bg-slate-100 text-slate-600' }
  }
}

function ProviderBadge({ p }: { p?: string }) {
  const m = providerMeta(p)
  const key = (p || 'email').toLowerCase()
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', m.cls)}>
      {key === 'google' && (
        <svg viewBox="0 0 24 24" className="h-3 w-3">
          <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
          <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8H1.7v3C3.6 21.3 7.5 24 12 24z" />
          <path fill="#FBBC05" d="M5.5 14.6a7.2 7.2 0 010-4.6v-3H1.7a12 12 0 000 10.6l3.8-3z" />
          <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.6 2.7 1.7 6.7l3.8 3c.9-2.8 3.5-4.9 6.5-4.9z" />
        </svg>
      )}
      {m.label}
    </span>
  )
}

/** 동의 내역 뱃지 (필수: 이용약관/개인정보 · 선택: 마케팅/AI) */
function ConsentCell({ r }: { r: ReferralRow }) {
  const item = (label: string, ok: boolean, required?: boolean) => (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
        ok
          ? required
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-sky-50 text-sky-600'
          : 'bg-slate-100 text-slate-400',
      )}
      title={label + (ok ? ' 동의' : ' 미동의')}
    >
      {ok ? '✓' : '✕'} {label}
    </span>
  )
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {item('약관', !!r.tosConsent, true)}
        {item('개인정보', !!r.privacyConsent, true)}
      </div>
      <div className="flex flex-wrap gap-1">
        {item('마케팅', !!r.marketingConsent)}
      </div>
      {r.consentAt && <span className="text-[10px] text-[var(--text-dim)]">{fmtKST(r.consentAt)}</span>}
    </div>
  )
}

const consentText = (r: ReferralRow) =>
  [
    `약관:${r.tosConsent ? 'Y' : 'N'}`,
    `개인정보:${r.privacyConsent ? 'Y' : 'N'}`,
    `마케팅:${r.marketingConsent ? 'Y' : 'N'}`,
  ].join(' ')

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
        ['회원', '이메일', '가입 방식', '전화', '회사명', '국가', '우편번호', '사업장 주소', '상세 주소', '가입일시(KST)', '동의 내역', '동의일시(KST)', '추천인 코드', '추천인', '친구', '추천한 수', '결제 상태', '결제 플랜', '크레딧'],
        rows.map((r) => [
          r.name || '',
          r.email || '',
          providerMeta(r.provider).label,
          r.phone || '',
          r.company || '',
          r.country || '',
          r.postalCode || '',
          r.address1 || '',
          r.address2 || '',
          fmtKST(r.createdAt),
          consentText(r),
          r.consentAt ? fmtKST(r.consentAt) : '',
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
        eyebrow="ADMIN · 회원가입정보"
        title="회원가입 정보"
        desc="회원별 가입 방식(구글/카카오/일반), 가입 시 입력정보, 사업장 주소, 추천인·친구, 결제(플랜) 여부와 한국 시간 기준 가입일시를 조회합니다."
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
                <table className="w-full min-w-[1560px] text-sm">
                  <thead>
                    <tr className={THEAD}>
                      <th className={TH}>회원</th>
                      <th className={TH}>가입 방식</th>
                      <th className={TH}>동의 내역</th>
                      <th className={TH}>사업장 주소</th>
                      <th className={TH}>가입일시</th>
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
                            {(r.company || r.phone) && (
                              <div className="text-xs text-[var(--text-dim)]">
                                {[r.company, r.phone].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className={cn(TD, 'align-top')}>
                            <ProviderBadge p={r.provider} />
                          </td>
                          <td className={cn(TD, 'align-top')}>
                            <ConsentCell r={r} />
                          </td>
                          <td className={cn(TD, 'max-w-[260px] whitespace-normal align-top')}>
                            {r.addressDone ? (
                              <>
                                <div className="text-xs font-medium text-[var(--text-soft)]">
                                  {r.country} · {r.postalCode}
                                </div>
                                <div className="text-sm">{r.address1}</div>
                                {r.address2 && <div className="text-xs text-[var(--text-dim)]">{r.address2}</div>}
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                                미입력
                              </span>
                            )}
                          </td>
                          <td className={cn(TD, 'align-top')}>
                            <div className="whitespace-nowrap text-[var(--text-soft)]">{fmtKST(r.createdAt)}</div>
                            {(() => {
                              const rel = relKo(r.createdAt)
                              return rel ? (
                                <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', REL_TONE[rel.tone])}>{rel.label}</span>
                              ) : null
                            })()}
                          </td>
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
