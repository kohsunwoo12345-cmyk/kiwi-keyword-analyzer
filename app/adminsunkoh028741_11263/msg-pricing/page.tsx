'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Coins, Check, Loader2, Search, RotateCcw, UserCog, Trash2, RefreshCw, Info, X } from 'lucide-react'
import { MktCanvas, MktHeader, MktPanel, MktButton } from '@/components/marketing/node'
import { cn } from '@/lib/utils'
import {
  RATE_KINDS, SOURCE_LABEL, previewCharge, loadRates, saveGlobalRates, saveMemberRate, clearMemberRate,
  type MsgKind, type OverrideRow, type MemberRow, type RatesResponse,
} from '@/lib/msgrates'

const kst = (iso?: string) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

export default function MsgPricingPage() {
  const [d, setD] = useState<RatesResponse>({ ok: false })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // 전체 기본
  const [base, setBase] = useState<Record<string, string>>({})
  const [mult, setMult] = useState('2')
  const [busy, setBusy] = useState('')

  // 회원별
  const [q, setQ] = useState('')
  const [found, setFound] = useState<MemberRow[]>([])
  const [target, setTarget] = useState<MemberRow | null>(null)
  const [mMult, setMMult] = useState('')
  const [mFixed, setMFixed] = useState<Record<string, string>>({})
  const [mMemo, setMMemo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await loadRates({ list: true })
    setD(r)
    if (r.ok) {
      const b: Record<string, string> = {}
      for (const [k] of RATE_KINDS) b[k] = String(r.base?.[k] ?? '')
      setBase(b)
      setMult(String(r.multiplier ?? 2))
    } else if (r.error) setMsg({ ok: false, text: r.error })
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const globalCharge = d.charge || ({} as Record<MsgKind, number>)
  const overrides = d.overrides || []

  async function saveGlobal() {
    setBusy('global'); setMsg(null)
    const payload: Record<string, number> = {}
    for (const [k] of RATE_KINDS) payload[k] = Number(base[k])
    const r = await saveGlobalRates(payload, Number(mult))
    setBusy('')
    setMsg(r.ok ? { ok: true, text: '전체 기본 단가를 저장했습니다. 다음 발송부터 이 단가로 청구됩니다.' } : { ok: false, text: r.error || '저장 실패' })
    load()
  }

  function resetGlobal() {
    const df = d.defaults
    if (!df) return
    const b: Record<string, string> = {}
    for (const [k] of RATE_KINDS) b[k] = String(df.base[k])
    setBase(b); setMult(String(df.multiplier))
  }

  async function search() {
    if (!q.trim()) { setFound([]); return }
    setBusy('search')
    const r = await loadRates({ q: q.trim() })
    setBusy('')
    setFound(r.found || [])
  }

  async function pick(u: MemberRow) {
    setBusy('pick'); setMsg(null)
    const r = await loadRates({ userId: u.userId })
    setBusy('')
    const ov = r.member?.override || null
    setTarget(r.member ? { userId: r.member.userId, name: r.member.name, email: r.member.email, plan: r.member.plan, points: r.member.points } : u)
    setMMult(ov?.multiplier != null ? String(ov.multiplier) : '')
    const f: Record<string, string> = {}
    for (const [k] of RATE_KINDS) f[k] = ov?.charge?.[k] != null ? String(ov.charge[k]) : ''
    setMFixed(f)
    setMMemo(ov?.memo || '')
    setFound([])
    setQ('')
  }

  async function saveMember() {
    if (!target) return
    setBusy('member'); setMsg(null)
    const charge: Partial<Record<MsgKind, number>> = {}
    for (const [k] of RATE_KINDS) { const v = Number(mFixed[k]); if (Number.isFinite(v) && v >= 1) charge[k] = Math.round(v) }
    const r = await saveMemberRate(target.userId, {
      multiplier: mMult.trim() === '' ? null : Number(mMult),
      charge,
      memo: mMemo,
    })
    setBusy('')
    if (!r.ok) { setMsg({ ok: false, text: r.error || '저장 실패' }); return }
    setMsg({
      ok: true,
      text: r.override
        ? `${target.name || target.email} 회원의 개별 단가를 저장했습니다.`
        : `${target.name || target.email} 회원의 개별 단가를 해제했습니다. (전체 기본 적용)`,
    })
    load()
  }

  async function removeOverride(row: OverrideRow) {
    if (!confirm(`${row.name || row.email} 회원의 개별 단가를 해제할까요? 전체 기본 단가가 적용됩니다.`)) return
    setBusy(row.userId)
    const r = await clearMemberRate(row.userId)
    setBusy('')
    setMsg(r.ok ? { ok: true, text: '개별 단가를 해제했습니다.' } : { ok: false, text: r.error || '해제 실패' })
    if (target?.userId === row.userId) { setMMult(''); setMFixed({}); setMMemo('') }
    load()
  }

  // 편집 중인 회원에게 실제로 적용될 단가 미리보기 (서버 우선순위와 같은 규칙)
  const memberPreview = useMemo(() => {
    const out: Record<string, { v: number | null; src: string }> = {}
    for (const [k] of RATE_KINDS) {
      const fixed = Number(mFixed[k])
      if (Number.isFinite(fixed) && fixed >= 1) { out[k] = { v: Math.round(fixed), src: 'member-fixed' }; continue }
      if (mMult.trim() !== '') { out[k] = { v: previewCharge(d.base?.[k] ?? 0, mMult), src: 'member-multiplier' }; continue }
      out[k] = { v: globalCharge[k] ?? null, src: 'global' }
    }
    return out
  }, [mFixed, mMult, d.base, globalCharge])

  return (
    <MktCanvas>
      <MktHeader
        icon={Coins}
        eyebrow="MESSAGE PRICING"
        title="문자·알림톡 단가"
        desc="전체 기본 단가와 회원별 단가를 한 곳에서 정합니다. 문자·알림톡 비용은 크레딧이 아니라 포인트에서 나가며 1P = 1원 기준입니다. 저장하면 다음 발송(예약 발송 포함)부터 바로 적용됩니다."
      />

      {msg && (
        <div className={cn('mb-4 rounded-lg px-3 py-2 text-sm font-semibold',
          msg.ok ? 'bg-[#10b981]/12 text-[#059669]' : 'bg-[#ff9b9b]/12 text-[#e11d48]')}>{msg.text}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── 전체 기본 ── */}
        <MktPanel
          icon={Coins}
          title="전체 기본 단가"
          action={
            <button onClick={load} className="text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]">
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            </button>
          }
        >
          <p className="mb-3 text-xs text-[var(--mkt-text-soft)]">
            알리고 기준 단가 × 배수 = 회원 청구 포인트. 개별 단가가 걸린 회원을 제외한 <b>모든 회원</b>에게 적용됩니다.
          </p>
          <div className="mb-3 flex items-center gap-2">
            <label className="text-sm font-semibold text-[var(--mkt-text-soft)]">청구 배수</label>
            <input value={mult} onChange={(e) => setMult(e.target.value)} type="number" min={0.1} step={0.1} className="input w-24" data-f="global-mult" />
            <span className="text-xs text-[var(--mkt-text-soft)]">배</span>
            <button onClick={resetGlobal} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]">
              <RotateCcw size={11} /> 초기값
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--mkt-text-soft)]">
                  <th className="py-2 font-semibold">구분</th>
                  <th className="py-2 font-semibold">알리고 기준 단가(원)</th>
                  <th className="py-2 text-right font-semibold">회원 청구</th>
                </tr>
              </thead>
              <tbody>
                {RATE_KINDS.map(([k, label]) => {
                  const p = previewCharge(base[k] ?? '', mult)
                  const changed = p != null && globalCharge[k] != null && p !== globalCharge[k]
                  return (
                    <tr key={k} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 font-semibold">{label}</td>
                      <td className="py-2">
                        <input value={base[k] ?? ''} onChange={(e) => setBase((b) => ({ ...b, [k]: e.target.value }))}
                          type="number" min={0} step={0.1} className="input w-28" data-f={`global-base-${k}`} />
                      </td>
                      <td className="py-2 text-right font-bold tabular-nums" data-f={`global-charge-${k}`}>
                        {p != null ? `${p.toLocaleString()}P` : '-'}
                        {changed && <span className="ml-1.5 text-xs font-medium text-[var(--mkt-text-soft)]">(현재 {globalCharge[k]?.toLocaleString()}P)</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--mkt-text-soft)]">실제 계약 단가와 다르면 여기서 맞춰 주세요.</p>
            <MktButton onClick={saveGlobal} disabled={busy === 'global'}>
              {busy === 'global' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 전체 저장
            </MktButton>
          </div>
        </MktPanel>

        {/* ── 회원별 ── */}
        <MktPanel icon={UserCog} title="회원별 단가">
          <p className="mb-3 text-xs text-[var(--mkt-text-soft)]">
            특정 회원만 다른 단가로 청구합니다. <b>고정 단가</b>가 있으면 그 값이, 없으면 <b>회원 배수</b>가, 그것도 없으면 전체 기본이 적용됩니다.
          </p>

          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--mkt-text-dim)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') search() }}
                placeholder="회원 이름 또는 이메일"
                className="input w-full !pl-7"
                data-f="member-q"
              />
            </div>
            <MktButton onClick={search} disabled={busy === 'search'}>
              {busy === 'search' ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} 검색
            </MktButton>
          </div>

          {found.length > 0 && (
            <div className="mb-3 max-h-52 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-1.5">
              {found.map((u) => (
                <button key={u.userId} onClick={() => pick(u)} data-f="member-pick"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--panel-2)]">
                  <span className="font-semibold">{u.name || '(이름 없음)'}</span>
                  <span className="text-xs text-[var(--mkt-text-dim)]">{u.email}</span>
                  <span className="ml-auto text-[11px] text-[var(--mkt-text-dim)]">{u.plan || '-'} · {u.points.toLocaleString()}P</span>
                </button>
              ))}
            </div>
          )}

          {!target ? (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-xs text-[var(--mkt-text-dim)]">
              <Info size={13} className="mt-px flex-shrink-0" />
              회원을 검색해 선택하면 그 회원만의 단가를 정할 수 있습니다.
            </div>
          ) : (
            <div className="rounded-lg border border-[#6366f1]/40 bg-[#6366f1]/[0.05] p-3">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="text-sm font-bold">{target.name || '(이름 없음)'}</span>
                <span className="text-xs text-[var(--mkt-text-dim)]">{target.email}</span>
                <span className="ml-auto text-[11px] text-[var(--mkt-text-dim)]">{target.plan || '-'} · {target.points.toLocaleString()}P</span>
                <button onClick={() => setTarget(null)} className="text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]"><X size={13} /></button>
              </div>

              <div className="mb-2.5 flex items-center gap-2">
                <label className="text-xs font-semibold text-[var(--mkt-text-soft)]">회원 배수</label>
                <input value={mMult} onChange={(e) => setMMult(e.target.value)} type="number" min={0.1} step={0.1}
                  placeholder={`전체 기본 ${d.multiplier ?? 2}배`} className="input w-32" data-f="member-mult" />
                <span className="text-[11px] text-[var(--mkt-text-dim)]">비우면 전체 기본 배수</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[380px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--mkt-text-soft)]">
                      <th className="py-1.5 font-semibold">구분</th>
                      <th className="py-1.5 font-semibold">고정 단가(P)</th>
                      <th className="py-1.5 text-right font-semibold">적용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RATE_KINDS.map(([k, label]) => {
                      const pv = memberPreview[k]
                      return (
                        <tr key={k} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-1.5 font-semibold">{label}</td>
                          <td className="py-1.5">
                            <input value={mFixed[k] ?? ''} onChange={(e) => setMFixed((f) => ({ ...f, [k]: e.target.value }))}
                              type="number" min={1} step={1} placeholder={`기본 ${globalCharge[k] ?? '-'}`} className="input w-24" data-f={`member-fixed-${k}`} />
                          </td>
                          <td className="py-1.5 text-right tabular-nums" data-f={`member-charge-${k}`}>
                            <b>{pv?.v != null ? `${pv.v.toLocaleString()}P` : '-'}</b>
                            <span className={cn('ml-1.5 text-[10px] font-semibold',
                              pv?.src === 'global' ? 'text-[var(--mkt-text-dim)]' : 'text-[#6366f1]')}>
                              {SOURCE_LABEL[(pv?.src || 'global') as keyof typeof SOURCE_LABEL]}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <input value={mMemo} onChange={(e) => setMMemo(e.target.value)} placeholder="메모 (예: 대량 발송 계약 단가)" className="input mt-2.5 w-full" data-f="member-memo" />
              <div className="mt-2.5 flex items-center gap-2">
                <MktButton onClick={saveMember} disabled={busy === 'member'}>
                  {busy === 'member' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 회원 단가 저장
                </MktButton>
                <span className="text-[11px] text-[var(--mkt-text-dim)]">배수·고정 단가를 모두 비우고 저장하면 개별 설정이 해제됩니다.</span>
              </div>
            </div>
          )}
        </MktPanel>
      </div>

      {/* ── 개별 단가가 걸린 회원 ── */}
      <div className="mt-4">
        <MktPanel icon={UserCog} title={`개별 단가 적용 회원 (${overrides.length}명)`}>
          {overrides.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--mkt-text-dim)]">
              {loading ? '불러오는 중…' : '개별 단가가 걸린 회원이 없습니다. 모든 회원이 전체 기본 단가로 청구됩니다.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--mkt-text-soft)]">
                    <th className="py-2 font-semibold">회원</th>
                    <th className="py-2 font-semibold">배수</th>
                    {RATE_KINDS.map(([k, label]) => <th key={k} className="py-2 text-right font-semibold">{label}</th>)}
                    <th className="py-2 font-semibold">메모</th>
                    <th className="py-2 font-semibold">수정</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody data-f="override-rows">
                  {overrides.map((r) => (
                    <tr key={r.userId} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2">
                        <span className="font-semibold">{r.name}</span>
                        <span className="ml-1.5 text-[11px] text-[var(--mkt-text-dim)]">{r.email}</span>
                      </td>
                      <td className="py-2 tabular-nums">{r.multiplier != null ? `${r.multiplier}배` : <span className="text-[var(--mkt-text-dim)]">기본</span>}</td>
                      {RATE_KINDS.map(([k]) => (
                        <td key={k} className="py-2 text-right tabular-nums">
                          <b>{r.charge?.[k]?.toLocaleString() ?? '-'}P</b>
                          {r.source?.[k] !== 'global' && (
                            <span className="ml-1 text-[10px] font-semibold text-[#6366f1]">{r.source?.[k] === 'member-fixed' ? '고정' : '배수'}</span>
                          )}
                          {r.source?.[k] !== 'global' && globalCharge[k] != null && (
                            <span className="ml-1 text-[10px] text-[var(--mkt-text-dim)]">(기본 {globalCharge[k].toLocaleString()}P)</span>
                          )}
                        </td>
                      ))}
                      <td className="py-2 text-xs text-[var(--mkt-text-dim)]">{r.memo || '-'}</td>
                      <td className="py-2 text-[11px] text-[var(--mkt-text-dim)]">{kst(r.updatedAt)}<br />{r.updatedBy}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => pick(r)} className="mr-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] hover:bg-[var(--panel-2)]">편집</button>
                        <button onClick={() => removeOverride(r)} disabled={busy === r.userId}
                          className="rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--mkt-text-dim)] hover:border-[#e11d48]/40 hover:text-[#e11d48] disabled:opacity-40">
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </MktPanel>
      </div>
    </MktCanvas>
  )
}
