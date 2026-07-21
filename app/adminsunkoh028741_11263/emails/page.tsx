'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, RefreshCw, CheckCircle2, XCircle, Search, Eye, X, Send, Clock } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminEmailLog, type EmailLogRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#2563eb'

// 한국시간(KST) 표시
function kst(iso: string) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return iso }
}
function kindLabel(k: string) {
  return k === 'reset' ? '비밀번호 재설정' : k === 'welcome' ? '가입 환영' : k || '일반'
}
function kindClass(k: string) {
  return k === 'reset'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : k === 'welcome'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'
}

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<EmailLogRow[]>([])
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, today: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed'>('all')
  const [kindFilter, setKindFilter] = useState<string>('all')
  const [preview, setPreview] = useState<EmailLogRow | null>(null)

  const load = () => {
    setLoading(true)
    adminEmailLog().then((r) => {
      setEmails(r.emails)
      setStats(r.stats)
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])
  // URL ?kind=welcome 등으로 진입 시 해당 유형으로 프리셋 (사이드바 "환영인사 메일" 메뉴에서 진입)
  useEffect(() => {
    try {
      const k = new URLSearchParams(window.location.search).get('kind')
      if (k) setKindFilter(k)
    } catch { /* ignore */ }
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return emails.filter((e) => {
      if (filter !== 'all' && e.status !== filter) return false
      if (kindFilter !== 'all' && (e.kind || 'general') !== kindFilter) return false
      if (s && !(`${e.to_email} ${e.from_email} ${e.subject}`.toLowerCase().includes(s))) return false
      return true
    })
  }, [emails, q, filter, kindFilter])

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Mail}
        eyebrow="ADMIN"
        title="이메일 발송 기록 (Resend)"
        desc="Resend로 발송된 모든 이메일의 수신자·발신자·내용·상태를 한국시간 기준으로 확인합니다."
        accent={ACCENT}
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="전체 발송" value={String(stats.total)} icon={Mail} accent="#2563eb" />
            <StatCard label="성공" value={String(stats.sent)} icon={CheckCircle2} accent="#10b981" />
            <StatCard label="실패" value={String(stats.failed)} icon={XCircle} accent="#ef4444" />
            <StatCard label="오늘 (24h)" value={String(stats.today)} icon={Clock} accent="#8b5cf6" />
          </div>
        </Reveal>

        <Reveal>
          <Panel>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="수신자 · 발신자 · 제목 검색"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1.5">
                {([
                  { k: 'all', label: '전체' },
                  { k: 'sent', label: '성공' },
                  { k: 'failed', label: '실패' },
                ] as { k: typeof filter; label: string }[]).map((f) => (
                  <button
                    key={f.k}
                    onClick={() => setFilter(f.k)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      filter === f.k ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-[var(--border)] bg-white text-[var(--text-soft)] hover:bg-slate-50',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 유형별 정리 — 환영인사 메일 등 */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {([
                { k: 'all', label: '전체' },
                { k: 'welcome', label: '환영인사 메일' },
                { k: 'reset', label: '비밀번호 재설정' },
                { k: 'funnel', label: '퍼널' },
                { k: 'marketing', label: '마케팅' },
                { k: 'general', label: '일반' },
              ]).map((f) => (
                <button
                  key={f.k}
                  onClick={() => setKindFilter(f.k)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                    kindFilter === f.k ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-[var(--border)] bg-white text-[var(--text-soft)] hover:bg-slate-50',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                    <th className="pb-2.5 font-medium">발송시각 (KST)</th>
                    <th className="pb-2.5 font-medium">수신자</th>
                    <th className="pb-2.5 font-medium">발신자</th>
                    <th className="pb-2.5 font-medium">제목</th>
                    <th className="pb-2.5 font-medium">유형</th>
                    <th className="pb-2.5 font-medium">상태</th>
                    <th className="pb-2.5 text-right font-medium">내용</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                      <td className="whitespace-nowrap py-3 text-[var(--text-soft)]">{kst(e.created_at)}</td>
                      <td className="py-3 font-medium">{e.to_email}</td>
                      <td className="py-3 text-[var(--text-soft)]">{e.from_email}</td>
                      <td className="max-w-[240px] truncate py-3" title={e.subject}>{e.subject}</td>
                      <td className="py-3"><Badge className={kindClass(e.kind)}>{kindLabel(e.kind)}</Badge></td>
                      <td className="py-3">
                        {e.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={12} /> 성공
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700" title={e.error}>
                            <XCircle size={12} /> 실패
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setPreview(e)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-soft)] transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={13} /> 보기
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[var(--text-dim)]">
                        {loading ? '불러오는 중…' : '발송된 이메일이 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[var(--text-dim)]">최신순 · {filtered.length}건 표시 (전체 {emails.length}건)</p>
          </Panel>
        </Reveal>
      </div>

      {/* 내용 미리보기 모달 */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreview(null)} />
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-blue-600" />
                <h3 className="font-semibold">이메일 내용</h3>
              </div>
              <button onClick={() => setPreview(null)} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-soft)] hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1 border-b border-[var(--border-soft)] bg-slate-50 px-5 py-3 text-xs text-[var(--text-soft)]">
              <p><b>발송시각(KST):</b> {kst(preview.created_at)}</p>
              <p><b>수신자:</b> {preview.to_email} &nbsp;·&nbsp; <b>발신자:</b> {preview.from_email}</p>
              <p><b>제목:</b> {preview.subject} &nbsp;·&nbsp; <b>유형:</b> {kindLabel(preview.kind)} &nbsp;·&nbsp; <b>상태:</b> {preview.status === 'sent' ? '성공' : '실패'}{preview.resend_id ? ` · ${preview.resend_id}` : ''}</p>
              {preview.error && <p className="text-rose-600"><b>오류:</b> {preview.error}</p>}
            </div>
            <div className="flex-1 overflow-auto p-2">
              {preview.body ? (
                <iframe title="email-body" sandbox="" className="h-[52vh] w-full rounded-lg border border-[var(--border-soft)] bg-white" srcDoc={preview.body} />
              ) : (
                <p className="p-6 text-center text-sm text-[var(--text-dim)]">저장된 본문이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
