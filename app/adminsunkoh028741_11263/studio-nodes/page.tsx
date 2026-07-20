'use client'

import { useEffect, useMemo, useState } from 'react'
import { Boxes, RefreshCw, Search, ExternalLink, X, Layers, Activity, Coins, FileText, Loader2, Cpu } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { adminStudioNodes, adminStudioNodeDetail, type StudioUserRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

const STUDIO_URL = '/studio-nvc-prv-8b3k2/'
const kst = (iso?: string | null) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
const num = (n: number) => (n || 0).toLocaleString('ko-KR')
type Tab = 'nodes' | 'activity' | 'credits'

export default function StudioNodesPage() {
  const [users, setUsers] = useState<StudioUserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof adminStudioNodeDetail>> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('nodes')

  const load = () => { setLoading(true); adminStudioNodes().then((d) => { setUsers(d.users); setLoading(false) }) }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return users
    return users.filter((u) => (u.name + ' ' + u.email + ' ' + u.userId).toLowerCase().includes(s))
  }, [users, q])

  function openDetail(uid: string) {
    setOpenId(uid); setDetail(null); setDetailLoading(true); setTab('nodes')
    adminStudioNodeDetail(uid).then((d) => { setDetail(d); setDetailLoading(false) })
  }

  return (
    <div>
      <PageHeader icon={Boxes} eyebrow="STUDIO" title="노드 관리" desc="모든 사용자의 노드 스튜디오(워크플로우)를 조회하고, 불러와 편집·대신 저장할 수 있습니다. 활동 기록과 크레딧 사용까지 한국시간으로 확인하세요." />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·이메일·ID 검색" className="input w-full pl-9" />
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-soft)] hover:bg-slate-50">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침
        </button>
      </div>

      <Panel title={`워크플로우 보유 사용자 ${users.length}명`}>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '저장된 워크플로우가 없습니다.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--text-dim)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-3 py-2 text-left font-semibold">회원</th>
                  <th className="px-3 py-2 text-left font-semibold">이메일</th>
                  <th className="px-3 py-2 text-right font-semibold">노드</th>
                  <th className="px-3 py-2 text-right font-semibold">탭</th>
                  <th className="px-3 py-2 text-right font-semibold">누적 크레딧</th>
                  <th className="px-3 py-2 text-right font-semibold">생성</th>
                  <th className="px-3 py-2 text-right font-semibold">최근 저장(KST)</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.userId} className="border-b border-[var(--border)] hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-semibold">{u.name}</td>
                    <td className="px-3 py-2.5 text-[var(--text-dim)]">{u.email}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{num(u.nodeCount)}</td>
                    <td className="px-3 py-2.5 text-right text-[var(--text-soft)]">{num(u.docCount)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{num(u.creditsUsed)}</td>
                    <td className="px-3 py-2.5 text-right text-[var(--text-soft)]">{num(u.genCount)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-[var(--text-dim)]">{kst(u.updatedAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => openDetail(u.userId)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">상세</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* 상세 모달 */}
      {openId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenId(null)}>
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
              <div className="flex items-center gap-2 font-bold">
                <Boxes size={16} /> {detail?.user?.name || '노드 상세'}
                <span className="text-xs font-normal text-[var(--text-dim)]">{detail?.user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={`${STUDIO_URL}?loadWorkflow=${encodeURIComponent(openId)}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
                  <ExternalLink size={13} /> 워크플로우 불러오기
                </a>
                <button onClick={() => setOpenId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
              </div>
            </div>

            {/* 요약 */}
            <div className="grid grid-cols-2 gap-2 border-b border-[var(--border)] px-5 py-3 sm:grid-cols-4">
              <Stat icon={Layers} label="노드" value={num(detail?.nodeCount || 0)} />
              <Stat icon={FileText} label="워크플로우 탭" value={num(detail?.docCount || 0)} />
              <Stat icon={Coins} label="누적 크레딧" value={num(detail?.creditSum || 0)} accent="text-amber-600" />
              <Stat icon={Activity} label="생성 횟수" value={num(detail?.genCount || 0)} />
            </div>

            {/* 탭 */}
            <div className="flex gap-1.5 border-b border-[var(--border)] px-5 py-2.5">
              {([['nodes', '노드 목록'], ['activity', '활동 기록'], ['credits', '크레딧 사용']] as [Tab, string][]).map(([t, l]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{l}</button>
              ))}
            </div>

            <div className="min-h-[240px] flex-1 overflow-y-auto px-5 py-4">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-dim)]"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
              ) : tab === 'nodes' ? (
                <div className="space-y-4">
                  {(detail?.docs || []).map((doc) => (
                    <div key={doc.id}>
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold"><FileText size={14} /> {doc.name} <span className="text-xs font-normal text-[var(--text-dim)]">노드 {doc.nodes.length} · 연결 {doc.links}</span></div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {doc.nodes.map((n) => (
                          <div key={n.id} className={cn('rounded-lg border border-[var(--border)] px-3 py-2 text-xs', n.bypass && 'opacity-50')}>
                            <div className="flex items-center gap-1.5 font-semibold"><Cpu size={12} className="text-indigo-500" /> {n.title || n.type} <span className="text-[10px] font-normal text-[var(--text-dim)]">{n.type}</span></div>
                            {n.model && <div className="mt-0.5 text-[var(--text-soft)]">모델: {n.model}{n.sec ? ` · ${n.sec}초` : ''}{n.res ? ` · ${n.res}` : ''}{n.ratio ? ` · ${n.ratio}` : ''}</div>}
                            {n.prompt && <div className="mt-0.5 line-clamp-2 text-[var(--text-dim)]">“{n.prompt}”</div>}
                            {(n.imgs || n.vids) ? <div className="mt-0.5 text-[var(--text-dim)]">{n.imgs ? `이미지 ${n.imgs}` : ''}{n.vids ? ` 영상 ${n.vids}` : ''}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!detail?.docs || detail.docs.length === 0) && <div className="py-10 text-center text-sm text-[var(--text-dim)]">노드가 없습니다.</div>}
                </div>
              ) : tab === 'activity' ? (
                <table className="w-full text-xs">
                  <thead className="text-[var(--text-dim)]"><tr className="border-b border-[var(--border)]"><th className="px-2 py-1.5 text-left font-semibold">시각(KST)</th><th className="px-2 py-1.5 text-left font-semibold">동작</th><th className="px-2 py-1.5 text-left font-semibold">노드</th><th className="px-2 py-1.5 text-left font-semibold">상세</th><th className="px-2 py-1.5 text-left font-semibold">모델</th></tr></thead>
                  <tbody>
                    {(detail?.activity || []).map((a, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="px-2 py-1.5 text-[var(--text-dim)]">{kst(a.created_at)}</td>
                        <td className="px-2 py-1.5"><span className={cn('rounded px-1.5 py-0.5 font-semibold', a.action === 'generate' ? 'bg-emerald-50 text-emerald-700' : a.action === 'node_add' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}>{a.action}</span></td>
                        <td className="px-2 py-1.5 text-[var(--text-soft)]">{a.node_type}</td>
                        <td className="px-2 py-1.5 text-[var(--text-dim)]">{a.detail}</td>
                        <td className="px-2 py-1.5 text-[var(--text-dim)]">{a.model}</td>
                      </tr>
                    ))}
                    {(!detail?.activity || detail.activity.length === 0) && <tr><td colSpan={5} className="py-10 text-center text-[var(--text-dim)]">활동 기록이 없습니다.</td></tr>}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-[var(--text-dim)]"><tr className="border-b border-[var(--border)]"><th className="px-2 py-1.5 text-left font-semibold">시각(KST)</th><th className="px-2 py-1.5 text-left font-semibold">모델</th><th className="px-2 py-1.5 text-left font-semibold">종류</th><th className="px-2 py-1.5 text-right font-semibold">크레딧</th><th className="px-2 py-1.5 text-left font-semibold">프롬프트</th></tr></thead>
                  <tbody>
                    {(detail?.usage || []).map((u, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="px-2 py-1.5 text-[var(--text-dim)]">{kst(u.created_at)}</td>
                        <td className="px-2 py-1.5 font-semibold">{u.model}</td>
                        <td className="px-2 py-1.5 text-[var(--text-soft)]">{u.kind === 'image' ? '이미지' : '영상'}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-amber-600">{num(u.credits)}</td>
                        <td className="px-2 py-1.5 line-clamp-1 text-[var(--text-dim)]">{u.prompt}</td>
                      </tr>
                    ))}
                    {(!detail?.usage || detail.usage.length === 0) && <tr><td colSpan={5} className="py-10 text-center text-[var(--text-dim)]">크레딧 사용 내역이 없습니다.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Layers; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-indigo-500 shadow-sm"><Icon size={15} /></span>
      <div>
        <div className={cn('text-base font-extrabold leading-none', accent)}>{value}</div>
        <div className="mt-0.5 text-[10px] font-semibold text-[var(--text-dim)]">{label}</div>
      </div>
    </div>
  )
}
