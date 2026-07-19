'use client'

import { useEffect, useState } from 'react'
import { Gauge, RefreshCw, ExternalLink, Pencil, Check, X, CreditCard } from 'lucide-react'
import { adminApiBalance, adminApiBalanceSet, type ApiProviderBalance } from '@/lib/auth'
import { cn } from '@/lib/utils'

const won = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR')

/** 관리자 사이드바 — AI API 제공사별 남은 한도(잔액) + 각 API 충전 사이트 바로가기 */
export function ApiQuotaWidget() {
  const [rows, setRows] = useState<ApiProviderBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const [bal, setBal] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  function load() {
    setLoading(true)
    adminApiBalance().then((r) => { setRows(r.providers || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  function startEdit(p: ApiProviderBalance) {
    setEdit(p.id); setBal(p.balance == null ? '' : String(p.balance)); setUrl(p.url || '')
  }
  async function saveEdit(id: string) {
    setBusy(true)
    const r = await adminApiBalanceSet(id, bal.trim() === '' ? null : Number(bal), url.trim() || undefined)
    setBusy(false)
    if (r.ok) { setEdit(null); load() }
  }

  return (
    <div className="border-t border-[var(--border)] px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
          <Gauge size={12} className="text-cyan-500" /> AI API 남은 한도
        </p>
        <button onClick={load} className="text-[var(--text-dim)] hover:text-violet-600" aria-label="새로고침">
          <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto no-scrollbar">
        {rows.map((p) => (
          <div key={p.id} className="rounded-lg border border-[var(--border-soft)] bg-slate-50 px-2 py-1.5">
            {edit === p.id ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--text)]">{p.name}</div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[var(--text-dim)]">₩</span>
                  <input value={bal} onChange={(e) => setBal(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="잔액"
                    className="w-full rounded-md border border-[var(--border-soft)] bg-white px-1.5 py-1 text-right text-[11px]" />
                </div>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="충전 URL"
                  className="w-full rounded-md border border-[var(--border-soft)] bg-white px-1.5 py-1 text-[10px]" />
                <div className="flex justify-end gap-1">
                  <button onClick={() => setEdit(null)} className="grid h-6 w-6 place-items-center rounded-md bg-slate-200 text-slate-600"><X size={12} /></button>
                  <button onClick={() => saveEdit(p.id)} disabled={busy} className="grid h-6 w-6 place-items-center rounded-md bg-violet-600 text-white disabled:opacity-50"><Check size={12} /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-[var(--text)]">{p.name}</div>
                  <div className={cn('text-[11px] font-bold', p.balance == null ? 'text-[var(--text-dim)]' : p.balance <= 0 ? 'text-rose-500' : p.balance < 10000 ? 'text-amber-600' : 'text-emerald-600')}>
                    {p.balance == null ? '미입력' : won(p.balance)}
                  </div>
                </div>
                <button onClick={() => startEdit(p)} className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-[var(--text-dim)] hover:bg-slate-200 hover:text-violet-600" aria-label="편집">
                  <Pencil size={11} />
                </button>
                <a href={p.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 px-1.5 py-1 text-[10px] font-bold text-white hover:brightness-110"
                  title={`${p.name} 충전 사이트로 이동`}>
                  <CreditCard size={10} /> 충전 <ExternalLink size={9} />
                </a>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="py-3 text-center text-[10px] text-[var(--text-dim)]">{loading ? '불러오는 중…' : '데이터 없음'}</div>
        )}
      </div>
      <p className="mt-1.5 text-[9px] leading-tight text-[var(--text-dim)]">잔액은 각 제공사 대시보드에서 확인 후 입력합니다. 충전 버튼은 해당 API 결제 페이지로 바로 이동합니다.</p>
    </div>
  )
}
