'use client'

import { useEffect, useState } from 'react'
import { Users2, Search, RefreshCw, Save, Layers } from 'lucide-react'
import { Panel, Button, Badge } from '@/components/ui'
import { adminUserMarkups, adminModelPricingAction, type UserMarkupRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

const num = (n: number) => (Math.round((n || 0) * 100) / 100).toLocaleString('ko-KR')

/** 회원별 원가율(전체 배수) 목록 — 모든 사용자의 배수를 한 표에서 조회·수정 */
export function UserMarkupList() {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<UserMarkupRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [refEdits, setRefEdits] = useState<Record<string, string>>({})
  const [refDefault, setRefDefault] = useState<number>(0.5)
  const [gsur, setGsur] = useState('')
  const [cpEdits, setCpEdits] = useState<Record<string, string>>({})
  const [cpDefault, setCpDefault] = useState<number>(65)
  const [gcp, setGcp] = useState('')
  const [gcn, setGcn] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function reload(query = q) {
    setLoading(true)
    adminUserMarkups(query).then((r) => {
      setUsers(r.users || [])
      if (typeof r.refSurchargeDefault === 'number') { setRefDefault(r.refSurchargeDefault); setGsur(String(r.refSurchargeDefault)) }
      if (typeof r.creditPriceDefault === 'number') { setCpDefault(r.creditPriceDefault); setGcp(String(r.creditPriceDefault)) }
      if (typeof r.cnSurchargeDefault === 'number') { setGcn(String(r.cnSurchargeDefault)) }
      const e: Record<string, string> = {}
      const rf: Record<string, string> = {}
      const cp: Record<string, string> = {}
      for (const u of r.users || []) { e[u.id] = u.overall > 0 ? String(u.overall) : ''; rf[u.id] = u.refSurcharge == null ? '' : String(u.refSurcharge); cp[u.id] = u.creditPrice == null ? '' : String(u.creditPrice) }
      setEdits(e); setRefEdits(rf); setCpEdits(cp)
      setLoading(false)
    })
  }
  async function saveCreditPrice(u: UserMarkupRow) {
    const raw = (cpEdits[u.id] || '').trim()
    setBusy(u.id + ':cp')
    const r = raw === ''
      ? await adminModelPricingAction('reset_user_creditprice', { userId: u.id })
      : await adminModelPricingAction('set_user_creditprice', { userId: u.id, price: Number(raw) })
    setBusy(null)
    if (r.ok) { setToast(`${u.name || u.email} 크레딧 단가 저장`); reload() } else setToast(r.error || '처리 실패')
  }
  async function saveGlobalCreditPrice() {
    setBusy('global:cp')
    const r = await adminModelPricingAction('set_global_creditprice', { price: Number(gcp) })
    setBusy(null)
    if (r.ok) { setToast(`전역 크레딧 단가 ${gcp}원/크레딧 저장`); reload() } else setToast(r.error || '처리 실패')
  }
  async function saveRef(u: UserMarkupRow) {
    const raw = (refEdits[u.id] || '').trim()
    setBusy(u.id + ':ref')
    const r = raw === ''
      ? await adminModelPricingAction('reset_user_refsur', { userId: u.id })
      : await adminModelPricingAction('set_user_refsur', { userId: u.id, pct: Number(raw) })
    setBusy(null)
    if (r.ok) { setToast(`${u.name || u.email} 레퍼런스 가산율 저장`); reload() } else setToast(r.error || '처리 실패')
  }
  async function saveGlobalSur() {
    setBusy('global:ref')
    const r = await adminModelPricingAction('set_global_refsur', { pct: Number(gsur) })
    setBusy(null)
    if (r.ok) { setToast(`전역 레퍼런스 가산율 ${gsur}%/장 저장`); reload() } else setToast(r.error || '처리 실패')
  }
  async function saveGlobalCn() {
    setBusy('global:cn')
    const r = await adminModelPricingAction('set_global_cnsur', { pct: Number(gcn) })
    setBusy(null)
    if (r.ok) { setToast(`전역 ControlNet 가산율 ${gcn}% 저장`); reload() } else setToast(r.error || '처리 실패')
  }
  useEffect(() => { reload('') /* eslint-disable-next-line */ }, [])
  useEffect(() => { const t = setTimeout(() => reload(q), 300); return () => clearTimeout(t) /* eslint-disable-next-line */ }, [q])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t) }, [toast])

  async function save(u: UserMarkupRow) {
    const raw = (edits[u.id] || '').trim()
    setBusy(u.id)
    const r = raw === ''
      ? await adminModelPricingAction('reset_user_overall', { userId: u.id })
      : await adminModelPricingAction('set_user_overall', { userId: u.id, markup: Number(raw) })
    setBusy(null)
    if (r.ok) { setToast(`${u.name || u.email} 원가율 저장`); reload() } else setToast(r.error || '처리 실패')
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2"><Users2 size={16} className="text-violet-500" /> 회원별 원가율(배수) 목록</span>}
      action={<Button variant="outline" size="sm" onClick={() => reload()}><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> 새로고침</Button>}
    >
      <p className="mb-3 text-sm text-[var(--text-soft)]">
        회원마다 <b>전체 배수(원가율)</b>와 <b>레퍼런스 가산율</b>을 조절합니다. 배수 빈칸이면 <b>기본</b>(영상 ×3.0 · 이미지/Seedance 2.0 ×2.5). 이미지 생성 시 레퍼런스를 <b>1장 추가할 때마다 소모 크레딧을 가산율(%)만큼</b> 더 차감합니다.
      </p>

      {/* 전역 레퍼런스 가산율 기본값 */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border-soft)] bg-slate-50 p-3">
        <div>
          <label className="mb-1 block text-[11px] text-[var(--text-dim)]">전역 레퍼런스 가산율 (레퍼런스 1장당 %)</label>
          <div className="flex items-center gap-1">
            <input value={gsur} onChange={(e) => setGsur(e.target.value.replace(/[^0-9.]/g, ''))} className="w-24 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-right text-sm" />
            <span className="text-sm text-[var(--text-soft)]">% / 장</span>
          </div>
        </div>
        <Button size="sm" disabled={busy === 'global:ref'} onClick={saveGlobalSur}><Save size={14} /> 전역 기본값 저장</Button>
        <span className="text-xs text-[var(--text-dim)]">회원별로 지정하지 않으면 이 값이 적용됩니다. (기본 0.5%)</span>
      </div>

      {/* 전역 ControlNet 가산율 */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
        <div>
          <label className="mb-1 block text-[11px] text-[var(--text-dim)]">ControlNet 조절 가산율 (%)</label>
          <div className="flex items-center gap-1">
            <input value={gcn} onChange={(e) => setGcn(e.target.value.replace(/[^0-9.]/g, ''))} className="w-24 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-right text-sm" />
            <span className="text-sm text-[var(--text-soft)]">%</span>
          </div>
        </div>
        <Button size="sm" disabled={busy === 'global:cn'} onClick={saveGlobalCn}><Save size={14} /> 가산율 저장</Button>
        <span className="text-xs text-[var(--text-dim)]">이미지 생성에서 ControlNet(Canny/Depth/Pose)을 사용하면 소모 크레딧을 이 %만큼 더 차감합니다. (기본 10%)</span>
      </div>

      {/* 전역 크레딧 구매 단가 */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
        <div>
          <label className="mb-1 block text-[11px] text-[var(--text-dim)]">전역 크레딧 구매 단가 (원 / 크레딧)</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-[var(--text-soft)]">₩</span>
            <input value={gcp} onChange={(e) => setGcp(e.target.value.replace(/[^0-9]/g, ''))} className="w-28 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-right text-sm" />
            <span className="text-sm text-[var(--text-soft)]">/ 크레딧</span>
          </div>
        </div>
        <Button size="sm" disabled={busy === 'global:cp'} onClick={saveGlobalCreditPrice}><Save size={14} /> 전역 단가 저장</Button>
        <span className="text-xs text-[var(--text-dim)]">사용자가 크레딧을 구매할 때 적용되는 단가. 회원별로 지정하지 않으면 이 값이 적용됩니다. (기본 65원)</span>
      </div>

      <div className="relative mb-3 max-w-xs">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·이메일 검색" className="w-full rounded-lg border border-[var(--border-soft)] bg-white py-2 pl-8 pr-3 text-sm" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
              <th className="px-2 py-2 font-medium">회원</th>
              <th className="px-2 py-2 font-medium">플랜</th>
              <th className="px-2 py-2 font-medium">보유 크레딧</th>
              <th className="px-2 py-2 font-medium">전체 배수(원가율)</th>
              <th className="px-2 py-2 font-medium">크레딧 단가(원/크레딧)</th>
              <th className="px-2 py-2 font-medium">레퍼런스 가산율(%/장)</th>
              <th className="px-2 py-2 font-medium">모델별 개별</th>
              <th className="px-2 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const val = edits[u.id] ?? ''
              return (
                <tr key={u.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                  <td className="px-2 py-2">
                    <div className="font-medium text-[var(--text)]">{u.name || '-'}</div>
                    <div className="text-xs text-[var(--text-soft)]">{u.email}</div>
                  </td>
                  <td className="px-2 py-2"><Badge className="border-slate-200 bg-slate-50 text-slate-600">{u.plan}</Badge></td>
                  <td className="px-2 py-2 font-semibold text-violet-600">{num(u.credits)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--text-dim)]">×</span>
                      <input
                        value={val}
                        onChange={(e) => setEdits((p) => ({ ...p, [u.id]: e.target.value.replace(/[^0-9.]/g, '') }))}
                        placeholder="기본"
                        className="w-16 rounded-lg border border-[var(--border-soft)] bg-white px-2 py-1.5 text-right text-sm"
                      />
                      {u.overall > 0 ? <span className="text-[10px] text-violet-500">지정</span> : <span className="text-[10px] text-[var(--text-dim)]">기본</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--text-dim)]">₩</span>
                      <input
                        value={cpEdits[u.id] ?? ''}
                        onChange={(e) => setCpEdits((p) => ({ ...p, [u.id]: e.target.value.replace(/[^0-9]/g, '') }))}
                        placeholder={`기본 ${cpDefault}`}
                        className="w-20 rounded-lg border border-[var(--border-soft)] bg-white px-2 py-1.5 text-right text-sm"
                      />
                      <Button size="sm" variant="outline" disabled={busy === u.id + ':cp'} onClick={() => saveCreditPrice(u)}><Save size={12} /></Button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        value={refEdits[u.id] ?? ''}
                        onChange={(e) => setRefEdits((p) => ({ ...p, [u.id]: e.target.value.replace(/[^0-9.]/g, '') }))}
                        placeholder={`기본 ${refDefault}`}
                        className="w-16 rounded-lg border border-[var(--border-soft)] bg-white px-2 py-1.5 text-right text-sm"
                      />
                      <span className="text-[10px] text-[var(--text-dim)]">%/장</span>
                      <Button size="sm" variant="outline" disabled={busy === u.id + ':ref'} onClick={() => saveRef(u)}><Save size={12} /></Button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {u.overrides > 0
                      ? <Badge className="border-amber-200 bg-amber-50 text-amber-700">{u.overrides}개 모델</Badge>
                      : <span className="text-xs text-[var(--text-dim)]">-</span>}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => save(u)}>
                      <Save size={13} /> 저장
                    </Button>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-[var(--text-dim)]">{loading ? '불러오는 중…' : '회원이 없습니다.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {users.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
          <Layers size={12} /> 총 {users.length}명 · 우선순위: 회원×모델 &gt; 회원 전체 배수 &gt; 전역 모델 배수 &gt; 기본값
        </p>
      )}

      {toast && <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-violet-200 bg-violet-100 px-4 py-3 text-sm font-medium text-violet-700 shadow-lg">{toast}</div>}
    </Panel>
  )
}
