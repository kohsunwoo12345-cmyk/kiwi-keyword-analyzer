'use client'

import { useEffect, useState } from 'react'
import { Gauge, RefreshCw, ExternalLink, Pencil, Check, X, CreditCard, Wifi, WifiOff } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { adminApiBalance, adminApiBalanceSet, type ApiProviderBalance } from '@/lib/auth'
import { cn } from '@/lib/utils'

function fmtBalance(p: ApiProviderBalance): string {
  if (p.balance == null) return '미입력'
  const n = p.balance
  if (p.unit === 'USD') return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const v = Math.round(n).toLocaleString('ko-KR')
  return p.unit === '문자' ? `${v} 문자`
    : p.unit === '크레딧' ? `${v} 크레딧`
    : `₩${v}`
}

const kst = (iso: string) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function ApiQuotaPage() {
  const [rows, setRows] = useState<ApiProviderBalance[]>([])
  const [fetchedAt, setFetchedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const [bal, setBal] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => { setLoading(true); adminApiBalance().then((r) => { setRows(r.providers || []); setFetchedAt(r.fetchedAt || ''); setLoading(false) }) }
  useEffect(() => { load(); const iv = setInterval(load, 120000); return () => clearInterval(iv) }, [])

  function startEdit(p: ApiProviderBalance) { setEdit(p.id); setBal(p.balance == null ? '' : String(p.balance)); setUrl(p.url || '') }
  async function saveEdit(id: string) {
    setBusy(true)
    const r = await adminApiBalanceSet(id, bal.trim() === '' ? null : Number(bal), url.trim() || undefined)
    setBusy(false)
    if (r.ok) { setEdit(null); load() }
  }

  const liveCount = rows.filter((r) => r.source === 'live').length

  return (
    <div>
      <PageHeader icon={Gauge} title="AI API 남은 한도"
        description="각 AI 제공사의 잔여 한도를 표시합니다. 지원 제공사(Runway·Luma·ElevenLabs)는 API 로 실시간 조회하고, 그 외는 대시보드에서 확인 후 입력합니다." />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-[var(--text-dim)]">
          {liveCount > 0 && <span className="mr-2 inline-flex items-center gap-1 text-emerald-600"><Wifi size={12} /> 실시간 {liveCount}곳</span>}
          {fetchedAt && <>업데이트 {kst(fetchedAt)} · 2분마다 자동 새로고침</>}
        </p>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-soft)] hover:bg-slate-100">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <Panel key={p.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{p.name}</span>
                  {p.source === 'live' ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"><Wifi size={9} /> 실시간</span>
                  ) : p.supportsLive ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700"><WifiOff size={9} /> 조회실패</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">수동</span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-dim)]">{p.note}</div>
              </div>
              <button onClick={() => startEdit(p)} className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[var(--text-dim)] hover:bg-slate-100 hover:text-violet-600" title="수동 입력/URL 편집">
                <Pencil size={13} />
              </button>
            </div>

            {edit === p.id ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[var(--text-dim)]">잔액</span>
                  <input value={bal} onChange={(e) => setBal(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="숫자"
                    className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-2 py-1.5 text-right text-sm" />
                </div>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="충전 URL"
                  className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-2 py-1.5 text-xs" />
                <div className="flex justify-end gap-1.5">
                  <button onClick={() => setEdit(null)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-200 text-slate-600"><X size={14} /></button>
                  <button onClick={() => saveEdit(p.id)} disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white disabled:opacity-50"><Check size={14} /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-3 flex items-end justify-between">
                  <div className={cn('text-2xl font-extrabold', p.balance == null ? 'text-[var(--text-dim)]' : p.balance <= 0 ? 'text-rose-500' : p.source === 'live' ? 'text-emerald-600' : 'text-[var(--text)]')}>
                    {fmtBalance(p)}
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:brightness-110">
                    <CreditCard size={12} /> 충전 <ExternalLink size={10} />
                  </a>
                </div>
                <div className="mt-2 border-t border-[var(--border-soft)] pt-1.5 text-[10px] text-[var(--text-dim)]">
                  {p.keyConfigured ? 'API 키 연결됨' : 'API 키 미설정'}
                  {p.fetchError && <span className="text-amber-600"> · 조회 오류: {p.fetchError}</span>}
                  {!p.supportsLive && !p.fetchError && <span> · 이 제공사는 잔액 API 미지원 (수동 입력)</span>}
                </div>
              </>
            )}
          </Panel>
        ))}
        {rows.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '데이터 없음'}</div>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--text-dim)]">
        · <b>실시간</b>: 서버가 환경변수 API 키로 각 제공사 잔액을 직접 조회합니다(Runway=크레딧, Luma=USD, ElevenLabs=문자 잔여).<br />
        · <b>수동</b>: 공개 잔액 API 가 없는 제공사(Google·fal·OpenAI·Kling 등)는 대시보드에서 확인 후 ✏️ 로 입력하면 표시됩니다.<br />
        · 조회에 실패하면 API 키·권한을 확인하세요. 충전 버튼을 누르면 각 제공사 결제 페이지로 이동합니다.
      </p>
    </div>
  )
}
