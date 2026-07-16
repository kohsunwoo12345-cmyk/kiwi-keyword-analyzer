'use client'

import { useEffect, useState } from 'react'
import {
  Landmark,
  Plus,
  Trash2,
  Save,
  Wallet,
  Coins,
  TrendingUp,
  Receipt,
  RefreshCw,
  Building2,
  Search,
  X,
  UserCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Button, Badge } from '@/components/ui'
import { Reveal } from '@/components/motion'
import {
  adminSettlement,
  adminSettlementAction,
  adminSettlementUsers,
  type AdminSettlement,
  type SettlementUser,
} from '@/lib/auth'
import { kstLong } from '@/lib/time'
import { cn } from '@/lib/utils'

const ACCENT = '#0ea5e9'
const won = (n: number) => '₩' + Math.round(n || 0).toLocaleString('ko-KR')
const planLabel = (track: string, plan: string) => `${track === 'video' ? 'AI영상' : '마케터'} ${plan}`
const inp = 'w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-sky-400'

export default function AdminSettlementPage() {
  const [data, setData] = useState<AdminSettlement>({ ok: false })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 지사 추가 폼
  const [nbName, setNbName] = useState('')
  const [nbPercent, setNbPercent] = useState('10')
  const [nbCost, setNbCost] = useState('0')
  const [nbMemo, setNbMemo] = useState('')
  const [nbOwner, setNbOwner] = useState<SettlementUser | null>(null)

  // 지사별 편집/정산/대표변경 버퍼
  const [edits, setEdits] = useState<Record<string, { name: string; percent: string; costRate: string; memo: string }>>({})
  const [settleAmt, setSettleAmt] = useState<Record<string, string>>({})
  const [settleNote, setSettleNote] = useState<Record<string, string>>({})
  const [ownerEditing, setOwnerEditing] = useState<string | null>(null)

  function reload() {
    setLoading(true)
    adminSettlement().then((r) => {
      setData(r)
      setLoading(false)
      const e: Record<string, { name: string; percent: string; costRate: string; memo: string }> = {}
      for (const b of r.branches || []) e[b.id] = { name: b.name, percent: String(b.percent), costRate: String(b.costRate), memo: b.memo || '' }
      setEdits(e)
    })
  }
  useEffect(() => { reload() }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  async function act(action: Parameters<typeof adminSettlementAction>[0], payload: Record<string, unknown>, okMsg: string): Promise<boolean> {
    setBusy(true)
    const r = await adminSettlementAction(action, payload)
    setBusy(false)
    if (r.ok) { setToast(okMsg); reload(); return true }
    setToast(r.error || '처리에 실패했습니다.')
    return false
  }

  const t = data.totals
  const branches = data.branches || []
  const payments = data.payments || []
  const settlements = data.settlements || []

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Landmark}
        eyebrow="ADMIN"
        title="지사 정산"
        desc="지사마다 대표 계정을 지정하면, 그 계정의 추천코드로 들어온 회원의 결제 순수익 기준으로 지급액을 계산합니다. (대표 본인의 결제는 제외)"
        accent={ACCENT}
        action={<Button variant="outline" size="sm" onClick={reload}><RefreshCw size={15} /> 새로고침</Button>}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="추천 결제 건수" value={loading ? '—' : String(t?.paymentsCount ?? 0)} icon={Receipt} accent="#0ea5e9" />
            <StatCard label="총 결제액" value={loading ? '—' : won(t?.grossKrw ?? 0)} icon={Coins} accent="#6366f1" />
            <StatCard label="순수익 합계" value={loading ? '—' : won(t?.netProfitKrw ?? 0)} icon={TrendingUp} accent="#22c55e" />
            <StatCard label="지사 미지급 잔액" value={loading ? '—' : won(t?.outstandingKrw ?? 0)} icon={Wallet} accent="#f59e0b" />
          </div>
        </Reveal>

        <Reveal>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <b>순수익</b> = 결제액 × (1 − 지사 원가율%) − 추천 리워드 지급액(결제액의 1% 크레딧). &nbsp;
            <b>지사 지급액</b> = 순수익 × 지사 지급률%. &nbsp;대표 계정의 추천코드로 가입한 회원의 결제만 집계되며, <b>대표 본인의 결제는 제외</b>됩니다.
          </div>
        </Reveal>

        {/* 지사 추가 */}
        <Reveal>
          <Panel title={<span className="flex items-center gap-2"><Building2 size={16} className="text-sky-500" /> 지사 추가</span>}>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] text-[var(--text-dim)]">지사 이름</label>
                <input value={nbName} onChange={(e) => setNbName(e.target.value)} placeholder="예: 서울 강남지사" className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[var(--text-dim)]">대표 계정 (아이디 검색 후 선택)</label>
                <AccountPicker selected={nbOwner} onPick={setNbOwner} />
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[0.7fr_0.7fr_1.6fr_auto]">
              <LabeledNum label="지급률 %" value={nbPercent} onChange={setNbPercent} />
              <LabeledNum label="원가율 %" value={nbCost} onChange={setNbCost} />
              <input value={nbMemo} onChange={(e) => setNbMemo(e.target.value)} placeholder="메모 (담당자·연락처 등)" className={inp} />
              <Button
                size="sm"
                disabled={busy || !nbName.trim()}
                onClick={async () => {
                  const ok = await act('create_branch', { name: nbName.trim(), ownerId: nbOwner?.id || '', percent: Number(nbPercent), costRate: Number(nbCost), memo: nbMemo.trim() }, '지사를 추가했습니다.')
                  if (ok) { setNbName(''); setNbPercent('10'); setNbCost('0'); setNbMemo(''); setNbOwner(null) }
                }}
              >
                <Plus size={15} /> 추가
              </Button>
            </div>
          </Panel>
        </Reveal>

        {/* 지사 목록 */}
        <Reveal>
          <Panel title={<span className="flex items-center gap-2"><Landmark size={16} className="text-sky-500" /> 지사별 정산 ({branches.length})</span>}>
            {branches.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '등록된 지사가 없습니다. 위에서 지사를 추가하세요.'}</p>
            ) : (
              <div className="space-y-4">
                {branches.map((b) => {
                  const e = edits[b.id] || { name: b.name, percent: String(b.percent), costRate: String(b.costRate), memo: b.memo }
                  const setE = (patch: Partial<typeof e>) => setEdits((prev) => ({ ...prev, [b.id]: { ...e, ...patch } }))
                  const editingOwner = ownerEditing === b.id
                  return (
                    <div key={b.id} className="rounded-xl border border-[var(--border-soft)] p-4">
                      {/* 대표 계정 */}
                      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5">
                        <UserCheck size={15} className="text-sky-500" />
                        <span className="text-xs text-[var(--text-dim)]">대표 계정</span>
                        {b.ownerId && !editingOwner ? (
                          <>
                            <span className="text-sm font-semibold">{b.ownerName}</span>
                            <span className="text-xs text-[var(--text-soft)]">{b.ownerEmail}</span>
                            {b.ownerCode && <Badge className="border-violet-200 bg-violet-50 text-violet-700">코드 {b.ownerCode}</Badge>}
                            <button className="ml-auto text-xs font-medium text-sky-600 hover:underline" onClick={() => setOwnerEditing(b.id)}>변경</button>
                            <button className="text-xs font-medium text-rose-500 hover:underline" disabled={busy} onClick={() => act('set_owner', { id: b.id, ownerId: '' }, '대표 계정을 해제했습니다.')}>해제</button>
                          </>
                        ) : (
                          <div className="flex-1 min-w-[240px]">
                            <AccountPicker
                              selected={null}
                              onPick={async (u) => { if (u) { const ok = await act('set_owner', { id: b.id, ownerId: u.id }, '대표 계정을 지정했습니다.'); if (ok) setOwnerEditing(null) } }}
                            />
                          </div>
                        )}
                        {editingOwner && <button className="text-xs text-[var(--text-dim)] hover:underline" onClick={() => setOwnerEditing(null)}>취소</button>}
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1.6fr_0.7fr_0.7fr_1.4fr_auto]">
                        <input value={e.name} onChange={(ev) => setE({ name: ev.target.value })} className={inp} />
                        <LabeledNum label="지급률 %" value={e.percent} onChange={(v) => setE({ percent: v })} />
                        <LabeledNum label="원가율 %" value={e.costRate} onChange={(v) => setE({ costRate: v })} />
                        <input value={e.memo} onChange={(ev) => setE({ memo: ev.target.value })} placeholder="메모" className={inp} />
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => act('update_branch', { id: b.id, name: e.name, percent: Number(e.percent), costRate: Number(e.costRate), memo: e.memo }, '지사 정보를 저장했습니다.')}>
                            <Save size={14} /> 저장
                          </Button>
                          <Button size="sm" variant="outline" className="!border-rose-200 !text-rose-600 hover:!bg-rose-50" disabled={busy} onClick={() => { if (confirm(`'${b.name}' 지사를 삭제할까요?`)) act('delete_branch', { id: b.id }, '지사를 삭제했습니다.') }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
                        <Mini label="추천 결제건" value={`${b.refPaidCount}건`} />
                        <Mini label="총 결제액" value={won(b.grossKrw)} />
                        <Mini label="추천 리워드" value={won(b.rewardKrw)} />
                        <Mini label="순수익" value={won(b.netProfitKrw)} accent="text-emerald-600" />
                        <Mini label="지급 예정" value={won(b.owedKrw)} accent="text-sky-600" />
                        <Mini label="미지급 잔액" value={won(b.outstandingKrw)} accent="text-amber-600" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--border-soft)] pt-3">
                        <div>
                          <label className="mb-1 block text-[11px] text-[var(--text-dim)]">정산 지급액 (원)</label>
                          <input value={settleAmt[b.id] ?? ''} onChange={(ev) => setSettleAmt((p) => ({ ...p, [b.id]: ev.target.value.replace(/[^0-9]/g, '') }))} placeholder={String(Math.round(b.outstandingKrw))} className={cn(inp, 'w-40')} />
                        </div>
                        <input value={settleNote[b.id] ?? ''} onChange={(ev) => setSettleNote((p) => ({ ...p, [b.id]: ev.target.value }))} placeholder="메모 (정산 기간 등)" className={cn(inp, 'min-w-[200px] flex-1')} />
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={async () => {
                            const amt = Number(settleAmt[b.id] || b.outstandingKrw)
                            if (amt <= 0) { setToast('정산 금액을 입력하세요.'); return }
                            const ok = await act('settle', { branchId: b.id, amount: amt, note: settleNote[b.id] || '' }, '정산 지급을 기록했습니다.')
                            if (ok) { setSettleAmt((p) => ({ ...p, [b.id]: '' })); setSettleNote((p) => ({ ...p, [b.id]: '' })) }
                          }}
                        >
                          <Wallet size={14} /> 정산 지급 기록
                        </Button>
                        <span className="text-xs text-[var(--text-dim)]">누적 정산 {won(b.settledKrw)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </Reveal>

        {/* 결제 내역 */}
        <Reveal>
          <Panel title={<span className="flex items-center gap-2"><Receipt size={16} className="text-indigo-500" /> 추천 결제 내역 ({payments.length})</span>}>
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '추천으로 발생한 결제가 아직 없습니다.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                      <th className="pb-2.5 font-medium">결제 회원</th>
                      <th className="pb-2.5 font-medium">플랜</th>
                      <th className="pb-2.5 font-medium">결제액</th>
                      <th className="pb-2.5 font-medium">추천인(코드)</th>
                      <th className="pb-2.5 font-medium">추천 리워드</th>
                      <th className="pb-2.5 font-medium">순수익</th>
                      <th className="pb-2.5 font-medium">지사</th>
                      <th className="pb-2.5 font-medium">지사 지급액</th>
                      <th className="pb-2.5 font-medium">일시(KST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                        <td className="py-2.5"><div className="font-medium">{p.friendName}</div><div className="text-xs text-[var(--text-dim)]">{p.friendEmail}</div></td>
                        <td className="py-2.5"><Badge className="border-slate-200 bg-slate-50 text-slate-600">{planLabel(p.track, p.plan)}</Badge></td>
                        <td className="py-2.5 font-medium">{won(p.priceKrw)}</td>
                        <td className="py-2.5 text-[var(--text-soft)]">{p.referrerName}{p.referrerCode && <span className="text-xs text-[var(--text-dim)]"> · {p.referrerCode}</span>}</td>
                        <td className="py-2.5 text-[var(--text-soft)]">{won(p.rewardKrw)} <span className="text-xs text-[var(--text-dim)]">({p.rewardCredits}C)</span></td>
                        <td className="py-2.5 text-emerald-600">{won(p.netProfitKrw)}</td>
                        <td className="py-2.5">{p.branchName ? <Badge className="border-sky-200 bg-sky-50 text-sky-700">{p.branchName}</Badge> : <span className="text-xs text-[var(--text-dim)]">미지정</span>}</td>
                        <td className="py-2.5 font-medium text-sky-600">{p.branchId ? won(p.owedKrw) : '—'}</td>
                        <td className="py-2.5 whitespace-nowrap text-xs text-[var(--text-soft)]">{kstLong(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Reveal>

        {/* 정산 지급 내역 */}
        <Reveal>
          <Panel title={<span className="flex items-center gap-2"><Wallet size={16} className="text-amber-500" /> 정산 지급 내역 ({settlements.length})</span>}>
            {settlements.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{loading ? '불러오는 중…' : '정산 지급 기록이 없습니다.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
                      <th className="pb-2.5 font-medium">지사</th>
                      <th className="pb-2.5 font-medium">지급액</th>
                      <th className="pb-2.5 font-medium">메모</th>
                      <th className="pb-2.5 font-medium">일시(KST)</th>
                      <th className="pb-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                        <td className="py-2.5 font-medium">{s.branchName}</td>
                        <td className="py-2.5 font-semibold text-amber-600">{won(s.amountKrw)}</td>
                        <td className="py-2.5 text-[var(--text-soft)]">{s.note || '—'}</td>
                        <td className="py-2.5 whitespace-nowrap text-xs text-[var(--text-soft)]">{kstLong(s.createdAt)}</td>
                        <td className="py-2.5 text-right">
                          <button className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" disabled={busy} onClick={() => { if (confirm('이 정산 지급 기록을 삭제할까요?')) act('delete_settlement', { id: s.id }, '정산 기록을 삭제했습니다.') }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Reveal>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border border-sky-200 bg-sky-100 px-4 py-3 text-sm font-medium text-sky-800 shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ── 계정 검색·선택 ── */
function AccountPicker({ selected, onPick }: { selected: SettlementUser | null; onPick: (u: SettlementUser | null) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SettlementUser[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    setSearching(true)
    const tmr = setTimeout(() => {
      adminSettlementUsers(q).then((r) => { if (alive) { setResults(r.users || []); setSearching(false) } })
    }, 250)
    return () => { alive = false; clearTimeout(tmr) }
  }, [q, open])

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
        <span className="font-semibold">{selected.name}</span>
        <span className="text-xs text-[var(--text-soft)]">{selected.email}</span>
        {selected.referralCode && <span className="text-xs text-violet-600">코드 {selected.referralCode}</span>}
        <button className="ml-auto text-[var(--text-dim)] hover:text-rose-500" onClick={() => onPick(null)}><X size={15} /></button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="이름·이메일·추천코드로 검색"
        className={cn(inp, 'pl-9')}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--border-soft)] bg-white p-1 shadow-lg">
          {searching && <div className="px-3 py-2 text-xs text-[var(--text-dim)]">검색 중…</div>}
          {!searching && results.length === 0 && <div className="px-3 py-2 text-xs text-[var(--text-dim)]">일치하는 계정이 없습니다.</div>}
          {results.map((u) => (
            <button
              key={u.id}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => { onPick(u); setOpen(false); setQ('') }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-[var(--text-soft)]">{u.email}</span>
              {u.referralCode && <span className="ml-auto text-xs text-violet-600">코드 {u.referralCode}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LabeledNum({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className={cn(inp, 'pr-2 text-right')} aria-label={label} />
      <span className="pointer-events-none absolute -top-1.5 left-2 bg-white px-1 text-[10px] text-[var(--text-dim)]">{label}</span>
    </div>
  )
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-[var(--text-dim)]">{label}</div>
      <div className={cn('mt-0.5 font-semibold', accent || 'text-[var(--text)]')}>{value}</div>
    </div>
  )
}
