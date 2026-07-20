'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Receipt, FileText, BadgeDollarSign, RotateCcw, Repeat, RefreshCw, X, Loader2, CreditCard, Wallet, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { StatCard, Panel, Badge, Button } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { adminBilling, adminBillingAction, type BillingBundle, type PaymentRow } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ACCENT = '#0ea5e9'
const won = (n: number) => '₩' + (n || 0).toLocaleString('ko-KR')
const kst = (iso?: string | null) => { if (!iso) return '-'; try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso || '-' } }
const sourceLabel = (s: string) => s === 'plan' ? '플랜' : s === 'credit' ? '크레딧' : s === 'team' ? '팀' : s === 'credit_order' ? '크레딧(카드)' : s
const INPUT = 'w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none focus:border-sky-500'

type Tab = 'payments' | 'tax' | 'receipt' | 'refund' | 'subs'
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'payments', label: '결제 내역', icon: CreditCard },
  { key: 'tax', label: '세금계산서', icon: FileText },
  { key: 'receipt', label: '현금영수증', icon: Receipt },
  { key: 'refund', label: '환불', icon: RotateCcw },
  { key: 'subs', label: '정기결제', icon: Repeat },
]

function statusBadge(s: string) {
  const m: Record<string, string> = {
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700', issued: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    done: 'border-emerald-200 bg-emerald-50 text-emerald-700', active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    requested: 'border-amber-200 bg-amber-50 text-amber-700', partial_refund: 'border-amber-200 bg-amber-50 text-amber-700', paused: 'border-amber-200 bg-amber-50 text-amber-700',
    refunded: 'border-rose-200 bg-rose-50 text-rose-700', cancelled: 'border-slate-200 bg-slate-100 text-slate-500', rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  const label: Record<string, string> = { paid: '결제완료', issued: '발행완료', done: '완료', active: '활성', requested: '요청', partial_refund: '부분환불', paused: '일시정지', refunded: '환불', cancelled: '취소', rejected: '거절' }
  return <Badge className={m[s] || 'border-slate-200 bg-slate-50 text-slate-600'}>{label[s] || s}</Badge>
}

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('payments')
  const [modal, setModal] = useState<{ kind: 'tax' | 'receipt' | 'refund'; pay: PaymentRow } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => { setLoading(true); adminBilling().then((d) => { setData(d); setLoading(false) }) }
  useEffect(() => { load() }, [])
  async function act(action: string, payload: Record<string, any>) { setBusy(true); const r = await adminBillingAction(action, payload); setBusy(false); if (r.ok) { setModal(null); load() } else alert(r.error || '처리 실패'); return r }

  const s = data?.stats
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={BadgeDollarSign} eyebrow="BILLING" title="결제 · 정산 관리"
        desc="결제 원장·세금계산서·현금영수증·환불·정기결제를 관리합니다. PG 연동 시 결제 웹훅이 같은 원장에 자동 기록됩니다."
        accent={ACCENT}
        action={<Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw size={15} className={cn(loading && 'animate-spin')} /> 새로고침</Button>}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="순매출 (환불 차감)" value={won(s?.net || 0)} icon={Wallet} accent="#10b981" />
            <StatCard label="세금계산서 대기" value={String(s?.taxPending || 0)} icon={FileText} accent="#0ea5e9" />
            <StatCard label="현금영수증 대기" value={String(s?.receiptPending || 0)} icon={Receipt} accent="#8b5cf6" />
            <StatCard label="환불 대기" value={String(s?.refundPending || 0)} icon={RotateCcw} accent="#ef4444" />
          </div>
        </Reveal>

        <Reveal>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-2">
            {TABS.map((t) => {
              const Icon = t.icon; const active = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className={cn('inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all', active ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow' : 'text-[var(--text-soft)] hover:bg-white')}>
                  <Icon size={15} /> {t.label}
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* 결제 내역 */}
        {tab === 'payments' && (
          <Reveal><Panel>
            <Tbl head={['결제일시(KST)', '회원', '종류', '내용', '금액', '상태', '']}>
              {(data?.payments || []).map((p) => (
                <tr key={p.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{kst(p.created_at)}</td>
                  <td className="py-2.5">{p.uname || '-'} <span className="text-xs text-[var(--text-dim)]">{p.uemail}</span></td>
                  <td className="py-2.5"><Badge className="border-slate-200 bg-slate-50 text-slate-600">{sourceLabel(p.source)}</Badge></td>
                  <td className="max-w-[220px] truncate py-2.5 text-[var(--text-soft)]" title={p.description}>{p.description}</td>
                  <td className="py-2.5 font-semibold">{won(p.amount)}{p.refunded_amount > 0 && <span className="ml-1 text-xs text-rose-500">(−{won(p.refunded_amount)})</span>}</td>
                  <td className="py-2.5">{statusBadge(p.status)}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1">
                      <MiniBtn onClick={() => setModal({ kind: 'tax', pay: p })}>세금계산서</MiniBtn>
                      <MiniBtn onClick={() => setModal({ kind: 'receipt', pay: p })}>현금영수증</MiniBtn>
                      {p.status !== 'refunded' && <MiniBtn danger onClick={() => setModal({ kind: 'refund', pay: p })}>환불</MiniBtn>}
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.payments || data.payments.length === 0) && <EmptyRow cols={7} loading={loading} label="결제 내역이 없습니다. (플랜/크레딧/팀 승인 시 자동 기록)" />}
            </Tbl>
          </Panel></Reveal>
        )}

        {/* 세금계산서 */}
        {tab === 'tax' && (
          <Reveal><Panel>
            <Tbl head={['요청일시', '상호', '사업자번호', '공급가액', '부가세', '합계', '상태', '']}>
              {(data?.taxInvoices || []).map((t) => (
                <tr key={t.id} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{kst(t.requested_at)}</td>
                  <td className="py-2.5 font-medium">{t.company || '-'}</td>
                  <td className="py-2.5 font-mono text-xs">{t.biz_number || '-'}</td>
                  <td className="py-2.5 text-right">{won(t.supply_amount)}</td>
                  <td className="py-2.5 text-right">{won(t.vat)}</td>
                  <td className="py-2.5 text-right font-semibold">{won(t.amount)}</td>
                  <td className="py-2.5">{statusBadge(t.status)}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1">
                      {t.status === 'requested' && <MiniBtn onClick={() => { const k = prompt('국세청 승인번호(선택)') ?? ''; act('tax-status', { id: t.id, status: 'issued', ntsKey: k }) }}>발행완료</MiniBtn>}
                      {t.status !== 'cancelled' && <MiniBtn danger onClick={() => act('tax-status', { id: t.id, status: 'cancelled' })}>취소</MiniBtn>}
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.taxInvoices || data.taxInvoices.length === 0) && <EmptyRow cols={8} loading={loading} label="세금계산서 내역이 없습니다. (결제 내역에서 발행 요청)" />}
            </Tbl>
          </Panel></Reveal>
        )}

        {/* 현금영수증 */}
        {tab === 'receipt' && (
          <Reveal><Panel>
            <Tbl head={['요청일시', '용도', '식별번호', '합계', '상태', '']}>
              {(data?.cashReceipts || []).map((c) => (
                <tr key={c.id} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{kst(c.requested_at)}</td>
                  <td className="py-2.5">{c.purpose === 'expense' ? '지출증빙' : '소득공제'}</td>
                  <td className="py-2.5 font-mono text-xs">{c.identifier || '-'}</td>
                  <td className="py-2.5 text-right font-semibold">{won(c.amount)}</td>
                  <td className="py-2.5">{statusBadge(c.status)}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1">
                      {c.status === 'requested' && <MiniBtn onClick={() => { const k = prompt('승인번호(선택)') ?? ''; act('receipt-status', { id: c.id, status: 'issued', approvalNo: k }) }}>발행완료</MiniBtn>}
                      {c.status !== 'cancelled' && <MiniBtn danger onClick={() => act('receipt-status', { id: c.id, status: 'cancelled' })}>취소</MiniBtn>}
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.cashReceipts || data.cashReceipts.length === 0) && <EmptyRow cols={6} loading={loading} label="현금영수증 내역이 없습니다." />}
            </Tbl>
          </Panel></Reveal>
        )}

        {/* 환불 */}
        {tab === 'refund' && (
          <Reveal><Panel>
            <Tbl head={['요청일시', '회원', '금액', '사유', '상태', '']}>
              {(data?.refunds || []).map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{kst(r.requested_at)}</td>
                  <td className="py-2.5">{r.uname || '-'} <span className="text-xs text-[var(--text-dim)]">{r.uemail}</span></td>
                  <td className="py-2.5 font-semibold text-rose-600">{won(r.amount)}</td>
                  <td className="max-w-[220px] truncate py-2.5 text-[var(--text-soft)]" title={r.reason}>{r.reason || '-'}</td>
                  <td className="py-2.5">{statusBadge(r.status)}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1">
                      {r.status === 'requested' && <>
                        <MiniBtn onClick={() => act('refund-decide', { id: r.id, decision: 'approve' })}>승인</MiniBtn>
                        <MiniBtn danger onClick={() => act('refund-decide', { id: r.id, decision: 'reject' })}>거절</MiniBtn>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.refunds || data.refunds.length === 0) && <EmptyRow cols={6} loading={loading} label="환불 요청이 없습니다." />}
            </Tbl>
          </Panel></Reveal>
        )}

        {/* 정기결제 */}
        {tab === 'subs' && (
          <Reveal><Panel>
            <p className="mb-3 text-xs text-[var(--text-dim)]">PG 빌링키 연동 후 다음 결제일에 자동 청구됩니다. 지금은 구독 스케줄을 관리합니다.</p>
            <Tbl head={['회원', '플랜', '주기 금액', '다음 결제일(KST)', '상태', '']}>
              {(data?.subscriptions || []).map((sub) => (
                <tr key={sub.id} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="py-2.5">{sub.uname || '-'} <span className="text-xs text-[var(--text-dim)]">{sub.uemail}</span></td>
                  <td className="py-2.5">{sub.track === 'video' ? '영상' : '마케터'} {sub.plan} · {sub.months}개월</td>
                  <td className="py-2.5 font-semibold">{won(sub.amount)}</td>
                  <td className="whitespace-nowrap py-2.5 text-[var(--text-soft)]">{kst(sub.next_billing_at)}</td>
                  <td className="py-2.5">{statusBadge(sub.status)}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1">
                      {sub.status === 'active' && <MiniBtn onClick={() => act('sub-status', { id: sub.id, status: 'paused' })}>일시정지</MiniBtn>}
                      {sub.status === 'paused' && <MiniBtn onClick={() => act('sub-status', { id: sub.id, status: 'active' })}>재개</MiniBtn>}
                      {sub.status !== 'cancelled' && <MiniBtn danger onClick={() => act('sub-status', { id: sub.id, status: 'cancelled' })}>해지</MiniBtn>}
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.subscriptions || data.subscriptions.length === 0) && <EmptyRow cols={6} loading={loading} label="정기결제(구독)가 없습니다. PG 연동 후 자동 생성됩니다." />}
            </Tbl>
          </Panel></Reveal>
        )}
      </div>

      {modal && <ActionModal m={modal} busy={busy} onClose={() => setModal(null)} onSubmit={act} />}
    </div>
  )
}

function ActionModal({ m, busy, onClose, onSubmit }: { m: { kind: 'tax' | 'receipt' | 'refund'; pay: PaymentRow }; busy: boolean; onClose: () => void; onSubmit: (a: string, p: Record<string, any>) => Promise<{ ok: boolean }> }) {
  const [f, setF] = useState<Record<string, string>>({ purpose: 'income', amount: String((m.pay.amount || 0) - (m.pay.refunded_amount || 0)) })
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const title = m.kind === 'tax' ? '세금계산서 발행 요청' : m.kind === 'receipt' ? '현금영수증 발행 요청' : '환불 요청'
  async function submit() {
    if (m.kind === 'tax') await onSubmit('tax-create', { paymentId: m.pay.id, bizNumber: f.bizNumber, company: f.company, ceo: f.ceo, address: f.address, email: f.email, memo: f.memo })
    else if (m.kind === 'receipt') await onSubmit('receipt-create', { paymentId: m.pay.id, purpose: f.purpose, identifier: f.identifier })
    else await onSubmit('refund-create', { paymentId: m.pay.id, amount: Number(f.amount), reason: f.reason })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-soft)] hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-[var(--text-soft)]">
          {m.pay.uname} · {won(m.pay.amount)} · {sourceLabel(m.pay.source)} · {m.pay.description}
        </div>
        <div className="space-y-2">
          {m.kind === 'tax' && <>
            <input placeholder="사업자등록번호" className={INPUT} value={f.bizNumber || ''} onChange={(e) => set('bizNumber', e.target.value)} />
            <input placeholder="상호(회사명)" className={INPUT} value={f.company || ''} onChange={(e) => set('company', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="대표자" className={INPUT} value={f.ceo || ''} onChange={(e) => set('ceo', e.target.value)} />
              <input placeholder="이메일" className={INPUT} value={f.email || ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <input placeholder="사업장 주소" className={INPUT} value={f.address || ''} onChange={(e) => set('address', e.target.value)} />
            <p className="text-[11px] text-[var(--text-dim)]">공급가액 {won(m.pay.supply_amount)} · 부가세 {won(m.pay.vat)} · 합계 {won(m.pay.amount)}</p>
          </>}
          {m.kind === 'receipt' && <>
            <select className={INPUT} value={f.purpose} onChange={(e) => set('purpose', e.target.value)}>
              <option value="income">소득공제(개인)</option><option value="expense">지출증빙(사업자)</option>
            </select>
            <input placeholder={f.purpose === 'expense' ? '사업자등록번호' : '휴대폰번호'} className={INPUT} value={f.identifier || ''} onChange={(e) => set('identifier', e.target.value)} />
          </>}
          {m.kind === 'refund' && <>
            <input type="number" placeholder="환불 금액" className={INPUT} value={f.amount || ''} onChange={(e) => set('amount', e.target.value)} />
            <input placeholder="환불 사유" className={INPUT} value={f.reason || ''} onChange={(e) => set('reason', e.target.value)} />
            <p className="text-[11px] text-[var(--text-dim)]">환불 가능 잔액 {won((m.pay.amount || 0) - (m.pay.refunded_amount || 0))}</p>
          </>}
          <Button variant="primary" size="md" className="mt-1 w-full !bg-sky-600 hover:!bg-sky-700" disabled={busy} onClick={submit}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null} {m.kind === 'refund' ? '환불 요청 등록' : '발행 요청'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Tbl({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead><tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--text-dim)]">
          {head.map((h, i) => <th key={i} className={cn('pb-2.5 font-medium', /금액|가액|부가세|합계/.test(h) && 'text-right')}>{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
function EmptyRow({ cols, loading, label }: { cols: number; loading: boolean; label: string }) {
  return <tr><td colSpan={cols} className="py-10 text-center text-[var(--text-dim)]">{loading ? '불러오는 중…' : label}</td></tr>
}
function MiniBtn({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={cn('rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors', danger ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-[var(--border)] text-[var(--text-soft)] hover:bg-sky-50 hover:text-sky-600')}>{children}</button>
}
