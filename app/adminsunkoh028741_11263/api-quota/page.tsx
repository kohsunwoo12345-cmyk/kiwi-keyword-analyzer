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

  const connectedCount = rows.filter((r) => r.connected).length
  const liveCount = rows.filter((r) => r.source === 'live').length

  return (
    <div>
      <PageHeader icon={Gauge} title="AI API 남은 한도"
        description="각 AI 제공사의 연동 상태와 잔여 한도를 표시합니다. 키가 설정되면 연동됨으로 확인하고, 잔액 API 를 제공하는 곳(Runway·Luma·ElevenLabs)은 실시간 잔액까지 조회합니다." />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-[var(--text-dim)]">
          {rows.length > 0 && <span className="mr-2 inline-flex items-center gap-1 font-semibold text-emerald-600"><Wifi size={12} /> 연동 {connectedCount}/{rows.length}곳</span>}
          {liveCount > 0 && <span className="mr-2 text-[var(--text-dim)]">· 실시간 잔액 {liveCount}곳</span>}
          {fetchedAt && <>· 업데이트 {kst(fetchedAt)} · 2분마다 자동 새로고침</>}
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
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{p.name}</span>
                  {p.connected ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"><Wifi size={9} /> 연동됨{p.verified ? '·검증' : ''}</span>
                  ) : p.keyConfigured ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700"><WifiOff size={9} /> 키 오류</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500"><WifiOff size={9} /> 키 없음</span>
                  )}
                  {p.source === 'live' && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">잔액 실시간</span>}
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
                  <div>
                    {p.source === 'live' ? (
                      <div className={cn('text-2xl font-extrabold', p.balance == null ? 'text-[var(--text-dim)]' : p.balance <= 0 ? 'text-rose-500' : 'text-emerald-600')}>{fmtBalance(p)}</div>
                    ) : p.remainEstUsd != null ? (
                      <>
                        <div className={cn('text-2xl font-extrabold', p.remainEstUsd <= 0 ? 'text-rose-500' : 'text-[var(--text)]')}>~${p.remainEstUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-[var(--text-dim)]">추정 남음 (기준 −소비 ${(p.spentSinceUsd || 0).toFixed(2)})</div>
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-extrabold text-[var(--text)]">${p.spentUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-[var(--text-dim)]">누적 소비 · {p.genCount.toLocaleString('ko-KR')}건</div>
                      </>
                    )}
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:brightness-110">
                    <CreditCard size={12} /> 충전 <ExternalLink size={10} />
                  </a>
                </div>
                <div className="mt-2 border-t border-[var(--border-soft)] pt-1.5 text-[10px] text-[var(--text-dim)]">
                  {!p.keyConfigured ? <span className="text-rose-600">환경변수에 API 키를 설정하세요</span>
                    : p.fetchError ? <span className="text-rose-600">키 오류: {p.fetchError} · 키·권한 확인</span>
                    : p.source === 'live' ? `API 실시간 잔액 · 최근30일 소비 $${p.spent30Usd.toFixed(2)}`
                    : `이 앱 소비: 최근30일 $${p.spent30Usd.toFixed(2)} · 누적 $${p.spentUsd.toFixed(2)}${p.remainEstUsd == null ? ' · ✏️로 기준잔액 입력 시 남음 추정' : ''}`}
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
        · <b>연동됨</b>: 환경변수에 API 키가 설정된 제공사. 가능한 경우 실제 API 를 호출해 <b>검증</b>까지 표시합니다(OpenAI·xAI·Google·Runway·Luma·ElevenLabs).<br />
        · <b>잔액 실시간</b>: 잔액 조회 API 를 제공하는 곳만 자동 표시(Runway=크레딧, Luma=USD, ElevenLabs=문자 잔여). 그 외 제공사는 각사가 잔액 API 를 제공하지 않아 ✏️ 로 수동 입력합니다.<br />
        · <b>키 오류</b>는 잘못된 키·권한 문제, <b>키 없음</b>은 환경변수 미설정입니다. 충전 버튼은 각사 결제 페이지로 이동합니다.
      </p>
    </div>
  )
}
