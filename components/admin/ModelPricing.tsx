'use client'

import { useEffect, useMemo, useState } from 'react'
import { Gauge, Search, X, RefreshCw, Save, Layers, Users2, Globe } from 'lucide-react'
import { Panel, Button, Badge } from '@/components/ui'
import {
  adminModelPricing,
  adminModelPricingAction,
  adminSettlementUsers,
  type AdminModelPricing,
  type SettlementUser,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const r2 = (n: number) => Math.round((n || 0) * 100) / 100

/** 각 AI 모델별 크레딧 차감 배수 — 전체(전역) / 특정 회원 단위로 조절 */
export function ModelPricing() {
  const [scope, setScope] = useState<'global' | 'user'>('global')
  const [user, setUser] = useState<SettlementUser | null>(null)
  const [data, setData] = useState<AdminModelPricing>({ ok: false })
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [bulk, setBulk] = useState('3')
  const [toast, setToast] = useState<string | null>(null)

  const activeUserId = scope === 'user' && user ? user.id : ''

  function reload() {
    setLoading(true)
    adminModelPricing(activeUserId).then((r) => {
      setData(r)
      setLoading(false)
      const e: Record<string, string> = {}
      for (const m of r.models || []) e[m.model] = String(scope === 'user' ? (m.userMarkup || m.effectiveMarkup) : (m.globalMarkup || m.effectiveMarkup))
      setEdits(e)
    })
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [scope, activeUserId])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t) }, [toast])

  async function act(action: Parameters<typeof adminModelPricingAction>[0], payload: Record<string, unknown>, msg: string) {
    setBusy(true)
    const r = await adminModelPricingAction(action, payload)
    setBusy(false)
    if (r.ok) { setToast(msg); reload() } else setToast(r.error || '처리 실패')
  }

  const models = data.models || []
  const grouped = useMemo(() => {
    const g: Record<string, typeof models> = {}
    for (const m of models) { (g[m.kind === 'image' ? '이미지' : '영상'] ||= []).push(m) }
    return g
  }, [models])

  return (
    <Panel
      title={<span className="flex items-center gap-2"><Gauge size={16} className="text-violet-500" /> AI 모델별 과금 배수</span>}
      action={<Button variant="outline" size="sm" onClick={reload}><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침</Button>}
    >
      <p className="mb-3 text-sm text-[var(--text-soft)]">
        각 AI 모델의 <b>크레딧 차감 배수</b>를 조절합니다. 실제 원가(API비용×환율) × 배수 ÷ {data.creditKrw || 50}원 = 차감 크레딧.
        우선순위: <b>회원×모델 &gt; 회원 전체 배수 &gt; 전역 모델 배수 &gt; 기본값</b>.
      </p>

      {/* 적용 대상 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-[var(--border-soft)] p-0.5">
          <button onClick={() => setScope('global')} className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold', scope === 'global' ? 'bg-violet-600 text-white' : 'text-[var(--text-soft)]')}><Globe size={14} /> 전체 적용</button>
          <button onClick={() => setScope('user')} className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold', scope === 'user' ? 'bg-violet-600 text-white' : 'text-[var(--text-soft)]')}><Users2 size={14} /> 특정 회원</button>
        </div>
        {scope === 'user' && (user ? (
          <span className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm">
            <b>{user.name}</b><span className="text-xs text-[var(--text-soft)]">{user.email}</span>
            <button onClick={() => setUser(null)} className="text-[var(--text-dim)] hover:text-rose-500"><X size={14} /></button>
          </span>
        ) : (
          <UserPicker onPick={setUser} />
        ))}
      </div>

      {scope === 'user' && !user ? (
        <p className="py-8 text-center text-sm text-[var(--text-dim)]">회원을 검색해 선택하면 그 회원의 모델별 배수를 조절할 수 있습니다.</p>
      ) : (
        <>
          {/* 일괄 적용 */}
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border-soft)] bg-slate-50 p-3">
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-dim)]">모든 모델 배수 일괄</label>
              <input value={bulk} onChange={(e) => setBulk(e.target.value.replace(/[^0-9.]/g, ''))} className="w-24 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm" />
            </div>
            <Button size="sm" disabled={busy} onClick={() => act(scope === 'user' ? 'set_user_all' : 'set_global_all', scope === 'user' ? { userId: activeUserId, markup: Number(bulk) } : { markup: Number(bulk) }, `모든 모델을 ×${r2(Number(bulk))} 로 적용했습니다.`)}>
              <Layers size={14} /> 전체 모델 ×{r2(Number(bulk) || 0)} 적용
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act(scope === 'user' ? 'reset_user' : 'reset_global_all', scope === 'user' ? { userId: activeUserId } : {}, '기본 배수로 초기화했습니다.')}>기본값으로 초기화</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                  <th className="px-2 py-2 font-medium">모델</th>
                  <th className="px-2 py-2 font-medium">제공사</th>
                  <th className="px-2 py-2 font-medium">원가(×1)</th>
                  <th className="px-2 py-2 font-medium">배수</th>
                  <th className="px-2 py-2 font-medium">적용 크레딧</th>
                  <th className="px-2 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([cat, list]) => (
                  <FragmentRows key={cat} cat={cat} list={list} edits={edits} setEdits={setEdits} busy={busy} scope={scope} activeUserId={activeUserId} act={act} />
                ))}
                {models.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[var(--text-dim)]">{loading ? '불러오는 중…' : '모델이 없습니다.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {toast && <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-violet-200 bg-violet-100 px-4 py-3 text-sm font-medium text-violet-700 shadow-lg">{toast}</div>}
    </Panel>
  )
}

function FragmentRows({ cat, list, edits, setEdits, busy, scope, activeUserId, act }: any) {
  return (
    <>
      <tr><td colSpan={6} className="px-2 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-violet-500">{cat}</td></tr>
      {list.map((m: any) => {
        const val = edits[m.model] ?? String(m.effectiveMarkup)
        const eff = Math.max(1, Number(val) || 1)
        const credits = r2(m.baseCredits * eff)
        const overridden = scope === 'user' ? m.userMarkup > 0 : m.globalMarkup > 0
        return (
          <tr key={m.model} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
            <td className="px-2 py-2 font-medium">{m.model}</td>
            <td className="px-2 py-2"><Badge className="border-slate-200 bg-slate-50 text-slate-600">{m.provider}</Badge></td>
            <td className="px-2 py-2 text-[var(--text-soft)]">{r2(m.baseCredits)} 크레딧</td>
            <td className="px-2 py-2">
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-dim)]">×</span>
                <input value={val} onChange={(e) => setEdits((p: any) => ({ ...p, [m.model]: e.target.value.replace(/[^0-9.]/g, '') }))} className="w-16 rounded-lg border border-[var(--border-soft)] bg-white px-2 py-1.5 text-right text-sm" />
                {!overridden && <span className="text-[10px] text-[var(--text-dim)]">기본</span>}
              </div>
            </td>
            <td className="px-2 py-2 font-semibold text-violet-600">{credits} 크레딧</td>
            <td className="px-2 py-2 text-right">
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(scope === 'user' ? 'set_user' : 'set_global', scope === 'user' ? { userId: activeUserId, model: m.model, markup: Number(val) } : { model: m.model, markup: Number(val) }, `${m.model} ×${r2(eff)} 적용`)}>
                  <Save size={13} />
                </Button>
                {overridden && <button className="rounded-lg px-2 py-1 text-xs text-[var(--text-dim)] hover:text-rose-500" disabled={busy} onClick={() => act(scope === 'user' ? 'reset_user' : 'reset_global', scope === 'user' ? { userId: activeUserId, model: m.model } : { model: m.model }, '기본값으로 초기화')}>초기화</button>}
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}

function UserPicker({ onPick }: { onPick: (u: SettlementUser) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [res, setRes] = useState<SettlementUser[]>([])
  const [searching, setSearching] = useState(false)
  useEffect(() => {
    if (!open) return
    let alive = true; setSearching(true)
    const t = setTimeout(() => { adminSettlementUsers(q).then((r) => { if (alive) { setRes(r.users || []); setSearching(false) } }) }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [q, open])
  return (
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 180)} placeholder="회원 이름·이메일 검색" className="w-56 rounded-lg border border-[var(--border-soft)] bg-white py-2 pl-8 pr-3 text-sm" />
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-72 overflow-y-auto rounded-xl border border-[var(--border-soft)] bg-white p-1 shadow-lg">
          {searching && <div className="px-3 py-2 text-xs text-[var(--text-dim)]">검색 중…</div>}
          {!searching && res.length === 0 && <div className="px-3 py-2 text-xs text-[var(--text-dim)]">결과 없음</div>}
          {res.map((u) => (
            <button key={u.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(u); setOpen(false); setQ('') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
              <span className="font-medium">{u.name}</span><span className="text-xs text-[var(--text-soft)]">{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
