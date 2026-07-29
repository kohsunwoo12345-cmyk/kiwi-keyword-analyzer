'use client'

import { useCallback, useEffect, useState } from 'react'
import { Database, RefreshCw, Search, Download, ChevronRight, ArrowLeft, Users, FileText, Inbox } from 'lucide-react'
import { MktCanvas, MktHeader, MktPanel } from '@/components/marketing/node'
import { cn } from '@/lib/utils'

const kst = (iso?: string) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

interface UserRow { userId: string; name: string; email: string; plan: string; pages: number; leads: number; lastLeadAt: string }
interface PageRow { slug: string; title: string; source: string; sourceLabel: string; status: string; views: number; leads: number; createdAt: string; lastLeadAt: string }
interface LeadRow { id: string; source_label: string; owner: string; page_title: string; page_slug: string; name: string; phone: string; email: string; extra: string; created_at: string }

export default function LeadsPage() {
  const [level, setLevel] = useState<'users' | 'pages' | 'leads'>('users')
  const [users, setUsers] = useState<UserRow[]>([])
  const [pages, setPages] = useState<PageRow[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [pageInfo, setPageInfo] = useState<{ slug: string; title: string } | null>(null)
  const [totals, setTotals] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = useCallback(async (userId?: string, slug?: string, search?: string) => {
    setLoading(true)
    const p = new URLSearchParams()
    if (userId) p.set('userId', userId)
    if (slug) p.set('slug', slug)
    if (search) p.set('q', search)
    try {
      const r = await fetch(`/api/admin/leads?${p.toString()}`, { credentials: 'include', cache: 'no-store' })
      const d = await r.json()
      if (d.ok) {
        setLevel(d.level)
        if (d.level === 'users') { setUsers(d.users || []); setUser(null); setPageInfo(null) }
        if (d.level === 'pages') { setPages(d.pages || []); setUser(d.user) }
        if (d.level === 'leads') { setLeads(d.leads || []); setUser(d.user); setPageInfo(d.page) }
        setTotals(d.totals || {})
      }
    } catch { /* 무시 */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    // 알림 내역에서 "이 회원 신청 DB" 로 들어오는 경우 지원
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    load(sp.get('userId') || undefined, sp.get('slug') || undefined)
  }, [load])

  const dl = (fmt: 'csv' | 'xlsx') => {
    const p = new URLSearchParams({ format: fmt })
    if (user?.id) p.set('userId', user.id)
    if (pageInfo?.slug) p.set('slug', pageInfo.slug)
    return `/api/admin/leads?${p.toString()}`
  }

  return (
    <MktCanvas>
      <MktHeader
        icon={Database}
        eyebrow="LEAD DB"
        title="랜딩 신청자 DB"
        desc="어느 회원의 어느 랜딩페이지에서 어떤 신청자가 나왔는지 단계별로 봅니다. 빌더 랜딩페이지와 퍼널 랜딩의 신청자를 모두 합쳐서 보여주며, 각 단계에서 그대로 다운로드할 수 있습니다."
      />

      {/* 경로 */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12.5px]">
        <button onClick={() => load()} className={cn('rounded-lg px-2 py-1 font-semibold', level === 'users' ? 'bg-[#6366f1]/12 text-[#6366f1]' : 'text-[var(--mkt-text-dim)] hover:bg-[var(--panel-2)]')}>
          전체 회원
        </button>
        {user && (
          <>
            <ChevronRight size={13} className="text-[var(--mkt-text-dim)]" />
            <button onClick={() => load(user.id)} className={cn('rounded-lg px-2 py-1 font-semibold', level === 'pages' ? 'bg-[#6366f1]/12 text-[#6366f1]' : 'text-[var(--mkt-text-dim)] hover:bg-[var(--panel-2)]')}>
              {user.name || user.email || user.id}
            </button>
          </>
        )}
        {pageInfo && (
          <>
            <ChevronRight size={13} className="text-[var(--mkt-text-dim)]" />
            <span className="rounded-lg bg-[#6366f1]/12 px-2 py-1 font-semibold text-[#6366f1]">{pageInfo.title}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {level !== 'users' && (
            <>
              <a href={dl('csv')} data-f="dl-csv" className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]"><Download size={12} /> CSV</a>
              <a href={dl('xlsx')} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]"><Download size={12} /> 엑셀</a>
            </>
          )}
          {level === 'users' && (
            <a href="/api/admin/leads?format=xlsx" className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--panel-2)]">
              <Download size={12} /> 전체 엑셀
            </a>
          )}
          <button onClick={() => load(user?.id, pageInfo?.slug)} className="text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── 1단계: 회원별 ── */}
      {level === 'users' && (
        <MktPanel
          icon={Users}
          title={`회원별 신청 DB (${(totals.users || 0).toLocaleString()}명 · 신청 ${(totals.leads || 0).toLocaleString()}건)`}
          action={
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--mkt-text-dim)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(undefined, undefined, q) }}
                placeholder="회원 이름·이메일" className="input w-44 !pl-7 !py-1.5 text-xs" data-f="q" />
            </div>
          }
        >
          {users.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--mkt-text-dim)]">{loading ? '불러오는 중…' : '랜딩페이지를 만든 회원이 없습니다.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--mkt-text-soft)]">
                    <th className="py-2 font-semibold">회원</th>
                    <th className="py-2 font-semibold">플랜</th>
                    <th className="py-2 text-right font-semibold">랜딩페이지</th>
                    <th className="py-2 text-right font-semibold">신청자</th>
                    <th className="py-2 font-semibold">최근 신청</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody data-f="user-rows">
                  {users.map((u) => (
                    <tr key={u.userId} onClick={() => load(u.userId)} data-f="user-row"
                      className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-2)]">
                      <td className="py-2">
                        <span className="font-semibold">{u.name || '(이름 없음)'}</span>
                        <span className="ml-1.5 text-[11px] text-[var(--mkt-text-dim)]">{u.email}</span>
                      </td>
                      <td className="py-2 text-[11.5px] text-[var(--mkt-text-dim)]">{u.plan || '-'}</td>
                      <td className="py-2 text-right tabular-nums">{u.pages.toLocaleString()}</td>
                      <td className="py-2 text-right font-bold tabular-nums text-[#6366f1]">{u.leads.toLocaleString()}</td>
                      <td className="py-2 text-[11.5px] text-[var(--mkt-text-dim)]">{kst(u.lastLeadAt)}</td>
                      <td className="py-2 text-right"><ChevronRight size={14} className="text-[var(--mkt-text-dim)]" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </MktPanel>
      )}

      {/* ── 2단계: 랜딩페이지별 ── */}
      {level === 'pages' && (
        <MktPanel icon={FileText} title={`${user?.name || ''} 회원의 랜딩페이지 (${(totals.pages || 0).toLocaleString()}개 · 신청 ${(totals.leads || 0).toLocaleString()}건)`}>
          <button onClick={() => load()} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]">
            <ArrowLeft size={12} /> 회원 목록
          </button>
          {pages.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--mkt-text-dim)]">{loading ? '불러오는 중…' : '이 회원의 랜딩페이지가 없습니다.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--mkt-text-soft)]">
                    <th className="py-2 font-semibold">랜딩페이지</th>
                    <th className="py-2 font-semibold">종류</th>
                    <th className="py-2 text-right font-semibold">조회수</th>
                    <th className="py-2 text-right font-semibold">신청자</th>
                    <th className="py-2 text-right font-semibold">전환율</th>
                    <th className="py-2 font-semibold">최근 신청</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody data-f="page-rows">
                  {pages.map((p) => (
                    <tr key={p.source + p.slug} onClick={() => p.leads > 0 && load(user?.id, p.slug)} data-f="page-row"
                      className={cn('border-b border-[var(--border)] last:border-0', p.leads > 0 ? 'cursor-pointer hover:bg-[var(--panel-2)]' : 'opacity-70')}>
                      <td className="py-2">
                        <span className="font-semibold">{p.title}</span>
                        <span className="ml-1.5 font-mono text-[10.5px] text-[var(--mkt-text-dim)]">/{p.slug}</span>
                      </td>
                      <td className="py-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold',
                          p.source === 'funnel' ? 'bg-[#f59e0b]/12 text-[#b45309]' : 'bg-[#6366f1]/12 text-[#6366f1]')}>{p.sourceLabel}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{p.views.toLocaleString()}</td>
                      <td className="py-2 text-right font-bold tabular-nums text-[#6366f1]">{p.leads.toLocaleString()}</td>
                      <td className="py-2 text-right tabular-nums text-[11.5px] text-[var(--mkt-text-dim)]">
                        {p.views > 0 ? `${Math.round((p.leads / p.views) * 1000) / 10}%` : '-'}
                      </td>
                      <td className="py-2 text-[11.5px] text-[var(--mkt-text-dim)]">{kst(p.lastLeadAt)}</td>
                      <td className="py-2 text-right">{p.leads > 0 && <ChevronRight size={14} className="text-[var(--mkt-text-dim)]" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </MktPanel>
      )}

      {/* ── 3단계: 신청자 ── */}
      {level === 'leads' && (
        <MktPanel icon={Inbox} title={`${pageInfo?.title || ''} — 신청자 ${leads.length.toLocaleString()}명`}>
          <button onClick={() => load(user?.id)} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]">
            <ArrowLeft size={12} /> 랜딩페이지 목록
          </button>
          {leads.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--mkt-text-dim)]">{loading ? '불러오는 중…' : '신청자가 없습니다.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--mkt-text-soft)]">
                    <th className="py-2 font-semibold">신청일시</th>
                    <th className="py-2 font-semibold">이름</th>
                    <th className="py-2 font-semibold">연락처</th>
                    <th className="py-2 font-semibold">이메일</th>
                    <th className="py-2 font-semibold">추가정보</th>
                  </tr>
                </thead>
                <tbody data-f="lead-rows">
                  {leads.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="whitespace-nowrap py-2 text-[11.5px] text-[var(--mkt-text-dim)]">{kst(l.created_at)}</td>
                      <td className="py-2 font-semibold">{l.name || '-'}</td>
                      <td className="py-2 tabular-nums">{l.phone || '-'}</td>
                      <td className="py-2 text-[11.5px]">{l.email || '-'}</td>
                      <td className="max-w-[280px] truncate py-2 text-[11.5px] text-[var(--mkt-text-dim)]">{l.extra || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </MktPanel>
      )}
    </MktCanvas>
  )
}
