'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, Plus, RefreshCw, Users, FileText, ExternalLink, Trash2, Loader2, Copy, Check, LayoutTemplate } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { funnelGroups, createFunnelGroup, deleteFunnelGroup, funnelPages, createFunnelPage, type FunnelGroup, type FunnelPage } from '@/lib/auth'
import { cn } from '@/lib/utils'

const kst = (iso?: string) => { if (!iso) return '-'; try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso } }
const num = (n: number) => (n || 0).toLocaleString('ko-KR')
const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function FunnelBuilderPage() {
  const [groups, setGroups] = useState<FunnelGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [pages, setPages] = useState<FunnelPage[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)

  // 새 그룹
  const [gName, setGName] = useState(''); const [gDesc, setGDesc] = useState(''); const [gColor, setGColor] = useState(COLORS[0])
  const [creating, setCreating] = useState(false)
  // 새 페이지
  const [pTitle, setPTitle] = useState(''); const [pDesc, setPDesc] = useState(''); const [pCreating, setPCreating] = useState(false)
  const [copied, setCopied] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => { setLoading(true); funnelGroups().then((d) => { setGroups(d.groups); setLoading(false); if (sel == null && d.groups[0]) selectGroup(d.groups[0].id) }) }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const selectGroup = (id: number) => { setSel(id); setPagesLoading(true); funnelPages(id).then((d) => { setPages(d.pages); setPagesLoading(false) }) }

  async function addGroup() {
    if (!gName.trim()) { setMsg('그룹 이름을 입력하세요.'); return }
    setCreating(true); setMsg('')
    const r = await createFunnelGroup(gName.trim(), gDesc.trim(), gColor)
    setCreating(false)
    if (r.ok) { setGName(''); setGDesc(''); const nid = r.id!; await new Promise((res) => setTimeout(res, 150)); funnelGroups().then((d) => { setGroups(d.groups); if (nid) selectGroup(nid) }) }
    else setMsg(r.error || '생성 실패')
  }
  async function removeGroup(id: number) {
    if (!confirm('이 퍼널 그룹을 삭제할까요? 하위 랜딩페이지도 접근이 끊길 수 있습니다.')) return
    await deleteFunnelGroup(id); if (sel === id) { setSel(null); setPages([]) }; load()
  }
  async function addPage() {
    if (sel == null) { setMsg('먼저 퍼널 그룹을 선택하세요.'); return }
    if (!pTitle.trim()) { setMsg('랜딩페이지 제목을 입력하세요.'); return }
    setPCreating(true); setMsg('')
    const r = await createFunnelPage(sel, pTitle.trim(), pDesc.trim())
    setPCreating(false)
    if (r.ok) { setPTitle(''); setPDesc(''); selectGroup(sel); load() }
    else setMsg(r.error || '생성 실패')
  }
  function copyUrl(url: string) {
    const full = (typeof window !== 'undefined' ? window.location.origin : '') + url
    try { navigator.clipboard.writeText(full); setCopied(url); setTimeout(() => setCopied(''), 1500) } catch {}
  }

  const selGroup = useMemo(() => groups.find((g) => g.id === sel), [groups, sel])
  const totalApplicants = useMemo(() => groups.reduce((a, g) => a + (g.applicant_count || 0), 0), [groups])
  const totalPages = useMemo(() => groups.reduce((a, g) => a + (g.landing_page_count || 0), 0), [groups])

  return (
    <div>
      <PageHeader icon={Filter} eyebrow="FUNNEL" title="퍼널 빌더" desc="랜딩페이지·신청 폼으로 리드를 모으는 퍼널을 그룹별로 만들고 관리합니다. 생성된 페이지는 공개 URL(/f/…)로 바로 배포됩니다." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MiniStat icon={LayoutTemplate} label="퍼널 그룹" value={num(groups.length)} />
        <MiniStat icon={FileText} label="랜딩페이지" value={num(totalPages)} />
        <MiniStat icon={Users} label="누적 신청자" value={num(totalApplicants)} accent="text-emerald-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        {/* 그룹 */}
        <div className="space-y-4">
          <Panel title="새 퍼널 그룹">
            <div className="space-y-2.5">
              <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="그룹 이름 (예: 여름 프로모션)" className="input w-full" />
              <input value={gDesc} onChange={(e) => setGDesc(e.target.value)} placeholder="설명 (선택)" className="input w-full" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-dim)]">색상</span>
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setGColor(c)} className={cn('h-6 w-6 rounded-full border-2', gColor === c ? 'border-slate-800' : 'border-transparent')} style={{ background: c }} />
                ))}
              </div>
              <button onClick={addGroup} disabled={creating} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} 그룹 만들기
              </button>
            </div>
          </Panel>

          <Panel title="퍼널 그룹" action={<button onClick={load} className="text-[var(--text-dim)] hover:text-[var(--text)]"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /></button>}>
            {groups.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '아직 퍼널 그룹이 없습니다.'}</div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <button key={g.id} onClick={() => selectGroup(g.id)} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', sel === g.id ? 'border-indigo-400 bg-indigo-50' : 'border-[var(--border)] hover:bg-slate-50')}>
                    <span className="h-9 w-1.5 flex-shrink-0 rounded-full" style={{ background: g.color || '#6366f1' }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{g.name}</div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[var(--text-dim)]">
                        <span className="inline-flex items-center gap-1"><FileText size={11} /> {num(g.landing_page_count)}</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600"><Users size={11} /> {num(g.applicant_count)}</span>
                      </div>
                    </div>
                    <span onClick={(e) => { e.stopPropagation(); removeGroup(g.id) }} className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></span>
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* 페이지 */}
        <Panel title={selGroup ? `"${selGroup.name}" 랜딩페이지` : '랜딩페이지'}>
          {sel == null ? (
            <div className="py-14 text-center text-sm text-[var(--text-dim)]">왼쪽에서 퍼널 그룹을 선택하거나 새로 만드세요.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-slate-50 p-4">
                <div className="mb-2 text-xs font-bold text-[var(--text-dim)]">새 랜딩페이지</div>
                <div className="space-y-2">
                  <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="페이지 제목 (예: 무료 체험 신청)" className="input w-full" />
                  <input value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="소개 문구 (선택)" className="input w-full" />
                  <button onClick={addPage} disabled={pCreating} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
                    {pCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 페이지 생성 (이름·연락처·이메일 폼 기본 포함)
                  </button>
                </div>
              </div>

              {msg && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{msg}</div>}

              {pagesLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-dim)]"><Loader2 size={15} className="animate-spin" /> 불러오는 중…</div>
              ) : pages.length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--text-dim)]">아직 랜딩페이지가 없습니다. 위에서 만들어 보세요.</div>
              ) : (
                <div className="space-y-2">
                  {pages.map((p) => (
                    <div key={p.id} className="rounded-xl border border-[var(--border)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold">{p.title}</div>
                          <div className="truncate text-xs text-[var(--text-dim)]">{p.description}</div>
                        </div>
                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><Users size={11} /> 신청 {num(p.applicant_count)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{p.url}</code>
                        <button onClick={() => copyUrl(p.url)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-soft)] hover:bg-slate-50">
                          {copied === p.url ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />} 복사
                        </button>
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-soft)] hover:bg-slate-50"><ExternalLink size={12} /> 열기</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/60 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-500"><Icon size={18} /></span>
      <div><div className={cn('text-xl font-extrabold leading-none', accent)}>{value}</div><div className="mt-1 text-xs font-semibold text-[var(--text-dim)]">{label}</div></div>
    </div>
  )
}
