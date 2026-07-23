'use client'

import { useEffect, useMemo, useState } from 'react'
import { Coins, Save, RefreshCw, Building2, User as UserIcon, Trash2, Search } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button } from '@/components/ui'
import { adminUserMarkups, adminModelPricingAction, type UserMarkupRow, type AcademyRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#7c3aed'
const won = (n: number) => '₩' + Math.round(n).toLocaleString()

export default function CreditPricingPage() {
  const [users, setUsers] = useState<UserMarkupRow[]>([])
  const [academies, setAcademies] = useState<AcademyRow[]>([])
  const [globalPrice, setGlobalPrice] = useState(65)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  // 편집 입력 상태
  const [globalInput, setGlobalInput] = useState('')
  const [newAcademy, setNewAcademy] = useState('')
  const [newAcademyPrice, setNewAcademyPrice] = useState('')

  async function load(query = q) {
    setLoading(true)
    try {
      const r = await adminUserMarkups(query)
      if (r.ok) {
        setUsers(r.users || [])
        setAcademies(r.academies || [])
        const g = Number(r.creditPriceDefault) > 0 ? Number(r.creditPriceDefault) : 65
        setGlobalPrice(g); setGlobalInput(String(g))
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load('') }, [])

  const academyPriceMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of academies) if (a.price != null) m[a.name] = a.price
    return m
  }, [academies])

  // 회원 적용 단가: 개인 > 학원 > 전역
  function effectivePrice(u: UserMarkupRow): { price: number; src: string } {
    if (u.creditPrice != null && u.creditPrice > 0) return { price: u.creditPrice, src: '개인' }
    if (u.academy && academyPriceMap[u.academy] > 0) return { price: academyPriceMap[u.academy], src: '학원' }
    return { price: globalPrice, src: '전역' }
  }

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(key)
    try { const res = await fn(); if (!res.ok) { alert(res.error || '처리 실패'); return false } await load(); return true }
    finally { setBusy(null) }
  }

  const saveGlobal = () => {
    const p = Math.round(Number(globalInput) || 0)
    if (p < 1) { alert('단가는 1원 이상이어야 합니다.'); return }
    run('global', () => adminModelPricingAction('set_global_creditprice', { price: p }))
  }
  const addAcademyPrice = () => {
    const name = newAcademy.trim(); const p = Math.round(Number(newAcademyPrice) || 0)
    if (!name) { alert('학원명을 입력하세요.'); return }
    if (p < 1) { alert('단가는 1원 이상이어야 합니다.'); return }
    run('ac-add', () => adminModelPricingAction('set_academy_creditprice', { academy: name, price: p })).then((ok) => { if (ok) { setNewAcademy(''); setNewAcademyPrice('') } })
  }

  return (
    <div>
      <PageHeader
        icon={Coins}
        eyebrow="ADMIN"
        title="크레딧 단가 설정"
        desc="크레딧 충전 단가(1크레딧당 원)를 전역·학원별·회원별로 지정합니다. 우선순위: 회원 개인 > 학원 > 전역."
        accent={ACCENT}
      />

      <div className="space-y-6 p-6 lg:p-8">
        {/* 전역 단가 — 1크레딧 = N원 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-1">
            <div className="text-[13px] font-medium text-[var(--text-soft)]">현재 전역 단가</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-violet-700">1크레딧 = {globalPrice.toLocaleString()}원</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number" min={1} value={globalInput} onChange={(e) => setGlobalInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 pr-10 text-sm"
                  placeholder="원/크레딧"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-soft)]">원</span>
              </div>
              <Button size="sm" variant="primary" disabled={busy === 'global'} onClick={saveGlobal}><Save className="h-4 w-4" /> 저장</Button>
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-soft)]">회원·학원 지정가가 없으면 이 단가로 충전됩니다.</p>
          </div>
          <StatCard label="회원 수" value={String(users.length)} icon={UserIcon} accent="#0ea5e9" />
          <StatCard label="단가 지정 학원" value={String(academies.filter((a) => a.price != null).length)} icon={Building2} accent={ACCENT} />
        </div>

        {/* 학원별 단가 */}
        <Panel
          title={<span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" /> 학원별 단가</span>}
          action={<Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> 새로고침</Button>}
        >
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[160px]">
              <label className="mb-1 block text-[11px] text-[var(--text-soft)]">학원명</label>
              <input value={newAcademy} onChange={(e) => setNewAcademy(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm" placeholder="예: 강남학원" />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-[11px] text-[var(--text-soft)]">1크레딧 단가(원)</label>
              <input type="number" min={1} value={newAcademyPrice} onChange={(e) => setNewAcademyPrice(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm" placeholder="원" />
            </div>
            <Button size="sm" variant="primary" disabled={busy === 'ac-add'} onClick={addAcademyPrice}><Save className="h-4 w-4" /> 학원 단가 추가/변경</Button>
          </div>
          {academies.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-soft)]">등록된 학원이 없습니다. 위에서 학원 단가를 추가하거나, 아래 회원에게 학원을 배정하세요.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-soft)]">
                  <th className="py-2 pr-3">학원</th><th className="py-2 pr-3">소속 회원</th><th className="py-2 pr-3">1크레딧 단가</th><th className="py-2 pr-3 text-right">관리</th>
                </tr></thead>
                <tbody>
                  {academies.map((a) => (
                    <AcademyRowEditor key={a.name} a={a} globalPrice={globalPrice} busy={busy}
                      onSave={(p) => run('ac-' + a.name, () => adminModelPricingAction('set_academy_creditprice', { academy: a.name, price: p }))}
                      onDel={() => { if (confirm(`'${a.name}' 학원 단가를 삭제할까요? (소속 회원은 전역 단가 적용)`)) run('acd-' + a.name, () => adminModelPricingAction('del_academy_creditprice', { academy: a.name })) }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* 회원별 단가 */}
        <Panel title={<span className="inline-flex items-center gap-2"><UserIcon className="h-4 w-4" /> 회원별 단가</span>}>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load() }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] py-2 pl-9 pr-3 text-sm" placeholder="이름·이메일 검색 후 Enter" />
            </div>
            <Button size="sm" variant="outline" onClick={() => load()}>검색</Button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-[var(--text-soft)]">불러오는 중…</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-soft)]">회원이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const eff = effectivePrice(u)
                return (
                  <UserPriceRow key={u.id} u={u} eff={eff} busy={busy}
                    onSetPrice={(p) => run('u-' + u.id, () => adminModelPricingAction('set_user_creditprice', { userId: u.id, price: p }))}
                    onResetPrice={() => run('ur-' + u.id, () => adminModelPricingAction('reset_user_creditprice', { userId: u.id }))}
                    onSetAcademy={(name) => run('ua-' + u.id, () => adminModelPricingAction('set_user_academy', { userId: u.id, academy: name }))}
                  />
                )
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function AcademyRowEditor({ a, globalPrice, busy, onSave, onDel }: { a: AcademyRow; globalPrice: number; busy: string | null; onSave: (p: number) => void; onDel: () => void }) {
  const [v, setV] = useState(a.price != null ? String(a.price) : '')
  useEffect(() => { setV(a.price != null ? String(a.price) : '') }, [a.price])
  return (
    <tr className="border-b border-[var(--border-soft)]">
      <td className="py-2 pr-3 font-medium text-[var(--text)]">{a.name}</td>
      <td className="py-2 pr-3 text-[var(--text-soft)]">{a.members}명</td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1.5">
          <input type="number" min={1} value={v} onChange={(e) => setV(e.target.value)} className="w-24 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-sm" placeholder={`전역 ${globalPrice}`} />
          <span className="text-xs text-[var(--text-soft)]">원</span>
        </div>
      </td>
      <td className="py-2 pr-3 text-right">
        <div className="inline-flex gap-1.5">
          <Button size="sm" variant="soft" disabled={busy === 'ac-' + a.name} onClick={() => { const p = Math.round(Number(v) || 0); if (p < 1) { alert('1원 이상'); return } onSave(p) }}>저장</Button>
          {a.price != null && <Button size="sm" variant="ghost" className="text-rose-600" disabled={busy === 'acd-' + a.name} onClick={onDel}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </td>
    </tr>
  )
}

function UserPriceRow({ u, eff, busy, onSetPrice, onResetPrice, onSetAcademy }: {
  u: UserMarkupRow; eff: { price: number; src: string }; busy: string | null
  onSetPrice: (p: number) => void; onResetPrice: () => void; onSetAcademy: (name: string) => void
}) {
  const [price, setPrice] = useState(u.creditPrice != null ? String(u.creditPrice) : '')
  const [academy, setAcademy] = useState(u.academy || '')
  useEffect(() => { setPrice(u.creditPrice != null ? String(u.creditPrice) : ''); setAcademy(u.academy || '') }, [u.creditPrice, u.academy])
  return (
    <div className="grid grid-cols-1 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 md:grid-cols-[1.3fr_1fr_1.2fr_auto]">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[var(--text)]">{u.name || '(이름 없음)'} <span className="ml-1 font-mono text-[11px] text-[var(--text-soft)]">{u.id}</span></div>
        <div className="truncate text-xs text-[var(--text-soft)]">{u.email}</div>
      </div>
      {/* 학원 배정 */}
      <div className="flex items-center gap-1.5">
        <input value={academy} onChange={(e) => setAcademy(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-sm" placeholder="학원(선택)" />
        <Button size="sm" variant="ghost" disabled={busy === 'ua-' + u.id} onClick={() => onSetAcademy(academy.trim())}>배정</Button>
      </div>
      {/* 개인 단가 */}
      <div className="flex items-center gap-1.5">
        <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="w-20 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-sm" placeholder="개인가" />
        <span className="text-xs text-[var(--text-soft)]">원</span>
        <Button size="sm" variant="soft" disabled={busy === 'u-' + u.id} onClick={() => { const p = Math.round(Number(price) || 0); if (p < 1) { alert('1원 이상'); return } onSetPrice(p) }}>저장</Button>
        {u.creditPrice != null && <Button size="sm" variant="ghost" disabled={busy === 'ur-' + u.id} onClick={onResetPrice}>해제</Button>}
      </div>
      {/* 적용 단가 */}
      <div className="text-right">
        <div className="text-sm font-bold text-violet-700">1크레딧 {eff.price.toLocaleString()}원</div>
        <div className="text-[10px] text-[var(--text-soft)]">적용: {eff.src}</div>
      </div>
    </div>
  )
}
