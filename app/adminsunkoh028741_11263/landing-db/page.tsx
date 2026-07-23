'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Database,
  Search,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  Users,
  FileText,
} from 'lucide-react'
import { MktCanvas, MktHeader, MktPanel, MktButton, MktStat, mktTable } from '@/components/marketing/node'
import { cn } from '@/lib/utils'

// ── 타입 ──
type UserRow = {
  id: string
  name: string
  email: string
  page_count: number
  submission_count: number
  last_page_at: string | null
}
type Stats = { totalPages: number; totalSubmissions: number; totalUsers: number }
type OverviewResp = { ok: boolean; users?: UserRow[]; stats?: Stats; error?: string }

type LandingPage = {
  id: string
  title: string
  slug: string
  status: string
  view_count: number
  submission_count: number
  created_at: string
}
type Submission = {
  id: string
  name: string
  phone: string
  email: string
  extra?: Record<string, unknown> | null
  page_title: string
  page_slug: string
  created_at: string
}
type DetailUser = { id: string; name: string; email: string }
type DetailResp = {
  ok: boolean
  user?: DetailUser
  pages?: LandingPage[]
  submissions?: Submission[]
  error?: string
}

// ── 헬퍼 ──
const kst = (iso?: string | null) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso || '-'
  }
}

const kstDate = (iso?: string | null) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso || '-'
  }
}

type StatusMeta = { label: string; color: string }
const statusFor = (status?: string): StatusMeta => {
  const s = (status || '').toLowerCase()
  if (s === 'published' || s === 'active' || s === 'live' || s === '게시') return { label: '게시중', color: '#10b981' }
  if (s === 'draft' || s === '초안') return { label: '초안', color: '#f59e0b' }
  if (s === 'archived' || s === 'closed' || s === '종료') return { label: '종료', color: '#94a3b8' }
  return { label: status || '알 수 없음', color: '#5b6cff' }
}

// extra 필드(객체)를 "키: 값" 목록으로 평탄화
const extraEntries = (extra?: Record<string, unknown> | null): [string, string][] => {
  if (!extra || typeof extra !== 'object') return []
  return Object.entries(extra)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])
}

const API = '/api/admin/landing-db'

export default function LandingDbPage() {
  // 개요(유저 목록)
  const [users, setUsers] = useState<UserRow[]>([])
  const [stats, setStats] = useState<Stats>({ totalPages: 0, totalSubmissions: 0, totalUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')

  // 상세(선택된 유저)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailResp | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState('')

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const sp = new URLSearchParams()
      if (q.trim()) sp.set('q', q.trim())
      const qs = sp.toString()
      const r = await fetch(`${API}${qs ? `?${qs}` : ''}`, { credentials: 'include' })
      const d: OverviewResp = await r.json()
      if (!d.ok) throw new Error(d.error || '불러오기 실패')
      setUsers(d.users || [])
      if (d.stats) setStats(d.stats)
    } catch (e: any) {
      setErr(e?.message || '불러오는 중 오류가 발생했습니다.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const loadDetail = useCallback(async (userId: string) => {
    setDetailLoading(true)
    setDetailErr('')
    setDetail(null)
    try {
      const r = await fetch(`${API}?userId=${encodeURIComponent(userId)}`, { credentials: 'include' })
      const d: DetailResp = await r.json()
      if (!d.ok) throw new Error(d.error || '불러오기 실패')
      setDetail(d)
    } catch (e: any) {
      setDetailErr(e?.message || '불러오는 중 오류가 발생했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const openUser = (id: string) => {
    setSelectedId(id)
    loadDetail(id)
  }
  const backToList = () => {
    setSelectedId(null)
    setDetail(null)
    setDetailErr('')
  }

  const runSearch = () => setQ(qInput)

  const overviewXlsx = `${API}?format=xlsx`

  return (
    <MktCanvas>
      <MktHeader
        icon={Database}
        eyebrow="ADMIN · LANDING DB"
        title="랜딩페이지 DB"
        desc="회원별 랜딩페이지와 그를 통해 수집된 신청 DB(제출 내역)를 관리자가 열람합니다. 회원을 선택해 랜딩페이지 목록과 수집 DB를 확인하고, 엑셀·CSV로 내려받을 수 있어요."
        action={
          !selectedId ? (
            <a href={overviewXlsx} className="mkt-btn no-underline">
              <FileSpreadsheet size={14} /> 전체 엑셀 다운로드
            </a>
          ) : undefined
        }
      />

      {selectedId ? (
        <DetailView
          user={detail?.user}
          userId={selectedId}
          loading={detailLoading}
          err={detailErr}
          pages={detail?.pages || []}
          submissions={detail?.submissions || []}
          onBack={backToList}
        />
      ) : (
        <>
          {/* 통계 타일 */}
          <div className="grid grid-cols-3 gap-3">
            <MktStat label="총 회원 수" value={stats.totalUsers.toLocaleString()} icon={Users} accent="#5b6cff" />
            <MktStat label="총 랜딩페이지" value={stats.totalPages.toLocaleString()} icon={FileText} accent="#a855f7" />
            <MktStat label="총 수집 DB" value={stats.totalSubmissions.toLocaleString()} icon={Database} accent="#10b981" />
          </div>

          {/* 검색 */}
          <MktPanel className="mt-4" title="회원 검색" icon={Search}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mkt-text-dim)]" />
                <input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearch()
                  }}
                  placeholder="회원명 · 이메일 검색"
                  className="input w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#7c3aed]"
                />
              </div>
              <MktButton onClick={runSearch}>
                <Search size={14} /> 검색
              </MktButton>
            </div>
          </MktPanel>

          {/* 유저 목록 */}
          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-[var(--mkt-text-dim)]">
                <Loader2 size={18} className="animate-spin" /> 회원 목록을 불러오는 중…
              </div>
            ) : err ? (
              <div className="rounded-xl border border-[#ff9b9b]/25 bg-[#ff9b9b]/10 px-4 py-6 text-center text-sm font-semibold text-[#e11d48]">
                {err}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                <Users size={30} className="text-[var(--mkt-text-dim)]" />
                <p className="text-sm font-semibold text-[var(--mkt-text-soft)]">표시할 회원이 없습니다.</p>
                <p className="text-xs text-[var(--mkt-text-dim)]">검색어를 바꿔보세요.</p>
              </div>
            ) : (
              <MktPanel
                title={`회원 목록 (${users.length.toLocaleString()})`}
                icon={Users}
                bodyClassName="p-0"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className={mktTable.thead}>
                      <tr>
                        <th className={mktTable.th}>회원명</th>
                        <th className={mktTable.th}>이메일</th>
                        <th className={cn(mktTable.th, 'text-right')}>랜딩페이지 수</th>
                        <th className={cn(mktTable.th, 'text-right')}>수집 DB 수</th>
                        <th className={mktTable.th}>최근 생성일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className={cn(mktTable.tr, 'cursor-pointer')}
                          onClick={() => openUser(u.id)}
                        >
                          <td className={cn(mktTable.td, 'font-semibold text-[var(--mkt-text)]')}>{u.name || '이름 없음'}</td>
                          <td className={cn(mktTable.td, 'text-[var(--mkt-text-soft)]')}>{u.email || '-'}</td>
                          <td className={cn(mktTable.td, 'text-right tabular-nums')}>{(u.page_count || 0).toLocaleString()}</td>
                          <td className={cn(mktTable.td, 'text-right tabular-nums font-semibold text-[#4f46e5]')}>
                            {(u.submission_count || 0).toLocaleString()}
                          </td>
                          <td className={cn(mktTable.td, 'tabular-nums text-[var(--mkt-text-dim)]')}>{kstDate(u.last_page_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </MktPanel>
            )}
          </div>
        </>
      )}
    </MktCanvas>
  )
}

function DetailView({
  user,
  userId,
  loading,
  err,
  pages,
  submissions,
  onBack,
}: {
  user?: DetailUser
  userId: string
  loading: boolean
  err: string
  pages: LandingPage[]
  submissions: Submission[]
  onBack: () => void
}) {
  const xlsxUrl = `${API}?format=xlsx&userId=${encodeURIComponent(userId)}`
  const csvUrl = `${API}?format=csv&userId=${encodeURIComponent(userId)}`

  return (
    <div>
      {/* 상단 액션 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <MktButton onClick={onBack} variant="ghost">
          <ArrowLeft size={14} /> 회원 목록
        </MktButton>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--mkt-text)]">{user?.name || '회원 상세'}</p>
          {user?.email && <p className="truncate text-xs text-[var(--mkt-text-dim)]">{user.email}</p>}
        </div>
        <div className="ml-auto flex flex-shrink-0 gap-2">
          <a href={xlsxUrl} className="mkt-btn no-underline">
            <FileSpreadsheet size={14} /> 엑셀
          </a>
          <a href={csvUrl} className="mkt-btn ghost no-underline">
            <Download size={14} /> CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-[var(--mkt-text-dim)]">
          <Loader2 size={18} className="animate-spin" /> 회원 데이터를 불러오는 중…
        </div>
      ) : err ? (
        <div className="mt-4 rounded-xl border border-[#ff9b9b]/25 bg-[#ff9b9b]/10 px-4 py-6 text-center text-sm font-semibold text-[#e11d48]">
          {err}
        </div>
      ) : (
        <>
          {/* 통계 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MktStat label="랜딩페이지 수" value={pages.length.toLocaleString()} icon={FileText} accent="#a855f7" />
            <MktStat label="수집 DB 수" value={submissions.length.toLocaleString()} icon={Database} accent="#10b981" />
          </div>

          {/* 랜딩페이지 목록 */}
          <MktPanel className="mt-4" title="랜딩페이지 목록" icon={FileText} bodyClassName="p-0">
            {pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <FileText size={26} className="text-[var(--mkt-text-dim)]" />
                <p className="text-sm font-semibold text-[var(--mkt-text-soft)]">랜딩페이지가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className={mktTable.thead}>
                    <tr>
                      <th className={mktTable.th}>제목</th>
                      <th className={mktTable.th}>slug</th>
                      <th className={mktTable.th}>상태</th>
                      <th className={cn(mktTable.th, 'text-right')}>조회수</th>
                      <th className={cn(mktTable.th, 'text-right')}>수집수</th>
                      <th className={mktTable.th}>생성일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((p) => {
                      const st = statusFor(p.status)
                      return (
                        <tr key={p.id} className={mktTable.tr}>
                          <td className={cn(mktTable.td, 'font-semibold text-[var(--mkt-text)]')}>{p.title || '(제목 없음)'}</td>
                          <td className={cn(mktTable.td, 'text-[var(--mkt-text-dim)]')}>
                            <code className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[11px]">{p.slug || '-'}</code>
                          </td>
                          <td className={mktTable.td}>
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                              style={{ background: `${st.color}22`, color: st.color }}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className={cn(mktTable.td, 'text-right tabular-nums text-[var(--mkt-text-soft)]')}>
                            {(p.view_count || 0).toLocaleString()}
                          </td>
                          <td className={cn(mktTable.td, 'text-right tabular-nums font-semibold text-[#4f46e5]')}>
                            {(p.submission_count || 0).toLocaleString()}
                          </td>
                          <td className={cn(mktTable.td, 'tabular-nums text-[var(--mkt-text-dim)]')}>{kstDate(p.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </MktPanel>

          {/* 수집 DB */}
          <MktPanel
            className="mt-4"
            title={`수집 DB (${submissions.length.toLocaleString()})`}
            icon={Database}
            bodyClassName="p-0"
          >
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <Database size={26} className="text-[var(--mkt-text-dim)]" />
                <p className="text-sm font-semibold text-[var(--mkt-text-soft)]">수집된 DB가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className={mktTable.thead}>
                    <tr>
                      <th className={mktTable.th}>신청자명</th>
                      <th className={mktTable.th}>연락처</th>
                      <th className={mktTable.th}>이메일</th>
                      <th className={mktTable.th}>랜딩페이지</th>
                      <th className={mktTable.th}>추가 정보</th>
                      <th className={mktTable.th}>신청일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => {
                      const extras = extraEntries(s.extra)
                      return (
                        <tr key={s.id} className={cn(mktTable.tr, 'align-top')}>
                          <td className={cn(mktTable.td, 'font-semibold text-[var(--mkt-text)]')}>{s.name || '-'}</td>
                          <td className={cn(mktTable.td, 'tabular-nums text-[var(--mkt-text-soft)]')}>{s.phone || '-'}</td>
                          <td className={cn(mktTable.td, 'text-[var(--mkt-text-soft)]')}>{s.email || '-'}</td>
                          <td className={cn(mktTable.td, 'text-[var(--mkt-text-dim)]')}>
                            <span className="text-[var(--mkt-text-soft)]">{s.page_title || '-'}</span>
                            {s.page_slug && <span className="block text-[11px]">/{s.page_slug}</span>}
                          </td>
                          <td className={cn(mktTable.td, 'max-w-[260px] whitespace-normal')}>
                            {extras.length === 0 ? (
                              <span className="text-[var(--mkt-text-dim)]">-</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {extras.map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="inline-flex items-center gap-1 rounded-md bg-[var(--panel-2)] px-1.5 py-0.5 text-[11px] text-[var(--mkt-text-soft)]"
                                  >
                                    <b className="font-semibold text-[var(--mkt-text-dim)]">{k}:</b> {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className={cn(mktTable.td, 'tabular-nums text-[var(--mkt-text-dim)]')}>{kst(s.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </MktPanel>
        </>
      )}
    </div>
  )
}
